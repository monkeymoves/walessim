// Contour sheets from elevation grids, via d3-contour. Geometry only (no
// drawing): rings come back in the km frame so any view can draw them.
import { contours } from "d3-contour";
import type { WalesGeo } from "./types";

/** A contour level as polygons (each polygon: outer ring then holes), coordinates in km. */
export type KmMultiPolygon = number[][][][];

/** Separable blur, three box passes per axis (as d3-array blur2). In place. */
export function blur2(data: Float64Array, width: number, height: number, r: number): void {
  if (!(r > 0)) return;
  const temp = data.slice();
  const blur = blurf(r);
  for (let pass = 0; pass < 3; pass++) {
    const [src, dst] = pass % 2 === 0 ? [data, temp] : [temp, data];
    for (let y = 0; y < height; y++) blur(dst, src, y * width, (y + 1) * width, 1);
  }
  // after three passes the result sits in temp
  for (let pass = 0; pass < 3; pass++) {
    const [src, dst] = pass % 2 === 0 ? [temp, data] : [data, temp];
    for (let x = 0; x < width; x++) blur(dst, src, x, x + width * height, width);
  }
  // three vertical passes from temp end in data
}

function blurf(radius: number) {
  const r0 = Math.floor(radius), t = radius - r0, w = 2 * radius + 1;
  return (T: Float64Array, S: Float64Array, start: number, stop: number, step: number) => {
    if (!((stop -= step) >= start)) return;
    let sum = r0 * S[start]!;
    const s0 = step * r0, s1 = s0 + step;
    for (let i = start, j = start + s0; i < j; i += step) sum += S[Math.min(stop, i)]!;
    for (let i = start, j = stop; i <= j; i += step) {
      sum += S[Math.min(stop, i + s0)]!;
      T[i] = t ? (sum + t * (S[Math.max(start, i - s1)]! + S[Math.min(stop, i + s1)]!)) / w : sum / w;
      sum -= S[Math.max(start, i - s0)]!;
    }
  };
}

/** Contours of a grid at thresholds, mapped to km by km = origin + grid * scale. */
export function contourKm(values: ArrayLike<number>, width: number, height: number, thresholds: number[], scale: number, ox: number, oy: number): KmMultiPolygon[] {
  const gen = contours().size([width, height]);
  return thresholds.map((t) => {
    const mp = gen.contour(values as number[], t);
    return mp.coordinates.map((poly) => poly.map((ring) => ring.map(([x, y]) => [ox + x! * scale, oy + y! * scale])));
  });
}

// ---------------------------------------------------------------------------
// national relief

export const NATIONAL_LEVELS = [45, 110, 180, 250, 320, 390, 460, 530, 610, 700, 800];
const SEA_DIST = [30, 17, 9, 4, 1.6];
const PAD = { l: 170, r: 220, t: 60, b: 60 };

export interface NationalRelief {
  /** One sheet per NATIONAL_LEVELS threshold. */
  bands: KmMultiPolygon[];
  /** Sea shelves from deep (30 km out) to shallow (1.6 km out). */
  sea: KmMultiPolygon[];
  /** Land beyond Wales (England), tucked under the border. */
  beyond: KmMultiPolygon;
  ms: number;
}

