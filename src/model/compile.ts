/**
 * Compile the raw model files into a `CompiledModel`: validate every file against the types in
 * `./schema`, check cross references, join the authority data and derive card helps/frays.
 *
 * Pure: no file system. `scripts/build-model.ts` reads the files and writes public/model.json;
 * tests call `compileModel` directly. Errors name the file and the id. Structural problems are
 * errors (the build fails); a missing optional dataset is a warning (the engine falls back to
 * illustrative starting values, listed in `meta.missing`).
 */
import type {
  Authority,
  Band,
  Card,
  CompiledModel,
  Component,
  Condition,
  Curveball,
  Effect,
  FcmGraph,
  GameTuning,
  Indicator,
  IoSectorBand,
  IoSector,
  LaFlag,
  LaIndicatorFile,
  LetterTemplate,
  PlaceBoard,
  Region,
  Rule,
  Source,
  StandingTicket,
  Strand,
  StrandId,
  Text,
  TipFacts,
  VoiceTemplate,
} from "./schema";
import { STRAND_IDS, REGION_IDS } from "./schema";

/** The raw parsed files. Optional ones may be undefined. */
export interface RawModelFiles {
  sources?: unknown;
  sourcesExtra?: unknown;
  indicators?: unknown;
  bands?: unknown;
  regions: unknown;
  authorities: unknown;
  strands: unknown;
  /** One entry per rules file, keyed by file name. */
  rules: Record<string, unknown>;
  cards: unknown;
  curveballs: unknown;
  /** Place boards keyed by file name. */
  places: Record<string, unknown>;
  voices?: unknown;
  letters?: unknown;
  voiceSlots?: unknown;
  /** model/i18n/en/engine.json and cy/engine.json. */
  engineText?: { en?: Record<string, unknown>; cy?: Record<string, unknown> };
  game: unknown;
  laIndicators?: unknown;
  fcm?: unknown;
  io?: unknown;
}

export interface CompileOptions {
  /** Computes tip facts for a tips_triage board from its place data (build only). */
  tipFacts?: (board: PlaceBoard) => TipFacts[] | null;
  /** Build timestamp (default now). */
  built?: string;
}

export interface CompileResult {
  model: CompiledModel | null;
  errors: string[];
  warnings: string[];
}

const SIZES = new Set(["S", "M", "L"]);
const CONF = new Set(["high", "medium", "low"]);
const EVID = new Set(["assessed", "published", "expert", "placeholder"]);
const KINDS = new Set(["linear", "saturating", "stock", "threshold", "fcm", "io"]);
const FLAGS = new Set<LaFlag>(["coal_valley", "slate", "heartland", "rural", "valley", "port", "city", "coast", "off_gas", "worst5"]);
const SECTORS = new Set<IoSector>(["construction", "energy", "care", "land", "services", "manufacturing", "transport"]);
const SPECIAL_TARGETS = new Set(["budget", "trust", "card_cost"]);
const VOICE_EVENTS = new Set(["visit", "shock", "arrival", "played", "strand", "pledge", "neglect", "upkeep_unpaid", "trend", "opening"]);
const ARCHETYPES = new Set(["feast", "long_winter", "gift", "hollow", "steady", "uneven"]);

/** Sector to IO industries (Table 5 ids) for the jobs ripple bands. */
const SECTOR_INDUSTRIES: Record<IoSector, string[]> = {
  construction: ["F"],
  energy: ["D", "C27", "C33"],
  care: ["Q86", "Q87:88", "P"],
  land: ["A01", "A02"],
  services: ["P", "J62:63", "N78", "I"],
  manufacturing: ["C24", "C25", "C28", "C29:30", "C26"],
  transport: ["H49", "F"],
};

