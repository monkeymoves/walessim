/**
 * How the headline (Left for 2050) has moved, for the top strip (playtest 8: all eight players
 * felt nothing they did could matter in 2026 to 2036, while the headline sat at 45 to 47 as
 * whole numbers). Everything here reads the engine's own `scores` through the public API:
 * - `since`: the change since 2026, to one decimal, so a year's movement shows;
 * - `building`: how much of the headline is still on the way (builds under way, lifts bedding in
 *   or ramping: Left for 2050 counts them from the day a build starts), and the year the last of it
 *   lands, from the engine's own `headway` view;
 * - `ifBuilt`: the headline if the project pointed at were built now.
 */
import type { Action, BoardModel, BoardState } from "../../engine/api";
import { act, headway as onTheWay, scores } from "../../engine/api";

export interface Headway {
  /** Left for 2050 now, out of 100. */
  now: number;
  /** The same score of the 2026 board. */
  start: number;
  /** now less start. */
  since: number;
  /** The part of `now` that is still on the way: builds not yet open and lifts not yet grown in. */
  building: number;
  /** The year the last of it lands, or null when nothing is on the way. */
  buildingBy: number | null;
}

export function headway(model: BoardModel, state: BoardState): Headway {
  const sc = scores(model, state);
  const way = onTheWay(model, state);
  return {
    now: sc.left,
    start: sc.start,
    since: sc.left - sc.start,
    building: way.comingPoints,
    buildingBy: way.comingBy,
  };
}

/** The headline if `action` were taken now, or null when it cannot be. Nothing is changed. */
export function headlineIf(model: BoardModel, state: BoardState, action: Action): number | null {
  try { return scores(model, act(model, state, action)).left; } catch { return null; }
}

/** One decimal, as the strip shows it. */
export const tenths = (n: number): number => Math.round(n * 10) / 10;

/** Which way a change reads at one decimal: a change that rounds to 0.0 is "same". */
export function direction(change: number): "up" | "down" | "same" {
  const r = tenths(change);
  return r > 0 ? "up" : r < 0 ? "down" : "same";
}
