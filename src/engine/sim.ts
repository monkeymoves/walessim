/**
 * The simulation of one uncertainty run through one term. Pure functions over plain data.
 *
 * The world (what was played, what is in the post, which trends and shocks are live) is shared by
 * every run; only rule parameters vary between runs (game-design 11.3). Each run holds its own
 * scores. Run 0 uses the default parameters and records the contributions that traces are built from.
 *
 * Order of a term (per run):
 *   1. reversals of temporary effects that have run their course
 *   2. baseline clock rules (R01, R02, R05) and clock stocks (R04)
 *   3. deliveries landing this term: slow trends, cards (from the post and played now),
 *      shocks, upkeep lapses, standing tickets, the jobs ripple (R25)
 *   4. threshold events (R12 tips, R28 employers, R20 heartland)
 *   5. chained rules in YAML order (`change` drive: R07, R14, R17, R18, R22, R23, R27, R31, R32)
 *   6. stocks: decay (R15, R21, R33), nature towards the FCM equilibrium (R03), carbon (R34)
 *   7. clamp to 0..10 and keep this term's change for next term's lagged rules
 */
import type { CauseKind, Contribution, Cause } from "./api";
import type { Confidence, Effect, Rule, Size } from "../model/schema";
import { clamp10, walesDelta, walesValue, type Ctx } from "./scores";
import { edgeNoise, runFcm, stateMean } from "./fcm";
import { uniform } from "./rng";

// ---------------------------------------------------------------------------
// World-level types (shared by all runs)

/** A cause, as stored in the world. */
export type CauseRef = Cause;

/** One effect scheduled to land in a term, shared by all runs. */
export interface Delivery {
  key: string;
  cause: CauseRef;
  /** Card play id, for reversing a play's effects. */
  play: string | null;
  effect: Effect;
  /** Weight per authority (0 outside the mask), including emphasis and place grade. */
  weights: number[];
  sizeStep: number;
  /** For fcm targets: the share of Wales in scope. */
  fcmShare: number;
  /** Fixed multiplier: shock hit, slow trend scale, partners half, world-level conditions. */
  scale: number;
  /** R30 repeat play penalty applies (run parameter). */
  repeat: boolean;
  /** R06: this many plays of the card came before. */
  playsBefore: number;
  landTerm: number;
  main: boolean;
  confidence: Confidence;
  /** Temporary: reversed after this many terms. */
  duration: number | null;
}

/** A discrete event check for this term (world-level trigger, per-run outcome). */
export interface EventCheck {
  kind: "tip_movement" | "employer_leaves" | "heartland_drop";
  cause: CauseRef;
  /** Hit multiplier from the response. */
  hit: number;
  /** Authorities affected (employers: the shock's area). */
  las: number[];
  /** Tip risk raised by the wet decade. */
  riskUp: boolean;
}

/** A fragile employer that may leave (R28). */
export interface Employer {
  play: string;
  las: number[];
}

/** What a run needs to resolve one term. */
export interface TermInput {
  term: number;
  year: number;
  deliveries: Delivery[];
  reversePlays: { play: string; cause: CauseRef }[];
  events: EventCheck[];
  employers: Employer[];
  /** Plays this term with an IO sector: the jobs ripple. */
  ripples: { cause: CauseRef; play: string; cost: number; sector: string; weights: number[] }[];
  seed: number;
}

// ---------------------------------------------------------------------------
// Run state

export interface RunState {
  /** Scores [component][authority]. */
  s: number[][];
  /** Offsets on FCM drivers and pressures. */
  fcmOff: Record<string, number>;
  /** Change of each score during the previous term (for lag 1 rules). */
  last: number[][];
  reversals: { term: number; comp: number; perLa: number[]; cause: CauseRef; rule: string | null; side: boolean }[];
  /** Main effects applied per card play (to reverse on a lapse or a leaving employer). */
  applied: Record<string, { comp: number; perLa: number[]; rule: string | null }[]>;
  /** Totals per saturating ceiling rule per authority. */
  ruleTotal: Record<string, number[]>;
  employersGone: Record<string, boolean>;
  heartlandDropped: boolean[];
  /** Strand flow and stock after each finished term. */
  flowHist: number[][];
  stockHist: number[][];
  /** FCM state mean with no offsets for this run's noise. */
  eq0: number;
  /** Run 0 only: per-cause FCM offsets and nature decomposition. */
  fcmByCause?: Record<string, { cause: CauseRef; off: Record<string, number> }>;
  natureByCause?: Record<string, number>;
  /** Run 0 only: cumulative Wales change of emissions by cause (for R34 attribution). */
  emissionsByCause?: Record<string, { cause: CauseRef; v: number }>;
  /** Run 0 only: cumulative per-authority change caused by the player, per component. */
  playerCum?: number[][];
}

