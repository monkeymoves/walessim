/**
 * Place boards (game-design 8): grading a visit. Grades are judged on the decision, across runs,
 * never on one roll: the Rhondda tests are deterministic sums over the tips; the Bethesda tests
 * must each hold in at least `hold_share` of sampled runs.
 */
import type { Grade, PlaceBoard, Text, TipFacts } from "../model/schema";
import { fill, joinNames, type SlotValue } from "./welsh";
import { uniform } from "./rng";

export interface BoardResult {
  grade: Grade;
  /** Each test, with a player-facing explanation in terms of the player's threads (when copy is given). */
  tests: { id: string; pass: boolean; share: number; explanation?: Text }[];
  /** Notes for the whole visit: tips counted from earlier visits, trends that changed the sums. */
  notes: Text[];
}

/**
 * Grade by tests held (playtests 1, 3 and 4): every test held with room to spare (the board's
 * `very_well` margins) very well; a majority (two of three) well; at least one adequately; none poorly.
 * A careful visit is never worse than staying away (adequate).
 */
const gradeOf = (passed: number, total: number, roomy: boolean): Grade =>
  passed === total && roomy ? "very_well" : passed * 2 > total ? "well" : passed >= 1 ? "adequately" : "poorly";

type Copy = Record<string, Text> | undefined;
const say = (copy: Copy, key: string, params: Record<string, SlotValue>, places: string[] = []): Text | undefined => (copy?.[key] ? fill(copy[key]!, params, places) : undefined);

/**
 * The first note on every graded visit: how many tests passed and why that makes the grade (cold
 * playtest 5: "WELL" stood above a test that said "Not yet" with nothing to say two of three is enough).
 */
function gradeSummary(copy: Copy, grade: Grade, tests: { pass: boolean }[]): Text | undefined {
  const passed = tests.filter((t) => t.pass).length;
  const key = grade === "well" && passed === tests.length ? "well_all" : grade;
  return say(copy, `engine.visit.summary.${key}`, { passed, total: tests.length });
}

/** A tip's name in both languages ("Tip 4" when the source gives none). */
export function tipName(copy: Copy, t: TipFacts): Text {
  if (t.name) return { en: t.name, cy: t.name };
  return copy?.["engine.tip"] ? fill(copy["engine.tip"], { n: t.n }) : { en: `Tip ${t.n}`, cy: `Tomen ${t.n}` };
}

/**
 * Current risk step per tip: the base step, raised one by the wet decade, capped at 3; a tip made
 * safe on an earlier visit drops one step (never below 1).
 */
export function tipRisk(board: PlaceBoard, wetDecade: boolean, stitched: string[] = []): Record<string, 1 | 2 | 3> {
  const out: Record<string, 1 | 2 | 3> = {};
  for (const t of board.tips ?? []) out[t.id] = Math.max(1, Math.min(3, t.risk + (wetDecade ? 1 : 0)) - (stitched.includes(t.id) ? 1 : 0)) as 1 | 2 | 3;
  return out;
}

/**
 * The Rhondda: exposure, fairness, lifelines. Tips made safe on earlier visits count as covered.
 * Exposure needs `exposure_share` of the risk-weighted homes for three threads, scaled down for
 * fewer; lifelines needs at least half (rounded up) of the top-risk tips above a school or the
 * railway covered.
 */
