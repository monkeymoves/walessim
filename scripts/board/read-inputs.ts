/**
 * Node only: read every input of the board build from disk. Kept apart from assemble.ts so the
 * tests can feed it small hand made inputs.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { BOARD_FILES, BOARD_FOLDER_FILES } from "../../src/board/model";
import type { BoardInputs } from "./assemble";
import type { BoardFolder } from "./board-content";

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

/** Every folder under model/board/boards/, with the files it holds, by board id. */
function readBoards(): Record<string, BoardFolder> {
  const dir = M("board/boards");
  const out: Record<string, BoardFolder> = {};
  if (!existsSync(dir)) return out;
  for (const id of readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory()).sort()) {
    const folder: BoardFolder = {};
    for (const name of Object.keys(BOARD_FOLDER_FILES)) {
      const v = opt(join(dir, id, name), readYaml);
      if (v !== undefined) folder[name] = v;
    }
    out[id] = folder;
  }
  return out;
}

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
    boards: readBoards(),
    commute: opt(M("data/board-commute.json"), readJson),
    laIndicators: readJson(M("data/la-indicators.json")) as BoardInputs["laIndicators"],
    v1Indicators: (readYaml(M("indicators.yaml")) as { indicators: BoardInputs["v1Indicators"] }).indicators,
    sources,
    authorities: (readYaml(M("authorities.yaml")) as { authorities: BoardInputs["authorities"] }).authorities,
    geo: readJson(join(ROOT, "public", "data", "wales-geo.json")) as BoardInputs["geo"],
    rail: readJson(M("data/wales-rail.json")) as BoardInputs["rail"],
  };
}