/** Sampled parameters of one run: "R13.coef" to value. */
export type RunParams = Record<string, number>;

const SIZE_LADDER: Size[] = ["S", "M", "L"];

export function causeKey(c: CauseRef): string {
  return `${c.kind}:${c.id}:${c.term}`;
}

const PLAYER_KINDS = new Set<CauseKind>(["card", "standing", "upkeep"]);

/** Sample every rule parameter for a run. Run 0 takes the defaults (or the overrides). */
export function sampleParams(ctx: Ctx, seed: number, run: number, overrides: Record<string, number>): RunParams {
  const out: RunParams = {};
  for (const r of ctx.model.rules) {
    for (const [name, p] of Object.entries(r.params)) {
      const key = `${r.id}.${name}`;
      const centre = overrides[key] ?? p.default;
      if (run === 0 || !p.adjustable || p.min === p.max) {
        out[key] = centre;
        continue;
      }
      const u = uniform(seed, "param", run, key) * 2 - 1;
      out[key] = u < 0 ? centre + u * (centre - p.min) : centre + u * (p.max - centre);
    }
  }
  return out;
}

const noiseCache = new Map<string, Float64Array[]>();
function noiseFor(ctx: Ctx, seed: number, run: number): Float64Array[] | undefined {
  if (run === 0) return undefined;
  const k = `${ctx.model.meta.hash}:${seed}:${run}`;
  let n = noiseCache.get(k);
  if (!n) {
    if (noiseCache.size > 2000) noiseCache.clear();
    n = edgeNoise(ctx.fcm, seed, run);
    noiseCache.set(k, n);
  }
  return n;
}

/** A fresh run at the 2026 start. */
export function initRun(ctx: Ctx, seed: number, run: number): RunState {
  const noise = noiseFor(ctx, seed, run);
  const zeros = () => ctx.base.map((row) => row.map(() => 0));
  const r: RunState = {
    s: ctx.base.map((row) => [...row]),
    fcmOff: {},
    last: zeros(),
    reversals: [],
    applied: {},
    ruleTotal: {},
    employersGone: {},
    heartlandDropped: ctx.las.map(() => false),
    flowHist: [],
    stockHist: [],
    eq0: stateMean(ctx.fcm, runFcm(ctx.fcm, {}, noise)),
  };
  if (run === 0) {
    r.fcmByCause = {};
    r.natureByCause = {};
    r.emissionsByCause = {};
    r.playerCum = zeros();
  }
  return r;
}

/** Deep copy of a run (plain data). */
export function cloneRun(r: RunState): RunState {
  return structuredClone(r);
}

// ---------------------------------------------------------------------------
// One term

interface TermCtx {
  ctx: Ctx;
  run: RunState;
  P: RunParams;
  runIndex: number;
  input: TermInput;
  /** This term's change so far, [component][authority]. */
  delta: number[][];
  /** Run 0: contributions this term. */
  contribs: Contribution[] | null;
  /** Run 0: last term's contributions (for lag 1 chains). */
  lastContribs: Contribution[] | null;
  /** Discrete events this run (run 0 reports them). */
  events: { kind: string; id: string; la?: number; play?: string }[];
}

/**
 * Resolve one term for one run, mutating `run`. Returns the contributions (run 0) and events.
 */
