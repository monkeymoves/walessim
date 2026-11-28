/**
 * Endings this browser has found, for "Endings found: 3 of 12". A per-viewer convenience kept
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
