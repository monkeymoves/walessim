/**
 * The board's links as the paper map draws them (PaperMap.setLinks), and the map colouring
 * ("Colour the map by") as a lens. Pure functions of model and state, tested in mapLinks.test.ts.
 */
import type { LensSpec } from "../../map";
import type { MapLink } from "../../map/PaperMap";
import { STRAND_RAMPS } from "../../ui/atlas/ramps";
import type { BoardModel, BoardState, CouncilCode, LinkDef, MeasureId, NodeId } from "../engine/api";
import { MEASURE_IDS } from "../engine/api";
import type { ColourBy } from "./game";

/** Each measure is drawn in the colour of the v1 goal it grew from (plain-wales.md section 1.2). */
export const MEASURE_RAMP: Record<MeasureId, keyof typeof STRAND_RAMPS> = {
  work: "prosperous", homes: "cohesive", health: "healthier", nature: "resilient", welsh: "culture", climate: "global",
};
/** The yarn token behind each measure, for bars (docs/design/tokens.css section 6). */
export const MEASURE_YARN: Record<MeasureId, string> = {
  work: "prosperous", homes: "cohesive", health: "healthier", nature: "resilient", welsh: "culture", climate: "global",
};

/** Line weight 1 to 3: rail quality, or a commuting share step (under 7 in 100, under 15, more). */
export function linkWeight(l: LinkDef, quality?: number): number {
  if (l.kind === "rail") return quality ?? l.quality ?? 1;
  if (l.kind === "river") return 2;
  if (l.share !== undefined) return l.share >= 0.15 ? 3 : l.share >= 0.07 ? 2 : 1;
  return l.strength ?? 1;
}

function end(model: BoardModel, node: NodeId): MapLink["from"] | null {
  if (model.game.councils.includes(node)) return { la: node };
  const stub = model.stubs.find((s) => s.id === node) ?? model.councils.find((c) => c.code === node);
  if (!stub) return null;
  return { x: stub.centre[0], y: stub.centre[1] };
}

/**
 * The links worth drawing now, so the map never turns to string: with no council selected, the
 * rail and river network faintly; with one selected, every link it has; a preview's links lit as
 * the player's running stitch whatever else is shown. Commuting links appear only for a selection.
 */
export function linksFor(model: BoardModel, state: BoardState | null, selected: CouncilCode | null = null, lit: string[] = []): MapLink[] {
  const out: MapLink[] = [];
  for (const l of model.links) {
    if (!model.game.councils.includes(l.from) && !model.game.councils.includes(l.to)) continue;
    const from = end(model, l.from), to = end(model, l.to);
    if (!from || !to) continue;
    const isLit = lit.includes(l.id);
    const mine = !!selected && (l.from === selected || l.to === selected);
    if (!isLit && !mine && (selected || l.kind === "commute")) continue;
    out.push({
      id: l.id, from, to, kind: l.kind,
      weight: linkWeight(l, state?.linkQuality[l.id]),
      state: isLit ? "lit" : mine ? "rest" : "dim",
    });
  }
  return out;
}

/** People-weighted mean of a measure over the councils in play (the Wales bars). */
export function walesMean(state: BoardState, measure: MeasureId): number {
  let sum = 0, pop = 0;
  for (const c of Object.values(state.councils)) { sum += c.measures[measure] * c.pop; pop += c.pop; }
  return pop ? sum / pop : 0;
}

/** A council's mean over the six measures, for "who is behind". */
export const councilMean = (state: BoardState, code: CouncilCode): number => {
  const c = state.councils[code];
  return c ? MEASURE_IDS.reduce((a, m) => a + c.measures[m], 0) / MEASURE_IDS.length : 0;
};

/** The lens for "Colour the map by", or null for the plain relief. */
export function lensFor(model: BoardModel, state: BoardState, by: ColourBy, backsAt: number): LensSpec | null {
  if (by === "none") return null;
  const values: Record<string, number> = {};
  if (by === "backing") {
    for (const code of model.game.councils) values[code] = state.councils[code]?.backing ?? 0;
    // spread the colours over the few points either side of the line, where backing really moves
    return { values, domain: [backsAt - 2.5, backsAt + 2.5], ramp: "diverging", higherIsBetter: true, centre: backsAt };
  }
  if (by === "behind") {
    for (const code of model.game.councils) values[code] = councilMean(state, code);
    const sorted = Object.values(values).sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)] ?? 5;
    const span = Math.max(0.5, ...sorted.map((v) => Math.abs(v - mid)));
    return { values, domain: [mid - span, mid + span], ramp: "diverging", higherIsBetter: true, centre: mid };
  }
  for (const code of model.game.councils) values[code] = state.councils[code]?.measures[by] ?? 0;
  return { values, domain: [0, 10], ramp: "sequential", higherIsBetter: true, stops: [...STRAND_RAMPS[MEASURE_RAMP[by]]] };
}

/** A backing threshold from the P4 rule card (default 5, the design's starting value). */
export const backsAtOf = (model: BoardModel): number => model.rules.find((r) => r.id === "P4")?.params["backs_at"]?.default ?? 5;
