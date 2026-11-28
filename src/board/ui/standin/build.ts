/**
 * A practice stand-in for the parts of the board engine that are not built yet, so the screens can
 * be played by hand against the fixture (docs/design/v2-board.md section 14.2). It is used only when
 * an API function throws `BoardNotBuiltError` (see ../engine.ts), and the board says so on screen.
 *
 * It invents no figures. 2026 scores come from the real indicators and the model's bands (the
 * seeding rule of section 4.1). Costs, build times, effects and coins come from the model. It does
 * not spread effects along links, move people or change backing: the board says that too.
 * Delete this folder when packages 2 and 3 have landed.
 */
import type {
  Action, ActionOption, BoardModel, BoardState, Blocker, CouncilCode, CouncilDef, CouncilState, Frame, MeasureId,
  Preview, PreviewChange, ProjectDef, ProjectState, RiskKind, Site, StartId,
} from "../../engine/api";
import { BoardActionError, MEASURE_IDS } from "../../engine/api";

/** A rule param's default, or `fallback` when the model lacks it. */
export function ruleParam(model: BoardModel, id: string, name: string, fallback: number): number {
  return model.rules.find((r) => r.id === id)?.params[name]?.default ?? fallback;
}

/** The 2026 score of a measure in a council: the plain mean of its indicators' band scores. */
export function seedScore(model: BoardModel, c: CouncilDef, measure: MeasureId): number {
  const def = model.measures.find((m) => m.id === measure);
  const scores = (def?.indicators ?? []).flatMap((id) => {
    const v = c.real[id], b = model.bands[id];
    if (v === undefined || !b || b.goal === b.floor) return [];
    return [Math.max(0, Math.min(10, (10 * (v - b.floor)) / (b.goal - b.floor)))];
  });
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;
}

