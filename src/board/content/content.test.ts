/**
 * Package 10 (content and words) checks the files it owns in model/board against package 7's
 * shape and cross-reference checks, then the content promises of docs/design/v2-board.md
 * sections 5.3, 7.1, 9 and 16.5.3: four branches to four keystones, about 24 events (8 outside,
 * 16 grown, 5 good), twelve endings with letters for both weaker scores, three places, every Welsh
 * string flagged for review, the same slots in both languages, and every cited source real.
 * The phase 2 project rules are in projects.test.ts, the chapters in story.test.ts and the
 * engine's words in words.test.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { checkBoardFile, crossCheck } from "../model";
import { contentModel, parsed, root, slots, texts } from "./load";

describe("board content (package 10)", () => {
  it("every owned file passes the shape check", () => {
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
      expect(ps.filter((p) => p.tier === 2 && !p.legacy_of).length, b.id).toBeGreaterThanOrEqual(1);
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

  it("every outside event is halved where one of its preparing projects stands", () => {
    for (const e of contentModel().events.filter((x) => x.origin === "outside")) {
      for (const p of e.prepared_by) {
        const cut = e.size.find((s) => s.when.some((c) => c.kind === "project" && c.project === p));
        expect(cut?.factor, `${e.id} ${p}`).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("has twelve endings with three evidence lines, one fallback, and at least three letters each", () => {
    const m = contentModel();
    expect(m.endings.length).toBe(12);
    expect(m.endings.filter((e) => e.when.length === 0).map((e) => e.id)).toEqual(["patchwork"]);
    expect(new Set(m.endings.map((e) => e.priority)).size).toBe(12);
    for (const id of ["comeback", "long-game", "holding-line", "gamble"]) expect(m.endings.some((e) => e.id === id), id).toBe(true);
    expect(m.letters.length).toBeGreaterThanOrEqual(36);
    for (const e of m.endings) {
      expect(e.evidence.length, e.id).toBe(3);
      for (const lower of ["life", "left", "either"] as const) expect(m.letters.some((l) => l.ending === e.id && l.lower === lower), `${e.id} ${lower}`).toBe(true);
    }
    for (const l of m.letters) expect(l.signoff.en, l.id).toMatch(/\(a made-up voice\)$/);
  });

  it("keeps The drift for a game with fewer than six projects, and The gamble for the big employer", () => {
    const m = contentModel();
    expect(m.endings.find((e) => e.id === "drift")?.when).toEqual([{ kind: "projects", at_most: 5 }]);
    expect(m.endings.find((e) => e.id === "gamble")?.when).toContainEqual({ kind: "event_landed", event: "employer-leaves" });
    const fallback = m.endings.find((e) => e.when.length === 0)!;
    expect(Math.max(...m.endings.map((e) => e.priority))).toBe(fallback.priority);
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

  it("names no turn: time is in years and seasons now", () => {
    for (const [file, value] of Object.entries(parsed)) {
      for (const { path, t } of texts(value)) expect(t.en, `${file} ${path}`).not.toMatch(/\b(this|next|a|each|per) turn\b/i);
    }
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
