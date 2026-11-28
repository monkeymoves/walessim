/**
 * Coins (docs/design/v2-board.md sections 5.1, 16.2.4 and 16.3.3): rules B1 and B2 in
 * model/board/rules/budget.yaml, R2's coins from councils on the rise, and phase 1's B3 while a
 * model still carries it.
 *
 * Every step: income is `base_per_year` plus `growth_per_year` for every `per_work_points` of Work
 * and pay gained across the board since 2026, paid a step's share at a time; working projects pay
 * their running costs and coin effects (per year, a step's share); councils on the rise pay R2
 * `coins_per_year` each, and the region turn pays more for good; the care bill (B2) is charged
 * from `from_year` unless enough health hubs stand. The purse (B1 `purse_max`) caps what you hold:
 * coins above it are not paid. A model with `carry_max` and no purse keeps phase 1's carry over.
 * Coins hold four decimal places. Every coin moved goes through `ctx.change`, so the coins have a
 * Why? too.
 */
import { allHold, siteCouncils } from "./conditions";
import type { StepCtx } from "./ctx";
import { momentumCoinsPerYear } from "./momentum";
import { ruleParam } from "./rule-defaults";
import { optParam, param } from "./rules";
import { specialCouncils, specialStands } from "./specials";
import { closesSpan, perStep, yearOfStep } from "./time";
import type { BoardModel, BoardState, Cause, CoinsReport, ProjectState } from "./types";
import { RULE_IDS } from "./types";

/** Phase 1's weak hand card (B3): coins lost a year after a lost election. Applied only while a model carries it; P6 replaces it. */
export const WEAK_HAND = "B3";

const BUDGET: Cause = { kind: "budget" };

/** Phase 1's carry over span (a two year turn), for a model whose B1 card has `carry_max` but no `carry_years`. */
const PHASE1_CARRY_YEARS = 2;

/** Work and pay points gained across the board since 2026 (can be negative). */
export function workGained(state: BoardState): number {
  const first = state.history[0];
  if (!first) return 0;
  let gain = 0;
  for (const [code, c] of Object.entries(state.councils)) gain += c.measures.work - (first.councils[code]?.measures.work ?? c.measures.work);
  return gain;
}

/** Coins a year from rule B1: `base_per_year` plus growth from Work and pay. */
export function baseIncome(model: BoardModel, state: BoardState): number {
  const per = param(model, RULE_IDS.coins, "per_work_points");
  const growth = per > 0 ? Math.floor(Math.max(0, workGained(state)) / per) : 0;
  return param(model, RULE_IDS.coins, "base_per_year") + growth * param(model, RULE_IDS.coins, "growth_per_year");
}

/** Coins a year before running costs: rule B1, and rule R2 (councils on the rise, the region turn). */
export function income(model: BoardModel, state: BoardState): number {
  return baseIncome(model, state) + momentumCoinsPerYear(model, state);
}

/** The purse: the most coins you can hold (B1 `purse_max`), or undefined for phase 1's carry over. */
export const purseMax = (model: BoardModel): number | undefined => optParam(model, RULE_IDS.coins, "purse_max");

/** True when a project working since `readyStep` pays its coins in step `step` (from the step after it opened). */
export const paysIn = (step: number, readyStep: number): boolean => step - readyStep >= 1;

/**
 * The care bill is off when health hubs (the `care_bill_off` special) stand in enough councils, or
 * once Heat and homes for all (the `no_care_bill` special) is working.
 */
export function careBillOff(model: BoardModel, state: BoardState): boolean {
  if (specialStands(model, state, "no_care_bill")) return true;
  return specialCouncils(model, state, "care_bill_off").size >= param(model, RULE_IDS.careBill, "hubs_needed");
}

/** The share of running costs paid: B1 `running_share` once Homes that pay their own bills is working, else all. */
export function runningShare(model: BoardModel, state: BoardState): number {
  return specialStands(model, state, "running_halved") ? ruleParam(model, RULE_IDS.coins, "running_share") : 1;
}

