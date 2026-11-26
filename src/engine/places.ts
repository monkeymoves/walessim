/**
 * Place boards (game-design 8): grading a visit. Grades are judged on the decision, across runs,
 * never on one roll: the Rhondda tests are deterministic sums over the tips; the Bethesda tests
 * must each hold in at least `hold_share` of sampled runs.
 */
import type { Grade, PlaceBoard } from "../model/schema";
import { uniform } from "./rng";

export interface BoardResult {
  grade: Grade;
  tests: { id: string; pass: boolean; share: number }[];
}

const gradeOf = (passed: number, total: number): Grade => (passed >= total ? "well" : passed >= total - 1 ? "adequately" : "poorly");

/** Current risk step per tip: the base step, raised one by the wet decade, capped at 3. */
export function tipRisk(board: PlaceBoard, wetDecade: boolean): Record<string, 1 | 2 | 3> {
  const out: Record<string, 1 | 2 | 3> = {};
  for (const t of board.tips ?? []) out[t.id] = Math.min(3, t.risk + (wetDecade ? 1 : 0)) as 1 | 2 | 3;
  return out;
}

/** The Rhondda: exposure, fairness, lifelines. */
export function gradeRhondda(board: PlaceBoard, threads: string[], wetDecade: boolean): BoardResult {
  const tips = board.tips ?? [];
  const risk = tipRisk(board, wetDecade);
  const chosen = new Set(threads);
  const weighted = (ids: Iterable<string>) => [...ids].reduce((a, id) => a + (risk[id] ?? 1) * (tips.find((t) => t.id === id)?.buildingsBelow ?? 0), 0);
  const total = weighted(tips.map((t) => t.id));
  const share = total > 0 ? weighted(chosen) / total : 1;
  const exposure = share >= (board.exposure_share ?? 0.4);
  const fairness = tips.some((t) => chosen.has(t.id) && t.deprived);
  const lifelines = !tips.some((t) => !chosen.has(t.id) && risk[t.id] === 3 && (t.school || t.rail));
  const tests = [
    { id: "exposure", pass: exposure, share: exposure ? 1 : 0 },
    { id: "fairness", pass: fairness, share: fairness ? 1 : 0 },
    { id: "lifelines", pass: lifelines, share: lifelines ? 1 : 0 },
  ];
  return { grade: gradeOf(tests.filter((t) => t.pass).length, 3), tests };
}

export interface BethesdaContext {
  /** Active curveballs. */
  active: string[];
  /** Cards played this term. */
  inPlay: string[];
  /** Cards played in any term so far (including this one). */
  everPlayed: string[];
  seed: number;
  runs: number;
}

/** Bethesda: Aros, Iaith, Pwysau, each held in at least hold_share of runs. */
export function gradeBethesda(board: PlaceBoard, threads: string[], c: BethesdaContext): BoardResult {
  const opts = (board.options ?? []).filter((o) => threads.includes(o.id));
  const th = board.thresholds ?? { homes: 0.8, work: 0.8, iaith: 0.8 };
  const cap = board.pressure_capacity ?? 0.3;
  const penalty = (m: string) => (board.trend_penalties ?? []).filter((p) => p.measure === m && c.active.includes(p.curveball)).reduce((a, p) => a + p.amount, 0);
  let aros = 0, iaith = 0, pwysau = 0;
  const runs = Math.max(1, c.runs);
  for (let r = 0; r < runs; r++) {
    const sum = { homes: -penalty("homes"), work: -penalty("work"), iaith: -penalty("iaith"), pressure: penalty("pressure"), river: -penalty("river") };
    for (const o of opts) {
      if (o.requires_card && !c.inPlay.includes(o.requires_card)) continue;
      let k = o.half_without_card && !c.everPlayed.includes(o.half_without_card) ? 0.5 : 1;
      const j = (m: string) => (r === 0 ? 1 : 1 + (uniform(c.seed, "bethesda", r, o.id, m) * 2 - 1) * o.spread);
      sum.homes += o.homes * k * j("homes");
      sum.work += o.work * k * j("work");
      sum.iaith += o.iaith * k * j("iaith");
      sum.pressure += o.pressure * j("pressure");
      let river = o.river * j("river");
      if (o.river_flips_in && c.active.includes(o.river_flips_in)) river = -Math.abs(river);
      sum.river += river;
      if (o.pairs_with && threads.includes(o.pairs_with.option)) sum.pressure += o.pairs_with.pressure;
      k = 1;
    }
    if (sum.homes >= th.homes && sum.work >= th.work) aros++;
    if (sum.iaith >= th.iaith) iaith++;
    if (sum.pressure <= cap && sum.river >= 0) pwysau++;
  }
  const hold = board.hold_share ?? 0.6;
  const tests = [
    { id: "aros", share: aros / runs },
    { id: "iaith", share: iaith / runs },
    { id: "pwysau", share: pwysau / runs },
  ].map((t) => ({ ...t, pass: t.share >= hold }));
  return { grade: gradeOf(tests.filter((t) => t.pass).length, 3), tests };
}
