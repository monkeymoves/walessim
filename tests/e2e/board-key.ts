// The default board's save prefix, read from the built model (ADR 0009: game.yaml's prefix plus
// the board id, "etifeddiaeth.board.v2.southeast."). Specs set their prefs and guide under it, so
// they follow the board id without a copy of it. Keys are set and removed singly, never cleared:
// other apps share this origin.
import { readFileSync } from "fs";

const model = JSON.parse(readFileSync(new URL("../../public/board-model.json", import.meta.url), "utf8")) as { game: { save_key: string } };

/** The prefix of every key the default board saves. */
export const BOARD_KEY = model.game.save_key;
