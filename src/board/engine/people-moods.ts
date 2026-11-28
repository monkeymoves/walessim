/**
 * Group moods and Backing (docs/design/v2-board.md section 6 and 16.3.1, rules P1, P2, P3, P5).
 *
 * Each group in each council compares what it cares about with four years ago in its own council
 * (phase 1 also judged it against the middle council: P1 `middle_share`, 0 since 16.3.1 and 0.5
 * when a model lacks it). Better pulls its mood up, worse pulls it down, with a memory so it moves
 * slowly. Backing is the groups' moods weighted by their real shares (Everyone has a fixed weight,
 * a game rule). Every change to Backing is written to the ledger with its rule and cause.
 */
import { neighbours, siteCouncils } from "./conditions";
import type { StepCtx } from "./ctx";
import { frameAtYear } from "./frame";
import { stepsOf, yearOfStep } from "./time";
import { optParam, param } from "./rules";
import { ruleParam } from "./rule-defaults";
import type {
  BoardModel, BoardState, Cause, CouncilCode, GroupCare, GroupDef, GroupId, GroupMood, MeasureId, RuleId, Say,
} from "./types";
import { MEASURE_IDS, RULE_IDS } from "./types";

const clamp10 = (v: number): number => Math.max(0, Math.min(10, v));
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};

/** A group's weight in a council: its real share (percent, as a fraction), or the Everyone base weight. */
export function groupWeight(model: BoardModel, g: GroupDef, code: CouncilCode): number {
  if (g.share_from === null) return g.base_weight ?? param(model, RULE_IDS.everyone, "base_weight");
  const v = model.councils.find((c) => c.code === code)?.real[g.share_from] ?? 0;
  return Math.max(0, v) / 100;
}

/** Backing from moods: the mean of the groups' moods weighted by their shares here. */
export function backingFrom(model: BoardModel, code: CouncilCode, moods: Record<GroupId, GroupMood>, fallback: number): number {
  let total = 0;
  let sum = 0;
  for (const g of model.groups) {
    const w = groupWeight(model, g, code);
    total += w;
    sum += w * (moods[g.id]?.mood ?? fallback);
  }
  return total > 0 ? clamp10(sum / total) : fallback;
}

/** Years in the comparison window (rule P1 `compare_years`, four). */
export const compareYears = (model: BoardModel): number => param(model, RULE_IDS.moods, "compare_years");

const round4 = (v: number): number => Math.round(v * 1e4) / 1e4;

/** Record a Backing change through the context (it clamps, rounds and writes the ledger). */
function record(ctx: StepCtx, council: CouncilCode, delta: number, rule: RuleId, cause: Cause): void {
  if (Math.abs(delta) < 1e-9) return;
  ctx.change({ council, quantity: "backing", delta, rule, cause });
}

/**
 * Move moods by `points` in one council (one group, or all of them), then move Backing to match
 * and record it. Used for the start nudges and for backing effects that should stay in the moods.
 */
export function shiftMoods(ctx: StepCtx, code: CouncilCode, points: number, group: GroupId | undefined, rule: RuleId, cause: Cause): void {
  const { model, state } = ctx;
  const c = state.councils[code];
  if (!c) return;
  const before = backingFrom(model, code, c.moods, c.backing);
  for (const g of model.groups) {
    if (group && g.id !== group) continue;
    const m = c.moods[g.id] ?? { mood: c.backing };
    c.moods[g.id] = { ...m, mood: round4(clamp10(m.mood + points)) };
  }
  record(ctx, code, backingFrom(model, code, c.moods, c.backing) - before, rule, cause);
}

/**
 * Carry changes made to Backing directly into the moods, so the next mood move does not undo them:
 * every mood moves by the gap between Backing, less its standing parts (standing.ts), and the
 * moods' weighted mean.
 */
export function syncMoods(model: BoardModel, state: BoardState, code: CouncilCode): void {
  const c = state.councils[code];
  if (!c) return;
  for (const g of model.groups) if (!c.moods[g.id]) c.moods[g.id] = { mood: c.backing };
  // Standing parts (a law, a broken deal: standing.ts) are not moods, so they stay out of the gap.
  const standing = Object.values(c.standing ?? {}).reduce((a, b) => a + b, 0);
  const gap = c.backing - standing - backingFrom(model, code, c.moods, c.backing);
  if (Math.abs(gap) < 1e-9) return;
  for (const g of model.groups) c.moods[g.id] = { ...c.moods[g.id]!, mood: round4(clamp10(c.moods[g.id]!.mood + gap)) };
}