export function stepRun(
  ctx: Ctx,
  run: RunState,
  P: RunParams,
  runIndex: number,
  input: TermInput,
  lastContribs: Contribution[] | null,
): { contribs: Contribution[] | null; events: TermCtx["events"] } {
  const t: TermCtx = {
    ctx,
    run,
    P,
    runIndex,
    input,
    delta: ctx.base.map((row) => row.map(() => 0)),
    contribs: runIndex === 0 ? [] : null,
    lastContribs,
    events: [],
  };
  const start = run.s.map((row) => [...row]);

  // 1. reversals due
  const due = run.reversals.filter((x) => x.term <= input.term);
  run.reversals = run.reversals.filter((x) => x.term > input.term);
  for (const x of due) apply(t, x.comp, x.perLa.map((v) => -v), x.cause, x.rule, x.side, null);

  // 2. baseline clock rules
  for (const rule of ctx.model.rules) {
    if (rule.drive === "clock" && rule.kind === "linear") {
      if (rule.from_year && input.year < rule.from_year) continue;
      const coef = P[`${rule.id}.coef`] ?? 0;
      const w = maskWeights(ctx, rule.where, rule.emphasis);
      for (const out of rule.outputs) {
        const c = ctx.comp.get(out);
        if (c === undefined) continue;
        apply(t, c, w.map((x) => x * coef), baselineCause(rule, input), rule.id, false, null);
      }
    }
    if (rule.params["ageing"]) {
      // stocks that age without renewal (assets wear, drained peat oxidises)
      const rate = P[`${rule.id}.ageing`] ?? 0;
      const w = maskWeights(ctx, rule.where, rule.emphasis);
      const c = ctx.comp.get(rule.outputs[0] ?? "");
      if (c !== undefined && rate !== 0) apply(t, c, w.map((x) => x * rate), baselineCause(rule, input), rule.id, false, null);
    }
    if (rule.kind === "stock" && rule.stock === "clock") {
      const rate = P[`${rule.id}.rate`] ?? 0;
      const w = maskWeights(ctx, rule.where, rule.emphasis);
      for (const out of rule.outputs) {
        const c = ctx.comp.get(out);
        if (c !== undefined) apply(t, c, w.map((x) => x * rate), baselineCause(rule, input), rule.id, false, null);
      }
    }
  }

  // 3. deliveries
  for (const d of input.deliveries) if (d.landTerm === input.term) land(t, d);
  for (const rp of input.reversePlays) reversePlay(t, rp.play, rp.cause, null, "R24");
  for (const rip of input.ripples) jobsRipple(t, rip);

  // 4. threshold events
  for (const ev of input.events) thresholdEvent(t, ev);
  heartlandCheck(t);

  // 5. chained rules
  for (const rule of ctx.model.rules) if (rule.drive === "change" && rule.stock !== "accumulate") chain(t, rule);

  // 6. stocks
  for (const rule of ctx.model.rules) {
    if (rule.kind !== "stock") continue;
    if (rule.stock === "decay") decay(t, rule);
    else if (rule.stock === "approach_fcm") nature(t, rule);
    else if (rule.stock === "accumulate") carbon(t, rule);
  }

  // 7. clamp and keep the change
  const clamped: { c: number; i: number }[] = [];
  for (let c = 0; c < run.s.length; c++) {
    const row = run.s[c]!;
    for (let i = 0; i < row.length; i++) {
      const v = clamp10(row[i]!);
      if (v !== row[i]) clamped.push({ c, i });
      row[i] = v;
      run.last[c]![i] = row[i]! - start[c]![i]!;
    }
  }
  // run 0: where a score hit 0 or 10, scale that authority's contributions so they add up to the real change
  if (t.contribs && clamped.length) {
    const touched = new Set<Contribution>();
    for (const { c, i } of clamped) {
      const id = ctx.comps[c]!.id;
      const list = t.contribs.filter((x) => x.component === id);
      const total = list.reduce((a, x) => a + x.perLa[i]!, 0);
      const actual = run.last[c]![i]!;
      if (Math.abs(total) < 1e-12) continue;
      const k = actual / total;
      for (const x of list) {
        x.perLa[i] = x.perLa[i]! * k;
        touched.add(x);
      }
    }
    for (const x of touched) x.wales = walesDelta(ctx, ctx.comp.get(x.component)!, x.perLa);
  }
  return { contribs: t.contribs, events: t.events };
}

