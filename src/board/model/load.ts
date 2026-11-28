/**
 * Browser loader for the compiled board models (public/board-model.<id>.json, written by
 * scripts/build-board-model.ts, ADR 0009). The only runtime code that knows where they live and
 * their format version (docs/design/v2-board.md section 12).
 */
import type { BoardId, BoardModel, Text } from "../engine/types";
import { checkBoardModel, formatIssues } from "./check";

/** The default board's model: the first board in game.yaml, which #/bwrdd opens. */
export const BOARD_MODEL_URL = "board-model.json";
/** The list of boards (`BoardIndex`), for the picker. */
export const BOARD_INDEX_URL = "boards.json";
/** One board's model. */
export const boardModelUrl = (board: BoardId): string => `board-model.${board}.json`;

/** public/boards.json: every board built, in picker order; the first is the default. */
export interface BoardIndex {
  boards: { id: BoardId; name: Text; councils: string[]; file: string; hash: string }[];
}

/** The board-model.json version this build understands. Matches `BoardModel.meta.version`. */
export const BOARD_MODEL_VERSION = 2;

export class BoardModelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoardModelLoadError";
  }
}

const withBase = (file: string): string => {
  const base = typeof import.meta !== "undefined" ? import.meta.env?.BASE_URL : undefined;
  return base ? base + file : file;
};

/** Check a parsed model's version and contents. Throws BoardModelLoadError listing the issues. */
export function acceptBoardModel(parsed: unknown): BoardModel {
  const version = (parsed as { meta?: { version?: unknown } } | null)?.meta?.version;
  if (version !== BOARD_MODEL_VERSION) throw new BoardModelLoadError(`Board model version ${String(version)}, expected ${BOARD_MODEL_VERSION}`);
  const issues = checkBoardModel(parsed);
  if (issues.length > 0) throw new BoardModelLoadError(`The board model has ${issues.length} problem(s):\n${formatIssues(issues.slice(0, 20))}`);
  return parsed as BoardModel;
}

/** Fetch, check and type a board's model: the default board without `board`. Pass `fetchImpl` in tests. */
export async function loadBoardModel(board?: BoardId, fetchImpl: typeof fetch = fetch): Promise<BoardModel> {
  const url = withBase(board === undefined ? BOARD_MODEL_URL : boardModelUrl(board));
  const res = await fetchImpl(url);
  if (!res.ok) throw new BoardModelLoadError(`Could not load the board model (${res.status}) from ${url}`);
  const model = acceptBoardModel(await res.json());
  if (board !== undefined && model.game.board !== board) throw new BoardModelLoadError(`${url} holds board ${model.game.board}, not ${board}`);
  return model;
}

/** Fetch the list of boards. Pass `fetchImpl` in tests. */
export async function loadBoardIndex(fetchImpl: typeof fetch = fetch): Promise<BoardIndex> {
  const url = withBase(BOARD_INDEX_URL);
  const res = await fetchImpl(url);
  if (!res.ok) throw new BoardModelLoadError(`Could not load the list of boards (${res.status}) from ${url}`);
  const parsed = (await res.json()) as BoardIndex;
  if (!Array.isArray(parsed?.boards) || parsed.boards.length === 0) throw new BoardModelLoadError(`${url} lists no boards`);
  return parsed;
}
