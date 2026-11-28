/**
 * On the way: what is already in motion and not yet on the board. A project being built adds its
 * lifts once it opens; a working project whose lift beds in (`after_years`) or ramps up
 * (`ramp_years`) adds the rest as it grows into it. Both are worked out exactly as held.ts will
 * apply them (level, grade, R4 need, R1 roots as they stand now, pairs and laws), so what is shown
 * "on the way" is what arrives, if nothing else changes.
 *
 * Left for 2050 (score.ts) counts it, so the headline moves when a choice is made, not years later.
 * The screens draw it as the dashed "on the way" part of a council's bars.
 */
import { heldTargets, lawPassedStep } from "./held";
import { stepsOf } from "./time";
import type { BoardModel, BoardState, CouncilCode, Effect, MeasureId } from "./types";
import { MEASURE_IDS } from "./types";

/** Points still to come, per council and measure. Only non-zero entries are present. */
export type OnTheWay = Record<CouncilCode, Partial<Record<MeasureId, number>>>;

const isMeasure = (q: string): q is MeasureId => (MEASURE_IDS as readonly string[]).includes(q);

function measureTotals(targets: ReturnType<typeof heldTargets>): Map<string, number> {
  const out = new Map<string, number>();
  for (const h of targets) {
    if (!isMeasure(h.quantity)) continue;
    const k = `${h.council}|${h.quantity}`;
    out.set(k, (out.get(k) ?? 0) + h.target);
  }
  return out;
}

/**
 * What every standing project, pair and law will add once it is fully working, less what it adds
 * now. Projects being built count when they open by `lastStep` (default: the end of the game).
 */
export function onTheWay(model: BoardModel, state: BoardState, lastStep = model.game.steps): OnTheWay {
  const now = measureTotals(heldTargets(model, state, state.step));
  const settled: BoardState = {
    ...state,
    projects: state.projects.map((p) => (p.status === "building" && p.readyStep <= lastStep ? { ...p, status: "working" as const } : p)),
  };
  // Far enough on that every bedding in and ramp has run its course.
  const far = state.step + stepsOf(model, 100);
  const later = measureTotals(heldTargets(model, settled, far));
  const out: OnTheWay = {};
  for (const k of new Set([...now.keys(), ...later.keys()])) {
    const d = (later.get(k) ?? 0) - (now.get(k) ?? 0);
    if (Math.abs(d) < 1e-6) continue;
    const [council, measure] = k.split("|") as [CouncilCode, MeasureId];
    (out[council] ??= {})[measure] = Math.round(d * 1e4) / 1e4;
  }
  return out;
}

/** Steps from a cause's start until a measure lift of it is at full size (bedding in, then ramp). */
function fullAfter(model: BoardModel, effects: readonly Effect[]): number {
  let most = 0;
  for (const e of effects) {
    if (e.kind !== "measure") continue;
    most = Math.max(most, stepsOf(model, e.after_years ?? 0) + Math.max(0, stepsOf(model, e.ramp_years ?? 0) - 1));
  }
  return most;
}

/**
 * The step the last of what is on the way lands: the latest of each project being built (opening
 * by `lastStep`) and each lift still bedding in or ramping, at full size. Null when nothing is on the way.
 */
export function lastArrival(model: BoardModel, state: BoardState, lastStep = model.game.steps): number | null {
  let last: number | null = null;
  const note = (step: number) => {
    if (step > state.step) last = Math.max(last ?? step, step);
  };
  for (const p of state.projects) {
    const def = model.projects.find((d) => d.id === p.project);
    if (!def || p.status === "run_down" || (p.status === "building" && p.readyStep > lastStep)) continue;
    // a build works from the step after `readyStep` (the step at whose end it opens), as every screen says
    if (p.status === "building") note(p.readyStep + 1);
    note(p.readyStep + 1 + fullAfter(model, def.effects));
  }
  for (const id of state.laws) {
    const law = model.laws.find((l) => l.id === id);
    if (law) note(lawPassedStep(state, id) + fullAfter(model, law.effects));
  }
  return last;
}
