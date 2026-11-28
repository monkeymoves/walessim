/**
 * What the screen does with the stops and reports of the steps that ran (16.2.5 and 16.2.6): which
 * stops pause the clock and in what order, and which lines go to the ticker. Pure functions of the
 * model, the prefs and the reports, tested in stops.test.ts.
 */
import type { BoardModel, BoardState, CouncilCode, ReportLine, Say, Stop, StepReport, TermReport } from "../../engine/api";
import { pausesOn, type Prefs } from "./prefs";
import { nextElectionStep, opensRunUp, runUpCouncil } from "./runup";

/**
 * A card the screen raises itself: the run-up to an election (./runup.ts), a year before it. Its
 * `ref` is the election's step, so the card is dropped once that election is held.
 */
export interface RunUpStop { kind: "runup"; hard: false; say: Say; ref: string; council?: CouncilCode }

/** One stop waiting on screen. An election and the end carry the term report. */
export interface QueuedStop {
  id: string;
  step: number;
  stop: Stop | RunUpStop;
  term?: TermReport;
}

/** One line in the ticker: a year's lines (each with Why?), or something that happened. */
export type TickerLine =
  | { id: string; step: number; kind: "year"; year: number; line: ReportLine }
  | {
    id: string; step: number; kind: "news"; council: CouncilCode | null; say: Say;
    /** The stop it came from, so the line leaves once its fact is no longer true (`newsTrue`). */
    stop?: Stop;
    /** A line the screen writes itself while it stays true: the purse is nearly full. */
    live?: "purse_soon";
  };

/** Soft stops that are written to the ticker too, so nothing is lost when one is passed by. */
const NEWS_KINDS = new Set(["warning", "keystone", "tier_open", "visit", "tipping", "deal_due", "purse_full", "finished"]);

/**
 * The stops to show, in order. An answer to an event is shown from the state, not the queue. The
 * chapter is shown with the election or the end of the same step, never on its own card then.
 */
export function stopsToShow(model: BoardModel, prefs: Prefs, reports: readonly StepReport[]): QueuedStop[] {
  const out: QueuedStop[] = [];
  for (const r of reports) {
    const withTerm = r.stops.some((s) => s.kind === "election" || s.kind === "ended");
    r.stops.forEach((stop, i) => {
      if (stop.kind === "respond") return;
      if (stop.kind === "chapter" && withTerm) return;
      // an election and the end that fall together are one card: the end's
      if (stop.kind === "election" && r.stops.some((x) => x.kind === "ended")) return;
      if (!pausesOn(model, prefs, stop.kind)) return;
      const term = stop.kind === "election" || stop.kind === "ended" ? r.term : undefined;
      out.push({ id: `${r.step}:${i}:${stop.kind}`, step: r.step, stop, ...(term ? { term } : {}) });
    });
  }
  return out.sort((a, b) => Number(b.stop.hard) - Number(a.stop.hard) || a.step - b.step);
}

/** Lines for the ticker: each year's lines when it closes, then what happened in each step. */
export function tickerLines(reports: readonly StepReport[]): TickerLine[] {
  const out: TickerLine[] = [];
  for (const r of reports) {
    r.stops.forEach((s, i) => {
      if (NEWS_KINDS.has(s.kind)) out.push({ id: `${r.step}:n${i}`, step: r.step, kind: "news", council: s.council ?? null, say: s.say, stop: s });
    });
    (r.yearLines ?? []).forEach((line, i) => out.push({ id: `${r.step}:y${i}`, step: r.step, kind: "year", year: r.year, line }));
  }
  return out;
}

/** After "Look": keep only the hard stops still waiting, so the player can look at the map. */
export const keepHard = (queue: readonly QueuedStop[]): QueuedStop[] => queue.filter((q) => q.stop.hard);

/**
 * Is what the stop says still true (cold playtest 9, must fix 8)? A stop waits on screen while the
 * player builds, answers or reads, so its fact can stop being true before it is read: "Your purse
 * is full" after the coins were spent, a warning whose event has landed, a visit already made, a
 * deal already judged, a council that has turned back. Such a stop is dropped from the queue (it
 * stays in the ticker, dated), so a card never says what is no longer so. Facts that stay true
 * once they happen (a keystone, a tier opened, a build finished, an election) always are.
 */
