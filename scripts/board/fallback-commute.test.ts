import { describe, expect, it } from "vitest";
import { fallbackCommuteLinks, strengthSteps } from "./fallback-commute";

const councils = [
  { code: "A", slug: "a", jobsDensity: 0.5 },
  { code: "B", slug: "b", jobsDensity: 0.6 },
  { code: "C", slug: "c", jobsDensity: 0.8 },
  { code: "D", slug: "d", jobsDensity: 0.9 },
  { code: "E", slug: "e", jobsDensity: 1.0 },
  { code: "F", slug: "f", jobsDensity: 1.2 },
];

describe("fallback commuting links", () => {
  it("steps are thirds of the councils by jobs density", () => {
    const s = strengthSteps(councils);
    expect(["A", "B", "C", "D", "E", "F"].map((c) => s.get(c))).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("exist only on a rail link or a shared border, from less work to more", () => {
    const links = fallbackCommuteLinks({ councils, rail: [["F", "B"]], borders: [["A", "C"], ["C", "D"], ["A", "C"]] });
    expect(links.map((l) => [l.id, l.from, l.to, l.strength])).toEqual([
      ["commute:a-c", "A", "C", 2],
      ["commute:b-f", "B", "F", 3],
      ["commute:c-d", "C", "D", 2],
    ]);
  });

  it("are a labelled game estimate with no share, and name what they came from", () => {
    const [l] = fallbackCommuteLinks({ councils, rail: [["A", "B"]], borders: [["A", "B"]] });
    expect(l).toMatchObject({ kind: "commute", honesty: "game_estimate", sources: ["nomis_jobs_density", "ons_lad_boundaries", "osm_rail_wales"] });
    expect(l?.share).toBeUndefined();
  });

  it("ignores councils not in play and pairs with equal work", () => {
    expect(fallbackCommuteLinks({ councils, rail: [["A", "Z"]], borders: [] })).toEqual([]);
    expect(fallbackCommuteLinks({ councils: [{ code: "A", slug: "a", jobsDensity: 1 }, { code: "B", slug: "b", jobsDensity: 1 }], rail: [["A", "B"]], borders: [] })).toEqual([]);
  });
});
