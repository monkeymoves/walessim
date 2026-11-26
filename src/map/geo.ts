// Loads and decodes the map's data files (written by scripts/build-geo.ts).
import { decodeInt16Base64 } from "../engine/place-analysis";
import type { NationalRail, PlaceData, Pt, WalesGeo } from "./types";

/** The JSON shape of public/data/wales-geo.json. */
export interface WalesGeoFile {
  _note?: string;
  width: number;
  height: number;
  cellKm: number;
  elevation: { encoding?: string; width?: number; height?: number; data?: string; rows?: number[][]; legend?: string };
  las: WalesGeo["las"];
  regions?: WalesGeo["regions"];
  towns?: WalesGeo["towns"];
  sites?: WalesGeo["sites"];
  peaks?: WalesGeo["peaks"];
  labels?: WalesGeo["labels"];
}

export function decodeGeo(raw: WalesGeoFile, rail?: unknown): WalesGeo {
  const n = raw.width * raw.height;
  let elevation: Int16Array;
  if (raw.elevation.data) elevation = decodeInt16Base64(raw.elevation.data, n);
  else if (raw.elevation.rows) {
    elevation = new Int16Array(n);
    raw.elevation.rows.forEach((r, y) => r.forEach((v, x) => { elevation[y * raw.width + x] = v; }));
  } else throw new Error("wales-geo: no elevation grid");
  return {
    note: raw._note,
    width: raw.width,
    height: raw.height,
    cellKm: raw.cellKm,
    elevation,
    las: raw.las,
    regions: raw.regions ?? [],
    towns: raw.towns ?? [],
    sites: raw.sites ?? [],
    peaks: raw.peaks ?? [],
    labels: raw.labels ?? [],
    rail: rail == null ? null : normaliseRail(rail),
  };
}

const KM_X = 111.32 * Math.cos((52.4 * Math.PI) / 180);
/** Projects lon/lat to the km frame (CLAUDE.md). */
export const lonLatToKm = (lon: number, lat: number): Pt => [(lon + 5.4) * KM_X, (53.5 - lat) * 111.2];

/**
 * Accepts the national rail file in a few shapes: { lines: [{ coords | pts }], stations },
 * a bare array of lines, or GeoJSON LineString / MultiLineString features (lon/lat or km).
 */
export function normaliseRail(raw: unknown): NationalRail {
  const out: NationalRail = { lines: [], stations: [] };
  const asPts = (c: unknown): Pt[] | null => {
    if (!Array.isArray(c) || !c.length || !Array.isArray(c[0])) return null;
    const pts = (c as number[][]).map((p) => [p[0]!, p[1]!] as Pt);
    // lon/lat in Wales sits west of the meridian; km frame values are positive
    return pts.every((p) => p[0] < 0 && p[1] > 50 && p[1] < 54) ? pts.map((p) => lonLatToKm(p[0], p[1])) : pts;
  };
  const addLine = (l: any) => {
    if (!l) return;
    if (l.type === "Feature") {
      const g = l.geometry, props = l.properties ?? {};
      if (g?.type === "LineString") addLine({ ...props, coords: g.coordinates });
      else if (g?.type === "MultiLineString") for (const c of g.coordinates) addLine({ ...props, coords: c });
      else if (g?.type === "Point") {
        const [x, y] = asPts([g.coordinates])![0]!;
        out.stations.push({ name: props.name ?? null, cy: props.cy ?? null, x, y });
      }
      return;
    }
    const pts = asPts(l.pts ?? l.coords ?? l.coordinates ?? (Array.isArray(l) ? l : null));
    if (pts && pts.length > 1) out.lines.push({ kind: l.kind, name: l.name ?? null, pts });
  };
  const r = raw as any;
  if (Array.isArray(r)) r.forEach(addLine);
  else if (r && typeof r === "object") {
    (r.lines ?? r.features ?? []).forEach(addLine);
    for (const s of r.stations ?? []) if (typeof s?.x === "number") out.stations.push({ name: s.name ?? null, cy: s.cy ?? null, x: s.x, y: s.y });
  }
  return out;
}

async function getJson(url: string, optional = false): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    if (optional) return null;
    throw new Error(`${url}: HTTP ${res.status}`);
  }
  return res.json();
}

/** Fetches public/data/wales-geo.json, and the national rail file when present. */
export async function loadGeo(base = "/data/"): Promise<WalesGeo> {
  const [raw, rail] = await Promise.all([getJson(base + "wales-geo.json"), getJson(base + "wales-rail.json", true).catch(() => null)]);
  return decodeGeo(raw as WalesGeoFile, rail);
}

/** Fills missing optional layers so drawing code can iterate freely. */
export function normalisePlace(raw: PlaceData): PlaceData {
  if (!raw?.bbox || !raw?.elevation) throw new Error("place: bbox and elevation are required");
  const meta = raw._note?.place;
  const id = raw.id ?? meta?.id;
  const name = raw.name ?? (meta?.en ? { en: meta.en, cy: meta.cy ?? meta.en } : undefined);
  const arr = <T>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);
  return {
    ...raw,
    id,
    name,
    buildings: arr(raw.buildings),
    roads: arr(raw.roads),
    rail: arr(raw.rail),
    rivers: arr(raw.rivers),
    water: arr(raw.water),
    landuse: arr(raw.landuse),
    tips: arr(raw.tips),
    collieries: arr(raw.collieries),
    places: arr(raw.places),
    stations: arr(raw.stations),
    busStops: arr(raw.busStops),
    busRoutes: arr(raw.busRoutes),
    facilities: arr(raw.facilities),
    flood: arr(raw.flood),
    lsoas: arr(raw.lsoas),
  };
}

/** Fetches an authored place, for example loadPlace("rhondda"). */
export async function loadPlace(idOrUrl: string, base = "/data/places/"): Promise<PlaceData> {
  const url = idOrUrl.includes("/") || idOrUrl.endsWith(".json") ? idOrUrl : `${base}${idOrUrl}.json`;
  return normalisePlace((await getJson(url)) as PlaceData);
}
