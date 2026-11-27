// Label clearance for the national sheet: when Wales is drawn small (a panel and a card open beside
// it), town names, hills and seas would print over each other. A label is kept only if its box is
// clear of every label already kept and of other towns' houses; cities go first and always stay.

export type Box = [number, number, number, number];

export const overlaps = (a: Box, b: Box): boolean => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** The box of a line of text set at (x, y) on its baseline, given its measured width and size. */
export function textBox(x: number, y: number, width: number, size: number, align: CanvasTextAlign, pad = 2): Box {
  const l = align === "center" ? x - width / 2 : align === "end" || align === "right" ? x - width : x;
  return [l - pad, y - size * 0.8 - pad, l + width + pad, y + size * 0.25 + pad];
}

/** Indexes of the labels to keep, in order of priority: `always` ones stay, the rest must be clear. */
export function clearLabels(labels: { box: Box; always?: boolean; own?: number }[], obstacles: { box: Box; owner?: number }[] = []): Set<number> {
  const kept = new Set<number>();
  const placed: Box[] = [];
  labels.forEach((l, i) => {
    const free = l.always || (!placed.some((b) => overlaps(b, l.box)) && !obstacles.some((o) => o.owner !== l.own && overlaps(o.box, l.box)));
    if (free) { kept.add(i); placed.push(l.box); }
  });
  return kept;
}