function baselineCause(rule: Rule, input: TermInput): CauseRef {
  return { kind: "baseline", id: rule.id, term: input.term, year: input.year, regions: null };
}

/** Weights per authority for a rule's where/emphasis (no card scope). */
export function maskWeights(ctx: Ctx, where?: Effect["where"], emphasis?: Effect["emphasis"], scope?: number[] | null): number[] {
  return ctx.las.map((a, i) => {
    if (scope && !scope.includes(i)) return 0;
    if (where) {
      if (where.regions && !where.regions.includes(a.region)) return 0;
      if (where.las && !where.las.includes(a.code)) return 0;
      if (where.flags && !where.flags.some((f) => ctx.laFlags[i]!.has(f))) return 0;
      if (where.not_flags && where.not_flags.some((f) => ctx.laFlags[i]!.has(f))) return 0;
    }
    let w = 1;
    for (const em of emphasis ?? []) {
      const hit =
        (!em.regions || em.regions.includes(a.region)) &&
        (!em.las || em.las.includes(a.code)) &&
        (!em.flags || em.flags.some((f) => ctx.laFlags[i]!.has(f)));
      if (hit) w = Math.max(w, em.factor);
    }
    return w;
  });
}

/** Add a change to the scores and record it (run 0). */
function apply(t: TermCtx, c: number, perLa: number[], cause: CauseRef, rule: string | null, side: boolean, via: string | null) {
  const row = t.run.s[c]!;
  const d = t.delta[c]!;
  let any = false;
  for (let i = 0; i < perLa.length; i++) {
    const v = perLa[i]!;
    if (v === 0) continue;
    any = true;
    row[i] = row[i]! + v;
    d[i] = d[i]! + v;
  }
  if (!any || !t.contribs) return;
  t.contribs.push({ component: t.ctx.comps[c]!.id, cause, rule, via, side, wales: walesDelta(t.ctx, c, perLa), perLa: [...perLa] });
  if (PLAYER_KINDS.has(cause.kind) && t.run.playerCum) {
    const pc = t.run.playerCum[c]!;
    for (let i = 0; i < perLa.length; i++) pc[i] = pc[i]! + perLa[i]!;
  }
  if (t.ctx.comps[c]!.id === "emissions_head" && t.run.emissionsByCause) {
    const k = causeKey(cause);
    const e = (t.run.emissionsByCause[k] ??= { cause, v: 0 });
    e.v += walesDelta(t.ctx, c, perLa);
  }
}

/** Multiplier of an effect from its rule's sampled coefficient. */
function ruleScale(t: TermCtx, rule: Rule | undefined): number {
  if (!rule) return 1;
  const p = rule.params["coef"];
  if (!p || p.default === 0) return 1;
  return (t.P[`${rule.id}.coef`] ?? p.default) / p.default;
}

/** Spread multiplier for effects without a rule, by confidence (per run, per delivery). */
function noRuleScale(t: TermCtx, d: Delivery): number {
  if (t.runIndex === 0 || d.effect.rule) return 1;
  const spread = t.ctx.model.game.default_spread[d.confidence] ?? 0.3;
  return 1 + (uniform(t.input.seed, "norule", t.runIndex, d.cause.id, d.effect.target, d.effect.size ?? "", d.effect.sign) * 2 - 1) * spread;
}

function sizePoints(t: TermCtx, size: Size, step: number, fcm: boolean): number {
  const g = t.ctx.model.game;
  const table = fcm ? g.fcm_sizes : g.sizes;
  const i = SIZE_LADDER.indexOf(size) + step;
  // a regional step never goes beyond L
  return table[SIZE_LADDER[Math.max(0, Math.min(2, i))]!];
}

