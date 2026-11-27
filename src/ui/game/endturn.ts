// The end-of-turn sheet's words for saved coins (plain-wales 3.3; cold playtest 5, item 6).

/**
 * The line under "Save {n} for a crisis": what the coins are for. A crisis can use 2; if none comes, up
 * to `carry` carry over and the rest are lost. Turn 1 of a first game has its own line already.
 */
export function saveNoteKey(save: number, carry: number, first: boolean, last: boolean): string | null {
  if (save <= 0 || first) return null;
  if (last) return "play.endturn.save_note_last";
  return save > carry ? "play.endturn.save_note_some" : "play.endturn.save_note";
}
