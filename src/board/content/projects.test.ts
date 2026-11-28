/**
 * The phase 2 project rules of docs/design/v2-board.md 16.2.4, 16.3.2, 16.3.5 and 16.4, as
 * package 10 writes them into model/board/projects.yaml. Every size is a game rule (tune); these
 * tests pin the shape the design asks for, not the balance.
 */
import { describe, expect, it } from "vitest";
import type { ProjectDef } from "../engine/types";
import { contentModel } from "./load";

const m = contentModel();
const byId = (id: string): ProjectDef => {
  const p = m.projects.find((x) => x.id === id);
  if (!p) throw new Error(`no project ${id}`);
  return p;
};

describe("projects on the clock (package 10)", () => {
  it("has one quick project in every branch: 2 coins, a year or less, no delay on its first effect", () => {
    const quick = m.projects.filter((p) => p.quick);
    expect(quick.map((p) => p.id).sort()).toEqual(["back-local-firms", "buses-meet-trains", "repairs-team", "slow-the-water"]);
    for (const b of m.branches) expect(quick.filter((p) => p.branch === b.id).length, b.id).toBe(1);
    for (const p of quick) {
      expect(p.tier, p.id).toBe(1);
      expect(p.cost, p.id).toBe(2);
      expect(p.build_years, p.id).toBeGreaterThanOrEqual(0.5);
      expect(p.build_years, p.id).toBeLessThanOrEqual(1);
      expect(p.effects.some((e) => !e.after_years), p.id).toBe(true);
    }
    expect(byId("buses-meet-trains").build_years).toBe(0.5);
  });

  it("builds in years: other tier 1 in two (the big employer at once), tier 2 in three, keystones in six", () => {
    for (const p of m.projects) {
      if (p.quick) continue;
      const want = p.keystone ? 6 : p.tier === 2 ? 3 : p.id === "big-employer" ? 0 : 2;
      expect(p.build_years, p.id).toBe(want);
    }
  });

  it("prices every keystone at 8 coins, and every one makes its branch count as joined", () => {
    for (const p of m.projects.filter((x) => x.keystone)) {
      expect(p.cost, p.id).toBe(8);
      expect(p.effects.some((e) => e.kind === "special" && e.special === "branch_joined"), p.id).toBe(true);
    }
  });

  it("gives each keystone one legacy project of its branch: 5 coins, three years, open only once it works", () => {
    const keystones = m.projects.filter((p) => p.keystone);
    for (const k of keystones) {
      const legacy = m.projects.filter((p) => p.legacy_of === k.id);
      expect(legacy.length, k.id).toBe(1);
      const l = legacy[0]!;
      expect(l.branch, l.id).toBe(k.branch);
      expect(l.keystone, l.id).toBe(false);
      expect(l.cost, l.id).toBe(5);
      expect(l.build_years, l.id).toBe(3);
      expect(l.needs, l.id).toContainEqual({ kind: "keystone", project: k.id });
    }
    expect(m.projects.filter((p) => p.legacy_of).map((p) => p.id).sort()).toEqual(["evening-trains", "farms-hold-water", "firms-train-own", "homes-pay-bills"]);
  });

  it("has the repairs team for cold, damp homes in branch 4, and it readies homes for trouble", () => {
    const r = byId("repairs-team");
    expect(r.branch).toBe("homes");
    expect(r.tags).toContain("warmth");
    const prepared = m.events.filter((e) => e.prepared_by.includes("repairs-team")).map((e) => e.id);
    expect(prepared.length).toBeGreaterThanOrEqual(1);
  });

  it("scales the phase 1 sizes: a keystone lifts far more than any tier 1 project", () => {
    const biggest = (p: ProjectDef) => Math.max(0, ...p.effects.map((e) => (e.kind === "measure" ? e.points : 0)));
    const tier1 = Math.max(...m.projects.filter((p) => p.tier === 1).map(biggest));
    for (const k of m.projects.filter((p) => p.keystone)) expect(biggest(k), k.id).toBeGreaterThanOrEqual(1.5);
    expect(tier1).toBeLessThanOrEqual(1);
  });

  it("gives every running cost as coins a year, smaller than a coin", () => {
    for (const p of m.projects.filter((x) => x.running)) {
      expect(p.running!.coins_per_year, p.id).toBeGreaterThan(0);
      expect(p.running!.coins_per_year, p.id).toBeLessThan(1);
    }
  });
});
