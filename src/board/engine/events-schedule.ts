/**
 * The future and its outside trouble (docs/design/v2-board.md section 7.2 and the fairness rule of
 * 7.3). Everything here is a pure function of the model and the game number's seed, so the same
 * game number always draws the same future and the same outside events at the same steps.
 *
 * Fairness rule 2: every game number draws between E1 `min` and `max` severity points of outside
 * trouble. Only the kind and the timing differ, and they follow the future's tracks.
 */
import { uniform } from "../../engine/rng";
import { param } from "./rules";
import { ruleParam } from "./rule-defaults";
import { lastLandingStep, seasonOf, stepOfBlock, stepsOf } from "./time";
import type { BoardModel, EventDef, EventId, FutureDef, FutureId, Season } from "./types";
import { RULE_IDS } from "./types";

/** The future for a game number, drawn from its seed. */
export function drawFuture(model: BoardModel, seed: number): FutureId {
  const i = Math.floor(uniform(seed, "future") * model.futures.length);
  return model.futures[Math.min(i, model.futures.length - 1)]!.id;
}

export interface ScheduledEvent {
  event: EventId;
  /** The two year block (`game.track_years`) it falls in: one track value per block. */
  block: number;
  /** The landing step: a seeded step inside the block. */
  step: number;
  severity: number;
}

/** Does the future meet the event's track conditions in this block? */
function trackMet(e: EventDef, f: FutureDef, block: number): boolean {
  return e.trigger.every((c) => c.kind !== "track" || ((f.tracks[c.track][block] ?? 0) >= c.at_least) !== !!c.not);
}

/** Storms (the weather track) land in these seasons (16.2.4). */
const STORM_SEASONS: readonly Season[] = ["autumn", "winter"];

/**
 * The landing step of an outside event in a block: a seeded step inside the block. A weather event
 * lands in autumn or winter; when a step is longer than a season (the two year step of the
 * equivalence test) every step of the block is allowed. Never the game's final step.
 */
function landingStep(model: BoardModel, seed: number, block: number, e: EventDef): number {
  const span = Math.max(1, stepsOf(model, model.game.track_years));
  const first = stepOfBlock(model, block);
  const all = Array.from({ length: span }, (_, i) => first + i).filter((s) => s <= lastLandingStep(model));
  const stormy = e.track === "weather" ? all.filter((s) => STORM_SEASONS.includes(seasonOf(model, s))) : [];
  const steps = stormy.length > 0 && stepsOf(model, 1) >= model.game.seasons.length ? stormy : all;
  return steps[Math.min(steps.length - 1, Math.floor(uniform(seed, "landing", block) * steps.length))]!;
}

/**
 * The outside events of a game: at most one in each two year block from E1 `first_year`, drawn in
 * proportion to the future's track in that block (a weighted draw by the seed), until the severity
 * reaches E1 `min` without passing `max`. If the tracks are too quiet to reach `min`, events are
 * added in blocks where their track is lower, still in proportion. Each lands on a seeded step
 * inside its block (storms in autumn or winter).
 */
export function outsideSchedule(model: BoardModel, seed: number, futureId: FutureId): ScheduledEvent[] {
  const future = model.futures.find((f) => f.id === futureId);
  if (!future) return [];
  const min = param(model, RULE_IDS.severity, "min");
  const max = param(model, RULE_IDS.severity, "max");
  const firstBlock = Math.max(0, Math.round((ruleParam(model, RULE_IDS.severity, "first_year") - model.game.first_year) / model.game.track_years));
  const blocks = Math.round((model.game.end_year - model.game.first_year) / model.game.track_years);
  const outside = model.events.filter((e) => e.origin === "outside" && e.track && e.severity > 0);
  type Cand = Omit<ScheduledEvent, "step"> & { key: number; met: boolean };
  const cands: Cand[] = [];
  for (let b = firstBlock; b < blocks; b++) {
    for (const e of outside) {
      const value = Math.max(1e-6, future.tracks[e.track!][b] ?? 0);
      // Efraimidis and Spirakis: a seeded draw where a higher track value is proportionally likelier.
      const key = Math.pow(uniform(seed, "outside", b, e.id), 1 / value);
      cands.push({ event: e.id, block: b, severity: e.severity, key, met: trackMet(e, future, b) });
    }
  }
  const order = (a: Cand, b: Cand) => Number(b.met) - Number(a.met) || b.key - a.key || a.block - b.block || a.event.localeCompare(b.event);
  cands.sort(order);
  const picked: ScheduledEvent[] = [];
  const used = new Set<number>();
  let total = 0;
  for (const c of cands) {
    if (total >= min) break;
    if (used.has(c.block) || total + c.severity > max) continue;
    picked.push({ event: c.event, block: c.block, step: landingStep(model, seed, c.block, outside.find((e) => e.id === c.event)!), severity: c.severity });
    used.add(c.block);
    total += c.severity;
  }
  return picked.sort((a, b) => a.step - b.step);
}

/** Total outside severity a game number draws (fairness rule 2: always E1 `min` to `max`). */
export function scheduledSeverity(model: BoardModel, seed: number, futureId: FutureId): number {
  return outsideSchedule(model, seed, futureId).reduce((a, s) => a + s.severity, 0);
}
