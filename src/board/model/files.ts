/**
 * The model/board file layout and a check for each file, for scripts/build-board-model.ts
 * (package 1) and for content authors (package 4). Every list file is a map with one list key;
 * `game.yaml` and each `places/<id>.yaml` are a single object. `note` and `generated` are allowed
 * at the top of any list file. Each board's own files sit in model/board/boards/<id>/
 * (`BOARD_FOLDER_FILES`, ADR 0009).
 */
import { check, obj, arr, rec, str, type Issue, type Shape } from "./shape";
import { shapes, text } from "./shapes";

const list = (key: string, item: Shape): Shape => obj({ [key]: arr(item) }, { note: str, generated: str });

/** Path under model/board (or model/data for the commute file) to its shape. */
export const BOARD_FILES: Record<string, Shape> = {
  "game.yaml": shapes.gameFile,
  "measures.yaml": list("measures", shapes.measure),
  "bands.yaml": obj({ bands: rec(shapes.band) }, { note: str, generated: str }),
  /** Authored river links. Rail links are derived at build; stubs belong to each board. */
  "links.yaml": list("links", shapes.link),
  "rules/spread.yaml": list("rules", shapes.rule),
  "rules/budget.yaml": list("rules", shapes.rule),
  "rules/people.yaml": list("rules", shapes.rule),
  /** Phase 2 growth cards R1 to R4 (package 8). Optional until written. */
  "rules/growth.yaml": list("rules", shapes.rule),
  "projects.yaml": list("projects", shapes.project),
  /** `gate_notes`: the note on each tier gate's rule card, by tier, written as data (fix round 2). */
  "tree.yaml": obj({ branches: arr(shapes.branch) }, { note: str, generated: str, gate_notes: rec(text) }),
  "pairs.yaml": list("pairs", shapes.pair),
  "laws.yaml": list("laws", shapes.law),
  "groups.yaml": list("groups", shapes.group),
  "events.yaml": list("events", shapes.event),
  "futures.yaml": list("futures", shapes.future),
  /** Starts every board offers. Optional: each board adds its own in its folder. */
  "starts.yaml": list("starts", shapes.start),
  "endings.yaml": list("endings", shapes.ending),
  "letters.yaml": list("letters", shapes.letter),
  /** Chapters (16.5.1, package 10). Optional until written: then every term is "Holding on". */
  "story.yaml": list("chapters", shapes.chapter),
  /** model/data/board-commute.json, written by pipeline/board/commute.py. */
  "data/board-commute.json": list("links", shapes.link),
};

/** The sections whose text fields a board's words.yaml may rename. */
export const WORD_SECTIONS = ["branches", "projects", "events", "starts", "endings", "letters", "chapters", "places"] as const;

/** Text a board renames, by section, id and field: `endings: { drift: { name: { en, cy } } }`. */
const words = rec(rec(text));

/**
 * The files of one board, under model/board/boards/<id>/. Only board.yaml is required. A list
 * file adds to the shared list of the same section, and an entry with a shared entry's id takes
 * its place: regional content overrides shared content, never copies it.
 */
export const BOARD_FOLDER_FILES: Record<string, Shape> = {
  "board.yaml": shapes.board,
  /** The board's first branch and its projects, drawn before the shared branches (v3-wales.md section 3). */
  "branch.yaml": obj({ branch: shapes.branch, projects: arr(shapes.project) }, { note: str }),
  "starts.yaml": list("starts", shapes.start),
  "events.yaml": list("events", shapes.event),
  "words.yaml": obj({}, { note: str, ...Object.fromEntries(WORD_SECTIONS.map((k) => [k, words])) }),
};

/** Any file under model/board/places/. */
export const PLACE_FILE: Shape = shapes.place;

/** "boards/<id>/<file>" to "<file>", or undefined for a shared file. */
const boardFileOf = (name: string): string | undefined => (name.startsWith("boards/") ? name.split("/").slice(2).join("/") : undefined);

/** Check one parsed file. `name` is a key of BOARD_FILES, "places/<id>.yaml" or "boards/<id>/<file>". */
export function checkBoardFile(name: string, parsed: unknown): Issue[] {
  const own = boardFileOf(name);
  const shape = own !== undefined ? BOARD_FOLDER_FILES[own] : name.startsWith("places/") ? PLACE_FILE : BOARD_FILES[name];
  if (!shape) return [{ path: name, message: "not a known board model file" }];
  return check(shape, parsed, name);
}
