/**
 * Package 4 (content and words) checks the files it owns in model/board against package 0's
 * shape and cross-reference checks, then checks the content promises of docs/design/v2-board.md
 * sections 5.3, 7.1, 5.4 and 9: four branches to four keystones, about 24 events (8 outside,
 * 16 grown, 5 good), 8 endings with letters for both weaker scores, three places, every Welsh
 * string flagged for review, the same slots in both languages, and every cited source real.
 *
 * Files owned by other packages (rules, groups, futures, councils, links) come from the fixture,
 * so these checks do not wait on them.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { boardFixture, gateRules } from "../engine/fixture";
import type { BoardModel, CouncilDef, Text } from "../engine/types";
import { checkBoardFile, crossCheck } from "../model";

const root = join(__dirname, "..", "..", "..");
const boardDir = join(root, "model", "board");
const read = (rel: string): unknown => yaml.load(readFileSync(join(boardDir, rel), "utf8"));

const OWNED = ["projects.yaml", "tree.yaml", "pairs.yaml", "laws.yaml", "events.yaml", "starts.yaml", "endings.yaml", "letters.yaml"] as const;
const placeFiles = readdirSync(join(boardDir, "places")).filter((f) => f.endsWith(".yaml")).map((f) => `places/${f}`);

const parsed = Object.fromEntries([...OWNED, ...placeFiles].map((f) => [f, read(f)])) as Record<string, Record<string, unknown>>;
const list = <T>(file: string, key: string) => parsed[file]![key] as T[];

/** The fixture with every package 4 section swapped for the real content. */
function contentModel(): BoardModel {
  const m = boardFixture();
  m.branches = list("tree.yaml", "branches");
  m.rules = [...m.rules.filter((r) => !r.id.startsWith("need:")), ...gateRules(m.branches)];
  m.projects = list("projects.yaml", "projects");
  m.pairs = list("pairs.yaml", "pairs");
  m.laws = list("laws.yaml", "laws");
  m.events = list("events.yaml", "events");
  m.starts = list("starts.yaml", "starts");
  m.endings = list("endings.yaml", "endings");
  m.letters = list("letters.yaml", "letters");
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
function texts(node: unknown, path = ""): { path: string; t: Text }[] {
  if (Array.isArray(node)) return node.flatMap((x, i) => texts(x, `${path}[${i}]`));
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.en === "string" && typeof o.cy === "string") return [{ path, t: o as unknown as Text }];
    return Object.entries(o).flatMap(([k, v]) => texts(v, path ? `${path}.${k}` : k));
  }
  return [];
}
const slots = (s: string) => [...s.matchAll(/\{([a-z_]+)\}/g)].map((x) => x[1]).sort();

