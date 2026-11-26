// What sits below a tip: the place view's "model rule", as a pure function.
// Ported from the Papur v2 mockup (computeBelow). No DOM: polygons are
// rasterised onto the place's own elevation grid with a scanline fill.
//
// The rule: a cell, building, facility or line counts as "below" a tip when
// it lies within distanceM of the tip and at least minDropM lower than the
// tip's base (the lowest ground under the tip outline, or under its point).

/** A point in the national km frame (x east, y south). */
export type Pt = [number, number];
export type Ring = Pt[];
export interface Bilingual { en: string; cy: string }

export interface PlaceElevation {
  x0: number;
  y0: number;
  cellKm: number;
  width: number;
  height: number;
  legend?: string;
  /** Metres at cell centres, rows north to south. */
  rows?: number[][];
  /** Alternative compact form: base64 little-endian Int16, row-major. */
  data?: string;
  encoding?: string;
}

export interface PlaceTip {
  id?: string;
  source?: string;
  kind?: string;
  osm?: string;
  x: number;
  y: number;
  rings?: Ring[];
  areaHa?: number;
  attrs?: Record<string, unknown>;
}

export interface PlaceFacility { name?: string | null; cy?: string | null; kind: string; x: number; y: number }
export interface PlaceStation { name?: string | null; cy?: string | null; kind?: string; x: number; y: number; operator?: string }
export interface PlaceLine { pts: Pt[]; name?: string | null; kind?: string; class?: string; status?: string }
export interface PlaceBusRoute { ref: string; name?: string | null; lengthKmInBbox?: number; lines: Pt[][] }
export interface PlaceArea { rings: Ring[]; class?: string; kind?: string; zone?: string; cy?: string }
export interface PlaceLsoa { code: string; en: string; cy?: string; wimdRank: number; decile?: number; x: number; y: number; polys: Ring[][] }
export interface PlaceName { en: string; cy?: string | null; kind: string; x: number; y: number }

/** An authored place, as written by pipeline/build_place.py. Every layer but bbox and elevation is optional. */
export interface PlaceData {
  id?: string;
  name?: Bilingual;
  la?: string;
  _note?: { place?: { id?: string; en?: string; cy?: string; profile?: string } } & Record<string, unknown>;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  elevation: PlaceElevation;
  buildings?: Ring[];
  roads?: PlaceLine[];
  rail?: PlaceLine[];
  rivers?: PlaceLine[];
  water?: PlaceArea[];
  landuse?: PlaceArea[];
  tips?: PlaceTip[];
  collieries?: { name?: string; x: number; y: number }[];
  places?: PlaceName[];
  stations?: PlaceStation[];
  busStops?: { name?: string | null; x: number; y: number }[];
  busRoutes?: PlaceBusRoute[];
  facilities?: PlaceFacility[];
  flood?: PlaceArea[];
  lsoas?: PlaceLsoa[];
}

/** The cells (and buildings) a rule counts, on a window of the place elevation grid. */
export interface BelowMask {
  /** km frame origin of the window's top-left cell corner. */
  x0: number;
  y0: number;
  cellKm: number;
  cols: number;
  rows: number;
  /** 1 where the cell centre is below, row-major. */
  cells: Uint8Array;
  /** Indices into place.buildings of the buildings counted. */
  buildings: number[];
  centre: Pt;
  radiusKm: number;
}

export interface BelowResult {
  itemId: string;
  baseM: number;
  residentialHa: number;
  buildings: number;
  schools: PlaceFacility[];
  /** Other facilities below (chapels, surgeries, institutes, halls, libraries). */
  facilities: PlaceFacility[];
  rail: { lines: string[]; stations: PlaceStation[] };
  busRoutes: string[];
  busStops: number;
  nearestRiverM: number | null;
  nearestRiver: string | null;
  /** 0 none, 2 Flood Zone 2, 3 Flood Zone 3 (the highest found below). */
  floodZone: 0 | 2 | 3;
  /** Lowest (most deprived) WIMD rank among neighbourhoods with 3 or more buildings below; null if none. */
  wimdRank: number | null;
  wimdLsoa: { code: string; en: string; cy?: string } | null;
  belowMask: BelowMask;
}

