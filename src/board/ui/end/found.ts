/**
 * Endings this browser has found, for "Endings found: 3 of 12", and the letters it has read, so a
 * second game with the same ending shows a different letter. Per-viewer conveniences kept
 * under the board's own key prefix (`game.save_key` + "endings"), set singly, never cleared
 * wholesale. Storage may be blocked or empty: every read and write is guarded.
 */
import type { BoardModel, EndingId } from "../../engine/api";

const keyOf = (model: BoardModel): string => `${model.game.save_key}endings`;

/** Endings found so far, as ids the model still knows. */
export function foundEndings(model: BoardModel): EndingId[] {
  try {
    const raw = localStorage.getItem(keyOf(model));
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && model.endings.some((e) => e.id === x)) : [];
  } catch {
    return [];
  }
}

/** Note an ending as found, and return the list with it. */
export function noteEnding(model: BoardModel, id: EndingId): EndingId[] {
  const list = foundEndings(model);
  if (!list.includes(id)) list.push(id);
  try { localStorage.setItem(keyOf(model), JSON.stringify(list)); } catch { /* storage blocked: the count shows this game only */ }
  return list;
}

/** Letters read on this device: which letter each game showed, oldest first. */
interface LetterRead { game: string; letter: string }
const lettersKey = (model: BoardModel): string => `${model.game.save_key}letters`;
/** Enough to remember every letter the model has, a few times over. */
const LETTERS_KEPT = 120;

function lettersRead(model: BoardModel): LetterRead[] {
  try {
    const raw = localStorage.getItem(lettersKey(model));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? list.filter((x): x is LetterRead => !!x && typeof x === "object" && typeof (x as LetterRead).game === "string" && typeof (x as LetterRead).letter === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Which letter to show: the one this game showed before; else the first of `choices` (in the
 * game's own order) this device has not read; else the game's own first. Pure, for tests.
 */
export function pickLetter(choices: string[], read: readonly LetterRead[], game: string): string | undefined {
  const before = read.find((r) => r.game === game && choices.includes(r.letter));
  if (before) return before.letter;
  const seen = new Set(read.map((r) => r.letter));
  return choices.find((c) => !seen.has(c)) ?? choices[0];
}

/** Pick the letter for a game (see `pickLetter`) and remember it, so a second game reads a new voice. */
export function letterForGame(model: BoardModel, choices: string[], game: string): string | undefined {
  const read = lettersRead(model);
  const pick = pickLetter(choices, read, game);
  if (pick && !read.some((r) => r.game === game)) {
    const next = [...read, { game, letter: pick }].slice(-LETTERS_KEPT);
    try { localStorage.setItem(lettersKey(model), JSON.stringify(next)); } catch { /* storage blocked: this game's own letter */ }
  }
  return pick;
}
