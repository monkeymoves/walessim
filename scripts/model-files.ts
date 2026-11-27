/**
 * Node-only: read the model files from disk into `RawModelFiles`, compute the Rhondda tip facts
 * from the place data, and compile. Used by scripts/build-model.ts and by tests.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { compileModel, type CompileResult, type RawModelFiles } from "../src/model/compile";
import type { PlaceBoard, TipFacts } from "../src/model/schema";
import { analyseBelow, placeItems, preparePlace, tipId, type PlaceData, type PlaceItem } from "../src/engine/place-analysis";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const M = (p: string) => join(ROOT, "model", p);

function readYaml(path: string): unknown {
  try {
    return yaml.load(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${path}: YAML error: ${(e as Error).message}`);
  }
}
const optYaml = (p: string) => (existsSync(M(p)) ? readYaml(M(p)) : undefined);
const optJson = (p: string) => (existsSync(M(p)) ? JSON.parse(readFileSync(M(p), "utf8")) : undefined);

/** Read every model file. Missing optional files are undefined. */
export function readModelFiles(): RawModelFiles {
  const rules: Record<string, unknown> = {};
  for (const f of readdirSync(M("rules")).filter((f) => f.endsWith(".yaml")).sort()) rules[f] = readYaml(M(`rules/${f}`));
  const places: Record<string, unknown> = {};
  for (const f of readdirSync(M("places")).filter((f) => f.endsWith(".yaml")).sort()) places[f] = readYaml(M(`places/${f}`));
  return {
    sources: optYaml("sources.yaml"),
    sourcesExtra: optYaml("sources-extra.yaml"),
    indicators: optYaml("indicators.yaml"),
    bands: optYaml("bands.yaml"),
    regions: readYaml(M("regions.yaml")),
    authorities: readYaml(M("authorities.yaml")),
    strands: readYaml(M("strands.yaml")),
    rules,
    cards: readYaml(M("cards.yaml")),
    curveballs: readYaml(M("curveballs.yaml")),
    places,
    voices: optYaml("voices.yaml"),
    letters: optYaml("letters.yaml"),
    voiceSlots: optYaml("voice-slots.yaml"),
    engineText: { en: optJson("i18n/en/engine.json"), cy: optJson("i18n/cy/engine.json") },
    game: readYaml(M("game.yaml")),
    laIndicators: optJson("data/la-indicators.json"),
    fcm: optJson("data/sonarr-dpsir.json"),
    io: optJson("data/io-multipliers.json"),
  };
}

/**
 * Tip facts for a tips_triage board from model/data/places/<id>.json.
 * Risk step (open proxy, low confidence, rule in the board's `risk_rule`): a tip with a BGS landslide
 * record on it starts at step 2 if it stands high above many homes (drop and buildings thresholds) or has
 * a great many buildings below; every other tip starts at step 1.
 * The wet-decade trend raises every step by one while active (the engine does that), capped at 3.
 */
export function tipFactsFromDisk(board: PlaceBoard): TipFacts[] | null {
  const path = M(`data/places/${board.id}.json`);
  if (!existsSync(path)) return null;
  const place = JSON.parse(readFileSync(path, "utf8")) as PlaceData;
  const deprived = board.deprived_rank ?? 191;
  return placeItems(place).map((item) => {
    const b = analyseBelow(place, item.id, { distanceM: 1000, minDropM: 10 });
    const rawIndex = (place.tips ?? []).findIndex((t, i) => tipId(t, i) === item.id);
    const raw = rawIndex >= 0 ? place.tips![rawIndex] : undefined;
    const rr = board.risk_rule ?? { steep_drop_m: 200, steep_buildings: 125, many_buildings: 300 };
    const recorded = raw?.kind === "tip_landslide_record";
    const drop = item.baseM - lowestBelow(place, item);
    const risk = recorded && ((drop >= rr.steep_drop_m && b.buildings >= rr.steep_buildings) || b.buildings >= rr.many_buildings) ? 2 : 1;
    return {
      id: item.id,
      n: item.n,
      name: item.name,
      source: item.source,
      x: item.x,
      y: item.y,
      buildingsBelow: b.buildings,
      residentialHa: b.residentialHa,
      school: b.schools.length > 0,
      rail: b.rail.lines.length > 0 || b.rail.stations.length > 0,
      station: b.rail.stations.length > 0,
      bus: b.busRoutes.length > 0,
      floodZone: b.floodZone,
      deprived: b.wimdRank !== null && b.wimdRank <= deprived,
      wimdRank: b.wimdRank,
      wimdEdition: board.wimd?.edition,
      wimdAreas: board.wimd?.areas,
      risk: risk as 1 | 2,
    };
  });
}

/** Read and compile the model from disk. */
export function compileFromDisk(opts: { tips?: boolean } = {}): CompileResult {
  return compileModel(readModelFiles(), { tipFacts: opts.tips === false ? undefined : tipFactsFromDisk });
}

/** Lowest ground within 1 km of a tip (metres), from the place elevation grid. */
function lowestBelow(place: PlaceData, item: PlaceItem): number {
  const P = preparePlace(place);
  let low = item.baseM;
  for (let dy = -1; dy <= 1; dy += 0.1) for (let dx = -1; dx <= 1; dx += 0.1) if (dx * dx + dy * dy <= 1) low = Math.min(low, P.elevAt(item.x + dx, item.y + dy));
  return low;
}
