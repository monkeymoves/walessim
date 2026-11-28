/**
 * One step of the clock, applied in place to a draft (docs/design/v2-board.md section 16.2.4).
 * clock.ts clones the state and calls `runStep`; nothing else does.
 *
 * Inside step s:
 * 1. visits lapse when their window ends;
 * 2. builds whose ready step is s start working; rail quality follows;
 * 3. roots grow (R1), then held effects move to their targets (ramps, roots);
 * 4. events whose landing step is s land;
 * 5. spread S1, S2 and S3 along links;
 * then, arriving at step s + 1:
 * 6. when a year closes: momentum (R2), the promise, moods and Backing, deals are judged;
 * 7. on an election step: the election is held and deals offered;
 * 8. coins for the step (after the election, as phase 1 settled coins after it);
 * 9. the step and year move on; when a year closes, the yearly frame, year lines and the ledger
 *    fold; when a term closes, its chapter and the term report;
 * 10. the forecast for the new step, the phase, the story's moments and the stops.
 */
import { before, openedSince, stopsOf, tippedSince } from "./clock-stops";
import { foldLedger, makeCtx, type StepFacts } from "./ctx";
import { judgeDeals, offerDeals } from "./deals";
import { forecastNext, landEvents } from "./events";
import { reportLines } from "./explain";
import { makeFrame, mergeFlows } from "./frame";
import { applyHeld, applyLinkQuality } from "./held";
import { updateMomentum } from "./momentum";
import { election as electionView, holdElection, judgePromise, updatePeople } from "./people";
import { growRoots } from "./roots";
import { runSpread } from "./spread";
import { settleCoins } from "./budget";
import { nameChapter, noteStep } from "./story";
import { isElectionStep, seasonOf, stepOfYear, stepsOf, yearOfStep, yearsClosed } from "./time";
import type { BoardModel, BoardState, ChapterRecord, Phase, ReportLine, StepReport, TermReport } from "./types";

export const phaseOf = (model: BoardModel, s: BoardState): Phase =>
  s.step >= model.game.steps ? "ended" : s.pending.some((p) => p.kind === "respond") ? "respond" : "play";

/** Visits whose window (`game.visit_open_years` from `since`) has ended lapse at the start of its last step. */
function lapseVisits(model: BoardModel, draft: BoardState): void {
  const window = Math.max(1, stepsOf(model, model.game.visit_open_years));
  draft.pending = draft.pending.filter((p) => !(p.kind === "visit" && draft.step >= p.since + window - 1));
}

/** Which term an election or the end closes (1 is 2026 to 2030), and its years. */
function termOf(model: BoardModel, toYear: number): { term: number; fromYear: number } {
  const ys = model.game.election_years;
  const i = ys.indexOf(toYear);
  const index = i >= 0 ? i : ys.length;
  return { term: index + 1, fromYear: index > 0 ? ys[index - 1]! : model.game.first_year };
}

/** Run step `draft.step` in place. `light` skips the report lines (the state is the same either way). */
export function runStep(model: BoardModel, draft: BoardState, light: boolean): StepReport {
  const s = draft.step;
  const was = before(model, draft);
  const ctx = makeCtx(model, draft, s);

  lapseVisits(model, draft);
  const finished: string[] = [];
  for (const p of draft.projects) {
    if (p.readyStep !== s) continue;
    if (p.status === "building") p.status = "working";
    finished.push(p.id);
  }
  applyLinkQuality(model, draft);
  growRoots(ctx);
  applyHeld(ctx);
  const landed = landEvents(ctx);
  runSpread(ctx);

  const next = s + 1;
  const years = yearsClosed(model, next);
  if (years > 0) {
    updateMomentum(ctx, years);
    judgePromise(ctx, next);
    updatePeople(ctx, years);
    judgeDeals(ctx);
  }
  const held = isElectionStep(model, next) ? holdElection(ctx, next) : null;
  if (held) offerDeals(ctx, held);
  const coins = settleCoins(ctx);

  draft.step = next;
  draft.year = yearOfStep(model, next);
  const closedYear = yearOfStep(model, s);
  let yearLines: ReportLine[] | undefined;
  if (years > 0) {
    if (!light) yearLines = reportLines(model, draft, stepOfYear(model, closedYear), s, model.game.year_lines_max);
    draft.history.push(makeFrame(model, draft, next));
    foldLedger(draft, closedYear);
  }
  const ended = next >= model.game.steps;
  let chapter: ChapterRecord | null = null;
  let term: TermReport | undefined;
  if (held || ended) {
    const toYear = yearOfStep(model, next);
    const t = termOf(model, toYear);
    chapter = nameChapter(ctx, t.term, t.fromYear, toYear);
    draft.story.chapters.push(chapter);
    if (held) {
      const lines = light ? [] : reportLines(model, draft, stepOfYear(model, t.fromYear), s, model.game.term_report_lines_max);
      term = { term: t.term, fromYear: t.fromYear, toYear, lines, election: electionView(model, draft), chapter };
    }
  }
  if (ended) draft.forecast = [];
  else forecastNext(makeCtx(model, draft, next));
  draft.phase = phaseOf(model, draft);

  const facts: StepFacts = {
    step: s, finished, events: landed.records, election: held, closedYears: years > 0 ? [closedYear] : [],
    opened: openedSince(model, was, draft), tipped: tippedSince(was, draft), chapter,
  };
  noteStep(ctx, facts);
  return {
    step: s, year: yearOfStep(model, s), season: seasonOf(model, s), finished, flows: mergeFlows(ctx.flows), events: landed.records,
    coins, stops: stopsOf(model, was, draft, facts), ...(yearLines ? { yearLines } : {}), ...(term ? { term } : {}), ended,
  };
}

/** Steps in a whole year, at least 1: what a bot or a test means by "a year passes". */
export const stepsPerYear = (model: BoardModel): number => Math.max(1, stepsOf(model, 1));