/** The last step a project was started here or one link away, or null. */
export function lastReached(model: BoardModel, state: BoardState, code: CouncilCode): number | null {
  const reach = new Set([code, ...neighbours(model, code)]);
  let last: number | null = null;
  for (const p of state.projects) {
    if (siteCouncils(model, p).some((s) => reach.has(s)) && (last === null || p.startedStep > last)) last = p.startedStep;
  }
  return last;
}

/** Where a mood judgement stands: the step the clock arrives at, and the frame `compare_years` before its year. */
interface Window { arriving: number; overYears: number }

const pastFrame = (model: BoardModel, state: BoardState, w: Window) => frameAtYear(state, yearOfStep(model, w.arriving) - w.overYears);

interface Signal { value: number; reason: Say }

/** Rule P1: the share of a measure judgement made against the middle council (phase 1: one half). */
const middleShare = (model: BoardModel): number => optParam(model, RULE_IDS.moods, "middle_share") ?? 0.5;

/** Backing lost to rule P3 in this council so far (a negative number), read back from the ledger. */
function passedOverSoFar(state: BoardState, code: CouncilCode): number {
  let sum = 0;
  for (const c of state.ledger) if (c.rule === RULE_IDS.passedOver && c.council === code && c.quantity === "backing") sum += c.delta;
  return sum;
}

/**
 * Rule P3: is this council passed over now? Phase 1: nothing started here or one link away for
 * `years`. Since 16.3.1 (when the card has `max_loss`): nothing stands here or one link away at
 * all, `years` into the game, and the loss stops at `max_loss`.
 */
function passedOver(model: BoardModel, step: number, reached: number | null, lostSoFar: number): boolean {
  const steps = Math.max(1, stepsOf(model, param(model, RULE_IDS.passedOver, "years")));
  const cap = optParam(model, RULE_IDS.passedOver, "max_loss");
  if (cap === undefined) return step - (reached ?? -1) >= steps;
  return reached === null && step + 1 >= steps && -lostSoFar < cap - 1e-9;
}

const measureName = (model: BoardModel, m: MeasureId) => model.measures.find((x) => x.id === m)?.name ?? m;

/** Change of a measure over the window, here and in the middle council. */
function measureChange(model: BoardModel, state: BoardState, code: CouncilCode, m: MeasureId, over: Window): { here: number; middle: number } {
  const past = pastFrame(model, state, over)?.councils;
  const change = (x: CouncilCode) => (state.councils[x]?.measures[m] ?? 0) - (past?.[x]?.measures[m] ?? state.councils[x]?.measures[m] ?? 0);
  return { here: change(code), middle: median(model.game.councils.map(change)) };
}

/**
 * Rule P1: how much better than four years ago people expect what they care about to be, in
 * points. `expect_points` in your first term, and `expect_rise` more for each election held since:
 * the longer you govern, the more they expect (playtest 9 should-fix 1: a careless game won every
 * election). 0 when the card has neither.
 */
export function expectedGain(model: BoardModel, state: BoardState): number {
  const first = optParam(model, RULE_IDS.moods, "expect_points") ?? 0;
  const rise = optParam(model, RULE_IDS.moods, "expect_rise") ?? 0;
  return first + rise * state.election.records.length;
}

