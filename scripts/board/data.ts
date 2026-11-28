/**
 * The real data of one board's model (docs/design/v2-board.md 11.3): indicators, councils with
 * their 2026 values, flags and features, and all three kinds of link, cut to the board's councils
 * and stubs. Owned by the data package; scripts/board/assemble.ts adds the content.
 */
import { COUNCIL_FLAGS, type BoardGame, type CouncilDef, type CouncilFlag, type IndicatorDef, type LinkDef, type StubDef } from "../../src/board/engine/types";
import { BoardBuildError } from "./build-error";
import { fallbackCommuteLinks } from "./fallback-commute";
import { borders, centreOf, outlines, type Geo, type Outline } from "./geo";
import { deriveRailLinks, type RailData } from "./rail-links";

type Raw = Record<string, unknown>;

/** What the data half of the build reads (a part of `BoardInputs`). */
export interface DataInputs {
  files: Record<string, unknown>;
  commute?: unknown;
  laIndicators: { generated: string; indicators: Record<string, { year: string; values: Record<string, number> }> };
  v1Indicators: { id: string; source: string }[];
  sources: Raw[];
  authorities: { code: string; name: { en: string; cy: string }; flags: string[]; towns: { en: string; cy: string }[] }[];
  geo: Geo;
  rail: RailData;
  forceFallback?: boolean;
}

const FLAGS: readonly string[] = COUNCIL_FLAGS;
/** Indicators that feed people, groups and risk steps rather than a measure (section 4.1). */
const EXTRA_INDICATORS = ["pop", "young_adults", "age65", "income_deprivation", "enterprises_10k"];
const OGL = /open government licen[cs]e/i;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const list = <T>(file: unknown, key: string): T[] | undefined => (file ? ((file as Raw)[key] as T[]) : undefined);

export interface Data {
  indicators: IndicatorDef[];
  councils: CouncilDef[];
  stubs: StubDef[];
  links: LinkDef[];
  commute: "census" | "fallback";
  warnings: string[];
  toCheck: string[];
}

export function buildData(inp: DataInputs, game: BoardGame, stubs: StubDef[]): Data {
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

  // Rail links (derived), river links (authored, the rows this board holds), commuting links (Census or fallback).
  const rail = deriveRailLinks({ data: inp.rail, outlines: os, councils: base.map((b) => ({ code: b.code, slug: b.slug, centre: b.centre })) });
  const nodes = new Set([...game.councils, ...stubs.map((s) => s.id)]);
  const rivers = list<LinkDef>(f["links.yaml"], "links")!.filter((l) => nodes.has(l.from) && nodes.has(l.to));
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
  const links = [...commute.filter((l) => game.councils.includes(l.from) && nodes.has(l.to)), ...rail.links, ...rivers];

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
