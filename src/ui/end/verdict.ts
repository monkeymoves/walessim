// The end screen's numbers and the shape of its one sentence on why, as pure functions so every line
// on the screen is worked out from the same rounded values (cold playtest 5: "You hand on about 46"
// beside "Both scores rose" when one went 46 to 46; "about 46" beside an autopilot at 46 that you
// "finished ahead of by about 4").
import { STRAND_IDS } from "../../model/schema";
import type { EndResult } from "../../engine/api";

export type Side = "lived" | "left";
export type Dir = "up" | "level" | "down";

const fin = (v: number | null | undefined): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Net goal steps (the engine's judged change) as score points out of 100. */
export const toPoints = (netSteps: number): number => (fin(netSteps) * 10) / STRAND_IDS.length;

/**
 * One side's 2026 score and its end score out of 100, rounded once: the start is rounded and the end
 * is the start plus the rounded change, so "46 to 43" always reads as the change the engine judged.
 */
export function sideScore(r: EndResult, side: Side): { start: number; end: number; change: number } {
  const startRaw = fin(side === "lived" ? r.start.lived : r.start.left) * 10;
  const start = Math.round(startRaw);
  const change = Math.round(toPoints(side === "lived" ? r.lived.value : r.left.value)) || 0;
  return { start, end: start + change, change };
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
