// How far a goal bar is filled (cold playtest 6: "bars move in whole points, so most turns look like
// nothing happened"). The fill follows the engine's underlying level, so a turn that moved a goal by
// a third of a point shows, but it never leaves the whole point the label states: "4 out of 10", the
// change arrow and the slip all come from the same whole points, and the fill stays within half a
// point of that number, so nothing on the bar can read as a different whole number from its label.
export function barFill(pips: number, level: number | null | undefined): number {
  const p = Math.max(0, Math.min(10, pips));
  if (typeof level !== "number" || !Number.isFinite(level)) return p;
  const lo = Math.max(0, p - 0.49), hi = Math.min(10, p + 0.49);
  return Math.max(lo, Math.min(hi, level));
}
