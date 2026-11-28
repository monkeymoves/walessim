/**
 * `npm run board:build`: validate everything under model/board and write public/board-model.json
 * (docs/design/v2-board.md sections 11.3 and 12). Fails (exit 1) on a shape or cross-reference
 * error. Without model files from the other packages it fills the gap from the three council
 * fixture and says so (see scripts/board/assemble.ts).
 *
 *   tsx scripts/build-board-model.ts [--strict] [--fallback-commute]
 *
 * --strict            fail if any content section is not written yet or does not join up
 * --fallback-commute  use the labelled fallback commuting links even if the Census file exists
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assembleBoardModel, BoardBuildError } from "./board/assemble";
import { readBoardInputs, ROOT } from "./board/read-inputs";
import { compileFromDisk } from "./model-files";

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
  const built = assembleBoardModel({ ...readBoardInputs(), v1Places: v1Places(), forceFallback, strict });
  for (const w of built.warnings) console.warn("warning:", w);
  const pub = join(ROOT, "public");
  mkdirSync(pub, { recursive: true });
  writeFileSync(join(pub, "board-model.json"), JSON.stringify(built.model));
  const m = built.model;
  const kinds = (k: string) => m.links.filter((l) => l.kind === k).length;
  console.log(
    `board-model.json written: ${m.councils.length} councils, ${m.links.length} links ` +
      `(${kinds("commute")} commute from ${built.commute === "census" ? "Census 2021" : "the fallback"}, ${kinds("rail")} rail, ${kinds("river")} river), ` +
      `${m.projects.length} projects, ${m.events.length} events, ${m.endings.length} endings, ${m.chapters.length} chapters; ` +
      `${m.game.steps} steps of ${m.game.years_per_step} years; hash ${m.meta.hash}; ` +
      `${m.meta.cy_review.length} Welsh entries awaiting review; ${m.meta.to_check.length} things to check`,
  );
} catch (e) {
  if (e instanceof BoardBuildError) {
    console.error(`board:build failed: ${e.message}`);
    process.exit(1);
  }
  throw e;
}