/** Land one delivery in this run. */
function land(t: TermCtx, d: Delivery) {
  const { ctx } = t;
  const e = d.effect;
  if (e.target === "budget" || e.target === "trust" || e.target === "card_cost") return; // world-level
  const rule = e.rule ? ctx.rules.get(e.rule) : undefined;
  let amt = e.size ? sizePoints(t, e.size, d.sizeStep, e.target.startsWith("fcm:")) : (e.amount ?? 0);
  amt *= e.sign * d.scale * ruleScale(t, rule) * noRuleScale(t, d);
  if (d.repeat) amt *= t.P["R30.coef"] ?? 0.6;
  if (rule?.saturate === "plays" && d.playsBefore >= (rule.after_plays ?? 3)) amt *= 0.5;
  const cond = e.condition;
  if (cond?.half_if_below) {
    const c = ctx.comp.get(cond.half_if_below.component);
    if (c !== undefined && walesValue(ctx, c, t.run.s) < cond.half_if_below.value) amt *= 0.5;
  }
  if (e.target.startsWith("fcm:")) {
    const node = e.target.slice(4);
    const v = amt * d.fcmShare;
    t.run.fcmOff[node] = (t.run.fcmOff[node] ?? 0) + v;
    if (t.run.fcmByCause) {
      const k = causeKey(d.cause);
      const b = (t.run.fcmByCause[k] ??= { cause: d.cause, off: {} });
      b.off[node] = (b.off[node] ?? 0) + v;
    }
    return;
  }
  const c = ctx.comp.get(e.target);
  if (c === undefined) return;
  const perLa = d.weights.map((w) => w * amt);
  if (cond?.only_where_below_middle) {
    const mc = ctx.comp.get(cond.only_where_below_middle);
    if (mc !== undefined) for (let i = 0; i < perLa.length; i++) if (t.run.s[mc]![i]! >= 5) perLa[i] = 0;
  }
  if (rule?.saturate === "ceiling") {
    const cap = t.P[`${rule.id}.ceiling`] ?? 2;
    const tot = (t.run.ruleTotal[rule.id] ??= ctx.las.map(() => 0));
    for (let i = 0; i < perLa.length; i++) {
      if (perLa[i]! > 0) {
        const room = Math.max(0, cap - tot[i]!);
        perLa[i] = Math.min(perLa[i]!, room);
      }
      tot[i] = tot[i]! + perLa[i]!;
    }
  }
  apply(t, c, perLa, d.cause, e.rule ?? null, !!e.side, null);
  if (d.play && d.main) (t.run.applied[d.play] ??= []).push({ comp: c, perLa, rule: e.rule ?? null });
  if (d.duration) t.run.reversals.push({ term: t.input.term + d.duration, comp: c, perLa, cause: d.cause, rule: e.rule ?? null, side: !!e.side });
}

/** Reverse the main effects a play has delivered so far (upkeep lapse or employer leaving). */
function reversePlay(t: TermCtx, play: string, cause: CauseRef, extra: { comp: number; perLa: number[] } | null, rule: string) {
  const list = t.run.applied[play] ?? [];
  for (const a of list) apply(t, a.comp, a.perLa.map((v) => -v), cause, rule, true, null);
  t.run.applied[play] = [];
  if (extra) apply(t, extra.comp, extra.perLa, cause, rule, true, null);
}

/** R25: spending creates jobs this term and next only. */
function jobsRipple(t: TermCtx, rip: TermInput["ripples"][number]) {
  const band = t.ctx.model.io.find((b) => b.sector === rip.sector)?.band ?? 2;
  const per = t.P[`R25.band${band}`] ?? 0.4;
  const scale = t.P["R25.scale"] ?? 0.5;
  const c = t.ctx.comp.get("employment");
  if (c === undefined) return;
  const perLa = rip.weights.map((w) => w * per * rip.cost * scale);
  apply(t, c, perLa, rip.cause, "R25", true, null);
  t.run.reversals.push({ term: t.input.term + 2, comp: c, perLa, cause: rip.cause, rule: "R25", side: true });
}