/** The national paper relief, as in the Papur v2 mockup (WPREP). Roughly 60 to 120 ms. */
export function prepareNationalRelief(geo: WalesGeo): NationalRelief {
  const t0 = performance.now();
  const NX = geo.width, NY = geo.height, E = geo.elevation, km = geo.cellKm;
  const n = NX * NY, el = new Float32Array(n), known = new Uint8Array(n);
  const q = new Int32Array(n);
  let qn = 0;
  for (let i = 0; i < n; i++) {
    const v = E[i]!;
    if (v >= 0) { el[i] = v; known[i] = 1; q[qn++] = i; }
    else if (v === -1) { el[i] = -40; known[i] = 2; }
  }
  // land outside Wales takes the height of the nearest Welsh ground, falling away
  for (let h = 0; h < qn; h++) {
    const i = q[h]!, x = i % NX, y = (i / NX) | 0;
    const nb = [x + 1 < NX ? i + 1 : -1, x > 0 ? i - 1 : -1, y + 1 < NY ? i + NX : -1, y > 0 ? i - NX : -1];
    for (const j of nb) {
      if (j < 0 || known[j]) continue;
      known[j] = 1; el[j] = el[i]! * 0.97; q[qn++] = j;
    }
  }
  const U = 2, UW = NX * U, UH = NY * U, up = new Float64Array(UW * UH);
  for (let Y = 0; Y < UH; Y++) for (let X = 0; X < UW; X++) {
    const gx = Math.max(0, Math.min(NX - 1.001, (X + 0.5) / U - 0.5)), gy = Math.max(0, Math.min(NY - 1.001, (Y + 0.5) / U - 0.5));
    const x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, i = y0 * NX + x0;
    up[Y * UW + X] = el[i]! * (1 - fx) * (1 - fy) + el[i + 1]! * fx * (1 - fy) + el[i + NX]! * (1 - fx) * fy + el[i + NX + 1]! * fx * fy;
  }
  blur2(up, UW, UH, 2.4);
  const bands = contourKm(up, UW, UH, NATIONAL_LEVELS, km / U, 0, 0);

  // sea shelves: distance from any land, on a padded grid
  const PW = NX + PAD.l + PAD.r, PH = NY + PAD.t + PAD.b;
  // beyond the grid to the east is England (Lancashire to Gloucestershire); elsewhere the edge carries on
  const cls = (x: number, y: number) => {
    if (x - PAD.l >= NX) return 2;
    const v = E[Math.max(0, Math.min(NY - 1, y - PAD.t)) * NX + Math.max(0, Math.min(NX - 1, x - PAD.l))]!;
    return v === -1 ? 0 : v === -2 ? 2 : 1;
  };
  const dist = new Float64Array(PW * PH), C = new Uint8Array(PW * PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const c = cls(x, y); C[y * PW + x] = c; dist[y * PW + x] = c ? 0 : 1e9; }
  const R2 = Math.SQRT2;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x; let v = dist[i]!;
    if (x > 0) v = Math.min(v, dist[i - 1]! + 1);
    if (y > 0) { v = Math.min(v, dist[i - PW]! + 1); if (x > 0) v = Math.min(v, dist[i - PW - 1]! + R2); if (x < PW - 1) v = Math.min(v, dist[i - PW + 1]! + R2); }
    dist[i] = v;
  }
  for (let y = PH - 1; y >= 0; y--) for (let x = PW - 1; x >= 0; x--) {
    const i = y * PW + x; let v = dist[i]!;
    if (x < PW - 1) v = Math.min(v, dist[i + 1]! + 1);
    if (y < PH - 1) { v = Math.min(v, dist[i + PW]! + 1); if (x < PW - 1) v = Math.min(v, dist[i + PW + 1]! + R2); if (x > 0) v = Math.min(v, dist[i + PW - 1]! + R2); }
    dist[i] = v;
  }
  const neg = new Float64Array(PW * PH);
  for (let i = 0; i < neg.length; i++) neg[i] = -dist[i]!;
  blur2(neg, PW, PH, 1.6);
  const sea = contourKm(neg, PW, PH, SEA_DIST.map((t) => -t), km, -PAD.l * km, -PAD.t * km);

  const eng = new Float64Array(PW * PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const c = C[y * PW + x];
    let v = 0;
    if (c === 2) v = 1;
    else if (c === 1) {
      outer: for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < PW && yy < PH && C[yy * PW + xx] === 2) { v = 1; break outer; }
      }
    }
    eng[y * PW + x] = v;
  }
  blur2(eng, PW, PH, 0.8);
  const beyond = contourKm(eng, PW, PH, [0.5], km, -PAD.l * km, -PAD.t * km)[0]!;
  return { bands, sea, beyond, ms: performance.now() - t0 };
}

// ---------------------------------------------------------------------------
// place relief

export interface PlaceRelief { levels: number[]; bands: KmMultiPolygon[]; ms: number }

/** Contour sheets for a place grid: about 23 levels spanning its height range. */
export function preparePlaceRelief(grid: Float32Array, w: number, h: number, x0: number, y0: number, cellKm: number, target = 23): PlaceRelief {
  const t0 = performance.now();
  const vals = Float64Array.from(grid);
  let lo = Infinity, hi = -Infinity;
  for (const v of vals) { if (v < lo) lo = v; if (v > hi) hi = v; }
  blur2(vals, w, h, 1);
  const step = Math.max(2.5, Math.round(((hi - lo) / target) / 2.5) * 2.5);
  const levels: number[] = [];
  for (let v = Math.ceil((lo + step * 0.5) / step) * step; v < hi; v += step) levels.push(v);
  // grid cell centres are at (i + 0.5) * cellKm, contour vertices at cell corners in grid units
  const bands = contourKm(vals, w, h, levels, cellKm, x0, y0);
  return { levels, bands, ms: performance.now() - t0 };
}
