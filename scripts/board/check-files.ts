/**
 * Shape check every input file of one board's build. A problem in a file the data package owns,
 * or in the board's board.yaml, always stops the build. A problem in a content file written by
 * another package stops it only when `strict`; otherwise the file is left out (so its section
 * comes from the fixture) and the problem is a warning.
 */
import { checkBoardFile, formatIssues, type Issue } from "../../src/board/model";
import { arr, bool, check, nullable, obj, str } from "../../src/board/model/shape";
import { text } from "../../src/board/model/shapes";
import { BoardBuildError } from "./build-error";

/** Files under model/board the build cannot do without. */
export const OWN_FILES = new Set(["measures.yaml", "bands.yaml", "links.yaml", "indicators.yaml", "game.yaml"]);

const indicatorsFile = obj({ indicators: arr(obj({ id: str, name: text, unit: text, higher_is_better: nullable(bool) })) }, { note: str, generated: str });

export interface FileSet {
  /** Shared files by name. */
  files: Record<string, unknown>;
  /** Shared places by id. */
  places: Record<string, unknown>;
  /** The board's own files by name. */
  folder: Record<string, unknown>;
  commute?: unknown;
}

export function checkFiles(inp: FileSet, board: string, strict: boolean): FileSet & { warnings: string[] } {
  const own: Issue[] = [], other = new Map<string, Issue[]>();
  const run = (name: string, issues: Issue[]) => {
    if (issues.length === 0) return;
    if (OWN_FILES.has(name) || name === "data/board-commute.json" || name === `boards/${board}/board.yaml`) own.push(...issues);
    else other.set(name, issues);
  };
  for (const [name, parsed] of Object.entries(inp.files)) run(name, name === "indicators.yaml" ? check(indicatorsFile, parsed, name) : checkBoardFile(name, parsed));
  for (const [id, parsed] of Object.entries(inp.places)) run(`places/${id}.yaml`, checkBoardFile(`places/${id}.yaml`, parsed));
  for (const [name, parsed] of Object.entries(inp.folder)) run(`boards/${board}/${name}`, checkBoardFile(`boards/${board}/${name}`, parsed));
  if (inp.commute !== undefined) run("data/board-commute.json", checkBoardFile("data/board-commute.json", inp.commute));
  if (own.length > 0) throw new BoardBuildError("model/board files have problems:", own);
  if (other.size > 0 && strict) throw new BoardBuildError("model/board files have problems:", [...other.values()].flat());
  for (const need of OWN_FILES) if (!inp.files[need]) throw new BoardBuildError(`model/board/${need} is missing`);
  if (!inp.folder["board.yaml"]) throw new BoardBuildError(`model/board/boards/${board}/board.yaml is missing`);
  const keep = <T>(rec: Record<string, T>, path: (k: string) => string) => Object.fromEntries(Object.entries(rec).filter(([k]) => !other.has(path(k))));
  const warnings = [...other].map(([name, issues]) => `model/board/${name} is left out (does not pass its shape check):\n${formatIssues(issues.slice(0, 4))}`);
  return {
    files: keep(inp.files, (n) => n),
    places: keep(inp.places, (id) => `places/${id}.yaml`),
    folder: keep(inp.folder, (n) => `boards/${board}/${n}`),
    commute: inp.commute,
    warnings,
  };
}
