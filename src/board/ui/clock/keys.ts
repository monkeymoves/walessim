/**
 * The clock's keys (16.2.2): Space pauses and plays (in step by step mode it moves one season),
 * 1, 2 and 3 pick a speed, and full stop moves one step while paused.
 *
 * After cold playtest 9 (must fix 5): Space pauses whatever has focus, a button or a link too, so
 * the tip "Press Pause, or the Space bar" is always true. Only a text field (or another form field,
 * where Space types or ticks) keeps its own keys. On a card that waits for the player (a stop, an
 * event to answer, the term report, a place visit) a focused button keeps Space, so a keyboard
 * player can answer it; Space is then that button and nothing else. When Space works the clock,
 * the button under the focus is not pressed as well: the key's default is cancelled on the way
 * down and on the way up (browsers press a button when Space is let go). Enter is never the
 * clock's, so Enter presses the focused button once and only once.
 *
 * `keyMove` is the pure rule, tested in keys.test.ts; `clockKey` and `clockKeyUp` apply it.
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
  /** The focus is inside a card that waits for the player (stop, answer, term report, visit). */
  inCard: boolean;
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
  | { kind: "carryOn" }
  | { kind: "speed"; index: number };

const IGNORE: KeyMove = { kind: "ignore" };
const SWALLOW: KeyMove = { kind: "swallow" };

/** What a key does. "ignore" leaves the key to the page (its default runs); every other move cancels the default. */
export function keyMove(c: KeyCtx): KeyMove {
  if (c.mods || c.target === "field" || !c.onBoard) return IGNORE;
  if (c.key === " ") {
    // a card's own button answers it: Space is that button, once
    if (c.target === "control" && (c.inCard || c.visit)) return IGNORE;
    if (c.visit) return IGNORE;
    if (c.repeat) return SWALLOW;
    if (c.head) return c.head.hard ? SWALLOW : { kind: "carryOn" };
    return c.stepByStep ? { kind: "step" } : { kind: "toggle" };
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

const CARD = "[role=alertdialog], [aria-modal=true], [data-testid=bw-term]";

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
    inCard: !!el?.closest(CARD),
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
    case "carryOn": c.carryOn(); break;
    case "speed": c.setSpeed(game.model.game.speeds[move.index]!.id); break;
  }
}

/** The other half of Space: when the clock took it, the focused button must not be pressed on release. */
export function clockKeyUp(e: KeyboardEvent): void {
  if (e.key !== " " || !spaceTaken) return;
  spaceTaken = false;
  e.preventDefault();
}
