/**
 * Rail links, derived at build from model/data/wales-rail.json crossed with the council outlines
 * (docs/design/v2-board.md section 4.2).
 *
 * Method. Every main (passenger line) way is sampled every 0.2 km into a track graph; ways that
 * meet within 0.8 km are joined, whatever they are named (OSM names are patchy). Each station is
 * snapped to track within 0.6 km. Two councils in play are linked when a path of track that
 * stays inside those two councils (or the gaps in the outlines) runs from a station in one to a
 * station in the other. That is all a rail link means: a line with stations runs between them,
 * not a timetable. Heritage and tourist lines are not in the graph.
 *
 * Direction: `from` is the council further west (then further north), a stable "line order".
 * Quality is 1 (as now). The link carries the name that appears most often along the path.
 */
import type { LinkDef, Text } from "../../src/board/engine/types";
import { councilAt, densify, type Outline, type Pt } from "./geo";

export interface RailData {
  lines: { kind: string; name: string | null; coords: Pt[] }[];
  stations: { name: string; cy?: string; x: number; y: number }[];
}

/** Welsh names of the lines in the South East. Anything else keeps its OSM name, flagged for review. */
const LINE_CY: Record<string, string> = {
  "South Wales Main Line": "Prif Linell De Cymru",
  "Cardiff and Merthyr Line": "Llinell Caerdydd a Merthyr",
  "Merthyr Line - Aberdare Branch": "Llinell Merthyr, cangen Aberdâr",
  "Aberdare Branch": "Cangen Aberdâr",
  "Rhondda Line": "Llinell Rhondda",
  "Rhymney Line": "Llinell Rhymni",
  "Bassaleg Junction and Rhymney Line": "Llinell Rhymni a Chyffordd Basaleg",
  "Ebbw Valley Line": "Llinell Cwm Ebwy",
  "Vale of Glamorgan Line": "Llinell Bro Morgannwg",
  "Maesteg Line": "Llinell Maesteg",
  "Cardiff City Line": "Llinell Dinas Caerdydd",
  "Welsh Marches Line": "Llinell Gororau Cymru",
  "Hereford and Newport Line": "Llinell Henffordd a Chasnewydd",
  "Gloucester to Newport Line": "Llinell Caerloyw i Gasnewydd",
  "Valley Lines": "Llinellau'r Cymoedd",
};

/** Names that describe a bit of track, not a line: never chosen as the link's name if another exists. */
const PART_OF_LINE = /tunnel|loop|curve|platform|junction$|^up |^down |dock|branch$/i;

const STEP_KM = 0.2;
/** The data has gaps of up to about 0.65 km between ways of one line (crossings, clipping). */
const JOIN_KM = 0.8;
const SNAP_KM = 0.6;

export interface RailInput {
  data: RailData;
  outlines: Outline[];
  /** Councils in play, in display order, with the slug used in ids and their centre for line order. */
  councils: { code: string; slug: string; centre: Pt }[];
}

export interface RailResult {
  links: LinkDef[];
  /** Stations inside each council in play. */
  stations: Record<string, number>;
}

interface Graph {
  pts: Pt[];
  code: (string | null)[];
  name: (string | null)[];
  adj: number[][];
  grid: Map<string, number[]>;
}

const cell = (p: Pt, size: number) => `${Math.floor(p[0] / size)},${Math.floor(p[1] / size)}`;

