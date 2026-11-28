import { describe, expect, it } from "vitest";
import { groupBy, layoutSlips, type Slip } from "./markLayout";

const overlap = (a: number[], b: number[]) => a[0]! < b[2]! && b[0]! < a[2]! && a[1]! < b[3]! && b[1]! < a[3]!;

describe("map slips", () => {
  it("never print over each other, even five at one council", () => {
    const slips: Slip[] = [
      ...[0, 1, 2, 3, 4].map((i) => ({ key: `r${i}`, x: 300, y: 200, text: "Summer 2037", rank: 2 })),
      { key: "n1", x: 320, y: 180, text: "Working: Skills college", centre: true, rank: 1 },
      { key: "n2", x: 320, y: 180, text: "Working: Back local firms", centre: true, rank: 1 },
      { key: "y1", x: 310, y: 185, text: "Work and pay +0.4", centre: true, rank: 0 },
    ];
    const out = layoutSlips(slips);
    expect(out).toHaveLength(slips.length);
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) expect(overlap(out[i]!.box, out[j]!.box)).toBe(false);
  });

  it("keeps the most important slip where it was asked to be", () => {
    const out = layoutSlips([{ key: "b", x: 0, y: 0, text: "later", rank: 1 }, { key: "a", x: 0, y: 0, text: "first", rank: 0 }]);
    expect(out.find((s) => s.key === "a")!.y).toBe(0);
    expect(out.find((s) => s.key === "b")!.y).toBeGreaterThan(0);
  });

  it("moves words above a council's name upwards, never down onto the name (join, after fix round 1)", () => {
    const name = 300;
    const out = layoutSlips([
      { key: "e", x: 400, y: name - 46, text: "The river runs dirty", centre: true, up: true, rank: 0 },
      { key: "n", x: 400, y: name - 46, text: "Working: A repairs team for cold, damp homes", centre: true, up: true, rank: 1 },
      { key: "y", x: 400, y: name - 46, text: "Health +0.3", centre: true, up: true, rank: 0 },
    ]);
    for (const s of out) expect(s.box[3]).toBeLessThanOrEqual(name - 46 + 17);
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) expect(overlap(out[i]!.box, out[j]!.box)).toBe(false);
  });

  it("groups builds by site, so one council shows one ring", () => {
    const g = groupBy([{ s: "a" }, { s: "b" }, { s: "a" }, { s: "a" }], (x) => x.s);
    expect(g.map((x) => x.length)).toEqual([3, 1]);
  });
});
