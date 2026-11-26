// Point-in-polygon hit testing and keyboard order for the authorities.
import type { LaCode, LocalAuthority, Pt, Ring } from "./types";

export type BBox = [number, number, number, number];

export function ringsBBox(rings: Ring[]): BBox {
  const b: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rings) for (const [x, y] of r) {
    if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
  }
  return b;
}

/** Even-odd test across all rings (islands add, holes subtract). */
export function pointInRings(rings: Ring[], x: number, y: number): boolean {
  let c = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]!, b = ring[j]!;
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
  }
  return c;
}

function ringArea(r: Ring): number {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j]![0] - r[i]![0]) * (r[j]![1] + r[i]![1]);
  return s / 2;
}

/**
 * A point well inside the rings, for labels and stitches: the inside grid point
 * farthest from the edge (a coarse pole of inaccessibility).
 */
export function labelPoint(rings: Ring[]): Pt {
  const main = rings.reduce((m, r) => (Math.abs(ringArea(r)) > Math.abs(ringArea(m)) ? r : m), rings[0] ?? []);
  const [x0, y0, x1, y1] = ringsBBox([main]);
  let best: Pt = [(x0 + x1) / 2, (y0 + y1) / 2], bestD = -1;
  const step = Math.max(x1 - x0, y1 - y0) / 24;
  if (!(step > 0)) return best;
  for (let y = y0 + step / 2; y < y1; y += step) for (let x = x0 + step / 2; x < x1; x += step) {
    if (!pointInRings(rings, x, y)) continue;
    let d = Infinity;
    for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[j]!, b = r[i]!, dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      const t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)) : 0;
      d = Math.min(d, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
    }
    if (d > bestD) { bestD = d; best = [x, y]; }
  }
  return best;
}

export interface LaIndexEntry { la: LocalAuthority; bbox: BBox; label: Pt }

export class LaIndex {
  readonly entries: LaIndexEntry[];
  readonly byCode = new Map<LaCode, LaIndexEntry>();
  /** Reading order for keyboard navigation: north to south in 30 km bands, west to east within a band. */
  readonly order: LaCode[];

  constructor(las: LocalAuthority[]) {
    this.entries = las.map((la) => ({ la, bbox: ringsBBox(la.rings), label: labelPoint(la.rings) }));
    for (const e of this.entries) this.byCode.set(e.la.code, e);
    this.order = [...this.entries]
      .sort((a, b) => Math.floor(a.label[1] / 30) - Math.floor(b.label[1] / 30) || a.label[0] - b.label[0])
      .map((e) => e.la.code);
  }

  /** The authority containing km point (x, y), or null. */
  at(x: number, y: number): LaCode | null {
    for (const e of this.entries) {
      const b = e.bbox;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (pointInRings(e.la.rings, x, y)) return e.la.code;
    }
    return null;
  }

  /** The nearest authority from `code` in a direction (by label points, within a 100 degree cone). */
  neighbour(code: LaCode, dir: "up" | "down" | "left" | "right"): LaCode | null {
    const from = this.byCode.get(code);
    if (!from) return null;
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    let best: LaCode | null = null, bestScore = Infinity;
    for (const e of this.entries) {
      if (e === from) continue;
      const dx = e.label[0] - from.label[0], dy = e.label[1] - from.label[1], d = Math.hypot(dx, dy);
      const cos = (dx * v[0]! + dy * v[1]!) / (d || 1);
      if (cos < Math.cos((50 * Math.PI) / 180)) continue;
      const score = d * (2 - cos);
      if (score < bestScore) { bestScore = score; best = e.la.code; }
    }
    return best;
  }
}