/** Threshold events R12 and R28 (and a forced R20 from the language shock). */
function thresholdEvent(t: TermCtx, ev: EventCheck) {
  const { ctx, run, P } = t;
  const M = ctx.model.game.sizes.M;
  const S = ctx.model.game.sizes.S;
  if (ev.kind === "tip_movement") {
    const tip = ctx.comp.get("tip_liability")!;
    const access = ctx.comp.get("access")!;
    for (const i of ctx.flagLas.coal_valley) {
      const base = ctx.base[tip]![i]!;
      const made = Math.max(0, Math.min(1, (run.s[tip]![i]! - base) / Math.max(0.5, 10 - base)));
      const step = Math.min(3, (run.s[tip]![i]! < 4 ? 2 : 1) + (ev.riskUp ? 1 : 0));
      const chance = (P[`R12.chance${step}`] ?? 0.25) * (1 - made);
      if (uniform(t.input.seed, "tip", t.input.term, i) < chance) {
        const perA = ctx.las.map((_, j) => (j === i ? -M * ev.hit : 0));
        apply(t, access, perA, { ...ev.cause, kind: "event", id: "R12" }, "R12", true, null);
        run.reversals.push({ term: t.input.term + 1, comp: access, perLa: perA, cause: { ...ev.cause, kind: "event", id: "R12" }, rule: "R12", side: true });
        apply(t, tip, ctx.las.map((_, j) => (j === i ? -S : 0)), { ...ev.cause, kind: "event", id: "R12" }, "R12", true, null);
        t.events.push({ kind: "tip_moved", id: "R12", la: i });
      }
    }
  } else if (ev.kind === "employer_leaves") {
    const emp = ctx.comp.get("employment")!;
    for (const e of t.input.employers) {
      if (run.employersGone[e.play]) continue;
      if (!e.las.some((i) => ev.las.includes(i))) continue;
      if (uniform(t.input.seed, "employer", t.input.term, e.play) >= (P["R28.chance"] ?? 0.6)) continue;
      run.employersGone[e.play] = true;
      const extra = P["R28.extra"] ?? -0.5;
      reversePlay(t, e.play, { ...ev.cause, kind: "event", id: "R28" }, { comp: emp, perLa: ctx.las.map((_, i) => (e.las.includes(i) ? extra : 0)) }, "R28");
      t.events.push({ kind: "employer_left", id: "R28", play: e.play, la: e.las[0] });
    }
  } else if (ev.kind === "heartland_drop") {
    // the language shock: the heartland authority closest to the level drops
    const i = closestHeartland(t);
    if (i !== null) heartlandEvent(t, i, ev.cause, ev.hit);
  }
}

function welshShare(t: TermCtx, i: number): number | null {
  const band = t.ctx.bands.get("welsh_speakers");
  const c = t.ctx.comp.get("welsh_speakers");
  if (!band || c === undefined) return null;
  return band.floor + (t.run.s[c]![i]! / 10) * (band.goal - band.floor);
}

function closestHeartland(t: TermCtx): number | null {
  let best: number | null = null;
  let bestV = Infinity;
  for (const i of t.ctx.flagLas.heartland) {
    if (t.run.heartlandDropped[i]) continue;
    const v = welshShare(t, i) ?? 50;
    if (v < bestV) {
      bestV = v;
      best = i;
    }
  }
  return best;
}

function heartlandEvent(t: TermCtx, i: number, cause: CauseRef, hit: number) {
  const { ctx } = t;
  t.run.heartlandDropped[i] = true;
  const h = ctx.comp.get("heartland")!;
  const w = ctx.comp.get("welsh_speakers")!;
  const c: CauseRef = { ...cause, kind: "event", id: "R20" };
  apply(t, h, ctx.las.map((_, j) => (j === i ? -ctx.model.game.sizes.M * hit : 0)), c, "R20", true, null);
  apply(t, w, ctx.las.map((_, j) => (j === i ? -ctx.model.game.sizes.S * hit : 0)), c, "R20", true, null);
  t.events.push({ kind: "heartland_drop", id: "R20", la: i });
}

/** R20: a heartland authority falling below the level (once each). */
function heartlandCheck(t: TermCtx) {
  const level = t.P["R20.level"] ?? 50;
  for (const i of t.ctx.flagLas.heartland) {
    if (t.run.heartlandDropped[i]) continue;
    const v = welshShare(t, i);
    const start = t.ctx.model.la_data["welsh_speakers"]?.values?.[t.ctx.las[i]!.code];
    if (v !== null && start !== undefined && start >= level && v < level) {
      heartlandEvent(t, i, { kind: "event", id: "R20", term: t.input.term, year: t.input.year, regions: [t.ctx.laRegion[i]!] }, 1);
    }
  }
}

