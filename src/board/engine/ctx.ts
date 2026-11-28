/**
 * The working context of one `act` or one clock step: a draft state that the step modules change
 * in place, and `change`, the one door every change to a council quantity or the coins goes
 * through. `change` clamps, rounds, applies and records a `Contribution` in the ledger, so every
 * change has a Why? by construction (explain.ts reads the ledger back). `foldLedger` merges a
 * closed year's records (ADR 0007).
 */
import { yearOfStep } from "./time";
import type {
  BoardModel, BoardState, Cause, ChapterRecord, Contribution, CouncilCode, ElectionRecord, EventRecord, Flow, LinkId, Momentum,
  NodeId, RiskStep, RuleId, WhyQuantity,
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
  /** A Work and pay change from new jobs: input to rule S1 (jobs travel home) in this step. */
  jobs?: boolean;
}

/** A jobs change remembered for S1 within one step. */
export interface JobsChange {
  council: CouncilCode;
  delta: number;
  cause: Cause;
}

export interface StepCtx {
  model: BoardModel;
  /** The draft: a private copy, changed in place. */
  state: BoardState;
  /** The step changes belong to (0 based): the step the clock is running, or the step an action is taken in. */
  step: number;
  /** Apply and record a change. Returns the delta actually applied after clamping and rounding. */
  change(c: Change): number;
  /** Work and pay changes from new jobs since this context was made (input to S1). */
  jobs: JobsChange[];
  /** What travelled along links in this context, for pulses on the map. */
  flows: Flow[];
}

/** What one clock step did, for the stops and the story. clock.ts builds it; story.ts reads it. */
export interface StepFacts {
  /** The step that ran; the state is now at `step + 1`. */
  step: number;
  /** Projects that started working (ProjectState ids). */
  finished: string[];
  events: EventRecord[];
  /** The election held on arriving at `step + 1`, if any. */
  election: ElectionRecord | null;
  /** Calendar years that closed on arriving at `step + 1` (empty on most steps at a quarter year). */
  closedYears: number[];
  /** Tiers (`<branch>:<tier>`) and legacy projects (`legacy:<project>`) that opened in this step. */
  opened: string[];
  /** Councils whose momentum changed in this step (rule R2). */
  tipped: { council: CouncilCode; from: Momentum; to: Momentum }[];
  /** The chapter named in this step, when a term closed. */
  chapter: ChapterRecord | null;
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

/** Set a quantity within its range. Returns the value actually stored. Coins keep four decimal places. */
function writeQuantity(state: BoardState, council: CouncilCode | null, q: WhyQuantity, v: number): number {
  if (q === "coins") return (state.coins = round4(Math.max(0, v)));
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

export function makeCtx(model: BoardModel, state: BoardState, step = state.step): StepCtx {
  const year = yearOfStep(model, step);
  const ctx: StepCtx = {
    model, state, step, jobs: [], flows: [],
    change(c: Change): number {
      if (c.quantity === "fairness" || !Number.isFinite(c.delta) || c.delta === 0) return 0;
      const before = readQuantity(state, c.council, c.quantity);
      const after = writeQuantity(state, c.council, c.quantity, before + c.delta);
      const applied = round4(after - before);
      if (applied === 0) return 0;
      state.ledger.push({
        step, year, council: c.council, quantity: c.quantity, delta: applied, rule: c.rule, cause: c.cause,
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

/** A stable key for a cause: two records with the same key share a first cause. */
export function causeKeyOf(c: Cause): string {
  switch (c.kind) {
    case "project": return `project:${c.project}@${c.site.council ?? c.site.link}`;
    case "pair": return `pair:${c.pair}@${c.site.council ?? c.site.link}`;
    case "law": return `law:${c.law}`;
    case "event": return `event:${c.event}`;
    case "response": return `response:${c.event}:${c.response}`;
    case "visit": return `visit:${c.place}`;
    case "start": return `start:${c.start}`;
    case "election": return `election:${c.year}`;
    case "people": return `people:${c.group ?? ""}${c.expect ? ":expect" : ""}`;
    case "deal": return `deal:${c.council}`;
    default: return c.kind;
  }
}

const foldKey = (c: Contribution): string =>
  `${c.council}|${c.quantity}|${c.rule}|${causeKeyOf(c.cause)}|${c.via?.link ?? ""}|${c.via?.from ?? ""}`;

/**
 * Fold the ledger for a closed year: that year's records sharing a council, quantity, rule, cause
 * and link become one record at the first step they happened in, with the deltas summed. Records
 * that sum to nothing go. Other years are untouched, and the order of first appearance is kept.
 * A quarter year game writes about one record per change a year, not four.
 */
export function foldLedger(state: BoardState, year: number): void {
  const merged = new Map<string, Contribution>();
  const out: Contribution[] = [];
  for (const c of state.ledger) {
    if (c.year !== year) { out.push(c); continue; }
    const k = foldKey(c);
    const got = merged.get(k);
    if (got) { got.delta = round4(got.delta + c.delta); continue; }
    const copy = { ...c };
    merged.set(k, copy);
    out.push(copy);
  }
  state.ledger = out.filter((c) => c.year !== year || c.delta !== 0);
}
