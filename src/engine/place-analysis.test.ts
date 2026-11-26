import { describe, expect, it } from "vitest";
import { analyseBelow, decodeInt16Base64, elevationGrid, placeItems, tipId, type PlaceData, type Pt, type Ring } from "./place-analysis";

// A 2 km square valley side: 20 x 20 cells of 100 m, falling 10 m per cell eastward.
// Cell column i has elevation 300 - 10 i, so the tip on column 2 sits at 280 m.
const N = 20, C = 0.1;
const rows = Array.from({ length: N }, () => Array.from({ length: N }, (_, i) => 300 - 10 * i));
const box = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const sq = (x: number, y: number, r = 0.01): Ring => box(x - r, y - r, x + r, y + r);
const line = (...pts: Pt[]) => pts;

const place: PlaceData = {
  id: "test",
  bbox: { x0: 0, y0: 0, x1: 2, y1: 2 },
  elevation: { x0: 0, y0: 0, cellKm: C, width: N, height: N, rows },
  tips: [
    { source: "OSM", osm: "way/1", x: 0.25, y: 1.0, rings: [box(0.21, 0.96, 0.29, 1.04)] },
    { source: "BGS", x: 1.5, y: 0.2, attrs: { name: "North Tip (SWC: X1)", bgs_ls_id: 77 } },
  ],
  // three below, one uphill, one beyond the circle
  buildings: [sq(0.8, 1.0), sq(0.85, 1.0), sq(0.9, 0.95), sq(0.1, 1.0), sq(1.9, 1.0)],
  landuse: [
    { class: "residential", rings: [box(0.6, 0.8, 1.0, 1.2)] },
    { class: "woodland", rings: [box(0.4, 0.4, 1.4, 1.6)] },
  ],
  flood: [{ zone: "Flood Zone 3", rings: [box(0.7, 0.9, 0.9, 1.1)] }],
  facilities: [
    { kind: "school", name: "Ysgol Isaf", x: 0.7, y: 0.9 },
    { kind: "school", name: "Ysgol Uchaf", x: 0.15, y: 1.0 },
    { kind: "place_of_worship", name: "Capel", x: 0.9, y: 1.1 },
  ],
  rail: [
    { status: "active", name: "Valley Line", pts: line([0.8, 0], [0.8, 2]) },
    { status: "abandoned", name: "Old Line", pts: line([0.7, 0], [0.7, 2]) },
  ],
  stations: [
    { kind: "rail_station", name: "Halt", x: 0.8, y: 1.05 },
    { kind: "bus_station", name: "Depot", x: 0.82, y: 1.05 },
  ],
  busStops: [{ name: "Stop", x: 0.75, y: 1.1 }, { name: "Top", x: 0.2, y: 1.2 }],
  busRoutes: [
    // passes close to the tip at its own height, then drops away inside the circle
    { ref: "3", lines: [line([0, 1.3], [2, 1.3])] },
    { ref: "7", lines: [line([1.5, 0], [1.5, 2])] },
  ],
  rivers: [
    { kind: "stream", name: "Nant", pts: line([0.3, 0], [0.3, 2]) },
    { kind: "river", name: "Afon Prawf", pts: line([1.2, 0], [1.2, 2]) },
  ],
  lsoas: [
    { code: "L1", en: "Low 1", wimdRank: 12, x: 1, y: 1, polys: [[box(0.5, 0, 1.5, 2)]] },
    { code: "L2", en: "High 1", wimdRank: 900, x: 0.2, y: 1, polys: [[box(0, 0, 0.5, 2)]] },
  ],
};

describe("placeItems", () => {
  it("numbers tips north to south with stable ids and cleaned names", () => {
    const items = placeItems(place);
    expect(items.map((i) => [i.n, i.id])).toEqual([[1, "bgs/77"], [2, "way/1"]]);
    expect(items[0]!.name).toBe("North Tip");
    expect(items[1]!.name).toBeNull();
  });
  it("takes the tip base as the lowest ground under its outline", () => {
    const tip = placeItems(place).find((i) => i.id === "way/1")!;
    expect(tip.baseM).toBeLessThan(280);
    expect(tip.baseM).toBeGreaterThan(275);
  });
});

