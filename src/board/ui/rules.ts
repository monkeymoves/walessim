/** Reading a rule card's param in the UI (the engine's own `param` is internal to it). */
import type { BoardModel } from "../engine/api";

/** A rule param's default value, or `fallback` when the model does not carry it. */
export function ruleParamOf(model: BoardModel, id: string, name: string, fallback: number): number {
  return model.rules.find((r) => r.id === id)?.params[name]?.default ?? fallback;
}
