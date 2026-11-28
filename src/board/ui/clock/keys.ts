/**
 * The clock's keys (16.2.2): Space pauses and plays (in step by step mode it moves one season),
 * 1, 2 and 3 pick a speed, and full stop moves one step while paused. Keys typed into a field, or
 * pressed on a button or link (where Space and Enter belong to that control), are left alone.
 */
import type { Game } from "../game";

const OWN_KEYS = new Set(["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"]);

export function clockKey(game: Game, e: KeyboardEvent): void {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const el = e.target as HTMLElement | null;
  if (el && (OWN_KEYS.has(el.tagName) || el.isContentEditable)) return;
  if (game.screen() !== "board" || game.visit()) return;
  const c = game.clock;
  const speeds = game.model.game.speeds;
  if (e.key === " ") {
    e.preventDefault();
    // a stop on screen: Space reads as "Carry on" for a soft stop; a hard stop wants its own button
    const head = c.queue()[0];
    if (head) { if (!head.stop.hard) c.carryOn(); return; }
    if (c.prefs().stepByStep) c.step();
    else c.toggle();
  } else if (/^[1-9]$/.test(e.key) && speeds[+e.key - 1]) {
    c.setSpeed(speeds[+e.key - 1]!.id);
  } else if (e.key === "." && !c.playing() && !c.queue().length) {
    c.step();
  }
}
