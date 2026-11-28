/**
 * The result at the top of the end screen (playtest 8, must-fix 1 and should-fix 13), as pure
 * functions of the model, the game and its ending: how you did against 2026 and against doing
 * nothing, your promise and whether you kept it, the place furthest behind in 2026 and in 2050,
 * how the elections and deals went, and, for a hard game, the turns you could have taken.
 *
 * No words are written here: the screen says these with model/i18n/{en,cy}/boardend.json.
 * Everything comes from the board as played: the promise from the start, elections and deals from
 * the state, a turn not taken from an event's own `prepared_by` projects or the election's own
 * count. Nothing is simulated.
 */
import * as api from "../../engine/api";
import type { BoardModel, BoardState, CouncilCode, ElectionResult, Ending, Frame, MeasureId, Text } from "../../engine/api";
import { meanOf } from "./view";
import { ruleParamOf } from "../rules";

export type Against = "ahead" | "behind" | "level";
/** Ahead or behind by `little` points or more (rule G1 `band_little`, the same line the result band draws), else level. */
const against = (d: number, little: number): Against => (d >= little ? "ahead" : d <= -little ? "behind" : "level");

/** The points that count as "a little" better or worse (rule G1 `band_little`), from the model. */
export const littleOf = (model: BoardModel): number => ruleParamOf(model, "G1", "band_little", 1.5);

export interface Verdict {
  /** The 2026 board and the Wales you leave, out of 100. */
  start: number;
  left: number;
  /** Against 2026. */
  vsStart: Against;
  /** The same game number played on autopilot ("doing nothing"). */
  autopilot: number;
  vsNothing: Against;
  /** How the years felt (Life in your years). */
  life: number;
}

/**
 * Both comparisons in one: against 2026 follows the result band, so the words never disagree with
 * the verdict line; against doing nothing uses the same "a little" line.
 */
export function verdictOf(ending: Ending, little: number): Verdict {
  const s = ending.scores;
  const vsStart: Against = s.band.endsWith("better") ? "ahead" : s.band.endsWith("worse") ? "behind" : "level";
  return { start: s.start, left: s.result, vsStart, autopilot: ending.autopilot.result, vsNothing: against(s.result - ending.autopilot.result, little), life: s.life };
}

/**
 * The gap the words give ("about {d} points better"), from the figures the screen shows, which are
 * rounded to a tenth as the top strip rounds Left for 2050 in play (playtest 9, should-fix 3:
 * "about 12 points" beside "About 13 points"; the join after fix round 1: "45 → 52" beside "about 6
 * points better"). A gap the verdict calls better or worse is never said as 0.0.
 */
export function shownGap(from: number, to: number, against: Against): number {
  const d = Math.abs(Math.round(to * 10) - Math.round(from * 10)) / 10;
  return against === "level" ? d : Math.max(0.1, d);
}

export interface PromiseRecord { text: Text; byYear: number; kept: boolean | null }

/** The promise of the start you chose, and whether it was kept. */
export function promiseOf(model: BoardModel, state: BoardState): PromiseRecord | null {
  const start = model.starts.find((s) => s.id === state.start);
  if (!start) return null;
  return { text: start.promise.text, byYear: state.promise.byYear, kept: state.promise.kept };
}

/** The council furthest behind on a board (all six measures together), and its score out of 10. */
export function lowestIn(model: BoardModel, frame: Frame): { code: CouncilCode; score: number } | null {
  const rows = model.game.councils.filter((c) => frame.councils[c]).map((code) => ({ code, score: meanOf(frame.councils[code]!) }));
  rows.sort((a, b) => a.score - b.score || a.code.localeCompare(b.code));
  return rows[0] ?? null;
}

/** The year a step is shown as on every board screen ("Spring 2035"): the engine's one rule, time.ts `shownYear`. */
export const shownYearOf = (model: BoardModel, step: number): number => api.shownYear(model, step);

/** The shares of people an election needs (rule P4): more than `win` wins, `strong` or more wins well. */
export function electionShares(model: BoardModel): { win: number; strong: number } {
  const p = model.rules.find((r) => r.id === "P4")?.params;
  return { win: p?.["win_share"]?.default ?? 0.5, strong: p?.["strong_share"]?.default ?? 0.667 };
}

/** The rule's lines in whole people in 100, as the record says them: more than `win`; `strong` or more. */
export function sharesShown(model: BoardModel): { win: number; strong: number } {
  const { win, strong } = electionShares(model);
  return { win: Math.floor(win * 100 + 1e-9), strong: Math.ceil(strong * 100 - 1e-9) };
}

/**
 * A share of people as a whole number in 100 that never reads against its result (playtest 10,
 * should-fix 6): a win shows more than the win line, a good win at least the good win line, a plain
 * win below it, and a loss no more than the win line. Rounding alone could show "won with 50" or
 * "won with 67" where 67 wins well.
 */
