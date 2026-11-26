// The map's DOM-free parts: lens ramps, colour mixing, hit testing, data decoding, relief geometry.
import { describe, expect, it } from "vitest";
import { decodeGeo, lonLatToKm, normalisePlace, normaliseRail } from "./geo";
import { LaIndex, labelPoint, pointInRings } from "./hit";
import { lensColour, lensPosition, lensStops } from "./lens";
import { DEFAULT_PALETTE, parseColour, rampAt } from "./palette";
import { blur2, contourKm } from "./relief";
import type { LensSpec, LocalAuthority, Ring } from "./types";

const sq = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

describe("lens", () => {
  const seq: LensSpec = { values: { A: 10, B: 20, C: null }, domain: [10, 30], ramp: "sequential", higherIsBetter: true };
  it("maps a sequential domain onto 0 to 1, clamped", () => {
    expect(lensPosition(seq, 10)).toBe(0);
    expect(lensPosition(seq, 20)).toBe(0.5);
    expect(lensPosition(seq, 99)).toBe(1);
  });
  it("puts a diverging centre on the middle stop even when off centre", () => {
    const div: LensSpec = { ...seq, ramp: "diverging", centre: 12 };
    expect(lensPosition(div, 12)).toBe(0.5);
    expect(lensPosition(div, 10)).toBe(0);
    expect(lensPosition(div, 30)).toBe(1);
    expect(lensPosition(div, 21)).toBeCloseTo(0.75);
  });
  it("flips a diverging ramp when lower is better, and goes neutral with no direction", () => {
    const div: LensSpec = { ...seq, ramp: "diverging" };
    expect(lensStops(div, DEFAULT_PALETTE)).toEqual(DEFAULT_PALETTE.lensDiv);
    expect(lensStops({ ...div, higherIsBetter: false }, DEFAULT_PALETTE)).toEqual([...DEFAULT_PALETTE.lensDiv].reverse());
    expect(lensStops({ ...div, higherIsBetter: null }, DEFAULT_PALETTE)).toEqual(DEFAULT_PALETTE.lensDivNeutral);
  });
  it("returns null for a missing value and ramp ends for the domain ends", () => {
    expect(lensColour(seq, null, DEFAULT_PALETTE)).toBeNull();
    expect(lensColour(seq, 10, DEFAULT_PALETTE)).toEqual(parseColour(DEFAULT_PALETTE.lensSeq[0]!));
    expect(lensColour(seq, 30, DEFAULT_PALETTE)).toEqual(parseColour(DEFAULT_PALETTE.lensSeq.at(-1)!));
  });
});

describe("palette", () => {
  it("parses hex and rgb() colours", () => {
    expect(parseColour("#B0262C")).toEqual([176, 38, 44]);
    expect(parseColour("#fff")).toEqual([255, 255, 255]);
    expect(parseColour("rgba(10, 20, 30, .5)")).toEqual([10, 20, 30]);
  });
  it("interpolates ramps in OKLab, hitting the stops exactly", () => {
    expect(rampAt(["#000000", "#ffffff"], 0)).toEqual([0, 0, 0]);
    expect(rampAt(["#000000", "#ffffff"], 1)).toEqual([255, 255, 255]);
    const mid = rampAt(["#000000", "#ffffff"], 0.5);
    expect(mid[0]).toBe(mid[1]);
    expect(mid[0]).toBeGreaterThan(90);
    expect(mid[0]).toBeLessThan(130);
  });
});