export function gradeRhondda(board: PlaceBoard, threads: string[], wetDecade: boolean, opts: { stitched?: string[]; text?: Copy; threadsAllowed?: number } = {}): BoardResult {
  const copy = opts.text;
  const stitched = opts.stitched ?? [];
  const tips = board.tips ?? [];
  const risk = tipRisk(board, wetDecade, stitched);
  const covered = new Set([...threads, ...stitched]);
  const homes = (t: TipFacts) => (risk[t.id] ?? 1) * t.buildingsBelow;
  const total = tips.reduce((a, t) => a + homes(t), 0);
  const share = total > 0 ? tips.filter((t) => covered.has(t.id)).reduce((a, t) => a + homes(t), 0) / total : 1;
  const allowed = Math.max(1, opts.threadsAllowed ?? board.threads);
  const needed = (board.exposure_share ?? 0.4) * Math.min(1, allowed / board.threads);
  const exposure = share >= needed - 1e-9;
  const deprivedMine = tips.filter((t) => covered.has(t.id) && t.deprived);
  const fairness = deprivedMine.length > 0;
  const lifelineTips = tips.filter((t) => (risk[t.id] === 3 || (stitched.includes(t.id) && t.risk + (wetDecade ? 1 : 0) >= 3)) && (t.school || t.rail));
  const lifeCovered = lifelineTips.filter((t) => covered.has(t.id));
  const lifeNeed = Math.ceil(lifelineTips.length / 2);
  const lifelines = lifeCovered.length >= lifeNeed;
  // room to spare (playtest 4): the margins live in the board's very_well block
  const vw = board.very_well ?? {};
  const neededRoomy = needed + (vw.exposure_margin ?? 0) * Math.min(1, allowed / board.threads);
  const roomy =
    share >= neededRoomy - 1e-9 && deprivedMine.length >= (vw.fairness_tips ?? 1) && (!vw.lifelines_all || lifeCovered.length === lifelineTips.length);
  const best = (pool: TipFacts[]) => [...pool].filter((t) => !covered.has(t.id)).sort((a, b) => homes(b) - homes(a))[0];
  const name = (t: TipFacts | undefined) => (t ? tipName(copy, t) : say(copy, "engine.visit.nothing", {}) ?? { en: "nothing", cy: "dim byd" });
  const edition = board.wimd?.edition ?? "WIMD";
  const tests = [
    {
      id: "exposure",
      pass: exposure,
      share: exposure ? 1 : 0,
      explanation: say(copy, exposure ? "engine.visit.exposure.pass" : "engine.visit.exposure.fail", { got: Math.round(share * 10), needed: Math.round(needed * 10), best: name(best(tips)) }),
    },
    {
      id: "fairness",
      pass: fairness,
      share: fairness ? 1 : 0,
      explanation: say(copy, fairness ? "engine.visit.fairness.pass" : "engine.visit.fairness.fail", { tip: name(deprivedMine[0]), best: name(best(tips.filter((t) => t.deprived))), edition }),
    },
    {
      id: "lifelines",
      pass: lifelines,
      share: lifelines ? 1 : 0,
      explanation: !lifelineTips.length
        ? say(copy, "engine.visit.lifelines.none", {})
        : say(copy, lifelines ? "engine.visit.lifelines.pass" : "engine.visit.lifelines.fail", {
            covered: lifeCovered.length,
            total: lifelineTips.length,
            need: lifeNeed,
            missing: joinNames(lifelineTips.filter((t) => !covered.has(t.id)).map((t) => tipName(copy, t))),
          }),
    },
  ];
  const notes: Text[] = [];
  const grade = gradeOf(tests.filter((t) => t.pass).length, 3, roomy);
  const summary = gradeSummary(copy, grade, tests);
  if (summary) notes.push(summary);
  const counted = tips.filter((t) => stitched.includes(t.id));
  if (counted.length) {
    const n = say(copy, "engine.visit.stitched", { tips: joinNames(counted.map((t) => tipName(copy, t))) });
    if (n) notes.push(n);
  }
  const room = grade !== "very_well" && tests.every((t) => t.pass) ? say(copy, "engine.visit.room.rhondda", { needed: Math.round(neededRoomy * 10), tips: vw.fairness_tips ?? 1 }) : undefined;
  if (room) notes.push(room);
  return { grade, tests, notes };
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
  /** Engine copy for explanations (model.engine_text). */
  text?: Record<string, Text>;
  /** Options placed on earlier visits: they stay in place and count (playtest 2). */
  stitched?: string[];
  /** A card's name, for the reason a test failed ("works at half strength until you play {card}"). */
  cardName?: (id: string) => Text;
}

