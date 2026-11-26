// Saved games. The engine serialises a game with saveGame(); the game screen (UI lead B)
// stores it under SAVE_KEY. The title screen only asks whether one exists.

/** The app's localStorage prefix (the same as the engine's SAVE_PREFIX; kept here so the shell
 * loads without the engine). */
export const STORAGE_PREFIX = "etifeddiaeth.v1.";

/** localStorage key for the one saved game in progress. */
export const SAVE_KEY = `${STORAGE_PREFIX}save`;

export function hasSavedGame(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}
