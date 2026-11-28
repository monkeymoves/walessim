/**
 * The board model's format: load and check public/board-model.json, and check each model/board
 * file. The UI imports `loadBoardModel`; scripts/build-board-model.ts imports the checks.
 */
export { BOARD_MODEL_URL, BOARD_MODEL_VERSION, BoardModelLoadError, acceptBoardModel, loadBoardModel } from "./load";
export { boardModelShape, checkBoardModel, formatIssues } from "./check";
export { BOARD_FILES, PLACE_FILE, checkBoardFile } from "./files";
export { crossCheck } from "./cross";
export type { Issue } from "./shape";
