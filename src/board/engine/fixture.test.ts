import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { MEASURE_IDS, OPTIONAL_RULE_IDS, REQUIRED_RULE_IDS, RULE_IDS } from "./types";
import { param } from "./rules";
import { BoardModelError } from "./errors";

describe("the three council fixture", () => {
  const m = boardFixture();

  it("is three real councils on the Taff, flagged as a fixture", () => {
    expect(m.meta.fixture).toBe(true);
    expect(m.game.councils).toEqual([FIXTURE_COUNCILS.merthyr, FIXTURE_COUNCILS.rct, FIXTURE_COUNCILS.cardiff]);
    const taff = m.links.filter((l) => l.kind === "river").map((l) => [l.from, l.to]);
    expect(taff).toEqual([[FIXTURE_COUNCILS.merthyr, FIXTURE_COUNCILS.rct], [FIXTURE_COUNCILS.rct, FIXTURE_COUNCILS.cardiff]]);
  });

  it("has every engine rule, every measure, all four branches to a keystone and all eight endings", () => {
    for (const id of REQUIRED_RULE_IDS) expect(m.rules.some((r) => r.id === id), id).toBe(true);
    // No phase 2 card yet: the fixture behaves as phase 1 did until packages 8 and 9 add them.
    for (const id of OPTIONAL_RULE_IDS) expect(m.rules.some((r) => r.id === id), id).toBe(false);
    expect(m.measures.map((x) => x.id)).toEqual([...MEASURE_IDS]);
    for (const b of m.branches) {
      const tiers = m.projects.filter((p) => p.branch === b.id).map((p) => p.tier);
      expect(new Set(tiers), b.id).toEqual(new Set([1, 2, 3]));
    }
    expect(m.endings).toHaveLength(8);
    expect(m.events.some((e) => e.origin === "outside") && m.events.some((e) => e.good)).toBe(true);
    expect(m.places.map((p) => p.template).sort()).toEqual(["T1", "T3"]);
  });

  it("turns tier gates into requires rule cards", () => {
    const valleys = m.branches.find((b) => b.id === "valleys")!;
    expect(valleys.tiers.map((t) => t.rule)).toEqual([undefined, "need:valleys:2", "need:valleys:3"]);
    expect(m.rules.find((r) => r.id === "need:valleys:3")?.requires?.needs[0]).toMatchObject({ kind: "project", tier: 2, at_least: 2 });
  });

  it("returns a fresh copy each call", () => {
    const a = boardFixture();
    a.projects[0]!.cost = 99;
    expect(boardFixture().projects[0]!.cost).not.toBe(99);
  });

  it("reads rule params by id and fails loudly on a missing one", () => {
    expect(param(m, RULE_IDS.coins, "base_per_year")).toBe(3);
    expect(param(m, RULE_IDS.election, "backs_at")).toBe(5);
    expect(() => param(m, "Z9", "x")).toThrow(BoardModelError);
    expect(() => param(m, "B1", "nope")).toThrow(BoardModelError);
  });

  it("is plain JSON", () => {
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });
});
