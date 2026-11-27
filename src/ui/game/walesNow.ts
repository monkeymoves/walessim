// "Wales now" (cold playtest 6): at the start of each turn, the one real measure the game says has
// moved most since 2026, as a direction and a plain size (a game estimate, never a new figure), set
// beside its real value when the game began. Real values come from `la_data` and the atlas
// indicators; the estimate from the engine's component view. Pure: the slip only formats.
import { componentView, type GameState } from "../../engine/api";
import { bandScore } from "../../engine/scores";
import type { CompiledModel } from "../../model/schema";
import { indicatorsOf } from "./mapFacts";

export interface WalesMover {
  indicator: string;
  /** Direction of the measure itself (more flood risk is "up"). */
  dir: "up" | "down";
  size: "little" | "lot";
  /** True when the change is for the better. */
  better: boolean;
}

/** Score changes (0 to 10 points, people-weighted across Wales) below this are not news. */
const SAME = 0.15;
/** At or above this, "a lot". */
const LOT = 0.75;

/**
 * The measure that moved most across Wales since 2026, in the game's estimate, among those the game
 * follows place by place and the atlas can show with a Wales figure and a source. Null before
 * anything has happened, or when nothing moved enough to say.
 */
export function walesMover(model: CompiledModel, state: GameState): WalesMover | null {
  if (!state.history.length) return null;
  const inds = indicatorsOf(model);
  const pop = model.authorities.map((a) => a.population);
  const total = pop.reduce((a, b) => a + b, 0);
  let best: (WalesMover & { d: number }) | null = null;
  for (const comp of model.components) {
    const id = comp.indicator;
    const band = id ? model.bands.find((b) => b.indicator === id) : undefined;
    const data = id ? model.la_data[id]?.values : undefined;
    const ind = id ? inds.get(id) : undefined;
    if (!id || !band || !data || !ind || ind.wales == null || !ind.sources.length) continue;
    let view;
    try { view = componentView(model, state, comp.id); } catch { continue; }
    let then = 0, now = 0, w = 0;
    model.authorities.forEach((a, i) => {
      const v = data[a.code];
      const s = view.scores[i];
      if (v == null || s == null) return;
      then += bandScore(band, v) * pop[i]!;
      now += s * pop[i]!;
      w += pop[i]!;
    });
    if (!w || w < total / 2) continue;
    const d = (now - then) / w;
    if (Math.abs(d) < SAME || (best && Math.abs(d) <= Math.abs(best.d))) continue;
    // the band runs floor (score 0) to goal (score 10); the measure rises with the score when goal > floor
    const rises = band.goal > band.floor && !band.invert;
    best = { indicator: id, dir: (d > 0) === rises ? "up" : "down", size: Math.abs(d) >= LOT ? "lot" : "little", better: d > 0, d };
  }
  if (!best) return null;
  const { d: _d, ...out } = best;
  return out;
}