describe("board content (package 4)", () => {
  it("every owned file passes package 0's shape check", () => {
    for (const [file, value] of Object.entries(parsed)) expect(checkBoardFile(file, value), file).toEqual([]);
  });

  it("the content passes the cross-reference checks on the fixture", () => {
    expect(crossCheck(contentModel())).toEqual([]);
  });

  it("has four branches, each with tier 1 and tier 2 projects and one keystone", () => {
    const m = contentModel();
    expect(m.branches.map((b) => b.id)).toEqual(["valleys", "made_here", "landscape", "homes"]);
    for (const b of m.branches) {
      const ps = m.projects.filter((p) => p.branch === b.id);
      expect(ps.filter((p) => p.tier === 1).length, b.id).toBeGreaterThanOrEqual(2);
      expect(ps.filter((p) => p.tier === 2).length, b.id).toBeGreaterThanOrEqual(1);
      expect(ps.filter((p) => p.keystone).length, b.id).toBe(1);
    }
    expect(m.projects.filter((p) => p.keystone).map((p) => p.id).sort()).toEqual(["cluster-roots", "heat-and-homes", "rivers-room", "work-up-the-line"]);
  });

  it("has 24 events: 8 from outside, 16 grown from the board, 5 of them good news", () => {
    const e = contentModel().events;
    expect(e.length).toBe(24);
    expect(e.filter((x) => x.origin === "outside").length).toBe(8);
    expect(e.filter((x) => x.origin === "grown").length).toBe(16);
    expect(e.filter((x) => x.good).length).toBe(5);
    for (const t of ["weather", "economy", "prices"] as const) expect(e.some((x) => x.track === t), t).toBe(true);
    for (const x of e) expect(x.responses.length, x.id).toBeGreaterThanOrEqual(2);
  });

  it("every outside event is halved where one of its two preparing projects stands", () => {
    for (const e of contentModel().events.filter((x) => x.origin === "outside")) {
      for (const p of e.prepared_by) {
        const cut = e.size.find((s) => s.when.some((c) => c.kind === "project" && c.project === p));
        expect(cut?.factor, `${e.id} ${p}`).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("has 8 endings with three evidence lines, one fallback, and letters for both weaker scores", () => {
    const m = contentModel();
    expect(m.endings.length).toBe(8);
    expect(m.endings.filter((e) => e.when.length === 0).map((e) => e.id)).toEqual(["drift"]);
    expect(new Set(m.endings.map((e) => e.priority)).size).toBe(8);
    for (const e of m.endings) {
      expect(e.evidence.length, e.id).toBe(3);
      for (const lower of ["life", "left"] as const) expect(m.letters.some((l) => l.ending === e.id && l.lower === lower), `${e.id} ${lower}`).toBe(true);
    }
    for (const l of m.letters) expect(l.signoff.en, l.id).toMatch(/\(a made-up voice\)$/);
  });

  it("has three starts with tier 1 free projects, and three places in the region", () => {
    const m = contentModel();
    expect(m.starts.length).toBe(3);
    expect(m.places.map((p) => p.id).sort()).toEqual(["ebbw-vale", "gwent-levels", "rhondda"]);
    for (const p of m.places) for (const id of p.offered_by.projects ?? []) expect(m.projects.find((x) => x.id === id)?.visit, `${p.id} ${id}`).toBe(p.id);
  });

  it("every text has English and Welsh, Welsh flagged for review, and the same slots in both", () => {
    for (const [file, value] of Object.entries(parsed)) {
      for (const { path, t } of texts(value)) {
        const at = `${file} ${path}`;
        expect(t.en.trim().length, at).toBeGreaterThan(0);
        expect(t.cy.trim().length, at).toBeGreaterThan(0);
        expect(t.cy_review, at).toBe(true);
        expect(slots(t.cy), at).toEqual(slots(t.en));
      }
    }
  });

  it("board.json has the same keys and slots in English and Welsh", () => {
    const load = (lang: string) => JSON.parse(readFileSync(join(root, "model", "i18n", lang, "board.json"), "utf8")) as Record<string, unknown>;
    const en = load("en");
    const cy = load("cy");
    const keys = (d: Record<string, unknown>) => Object.keys(d).filter((k) => !k.startsWith("_")).sort();
    expect(keys(cy)).toEqual(keys(en));
    expect(cy._cy_review).toBe(true);
    for (const k of keys(en)) expect(slots(String(cy[k])), k).toEqual(slots(String(en[k])));
  });

  it("every source the content cites is in model/sources.yaml or model/sources-extra.yaml", () => {
    const ids = new Set<string>();
    const main = yaml.load(readFileSync(join(root, "model", "sources.yaml"), "utf8")) as { sources: { id: string }[] };
    const extra = yaml.load(readFileSync(join(root, "model", "sources-extra.yaml"), "utf8")) as { sources: { id: string }[] };
    for (const s of [...main.sources, ...extra.sources]) ids.add(s.id);
    const m = contentModel();
    const cited = [...m.projects, ...m.events, ...m.places].flatMap((x) => x.sources.map((s) => `${x.id}: ${s}`));
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.filter((c) => !ids.has(c.split(": ")[1]!))).toEqual([]);
  });
});
