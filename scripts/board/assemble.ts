/**
 * Assemble public/board-model.json from the files under model/ (docs/design/v2-board.md 11.3).
 * Pure: everything comes in through `BoardInputs` (scripts/board/read-inputs.ts reads the disk),
 * so the honesty test can build the same model without writing a file.
 *
 * This package (data and links) owns the real data: councils, indicators, measures, bands and all
 * three kinds of link. Content owned by other packages (rules, projects, tree, pairs, laws,
 * groups, events, futures, starts, endings, letters, places, game) is read from model/board when
 * the file exists. A missing file is filled from the three council fixture, named in
 * `meta.to_check`, so the build works while the other packages are still writing. If a mix of
 * real and fixture content does not join up, the whole content set falls back to the fixture
 * (unless `strict`), again named in `meta.to_check`.
 */
import { checkBoardFile, checkBoardModel, formatIssues, type Issue } from "../../src/board/model";
import { boardFixture, gateRules } from "../../src/board/engine/fixture";
import { REQUIRED_RULE_IDS, type BoardGame, type ChapterDef, type BoardModel, type BoardRule, type CouncilDef, type CouncilFlag, type IndicatorDef, type LinkDef, type PlaceDef, type StubDef, type Text } from "../../src/board/engine/types";
import { arr, bool, check, nullable, obj, str } from "../../src/board/model/shape";
import { text } from "../../src/board/model/shapes";
import { borders, centreOf, outlines, type Geo, type Outline } from "./geo";
import { fallbackCommuteLinks } from "./fallback-commute";
import { contentHash, cyReviewPaths } from "./meta";
import { deriveRailLinks, type RailData } from "./rail-links";
import { pickSources, sourceIdsUsed } from "./sources";

type Raw = Record<string, unknown>;

export interface BoardInputs {
  /** Parsed model/board files by name ("measures.yaml", "rules/spread.yaml"). Absent means not written yet. */
  files: Record<string, unknown>;
  /** Parsed model/board/places/<id>.yaml by id. */
  places: Record<string, unknown>;
  /** Parsed model/data/board-commute.json, if present. */
  commute?: unknown;
  laIndicators: { generated: string; indicators: Record<string, { year: string; values: Record<string, number> }> };
  /** model/indicators.yaml (v1), for each indicator's source. */
  v1Indicators: { id: string; source: string }[];
  /** model/sources.yaml and model/sources-extra.yaml, concatenated. */
  sources: Raw[];
  authorities: { code: string; name: { en: string; cy: string }; flags: string[]; towns: { en: string; cy: string }[] }[];
  geo: Geo;
  rail: RailData;
  /** The v1 place boards by id (`model.places` of the compiled v1 model), for T1 and T2 places. */
  v1Places?: Record<string, unknown>;
  /** Use the fallback commuting links even if the Census file is there (section 4.2). */
  forceFallback?: boolean;
  /** Fail instead of filling a gap or a mismatch from the fixture. */
  strict?: boolean;
}

export interface BoardBuild {
  model: BoardModel;
  warnings: string[];
  commute: "census" | "fallback";
}

export class BoardBuildError extends Error {
  constructor(message: string, readonly issues: Issue[] = []) {
    super(issues.length > 0 ? `${message}\n${formatIssues(issues.slice(0, 40))}` : message);
    this.name = "BoardBuildError";
  }
}

const FLAGS: readonly string[] = ["coal_valley", "valley", "city", "coast", "port", "rural", "heartland", "slate", "off_gas"];
/** The ten South East councils, in display order (section 11), used when game.yaml is not written yet. */
export const SOUTH_EAST = ["W06000013", "W06000014", "W06000015", "W06000016", "W06000018", "W06000019", "W06000020", "W06000021", "W06000022", "W06000024"];
/** Indicators that feed people, groups and risk steps rather than a measure (section 4.1). */
const EXTRA_INDICATORS = ["pop", "young_adults", "age65", "income_deprivation", "enterprises_10k"];
const OGL = /open government licen[cs]e/i;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const indicatorsFile = obj({ indicators: arr(obj({ id: str, name: text, unit: text, higher_is_better: nullable(bool) })) }, { note: str, generated: str });

/** Files this package owns: a problem in one of these always stops the build. */
const OWN_FILES = new Set(["measures.yaml", "bands.yaml", "links.yaml", "indicators.yaml"]);

/**
 * Shape check every file. A problem in one of our own files stops the build. A problem in a content
 * file written by another package stops it only when `strict`; otherwise the file is left out
 * (so its section comes from the fixture) and the problem is a warning.
 */
