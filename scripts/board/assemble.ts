/**
 * Assemble one board's compiled model (public/board-model.<id>.json) from the files under model/
 * (docs/design/v2-board.md 11.3, ADR 0009). Pure: everything comes in through `BoardInputs`
 * (scripts/board/read-inputs.ts reads the disk), so the honesty test can build the same model
 * without writing a file.
 *
 * The shared files in model/board hold what every board has; the board's folder
 * (model/board/boards/<id>/) is folded over them by board-content.ts. The real data (councils,
 * indicators, measures, bands and links) comes from data.ts. Content owned by other packages is
 * read from model/board when the file exists. A missing file is filled from the three council
 * fixture, named in `meta.to_check`, so the build works while the other packages are still
 * writing. If a mix of real and fixture content does not join up, the whole content set falls
 * back to the fixture (unless `strict`), again named in `meta.to_check`.
 */
import { checkBoardModel, formatIssues } from "../../src/board/model";
import { boardFixture, gateRules } from "../../src/board/engine/fixture";
import { REQUIRED_RULE_IDS, type BoardCalendar, type BoardFile, type BoardGame, type BoardId, type BoardModel, type BoardRule, type ChapterDef, type CouncilFlag, type PlaceDef, type Text } from "../../src/board/engine/types";
import { applyWords, boardGame, boardPlaces, BoardFolderError, foldBoard, withVisitsOn, type BoardFolder } from "./board-content";
import { BoardBuildError } from "./build-error";
import { checkFiles } from "./check-files";
import { buildData, type Data, type DataInputs } from "./data";
import { contentHash, cyReviewPaths } from "./meta";
import { otherBoardsProjects, withoutOtherBoards } from "./other-boards";
import { pickSources, sourceIdsUsed } from "./sources";

export { BoardBuildError } from "./build-error";

type Raw = Record<string, unknown>;

export interface BoardInputs extends DataInputs {
  /** Parsed model/board files by name ("measures.yaml", "rules/spread.yaml"). Absent means not written yet. */
  files: Record<string, unknown>;
  /** Parsed model/board/places/<id>.yaml by id. */
  places: Record<string, unknown>;
  /** Each board's parsed folder files, by board id then file name. */
  boards: Record<BoardId, BoardFolder>;
  /** The board to build. Default: the first in game.yaml `boards`. */
  board?: BoardId;
  /** The v1 place boards by id (`model.places` of the compiled v1 model), for T1 and T2 places. */
  v1Places?: Record<string, unknown>;
  /** Fail instead of filling a gap or a mismatch from the fixture. */
  strict?: boolean;
}

export interface BoardBuild {
  model: BoardModel;
  warnings: string[];
  commute: "census" | "fallback";
}

type Calendar = BoardCalendar & { boards: BoardId[] };

/** The boards game.yaml lists, in picker order; the first is the default. */
export function boardIds(inp: Pick<BoardInputs, "files">): BoardId[] {
  const cal = inp.files["game.yaml"] as Calendar | undefined;
  if (!cal) throw new BoardBuildError("model/board/game.yaml is missing");
  return cal.boards;
}

const list = <T>(file: unknown, key: string): T[] | undefined => (file ? ((file as Raw)[key] as T[]) : undefined);

/** Chapters from story.yaml (16.5.1). Until it is written there are none, every term is "Holding on", and the build says so. */
function chaptersOf(f: BoardInputs["files"], useFixtureFor: (section: string) => boolean, toCheck: string[]): ChapterDef[] {
  const real = list<ChapterDef>(f["story.yaml"], "chapters");
  if (real && !useFixtureFor("chapters")) return real;
  toCheck.push(`content: chapters (model/board/story.yaml ${real ? "does not join up yet" : "not written yet"})`);
  return [];
}

/** The content sections other packages own, from real files where they exist. */
function content(inp: BoardInputs, fixture: BoardModel, useFixtureFor: (section: string) => boolean, toCheck: string[]) {
  const f = inp.files;
  const pick = <T>(section: string, file: string, key: string, fix: T[]): T[] => {
    const real = list<T>(f[file], key);
    if (real && !useFixtureFor(section)) return real;
    toCheck.push(`content: ${section} from the three council fixture (model/board/${file} ${real ? "does not join up yet" : "not written yet"})`);
    return fix;
  };
  const realRules = ["rules/spread.yaml", "rules/budget.yaml", "rules/people.yaml", "rules/growth.yaml"].flatMap((n) => (useFixtureFor("rules") ? [] : list<BoardRule>(f[n], "rules") ?? []));
  const have = new Set(realRules.map((r) => r.id));
  const fromFixture: string[] = REQUIRED_RULE_IDS.filter((id) => !have.has(id));
  if (fromFixture.length > 0) toCheck.push(`content: rule cards ${fromFixture.join(", ")} from the fixture (model/board/rules not complete yet)`);
  const rules = [...realRules, ...fixture.rules.filter((r) => fromFixture.includes(r.id))];
  const placeFiles = Object.values(inp.places) as PlaceDef[];
  const places = placeFiles.length > 0 && !useFixtureFor("places") ? placeFiles : (toCheck.push("content: places from the fixture (model/board/places not written yet)"), fixture.places);
  return {
    rules,
    branches: pick("branches", "tree.yaml", "branches", fixture.branches),
    projects: pick("projects", "projects.yaml", "projects", fixture.projects),
    pairs: pick("pairs", "pairs.yaml", "pairs", fixture.pairs),
    laws: pick("laws", "laws.yaml", "laws", fixture.laws),
    groups: pick("groups", "groups.yaml", "groups", fixture.groups),
    events: pick("events", "events.yaml", "events", fixture.events),
    futures: pick("futures", "futures.yaml", "futures", fixture.futures),
    starts: pick("starts", "starts.yaml", "starts", fixture.starts),
    endings: pick("endings", "endings.yaml", "endings", fixture.endings),
    letters: pick("letters", "letters.yaml", "letters", fixture.letters),
    places,
    chapters: chaptersOf(f, useFixtureFor, toCheck),
  };
}

