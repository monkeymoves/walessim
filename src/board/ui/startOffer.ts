/**
 * What the start screen offers (playtest 8, must fix 15: the game number at the start differed
 * from the end). Each button carries its own game number, and the number written beside a button
 * is the number that button plays. A saved game still running is offered as Carry on; a saved
 * game that has ended is offered quietly as "see how it ended", so the main button always starts
 * the new game whose number is shown. Numbers are written plainly, as the end screen writes them.
 */

export interface SavedGame { gameNumber: number | string; phase: "play" | "respond" | "ended"; step: number }

export interface StartOffer {
  /** A saved game still being played: Carry on, with its number. */
  resume: { gameNumber: string } | null;
  /** A saved game that has ended: a quiet link to its end. */
  seeEnd: { gameNumber: string } | null;
  /** The new game: its number, and whether it is the main button. */
  fresh: { gameNumber: string; main: boolean };
}

/** A game number as every screen writes it: plain digits, no thousands mark. */
export const gameNo = (n: number | string): string => String(n);

export function startOffer(saved: SavedGame | null, freshNumber: number): StartOffer {
  const running = saved && saved.phase !== "ended" ? saved : null;
  const ended = saved && saved.phase === "ended" ? saved : null;
  return {
    resume: running ? { gameNumber: gameNo(running.gameNumber) } : null,
    seeEnd: ended ? { gameNumber: gameNo(ended.gameNumber) } : null,
    fresh: { gameNumber: gameNo(freshNumber), main: !running },
  };
}
