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

/**
 * Where a year's coins come from and go (cold playtest 9, should fix 8: "About +4", "+1.1",
 * "About +0 a year" with no reason). The engine's Why? for coins over one step, grouped into the
 * parts a player can name, each per year. One-off coins (a build, an event's cost, a fresh start)
 * are not income and are left out.
 */
export type IncomeKind = "budget" | "rising" | "earns" | "running" | "care" | "weak";

export interface IncomePart {
  kind: IncomeKind;
  /** The project, for running costs and earnings. */
  project?: string;
  perYear: number;
}

/** One coin record as the engine's Why? gives it. */
export interface CoinWhy {
  rule: string;
  cause: { kind: string; project?: string };
  delta: number;
}

/** The rule ids the parts come from (RULE_IDS in the engine): B1 coins, B2 the care bill, R2 rising councils, B3 phase 1's weak hand. */
export interface IncomeRules { coins: string; careBill: string; momentum: string; weak: string }

export function incomeParts(whys: readonly CoinWhy[], stepsPerYear: number, rules: IncomeRules): IncomePart[] {
  const out = new Map<string, IncomePart>();
  const add = (key: string, part: Omit<IncomePart, "perYear">, d: number) => {
    const old = out.get(key);
    out.set(key, { ...part, perYear: (old?.perYear ?? 0) + d * stepsPerYear });
  };
  for (const w of whys) {
    if (w.rule === rules.coins && w.cause.kind === "budget") add("budget", { kind: "budget" }, w.delta);
    else if (w.rule === rules.coins && w.cause.kind === "project" && w.cause.project) {
      const kind: IncomeKind = w.delta < 0 ? "running" : "earns";
      add(`${kind}:${w.cause.project}`, { kind, project: w.cause.project }, w.delta);
    } else if (w.rule === rules.momentum) add("rising", { kind: "rising" }, w.delta);
    else if (w.rule === rules.careBill) add("care", { kind: "care" }, w.delta);
    else if (w.rule === rules.weak) add("weak", { kind: "weak" }, w.delta);
  }
  return [...out.values()].filter((p) => Math.abs(p.perYear) > EPS);
}

const keyOf = (p: IncomePart) => `${p.kind}:${p.project ?? ""}`;

/** The change that moved a year's income most since a year before, if it moved it by a quarter coin or more. */
export function incomeChange(now: readonly IncomePart[], before: readonly IncomePart[]): { part: IncomePart; change: number } | null {
  const was = new Map(before.map((p) => [keyOf(p), p]));
  const all = new Map(now.map((p) => [keyOf(p), p]));
  for (const [k, p] of was) if (!all.has(k)) all.set(k, { ...p, perYear: 0 });
  let best: { part: IncomePart; change: number } | null = null;
  for (const [k, p] of all) {
    const change = p.perYear - (was.get(k)?.perYear ?? 0);
    if (Math.abs(change) < 0.25) continue;
    if (!best || Math.abs(change) > Math.abs(best.change)) best = { part: was.has(k) && p.perYear === 0 ? was.get(k)! : p, change };
  }
  return best;
}
