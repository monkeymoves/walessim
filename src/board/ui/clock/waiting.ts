/**
 * What the game is waiting for (docs/design/v3-wales.md section 2, "The needs-you outline"). Luke
 * after playing: "i spent a while waiting and didnt realise what i had to click". Whenever the
 * clock is held for the player, exactly one thing on screen is the one to act on, and the board
 * draws a red outline round it (../NeedsYou.tsx). This is the rule that picks it, pure, so a test
 * can walk whole games through it (waiting.test.ts).
 *
 * | The game is held because                                    | The outline goes on      |
 * |-------------------------------------------------------------|--------------------------|
 * | An event, a deal or a visit offer needs an answer           | The group of choices     |
 * | A place visit is open                                       | The visit's choices      |
 * | A card is up (election, keystone, warning, chapter, ...)    | Its Carry on button      |
 * | A sheet or Why? is holding the clock                        | Its Close button         |
 * | The game has just opened, or paused and idle for 8 seconds  | Play (or Start time)     |
 * | Step by step mode                                           | Next season              |
 *
 * What sits on top wins, so the outline is never drawn round something covered: a visit covers
 * the board, and Why? or the clock settings sit over a card in the lane.
 */
import { holdOf, overlays, type Reading, type Screenful } from "./hold";

/** The player touches nothing for this long while paused, and Play is outlined. A screen rule, not a game rule. */
export const IDLE_MS = 8000;

export type NeedsTarget =
  /** The group of answers on the event card, the deals on the term report, or Go and visit or Carry on on a visit offer. */
  | { kind: "answers"; of: "event" | "deal" | "visit" }
  /** The choices of an open place visit (or its Done button once graded). */
  | { kind: "visit" }
  /** The card's Carry on button. */
  | { kind: "carryOn" }
  /** The Close button of a sheet, Why?, a warning or a past term report. */
  | { kind: "close"; what: Reading }
  /** Play, or Start time in a game not yet started. */
  | { kind: "play" }
  /** Next season, in step by step mode. */
  | { kind: "next" };

/** What the screen knows, as plain flags: the hold's own (./hold.ts) and the clock's. */
export interface WaitingSession extends Screenful {
  /** The card up is a term report with a deal still to pick (its Carry on waits for it). */
  dealWaiting: boolean;
  /** The card up offers a place visit: go, or carry on without it. */
  visitOffer: boolean;
  stepByStep: boolean;
  /** Time is set to run (it may still be held). */
  playing: boolean;
  /** Time has not run since the board opened. */
  justOpened: boolean;
  /** The player has touched nothing for `IDLE_MS`. */
  idle: boolean;
}

/** Drawn over a card in the lane, so closed before the card can be read. */
const OVER_CARDS = ["why", "settings"] as const satisfies readonly Reading[];

const READINGS: readonly string[] = ["build", "tree", "laws", "settings", "why", "visit", "warning", "term"];
const isReading = (x: string | null): x is Reading => x !== null && READINGS.includes(x);

/** True when the clock waits for the player now: a card, step by step, a hold while running, or a paused board left alone. */
export function heldForPlayer(s: WaitingSession): boolean {
  if (s.phase === null || s.hidden) return false;
  const shown = overlays(s);
  if (shown.includes("answer") || shown.includes("stop")) return true;
  if (s.phase !== "play") return false;
  if (s.stepByStep) return true;
  return s.playing ? holdOf(s) !== null : s.justOpened || s.idle;
}

/** The one thing to act on while the clock waits for the player, or null when it does not. */
export function waitingOn(s: WaitingSession): NeedsTarget | null {
  if (!heldForPlayer(s)) return null;
  const shown = overlays(s);
  if (shown.includes("visit")) return { kind: "visit" };
  const answer = shown.includes("answer");
  if (answer || shown.includes("stop")) {
    const over = OVER_CARDS.find((k) => shown.includes(k));
    if (over) return { kind: "close", what: over };
    if (answer) return { kind: "answers", of: "event" };
    if (s.dealWaiting) return { kind: "answers", of: "deal" };
    return s.visitOffer ? { kind: "answers", of: "visit" } : { kind: "carryOn" };
  }
  if (s.stepByStep) return { kind: "next" };
  if (s.playing) {
    const r = holdOf(s);
    return isReading(r) ? { kind: "close", what: r } : null;
  }
  return { kind: "play" };
}

/** A name for a target, to tell one from another (a new name restarts the pulse and the announcement). */
export const targetName = (t: NeedsTarget): string =>
  t.kind === "answers" ? `answers-${t.of}` : t.kind === "close" ? `close-${t.what}` : t.kind;
