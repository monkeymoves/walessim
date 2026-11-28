/**
 * The chapters the game writes (docs/design/v2-board.md 16.5.1), as package 10 writes them into
 * model/board/story.yaml: eighteen, each a short plain name and one line, one fallback, and only
 * the slots the engine fills.
 */
import { describe, expect, it } from "vitest";
import type { ChapterDef, TermCondition } from "../engine/types";
import { contentModel, slots } from "./load";

const chapters: ChapterDef[] = contentModel().chapters;
const SLOTS = new Set(["river", "council", "town", "project"]);
const has = (c: ChapterDef, kind: TermCondition["kind"]) => c.when.some((w) => w.kind === kind);

describe("chapters (package 10)", () => {
  it("has eighteen chapters with unique ids and priorities", () => {
    expect(chapters.length).toBe(18);
    expect(new Set(chapters.map((c) => c.id)).size).toBe(18);
    expect(new Set(chapters.map((c) => c.priority)).size).toBe(18);
  });

  it("has one fallback, Holding on, tried last", () => {
    const fallback = chapters.filter((c) => c.when.length === 0);
    expect(fallback.map((c) => c.name.en)).toEqual(["Holding on"]);
    expect(Math.max(...chapters.map((c) => c.priority))).toBe(fallback[0]!.priority);
  });

  it("names a term from each kind of thing that can happen in it", () => {
    for (const kind of ["event_landed", "election", "keystone", "tier_opened", "tipped", "region_turn", "young_adults", "gap", "finished", "deal", "promise"] as const) {
      expect(chapters.some((c) => has(c, kind)), kind).toBe(true);
    }
    const storms = chapters.filter((c) => c.when.some((w) => w.kind === "event_landed" && w.track === "weather"));
    expect(storms.map((c) => c.when[0]).map((w) => (w as { prepared?: boolean }).prepared).sort()).toEqual([false, true]);
  });

  it("gives a finished keystone its own name, and tries it before anything else", () => {
    const first = [...chapters].sort((a, b) => a.priority - b.priority)[0]!;
    expect(first.when).toEqual([{ kind: "keystone", phase: "finished" }]);
    expect(first.name.en).toBe("{project}");
  });

  it("uses only the slots the engine fills, the same in both languages", () => {
    for (const c of chapters) {
      for (const t of [c.name, c.line]) {
        for (const s of slots(t.en)) expect(SLOTS.has(s), `${c.id} {${s}}`).toBe(true);
        expect(slots(t.cy), c.id).toEqual(slots(t.en));
      }
    }
  });

  it("keeps names short and each line to one or two plain sentences", () => {
    for (const c of chapters) {
      expect(c.name.en.split(/\s+/).length, c.id).toBeLessThanOrEqual(6);
      expect(c.line.en.split(/(?<=[.!?])\s+/).length, c.id).toBeLessThanOrEqual(2);
      expect(c.line.en, c.id).toMatch(/[.!?]$/);
    }
  });
});
