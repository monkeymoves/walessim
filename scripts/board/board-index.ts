/** public/boards.json: the boards the build wrote, in picker order, the first the default (ADR 0009). */
import type { BoardIndex } from "../../src/board/model/load";
import { boardModelUrl } from "../../src/board/model/load";
import type { BoardModel } from "../../src/board/engine/types";

export function boardIndex(models: BoardModel[]): BoardIndex {
  return {
    boards: models.map((m) => ({
      id: m.game.board, name: m.game.region, councils: [...m.game.councils], file: boardModelUrl(m.game.board), hash: m.meta.hash,
    })),
  };
}
