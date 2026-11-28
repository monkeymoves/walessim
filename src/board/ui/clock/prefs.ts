/**
 * The player's clock settings (docs/design/v2-board.md 16.2.2 and 16.2.5): which soft stops pause
 * the clock, "hold the clock while I read", step by step mode and the speed. Saved under the
 * board's own key `<save_key>prefs`, set and removed singly. The engine never reads these: a run
 * does not depend on them.
 */
import type { BoardModel, StopKind } from "../../engine/api";
import { STOP_KINDS } from "../../engine/api";

export interface Prefs {
  /** Soft stops that pause the clock. Hard stops always do. */
  stops: Partial<Record<StopKind, boolean>>;
  /** Opening the build menu, the tree, the laws, settings or a Why? holds the clock. */
  holdWhileReading: boolean;
  /** No running clock: "Next season" and "Run to the next moment" only. */
  stepByStep: boolean;
  /** The speed a game starts at, a speed id from `game.speeds`. The speed picked during a game is not saved (cold playtest 9: it carried over to the next game). */
  speed: string;
}

/** True when the stop kind can never be switched off. */
export const isHard = (model: BoardModel, kind: StopKind): boolean => !!model.game.stops?.[kind]?.hard;

/** Soft stops in the order the settings sheet lists them (16.2.5). */
export const softStops = (model: BoardModel): StopKind[] => STOP_KINDS.filter((k) => !isHard(model, k));

/** The defaults: soft stops from game.yaml, step by step when the player asked the system for reduced motion. */
export function defaultPrefs(model: BoardModel, reducedMotion: boolean): Prefs {
  const stops: Partial<Record<StopKind, boolean>> = {};
  for (const k of softStops(model)) stops[k] = !!model.game.stops?.[k]?.on;
  const speed = model.game.speeds.some((s) => s.id === model.game.default_speed) ? model.game.default_speed : (model.game.speeds[0]?.id ?? "steady");
  return { stops, holdWhileReading: true, stepByStep: reducedMotion, speed };
}

/** Saved prefs over the defaults; anything unreadable or unknown falls back to the default. */
export function readPrefs(model: BoardModel, raw: string | null, reducedMotion: boolean): Prefs {
  const base = defaultPrefs(model, reducedMotion);
  if (!raw) return base;
  try {
    const v = JSON.parse(raw) as Partial<Prefs>;
    const stops = { ...base.stops };
    for (const k of softStops(model)) if (typeof v.stops?.[k] === "boolean") stops[k] = v.stops[k];
    return {
      stops,
      holdWhileReading: typeof v.holdWhileReading === "boolean" ? v.holdWhileReading : base.holdWhileReading,
      stepByStep: typeof v.stepByStep === "boolean" ? v.stepByStep : base.stepByStep,
      speed: model.game.speeds.some((s) => s.id === v.speed) ? v.speed! : base.speed,
    };
  } catch {
    return base;
  }
}

/** Does this stop pause the clock with these prefs? */
export const pausesOn = (model: BoardModel, prefs: Prefs, kind: StopKind): boolean => isHard(model, kind) || !!prefs.stops[kind];

/** The soft stop kinds switched on, for `advance(..., { stopOn })`. */
export const stopOnList = (model: BoardModel, prefs: Prefs): StopKind[] => softStops(model).filter((k) => prefs.stops[k]);

/** Milliseconds a step lasts at a speed. */
export function msPerStep(model: BoardModel, speed: string): number {
  return model.game.speeds.find((s) => s.id === speed)?.ms_per_step ?? model.game.speeds[0]?.ms_per_step ?? 3000;
}