function signal(model: BoardModel, state: BoardState, code: CouncilCode, care: GroupCare, over: Window): Signal {
  const dir = (v: number) => (v >= 0 ? "up" : "down");
  if ((MEASURE_IDS as readonly string[]).includes(care)) {
    const m = care as MeasureId;
    const { here, middle } = measureChange(model, state, code, m, over);
    const expected = expectedGain(model, state);
    const value = here - middleShare(model) * middle - expected;
    // Better, but not by as much as people expect: say so, rather than "got worse".
    const key = value < 0 && here > 0 && expected > 0 ? "board.mood.measure.slow" : `board.mood.measure.${dir(value)}`;
    return { value, reason: { key, vars: { measure: measureName(model, m) } } };
  }
  if (care === "fell_most") {
    let worst: MeasureId = MEASURE_IDS[0]!;
    let worstValue = Infinity;
    for (const m of MEASURE_IDS) {
      const { here } = measureChange(model, state, code, m, over);
      if (here < worstValue) [worst, worstValue] = [m, here];
    }
    const value = Math.min(0, worstValue);
    return { value, reason: { key: value < 0 ? "board.mood.fell_most.down" : "board.mood.fell_most.none", vars: { measure: measureName(model, worst) } } };
  }
  if (care === "promises") {
    const kept = state.promise.kept;
    const pts = ruleParam(model, RULE_IDS.moods, "promise_points");
    if (kept === null) return { value: 0, reason: { key: "board.mood.promises.waiting", vars: { year: state.promise.byYear } } };
    return { value: kept ? pts : -pts, reason: { key: kept ? "board.mood.promises.kept" : "board.mood.promises.broken", vars: { year: state.promise.byYear } } };
  }
  if (care === "crises") {
    const pts = ruleParam(model, RULE_IDS.moods, "crisis_points");
    let value = 0;
    for (const e of state.events) {
      if (e.step < over.arriving - stepsOf(model, over.overYears) || e.step >= over.arriving - 1 || !e.councils.includes(code)) continue;
      const def = model.events.find((d) => d.id === e.event);
      if (!def || def.good) continue;
      const handled = def.responses.find((r) => r.id === e.response)?.handled_well ?? false;
      value += handled ? pts : -pts;
    }
    return { value, reason: { key: value > 0 ? "board.mood.crises.handled" : value < 0 ? "board.mood.crises.left" : "board.mood.crises.none" } };
  }
  if (care === "services") {
    const reach = new Set([code, ...neighbours(model, code)]);
    const has = state.projects.some((p) => p.status === "working" && model.projects.find((d) => d.id === p.project)?.tags.includes("services") && siteCouncils(model, p).some((s) => reach.has(s)));
    return { value: has ? ruleParam(model, RULE_IDS.moods, "presence_points") : 0, reason: { key: has ? "board.mood.services.close" : "board.mood.services.none" } };
  }
  // young_adults: the young adult share over the window, in percentage points.
  const past = pastFrame(model, state, over)?.councils[code]?.young;
  const value = (state.councils[code]?.young ?? 0) - (past ?? state.councils[code]?.young ?? 0);
  return { value, reason: { key: value >= 0 ? "board.mood.young_adults.stay" : "board.mood.young_adults.leave" } };
}

/**
 * When a year closes (`years` closed, 1 at a quarter year step): every group's mood moves towards
 * 5 (rule P2 `start`) plus `pull` times its signal, keeping `memory_per_year ^ years` of where it
 * was (rule P1). A council passed over (rule P3) loses `loss_per_year * years` from every mood,
 * up to `max_loss` in all when the card has it.
 * Backing is then recomputed; each group's part of the change is recorded.
 */
export function moveMoods(ctx: StepCtx, years: number): void {
  const { model, state: draft } = ctx;
  const memory = Math.pow(param(model, RULE_IDS.moods, "memory_per_year"), years);
  const pull = param(model, RULE_IDS.moods, "pull");
  const base = param(model, RULE_IDS.backingStart, "start");
  const over: Window = { arriving: ctx.step + 1, overYears: compareYears(model) };
  const passedYears = param(model, RULE_IDS.passedOver, "years");
  const cap = optParam(model, RULE_IDS.passedOver, "max_loss");
  // Signals are read from the board before any mood moves, so the order of councils does not matter.
  const plans = model.game.councils.map((code) => ({
    code,
    signals: Object.fromEntries(model.groups.map((g) => [g.id, g.cares.map((care) => signal(model, draft, code, care, over))])) as Record<GroupId, Signal[]>,
  }));
  for (const { code, signals } of plans) {
    const c = draft.councils[code];
    if (!c) continue;
    syncMoods(model, draft, code);
    const reached = lastReached(model, draft, code);
    c.lastReachedStep = reached;
    const lostSoFar = cap !== undefined && reached === null ? passedOverSoFar(draft, code) : 0;
    const passed = passedOver(model, ctx.step, reached, lostSoFar);
    const room = cap === undefined ? Infinity : Math.max(0, cap + lostSoFar);
    const loss = Math.min(room, param(model, RULE_IDS.passedOver, "loss_per_year") * years);
    let total = 0;
    for (const g of model.groups) total += groupWeight(model, g, code);
    for (const g of model.groups) {
      const sig = signals[g.id] ?? [];
      const s = sig.length ? sig.reduce((a, x) => a + x.value, 0) / sig.length : 0;
      const strongest = [...sig].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
      const old = c.moods[g.id]?.mood ?? c.backing;
      const moved = clamp10(memory * old + (1 - memory) * (base + pull * s));
      const next = passed ? clamp10(moved - loss) : moved;
      c.moods[g.id] = { mood: round4(next), reason: passed ? { key: "board.mood.passed_over", vars: { years: passedYears } } : strongest?.reason };
      const w = total > 0 ? groupWeight(model, g, code) / total : 0;
      record(ctx, code, w * (moved - old), RULE_IDS.moods, { kind: "people", group: g.id });
      record(ctx, code, w * (next - moved), RULE_IDS.passedOver, { kind: "people", group: g.id });
    }
  }
}
