/**
 * The working context of one `act` or `endTurn`: a draft state that the turn modules change in
 * place, and `change`, the one door every change to a council quantity or the coins goes
 * through. `change` clamps, rounds, applies and records a `Contribution` in the ledger, so every
 * change has a Why? by construction (explain.ts reads the ledger back).
 */
import type {
  BoardModel, BoardState, Cause, CouncilCode, Flow, LinkId, NodeId, RiskStep, RuleId, WhyQuantity,
} from "./types";
import { MEASURE_IDS } from "./types";

/** One change to make and record. */
export interface Change {
  /** null for coins. */
  council: CouncilCode | null;
  quantity: WhyQuantity;
  delta: number;
  rule: RuleId;
  cause: Cause;
  /** Set when it travelled along a link. */
  via?: { link: LinkId; from: NodeId };
  /** A Work and pay change from new jobs: input to rule S1 (jobs travel home) this turn. */
  jobs?: boolean;
}

/** A jobs change remembered for S1 within one endTurn. */
export interface JobsChange {
  council: CouncilCode;
  delta: number;
  cause: Cause;
}

export interface TurnCtx {
  model: BoardModel;
  /** The draft: a private copy, changed in place. */
  state: BoardState;
  /** The turn changes belong to (0 based). */
  turn: number;
  /** Apply and record a change. Returns the delta actually applied after clamping and rounding. */
  change(c: Change): number;
  /** Work and pay changes from new jobs since this context was made (input to S1). */
  jobs: JobsChange[];
  /** What travelled along links in this context, for pulses on the map. */
  flows: Flow[];
}

/** Four decimal places: keeps states short and byte equal on replay. */
export const round4 = (v: number): number => Math.round(v * 1e4) / 1e4;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

const isMeasure = (q: WhyQuantity): boolean => (MEASURE_IDS as readonly string[]).includes(q);

/** Read the current value of a council quantity, or the coins. */
export function readQuantity(state: BoardState, council: CouncilCode | null, q: WhyQuantity): number {
  if (q === "coins") return state.coins;
  const c = council ? state.councils[council] : undefined;
  if (!c) return 0;
  if (isMeasure(q)) return c.measures[q as keyof typeof c.measures];
  if (q === "young_adults") return c.young;
  if (q === "backing") return c.backing;
  if (q === "risk_flood") return c.risks.flood;
  if (q === "risk_tip") return c.risks.tip;
  if (q === "risk_employer") return c.risks.employer;
  return 0;
}

/** Set a quantity within its range. Returns the value actually stored. */
function writeQuantity(state: BoardState, council: CouncilCode | null, q: WhyQuantity, v: number): number {
  if (q === "coins") return (state.coins = Math.max(0, Math.round(v)));
  const c = council ? state.councils[council] : undefined;
  if (!c) return 0;
  if (isMeasure(q)) return (c.measures[q as keyof typeof c.measures] = round4(clamp(v, 0, 10)));
  if (q === "young_adults") return (c.young = round4(clamp(v, 0, 100)));
  if (q === "backing") return (c.backing = round4(clamp(v, 0, 10)));
  const step = clamp(Math.round(v), 0, 3) as RiskStep;
  if (q === "risk_flood") return (c.risks.flood = step);
  if (q === "risk_tip") return (c.risks.tip = step);
  if (q === "risk_employer") return (c.risks.employer = step);
  return 0;
}

export function makeCtx(model: BoardModel, state: BoardState, turn = state.turn): TurnCtx {
  const ctx: TurnCtx = {
    model, state, turn, jobs: [], flows: [],
    change(c: Change): number {
      if (c.quantity === "fairness" || !Number.isFinite(c.delta) || c.delta === 0) return 0;
      const before = readQuantity(state, c.council, c.quantity);
      const after = writeQuantity(state, c.council, c.quantity, before + c.delta);
      const applied = round4(after - before);
      if (applied === 0) return 0;
      state.ledger.push({
        turn, council: c.council, quantity: c.quantity, delta: applied, rule: c.rule, cause: c.cause,
        ...(c.via ? { via: c.via } : {}),
      });
      if (c.jobs && c.quantity === "work" && c.council) ctx.jobs.push({ council: c.council, delta: applied, cause: c.cause });
      if (c.via && c.council) {
        ctx.flows.push({ link: c.via.link, from: c.via.from, to: c.council, quantity: c.quantity, amount: applied, rule: c.rule });
      }
      return applied;
    },
  };
  return ctx;
}
