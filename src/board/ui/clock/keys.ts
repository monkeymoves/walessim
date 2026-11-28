/**
 * The clock's keys (16.2.2): Space pauses and plays (in step by step mode it moves one season),
 * 1, 2 and 3 pick a speed, and full stop moves one step while paused.
 *
 * After cold playtest 10 (must fix 10): Space never answers a card. Space pauses or plays
 * whatever has focus, a card's own button too, so the tip "Press Pause, or the Space bar" is true
 * everywhere on the board. On a card, Space sets what time does after the card (the card says
 * which, ../StopCard.tsx). Only a text field (or another form field, where Space types or ticks)
 * and a place visit (which has its own keys) keep Space. When Space works the clock, the button
 * under the focus is not pressed as well: the key's default is cancelled on the way down and on
 * the way up (browsers press a button when Space is let go). Enter is never the clock's, so Enter
 * presses the focused button once and only once.
 *
 * Escape closes one thing at a time, the one on top (cold playtest 10, should fix 9: it closed
 * the panel and the guide together): `escapeTarget`.
 *
 * `keyMove` and `escapeTarget` are the pure rules, tested in keys.test.ts; `clockKey` and
 * `clockKeyUp` apply them.
 */
import type { Game } from "../game";

/** What has the focus: a field that types, a control (button, link, slider), or the page. */
export type KeyTarget = "field" | "control" | "page";

export interface KeyCtx {
  key: string;
  /** Alt, Ctrl or Meta held. */
  mods: boolean;
  /** The key is held down and repeating. */
  repeat: boolean;
  target: KeyTarget;
  /** The board screen is showing. */
  onBoard: boolean;
  /** A place visit is open (it has its own keys). */
  visit: boolean;
  /** The stop on screen, if any. */
  head: { hard: boolean } | null;
  stepByStep: boolean;
  playing: boolean;
  /** How many speeds there are. */
  speeds: number;
}

export type KeyMove =
  | { kind: "ignore" }
  | { kind: "swallow" }
  | { kind: "toggle" }
  | { kind: "step" }
  | { kind: "speed"; index: number };

const IGNORE: KeyMove = { kind: "ignore" };
const SWALLOW: KeyMove = { kind: "swallow" };

/** What a key does. "ignore" leaves the key to the page (its default runs); every other move cancels the default. */
export function keyMove(c: KeyCtx): KeyMove {
  if (c.mods || c.target === "field" || !c.onBoard) return IGNORE;
  if (c.key === " ") {
    // a place visit has its own keys
    if (c.visit) return IGNORE;
    if (c.repeat) return SWALLOW;
    // never a card's answer: on a card Space pauses or plays, which is what time does after it
    if (c.stepByStep) return c.head ? SWALLOW : { kind: "step" };
    return { kind: "toggle" };
  }
  if (c.visit) return IGNORE;
  if (/^[1-9]$/.test(c.key) && +c.key <= c.speeds) return { kind: "speed", index: +c.key - 1 };
  if (c.key === "." && !c.playing && !c.head) return { kind: "step" };
  return IGNORE;
}

/** Form fields where a key types, ticks or picks. A range slider is not one: Space means nothing there. */
function targetOf(el: HTMLElement | null): KeyTarget {
  if (!el) return "page";
  if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return "field";
  if (el.tagName === "INPUT") return (el as HTMLInputElement).type === "range" ? "control" : "field";
  if (el.closest("button, a[href], [role=button], [role=radio], [role=tab], summary")) return "control";
  return "page";
}

/** Space whose default was cancelled on the way down: cancel it on the way up too, so no button is pressed. */
let spaceTaken = false;

export function clockKey(game: Game, e: KeyboardEvent): void {
  const el = e.target instanceof HTMLElement ? e.target : null;
  const c = game.clock;
  const head = c.queue()[0];
  const move = keyMove({
    key: e.key,
    mods: e.altKey || e.ctrlKey || e.metaKey,
    repeat: e.repeat,
    target: targetOf(el),
    onBoard: game.screen() === "board",
    visit: !!game.visit(),
    head: head ? { hard: head.stop.hard } : null,
    stepByStep: c.prefs().stepByStep,
    playing: c.playing(),
    speeds: game.model.game.speeds.length,
  });
  if (move.kind === "ignore") return;
  e.preventDefault();
  if (e.key === " ") spaceTaken = true;
  switch (move.kind) {
    case "toggle": c.toggle(); break;
    case "step": c.step(); break;
    case "speed": c.setSpeed(game.model.game.speeds[move.index]!.id); break;
  }
}

/** The other half of Space: when the clock took it, the focused button must not be pressed on release. */
export function clockKeyUp(e: KeyboardEvent): void {
  if (e.key !== " " || !spaceTaken) return;
  spaceTaken = false;
  e.preventDefault();
}

/** What is open, for Escape: each flag is something drawn with its own close. */
export interface EscCtx {
  visit: boolean;
  why: boolean;
  warning: boolean;
  term: boolean;
  /** A sheet over the board: the tree, the laws or the clock settings. */
  sheet: boolean;
  build: boolean;
  council: boolean;
  /** A card waits on screen (a stop, an event to answer): Escape does not reach past it. */
  card: boolean;
}

export type EscTarget = "why" | "warning" | "term" | "sheet" | "build" | "council";

/**
 * The one thing Escape closes: the top one, as the board draws them (Why? over everything, then a
 * warning or a past term in the lane, a sheet, the build menu, last the council panel). A place
 * visit keeps Escape for itself, and nothing under a card is closed. Null when there is nothing to close.
 */
export function escapeTarget(c: EscCtx): EscTarget | null {
  if (c.visit) return null;
  const top = (["why", "warning", "term", "sheet"] as const).find((k) => c[k]);
  if (top) return top;
  // a card is answered with its own buttons; Escape does not close what lies under it
  if (c.card) return null;
  return (["build", "council"] as const).find((k) => c[k]) ?? null;
}
