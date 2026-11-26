// Strand yarns: dye, deep colour and twist pattern per strand, as CSS variables, plus the
// weave trim tile for tickets. Values mirror docs/design/tokens.css (section 6).
import type { JSX } from "solid-js";
import { STRAND_IDS, type StrandId } from "../../model/schema";

export { STRAND_IDS };
export type { StrandId };

/** CSS variables for a strand: --c (yarn), --cd (deep), --tw (twist). */
export function strandVars(id: StrandId): JSX.CSSProperties {
  return { "--c": `var(--yarn-${id})`, "--cd": `var(--yarn-${id}-deep)`, "--tw": `var(--twist-${id})` };
}

/** Yarn hex values, for SVG data URLs where CSS variables cannot reach. */
export const YARN_HEX: Record<StrandId, string> = {
  prosperous: "#D9A21B",
  resilient: "#2F6B3F",
  healthier: "#55B0A6",
  equal: "#A56BB0",
  cohesive: "#C7725E",
  culture: "#232C63",
  global: "#8FC0E0",
};

/**
 * The carthen weave trim: a stepped diamond on a 12 unit tile, pixel sharp.
 * Ground is the first strand a card strengthens, the centre square the second, the diamond paper.
 */
export function weaveUrl(first: StrandId | undefined, second: StrandId | undefined): string {
  const g = first ? YARN_HEX[first] : "#80857D";
  const c = second ? YARN_HEX[second] : g;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' shape-rendering='crispEdges'>` +
    `<rect width='12' height='12' fill='${g}'/>` +
    `<path fill='#F5F3EA' d='M4 0h4v2h-4zM2 2h8v2h-8zM0 4h4v4h-4zM8 4h4v4h-4zM2 8h8v2h-8zM4 10h4v2h-4z'/>` +
    `<rect x='4' y='4' width='4' height='4' fill='${c}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