/** Bethesda: Aros, Iaith, Pwysau, each held in at least hold_share of runs. */
export function gradeBethesda(board: PlaceBoard, newThreads: string[], c: BethesdaContext): BoardResult {
  // earlier threads stay in place and count, exactly as the Rhondda's made-safe tips do
  const threads = [...new Set([...newThreads, ...(c.stitched ?? [])])];
  const opts = (board.options ?? []).filter((o) => threads.includes(o.id));
  const th = board.thresholds ?? { homes: 0.8, work: 0.8, iaith: 0.8 };
  const cap = board.pressure_capacity ?? 0.3;
  const penalty = (m: string) => (board.trend_penalties ?? []).filter((p) => p.measure === m && c.active.includes(p.curveball)).reduce((a, p) => a + p.amount, 0);
  let aros = 0, iaith = 0, pwysau = 0;
  /** The central run's river balance: the explanation names the river only when it really fell short. */
  let river0 = 0, pressure0 = 0;
  /** The central run's sums, for the reason a test failed (cold playtest 7, item 6). */
  let central = { homes: 0, work: 0, iaith: 0 };
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
    if (r === 0) {
      river0 = sum.river;
      pressure0 = sum.pressure;
      central = { homes: sum.homes, work: sum.work, iaith: sum.iaith };
    }
  }
  const hold = board.hold_share ?? 0.6;
  const copy = c.text;
  const by = (measure: "homes" | "work" | "iaith" | "pressure", sign: 1 | -1 = 1) => {
    const names = opts.filter((o) => sign * o[measure] > 0 && !(o.requires_card && !c.inPlay.includes(o.requires_card))).map((o) => o.name);
    return names.length ? joinNames(names) : say(copy, "engine.none", {}) ?? { en: "none of your threads", cy: "dim un o'ch edafedd" };
  };
  // why the valley could not cope, named from the central run (cold playtest 5: "The river needed:
  // nothing" after a river pick). The river is named only when its balance really fell short, and an
  // option already in place that gives the river room counts (never "the river needed room" straight
  // after "Room for the river: already in place, counted").
  const riverShort = river0 < 0;
  const pressureShort = pressure0 > cap || !riverShort;
  const pwysauFail = riverShort && pressureShort ? "fail_both" : riverShort ? "fail_river" : "fail";
  const shares = { aros: aros / runs, iaith: iaith / runs, pwysau: pwysau / runs };
  const why = (id: "aros" | "iaith"): Text => failReason(board, id, threads, central, th, c, penalty) ?? { en: "", cy: "" };
  const tests = (["aros", "iaith", "pwysau"] as const).map((id) => {
    const share = shares[id];
    const pass = share >= hold;
    const params: Record<string, SlotValue> = { runs: Math.round(share * 10), homes: by("homes"), work: by("work"), iaith: by("iaith"), pressure: by("pressure"), ...(!pass && id !== "pwysau" ? { why: why(id) } : {}) };
    const key = pass ? "pass" : id === "pwysau" ? pwysauFail : "fail";
    return { id, share, pass, explanation: say(copy, `engine.visit.${id}.${key}`, params) };
  });
  const roomShare = board.very_well?.share ?? 1;
  const grade = gradeOf(tests.filter((t) => t.pass).length, 3, tests.every((t) => t.share >= roomShare - 1e-9));
  const notes: Text[] = [];
  const summary = gradeSummary(copy, grade, tests);
  if (summary) notes.push(summary);
  const earlier = (board.options ?? []).filter((o) => (c.stitched ?? []).includes(o.id));
  if (earlier.length) {
    const n = say(copy, "engine.visit.stitched_beth", { tips: joinNames(earlier.map((o) => o.name)) });
    if (n) notes.push(n);
  }
  // a trend's note says what it demands; when the test it weighs on passed anyway, say so (cold
  // playtest 5: "one homes pick is not enough" beside a very well visit with two homes picks)
  const testOf: Record<string, "aros" | "iaith" | "pwysau"> = { homes: "aros", work: "aros", iaith: "iaith", pressure: "pwysau", river: "pwysau" };
  for (const p of board.trend_penalties ?? []) {
    if (!c.active.includes(p.curveball)) continue;
    const met = tests.find((t) => t.id === testOf[p.measure])?.pass ?? false;
    const n = say(copy, met ? "engine.visit.trend_met" : "engine.visit.trend", { note: p.note });
    if (n) notes.push(n);
  }
  const room = grade !== "very_well" && tests.every((t) => t.pass) ? say(copy, "engine.visit.room.bethesda", { share: Math.round(roomShare * 10) }) : undefined;
  if (room) notes.push(room);
  return { grade, tests, notes };
}

/**
 * Why a Bethesda test failed, in one sentence from the central run (cold playtest 7, item 6: "Can
 * young people stay? Not yet, about 0 times in 10" after a homes pick and a work pick, with no
 * reason). In order: a measure with no pick at all (or only a pick whose card is not played this
 * turn); a slow change that took away what the picks gave; a pick at half strength without its card;
 * picks too small together; or picks that only just reach it, so most runs fall short.
 */
function failReason(
  board: PlaceBoard,
  id: "aros" | "iaith",
  threads: string[],
  central: { homes: number; work: number; iaith: number },
  th: { homes: number; work: number; iaith: number },
  c: BethesdaContext,
  penalty: (m: string) => number,
): Text | undefined {
  const copy = c.text;
  const name = (card: string): Text => c.cardName?.(card) ?? { en: card, cy: card };
  const opts = (board.options ?? []).filter((o) => threads.includes(o.id));
  const blocked = (o: (typeof opts)[number]) => !!o.requires_card && !c.inPlay.includes(o.requires_card);
  const measures = id === "aros" ? (["homes", "work"] as const) : (["iaith"] as const);
  const short = measures.filter((m) => central[m] < th[m]);
  for (const m of short) {
    if (opts.some((o) => o[m] > 0 && !blocked(o))) continue;
    const b = opts.find((o) => o[m] > 0 && blocked(o));
    return b ? say(copy, "engine.visit.why.blocked", { pick: b.name, card: name(b.requires_card!) }) : say(copy, `engine.visit.why.no_${m}`, {});
  }
  for (const m of short) {
    const p = penalty(m);
    const trend = (board.trend_penalties ?? []).find((x) => x.measure === m && c.active.includes(x.curveball));
    if (trend && p > 0 && central[m] + p >= th[m]) return say(copy, "engine.visit.why.trend", { note: trend.note });
  }
  for (const m of short) {
    const h = opts.find((o) => o[m] > 0 && o.half_without_card && !c.everPlayed.includes(o.half_without_card));
    if (h) return say(copy, "engine.visit.why.half", { pick: h.name, card: name(h.half_without_card!) });
  }
  if (short.length) return say(copy, `engine.visit.why.small_${id}`, {});
  return say(copy, "engine.visit.why.close", {});
}
