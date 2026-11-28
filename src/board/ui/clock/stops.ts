/**
 * What the screen does with the stops and reports of the steps that ran (16.2.5 and 16.2.6): which
 * stops pause the clock and in what order, and which lines go to the ticker. Pure functions of the
 * model, the prefs and the reports, tested in stops.test.ts.
 */
import type { BoardModel, CouncilCode, ReportLine, Say, Stop, StepReport, TermReport } from "../../engine/api";
import { pausesOn, type Prefs } from "./prefs";

/** One stop waiting on screen. An election and the end carry the term report. */
export interface QueuedStop {
  id: string;
  step: number;
  stop: Stop;
  term?: TermReport;
}

/** One line in the ticker: a year's lines (each with Why?), or something that happened. */
export type TickerLine =
  | { id: string; step: number; kind: "year"; year: number; line: ReportLine }
  | { id: string; step: number; kind: "news"; council: CouncilCode | null; say: Say };

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
      if (NEWS_KINDS.has(s.kind)) out.push({ id: `${r.step}:n${i}`, step: r.step, kind: "news", council: s.council ?? null, say: s.say });
    });
    (r.yearLines ?? []).forEach((line, i) => out.push({ id: `${r.step}:y${i}`, step: r.step, kind: "year", year: r.year, line }));
  }
  return out;
}

/** After "Look": keep only the hard stops still waiting, so the player can look at the map. */
export const keepHard = (queue: readonly QueuedStop[]): QueuedStop[] => queue.filter((q) => q.stop.hard);