describe("analyseBelow", () => {
  const B = analyseBelow(place, "way/1", { distanceM: 1000, minDropM: 10 });

  it("counts residential land below, in hectares", () => {
    // 4 x 4 cells of 1 ha, all inside the circle and well below the tip
    expect(B.residentialHa).toBe(16);
  });
  it("counts buildings below, not uphill or beyond the distance", () => {
    expect(B.buildings).toBe(3);
    expect(B.belowMask.buildings.sort()).toEqual([0, 1, 2]);
  });
  it("splits schools from other facilities", () => {
    expect(B.schools.map((s) => s.name)).toEqual(["Ysgol Isaf"]);
    expect(B.facilities.map((s) => s.name)).toEqual(["Capel"]);
  });
  it("finds active rail lines and rail stations below", () => {
    expect(B.rail.lines).toEqual(["Valley Line"]);
    expect(B.rail.stations.map((s) => s.name)).toEqual(["Halt"]);
  });
  it("counts a bus route that drops below inside the circle, and stops", () => {
    expect(B.busRoutes).toEqual(["3"]);
    expect(B.busStops).toBe(1);
  });
  it("measures the nearest named river, ignoring streams", () => {
    expect(B.nearestRiver).toBe("Afon Prawf");
    expect(B.nearestRiverM).toBe(950);
  });
  it("reports the highest flood zone and the most deprived neighbourhood", () => {
    expect(B.floodZone).toBe(3);
    expect(B.wimdRank).toBe(12);
    expect(B.wimdLsoa?.code).toBe("L1");
  });
  it("returns a mask that excludes the tip's own ground", () => {
    const M = B.belowMask;
    const at = (x: number, y: number) => M.cells[Math.floor((y - M.y0) / M.cellKm) * M.cols + Math.floor((x - M.x0) / M.cellKm)];
    expect(at(0.25, 1.0)).toBe(0);
    expect(at(0.85, 1.0)).toBe(1);
    expect(M.radiusKm).toBe(1);
  });
  it("shrinks with a shorter distance and a bigger drop", () => {
    const S = analyseBelow(place, "way/1", { distanceM: 400, minDropM: 50 });
    expect(S.buildings).toBe(0);
    expect(S.residentialHa).toBeLessThan(B.residentialHa);
    expect(S.wimdRank).toBeNull();
  });
  it("throws for an unknown item", () => {
    expect(() => analyseBelow(place, "nope", { distanceM: 500, minDropM: 10 })).toThrow();
  });
  it("tolerates a place with no optional layers", () => {
    const bare: PlaceData = { bbox: place.bbox, elevation: place.elevation, tips: [{ x: 0.25, y: 1 }] };
    const R = analyseBelow(bare, tipId(bare.tips![0]!, 0), { distanceM: 500, minDropM: 10 });
    expect(R.buildings).toBe(0);
    expect(R.nearestRiverM).toBeNull();
    expect(R.floodZone).toBe(0);
  });
});

describe("elevation decoding", () => {
  it("reads base64 Int16 grids the same as rows", () => {
    const vals = [-2, -1, 0, 1085, 300, -32768];
    const b = new Uint8Array(vals.length * 2);
    vals.forEach((v, i) => { const u = v & 0xffff; b[2 * i] = u & 255; b[2 * i + 1] = u >> 8; });
    const data = btoa(String.fromCharCode(...b));
    expect([...decodeInt16Base64(data, vals.length)]).toEqual(vals);
    const g = elevationGrid({ x0: 0, y0: 0, cellKm: 1, width: 3, height: 2, data });
    expect([...g]).toEqual(vals);
  });
});
