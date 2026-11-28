/**
 * Where the map's own words sit (playtest 8, must-fix 9: "Sum Sum Summer 2037", "Working:
 * Working:", rings marching into the sea). Builds under way are grouped one ring per site, so a
 * council with five builds shows one ring and a count, not five rings in a row. Every slip of words
 * is then nudged down (or up, for words above a council's name) until it clears the ones already
 * placed, so no two overlap and none slides onto the name below it.
 */

/** A slip of words on the map, before and after layout. `x` is its left edge, or its middle when `centre`. */
export interface Slip {
  key: string;
  x: number;
  y: number;
  text: string;
  centre?: boolean;
  /** Lower goes first and keeps its place. */
  rank: number;
  /** Move up, not down, to clear: for words that sit above a council's name, so they never slide onto it. */
  up?: boolean;
}

export interface Placed extends Slip {
  /** The box it takes, left, top, right, bottom, in host pixels. */
  box: [number, number, number, number];
}

/** A rough width of a line of small text: the map's slips are one short line each. */
export const widthOf = (text: string): number => text.length * 6.4 + 10;
const HEIGHT = 17;

const boxOf = (s: Slip, y: number): Placed["box"] => {
  const w = widthOf(s.text);
  const left = s.centre ? s.x - w / 2 : s.x;
  return [left, y, left + w, y + HEIGHT];
};

const overlaps = (a: Placed["box"], b: Placed["box"]): boolean => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** Lay the slips out, most important first; each moves a line at a time until it is clear. */
export function layoutSlips(slips: Slip[]): Placed[] {
  const out: Placed[] = [];
  for (const s of [...slips].sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key))) {
    let y = s.y;
    let box = boxOf(s, y);
    const step = s.up ? -(HEIGHT + 1) : HEIGHT + 1;
    for (let i = 0; i < 40 && out.some((p) => overlaps(p.box, box)); i++) { y += step; box = boxOf(s, y); }
    out.push({ ...s, y, box });
  }
  return out;
}

/** Group items by a key, keeping the order they came in. */
export function groupBy<T>(items: readonly T[], key: (t: T) => string): T[][] {
  const m = new Map<string, T[]>();
  for (const it of items) { const k = key(it); const g = m.get(k); if (g) g.push(it); else m.set(k, [it]); }
  return [...m.values()];
}
