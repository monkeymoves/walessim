/**
 * Package 10 (content and words): reads the model/board files it owns, for the content tests:
 * the shared files and each board's own (model/board/boards/<id>/, ADR 0009).
 * `contentModel()` is the fixture with every content section swapped for the default board's real
 * content, so the checks do not wait on files owned by other packages (rules, groups, futures,
 * councils, links).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { foldBoard } from "../../../scripts/board/board-content";
import { otherBoardsProjects, withoutOtherBoards } from "../../../scripts/board/other-boards";
import { BOARD_FOLDER_FILES } from "../model";
import { boardFixture, gateRules } from "../engine/fixture";
import type { BoardModel, CouncilDef, Text } from "../engine/types";

export const root = join(__dirname, "..", "..", "..");
const boardDir = join(root, "model", "board");
const read = (rel: string): unknown => yaml.load(readFileSync(join(boardDir, rel), "utf8"));

export const OWNED = [
  "projects.yaml", "tree.yaml", "pairs.yaml", "laws.yaml", "events.yaml", "starts.yaml", "endings.yaml", "letters.yaml", "story.yaml",
].filter((f) => existsSync(join(boardDir, f)));
export const placeFiles = readdirSync(join(boardDir, "places")).filter((f) => f.endsWith(".yaml")).map((f) => `places/${f}`);
/** The boards game.yaml lists; the first is the default. */
export const boardIds = (read("game.yaml") as { boards: string[] }).boards;
/** Each board's content files, as "boards/<id>/<file>" (board.yaml is the data package's). */
export const boardFiles = boardIds.flatMap((id) => Object.keys(BOARD_FOLDER_FILES).filter((f) => f !== "board.yaml").map((f) => `boards/${id}/${f}`).filter((f) => existsSync(join(boardDir, f))));

export const parsed = Object.fromEntries([...OWNED, ...placeFiles, ...boardFiles].map((f) => [f, read(f)])) as Record<string, Record<string, unknown>>;

/** The shared content files with the default board's folder folded in, as the build does. */
const folded = (() => {
  const folderOf = (id: string) => {
    const prefix = `boards/${id}/`;
    return Object.fromEntries(boardFiles.filter((f) => f.startsWith(prefix)).map((f) => [f.slice(prefix.length), parsed[f]]));
  };
  const folders = Object.fromEntries(boardIds.map((id) => [id, folderOf(id)]));
  const own = foldBoard(Object.fromEntries(OWNED.map((f) => [f, parsed[f]])), folders[boardIds[0]!]!);
  return withoutOtherBoards(own, {}, otherBoardsProjects(folders, boardIds[0]!)).files as Record<string, Record<string, unknown>>;
})();
const list = <T>(file: string, key: string) => (folded[file]?.[key] ?? []) as T[];

/** The fixture with every package 10 section swapped for the default board's real content. */
export function contentModel(): BoardModel {
  const m = boardFixture();
  m.branches = list("tree.yaml", "branches");
  m.rules = [...m.rules.filter((r) => !r.id.startsWith("need:")), ...gateRules(m.branches, (parsed["tree.yaml"] as { gate_notes?: Record<string, Text> }).gate_notes)];
  m.projects = list("projects.yaml", "projects");
  m.pairs = list("pairs.yaml", "pairs");
  m.laws = list("laws.yaml", "laws");
  m.events = list("events.yaml", "events");
  m.starts = list("starts.yaml", "starts");
  m.endings = list("endings.yaml", "endings");
  m.letters = list("letters.yaml", "letters");
  m.chapters = list("story.yaml", "chapters");
  m.places = placeFiles.map((f) => parsed[f] as unknown as BoardModel["places"][number]);
  // Councils the places name that the three council fixture lacks: same shape, new code.
  const have = new Set(m.councils.map((c) => c.code));
  for (const p of m.places) {
    if (have.has(p.council)) continue;
    const c: CouncilDef = { ...structuredClone(m.councils[0]!), code: p.council };
    m.councils.push(c);
    have.add(p.council);
  }
  return m;
}

/** Every {en, cy} text in a parsed value, with its path. */
export function texts(node: unknown, path = ""): { path: string; t: Text }[] {
  if (Array.isArray(node)) return node.flatMap((x, i) => texts(x, `${path}[${i}]`));
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.en === "string" && typeof o.cy === "string") return [{ path, t: o as unknown as Text }];
    return Object.entries(o).flatMap(([k, v]) => texts(v, path ? `${path}.${k}` : k));
  }
  return [];
}

/** The `{slot}` names in a string, sorted. */
export const slots = (s: string): string[] => [...s.matchAll(/\{([a-z_]+)\}/g)].map((x) => x[1]!).sort();

/** model/i18n/<lang>/board.json. */
export const boardWords = (lang: "en" | "cy"): Record<string, unknown> =>
  JSON.parse(readFileSync(join(root, "model", "i18n", lang, "board.json"), "utf8")) as Record<string, unknown>;