export function stillTrue(q: Pick<QueuedStop, "stop">, state: BoardState, purse: number): boolean {
  const s = q.stop;
  switch (s.kind) {
    case "runup": return runUpTrue(s, state);
    case "purse_full": return purse > 0 && state.coins >= purse - 1e-6;
    case "warning": return state.forecast.some((f) => f.event === s.ref);
    case "visit": return state.pending.some((p) => p.kind === "visit" && p.place === s.ref);
    case "deal_due": return state.deals.some((d) => d.council === s.council && d.kept === null);
    case "tipping": {
      if (!s.council) return true;
      const to = s.say.key.split(".").pop();
      return to !== "rising" && to !== "slipping" ? true : state.councils[s.council]?.momentum === to;
    }
    default: return true;
  }
}

/** The stops waiting that are still true now, in order. */
export const liveQueue = (queue: readonly QueuedStop[], state: BoardState | null, purse: number): QueuedStop[] =>
  state ? queue.filter((q) => stillTrue(q, state, purse)) : [...queue];

/** The run-up card is true until its election is held. */
function runUpTrue(s: RunUpStop, state: BoardState): boolean {
  return state.step < Number(s.ref) && state.election.records.every((r) => r.step !== Number(s.ref));
}

/**
 * The run-up cards for the steps that ran (./runup.ts): one when a step opens the last year before
 * an election. They are soft: Carry on, or Look at the first council to bring round or keep.
 */
export function runUpStops(model: BoardModel, reports: readonly StepReport[], state: BoardState): QueuedStop[] {
  const out: QueuedStop[] = [];
  for (const r of reports) {
    if (!opensRunUp(model, r.step + 1)) continue;
    const at = nextElectionStep(model, r.step + 1);
    if (at === null || nextElectionStep(model, state.step) !== at) continue;
    const first = runUpCouncil(model, state);
    out.push({ id: `${r.step}:runup`, step: r.step, stop: { kind: "runup", hard: false, say: { key: "boardclock.runup.title" }, ref: String(at), ...(first ? { council: first } : {}) } });
  }
  return out;
}

/** The share of a year's coins after costs, before the purse cuts it, from one step's coins. */
export const perYearOf = (c: StepReport["coins"], stepsPerYear: number): number => (c.income + (c.lost ?? 0) - c.running - c.charges) * stepsPerYear;

/** The purse is nearly full: a year's income would fill it, and it is not full yet (./coins.ts `coinNote`). */
export const purseSoon = (coins: number, purse: number, perYear: number | null): boolean =>
  purse > 0 && perYear !== null && perYear > 0 && coins < purse - 1e-6 && coins + perYear >= purse - 1e-6;

/**
 * Is a ticker line still true (cold playtest 10, should fix 1: "Purse full" stayed in the ticker
 * for years after the coins were spent)? A news line from a stop is true while its stop would be;
 * the screen's own purse line while the purse is nearly full; a year's lines always (they are dated).
 */
export function newsTrue(line: TickerLine, state: BoardState, purse: number, perYear: number | null): boolean {
  if (line.kind !== "news") return true;
  if (line.live === "purse_soon") return purseSoon(state.coins, purse, perYear);
  return line.stop ? stillTrue({ stop: line.stop }, state, purse) : true;
}

/**
 * The warnings among stops being passed by (Carry on past all, Look): their event ids, so each
 * stays pinned as a slip to read (cold playtest 10, should fix 5: "Carry on past all 5 cards"
 * skipped a storm warning the player never saw).
 */
export const passedWarnings = (passed: readonly QueuedStop[]): string[] =>
  passed.filter((q) => q.stop.kind === "warning" && !q.stop.hard && q.stop.ref).map((q) => q.stop.ref!);

/**
 * The purse card stops time once a game (cold playtest 10, should fix 1: the full purse card came
 * again and again). Later fills are in the ticker and on the coin counter only. Returns the cards
 * to queue and whether the purse card has now been shown.
 */
export function purseOnce(q: readonly QueuedStop[], shownBefore: boolean): { queue: QueuedStop[]; shown: boolean } {
  let shown = shownBefore;
  const queue = q.filter((x) => {
    if (x.stop.kind !== "purse_full") return true;
    if (shown) return false;
    shown = true;
    return true;
  });
  return { queue, shown };
}