export function shareShown(model: BoardModel, share: number, result: ElectionResult): number {
  const { win, strong } = sharesShown(model);
  const r = Math.round(share * 100);
  if (result === "strong_win") return Math.max(r, strong);
  if (result === "win") return Math.min(Math.max(r, win + 1), strong - 1);
  return Math.min(r, win);
}

export interface ElectionLine { year: number; result: ElectionResult; backers: number; councils: number; peopleShare: number; share: number }

/** Every election held, in order, with its share of people as the record says it. */
export function electionsOf(model: BoardModel, state: BoardState): ElectionLine[] {
  return state.election.records.map((r) => ({
    year: r.year, result: r.result, backers: r.backers.length, councils: model.game.councils.length, peopleShare: r.peopleShare, share: shareShown(model, r.peopleShare, r.result),
  }));
}

/**
 * Where backing stands as the game ends (playtest 10, must-fix 6: "6 of 10 back you now" beside
 * "2046: you won, with 8 of 10" read as a contradiction): the councils that back you in 2050 and
 * the share of people they hold, counted as the top strip counts them. No election is held then.
 */
export function backingAtEnd(model: BoardModel, state: BoardState): { year: number; backers: number; councils: number; share: number } | null {
  try {
    const v = api.election(model, state);
    return { year: model.game.end_year, backers: v.backers, councils: v.councilCount, share: Math.round(v.peopleShare * 100) };
  } catch {
    return null;
  }
}

export interface DealLine { council: CouncilCode; measure: MeasureId; kept: boolean; year: number; made: number }

/**
 * Every deal judged, in the order judged, each with the year it was judged and the year it was made
 * (playtest 10, must-fix 1: "Rhondda Cynon Taf: broken." four times with no year). The year judged
 * is the deal's own moment in the story; a broken deal without one, the step it was judged broken.
 */
export function dealsOf(model: BoardModel, state: BoardState): DealLine[] {
  return state.deals.filter((d) => d.kept !== null).map((d) => {
    const how = d.kept ? "kept" : "broken";
    const m = state.story.moments.find((x) => x.kind === "deal" && x.ref === `${d.council}@${d.madeStep}:${how}`);
    const step = m?.step ?? d.brokenStep ?? d.dueStep;
    return { council: d.council, measure: d.measure, kept: !!d.kept, year: m?.year ?? shownYearOf(model, step), made: shownYearOf(model, d.madeStep), step };
  }).sort((a, b) => a.step - b.step).map(({ step: _s, ...line }) => line);
}

/** A hard game: worse than 2026, behind doing nothing, or an election lost. */
export function hardGame(state: BoardState, v: Verdict): boolean {
  return v.vsStart === "behind" || v.vsNothing === "behind" || state.election.records.some((r) => r.result === "lost");
}

export type Turn =
  /** An election lost, its people share, and the councils that would have carried it, biggest first. */
  | { kind: "election"; year: number; share: number; needed: CouncilCode[] }
  /** Trouble that landed unprepared, and a project that would have softened it there. */
  | { kind: "event"; year: number; event: string; council: CouncilCode; councils: CouncilCode[]; river?: Text; project: string }
  /** The promise, broken. */
  | { kind: "promise"; year: number; text: Text };

/**
 * The turns you could have taken, most telling first, at most `max`: the first election lost (and
 * which councils would have carried it, by their real 2026 share of people), the heaviest trouble
 * from outside that landed unprepared where one of its own `prepared_by` projects could have been
 * built, and a broken promise.
 */
export function turnsNotTaken(model: BoardModel, state: BoardState, shares: Record<CouncilCode, number>, winShare: number, max = 2): Turn[] {
  const out: Turn[] = [];
  const lost = state.election.records.find((r) => r.result === "lost");
  if (lost) {
    const others = model.game.councils.filter((c) => !lost.backers.includes(c)).sort((a, b) => (shares[b] ?? 0) - (shares[a] ?? 0) || a.localeCompare(b));
    const needed: CouncilCode[] = [];
    let share = lost.peopleShare;
    for (const c of others) {
      if (share > winShare) break;
      needed.push(c);
      share += shares[c] ?? 0;
    }
    out.push({ kind: "election", year: lost.year, share: lost.peopleShare, needed: share > winShare ? needed : [] });
  }
  const yearOf = (step: number) => shownYearOf(model, step);
  const unready = state.events
    .map((e) => ({ e, def: model.events.find((d) => d.id === e.event) }))
    .filter(({ e, def }) => !!def && !def.good && def.origin === "outside" && !e.prepared && def.prepared_by.length > 0 && e.councils.length > 0)
    .sort((a, b) => b.e.severity - a.e.severity || a.e.step - b.e.step)[0];
  if (unready) out.push({ kind: "event", year: yearOf(unready.e.step), event: unready.e.event, council: unready.e.councils[0]!, councils: unready.e.councils, river: api.eventRiver(model, unready.e), project: unready.def!.prepared_by[0]! });
  const p = promiseOf(model, state);
  if (p && p.kept === false) out.push({ kind: "promise", year: p.byYear, text: p.text });
  return out.slice(0, max);
}