function assembleOnce(inp: BoardInputs, folder: BoardFolder, data: Data, game: BoardGame, allFixture: boolean): BoardModel {
  const fixture = boardFixture();
  const toCheck = [...data.toCheck];
  const c = content(inp, fixture, () => allFixture, toCheck);
  // Tier gates become `requires` rule cards, unless the rules files already carry them.
  const branches = structuredClone(c.branches);
  const made = gateRules(branches, (inp.files["tree.yaml"] as { gate_notes?: Record<string, Text> } | undefined)?.gate_notes);
  const rules = [...c.rules, ...made.filter((r) => !c.rules.some((x) => x.id === r.id))];
  for (const b of branches) for (const t of b.tiers) if (t.rule && !rules.some((r) => r.id === t.rule)) t.rule = undefined;
  // The places on this board; T1 and T2 places carry the v1 board they grade against.
  const places = boardPlaces(c.places, game.councils, c.projects, c.events.map((e) => e.id)).map((p): PlaceDef => {
    if (!p.v1_place) return p;
    const board = inp.v1Places?.[p.v1_place];
    return board ? { ...p, board: board as PlaceDef["board"] } : p;
  });
  const placeIds = new Set(places.map((p) => p.id));
  const body: Omit<BoardModel, "meta" | "sources"> = {
    game, indicators: data.indicators, measures: list(inp.files["measures.yaml"], "measures")!,
    bands: (inp.files["bands.yaml"] as { bands: BoardModel["bands"] }).bands,
    councils: data.councils, stubs: data.stubs, links: data.links, ...c, rules, branches, places,
    projects: withVisitsOn(c.projects, placeIds), events: withVisitsOn(c.events, placeIds),
  };
  let worded = body;
  try {
    if (allFixture) { if (folder["words.yaml"]) toCheck.push(`content: boards/${game.board}/words.yaml not used on fixture content`); }
    else worded = applyWords(body, folder["words.yaml"], game.board);
  } catch (e) {
    if (e instanceof BoardFolderError) throw new BoardBuildError(e.message);
    throw e;
  }
  // A copied v1 place board names its sources by title, as v1 does, so it is left out of the id check.
  const cited = sourceIdsUsed({ ...worded, places: worded.places.map(({ board: _board, ...p }) => p) });
  const { sources, missing } = pickSources(cited, inp.sources);
  if (missing.length > 0) {
    // Only the placeholder fixture content may name a source that has no entry yet.
    if (!toCheck.some((t) => t.startsWith("content:"))) throw new BoardBuildError(`sources not found in model/sources.yaml or sources-extra.yaml: ${missing.join(", ")}`);
    toCheck.push(`content: fixture content names sources with no entry (${missing.join(", ")})`);
  }
  const rest = { ...worded, sources } as Omit<BoardModel, "meta">;
  return {
    meta: { version: 2, generated: inp.laIndicators.generated, hash: contentHash(rest), cy_review: cyReviewPaths(rest), to_check: toCheck },
    ...rest,
  };
}

/** Build one board (`given.board`, or the default board). */
export function assembleBoardModel(given: BoardInputs): BoardBuild {
  const id = given.board ?? boardIds(given)[0]!;
  const raw = given.boards[id];
  if (!raw) throw new BoardBuildError(`no folder model/board/boards/${id}/ for board ${id}`);
  const checked = checkFiles({ files: given.files, places: given.places, folder: raw, commute: given.commute }, id, !!given.strict);
  const folder = checked.folder;
  const boardFile = folder["board.yaml"] as BoardFile;
  const flags = new Map(given.authorities.map((a) => [a.code, a.flags as CouncilFlag[]]));
  let game: BoardGame;
  try {
    game = boardGame(checked.files["game.yaml"] as Calendar, id, boardFile, (code) => flags.get(code) ?? []);
  } catch (e) {
    if (e instanceof BoardFolderError) throw new BoardBuildError(e.message);
    throw e;
  }
  // Lines of shared content that name another board's projects are left out (other-boards.ts).
  const own = withoutOtherBoards(foldBoard(checked.files, folder), checked.places, otherBoardsProjects(given.boards, id));
  const inp: BoardInputs = { ...given, ...own, commute: checked.commute };
  const data = buildData(inp, game, boardFile.stubs);
  const warnings = [...checked.warnings, ...data.warnings];
  let model = assembleOnce(inp, folder, data, game, false);
  let issues = checkBoardModel(model);
  if (issues.length > 0) {
    if (inp.strict) throw new BoardBuildError(`board ${id}: the model does not check:`, issues);
    warnings.push(`board ${id}: real content does not join up yet, so all content comes from the fixture. First problems:\n${formatIssues(issues.slice(0, 8))}`);
    model = assembleOnce(inp, folder, data, game, true);
    issues = checkBoardModel(model);
    if (issues.length > 0) throw new BoardBuildError(`board ${id}: the model does not check even with fixture content:`, issues);
  }
  const filled = model.meta.to_check.filter((t) => t.startsWith("content:"));
  if (inp.strict && filled.length > 0) throw new BoardBuildError(`strict: board ${id}: content is not all written yet:\n${filled.join("\n")}`);
  return { model, warnings, commute: data.commute };
}
