/**
 * The future and its outside trouble (docs/design/v2-board.md section 7.2 and the fairness rule of
 * 7.3). Everything here is a pure function of the model and the game number's seed, so the same
 * game number always draws the same future and the same outside events at the same turns.
 *
 * Fairness rule 2: every game number draws between E1 `min` and `max` severity points of outside
 * trouble. Only the kind and the timing differ, and they follow the future's tracks.
 */
import { uniform } from "../../engine/rng";
import { param } from "./rules";
import { ruleParam } from "./rule-defaults";
import type { BoardModel, EventDef, EventId, FutureDef, FutureId } from "./types";
import { RULE_IDS } from "./types";

/** The future for a game number, drawn from its seed. */
export function drawFuture(model: BoardModel, seed: number): FutureId {
  const i = Math.floor(uniform(seed, "future") * model.futures.length);
  return model.futures[Math.min(i, model.futures.length - 1)]!.id;
}

export interface ScheduledEvent {
  event: EventId;
  turn: number;
  severity: number;
}

/** Does the future meet the event's track conditions at this turn? */
function trackMet(e: EventDef, f: FutureDef, turn: number): boolean {
  return e.trigger.every((c) => c.kind !== "track" || ((f.tracks[c.track][turn] ?? 0) >= c.at_least) !== !!c.not);
}

/**
 * The outside events of a game: at most one a turn from E1 `first_turn`, drawn in proportion to
 * the future's track that turn (a weighted draw by the seed), until the severity reaches E1 `min`
 * without passing `max`. If the tracks are too quiet to reach `min`, events are added on turns
 * where their track is lower, still in proportion.
 */
export function outsideSchedule(model: BoardModel, seed: number, futureId: FutureId): ScheduledEvent[] {
  const future = model.futures.find((f) => f.id === futureId);
  if (!future) return [];
  const min = param(model, RULE_IDS.severity, "min");
  const max = param(model, RULE_IDS.severity, "max");
  const first = ruleParam(model, RULE_IDS.severity, "first_turn");
  const outside = model.events.filter((e) => e.origin === "outside" && e.track && e.severity > 0);
  type Cand = ScheduledEvent & { key: number; met: boolean };
  const cands: Cand[] = [];
  for (let t = first; t < model.game.turns; t++) {
    for (const e of outside) {
      const value = Math.max(1e-6, future.tracks[e.track!][t] ?? 0);
      // Efraimidis and Spirakis: a seeded draw where a higher track value is proportionally likelier.
      const key = Math.pow(uniform(seed, "outside", t, e.id), 1 / value);
      cands.push({ event: e.id, turn: t, severity: e.severity, key, met: trackMet(e, future, t) });
    }
  }
  const order = (a: Cand, b: Cand) => Number(b.met) - Number(a.met) || b.key - a.key || a.turn - b.turn || a.event.localeCompare(b.event);
  cands.sort(order);
  const picked: ScheduledEvent[] = [];
  const used = new Set<number>();
  let total = 0;
  for (const c of cands) {
    if (total >= min) break;
    if (used.has(c.turn) || total + c.severity > max) continue;
    picked.push({ event: c.event, turn: c.turn, severity: c.severity });
    used.add(c.turn);
    total += c.severity;
  }
  return picked.sort((a, b) => a.turn - b.turn);
}

/** Total outside severity a game number draws (fairness rule 2: always E1 `min` to `max`). */
export function scheduledSeverity(model: BoardModel, seed: number, futureId: FutureId): number {
  return outsideSchedule(model, seed, futureId).reduce((a, s) => a + s.severity, 0);
}
