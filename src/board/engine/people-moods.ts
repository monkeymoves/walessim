/**
 * Group moods and Backing (docs/design/v2-board.md section 6, rules P1, P2, P3, P5).
 *
 * Each group in each council compares what it cares about with four years ago, and with how the
 * middle council moved. Better pulls its mood up, worse pulls it down, with a memory so it moves
 * slowly. Backing is the groups' moods weighted by their real shares (Everyone has a fixed weight,
 * a game rule). Every change to Backing is written to the ledger with its rule and cause.
 */
import { neighbours, siteCouncils } from "./conditions";
import type { TurnCtx } from "./ctx";
import { param } from "./rules";
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

/** Turns in the comparison window (rule P1 `compare_years`, four years: two turns). */
export function compareTurns(model: BoardModel): number {
  return Math.max(1, Math.round(param(model, RULE_IDS.moods, "compare_years") / model.game.turn_years));
}

const round4 = (v: number): number => Math.round(v * 1e4) / 1e4;

/** Record a Backing change through the context (it clamps, rounds and writes the ledger). */
function record(ctx: TurnCtx, council: CouncilCode, delta: number, rule: RuleId, cause: Cause): void {
  if (Math.abs(delta) < 1e-9) return;
  ctx.change({ council, quantity: "backing", delta, rule, cause });
}

/**
 * Move moods by `points` in one council (one group, or all of them), then move Backing to match
 * and record it. Used for the start nudges and for backing effects that should stay in the moods.
 */
