/**
 * The model/board file layout and a check for each file, for scripts/build-board-model.ts
 * (package 1) and for content authors (package 4). Every list file is a map with one list key;
 * `game.yaml` and each `places/<id>.yaml` are a single object. `note` and `generated` are allowed
 * at the top of any list file.
 */
import { check, obj, arr, rec, str, type Issue, type Shape } from "./shape";
import { shapes } from "./shapes";

const list = (key: string, item: Shape): Shape => obj({ [key]: arr(item) }, { note: str, generated: str });

/** Path under model/board (or model/data for the commute file) to its shape. */
export const BOARD_FILES: Record<string, Shape> = {
  "game.yaml": shapes.game,
  "measures.yaml": list("measures", shapes.measure),
  "bands.yaml": obj({ bands: rec(shapes.band) }, { note: str, generated: str }),
  /** Authored river links and the off-board stubs. Rail links are derived at build. */
  "links.yaml": obj({ links: arr(shapes.link), stubs: arr(shapes.stub) }, { note: str, generated: str }),
  "rules/spread.yaml": list("rules", shapes.rule),
  "rules/budget.yaml": list("rules", shapes.rule),
  "rules/people.yaml": list("rules", shapes.rule),
  /** Phase 2 growth cards R1 to R4 (package 8). Optional until written. */
  "rules/growth.yaml": list("rules", shapes.rule),
  "projects.yaml": list("projects", shapes.project),
  "tree.yaml": list("branches", shapes.branch),
  "pairs.yaml": list("pairs", shapes.pair),
  "laws.yaml": list("laws", shapes.law),
  "groups.yaml": list("groups", shapes.group),
  "events.yaml": list("events", shapes.event),
  "futures.yaml": list("futures", shapes.future),
  "starts.yaml": list("starts", shapes.start),
  "endings.yaml": list("endings", shapes.ending),
  "letters.yaml": list("letters", shapes.letter),
  /** Chapters (16.5.1, package 10). Optional until written: then every term is "Holding on". */
  "story.yaml": list("chapters", shapes.chapter),
  /** model/data/board-commute.json, written by pipeline/board/commute.py. */
  "data/board-commute.json": list("links", shapes.link),
};

/** Any file under model/board/places/. */
export const PLACE_FILE: Shape = shapes.place;

/** Check one parsed file. `name` is a key of BOARD_FILES or "places/<id>.yaml". */
export function checkBoardFile(name: string, parsed: unknown): Issue[] {
  const shape = name.startsWith("places/") ? PLACE_FILE : BOARD_FILES[name];
  if (!shape) return [{ path: name, message: "not a known board model file" }];
  return check(shape, parsed, name);
}