export interface PlaceItem {
  id: string;
  /** 1-based, numbered north to south. */
  n: number;
  x: number;
  y: number;
  rings?: Ring[];
  /** Cleaned source name, or null when the source gives none (the UI supplies copy). */
  name: string | null;
  source: string;
  baseM: number;
}

// ---------------------------------------------------------------------------

export function decodeInt16Base64(data: string, n: number): Int16Array {
  const bin = atob(data);
  const out = new Int16Array(n);
  for (let i = 0; i < n && 2 * i + 1 < bin.length; i++) {
    const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    out[i] = v > 32767 ? v - 65536 : v;
  }
  return out;
}

/** The place elevation as a flat Float32Array (row-major, north to south). */
export function elevationGrid(e: PlaceElevation): Float32Array {
  const n = e.width * e.height;
  const out = new Float32Array(n);
  if (e.rows) {
    for (let y = 0; y < e.height; y++) {
      const r = e.rows[y];
      if (!r) continue;
      for (let x = 0; x < e.width; x++) out[y * e.width + x] = r[x] ?? 0;
    }
  } else if (e.data) {
    out.set(decodeInt16Base64(e.data, n));
  }
  return out;
}

/** A stable id for a tip: its own id, its OSM id, its BGS record, or its index. */
export function tipId(t: PlaceTip, index: number): string {
  if (t.id) return t.id;
  if (t.osm) return t.osm;
  const bgs = t.attrs?.["bgs_ls_id"];
  if (bgs != null) return `bgs/${bgs}`;
  return `tip/${index}`;
}

function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/\s*\(.*?\)\s*/g, " ").replace(/"/g, "").replace(/\s+/g, " ").trim();
  return s || null;
}

/** Distance from p to segment ab, and the nearest point on it. */
export function segDist(px: number, py: number, a: Pt, b: Pt): [number, number, number] {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  let t = L2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx, y = a[1] + t * dy;
  return [Math.hypot(px - x, py - y), x, y];
}

function pointInRings(rings: Ring[], x: number, y: number): boolean {
  let c = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]!, b = ring[j]!;
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
  }
  return c;
}

/** Even-odd scanline fill of rings onto a grid, at cell centres. Calls set(index) for each covered cell. */
function rasterise(rings: Ring[], g: { x0: number; y0: number; c: number; w: number; h: number }, set: (i: number) => void): void {
  let minY = Infinity, maxY = -Infinity;
  for (const r of rings) for (const p of r) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  if (!isFinite(minY)) return;
  const j0 = Math.max(0, Math.floor((minY - g.y0) / g.c - 0.5));
  const j1 = Math.min(g.h - 1, Math.ceil((maxY - g.y0) / g.c - 0.5));
  const xs: number[] = [];
  for (let j = j0; j <= j1; j++) {
    const cy = g.y0 + (j + 0.5) * g.c;
    xs.length = 0;
    for (const ring of rings) {
      for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) {
        const a = ring[i]!, b = ring[k]!;
        if ((a[1] > cy) !== (b[1] > cy)) xs.push(a[0] + ((cy - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k]! - g.x0) / g.c - 0.5));
      const i1 = Math.min(g.w - 1, Math.floor((xs[k + 1]! - g.x0) / g.c - 0.5));
      for (let i = i0; i <= i1; i++) set(j * g.w + i);
    }
  }
}

interface Seg { a: Pt; b: Pt; tag: string }
function segments(lines: { pts: Pt[]; tag: string }[]): Seg[] {
  const out: Seg[] = [];
  for (const ln of lines) for (let i = 1; i < ln.pts.length; i++) out.push({ a: ln.pts[i - 1]!, b: ln.pts[i]!, tag: ln.tag });
  return out;
}

