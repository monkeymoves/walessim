/**
 * Browser loader for the compiled board model (public/board-model.json, written by
 * scripts/build-board-model.ts). The only runtime code that knows where it lives and its format
 * version (docs/design/v2-board.md section 12).
 */
import type { BoardModel } from "../engine/types";
import { checkBoardModel, formatIssues } from "./check";

export const BOARD_MODEL_URL = "board-model.json";

/** The board-model.json version this build understands. Matches `BoardModel.meta.version`. */
export const BOARD_MODEL_VERSION = 2;

export class BoardModelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoardModelLoadError";
  }
}

const defaultUrl = (): string => {
  const base = typeof import.meta !== "undefined" ? import.meta.env?.BASE_URL : undefined;
  return base ? base + BOARD_MODEL_URL : BOARD_MODEL_URL;
};

/** Check a parsed model's version and contents. Throws BoardModelLoadError listing the issues. */
export function acceptBoardModel(parsed: unknown): BoardModel {
  const version = (parsed as { meta?: { version?: unknown } } | null)?.meta?.version;
  if (version !== BOARD_MODEL_VERSION) throw new BoardModelLoadError(`Board model version ${String(version)}, expected ${BOARD_MODEL_VERSION}`);
  const issues = checkBoardModel(parsed);
  if (issues.length > 0) throw new BoardModelLoadError(`The board model has ${issues.length} problem(s):\n${formatIssues(issues.slice(0, 20))}`);
  return parsed as BoardModel;
}

/** Fetch, check and type the board model. Pass `fetchImpl` in tests. */
export async function loadBoardModel(url: string = defaultUrl(), fetchImpl: typeof fetch = fetch): Promise<BoardModel> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new BoardModelLoadError(`Could not load the board model (${res.status}) from ${url}`);
  return acceptBoardModel(await res.json());
}
