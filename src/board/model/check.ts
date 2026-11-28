/**
 * Check a whole compiled board model: the shape of every section, then the cross-references.
 * Used by scripts/build-board-model.ts before it writes public/board-model.json, by the loader,
 * and by tests on the fixture.
 */
import type { BoardModel } from "../engine/types";
import { crossCheck } from "./cross";
import { arr, check, obj, rec, type Issue, type Shape } from "./shape";
import { shapes } from "./shapes";

/** The shape of public/board-model.json, section by section. */
export const boardModelShape: Shape = obj({
  meta: shapes.meta,
  game: shapes.game,
  sources: arr(shapes.source),
  indicators: arr(shapes.indicator),
  measures: arr(shapes.measure),
  bands: rec(shapes.band),
  councils: arr(shapes.council, { min: 1 }),
  stubs: arr(shapes.stub),
  links: arr(shapes.link),
  rules: arr(shapes.rule),
  branches: arr(shapes.branch),
  projects: arr(shapes.project),
  pairs: arr(shapes.pair),
  laws: arr(shapes.law),
  groups: arr(shapes.group),
  events: arr(shapes.event),
  futures: arr(shapes.future, { min: 1 }),
  starts: arr(shapes.start, { min: 1 }),
  endings: arr(shapes.ending, { min: 1 }),
  letters: arr(shapes.letter),
  places: arr(shapes.place),
  chapters: arr(shapes.chapter),
});

/** Every issue in a parsed model. Empty means it is fit to play. Cross checks run only on a sound shape. */
export function checkBoardModel(model: unknown): Issue[] {
  const issues = check(boardModelShape, model);
  if (issues.length > 0) return issues;
  return crossCheck(model as BoardModel);
}

/** One line per issue, for build logs. */
export function formatIssues(issues: Issue[]): string {
  return issues.map((i) => `${i.path || "(root)"}: ${i.message}`).join("\n");
}
