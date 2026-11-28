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
import type { BoardModel, BoardState, CouncilCode, ElectionResult, Ending, Frame, Text } from "../../engine/api";
import { meanOf } from "./view";

export type Against = "ahead" | "behind" | "level";
/** Ahead or behind by `little` points or more (rule G1 `band_little`, the same line the result band draws), else level. */
const against = (d: number, little: number): Against => (d >= little ? "ahead" : d <= -little ? "behind" : "level");

/** The points that count as "a little" better or worse (rule G1 `band_little`), from the model. */
export const littleOf = (model: BoardModel): number => model.rules.find((r) => r.id === "G1")?.params["band_little"]?.default ?? 3;

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
 * The gap the words give ("about {d} points better"), from the whole numbers the screen shows, so
 * "45 → 52" never reads "about 6 points better" (join after fix round 1). A gap the verdict calls
 * better or worse is never said as 0.
 */
export function shownGap(from: number, to: number, against: Against): number {
  const d = Math.abs(Math.round(to) - Math.round(from));
  return against === "level" ? d : Math.max(1, d);
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

export interface ElectionLine { year: number; result: ElectionResult; backers: number; councils: number; peopleShare: number }

/** Every election held, in order. */
export function electionsOf(model: BoardModel, state: BoardState): ElectionLine[] {
  return state.election.records.map((r) => ({ year: r.year, result: r.result, backers: r.backers.length, councils: model.game.councils.length, peopleShare: r.peopleShare }));
}

/** Every deal judged, in order: its council and whether it was kept. */
export function dealsOf(state: BoardState): { council: CouncilCode; kept: boolean }[] {
  return state.deals.filter((d) => d.kept !== null).map((d) => ({ council: d.council, kept: !!d.kept }));
}

/** A hard game: worse than 2026, behind doing nothing, or an election lost. */
export function hardGame(state: BoardState, v: Verdict): boolean {
  return v.vsStart === "behind" || v.vsNothing === "behind" || state.election.records.some((r) => r.result === "lost");
}

export type Turn =
  /** An election lost, its people share, and the councils that would have carried it, biggest first. */
  | { kind: "election"; year: number; share: number; needed: CouncilCode[] }
  /** Trouble that landed unprepared, and a project that would have softened it there. */
  | { kind: "event"; year: number; event: string; council: CouncilCode; councils: CouncilCode[]; project: string }
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
  const yearOf = (step: number) => model.game.first_year + Math.floor(step * model.game.years_per_step);
  const unready = state.events
    .map((e) => ({ e, def: model.events.find((d) => d.id === e.event) }))
    .filter(({ e, def }) => !!def && !def.good && def.origin === "outside" && !e.prepared && def.prepared_by.length > 0 && e.councils.length > 0)
    .sort((a, b) => b.e.severity - a.e.severity || a.e.step - b.e.step)[0];
  if (unready) out.push({ kind: "event", year: yearOf(unready.e.step), event: unready.e.event, council: unready.e.councils[0]!, councils: unready.e.councils, project: unready.def!.prepared_by[0]! });
  const p = promiseOf(model, state);
  if (p && p.kept === false) out.push({ kind: "promise", year: p.byYear, text: p.text });
  return out.slice(0, max);
}