export function compileModel(raw: RawModelFiles, opts: CompileOptions = {}): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cyReview: string[] = [];
  const missing: string[] = [];
  const err = (file: string, id: string, msg: string) => errors.push(`${file}: ${id}: ${msg}`);
  const warn = (msg: string) => warnings.push(msg);

  // ---- helpers
  const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
  const text = (file: string, id: string, field: string, v: unknown, strict = true): Text => {
    if (!isObj(v) || typeof v.en !== "string" || !v.en.trim()) {
      if (strict) err(file, id, `${field} must be {en, cy} with English text`);
      return { en: typeof v === "string" ? v : "", cy: "" };
    }
    const t = v as Text;
    if (typeof t.cy !== "string" || !t.cy.trim()) {
      if (t.cy_review) cyReview.push(`${file}:${id}:${field} (Welsh missing)`);
      else if (strict) err(file, id, `${field} has no Welsh (cy) and is not marked cy_review`);
      else warn(`${file}: ${id}: ${field} has no Welsh`);
    } else if (t.cy_review) cyReview.push(`${file}:${id}:${field}`);
    return { en: t.en, cy: typeof t.cy === "string" ? t.cy : "", ...(t.cy_review ? { cy_review: true } : {}) };
  };
  const num = (file: string, id: string, field: string, v: unknown): number => {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      err(file, id, `${field} must be a number`);
      return 0;
    }
    return v;
  };
  const list = (file: string, v: unknown, key: string): any[] => {
    if (Array.isArray(v)) return v;
    if (isObj(v) && Array.isArray(v[key])) return v[key];
    err(file, "(file)", `expected a list under "${key}"`);
    return [];
  };
  const uniq = (file: string, items: { id: string }[]) => {
    const seen = new Set<string>();
    for (const it of items) {
      if (typeof it.id !== "string" || !it.id) err(file, "(entry)", "missing id");
      else if (seen.has(it.id)) err(file, it.id, "duplicate id");
      seen.add(it.id);
    }
  };

  // ---- game tuning
  const game = raw.game as GameTuning;
  if (!isObj(game)) err("game.yaml", "(file)", "missing");
  else {
    for (const k of ["budget", "hand_size", "first_hand_size", "runs", "preview_runs", "sharp_share", "gap_scale"] as const) num("game.yaml", k, k, (game as any)[k]);
    if (!isObj(game.trust) || !Array.isArray(game.trust.bands)) err("game.yaml", "trust", "trust.bands missing");
    for (const k of ["new_trend_chance", "shock_chance", "ripple_weight", "ripple_shock_bonus", "slow_scale", "shock_scale"] as const) num("game.yaml", `curveballs.${k}`, k, (game.curveballs as any)?.[k]);
    for (const k of ["S", "M", "L"] as const) {
      num("game.yaml", `sizes.${k}`, k, game.sizes?.[k]);
      num("game.yaml", `fcm_sizes.${k}`, k, game.fcm_sizes?.[k]);
    }
    for (const k of ["regional_size_step", "hysteresis", "contingency_carry", "peek_cost", "post_counts_until"] as const) num("game.yaml", k, k, (game as any)[k]);
    if (!Array.isArray(game.years) || game.years.length !== 6) err("game.yaml", "years", "six term years required");
    const jc = game.judged_change;
    if (!isObj(jc)) err("game.yaml", "judged_change", "missing (balance decision 14)");
    else {
      num("game.yaml", "judged_change.lived_first_term", "lived_first_term", jc.lived_first_term);
      num("game.yaml", "judged_change.dip_weight", "dip_weight", jc.dip_weight);
      if (!Array.isArray(jc.bands) || jc.bands.length < 2) err("game.yaml", "judged_change.bands", "at least two bands required");
      else {
        jc.bands.forEach((b, i) => {
          num("game.yaml", `judged_change.bands[${i}]`, "min", b.min);
          text("game.yaml", `judged_change.bands[${i}]`, "name", b.name);
          if (i > 0 && b.min <= jc.bands[i - 1]!.min) err("game.yaml", "judged_change.bands", "band minimums must rise");
        });
      }
      if (!isObj(jc.letter_bands) || typeof jc.letter_bands.low !== "number" || typeof jc.letter_bands.high !== "number") err("game.yaml", "judged_change.letter_bands", "low and high required");
    }
    // older readers of result_bands get the change bands (the result is judged as change since 2026)
    if (isObj(jc) && Array.isArray(jc.bands)) game.result_bands = jc.bands;
    for (const b of game.trust?.bands ?? []) text("game.yaml", `trust.${b.id}`, "label", b.label);
    if (game.trust?.neglect_note) game.trust.neglect_note = text("game.yaml", "trust.neglect_note", "neglect_note", game.trust.neglect_note);
  }

  // ---- sources
  const sources: Source[] = [];
  const sourceIds = new Set<string>();
  if (raw.sources === undefined) {
    warn("model/sources.yaml is missing: only sources-extra.yaml is available");
    missing.push("sources.yaml");
  } else {
    for (const s of list("sources.yaml", raw.sources, "sources")) {
      if (!isObj(s) || typeof s.id !== "string") {
        err("sources.yaml", "(entry)", "source without id");
        continue;
      }
      if (sourceIds.has(s.id)) err("sources.yaml", s.id, "duplicate id");
      sourceIds.add(s.id);
      sources.push(s as Source);
    }
  }
  for (const s of list("sources-extra.yaml", raw.sourcesExtra ?? { sources: [] }, "sources")) {
    if (!isObj(s) || typeof s.id !== "string") {
      err("sources-extra.yaml", "(entry)", "source without id");
      continue;
    }
    if (sourceIds.has(s.id)) {
      warn(`sources-extra.yaml: ${s.id} also in sources.yaml; keeping the sources.yaml entry`);
      continue;
    }
    if (typeof s.title !== "string" && !isObj(s.title)) err("sources-extra.yaml", s.id, "title required");
    sourceIds.add(s.id);
    sources.push({ ...(s as Source), extra: true });
  }
  const checkSources = (file: string, id: string, ids: unknown) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      err(file, id, "at least one source id required");
      return [] as string[];
    }
    for (const s of ids) if (!sourceIds.has(s)) err(file, id, `unknown source "${s}"`);
    return ids as string[];
  };

  // ---- indicators and bands
  const indicators: Indicator[] = [];
  if (raw.indicators !== undefined) {
    for (const i of list("indicators.yaml", raw.indicators, "indicators")) {
      if (!isObj(i) || typeof i.id !== "string") continue;
      const name = isObj(i.name) ? { ...i.name, ...(i.cy_review ? { cy_review: true } : {}) } : i.name;
      indicators.push({ ...(i as Indicator), name: text("indicators.yaml", i.id, "name", name, false) });
      const srcs = Array.isArray(i.sources) ? i.sources : i.source ? [i.source] : [];
      for (const s of srcs) if (!sourceIds.has(s)) warn(`indicators.yaml: ${i.id}: unknown source "${s}"`);
    }
  } else {
    missing.push("indicators.yaml");
    warn("model/indicators.yaml is missing");
  }
  const bands: Band[] = [];
  if (raw.bands !== undefined) {
    const b = isObj(raw.bands) && isObj(raw.bands.bands) ? raw.bands.bands : isObj(raw.bands) && Array.isArray(raw.bands.bands) ? null : raw.bands;
    if (b && isObj(b)) {
      for (const [id, v] of Object.entries(b)) {
        if (!isObj(v)) continue;
        if (typeof v.floor !== "number" || typeof v.goal !== "number" || v.floor === v.goal) {
          err("bands.yaml", id, "floor and goal must be different numbers");
          continue;
        }
        bands.push({ ...(v as Band), indicator: id });
      }
    } else {
      for (const v of list("bands.yaml", raw.bands, "bands")) if (isObj(v) && typeof v.indicator === "string") bands.push(v as Band);
    }
  } else {
    missing.push("bands.yaml");
    warn("model/bands.yaml is missing: indicator components start from illustrative values");
  }
  const bandOf = new Map(bands.map((b) => [b.indicator, b]));

  // ---- regions and authorities
  const regions: Region[] = list("regions.yaml", raw.regions, "regions").map((r: any) => ({
    id: r.id,
    name: text("regions.yaml", r.id, "name", { ...r.name, cy_review: r.name?.cy_review }),
    authorities: r.authorities,
  }));
  for (const r of regions) if (!REGION_IDS.includes(r.id)) err("regions.yaml", r.id, "unknown region id");
  const laData = (raw.laIndicators as LaIndicatorFile | undefined)?.indicators ?? {};
  if (!raw.laIndicators) {
    missing.push("la-indicators.json");
    warn("model/data/la-indicators.json is missing: indicator components start from illustrative values");
  }
  const authorities: Authority[] = list("authorities.yaml", raw.authorities, "authorities").map((a: any) => {
    const id = a.code;
    if (!REGION_IDS.includes(a.region)) err("authorities.yaml", id, `unknown region ${a.region}`);
    for (const f of a.flags ?? []) if (!FLAGS.has(f)) err("authorities.yaml", id, `unknown flag ${f}`);
    const pop = laData.pop?.values?.[id];
    return {
      code: id,
      name: text("authorities.yaml", id, "name", a.name, false),
      region: a.region,
      flags: a.flags ?? [],
      population: typeof pop === "number" ? pop : num("authorities.yaml", id, "population", a.population),
      towns: (a.towns ?? []).map((t: unknown) => text("authorities.yaml", id, "towns", t, false)),
    };
  });
  if (authorities.length !== 22) err("authorities.yaml", "(file)", `expected 22 authorities, found ${authorities.length}`);
  const laCodes = new Set(authorities.map((a) => a.code));
  for (const r of regions) {
    for (const c of r.authorities) {
      if (!laCodes.has(c)) err("regions.yaml", r.id, `unknown authority ${c}`);
      else if (authorities.find((a) => a.code === c)!.region !== r.id) err("authorities.yaml", c, `region disagrees with regions.yaml (${r.id})`);
    }
  }

  // ---- components and strands
  const sRaw = raw.strands as any;
  const components: Component[] = list("strands.yaml", sRaw?.components, "components").map((c: any) => ({
    ...c,
    name: text("strands.yaml", c.id, "name", c.name),
    note: text("strands.yaml", c.id, "note", c.note),
  }));
  uniq("strands.yaml", components);
  const compIds = new Set(components.map((c) => c.id));
  for (const c of components) {
    if (c.role !== "flow" && c.role !== "stock") err("strands.yaml", c.id, "role must be flow or stock");
    if (!["pop", "mean", "heartland", "gap"].includes(c.aggregate)) err("strands.yaml", c.id, `unknown aggregate ${c.aggregate}`);
    if (c.aggregate === "gap" && (!c.of || !compIds.has(c.of))) err("strands.yaml", c.id, "gap needs `of` naming a component");
    num("strands.yaml", c.id, "initial", c.initial);
    if (c.indicator) {
      if (!laData[c.indicator]) {
        warn(`strands.yaml: ${c.id}: indicator ${c.indicator} has no authority data; starting from illustrative ${c.initial}`);
        if (raw.laIndicators) missing.push(`indicator:${c.indicator}`);
      } else if (!bandOf.has(c.indicator)) {
        warn(`strands.yaml: ${c.id}: indicator ${c.indicator} has no band; starting from illustrative ${c.initial}`);
        missing.push(`band:${c.indicator}`);
      }
    }
    if (c.sources) checkSources("strands.yaml", c.id, c.sources);
  }
  const strands: Strand[] = list("strands.yaml", sRaw?.strands, "strands").map((s: any) => ({
    ...s,
    name: text("strands.yaml", s.id, "name", s.name),
    description: text("strands.yaml", s.id, "description", s.description),
  }));
  if (strands.map((s) => s.id).join() !== STRAND_IDS.join()) err("strands.yaml", "(file)", `strands must be ${STRAND_IDS.join(", ")} in order`);
  for (const s of strands) for (const c of [...s.flow, ...s.stock]) if (!compIds.has(c)) err("strands.yaml", s.id, `unknown component ${c}`);
  const strandsOf = (comp: string) => strands.filter((s) => s.flow.includes(comp) || s.stock.includes(comp)).map((s) => s.id);

  // ---- FCM
  const fcm = raw.fcm as FcmGraph | undefined;
  const fcmIds = new Set<string>();
  if (!fcm || !Array.isArray(fcm.nodes) || !Array.isArray(fcm.edges)) {
    err("data/sonarr-dpsir.json", "(file)", "missing or malformed (nodes and edges required)");
  } else {
    for (const n of fcm.nodes) fcmIds.add(n.id);
    for (const e of fcm.edges) if (!fcmIds.has(e.source) || !fcmIds.has(e.target)) err("data/sonarr-dpsir.json", `${e.source}|${e.target}`, "edge names an unknown node");
  }

  // ---- rules
  const rules: Rule[] = [];
  for (const [file, content] of Object.entries(raw.rules)) {
    for (const r of list(`rules/${file}`, content, "rules")) {
      const f = `rules/${file}`;
      const id = r.id ?? "(rule)";
      if (!/^R\d\d$/.test(id)) err(f, id, "rule ids are R01 to R99");
      if (!KINDS.has(r.kind)) err(f, id, `unknown kind ${r.kind} (ADR 0002)`);
      if (!CONF.has(r.confidence)) err(f, id, `confidence must be high, medium or low`);
      if (!EVID.has(r.evidence)) err(f, id, `evidence must be assessed, published, expert or placeholder`);
      if (typeof r.placeholder !== "boolean") err(f, id, "placeholder must be true or false");
      if (typeof r.lag !== "number" || r.lag < 0) err(f, id, "lag must be a number of terms");
      checkSources(f, id, r.sources);
      if (!isObj(r.params) || Object.keys(r.params).length === 0) err(f, id, "at least one parameter required");
      for (const [pn, p] of Object.entries<any>(r.params ?? {})) {
        if (!isObj(p)) {
          err(f, id, `param ${pn} malformed`);
          continue;
        }
        for (const k of ["default", "min", "max"]) num(f, `${id}.${pn}`, k, p[k]);
        if (p.min > p.max) err(f, `${id}.${pn}`, "min above max");
        if (p.default < p.min || p.default > p.max) err(f, `${id}.${pn}`, `default ${p.default} outside its range ${p.min} to ${p.max}`);
        text(f, `${id}.${pn}`, "unit", p.unit);
        if (typeof p.adjustable !== "boolean") err(f, `${id}.${pn}`, "adjustable must be true or false");
      }
      if (r.kind === "linear" && !["clock", "card", "change"].includes(r.drive)) err(f, id, "linear rules need drive clock, card or change");
      if (r.drive === "change") {
        const ins = Array.isArray(r.input) ? r.input : [r.input];
        for (const i of ins) if (!compIds.has(i)) err(f, id, `change input ${i} is not a component`);
      }
      if (r.kind === "stock" && !["decay", "clock", "approach_fcm", "accumulate", "card", "upkeep", "debt"].includes(r.stock)) err(f, id, `unknown stock mode ${r.stock}`);
      if (r.kind === "saturating" && !["plays", "ceiling", "band_goal", "repeat"].includes(r.saturate)) err(f, id, `unknown saturate mode ${r.saturate}`);
      if (r.kind === "threshold" && !["tip_movement", "heartland_drop", "employer_leaves"].includes(r.event)) err(f, id, `unknown threshold event ${r.event}`);
      if (r.stock === "decay" && !r.params?.outflow) err(f, id, "decay stocks need an outflow parameter");
      if (r.stock === "clock" && !r.params?.rate) err(f, id, "clock stocks need a rate parameter");
      if (r.stock === "approach_fcm" && !r.params?.rate) err(f, id, "approach_fcm needs a rate parameter");
      if (r.saturate === "ceiling" && !r.params?.ceiling) err(f, id, "ceiling rules need a ceiling parameter");
      const outs: string[] = Array.isArray(r.outputs) ? r.outputs : [];
      if (r.kind !== "fcm" && r.kind !== "saturating" && r.stock !== "debt") {
        for (const o of outs) if (!compIds.has(o)) err(f, id, `output ${o} is not a component`);
      }
      for (const w of [r.where, ...(r.emphasis ?? [])]) if (w) checkWhere(f, id, w);
      rules.push({ ...r, name: text(f, id, "name", r.name), note: text(f, id, "note", r.note) });
    }
  }
  uniq("rules", rules);
  const ruleIds = new Set(rules.map((r) => r.id));
  if (rules.length !== 35) warn(`rules: ${rules.length} rules (the design lists 35)`);

  function checkWhere(file: string, id: string, w: any) {
    for (const r of w.regions ?? []) if (!REGION_IDS.includes(r)) err(file, id, `unknown region ${r}`);
    for (const l of w.las ?? []) if (!laCodes.has(l)) err(file, id, `unknown authority ${l}`);
    for (const fl of [...(w.flags ?? []), ...(w.not_flags ?? [])]) if (!FLAGS.has(fl)) err(file, id, `unknown flag ${fl}`);
  }

  // ---- cards (checked after curveballs are parsed, for ids)
  const cRaw = raw.cards as any;
  const cardList: any[] = list("cards.yaml", cRaw?.cards, "cards");
  const cardIds = new Set(cardList.map((c) => c.id));
  const standingList: any[] = list("cards.yaml", cRaw?.standing, "standing");
  const allCardIds = new Set([...cardIds, ...standingList.map((s) => s.id)]);

  const cbList: any[] = list("curveballs.yaml", raw.curveballs, "curveballs");
  const cbIds = new Set(cbList.map((c) => c.id));

  const checkCondition = (file: string, id: string, c: Condition | undefined) => {
    if (!c) return;
    const known = ["needs_partners", "half_if_below", "unless_card_in_scope", "unless_card_in_force", "only_where_below_middle", "if_any_card_in_play", "if_no_card_in_play", "from_year", "if_below", "half_without_card"];
    for (const k of Object.keys(c)) if (!known.includes(k)) err(file, id, `unknown condition ${k}`);
    for (const k of ["unless_card_in_scope", "unless_card_in_force", "half_without_card"] as const) if (c[k] && !allCardIds.has(c[k]!)) err(file, id, `condition names unknown card ${c[k]}`);
    for (const cid of [...(c.if_any_card_in_play ?? []), ...(c.if_no_card_in_play ?? [])]) if (!allCardIds.has(cid)) err(file, id, `condition names unknown card ${cid}`);
    for (const k of ["half_if_below", "if_below"] as const) if (c[k] && !compIds.has(c[k]!.component)) err(file, id, `condition names unknown component ${c[k]!.component}`);
    if (c.only_where_below_middle && !compIds.has(c.only_where_below_middle)) err(file, id, `unknown component ${c.only_where_below_middle}`);
  };
  const checkEffect = (file: string, id: string, e: any): Effect => {
    const where = `${id} effect ${e?.target}`;
    if (!isObj(e) || typeof e.target !== "string") {
      err(file, id, "effect without target");
      return e;
    }
    if (e.target.startsWith("fcm:")) {
      if (!fcmIds.has(e.target.slice(4))) err(file, where, "unknown SoNaRR node");
    } else if (!SPECIAL_TARGETS.has(e.target) && !compIds.has(e.target)) err(file, where, "target is not a component, fcm node or special target");
    if (e.size === undefined && typeof e.amount !== "number") err(file, where, "needs a size (S, M, L) or an amount");
    if (e.size !== undefined && !SIZES.has(e.size)) err(file, where, `size must be S, M or L`);
    if (e.sign !== 1 && e.sign !== -1) err(file, where, "sign must be 1 or -1");
    if (e.rule && !ruleIds.has(e.rule)) err(file, where, `unknown rule ${e.rule}`);
    if (e.where) checkWhere(file, where, e.where);
    for (const em of e.emphasis ?? []) checkWhere(file, where, em);
    checkCondition(file, where, e.condition);
    const out = { ...e } as Effect;
    if (e.note) out.note = text(file, where, "note", e.note);
    return out;
  };

  const cards: Card[] = cardList.map((c: any) => {
    const f = "cards.yaml";
    if (!["national", "region", "national_or_region", "two_regions"].includes(c.scope)) err(f, c.id, `unknown scope ${c.scope}`);
    num(f, c.id, "cost", c.cost);
    num(f, c.id, "delay", c.delay);
    for (const r of c.regions ?? []) if (!REGION_IDS.includes(r)) err(f, c.id, `unknown region ${r}`);
    if (c.sector && !SECTORS.has(c.sector)) err(f, c.id, `unknown sector ${c.sector}`);
    if (c.confidence && !CONF.has(c.confidence)) err(f, c.id, "unknown confidence");
    if (c.visit && c.visit !== "rhondda" && c.visit !== "bethesda") err(f, c.id, `unknown visit ${c.visit}`);
    const effects = (c.effects ?? []).map((e: any) => checkEffect(f, c.id, e));
    const upkeep = c.upkeep
      ? { ...c.upkeep, lapse: (c.upkeep.lapse ?? []).map((e: any) => checkEffect(f, `${c.id} upkeep`, e)), note: text(f, c.id, "upkeep.note", c.upkeep.note) }
      : undefined;
    const helps = new Set<StrandId>();
    const frays = new Set<StrandId>();
    // a card helps the strands of its targets, and of what chained rules carry them to (one step)
    const chained = (comp: string): string[] => {
      const out = [comp];
      for (const r of rules) {
        if (r.drive !== "change") continue;
        const ins = Array.isArray(r.input) ? r.input : r.input ? [r.input] : [];
        if (ins.includes(comp)) for (const o of r.outputs) if (!ins.includes(o) && compIds.has(o)) out.push(o);
      }
      return out;
    };
    for (const e of effects as Effect[]) {
      const direct = e.target.startsWith("fcm:") ? ["nature_condition"] : compIds.has(e.target) ? [e.target] : [];
      const comps = [...new Set(direct.flatMap(chained))];
      // fcm pressures: lower pressure helps nature
      const helpsIt = e.target.startsWith("fcm:pressure") || e.target.startsWith("fcm:driver") ? e.sign < 0 : e.sign > 0;
      for (const comp of comps) for (const s of strandsOf(comp)) (helpsIt ? helps : frays).add(s);
      // aimed at the five worst-off: it moves the gap components of the measures it targets
      if (e.where?.flags?.includes("worst5"))
        for (const comp of comps) for (const g of components.filter((x) => x.aggregate === "gap" && x.of === comp)) for (const s of strandsOf(g.id)) (helpsIt ? helps : frays).add(s);
    }
    if (upkeep) for (const e of upkeep.lapse) for (const s of strandsOf(e.target)) frays.add(s);
    const card: Card = {
      ...c,
      name: text(f, c.id, "name", c.name),
      description: text(f, c.id, "description", c.description),
      upgraded_by: text(f, c.id, "upgraded_by", c.upgraded_by),
      ...(c.side_note ? { side_note: text(f, c.id, "side_note", c.side_note) } : {}),
      effects,
      ...(upkeep ? { upkeep } : {}),
      tags: c.tags ?? [],
      helps: STRAND_IDS.filter((s) => helps.has(s)),
      frays: STRAND_IDS.filter((s) => frays.has(s) && !helps.has(s)).concat(STRAND_IDS.filter((s) => frays.has(s) && helps.has(s))),
      responds_to: [],
    };
    return card;
  });
  uniq("cards.yaml", cards);
  if (cards.length !== 20) err("cards.yaml", "(file)", `expected 20 deck cards, found ${cards.length}`);

  const standing: StandingTicket[] = standingList.map((s: any) => {
    const f = "cards.yaml";
    if (s.id !== "borrow-to-invest" && s.id !== "defer-maintenance") err(f, s.id, "standing tickets are borrow-to-invest and defer-maintenance");
    if (!ruleIds.has(s.rule)) err(f, s.id, `unknown rule ${s.rule}`);
    return {
      ...s,
      name: text(f, s.id, "name", s.name),
      description: text(f, s.id, "description", s.description),
      side_note: text(f, s.id, "side_note", s.side_note),
      upgraded_by: text(f, s.id, "upgraded_by", s.upgraded_by),
      effects: (s.effects ?? []).map((e: any) => checkEffect(f, s.id, e)),
    };
  });

  // ---- curveballs
  const curveballs: Curveball[] = cbList.map((c: any) => {
    const f = "curveballs.yaml";
    for (const r of c.responses ?? []) if (!allCardIds.has(r)) err(f, c.id, `unknown response card ${r}`);
    const cb: Curveball = {
      ...c,
      name: text(f, c.id, "name", c.name),
      description: text(f, c.id, "description", c.description),
      where_note: text(f, c.id, "where_note", c.where_note),
      slow: (c.slow ?? []).map((e: any) => checkEffect(f, c.id, e)),
      trends: c.trends ?? [],
      ripples_to: c.ripples_to ?? [],
      responses: c.responses ?? [],
    };
    if (c.shock) {
      cb.shock = {
        ...c.shock,
        name: text(f, `${c.id} shock`, "name", c.shock.name),
        description: text(f, `${c.id} shock`, "description", c.shock.description),
        effects: (c.shock.effects ?? []).map((e: any) => checkEffect(f, `${c.id} shock`, e)),
        ...(c.shock.branches
          ? {
              branches: c.shock.branches.map((b: any, i: number) => {
                checkCondition(f, `${c.id} branch ${i}`, b.condition);
                return { ...b, effects: (b.effects ?? []).map((e: any) => checkEffect(f, `${c.id} branch ${i}`, e)), note: text(f, `${c.id} branch ${i}`, "note", b.note) };
              }),
            }
          : {}),
      };
    }
    return cb;
  });
  uniq("curveballs.yaml", curveballs);
  if (curveballs.length !== 12) err("curveballs.yaml", "(file)", `expected 12 curveballs, found ${curveballs.length}`);
  for (const card of cards) card.responds_to = curveballs.filter((c) => c.responses.includes(card.id)).map((c) => c.id);
  if (game?.curveballs) {
    for (const id of [game.curveballs.first_trend, ...game.curveballs.first_game_order, game.curveballs.first_game_shock?.curveball]) if (id && !cbIds.has(id)) err("game.yaml", "curveballs", `unknown curveball ${id}`);
  }

  // ---- places
  const places: PlaceBoard[] = [];
  for (const [file, p] of Object.entries<any>(raw.places)) {
    const f = `places/${file}`;
    if (!isObj(p)) continue;
    if (p.kind !== "tips_triage" && p.kind !== "threads_tests") err(f, p.id, `unknown board kind ${p.kind}`);
    if (!laCodes.has(p.la)) err(f, p.id, `unknown authority ${p.la}`);
    if (!FLAGS.has(p.applies_to_flag)) err(f, p.id, `unknown flag ${p.applies_to_flag}`);
    for (const c of p.trigger_cards ?? []) {
      if (!cardIds.has(c)) err(f, p.id, `unknown trigger card ${c}`);
      else if (cardList.find((x) => x.id === c)?.visit !== p.id) err(f, p.id, `trigger card ${c} does not name this visit in cards.yaml`);
    }
    checkSources(f, p.id, p.sources);
    const board = {
      ...p,
      name: text(f, p.id, "name", { ...p.name, cy_review: p.name?.cy_review }),
      prompt: text(f, p.id, "prompt", p.prompt),
      why_hard: text(f, p.id, "why_hard", p.why_hard),
      data_note: text(f, p.id, "data_note", p.data_note),
      tests: (p.tests ?? []).map((t: any) => ({ ...t, name: text(f, `${p.id}.${t.id}`, "name", t.name), description: text(f, `${p.id}.${t.id}`, "description", t.description) })),

    } as PlaceBoard;
    if (p.kind === "threads_tests") {
      const opts = (p.options ?? []) as any[];
      if (opts.length !== 10) err(f, p.id, `expected ten options, found ${opts.length}`);
      board.options = opts.map((o) => {
        for (const k of ["homes", "work", "iaith", "pressure", "river", "spread", "delay"]) num(f, `${p.id}.${o.id}`, k, o[k]);
        for (const k of ["requires_card", "half_without_card"]) if (o[k] && !allCardIds.has(o[k])) err(f, `${p.id}.${o.id}`, `unknown card ${o[k]}`);
        if (o.pairs_with && !opts.some((x) => x.id === o.pairs_with.option)) err(f, `${p.id}.${o.id}`, `pairs with unknown option ${o.pairs_with.option}`);
        if (o.river_flips_in && !cbIds.has(o.river_flips_in)) err(f, `${p.id}.${o.id}`, `unknown curveball ${o.river_flips_in}`);
        return { ...o, name: text(f, `${p.id}.${o.id}`, "name", o.name), catch: text(f, `${p.id}.${o.id}`, "catch", o.catch) };
      });
      board.trend_penalties = (p.trend_penalties ?? []).map((t: any) => {
        if (!cbIds.has(t.curveball)) err(f, p.id, `trend penalty names unknown curveball ${t.curveball}`);
        return { ...t, note: text(f, `${p.id}.${t.curveball}`, "note", t.note) };
      });
      if (!p.thresholds) err(f, p.id, "threads_tests boards need thresholds");
    } else {
      const tips = opts.tipFacts ? opts.tipFacts(board) : null;
      if (!tips || tips.length === 0) {
        warn(`places/${file}: no tip facts computed (place data missing?); the board falls back to an empty list`);
        missing.push(`place:${p.id}`);
        board.tips = [];
      } else board.tips = tips;
    }
    places.push(board);
  }
  for (const c of cards) if (c.visit && !places.some((p) => p.id === c.visit)) err("cards.yaml", c.id, `visit ${c.visit} has no board in model/places`);

  // ---- voices and letters (written by the content agent: validated, never rewritten)
  const voices: VoiceTemplate[] = [];
  if (raw.voices === undefined) warn("model/voices.yaml is missing: no voices will be shown");
  else {
    for (const v of list("voices.yaml", raw.voices, "voices")) {
      const f = "voices.yaml";
      if (!isObj(v) || typeof v.id !== "string") {
        err(f, "(entry)", "voice without id");
        continue;
      }
      if (!VOICE_EVENTS.has(v.event)) err(f, v.id, `unknown event ${v.event}`);
      if (v.card && !allCardIds.has(v.card)) err(f, v.id, `unknown card ${v.card}`);
      if (v.curveball && !cbIds.has(v.curveball)) err(f, v.id, `unknown curveball ${v.curveball}`);
      if (v.strand && !STRAND_IDS.includes(v.strand)) err(f, v.id, `unknown strand ${v.strand}`);
      if (v.region && !REGION_IDS.includes(v.region)) err(f, v.id, `unknown region ${v.region}`);
      if (v.place && v.place !== "rhondda" && v.place !== "bethesda") err(f, v.id, `unknown place ${v.place}`);
      if (v.grade && !["poorly", "adequately", "well"].includes(v.grade)) err(f, v.id, `unknown grade ${v.grade}`);
      if (v.response && !["ready", "responded", "absorbed"].includes(v.response)) err(f, v.id, `unknown response ${v.response}`);
      if (v.direction && v.direction !== "up" && v.direction !== "down") err(f, v.id, `unknown direction ${v.direction}`);
      const t = text(f, v.id, "text", v.text);
      if (/[–—]/.test(t.en + t.cy)) err(f, v.id, "contains an em or en dash");
      if (/!/.test(t.en)) warn(`voices.yaml: ${v.id}: exclamation mark (tone rule)`);
      voices.push({ ...(v as VoiceTemplate), text: t, towns: (v.towns ?? []).map((x: unknown) => text(f, v.id, "towns", x, false)) });
    }
    uniq("voices.yaml", voices);
  }
  const letters: LetterTemplate[] = [];
  if (raw.letters === undefined) warn("model/letters.yaml is missing: the letter falls back to a plain summary");
  else {
    for (const l of list("letters.yaml", raw.letters, "letters")) {
      const f = "letters.yaml";
      const id = l?.archetype ?? "(letter)";
      if (!ARCHETYPES.has(id)) err(f, id, "unknown archetype");
      const slots = (k: string) => {
        const arr = l[k];
        if (!Array.isArray(arr) || arr.length === 0) {
          err(f, id, `slot ${k} needs at least one variant`);
          return [];
        }
        return arr.map((t: unknown, i: number) => text(f, `${id}.${k}[${i}]`, "text", t));
      };
      const named: Record<string, Text[]> = {};
      for (const [k, arr] of Object.entries<any>(l.named ?? {})) {
        if (!["debt", "tip", "arrival", "pledge", "lost_term", "repairs", "neglect", "none"].includes(k)) err(f, id, `unknown named kind ${k}`);
        named[k] = (arr ?? []).map((t: unknown, i: number) => text(f, `${id}.named.${k}[${i}]`, "text", t));
      }
      if (!named.none?.length) err(f, id, "named.none needs at least one variant (the fallback)");
      letters.push({ archetype: id, title: text(f, id, "title", l.title), salutation: slots("salutation"), lived: slots("lived"), left: slots("left"), named, signoff: slots("signoff") });
      for (const t of [...letters[letters.length - 1]!.lived, ...Object.values(named).flat()]) if (/[–—]/.test(t.en + t.cy)) err(f, id, "contains an em or en dash");
    }
  }
  const vs = (raw.voiceSlots ?? {}) as any;
  const voice_who: Text[] = (vs.who ?? []).map((t: unknown) => text("voice-slots.yaml", "who", "who", t));
  const voice_seasons: Text[] = (vs.seasons ?? []).map((t: unknown) => text("voice-slots.yaml", "seasons", "seasons", t));

  // ---- IO sector bands (R25)
  const io: IoSectorBand[] = [];
  const ioData = raw.io as any;
  if (!ioData?.industries) {
    warn("model/data/io-multipliers.json is missing: the jobs ripple uses the middle band");
    missing.push("io-multipliers.json");
    for (const s of SECTORS) io.push({ sector: s, industries: [], emp_effect: 0, band: 2 });
  } else {
    const byId = new Map<string, any>(ioData.industries.map((i: any) => [i.id, i]));
    for (const s of SECTORS) {
      const inds = SECTOR_INDUSTRIES[s].filter((i) => byId.has(i));
      const effects = inds.map((i) => byId.get(i).type2?.emp_effect ?? byId.get(i).type1?.emp_effect ?? 0);
      const mean = effects.length ? effects.reduce((a, b) => a + b, 0) / effects.length : 0;
      // bands by Type II FTE per GBP 1m: under 12 low, under 18 middle, else high
      io.push({ sector: s, industries: inds, emp_effect: Math.round(mean * 10) / 10, band: mean < 12 ? 1 : mean < 18 ? 2 : 3 });
    }
  }

  // ---- engine copy (bilingual, keyed)
  const engine_text: Record<string, Text> = {};
  const et = raw.engineText;
  if (et?.en) {
    const cyAll = et.cy ?? {};
    const review = cyAll["_cy_review"] === true;
    for (const [k, v] of Object.entries(et.en)) {
      if (k.startsWith("_") || typeof v !== "string") continue;
      const cy = cyAll[k];
      if (typeof cy !== "string" || !cy.trim()) err("i18n/cy/engine.json", k, "missing Welsh");
      if (/[\u2013\u2014]/.test(v + (cy ?? ""))) err("i18n/engine.json", k, "contains an em or en dash");
      engine_text[k] = { en: v, cy: typeof cy === "string" ? cy : "", ...(review ? { cy_review: true } : {}) };
      if (review) cyReview.push(`i18n/cy/engine.json:${k}`);
    }
  }

  if (errors.length) return { model: null, errors, warnings };

  const model: CompiledModel = {
    meta: { version: 1, built: opts.built ?? new Date().toISOString(), hash: "", missing: [...new Set(missing)], warnings, cy_review: cyReview },
    sources,
    indicators,
    bands,
    regions,
    authorities,
    la_data: laData,
    components,
    strands,
    rules,
    cards,
    standing,
    curveballs,
    places,
    voices,
    letters,
    voice_who,
    voice_seasons,
    fcm: fcm!,
    io,
    game,
    engine_text,
  };
  model.meta.hash = hashString(JSON.stringify([model.rules, model.cards, model.standing, model.curveballs, model.game, model.components, model.places.map((p) => [p.options, p.tips])]));
  return { model, errors, warnings };
}

/** FNV-1a 32-bit hash as 8 hex digits. */
export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