export function shiftMoods(ctx: TurnCtx, code: CouncilCode, points: number, group: GroupId | undefined, rule: RuleId, cause: Cause): void {
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
 * Carry changes made to Backing directly (for example by a law's or an event's backing effect
 * applied with `applyOnce`) into the moods, so the next mood move does not undo them: every mood
 * moves by the gap between Backing and the moods' weighted mean.
 */
export function syncMoods(model: BoardModel, state: BoardState, code: CouncilCode): void {
  const c = state.councils[code];
  if (!c) return;
  for (const g of model.groups) if (!c.moods[g.id]) c.moods[g.id] = { mood: c.backing };
  const gap = c.backing - backingFrom(model, code, c.moods, c.backing);
  if (Math.abs(gap) < 1e-9) return;
  for (const g of model.groups) c.moods[g.id] = { ...c.moods[g.id]!, mood: round4(clamp10(c.moods[g.id]!.mood + gap)) };
}

/** The last turn a project was started here or one link away, or null. */
export function lastReached(model: BoardModel, state: BoardState, code: CouncilCode): number | null {
  const reach = new Set([code, ...neighbours(model, code)]);
  let last: number | null = null;
  for (const p of state.projects) {
    if (siteCouncils(model, p).some((s) => reach.has(s)) && (last === null || p.startedTurn > last)) last = p.startedTurn;
  }
  return last;
}

interface Signal { value: number; reason: Say }

const measureName = (model: BoardModel, m: MeasureId) => model.measures.find((x) => x.id === m)?.name ?? m;

/** Change of a measure over the window, here and in the middle council. */
function measureChange(model: BoardModel, state: BoardState, code: CouncilCode, m: MeasureId, over: number): { here: number; middle: number } {
  const past = state.history[Math.max(0, Math.min(state.history.length - 1, state.turn + 1 - over))]?.councils;
  const change = (x: CouncilCode) => (state.councils[x]?.measures[m] ?? 0) - (past?.[x]?.measures[m] ?? state.councils[x]?.measures[m] ?? 0);
  return { here: change(code), middle: median(model.game.councils.map(change)) };
}

function signal(model: BoardModel, state: BoardState, code: CouncilCode, care: GroupCare, over: number): Signal {
  const dir = (v: number) => (v >= 0 ? "up" : "down");
  if ((MEASURE_IDS as readonly string[]).includes(care)) {
    const m = care as MeasureId;
    const { here, middle } = measureChange(model, state, code, m, over);
    const value = (here + (here - middle)) / 2;
    return { value, reason: { key: `mood.measure.${dir(value)}`, vars: { measure: measureName(model, m) } } };
  }
  if (care === "fell_most") {
    let worst: MeasureId = MEASURE_IDS[0]!;
    let worstValue = Infinity;
    for (const m of MEASURE_IDS) {
      const { here } = measureChange(model, state, code, m, over);
      if (here < worstValue) [worst, worstValue] = [m, here];
    }
    const value = Math.min(0, worstValue);
    return { value, reason: { key: value < 0 ? "mood.fell_most.down" : "mood.fell_most.none", vars: { measure: measureName(model, worst) } } };
  }
  if (care === "promises") {
    const kept = state.promise.kept;
    const pts = ruleParam(model, RULE_IDS.moods, "promise_points");
    if (kept === null) return { value: 0, reason: { key: "mood.promises.waiting", vars: { year: state.promise.byYear } } };
    return { value: kept ? pts : -pts, reason: { key: kept ? "mood.promises.kept" : "mood.promises.broken", vars: { year: state.promise.byYear } } };
  }
  if (care === "crises") {
    const pts = ruleParam(model, RULE_IDS.moods, "crisis_points");
    let value = 0;
    for (const e of state.events) {
      if (e.turn < state.turn + 1 - over || e.turn >= state.turn || !e.councils.includes(code)) continue;
      const def = model.events.find((d) => d.id === e.event);
      if (!def || def.good) continue;
      const handled = def.responses.find((r) => r.id === e.response)?.handled_well ?? false;
      value += handled ? pts : -pts;
    }
    return { value, reason: { key: value > 0 ? "mood.crises.handled" : value < 0 ? "mood.crises.left" : "mood.crises.none" } };
  }
  if (care === "services") {
    const reach = new Set([code, ...neighbours(model, code)]);
    const has = state.projects.some((p) => p.status === "working" && model.projects.find((d) => d.id === p.project)?.tags.includes("services") && siteCouncils(model, p).some((s) => reach.has(s)));
    return { value: has ? ruleParam(model, RULE_IDS.moods, "presence_points") : 0, reason: { key: has ? "mood.services.close" : "mood.services.none" } };
  }
  // young_adults: the young adult share over the window, in percentage points.
  const past = state.history[Math.max(0, Math.min(state.history.length - 1, state.turn + 1 - over))]?.councils[code]?.young;
  const value = (state.councils[code]?.young ?? 0) - (past ?? state.councils[code]?.young ?? 0);
  return { value, reason: { key: value >= 0 ? "mood.young_adults.stay" : "mood.young_adults.leave" } };
}

/**
 * End of turn: every group's mood moves towards 5 (rule P2 `start`) plus `pull` times its signal,
 * keeping `memory` of where it was (rule P1). A council passed over (rule P3) loses `loss` from
 * every mood. Backing is then recomputed; each group's part of the change is recorded.
 */
export function moveMoods(ctx: TurnCtx): void {
  const { model, state: draft } = ctx;
  const memory = param(model, RULE_IDS.moods, "memory");
  const pull = param(model, RULE_IDS.moods, "pull");
  const base = param(model, RULE_IDS.backingStart, "start");
  const over = compareTurns(model);
  const passedTurns = Math.max(1, Math.round(param(model, RULE_IDS.passedOver, "years") / model.game.turn_years));
  const loss = param(model, RULE_IDS.passedOver, "loss");
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
    c.lastReachedTurn = reached;
    const passed = draft.turn - (reached ?? -1) >= passedTurns;
    let total = 0;
    for (const g of model.groups) total += groupWeight(model, g, code);
    for (const g of model.groups) {
      const sig = signals[g.id] ?? [];
      const s = sig.length ? sig.reduce((a, x) => a + x.value, 0) / sig.length : 0;
      const strongest = [...sig].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
      const old = c.moods[g.id]?.mood ?? c.backing;
      const moved = clamp10(memory * old + (1 - memory) * (base + pull * s));
      const next = passed ? clamp10(moved - loss) : moved;
      c.moods[g.id] = { mood: round4(next), reason: passed ? { key: "mood.passed_over", vars: { years: passedTurns * model.game.turn_years } } : strongest?.reason };
      const w = total > 0 ? groupWeight(model, g, code) / total : 0;
      record(ctx, code, w * (moved - old), RULE_IDS.moods, { kind: "people", group: g.id });
      record(ctx, code, w * (next - moved), RULE_IDS.passedOver, { kind: "people", group: g.id });
    }
  }
}
