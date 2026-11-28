/**
 * `npm run board:build`: validate everything under model/board and write one compiled model per
 * board (docs/design/v2-board.md sections 11.3 and 12, ADR 0009):
 *
 * - public/board-model.<id>.json for each board game.yaml lists;
 * - public/board-model.json, the default board (the first listed), which #/bwrdd and the rule book open;
 * - public/boards.json, the list of boards for the picker (id, name, councils, file).
 *
 * A board-model.<id>.json left from a board no longer listed is removed, so public/ holds only
 * the boards game.yaml names.
 *
 * Fails (exit 1) on a shape or cross-reference error. Without model files from the other packages
 * it fills the gap from the three council fixture and says so (see scripts/board/assemble.ts).
 *
 *   tsx scripts/build-board-model.ts [--strict] [--fallback-commute]
 *
 * --strict            fail if any content section of any board is not written yet or does not join up
 * --fallback-commute  use the labelled fallback commuting links even if the Census file exists
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assembleBoardModel, BoardBuildError, boardIds } from "./board/assemble";
import { boardIndex } from "./board/board-index";
import { readBoardInputs, ROOT } from "./board/read-inputs";
import { compileFromDisk } from "./model-files";
import { BOARD_INDEX_URL, BOARD_MODEL_URL, boardModelUrl } from "../src/board/model/load";
import type { BoardModel } from "../src/board/engine/types";

const strict = process.argv.includes("--strict");
const forceFallback = process.argv.includes("--fallback-commute");

/** The v1 place boards, for T1 and T2 places (the Rhondda today). Empty if v1 does not compile. */
function v1Places(): Record<string, unknown> {
  const r = compileFromDisk();
  if (!r.model) {
    console.warn("warning: the v1 model did not compile, so places carry no v1 board:", r.errors.slice(0, 3).join("; "));
    return {};
  }
  return Object.fromEntries(r.model.places.map((p) => [p.id, p]));
}

try {
  const inputs = { ...readBoardInputs(), v1Places: v1Places(), forceFallback, strict };
  const pub = join(ROOT, "public");
  mkdirSync(pub, { recursive: true });
  const models: BoardModel[] = [];
  for (const board of boardIds(inputs)) {
    const built = assembleBoardModel({ ...inputs, board });
    for (const w of built.warnings) console.warn(`warning (${board}):`, w);
    const m = built.model;
    const json = JSON.stringify(m);
    writeFileSync(join(pub, boardModelUrl(board)), json);
    if (models.length === 0) writeFileSync(join(pub, BOARD_MODEL_URL), json);
    models.push(m);
    const kinds = (k: string) => m.links.filter((l) => l.kind === k).length;
    console.log(
      `${boardModelUrl(board)}${models.length === 1 ? ` (and ${BOARD_MODEL_URL}, the default board)` : ""} written: ` +
        `${m.councils.length} councils, ${m.links.length} links ` +
        `(${kinds("commute")} commute from ${built.commute === "census" ? "Census 2021" : "the fallback"}, ${kinds("rail")} rail, ${kinds("river")} river), ` +
        `${m.projects.length} projects, ${m.events.length} events, ${m.endings.length} endings, ${m.chapters.length} chapters; ` +
        `${m.game.steps} steps of ${m.game.years_per_step} years; hash ${m.meta.hash}; ` +
        `${m.meta.cy_review.length} Welsh entries awaiting review; ${m.meta.to_check.length} things to check`,
    );
  }
  writeFileSync(join(pub, BOARD_INDEX_URL), JSON.stringify(boardIndex(models)));
  const built = new Set(models.map((m) => boardModelUrl(m.game.board)));
  for (const f of readdirSync(pub)) if (/^board-model\.[a-z0-9-]+\.json$/.test(f) && !built.has(f)) rmSync(join(pub, f));
} catch (e) {
  if (e instanceof BoardBuildError) {
    console.error(`board:build failed: ${e.message}`);
    process.exit(1);
  }
  throw e;
}
