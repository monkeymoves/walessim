/**
 * Scores: reference bands, the model context (indexes built once per model), starting scores,
 * Wales aggregates and strand scores, and pips with hysteresis.
 *
 * Every component is held as a row of 22 authority scores (0 to 10, higher is better), in
 * `model.authorities` order. `gap` components are not stored: they are computed from the
 * component they measure.
 */
import type { Authority, Band, Card, CompiledModel, Component, Curveball, LaFlag, PlaceBoard, RegionId, Rule, StandingTicket, Strand } from "../model/schema";
import { REGION_IDS } from "../model/schema";
import { compileFcm, serviceMean, stateMean, runFcm, type CompiledFcm } from "./fcm";

/** Score of a raw value against a band: 0 at the floor, 10 at the goal, clamped. */
export function bandScore(b: Pick<Band, "floor" | "goal" | "invert">, value: number): number {
  let s = (10 * (value - b.floor)) / (b.goal - b.floor);
  if (b.invert && b.goal > b.floor) s = 10 - s;
  return Math.min(10, Math.max(0, s));
}

/** Raw value for a score (inverse of bandScore, unclamped). */
export function bandValue(b: Pick<Band, "floor" | "goal" | "invert">, score: number): number {
  const s = b.invert && b.goal > b.floor ? 10 - score : score;
  return b.floor + (s / 10) * (b.goal - b.floor);
}

/** Whole pips with hysteresis: change only when the score passes the half point by `h`. */
export function displayPips(current: number, score: number, h: number): number {
  if (score >= current + 0.5 + h || score <= current - 0.5 - h) return Math.min(10, Math.max(0, Math.round(score)));
  return current;
}

export const clamp10 = (x: number) => Math.min(10, Math.max(0, x));

/** Precomputed indexes for one model. Built once per model object (cached). */
export interface Ctx {
  model: CompiledModel;
  las: Authority[];
  laIndex: Map<string, number>;
  /** Population weights summing to 1. */
  pop: number[];
  regionLas: Record<RegionId, number[]>;
  laRegion: RegionId[];
  flagLas: Record<LaFlag, number[]>;
  laFlags: Set<LaFlag>[];
  comps: Component[];
  comp: Map<string, number>;
  /** 2026 scores, [component][authority]. Gap rows are zeros. */
  base: number[][];
  /** For gap components: the measured component, the two median authorities and the worst five. */
  gap: Map<number, { of: number; median: number[]; worst5: number[]; gap0: number }>;
  strands: Strand[];
  strandFlow: number[][];
  strandStock: number[][];
  bands: Map<string, Band>;
  fcm: CompiledFcm;
  /** Baseline FCM state mean and service mean (0 to 1). */
  fcmBase: { state: number; service: number };
  rules: Map<string, Rule>;
  cards: Map<string, Card>;
  standing: Map<string, StandingTicket>;
  curveballs: Map<string, Curveball>;
  places: Map<string, PlaceBoard>;
  /** Curveball ids keyed by horizon-scan trend id. */
  trendToCurveball: Map<string, string>;
  /** Wales 2026 emissions score, for the R34 straight path. */
  emissions0: number;
}

const CACHE = new WeakMap<CompiledModel, Ctx>();

/**
 * Fill tuning fields that an older model.json may lack, so a stale build never yields NaN.
 * The build script requires them; this is a guard for the browser.
 */
export function withTuningDefaults(model: CompiledModel): CompiledModel {
  const g = model.game;
  const cb = g.curveballs ?? ({} as CompiledModel["game"]["curveballs"]);
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    ...model,
    game: {
      ...g,
      gap_scale: num(g.gap_scale, 2.5),
      hysteresis: num(g.hysteresis, 0.1),
      regional_size_step: num(g.regional_size_step, 1),
      curveballs: { ...cb, slow_scale: num(cb.slow_scale, 0.4), shock_scale: num(cb.shock_scale, 0.5), ripple_weight: num(cb.ripple_weight, 2), ripple_shock_bonus: num(cb.ripple_shock_bonus, 0.1) },
    },
  };
}