function buildGraph(data: RailData, outlines: Outline[]): Graph {
  const g: Graph = { pts: [], code: [], name: [], adj: [], grid: new Map() };
  for (const l of data.lines) {
    if (l.kind !== "main") continue;
    let prev = -1;
    for (const p of densify(l.coords, STEP_KM)) {
      const i = g.pts.length;
      g.pts.push(p);
      g.code.push(councilAt(outlines, p));
      g.name.push(l.name);
      g.adj.push([]);
      const key = cell(p, JOIN_KM);
      (g.grid.get(key) ?? g.grid.set(key, []).get(key)!).push(i);
      if (prev >= 0) { g.adj[prev]!.push(i); g.adj[i]!.push(prev); }
      prev = i;
    }
  }
  // Join track that meets, across ways and names.
  for (let i = 0; i < g.pts.length; i++) {
    const [x, y] = g.pts[i]!;
    const cx = Math.floor(x / JOIN_KM), cy = Math.floor(y / JOIN_KM);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const j of g.grid.get(`${cx + dx},${cy + dy}`) ?? []) {
        if (j > i && Math.hypot(g.pts[j]![0] - x, g.pts[j]![1] - y) <= JOIN_KM && !g.adj[i]!.includes(j)) { g.adj[i]!.push(j); g.adj[j]!.push(i); }
      }
    }
  }
  return g;
}

/** The nearest track point to a station within SNAP_KM, or -1. */
function snap(g: Graph, p: Pt): number {
  let best = -1, bd = SNAP_KM;
  const r = Math.ceil(SNAP_KM / JOIN_KM);
  const cx = Math.floor(p[0] / JOIN_KM), cy = Math.floor(p[1] / JOIN_KM);
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    for (const j of g.grid.get(`${cx + dx},${cy + dy}`) ?? []) {
      const d = Math.hypot(g.pts[j]![0] - p[0], g.pts[j]![1] - p[1]);
      if (d <= bd) { bd = d; best = j; }
    }
  }
  return best;
}

function lineName(g: Graph, path: number[]): string {
  const counts = new Map<string, number>();
  for (const i of path) { const n = g.name[i]; if (n) counts.set(n, (counts.get(n) ?? 0) + 1); }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return (ranked.find(([n]) => !PART_OF_LINE.test(n)) ?? ranked[0] ?? ["Railway line", 0])[0];
}

export function deriveRailLinks(input: RailInput): RailResult {
  const { data, outlines, councils } = input;
  const g = buildGraph(data, outlines);
  const stations: Record<string, number> = Object.fromEntries(councils.map((c) => [c.code, 0]));
  const stationNodes: Record<string, Set<number>> = Object.fromEntries(councils.map((c) => [c.code, new Set<number>()]));
  for (const s of data.stations) {
    const code = councilAt(outlines, [s.x, s.y]);
    if (!code || stations[code] === undefined) continue;
    stations[code]!++;
    const node = snap(g, [s.x, s.y]);
    if (node >= 0) stationNodes[code]!.add(node);
  }

  const links: LinkDef[] = [];
  for (let a = 0; a < councils.length; a++) {
    for (let b = a + 1; b < councils.length; b++) {
      const A = councils[a]!, B = councils[b]!;
      const allowed = (i: number) => g.code[i] === null || g.code[i] === A.code || g.code[i] === B.code;
      // Breadth first from every station in A, through track that stays inside A and B.
      const from = new Map<number, number>();
      const queue: number[] = [];
      for (const n of stationNodes[A.code]!) if (allowed(n)) { from.set(n, -1); queue.push(n); }
      let hit = -1;
      for (let q = 0; q < queue.length && hit < 0; q++) {
        const i = queue[q]!;
        if (stationNodes[B.code]!.has(i)) { hit = i; break; }
        for (const j of g.adj[i]!) if (!from.has(j) && allowed(j)) { from.set(j, i); queue.push(j); }
      }
      if (hit < 0) continue;
      const path: number[] = [];
      for (let i = hit; i >= 0; i = from.get(i)!) path.push(i);
      const line = lineName(g, path);
      const [w, e] = A.centre[0] !== B.centre[0] ? (A.centre[0] < B.centre[0] ? [A, B] : [B, A]) : A.centre[1] < B.centre[1] ? [A, B] : [B, A];
      const name: Text = { en: line, cy: LINE_CY[line] ?? line, cy_review: true };
      links.push({
        id: `rail:${w.slug}-${e.slug}`, kind: "rail", from: w.code, to: e.code, name, quality: 1,
        honesty: "real", sources: ["osm_rail_wales", "ons_lad_boundaries"],
      });
    }
  }
  return { links, stations };
}