function checkFiles(inp: BoardInputs): { inputs: BoardInputs; warnings: string[] } {
  const own: Issue[] = [], other = new Map<string, Issue[]>();
  const run = (name: string, issues: Issue[]) => {
    if (issues.length === 0) return;
    if (OWN_FILES.has(name) || name === "data/board-commute.json") own.push(...issues);
    else other.set(name, issues);
  };
  for (const [name, parsed] of Object.entries(inp.files)) run(name, name === "indicators.yaml" ? check(indicatorsFile, parsed, name) : checkBoardFile(name, parsed));
  for (const [id, parsed] of Object.entries(inp.places)) run(`places/${id}.yaml`, checkBoardFile(`places/${id}.yaml`, parsed));
  if (inp.commute !== undefined) run("data/board-commute.json", checkBoardFile("data/board-commute.json", inp.commute));
  if (own.length > 0) throw new BoardBuildError("model/board files have problems:", own);
  if (other.size > 0 && inp.strict) throw new BoardBuildError("model/board files have problems:", [...other.values()].flat());
  for (const need of OWN_FILES) if (!inp.files[need]) throw new BoardBuildError(`model/board/${need} is missing`);
  const files = Object.fromEntries(Object.entries(inp.files).filter(([n]) => !other.has(n)));
  const places = Object.fromEntries(Object.entries(inp.places).filter(([id]) => !other.has(`places/${id}.yaml`)));
  const warnings = [...other].map(([name, issues]) => `model/board/${name} is left out (does not pass its shape check):\n${formatIssues(issues.slice(0, 4))}`);
  return { inputs: { ...inp, files, places }, warnings };
}

const list = <T>(file: unknown, key: string): T[] | undefined => (file ? ((file as Raw)[key] as T[]) : undefined);

function defaultGame(councils: string[]): BoardGame {
  const g = boardFixture().game;
  return { ...g, councils, region: { en: "South East Wales", cy: "De-ddwyrain Cymru", cy_review: true } };
}

interface Data {
  indicators: IndicatorDef[];
  councils: CouncilDef[];
  stubs: StubDef[];
  links: LinkDef[];
  commute: "census" | "fallback";
  warnings: string[];
  toCheck: string[];
}

function buildData(inp: BoardInputs, game: BoardGame): Data {
  const warnings: string[] = [], toCheck: string[] = [];
  const f = inp.files;
  const v1src = new Map(inp.v1Indicators.map((i) => [i.id, i.source]));
  const indicators: IndicatorDef[] = list<{ id: string; name: IndicatorDef["name"]; unit: IndicatorDef["unit"]; higher_is_better: boolean | null }>(f["indicators.yaml"], "indicators")!.map((i) => {
    const col = inp.laIndicators.indicators[i.id];
    if (!col) throw new BoardBuildError(`indicator ${i.id} is not a column of model/data/la-indicators.json`);
    const source = v1src.get(i.id);
    if (!source) throw new BoardBuildError(`indicator ${i.id} has no source in model/indicators.yaml`);
    return { id: i.id, name: i.name, unit: i.unit, year: col.year, source, higher_is_better: i.higher_is_better };
  });
  const measures = list<{ indicators: string[] }>(f["measures.yaml"], "measures")!;
  const wanted = new Set([...EXTRA_INDICATORS, ...measures.flatMap((m) => m.indicators)]);
  for (const id of wanted) if (!indicators.some((i) => i.id === id)) throw new BoardBuildError(`indicator ${id} is needed but not in model/board/indicators.yaml`);

  const os: Outline[] = outlines(inp.geo);
  const auth = new Map(inp.authorities.map((a) => [a.code, a]));
  const base = game.councils.map((code) => {
    const a = auth.get(code), o = os.find((x) => x.code === code);
    if (!a || !o) throw new BoardBuildError(`council ${code} is not in model/authorities.yaml and public/data/wales-geo.json`);
    return { code, a, o, slug: slug(a.name.en), centre: centreOf(inp.geo, o, [a.name.en, a.towns[0]?.en ?? ""]) };
  });

  // Rail links (derived), river links and stubs (authored), commuting links (Census or fallback).
  const rail = deriveRailLinks({ data: inp.rail, outlines: os, councils: base.map((b) => ({ code: b.code, slug: b.slug, centre: b.centre })) });
  const rivers = list<LinkDef>(f["links.yaml"], "links")!;
  const stubs = list<StubDef>(f["links.yaml"], "stubs")!;
  if (rivers.some((l) => l.to_check)) toCheck.push(`links: ${rivers.filter((l) => l.to_check).length} river rows still to check against OS Open Rivers and NRW catchment maps`);

  const licence = inp.sources.find((s) => s.id === "nomis_census_odwp01ew")?.licence;
  const usable = !inp.forceFallback && inp.commute !== undefined && typeof licence === "string" && OGL.test(licence);
  let commute: LinkDef[], mode: Data["commute"];
  if (usable) {
    commute = (inp.commute as { links: LinkDef[] }).links;
    mode = "census";
    toCheck.push("commute: Census 2021 was taken in the pandemic and ONS advises caution on travel to work figures");
  } else {
    const jobs = (code: string) => inp.laIndicators.indicators.jobs_density!.values[code]!;
    commute = fallbackCommuteLinks({
      councils: base.map((b) => ({ code: b.code, slug: b.slug, jobsDensity: jobs(b.code) })),
      rail: rail.links.map((l) => [l.from, l.to]),
      borders: base.flatMap((x, i) => base.slice(i + 1).filter((y) => borders(x.o, y.o)).map((y) => [x.code, y.code] as [string, string])),
    });
    mode = "fallback";
    warnings.push(inp.forceFallback ? "commuting links: fallback forced" : "commuting links: Census file missing or licence not confirmed open, using the labelled fallback");
    toCheck.push("commute: fallback links are a game estimate from rail, borders and jobs density, not Census counts");
  }
  const links = [...commute.filter((l) => game.councils.includes(l.from) && (game.councils.includes(l.to) || l.to.startsWith("stub:"))), ...rail.links, ...rivers];

  const inRiver = new Set(rivers.flatMap((l) => [l.from, l.to]));
  const councils: CouncilDef[] = base.map(({ code, a, centre }) => {
    const flags = a.flags.filter((x) => FLAGS.includes(x)) as CouncilFlag[];
    const features: CouncilDef["features"] = [];
    if ((rail.stations[code] ?? 0) > 0) features.push("rail");
    if (inRiver.has(code)) features.push("river");
    if (flags.includes("coal_valley")) features.push("coal_tips");
    for (const x of ["coast", "city", "port", "valley"] as const) if (flags.includes(x)) features.push(x);
    const real: Record<string, number> = {};
    for (const id of wanted) {
      const v = inp.laIndicators.indicators[id]?.values[code];
      if (typeof v !== "number") throw new BoardBuildError(`no real value for ${id} in ${a.name.en} (${code})`);
      real[id] = v;
    }
    return { code, name: { ...a.name }, flags, features, towns: a.towns.map((t) => ({ ...t })), real, centre };
  });
  return { indicators, councils, stubs, links, commute: mode, warnings, toCheck };
}

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