describe("hit testing", () => {
  const las: LocalAuthority[] = [
    { code: "NW", en: "North West", cy: "Gogledd Orllewin", rings: [sq(0, 0, 10, 10)] },
    { code: "NE", en: "North East", cy: "Gogledd Ddwyrain", rings: [sq(10, 0, 20, 10)] },
    // an island authority with a hole: even-odd across rings
    { code: "S", en: "South", cy: "De", rings: [sq(0, 40, 20, 60), sq(8, 48, 12, 52), sq(30, 45, 34, 49)] },
  ];
  const idx = new LaIndex(las);
  it("finds the authority under a point, honouring holes and islands", () => {
    expect(idx.at(5, 5)).toBe("NW");
    expect(idx.at(15, 5)).toBe("NE");
    expect(idx.at(2, 42)).toBe("S");
    expect(idx.at(10, 50)).toBeNull();
    expect(idx.at(32, 47)).toBe("S");
    expect(idx.at(50, 50)).toBeNull();
  });
  it("orders authorities north to south, west to east", () => {
    expect(idx.order).toEqual(["NW", "NE", "S"]);
  });
  it("finds neighbours by direction", () => {
    expect(idx.neighbour("NW", "right")).toBe("NE");
    expect(idx.neighbour("NE", "left")).toBe("NW");
    expect(idx.neighbour("NW", "down")).toBe("S");
    expect(idx.neighbour("NW", "up")).toBeNull();
  });
  it("puts a label point inside an awkward shape", () => {
    const L: Ring = [[0, 0], [10, 0], [10, 2], [2, 2], [2, 10], [0, 10]];
    const [x, y] = labelPoint([L]);
    expect(pointInRings([L], x, y)).toBe(true);
  });
});

describe("geo decoding", () => {
  it("decodes the packed elevation grid", () => {
    const vals = [-1, -2, 0, 500];
    const b = new Uint8Array(8);
    vals.forEach((v, i) => { const u = v & 0xffff; b[2 * i] = u & 255; b[2 * i + 1] = u >> 8; });
    const g = decodeGeo({ width: 2, height: 2, cellKm: 1, elevation: { data: btoa(String.fromCharCode(...b)) }, las: [] });
    expect([...g.elevation]).toEqual(vals);
    expect(g.regions).toEqual([]);
    expect(g.rail).toBeNull();
  });
  it("reads rail as lines with coords, GeoJSON in lon/lat, or bare arrays", () => {
    const a = normaliseRail({ lines: [{ kind: "main", name: "L", coords: [[1, 2], [3, 4]] }], stations: [{ name: "S", x: 1, y: 2 }] });
    expect(a.lines[0]!.pts).toEqual([[1, 2], [3, 4]]);
    expect(a.stations).toHaveLength(1);
    const b = normaliseRail({ type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "G" }, geometry: { type: "LineString", coordinates: [[-3.2, 51.5], [-3.1, 51.6]] } }] });
    expect(b.lines[0]!.pts[0]).toEqual(lonLatToKm(-3.2, 51.5));
    expect(normaliseRail([{ pts: [[0, 0], [1, 1]] }]).lines).toHaveLength(1);
  });
  it("fills a place's missing optional layers and finds its id", () => {
    const p = normalisePlace({ _note: { place: { id: "x", en: "X", cy: "Y" } }, bbox: { x0: 0, y0: 0, x1: 1, y1: 1 }, elevation: { x0: 0, y0: 0, cellKm: 1, width: 1, height: 1, rows: [[1]] } });
    expect(p.id).toBe("x");
    expect(p.name).toEqual({ en: "X", cy: "Y" });
    expect(p.buildings).toEqual([]);
    expect(p.busRoutes).toEqual([]);
  });
});

describe("relief geometry", () => {
  it("blurs without changing the mean of a flat interior", () => {
    const w = 20, h = 20, a = new Float64Array(w * h).fill(5);
    a[210] = 105;
    blur2(a, w, h, 2);
    const sum = a.reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(5 * w * h + 100, 6);
    expect(a[210]).toBeLessThan(105);
  });
  it("returns contour rings in km", () => {
    const w = 10, h = 10, a = new Float64Array(w * h);
    for (let y = 3; y < 7; y++) for (let x = 3; x < 7; x++) a[y * w + x] = 10;
    const [mp] = contourKm(a, w, h, [5], 0.5, 100, 200);
    const pts = mp!.flat(2);
    const xs = pts.map((p) => p[0]!), ys = pts.map((p) => p[1]!);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(101);
    expect(Math.max(...xs)).toBeLessThanOrEqual(104);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(201);
  });
});
