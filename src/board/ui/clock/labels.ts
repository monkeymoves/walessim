/**
 * Labels on the time line's middle row never overlap (cold playtest 10, must fix 11: "Keystones:
 * start by here" ran into "Deal", pupil g2-40). The layout (../timelineLayout.ts) gave every label
 * the same short share of the strip and measured from its start only, but the keystone label is
 * long, a warning's council name hangs after its block, and a label near 2050 hangs to the left.
 * This places each label by its real extent, from the words it shows and the width of the track:
 * a label is shown only where it meets no label already shown and no other warning's block. Pure,
 * tested in labels.test.ts; tests/e2e/board-fix3.spec.ts measures the drawn boxes.
 */
import type { TimelineItem } from "../timelineLayout";

/** Past this share of the strip a label hangs to the left of its mark (clock.css `.late`). */
export const LATE = 0.86;

type Labelled = Extract<TimelineItem, { kind: "warning" | "mark" }>;

/** Where a label would sit, as shares of the strip, or null for a piece that shows no label. */
export function labelSpan(i: TimelineItem, width: number): [number, number] | null {
  if (i.kind === "warning") return i.from > LATE ? [i.from - width, i.from] : [i.to, i.to + width];
  if (i.kind === "mark") {
    if (i.mark === "end") return null;
    return i.at > LATE ? [i.at - width, i.at] : [i.at, i.at + width];
  }
  return null;
}

const meets = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

/**
 * The items with `labelled` set so no two labels meet, and no label meets another warning's block.
 * `widthOf` gives a label's width as a share of the strip. Earlier pieces keep their label first.
 */
export function placeLabels(items: readonly TimelineItem[], widthOf: (i: Labelled) => number): TimelineItem[] {
  const blocks = items.filter((i): i is Extract<TimelineItem, { kind: "warning" }> => i.kind === "warning").map((w) => ({ key: w.key, span: [w.from, w.to] as [number, number] }));
  const placed: [number, number][] = [];
  return items.map((i) => {
    if (i.kind !== "warning" && i.kind !== "mark") return i;
    const span = labelSpan(i, widthOf(i));
    if (!span) return { ...i, labelled: false };
    const free = span[0] >= 0 && span[1] <= 1.0001 && !placed.some((p) => meets(p, span)) && !blocks.some((b) => b.key !== i.key && meets(b.span, span));
    if (free) placed.push(span);
    return { ...i, labelled: free };
  });
}

/** A label's width in pixels from its words: 11.5px grotesk, with its tick and padding. Generous, so labels never touch. */
export const labelPx = (words: string): number => words.length * 6.6 + 12;
