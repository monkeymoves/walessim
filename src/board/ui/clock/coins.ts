/**
 * The line under the coin counter (playtest 8, must fix 3 and 16). Pure, so the rules can be
 * tested against each other:
 * - "left if you build it" only while the build menu is open on a project that can be built now,
 *   never from a project pointed at before (a stale "0 left");
 * - the purse (rule B1 `purse_max`, a game rule) is always named, so the cap is never a surprise;
 * - a warning when this year's income would fill the purse, before any coin is lost, and a
 *   louder one once it is full and new coins are not paid. The warning point is not a new number:
 *   it is the purse less a year's income.
 */

export interface CoinState {
  /** Coins held now (may hold a fraction). */
  coins: number;
  /** The purse, or 0 when the model has none. */
  purse: number;
  /** Coins in a year after running costs, or null when not known yet. */
  perYear: number | null;
  /** The build menu is open. */
  buildOpen: boolean;
  /** The project being pointed at in the build menu, if any. */
  preview: { allowed: boolean; coinsAfter: number } | null;
}

export type CoinNote =
  | { kind: "after"; n: number }
  | { kind: "full"; purse: number }
  | { kind: "soon"; purse: number }
  | { kind: "income"; perYear: number }
  | { kind: "none" };

const EPS = 1e-6;

/** Whole coins as the counter shows them. */
export const wholeCoins = (coins: number): number => Math.floor(coins + EPS);

export function coinNote(s: CoinState): CoinNote {
  if (s.buildOpen && s.preview?.allowed) return { kind: "after", n: Math.max(0, wholeCoins(s.preview.coinsAfter)) };
  if (s.purse > 0 && s.coins >= s.purse - EPS) return { kind: "full", purse: s.purse };
  if (s.purse > 0 && s.perYear !== null && s.perYear > 0 && s.coins + s.perYear >= s.purse - EPS) return { kind: "soon", purse: s.purse };
  if (s.perYear !== null) return { kind: "income", perYear: s.perYear };
  return { kind: "none" };
}