function hash(seed: number | string): number {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  let h = 0x811c9dc5;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function frameOf(state: BoardState, fairness: number): Frame {
  const councils: Frame["councils"] = {};
  for (const [code, c] of Object.entries(state.councils)) {
    councils[code] = { measures: { ...c.measures }, young: c.young, backing: c.backing, risks: { ...c.risks } };
  }
  return {
    turn: state.turn, year: state.year, councils,
    projects: state.projects.map(({ id, project, site, level, status }) => ({ id, project, site, level, status })),
    linkQuality: { ...state.linkQuality }, events: [], flows: [], coins: state.coins, fairness,
  };
}

/** The fairness gap of section 4.1: the middle council's mean less the mean of the three lowest. */
export function fairnessGap(state: BoardState): number {
  const means = Object.values(state.councils).map((c) => MEASURE_IDS.reduce((a, m) => a + c.measures[m], 0) / MEASURE_IDS.length).sort((a, b) => a - b);
  if (!means.length) return 0;
  const low = means.slice(0, Math.min(3, means.length));
  return means[Math.floor(means.length / 2)]! - low.reduce((a, b) => a + b, 0) / low.length;
}

export function newBoard(model: BoardModel, gameNumber: number | string, start: StartId): BoardState {
  const seed = hash(gameNumber);
  const startDef = model.starts.find((s) => s.id === start) ?? model.starts[0]!;
  const backsStart = ruleParam(model, "P2", "start", 5);
  const councils: Record<CouncilCode, CouncilState> = {};
  for (const code of model.game.councils) {
    const def = model.councils.find((c) => c.code === code)!;
    let backing = backsStart;
    for (const b of startDef.backing) if ((b.flag && def.flags.includes(b.flag)) || b.council === code) backing += b.points;
    const measures = Object.fromEntries(MEASURE_IDS.map((m) => [m, seedScore(model, def, m)])) as Record<MeasureId, number>;
    councils[code] = {
      code, measures, pop: def.real["pop"] ?? 0, young: def.real["young_adults"] ?? 0, age65: def.real["age65"] ?? 0,
      backing, moods: Object.fromEntries(model.groups.map((g) => [g.id, { mood: backing }])),
      risks: { flood: 1, tip: def.features.includes("coal_tips") ? 1 : 0, employer: 1 },
      lastReachedTurn: null,
    };
  }
  const state: BoardState = {
    version: 1, modelHash: model.meta.hash, gameNumber, seed, start: startDef.id,
    future: model.futures[seed % Math.max(1, model.futures.length)]?.id ?? "",
    turn: 0, year: model.game.first_year, phase: "build", steps: [], councils,
    linkQuality: Object.fromEntries(model.links.filter((l) => l.kind === "rail").map((l) => [l.id, l.quality ?? 1])),
    projects: [], coins: ruleParam(model, "B1", "base", 6), freeProject: startDef.free_project, laws: [], lawChangesLeft: 1,
    election: { records: [], weakUntil: null, strongUntil: null },
    promise: { byYear: startDef.promise.by_year, kept: null },
    forecast: [], pending: [], events: [], severityUsed: 0, visitsThisTurn: 0, history: [], ledger: [],
  };
  state.history.push(frameOf(state, fairnessGap(state)));
  return state;
}

const siteKey = (site: Site) => site.council ?? site.link ?? "";
const touches = (model: BoardModel, site: Site, code: CouncilCode) => {
  if (site.council !== undefined) return site.council === code;
  const l = model.links.find((x) => x.id === site.link);
  return !!l && (l.from === code || l.to === code);
};

/** Working projects of a branch and tier anywhere on the board. */
const working = (state: BoardState, model: BoardModel, branch: string, tier: number) =>
  state.projects.filter((p) => p.status === "working" && model.projects.find((d) => d.id === p.project && d.branch === branch && d.tier === tier)).length;

function blockersFor(model: BoardModel, state: BoardState, def: ProjectDef, site: Site, upgrade: ProjectState | null): { blockers: Blocker[]; cost: number } {
  const out: Blocker[] = [];
  if (state.phase !== "build") out.push({ kind: "phase", phase: state.phase });
  const free = !upgrade && state.freeProject === def.id;
  const cost = upgrade ? (def.upgrade_costs?.[upgrade.level - 1] ?? 0) : free ? 0 : def.cost;
  if (upgrade) {
    if (!def.upgrade_costs || upgrade.level >= 3) out.push({ kind: "max_level" });
  } else if (state.projects.some((p) => p.project === def.id && siteKey(p.site) === siteKey(site))) out.push({ kind: "already_here" });
  const branch = model.branches.find((b) => b.id === def.branch);
  const tier = upgrade ? ((upgrade.level + 1) as 2 | 3) : def.tier;
  if (tier > 1 && branch) {
    const need = tier === 2 ? 3 : 2;
    const tierDef = branch.tiers[tier - 1]!;
    if (working(state, model, def.branch, tier - 1) < need) {
      out.push({ kind: "needs", condition: tierDef.opens[0] ?? { kind: "tier_open", branch: def.branch, tier }, rule: tierDef.rule ?? `need:${def.branch}:${tier}` });
    }
  }
  if (site.council !== undefined) {
    const c = model.councils.find((x) => x.code === site.council);
    for (const n of def.needs) {
      if (n.kind === "feature" && c && !c.features.includes(n.feature) !== !!n.not) out.push({ kind: "needs", condition: n, rule: def.rule ?? `need:${def.id}` });
      if (n.kind === "link_quality") {
        const best = Math.max(1, ...model.links.filter((l) => l.kind === "rail" && (l.from === site.council || l.to === site.council)).map((l) => state.linkQuality[l.id] ?? 1));
        if (best < n.at_least) out.push({ kind: "needs", condition: n, rule: def.rule ?? `need:${def.id}` });
      }
    }
  }
  if (def.keystone && !upgrade && state.year > model.game.keystone_last_start_year) out.push({ kind: "too_late", lastYear: model.game.keystone_last_start_year });
  if (cost > state.coins) out.push({ kind: "coins", need: cost, have: state.coins });
  return { blockers: out, cost };
}

export function options(model: BoardModel, state: BoardState, council?: CouncilCode): ActionOption[] {
  const out: ActionOption[] = [];
  const councils = council ? [council] : model.game.councils;
  for (const def of model.projects) {
    const sites: Site[] = def.site === "link"
      ? model.links.filter((l) => l.kind === "rail" && !l.outside && councils.some((c) => l.from === c || l.to === c)).map((l) => ({ link: l.id }))
      : councils.map((c) => ({ council: c }));
    for (const site of sites) {
      const standing = state.projects.find((p) => p.project === def.id && siteKey(p.site) === siteKey(site));
      const { blockers, cost } = blockersFor(model, state, def, site, null);
      const ready = state.year + Math.max(1, def.build_turns) * model.game.turn_years;
      out.push({ action: { kind: "build", project: def.id, site }, allowed: blockers.length === 0, blockers, cost, buildTurns: def.build_turns, readyYear: ready, project: def.id, branch: def.branch, tier: def.tier });
      if (standing && def.upgrade_costs) {
        const up = blockersFor(model, state, def, site, standing);
        out.push({ action: { kind: "upgrade", project: def.id, site }, allowed: up.blockers.length === 0, blockers: up.blockers, cost: up.cost, buildTurns: 1, readyYear: state.year + model.game.turn_years, project: def.id, branch: def.branch, tier: def.tier });
      }
    }
  }
  for (const law of model.laws) {
    const blockers: Blocker[] = state.lawChangesLeft > 0 ? [] : [{ kind: "law_changes_used" }];
    out.push({ action: { kind: "law", law: law.id, pass: !state.laws.includes(law.id) }, allowed: blockers.length === 0, blockers, cost: 0 });
  }
  return out;
}

/** Councils an effect of a project at a site lands on (the stand-in reads `where` only). */
export function effectCouncils(model: BoardModel, def: ProjectDef, site: Site, where: string | undefined, flag?: string): CouncilCode[] {
  const base = site.council !== undefined ? [site.council] : (() => { const l = model.links.find((x) => x.id === site.link); return l ? [l.from, l.to] : []; })();
  if (where === "everywhere") return [...model.game.councils];
  if (where === "flagged") return model.councils.filter((c) => model.game.councils.includes(c.code) && flag && c.flags.includes(flag as never)).map((c) => c.code);
  if (where === "downstream") return model.links.filter((l) => l.kind === "river" && base.includes(l.from)).map((l) => l.to);
  if (where === "linked") return model.links.filter((l) => base.includes(l.from) || base.includes(l.to)).map((l) => (base.includes(l.from) ? l.to : l.from));
  return base.filter((c) => model.game.councils.includes(c));
}

export function preview(model: BoardModel, state: BoardState, action: Action): Preview {
  const opt = options(model, state).find((o) => JSON.stringify(o.action) === JSON.stringify(action));
  const base: Preview = { action, allowed: opt?.allowed ?? false, blockers: opt?.blockers ?? [{ kind: "not_offered" }], cost: opt?.cost ?? 0, coinsAfter: state.coins - (opt?.cost ?? 0), changes: [], links: [], councils: [], notes: [] };
  if (action.kind !== "build" && action.kind !== "upgrade") return base;
  const def = model.projects.find((p) => p.id === action.project);
  if (!def) return base;
  const changes: PreviewChange[] = [];
  const year = opt?.readyYear ?? state.year + model.game.turn_years;
  for (const e of def.effects) {
    if (e.kind !== "measure") continue;
    for (const c of effectCouncils(model, def, action.site, e.where ?? (def.site === "link" ? "link_ends" : "here"), e.flag)) {
      changes.push({ council: c, quantity: e.measure, delta: e.points, year: year + (e.after_turns ?? 0) * model.game.turn_years, rule: e.rule ?? def.rule ?? def.id });
    }
  }
  const at = action.site.council !== undefined ? [action.site.council] : [];
  const jobs = def.effects.some((e) => e.kind === "measure" && e.jobs);
  const downstream = def.effects.some((e) => e.where === "downstream");
  const links = model.links.filter((l) =>
    l.id === action.site.link
    || (jobs && l.kind === "commute" && at.includes(l.to))
    || (downstream && l.kind === "river" && at.includes(l.from))).map((l) => l.id);
  const councils = new Set<CouncilCode>([...at, ...changes.map((c) => c.council)]);
  for (const id of links) { const l = model.links.find((x) => x.id === id)!; if (model.game.councils.includes(l.from)) councils.add(l.from); if (model.game.councils.includes(l.to)) councils.add(l.to); }
  return { ...base, changes, links, councils: [...councils] };
}

export function act(model: BoardModel, state: BoardState, action: Action): BoardState {
  const s = structuredClone(state);
  if (action.kind === "build" || action.kind === "upgrade") {
    const opt = options(model, s).find((o) => JSON.stringify(o.action) === JSON.stringify(action));
    if (!opt || !opt.allowed) throw new BoardActionError(opt?.blockers ?? [{ kind: "not_offered" }]);
    const def = model.projects.find((p) => p.id === action.project)!;
    s.coins -= opt.cost;
    if (action.kind === "build") {
      if (s.freeProject === def.id) s.freeProject = null;
      const turns = Math.max(1, def.build_turns);
      s.projects.push({ id: `${def.id}@${siteKey(action.site)}`, project: def.id, site: action.site, level: 1, status: "building", startedTurn: s.turn, readyTurn: s.turn + turns - 1 });
    } else {
      const p = s.projects.find((x) => x.project === def.id && siteKey(x.site) === siteKey(action.site))!;
      p.level = Math.min(3, p.level + 1) as 1 | 2 | 3;
      p.status = "building";
      p.readyTurn = s.turn;
    }
  } else if (action.kind === "law") {
    if (s.lawChangesLeft <= 0) throw new BoardActionError([{ kind: "law_changes_used" }]);
    s.laws = action.pass ? [...s.laws, action.law] : s.laws.filter((l) => l !== action.law);
    s.lawChangesLeft -= 1;
  } else if (action.kind === "respond") {
    s.pending = s.pending.filter((p) => !(p.kind === "respond" && p.event === action.event));
    const rec = [...s.events].reverse().find((e) => e.event === action.event);
    if (rec) rec.response = action.response;
    const resp = model.events.find((e) => e.id === action.event)?.responses.find((r) => r.id === action.response);
    if (resp) s.coins -= Math.min(resp.cost, s.coins);
  } else if (action.kind === "visit") {
    s.pending = s.pending.filter((p) => !(p.kind === "visit" && p.place === action.place));
    s.visitsThisTurn += 1;
  }
  s.steps.push(action);
  return s;
}

export const RISK_OF: Record<string, RiskKind> = { risk_flood: "flood", risk_tip: "tip", risk_employer: "employer" };
export { touches as projectTouchesCouncil };
