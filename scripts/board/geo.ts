/**
 * Plain geometry on the council outlines of public/data/wales-geo.json (km frame of CLAUDE.md):
 * which council a point lies in, a council's centre, and which councils share a border.
 * No dependencies, so the rail and fallback commute modules and their tests stay small.
 */
export type Pt = [number, number];

export interface GeoLa {
  code: string;
  en: string;
  rings: Pt[][];
}

export interface GeoTown {
  en: string;
  x: number;
  y: number;
  kind?: string;
}

export interface Geo {
  las: GeoLa[];
  towns: GeoTown[];
}

export interface Outline {
  code: string;
  rings: Pt[][];
  /** [minX, minY, maxX, maxY] */
  box: [number, number, number, number];
}

export function outlines(geo: Geo): Outline[] {
  return geo.las.map((la) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of la.rings) for (const [x, y] of r) {
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return { code: la.code, rings: la.rings, box: [minX, minY, maxX, maxY] };
  });
}

/** Even-odd test across every ring of the outline, so a hole is a hole. */
export function inside(o: Outline, [x, y]: Pt): boolean {
  if (x < o.box[0] || x > o.box[2] || y < o.box[1] || y > o.box[3]) return false;
  let hit = false;
  for (const ring of o.rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

/** The code of the council a point lies in, or null (sea, England, or the map buffer). */
export function councilAt(os: Outline[], p: Pt): string | null {
  for (const o of os) if (inside(o, p)) return o.code;
  return null;
}

/** Area weighted centre of the outline, rings of opposite turn cancelling as holes. */
export function centroid(o: Outline): Pt {
  let area = 0, cx = 0, cy = 0;
  for (const r of o.rings) {
    for (let i = 0; i < r.length; i++) {
      const [x0, y0] = r[i]!;
      const [x1, y1] = r[(i + 1) % r.length]!;
      const c = x0 * y1 - x1 * y0;
      area += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
    }
  }
  return [cx / (3 * area), cy / (3 * area)];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The centre used for labels and pulses: the town named like the council, else its first town,
 * else the outline's centre.
 */
export function centreOf(geo: Geo, o: Outline, names: string[]): Pt {
  for (const n of names) {
    const t = geo.towns.find((x) => x.en === n);
    if (t) return [round1(t.x), round1(t.y)];
  }
  const [x, y] = centroid(o);
  return [round1(x), round1(y)];
}

/** Two councils border each other when some vertex of one lies within `tol` km of a vertex of the other. */
export function borders(a: Outline, b: Outline, tol = 0.6): boolean {
  if (a.box[0] - tol > b.box[2] || b.box[0] - tol > a.box[2] || a.box[1] - tol > b.box[3] || b.box[1] - tol > a.box[3]) return false;
  const t2 = tol * tol;
  for (const ra of a.rings) for (const [x, y] of ra) {
    for (const rb of b.rings) for (const [u, v] of rb) {
      if ((x - u) ** 2 + (y - v) ** 2 <= t2) return true;
    }
  }
  return false;
}

/** Distance in km from a point to a polyline. */
export function distToLine(p: Pt, line: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < line.length; i++) {
    const [ax, ay] = line[i]!;
    const [bx, by] = line[i + 1]!;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / len2));
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  if (line.length === 1) best = Math.hypot(p[0] - line[0]![0], p[1] - line[0]![1]);
  return best;
}

/** Points along a polyline no further apart than `step` km. */
export function densify(line: Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const [ax, ay] = line[i]!;
    const [bx, by] = line[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  if (line.length > 0) out.push(line[line.length - 1]!);
  return out;
}
