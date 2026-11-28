/**
 * Node only: read every input of the board build from disk. Kept apart from assemble.ts so the
 * tests can feed it small hand made inputs.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { BOARD_FILES } from "../../src/board/model";
import type { BoardInputs } from "./assemble";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = (p: string) => join(ROOT, "model", p);

function readYaml(path: string): unknown {
  try {
    return yaml.load(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${path}: YAML error: ${(e as Error).message}`);
  }
}
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as unknown;
const opt = (path: string, read: (p: string) => unknown) => (existsSync(path) ? read(path) : undefined);

/** Every board input from disk. `v1Places` is added by the caller (it needs the v1 compile). */
export function readBoardInputs(): Omit<BoardInputs, "v1Places" | "forceFallback" | "strict"> {
  const files: Record<string, unknown> = {};
  for (const name of [...Object.keys(BOARD_FILES), "indicators.yaml"]) {
    if (name.startsWith("data/")) continue;
    const v = opt(M(`board/${name}`), readYaml);
    if (v !== undefined) files[name] = v;
  }
  const places: Record<string, unknown> = {};
  if (existsSync(M("board/places"))) {
    for (const f of readdirSync(M("board/places")).filter((f) => f.endsWith(".yaml")).sort()) places[f.replace(/\.yaml$/, "")] = readYaml(M(`board/places/${f}`));
  }
  const sources = [...((readYaml(M("sources.yaml")) as { sources: Record<string, unknown>[] }).sources), ...(((opt(M("sources-extra.yaml"), readYaml) as { sources?: Record<string, unknown>[] } | undefined)?.sources) ?? [])];
  return {
    files,
    places,
    commute: opt(M("data/board-commute.json"), readJson),
    laIndicators: readJson(M("data/la-indicators.json")) as BoardInputs["laIndicators"],
    v1Indicators: (readYaml(M("indicators.yaml")) as { indicators: BoardInputs["v1Indicators"] }).indicators,
    sources,
    authorities: (readYaml(M("authorities.yaml")) as { authorities: BoardInputs["authorities"] }).authorities,
    geo: readJson(join(ROOT, "public", "data", "wales-geo.json")) as BoardInputs["geo"],
    rail: readJson(M("data/wales-rail.json")) as BoardInputs["rail"],
  };
}