export interface PreparedPlace {
  place: PlaceData;
  grid: Float32Array;
  w: number;
  h: number;
  x0: number;
  y0: number;
  c: number;
  elevAt(x: number, y: number): number;
  residential: Uint8Array;
  flood: Uint8Array;
  bld: { x: number; y: number; z: number; lsoa: number; flood: number; bb: [number, number, number, number] }[];
  facilities: (PlaceFacility & { z: number })[];
  stations: (PlaceStation & { z: number })[];
  stops: { x: number; y: number; z: number }[];
  railSegs: Seg[];
  busSegs: Seg[];
  riverSegs: Seg[];
  items: PlaceItem[];
}

const PREPARED = new WeakMap<PlaceData, PreparedPlace>();

/** Derived lookups for a place, computed once and cached per place object. */
export function preparePlace(place: PlaceData): PreparedPlace {
  const hit = PREPARED.get(place);
  if (hit) return hit;
  const E = place.elevation, w = E.width, h = E.height, c = E.cellKm, x0 = E.x0, y0 = E.y0;
  const grid = elevationGrid(E);
  const elevAt = (x: number, y: number): number => {
    let gx = (x - x0) / c - 0.5, gy = (y - y0) / c - 0.5;
    gx = Math.max(0, Math.min(w - 1.001, gx));
    gy = Math.max(0, Math.min(h - 1.001, gy));
    const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, i = iy * w + ix;
    if (w < 2 || h < 2) return grid[Math.min(grid.length - 1, Math.max(0, i))] ?? 0;
    return grid[i]! * (1 - fx) * (1 - fy) + grid[i + 1]! * fx * (1 - fy) + grid[i + w]! * (1 - fx) * fy + grid[i + w + 1]! * fx * fy;
  };
  const G = { x0, y0, c, w, h };
  const residential = new Uint8Array(w * h);
  for (const l of place.landuse ?? []) if (l.class === "residential") rasterise(l.rings, G, (i) => { residential[i] = 1; });
  const flood = new Uint8Array(w * h);
  for (const f of place.flood ?? []) {
    const z = /3/.test(f.zone ?? "") ? 3 : 2;
    rasterise(f.rings, G, (i) => { if (flood[i]! < z) flood[i] = z; });
  }
  const floodAt = (x: number, y: number): number => {
    const i = Math.floor((x - x0) / c), j = Math.floor((y - y0) / c);
    return i < 0 || j < 0 || i >= w || j >= h ? 0 : flood[j * w + i]!;
  };
  const lsoas = (place.lsoas ?? []).map((l) => {
    const bb = [Infinity, Infinity, -Infinity, -Infinity];
    for (const poly of l.polys) for (const p of poly[0] ?? []) {
      bb[0] = Math.min(bb[0]!, p[0]); bb[1] = Math.min(bb[1]!, p[1]); bb[2] = Math.max(bb[2]!, p[0]); bb[3] = Math.max(bb[3]!, p[1]);
    }
    return { l, bb };
  });
  const lsoaAt = (x: number, y: number): number => {
    for (let i = 0; i < lsoas.length; i++) {
      const { l, bb } = lsoas[i]!;
      if (x < bb[0]! || x > bb[2]! || y < bb[1]! || y > bb[3]!) continue;
      if (l.polys.some((poly) => pointInRings(poly, x, y))) return i;
    }
    return -1;
  };
  const bld = (place.buildings ?? []).map((r) => {
    let x = 0, y = 0;
    const bb: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of r) {
      x += p[0]; y += p[1];
      if (p[0] < bb[0]) bb[0] = p[0]; if (p[1] < bb[1]) bb[1] = p[1]; if (p[0] > bb[2]) bb[2] = p[0]; if (p[1] > bb[3]) bb[3] = p[1];
    }
    x /= r.length || 1; y /= r.length || 1;
    return { x, y, z: elevAt(x, y), lsoa: lsoaAt(x, y), flood: floodAt(x, y), bb };
  });
  const facilities = (place.facilities ?? []).map((f) => ({ ...f, z: elevAt(f.x, f.y) }));
  const stations = (place.stations ?? []).filter((s) => !s.kind || s.kind === "rail_station").map((s) => ({ ...s, z: elevAt(s.x, s.y) }));
  const stops = (place.busStops ?? []).map((s) => ({ x: s.x, y: s.y, z: elevAt(s.x, s.y) }));
  const railSegs = segments((place.rail ?? []).filter((r) => r.status === "active").map((r) => ({ pts: r.pts, tag: r.name || "" })));
  const busSegs = segments((place.busRoutes ?? []).flatMap((b) => b.lines.map((pts) => ({ pts, tag: b.ref }))));
  const riverSegs = segments((place.rivers ?? []).filter((r) => r.kind === "river" && r.name).map((r) => ({ pts: r.pts, tag: r.name! })));
  const items = (place.tips ?? [])
    .map((t, i) => {
      let base = elevAt(t.x, t.y);
      for (const p of t.rings?.[0] ?? []) base = Math.min(base, elevAt(p[0], p[1]));
      return { id: tipId(t, i), n: 0, x: t.x, y: t.y, rings: t.rings, name: cleanName(t.attrs?.["name"]), source: t.source ?? "", baseM: base };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((t, i) => ({ ...t, n: i + 1 }));
  const prepared: PreparedPlace = {
    place, grid, w, h, x0, y0, c, elevAt, residential, flood, bld, facilities, stations, stops, railSegs, busSegs, riverSegs, items,
  };
  PREPARED.set(place, prepared);
  return prepared;
}

/** The place's selectable items (its tips), numbered north to south. */
export function placeItems(place: PlaceData): PlaceItem[] {
  return preparePlace(place).items;
}

const HEALTH = new Set(["doctors", "clinic", "hospital"]);

export function analyseBelow(place: PlaceData, itemId: string, opts: { distanceM: number; minDropM: number }): BelowResult {
  const P = preparePlace(place);
  const t = P.items.find((i) => i.id === itemId);
  if (!t) throw new Error(`No item ${itemId} in place ${place.id ?? place._note?.place?.id ?? ""}`);
  const Dk = Math.max(0, opts.distanceM) / 1000;
  const limit = t.baseM - opts.minDropM;
  const within = (x: number, y: number) => Math.hypot(x - t.x, y - t.y) <= Dk;
  const ok = (x: number, y: number, z: number) => within(x, y) && z < limit;

  // the window of grid cells around the tip
  const i0 = Math.max(0, Math.floor((t.x - Dk - P.x0) / P.c)), i1 = Math.min(P.w - 1, Math.ceil((t.x + Dk - P.x0) / P.c));
  const j0 = Math.max(0, Math.floor((t.y - Dk - P.y0) / P.c)), j1 = Math.min(P.h - 1, Math.ceil((t.y + Dk - P.y0) / P.c));
  const cols = Math.max(0, i1 - i0 + 1), rows = Math.max(0, j1 - j0 + 1);
  const cells = new Uint8Array(cols * rows);
  const cellHa = P.c * P.c * 100;
  let resCells = 0;
  let flood = 0;
  for (let j = j0; j <= j1; j++) {
    const cy = P.y0 + (j + 0.5) * P.c;
    for (let i = i0; i <= i1; i++) {
      const cx = P.x0 + (i + 0.5) * P.c, k = j * P.w + i;
      if (!ok(cx, cy, P.grid[k]!)) continue;
      cells[(j - j0) * cols + (i - i0)] = 1;
      if (P.residential[k]) resCells++;
      if (P.flood[k]! > flood) flood = P.flood[k]!;
    }
  }

  const bIdx: number[] = [];
  const perLsoa = new Map<number, number>();
  P.bld.forEach((b, i) => {
    if (Math.abs(b.x - t.x) > Dk || Math.abs(b.y - t.y) > Dk || !ok(b.x, b.y, b.z)) return;
    bIdx.push(i);
    if (b.lsoa >= 0) perLsoa.set(b.lsoa, (perLsoa.get(b.lsoa) ?? 0) + 1);
    if (b.flood > flood) flood = b.flood;
  });
  let wimd: PlaceLsoa | null = null;
  const lsoas = place.lsoas ?? [];
  for (const [li, n] of perLsoa) {
    const l = lsoas[li];
    if (l && n >= 3 && (!wimd || l.wimdRank < wimd.wimdRank)) wimd = l;
  }

  const schools: PlaceFacility[] = [], facilities: PlaceFacility[] = [];
  for (const f of P.facilities) {
    if (!ok(f.x, f.y, f.z)) continue;
    const { z: _z, ...rest } = f;
    (f.kind === "school" ? schools : facilities).push(rest);
  }
  const stations: PlaceStation[] = [];
  for (const s of P.stations) if (ok(s.x, s.y, s.z)) { const { z: _z, ...rest } = s; stations.push(rest); }
  let busStops = 0;
  for (const s of P.stops) if (ok(s.x, s.y, s.z)) busStops++;
  // a line counts when any part of it inside the circle is below (sampled every 25 m)
  const lineTags = (segs: Seg[]) => {
    const set = new Set<string>();
    for (const sg of segs) {
      if (set.has(sg.tag)) continue;
      const [d, nx, ny] = segDist(t.x, t.y, sg.a, sg.b);
      if (d > Dk) continue;
      if (P.elevAt(nx, ny) < limit) { set.add(sg.tag); continue; }
      const len = Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]);
      const n = Math.max(1, Math.ceil(len / 0.025));
      for (let k = 0; k <= n; k++) {
        const x = sg.a[0] + ((sg.b[0] - sg.a[0]) * k) / n, y = sg.a[1] + ((sg.b[1] - sg.a[1]) * k) / n;
        if (within(x, y) && P.elevAt(x, y) < limit) { set.add(sg.tag); break; }
      }
    }
    return [...set];
  };
  const railLines = lineTags(P.railSegs).filter(Boolean).sort();
  const busRoutes = lineTags(P.busSegs).sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b));
  let best = Infinity, river: string | null = null;
  for (const sg of P.riverSegs) {
    const [d] = segDist(t.x, t.y, sg.a, sg.b);
    if (d < best) { best = d; river = sg.tag; }
  }

  return {
    itemId,
    baseM: Math.round(t.baseM),
    residentialHa: Math.round(resCells * cellHa * 100) / 100,
    buildings: bIdx.length,
    schools,
    facilities,
    rail: { lines: railLines, stations },
    busRoutes,
    busStops,
    nearestRiverM: isFinite(best) ? Math.round((best * 1000) / 10) * 10 : null,
    nearestRiver: river,
    floodZone: (flood >= 3 ? 3 : flood >= 2 ? 2 : 0) as 0 | 2 | 3,
    wimdRank: wimd ? wimd.wimdRank : null,
    wimdLsoa: wimd ? { code: wimd.code, en: wimd.en, cy: wimd.cy } : null,
    belowMask: {
      x0: P.x0 + i0 * P.c,
      y0: P.y0 + j0 * P.c,
      cellKm: P.c,
      cols,
      rows,
      cells,
      buildings: bIdx,
      centre: [t.x, t.y],
      radiusKm: Dk,
    },
  };
}

/** Facility kinds counted as health sites in summaries. */
export const isHealthFacility = (f: PlaceFacility) => HEALTH.has(f.kind);