/** Running costs and coin effects for step `step`, per project, a step's share of the year (negative is a cost). */
export function projectCoins(model: BoardModel, state: BoardState, step: number): { p: ProjectState; coins: number; running: boolean }[] {
  const out: { p: ProjectState; coins: number; running: boolean }[] = [];
  const share = runningShare(model, state);
  for (const p of state.projects) {
    if (p.status !== "working" || !paysIn(step, p.readyStep)) continue;
    const def = model.projects.find((d) => d.id === p.project);
    if (!def) continue;
    if (def.running) out.push({ p, coins: -perStep(model, def.running.coins_per_year) * share, running: true });
    for (const e of def.effects) {
      if (e.kind !== "coins") continue;
      if (siteCouncils(model, p).some((c) => allHold(model, state, c, e.only_if ?? []))) out.push({ p, coins: perStep(model, e.coins_per_year), running: e.coins_per_year < 0 });
    }
  }
  return out;
}

/** One coin movement of a step, before it is applied. */
interface Coin { delta: number; rule: string; cause: Cause; kind: "income" | "running" | "charge" }

/** Every coin movement of step `step`, in phase 1's order. */
function movements(model: BoardModel, state: BoardState, step: number): Coin[] {
  const out: Coin[] = [{ delta: perStep(model, baseIncome(model, state)), rule: RULE_IDS.coins, cause: BUDGET, kind: "income" }];
  for (const x of projectCoins(model, state, step)) {
    out.push({ delta: x.coins, rule: RULE_IDS.coins, cause: { kind: "project", project: x.p.project, site: x.p.site }, kind: x.running ? "running" : "income" });
  }
  const rising = momentumCoinsPerYear(model, state);
  if (rising) out.push({ delta: perStep(model, rising), rule: RULE_IDS.momentum, cause: { kind: "momentum" }, kind: "income" });
  if (yearOfStep(model, step + 1) >= param(model, RULE_IDS.careBill, "from_year") && !careBillOff(model, state)) {
    out.push({ delta: -perStep(model, param(model, RULE_IDS.careBill, "care_bill_per_year")), rule: RULE_IDS.careBill, cause: BUDGET, kind: "charge" });
  }
  const hungUntil = state.election.hungUntil;
  const lost = optParam(model, WEAK_HAND, "lost_coins_per_year");
  if (lost !== undefined && hungUntil !== null && step + 1 <= hungUntil) {
    const last = state.election.records[state.election.records.length - 1];
    out.push({ delta: -perStep(model, lost), rule: WEAK_HAND, cause: last ? { kind: "election", year: last.year } : BUDGET, kind: "charge" });
  }
  return out;
}

/**
 * Settle the coins of step `ctx.step`. Call after the election. With a purse (B1 `purse_max`),
 * costs come first and coins coming in stop at the purse: coins above it are not paid. Without
 * one, phase 1's carry over applies every `carry_years` (B1 `carry_max`).
 */
export function settleCoins(ctx: StepCtx): CoinsReport {
  const { model, state, step } = ctx;
  const before = state.coins;
  const purse = purseMax(model);
  const carryMax = optParam(model, RULE_IDS.coins, "carry_max");
  if (purse === undefined && carryMax !== undefined && closesSpan(model, step + 1, optParam(model, RULE_IDS.coins, "carry_years") ?? PHASE1_CARRY_YEARS)) {
    const carried = Math.min(before, carryMax);
    ctx.change({ council: null, quantity: "coins", delta: carried - before, rule: RULE_IDS.coins, cause: BUDGET });
  }
  const all = movements(model, state, step);
  const ordered = purse === undefined ? all : [...all.filter((m) => m.delta < 0), ...all.filter((m) => m.delta >= 0)];
  let inc = 0;
  let running = 0;
  let charges = 0;
  for (const m of ordered) {
    const delta = purse !== undefined && m.delta > 0 ? Math.min(m.delta, Math.max(0, purse - state.coins)) : m.delta;
    const applied = ctx.change({ council: null, quantity: "coins", delta, rule: m.rule, cause: m.cause });
    if (m.kind === "income") inc += applied;
    else if (m.kind === "running") running -= applied;
    else charges -= applied;
  }
  return { before, income: inc, running, charges, after: state.coins };
}

/** The coins in May 2026: rule B1 `opening`. */
export function openingCoins(ctx: StepCtx): void {
  ctx.change({ council: null, quantity: "coins", delta: ruleParam(ctx.model, RULE_IDS.coins, "opening"), rule: RULE_IDS.coins, cause: BUDGET });
}