export function makeContext(input: CompiledModel): Ctx {
  const hit = CACHE.get(input);
  if (hit) return hit;
  const model = withTuningDefaults(input);
  const las = model.authorities;
  const laIndex = new Map(las.map((a, i) => [a.code, i]));
  const popTotal = las.reduce((s, a) => s + a.population, 0);
  const pop = las.map((a) => a.population / popTotal);
  const regionLas = Object.fromEntries(REGION_IDS.map((r) => [r, las.flatMap((a, i) => (a.region === r ? [i] : []))])) as Record<RegionId, number[]>;
  const bands = new Map(model.bands.map((b) => [b.indicator, b]));

  // worst five: highest deprivation raw value (share of small areas in the most deprived fifth)
  const dep = model.la_data["deprivation"]?.values;
  const order = las.map((a, i) => ({ i, v: dep?.[a.code] ?? 0 })).sort((a, b) => b.v - a.v || a.i - b.i);
  const worst5 = order.slice(0, 5).map((o) => o.i);
  const laFlags = las.map((a, i) => new Set<LaFlag>([...a.flags, ...(worst5.includes(i) ? (["worst5"] as LaFlag[]) : [])]));
  const allFlags: LaFlag[] = ["coal_valley", "slate", "heartland", "rural", "valley", "port", "city", "coast", "off_gas", "worst5"];
  const flagLas = Object.fromEntries(allFlags.map((f) => [f, las.flatMap((_, i) => (laFlags[i]!.has(f) ? [i] : []))])) as Record<LaFlag, number[]>;

  const comps = model.components;
  const comp = new Map(comps.map((c, i) => [c.id, i]));
  const base = comps.map((c) => {
    if (c.aggregate === "gap") return las.map(() => 0);
    const band = c.indicator ? bands.get(c.indicator) : undefined;
    const vals = c.indicator ? model.la_data[c.indicator]?.values : undefined;
    return las.map((a, i) => {
      if (band && vals && typeof vals[a.code] === "number") return bandScore(band, vals[a.code]!);
      let v = c.initial;
      for (const [flag, fv] of Object.entries(c.initial_by_flag ?? {})) if (laFlags[i]!.has(flag as LaFlag)) v = fv as number;
      return v;
    });
  });
  const fcm = compileFcm(model.fcm);
  const fa = runFcm(fcm, {});
  const fcmBase = { state: stateMean(fcm, fa), service: serviceMean(fcm, fa) };
  // nature_condition starts at the FCM state mean times ten (the data), unless overridden by data
  const nat = comp.get("nature_condition");
  if (nat !== undefined) base[nat] = las.map(() => clamp10(fcmBase.state * 10));

  const gap = new Map<number, { of: number; median: number[]; worst5: number[]; gap0: number }>();
  comps.forEach((c, i) => {
    if (c.aggregate !== "gap") return;
    const of = comp.get(c.of!)!;
    const sorted = las.map((_, j) => j).sort((a, b) => base[of]![a]! - base[of]![b]! || a - b);
    const med = [sorted[10]!, sorted[11]!];
    // the five worst-off on this measure
    const w5 = sorted.slice(0, 5);
    const gap0 = med.reduce((a, j) => a + base[of]![j]!, 0) / 2 - w5.reduce((a, j) => a + base[of]![j]!, 0) / 5;
    gap.set(i, { of, median: med, worst5: w5, gap0 });
  });

  const ctx: Ctx = {
    model,
    las,
    laIndex,
    pop,
    regionLas,
    laRegion: las.map((a) => a.region),
    flagLas,
    laFlags,
    comps,
    comp,
    base,
    gap,
    strands: model.strands,
    strandFlow: model.strands.map((s) => s.flow.map((id) => comp.get(id)!)),
    strandStock: model.strands.map((s) => s.stock.map((id) => comp.get(id)!)),
    bands,
    fcm,
    fcmBase,
    rules: new Map(model.rules.map((r) => [r.id, r])),
    cards: new Map(model.cards.map((c) => [c.id, c])),
    standing: new Map(model.standing.map((s) => [s.id, s])),
    curveballs: new Map(model.curveballs.map((c) => [c.id, c])),
    places: new Map(model.places.map((p) => [p.id, p])),
    trendToCurveball: new Map(model.curveballs.flatMap((c) => c.trends.map((t) => [t, c.id] as [string, string]))),
    emissions0: 0,
  };
  const em = comp.get("emissions_head");
  ctx.emissions0 = em === undefined ? 5 : walesValue(ctx, em, base);
  CACHE.set(input, ctx);
  return ctx;
}

/** Wales value of one component from a score matrix. */
export function walesValue(ctx: Ctx, c: number, s: number[][]): number {
  const comp = ctx.comps[c]!;
  switch (comp.aggregate) {
    case "pop": {
      const row = s[c]!;
      let v = 0;
      for (let i = 0; i < row.length; i++) v += row[i]! * ctx.pop[i]!;
      return v;
    }
    case "mean": {
      const row = s[c]!;
      return row.reduce((a, b) => a + b, 0) / row.length;
    }
    case "heartland": {
      const row = s[c]!;
      const h = ctx.flagLas.heartland;
      return h.reduce((a, i) => a + row[i]!, 0) / Math.max(1, h.length);
    }
    case "gap": {
      const g = ctx.gap.get(c)!;
      const row = s[g.of]!;
      const med = g.median.reduce((a, i) => a + row[i]!, 0) / g.median.length;
      const w5 = g.worst5.reduce((a, i) => a + row[i]!, 0) / g.worst5.length;
      // starts at the component's `initial` and moves by gap_scale per point the gap closes
      // not clamped, so a gap's change stays exactly traceable (pips are clamped when shown)
      return comp.initial + ctx.model.game.gap_scale * (g.gap0 - (med - w5));
    }
  }
}

/**
 * Linear change of a component's Wales value for a per-authority change `perLa` of component `c`.
 * For gap components, `perLa` is the change of the measured component.
 */
export function walesDelta(ctx: Ctx, c: number, perLa: number[]): number {
  const comp = ctx.comps[c]!;
  switch (comp.aggregate) {
    case "pop":
      return perLa.reduce((a, v, i) => a + v * ctx.pop[i]!, 0);
    case "mean":
      return perLa.reduce((a, b) => a + b, 0) / perLa.length;
    case "heartland": {
      const h = ctx.flagLas.heartland;
      return h.reduce((a, i) => a + perLa[i]!, 0) / Math.max(1, h.length);
    }
    case "gap": {
      const g = ctx.gap.get(c)!;
      const med = g.median.reduce((a, i) => a + perLa[i]!, 0) / g.median.length;
      const w5 = g.worst5.reduce((a, i) => a + perLa[i]!, 0) / g.worst5.length;
      return -ctx.model.game.gap_scale * (med - w5);
    }
  }
}

/** Flow and stock scores of every strand (strand order). */
export function strandScores(ctx: Ctx, s: number[][]): { flow: number[]; stock: number[] } {
  const mean = (ids: number[]) => ids.reduce((a, c) => a + walesValue(ctx, c, s), 0) / ids.length;
  return { flow: ctx.strandFlow.map(mean), stock: ctx.strandStock.map(mean) };
}
