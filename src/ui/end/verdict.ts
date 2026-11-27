// The end screen's numbers and the shape of its one sentence on why, as pure functions so every line
// on the screen is worked out from the same rounded values (cold playtest 5: "You hand on about 46"
// beside "Both scores rose" when one went 46 to 46; "about 46" beside an autopilot at 46 that you
// "finished ahead of by about 4").
import { STRAND_IDS } from "../../model/schema";
import type { EndResult, Mattered, StrandId } from "../../engine/api";

export type Side = "lived" | "left";
export type Dir = "up" | "level" | "down";

const fin = (v: number | null | undefined): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Net goal steps (the engine's judged change) as score points out of 100. */
export const toPoints = (netSteps: number): number => (fin(netSteps) * 10) / STRAND_IDS.length;

/**
 * A score as shown, from its 2026 value and its value now: the start is rounded and the shown value is
 * the start plus the rounded change, so "was 46, now about 41" always reads as the change. The top bar
 * and the end screen both use it, so the last top-bar total and the end total are the same number
 * (cold playtest 6, item 5: 40 on the top bar, 41 on the end screen).
 */
export function shownScore(start: number, now: number): { start: number; now: number; change: number } {
  const s0 = Math.round(fin(start));
  const change = Math.round(fin(now) - fin(start)) || 0;
  return { start: s0, now: s0 + change, change };
}

/**
 * One side's 2026 score and its end score out of 100, rounded once: the start is rounded and the end
 * is the start plus the rounded change, so "46 to 43" always reads as the change the engine judged.
 */
export function sideScore(r: EndResult, side: Side): { start: number; end: number; change: number } {
  const startRaw = fin(side === "lived" ? r.start.lived : r.start.left) * 10;
  const x = shownScore(startRaw, startRaw + toPoints(side === "lived" ? r.lived.value : r.left.value));
  return { start: x.start, end: x.now, change: x.change };
}

/** Up, level or down, from the same rounded change the score line shows. */
export function direction(r: EndResult, side: Side): Dir {
  const c = sideScore(r, side).change;
  return c >= 1 ? "up" : c <= -1 ? "down" : "level";
}

/** The weaker side's score line: "Wales scored about {start} out of 100 in 2026. You hand on about {end}." */
export function verdictScore(r: EndResult): { side: Side; start: number; end: number; change: number } {
  const side = r.result.which;
  return { side, ...sideScore(r, side) };
}

/**
 * The label on the score that counts (cold playtest 7, item 3: "the weaker one" beside 53 while the
 * other read 50). The result is the score that did worse since 2026, judged on change, so the label
 * names that change, from the same rounded numbers the line beside it shows ("was 50, about 53").
 */
export function countsLabel(r: EndResult): { side: Side; key: string; n: number } {
  const side = r.result.which;
  const me = sideScore(r, side).change;
  const other = sideScore(r, side === "lived" ? "left" : "lived").change;
  if (me > 0) return { side, key: me < other ? "play5.end.counts_up_less" : "play5.end.counts_up", n: me };
  if (me < 0) return { side, key: "play5.end.counts_down", n: -me };
  return { side, key: "play5.end.counts_level", n: 0 };
}

/**
 * Which sentence explains the result. Each claim it makes about a score matches that score's shown
 * direction: "held up" only when Life in your years did not fall, "you left a lot for 2050" only when
 * Left for 2050 rose, "both rose" only when both did. Anything else says each side plainly ("mixed").
 */
export type WhyKind = "coins" | "both" | "left" | "lived" | "up" | "mixed";
export function whyKind(r: EndResult, coinTurns: number): WhyKind {
  if (coinTurns >= 3) return "coins";
  const L = direction(r, "lived"), F = direction(r, "left");
  if (L === "down" && F === "down") return "both";
  if (F === "down" && L !== "down") return "left";
  if (L === "down" && F === "up") return "lived";
  if (L === "up" && F === "up") return "up";
  return "mixed";
}

/**
 * Autopilot on the same scale as the player's own line: the stand-in's judged change added to the
 * same 2026 start, so "ended at about {at}" and "ahead by about {d}" are plain arithmetic on the
 * numbers already shown (d = end minus at).
 */
export function autopilotScore(r: EndResult): { at: number; d: number } | null {
  const g = r.caretakerGhost;
  if (!g || typeof g.result !== "number" || !Number.isFinite(g.result)) return null;
  const v = verdictScore(r);
  const at = v.start + (Math.round(toPoints(g.result)) || 0);
  return { at, d: v.end - at };
}

/** The p10 to p90 spread of the result as score points, for "luck could have put you anywhere from". */
export function resultRange(r: EndResult): { lo: number; hi: number } | null {
  const lo = r.result.p10, hi = r.result.p90;
  if (typeof lo !== "number" || typeof hi !== "number" || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const a = Math.round(toPoints(lo)), b = Math.round(toPoints(hi));
  return a === b ? null : { lo: a, hi: b };
}

/** The turn (0 = 2026 to 2030) that ended in the lowest year: `worstTerm` indexes years, so one before it. */
export const hardestTurn = (worstTerm: number): number => Math.max(0, worstTerm - 1);

/**
 * The one reason the end screen gives, and the turn the timeline marks for it (cold playtest 6, item 5:
 * "Hardest turn 2026" on the timeline while the sentence blamed the 2042 crisis). `cause` is the thing
 * named after "The biggest reason:", or null when the sentence names a goal or none. `turn` is the turn
 * the timeline marks as the hardest: for a fall in Life in your years, the turn that ended lowest; for a
 * named crisis or lost election, its own turn; otherwise none, so the two never disagree.
 */
export interface Reason {
  kind: WhyKind;
  cause: Mattered | null;
  /** The goal named when no single cause is: the one that fell (down) or rose (up) the most. */
  goal: { strand: StrandId; up: boolean } | null;
  turn: number | null;
}

export function verdictReason(r: EndResult, all: Mattered[], coinTurns: number): Reason {
  const kind = whyKind(r, coinTurns);
  if (kind === "coins") return { kind, cause: null, goal: null, turn: null };
  if (kind === "lived") return { kind, cause: null, goal: null, turn: r.worstFell !== false && r.worstTerm > 0 ? hardestTurn(r.worstTerm) : null };
  const L = direction(r, "lived"), F = direction(r, "left");
  const down = kind === "both" || kind === "left" || (kind === "mixed" && (L === "down" || F === "down"));
  const key = r.result.which;
  const byGoal = [...r.perStrand].sort((a, b) => (down ? a[key] - b[key] : b[key] - a[key]))[0];
  const cause = (down ? all.filter((m) => m.size < 0 && m.kind !== "coins_unused") : all.filter((m) => m.size > 0))[0] ?? null;
  const turn = cause && down && (cause.kind === "shock" || cause.kind === "lost_turn") ? cause.term : null;
  return { kind, cause, goal: cause || !byGoal ? null : { strand: byGoal.strand, up: !down }, turn };
}