function assembleOnce(inp: BoardInputs, data: Data, game: BoardGame, allFixture: boolean): BoardModel {
  const fixture = boardFixture();
  const toCheck = [...data.toCheck];
  const c = content(inp, fixture, () => allFixture, toCheck);
  // Tier gates become `requires` rule cards, unless the rules files already carry them.
  const branches = structuredClone(c.branches);
  const made = gateRules(branches, (inp.files["tree.yaml"] as { gate_notes?: Record<string, Text> } | undefined)?.gate_notes);
  const rules = [...c.rules, ...made.filter((r) => !c.rules.some((x) => x.id === r.id))];
  for (const b of branches) for (const t of b.tiers) if (t.rule && !rules.some((r) => r.id === t.rule)) t.rule = undefined;
  // T1 and T2 places carry the v1 board they grade against.
  const places = c.places.map((p): PlaceDef => {
    if (!p.v1_place) return p;
    const board = inp.v1Places?.[p.v1_place];
    return board ? { ...p, board: board as PlaceDef["board"] } : p;
  });
  const body: Omit<BoardModel, "meta" | "sources"> = {
    game, indicators: data.indicators, measures: list(inp.files["measures.yaml"], "measures")!,
    bands: (inp.files["bands.yaml"] as { bands: BoardModel["bands"] }).bands,
    councils: data.councils, stubs: data.stubs, links: data.links, ...c, rules, branches, places,
  };
  // A copied v1 place board names its sources by title, as v1 does, so it is left out of the id check.
  const cited = sourceIdsUsed({ ...body, places: places.map(({ board: _board, ...p }) => p) });
  const { sources, missing } = pickSources(cited, inp.sources);
  if (missing.length > 0) {
    // Only the placeholder fixture content may name a source that has no entry yet.
    if (!toCheck.some((t) => t.startsWith("content:"))) throw new BoardBuildError(`sources not found in model/sources.yaml or sources-extra.yaml: ${missing.join(", ")}`);
    toCheck.push(`content: fixture content names sources with no entry (${missing.join(", ")})`);
  }
  const rest = { ...body, sources } as Omit<BoardModel, "meta">;
  return {
    meta: { version: 2, generated: inp.laIndicators.generated, hash: contentHash(rest), cy_review: cyReviewPaths(rest), to_check: toCheck },
    ...rest,
  };
}

export function assembleBoardModel(given: BoardInputs): BoardBuild {
  const { inputs: inp, warnings: fileWarnings } = checkFiles(given);
  const game = (inp.files["game.yaml"] as BoardGame | undefined) ?? defaultGame(SOUTH_EAST);
  const data = buildData(inp, game);
  const warnings = [...fileWarnings, ...data.warnings];
  let model = assembleOnce(inp, data, game, false);
  let issues = checkBoardModel(model);
  if (issues.length > 0) {
    if (inp.strict) throw new BoardBuildError("the board model does not check:", issues);
    warnings.push(`real content does not join up yet, so all content comes from the fixture. First problems:\n${formatIssues(issues.slice(0, 8))}`);
    model = assembleOnce(inp, data, game, true);
    issues = checkBoardModel(model);
    if (issues.length > 0) throw new BoardBuildError("the board model does not check even with fixture content:", issues);
  }
  const filled = model.meta.to_check.filter((t) => t.startsWith("content:"));
  if (inp.strict && filled.length > 0) throw new BoardBuildError(`strict: content is not all written yet:\n${filled.join("\n")}`);
  return { model, warnings, commute: data.commute };
}
