/**
 * Coins (docs/design/v2-board.md section 5.1): rules B1 to B3 in model/board/rules/budget.yaml.
 *
 * At the end of each turn: unspent coins carry over up to `carry_max`; income is `base` plus one
 * coin for every `per_work_points` of Work and pay gained across the board since 2026; projects pay
 * their running costs and coin effects on their schedule; the care bill (B2) is charged from
 * `from_year` unless enough health hubs stand; a weak hand after a lost election (B3) costs
 * `lost_coins`. Every coin moved goes through `ctx.change`, so the coins have a Why? too.
 */
import { allHold, siteCouncils } from "./conditions";
import type { TurnCtx } from "./ctx";
import { param } from "./rules";
import type { BoardModel, BoardState, Cause, CoinsReport, ProjectState } from "./types";
import { RULE_IDS } from "./types";

const BUDGET: Cause = { kind: "budget" };

/** Work and pay points gained across the board since 2026 (can be negative). */
export function workGained(state: BoardState): number {
  const first = state.history[0];
  if (!first) return 0;
  let gain = 0;
  for (const [code, c] of Object.entries(state.councils)) gain += c.measures.work - (first.councils[code]?.measures.work ?? c.measures.work);
  return gain;
}

/** Coins a turn before running costs: rule B1 `base` plus growth from Work and pay. */
export function income(model: BoardModel, state: BoardState): number {
  const per = param(model, RULE_IDS.coins, "per_work_points");
  const growth = per > 0 ? Math.floor(Math.max(0, workGained(state)) / per) : 0;
  return param(model, RULE_IDS.coins, "base") + growth;
}

/** True when something due every `every` turns falls due at the end of `turn` for a project working since `readyTurn`. */
export function due(turn: number, readyTurn: number, every: number): boolean {
  const n = turn - readyTurn;
  return every > 0 && n >= 1 && n % every === 0;
}

/** Health hubs (projects with the `care_bill_off` special) standing in enough councils switch off the care bill. */
export function careBillOff(model: BoardModel, state: BoardState): boolean {
  const places = new Set<string>();
  for (const p of state.projects) {
    if (p.status !== "working") continue;
    const def = model.projects.find((d) => d.id === p.project);
    if (def?.effects.some((e) => e.kind === "special" && e.special === "care_bill_off")) siteCouncils(model, p).forEach((c) => places.add(c));
  }
  return places.size >= param(model, RULE_IDS.careBill, "hubs_needed");
}

/** Running costs and coin effects due at the end of `turn`, per project (negative is a cost). */
export function projectCoins(model: BoardModel, state: BoardState, turn: number): { p: ProjectState; coins: number; running: boolean }[] {
  const out: { p: ProjectState; coins: number; running: boolean }[] = [];
  for (const p of state.projects) {
    if (p.status !== "working") continue;
    const def = model.projects.find((d) => d.id === p.project);
    if (!def) continue;
    if (def.running && due(turn, p.readyTurn, def.running.every_turns)) out.push({ p, coins: -def.running.coins, running: true });
    for (const e of def.effects) {
      if (e.kind !== "coins" || !due(turn, p.readyTurn, e.every_turns)) continue;
      if (siteCouncils(model, p).some((c) => allHold(model, state, c, e.only_if ?? []))) out.push({ p, coins: e.coins, running: e.coins < 0 });
    }
  }
  return out;
}

/** Settle the coins at the end of `ctx.turn` for the turn that follows. Call after the election. */
export function settleCoins(ctx: TurnCtx): CoinsReport {
  const { model, state, turn } = ctx;
  const before = state.coins;
  const carried = Math.min(before, param(model, RULE_IDS.coins, "carry_max"));
  ctx.change({ council: null, quantity: "coins", delta: carried - before, rule: RULE_IDS.coins, cause: BUDGET });

  let inc = ctx.change({ council: null, quantity: "coins", delta: income(model, state), rule: RULE_IDS.coins, cause: BUDGET });
  let running = 0;
  for (const x of projectCoins(model, state, turn)) {
    const applied = ctx.change({ council: null, quantity: "coins", delta: x.coins, rule: RULE_IDS.coins, cause: { kind: "project", project: x.p.project, site: x.p.site } });
    if (x.running) running -= applied;
    else inc += applied;
  }

  let charges = 0;
  const nextYear = state.year + model.game.turn_years;
  if (nextYear >= param(model, RULE_IDS.careBill, "from_year") && !careBillOff(model, state)) {
    charges -= ctx.change({ council: null, quantity: "coins", delta: -param(model, RULE_IDS.careBill, "care_bill"), rule: RULE_IDS.careBill, cause: BUDGET });
  }
  const weakUntil = state.election.weakUntil;
  if (weakUntil !== null && turn + 1 <= weakUntil) {
    const last = state.election.records[state.election.records.length - 1];
    const cause: Cause = last ? { kind: "election", year: last.year } : BUDGET;
    charges -= ctx.change({ council: null, quantity: "coins", delta: -param(model, RULE_IDS.weakHand, "lost_coins"), rule: RULE_IDS.weakHand, cause });
  }
  return { before, income: inc, running, charges, carried, after: state.coins };
}

/** The 2026 budget: rule B1 `base`. */
export function openingCoins(ctx: TurnCtx): void {
  ctx.change({ council: null, quantity: "coins", delta: param(ctx.model, RULE_IDS.coins, "base"), rule: RULE_IDS.coins, cause: BUDGET });
}