/** A `change` rule: outputs move by coef times the input's change (lag 0: this term so far; lag 1: last term). */
function chain(t: TermCtx, rule: Rule) {
  const { ctx } = t;
  const lag = rule.change_lag ?? rule.lag;
  const inputs = Array.isArray(rule.input) ? rule.input : rule.input ? [rule.input] : [];
  const mask = rule.where ? maskWeights(ctx, rule.where) : null;
  for (const inId of inputs) {
    const ci = ctx.comp.get(inId);
    if (ci === undefined) continue;
    const dIn = lag === 0 ? [...t.delta[ci]!] : t.run.last[ci]!;
    if (dIn.every((v) => v === 0)) continue;
    const srcContribs = (lag === 0 ? t.contribs : t.lastContribs)?.filter((c) => c.component === inId) ?? null;
    for (const out of rule.outputs) {
      if (inputs.includes(out)) continue;
      const co = ctx.comp.get(out);
      if (co === undefined) continue;
      const coef = t.P[`${rule.id}.coef_${out}`] ?? t.P[`${rule.id}.coef`] ?? 0;
      if (coef === 0) continue;
      if (srcContribs && srcContribs.length) {
        // run 0: one contribution per upstream cause, exactly coef times its change
        for (const sc of srcContribs) {
          const perLa = sc.perLa.map((v, i) => v * coef * (mask ? (mask[i]! > 0 ? 1 : 0) : 1));
          apply(t, co, perLa, sc.cause, rule.id, true, inId);
        }
        // any part of the input change not covered by contributions (clamping) goes to the rule
        const covered = ctx.las.map((_, i) => srcContribs.reduce((a, sc) => a + sc.perLa[i]!, 0));
        const rest = dIn.map((v, i) => (v - covered[i]!) * coef * (mask ? (mask[i]! > 0 ? 1 : 0) : 1));
        if (rest.some((v) => Math.abs(v) > 1e-9)) applyNoRecord(t, co, rest);
      } else {
        const perLa = dIn.map((v, i) => v * coef * (mask ? (mask[i]! > 0 ? 1 : 0) : 1));
        if (t.contribs) apply(t, co, perLa, { kind: "baseline", id: rule.id, term: t.input.term, year: t.input.year, regions: null }, rule.id, true, inId);
        else applyNoRecord(t, co, perLa);
      }
    }
  }
}

function applyNoRecord(t: TermCtx, c: number, perLa: number[]) {
  const row = t.run.s[c]!;
  const d = t.delta[c]!;
  for (let i = 0; i < perLa.length; i++) {
    row[i] = row[i]! + perLa[i]!;
    d[i] = d[i]! + perLa[i]!;
  }
}

/**
 * Decay stocks: the stock flows out by `outflow` of what it holds above the level existing provision
 * keeps up (`floor_share` of the 2026 value; 1 means only gains erode).
 */
function decay(t: TermCtx, rule: Rule) {
  const out = t.P[`${rule.id}.outflow`] ?? 0.1;
  const keep = t.P[`${rule.id}.floor_share`] ?? 1;
  for (const id of rule.outputs) {
    const c = t.ctx.comp.get(id);
    if (c === undefined) continue;
    const perLa = t.run.s[c]!.map((v, i) => {
      const floor = t.ctx.base[c]![i]! * keep;
      return v > floor ? -out * (v - floor) : 0;
    });
    apply(t, c, perLa, { kind: "baseline", id: rule.id, term: t.input.term, year: t.input.year, regions: null }, rule.id, false, null);
  }
}

