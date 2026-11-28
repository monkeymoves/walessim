import { describe, expect, it } from "vitest";
import { outlines, type Geo, type Pt } from "./geo";
import { deriveRailLinks, type RailData } from "./rail-links";

const square = (x: number, y: number, w = 10): Pt[] => [[x, y], [x + w, y], [x + w, y + w], [x, y + w]];
const geo: Geo = {
  las: [
    { code: "A", en: "Alpha", rings: [square(0, 0)] },
    { code: "B", en: "Beta", rings: [square(10, 0)] },
    { code: "C", en: "Gamma", rings: [square(20, 0)] },
    { code: "D", en: "Delta", rings: [square(0, 10)] },
  ],
  towns: [],
};
const councils = [
  { code: "A", slug: "alpha", centre: [5, 5] as Pt },
  { code: "B", slug: "beta", centre: [15, 5] as Pt },
  { code: "C", slug: "gamma", centre: [25, 5] as Pt },
  { code: "D", slug: "delta", centre: [5, 15] as Pt },
];
const run = (data: RailData) => deriveRailLinks({ data, outlines: outlines(geo), councils });

describe("deriveRailLinks", () => {
  it("links councils joined by track with a station at each end, in line order", () => {
    const r = run({
      lines: [{ kind: "main", name: "Test Line", coords: [[1, 5], [29, 5]] }],
      stations: [{ name: "a", x: 2, y: 5 }, { name: "b", x: 15, y: 5 }],
    });
    expect(r.links.map((l) => l.id)).toEqual(["rail:alpha-beta"]);
    const l = r.links[0]!;
    expect([l.from, l.to, l.kind, l.quality, l.honesty]).toEqual(["A", "B", "rail", 1, "real"]);
    expect(l.name?.en).toBe("Test Line");
    expect(l.name?.cy_review).toBe(true);
    expect(r.stations).toEqual({ A: 1, B: 1, C: 0, D: 0 });
  });

  it("needs a station on each side: track alone is not a passenger link", () => {
    const r = run({ lines: [{ kind: "main", name: "Goods", coords: [[1, 5], [29, 5]] }], stations: [{ name: "a", x: 2, y: 5 }] });
    expect(r.links).toEqual([]);
  });

  it("does not join councils that are only linked through a third council", () => {
    const r = run({
      lines: [{ kind: "main", name: "Long Line", coords: [[1, 5], [29, 5]] }],
      stations: [{ name: "a", x: 2, y: 5 }, { name: "b", x: 15, y: 5 }, { name: "c", x: 25, y: 5 }],
    });
    expect(r.links.map((l) => l.id).sort()).toEqual(["rail:alpha-beta", "rail:beta-gamma"]);
  });

  it("joins ways with a small gap between them, whatever they are named", () => {
    const r = run({
      lines: [
        { kind: "main", name: "West Part", coords: [[1, 5], [9.8, 5]] },
        { kind: "main", name: "East Part", coords: [[10.3, 5], [19, 5]] },
      ],
      stations: [{ name: "a", x: 2, y: 5 }, { name: "b", x: 15, y: 5 }],
    });
    expect(r.links.map((l) => l.id)).toEqual(["rail:alpha-beta"]);
  });

  it("ignores heritage lines", () => {
    const r = run({ lines: [{ kind: "heritage", name: "Toy Railway", coords: [[1, 5], [19, 5]] }], stations: [{ name: "a", x: 2, y: 5 }, { name: "b", x: 15, y: 5 }] });
    expect(r.links).toEqual([]);
  });

  it("prefers a line name to a name for a bit of track", () => {
    const r = run({
      lines: [
        { kind: "main", name: "Hill Tunnel", coords: [[8, 5], [12, 5]] },
        { kind: "main", name: "Real Line", coords: [[1, 5], [8, 5]] },
        { kind: "main", name: "Real Line", coords: [[12, 5], [19, 5]] },
      ],
      stations: [{ name: "a", x: 2, y: 5 }, { name: "b", x: 15, y: 5 }],
    });
    expect(r.links[0]?.name?.en).toBe("Real Line");
  });
});
