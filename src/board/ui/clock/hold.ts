/**
 * What is open over the board, and why the clock is held (playtest 8, must fix 2). One pure
 * function says what the board screen draws (`overlays`), and the hold reads the same list, so
 * the clock can only be held by something the player can see and close. A sheet that is set but
 * not drawn (the build menu after its council was closed, a past term with no report) holds
 * nothing. hold.test.ts runs every combination and checks that no state leaves the clock stuck.
 */

export type SheetKind = null | "build" | "tree" | "laws" | "settings";

/** What the screen knows, as plain flags. */
export interface Screenful {
  /** The game's phase, or null before a game. */
  phase: "play" | "respond" | "ended" | null;
  /** An event waits for an answer (the engine sets this with phase "respond"). */
  answerWaiting: boolean;
  /** Stops waiting on screen. */
  queued: number;
  /** The page is hidden. */
  hidden: boolean;
  /** The player's "hold the clock while I read" setting. */
  holdWhileReading: boolean;
  sheet: SheetKind;
  /** A council is selected (the build menu is drawn only beside one). */
  selected: boolean;
  why: boolean;
  visit: boolean;
  warning: boolean;
  /** A past term was opened and its report exists. */
  term: boolean;
}

/** Things a player reads over the board. Each one has its own close button. */
export type Reading = "build" | "tree" | "laws" | "settings" | "why" | "visit" | "warning" | "term";
export type Overlay = "answer" | "stop" | Reading;

/** Everything drawn over the board now, in drawing order. */
export function overlays(s: Screenful): Overlay[] {
  const out: Overlay[] = [];
  const answer = s.phase === "respond" && s.answerWaiting;
  const stop = s.queued > 0;
  const busy = answer || stop;
  if (s.sheet === "build" && s.selected) out.push("build");
  if (s.warning && !busy) out.push("warning");
  if (s.sheet === "tree" || s.sheet === "laws" || s.sheet === "settings") out.push(s.sheet);
  if (s.term) out.push("term");
  if (answer) out.push("answer");
  else if (stop) out.push("stop");
  if (s.why) out.push("why");
  if (s.visit) out.push("visit");
  return out;
}

const READING_ORDER: Reading[] = ["visit", "why", "build", "tree", "laws", "settings", "warning", "term"];

export type HoldReason = "ended" | "answer" | "stop" | "hidden" | Reading;

/** Why the clock may not run now, or null when it may. Only something on screen (or 2050, or a hidden page) can hold it. */
export function holdOf(s: Screenful): HoldReason | null {
  if (s.phase === null || s.phase === "ended") return "ended";
  const shown = overlays(s);
  if (shown.includes("answer")) return "answer";
  if (shown.includes("stop")) return "stop";
  if (s.hidden) return "hidden";
  if (s.holdWhileReading) {
    const r = READING_ORDER.find((k) => shown.includes(k));
    if (r) return r;
  }
  return null;
}