/** R03: nature moves towards the FCM equilibrium for today's pressures; the climate driver creeps up. */
function nature(t: TermCtx, rule: Rule) {
  const { ctx, run, P } = t;
  const c = ctx.comp.get("nature_condition");
  if (c === undefined) return;
  const drift = P[`${rule.id}.climate_drift`] ?? 0;
  run.fcmOff["driver:climate_change"] = (run.fcmOff["driver:climate_change"] ?? 0) + drift;
  const rate = P[`${rule.id}.rate`] ?? 0.25;
  const noise = noiseFor(ctx, t.input.seed, t.runIndex);
  const eq = stateMean(ctx.fcm, runFcm(ctx.fcm, run.fcmOff, noise));
  const target = ctx.base[c]![0]! + 10 * (eq - run.eq0);
  const row = run.s[c]!;
  const perLa = row.map((v) => rate * (target - v));
  if (!t.contribs || !run.fcmByCause || !run.natureByCause) {
    applyNoRecord(t, c, perLa);
    return;
  }
  // run 0: split the move between the causes that shifted the equilibrium and the baseline
  const total = perLa.reduce((a, v, i) => a + v * ctx.pop[i]!, 0);
  let assigned = 0;
  for (const [k, b] of Object.entries(run.fcmByCause)) {
    const without: Record<string, number> = { ...run.fcmOff };
    for (const [n, v] of Object.entries(b.off)) without[n] = (without[n] ?? 0) - v;
    const marginal = 10 * (eq - stateMean(ctx.fcm, runFcm(ctx.fcm, without)));
    const prev = run.natureByCause[k] ?? 0;
    const step = rate * (marginal - prev);
    run.natureByCause[k] = prev + step;
    if (Math.abs(step) < 1e-9) continue;
    assigned += step;
    apply(t, c, ctx.las.map(() => step), b.cause, rule.id, false, "fcm");
  }
  const rest = total - assigned;
  apply(t, c, ctx.las.map(() => rest), { kind: "baseline", id: rule.id, term: t.input.term, year: t.input.year, regions: null }, rule.id, false, null);
}

/** R34: the carbon budget gains or loses by how far emissions sit from a straight path to net zero. */
function carbon(t: TermCtx, rule: Rule) {
  const { ctx, run } = t;
  const c = ctx.comp.get("carbon_budget");
  const em = ctx.comp.get("emissions_head");
  if (c === undefined || em === undefined) return;
  const coef = t.P[`${rule.id}.coef`] ?? 0.3;
  const e0 = ctx.emissions0;
  const path = e0 + ((10 - e0) * (t.input.term + 1)) / 6;
  const now = walesValue(ctx, em, run.s);
  const d = coef * (now - path);
  if (!t.contribs || !run.emissionsByCause) {
    applyNoRecord(t, c, ctx.las.map(() => d));
    return;
  }
  let assigned = 0;
  for (const e of Object.values(run.emissionsByCause)) {
    if (e.cause.kind === "baseline" && e.cause.id === "R05") continue;
    const v = coef * e.v;
    if (Math.abs(v) < 1e-9) continue;
    assigned += v;
    apply(t, c, ctx.las.map(() => v), e.cause, rule.id, true, "emissions_head");
  }
  apply(t, c, ctx.las.map(() => d - assigned), { kind: "baseline", id: rule.id, term: t.input.term, year: t.input.year, regions: null }, rule.id, false, null);
}

/** Flow and stock scores of each strand for a run (strand order). */
export function runStrands(ctx: Ctx, run: RunState): { flow: number[]; stock: number[] } {
  const mean = (ids: number[]) => ids.reduce((a, c) => a + walesValue(ctx, c, run.s), 0) / ids.length;
  return { flow: ctx.strandFlow.map(mean), stock: ctx.strandStock.map(mean) };
}

/** Land deliveries only (no baseline, chains or stocks): used to count cards still in the post in Left. */
export function landOnly(ctx: Ctx, run: RunState, P: RunParams, runIndex: number, deliveries: Delivery[], seed: number): void {
  const input: TermInput = { term: 99, year: 0, deliveries: [], reversePlays: [], events: [], employers: [], ripples: [], seed };
  const t: TermCtx = { ctx, run, P, runIndex, input, delta: ctx.base.map((row) => row.map(() => 0)), contribs: null, lastContribs: null, events: [] };
  for (const d of deliveries) land(t, { ...d, duration: null });
  for (const row of run.s) for (let i = 0; i < row.length; i++) row[i] = clamp10(row[i]!);
}
