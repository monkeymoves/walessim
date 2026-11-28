/**
 * Reading rule cards and their params by id. Engine code reads every balance number through
 * `param`, so tuning is a change to model/board/rules/*.yaml, never to code (ADR 0002).
 */
import { BoardModelError } from "./errors";
import type { BoardModel, BoardRule, RuleId } from "./types";

/** The rule card with this id. Throws `BoardModelError` if the model lacks it. */
export function rule(model: BoardModel, id: RuleId): BoardRule {
  const found = model.rules.find((r) => r.id === id);
  if (!found) throw new BoardModelError(`The board model has no rule ${id}`);
  return found;
}

/** A rule param's default value. Throws `BoardModelError` if the rule or the param is missing. */
export function param(model: BoardModel, id: RuleId, name: string): number {
  const p = rule(model, id).params[name];
  if (!p) throw new BoardModelError(`Rule ${id} has no param ${name}`);
  return p.default;
}

/** A rule param if the card has it, else undefined. For cards and params a model may not carry yet. */
export function optParam(model: BoardModel, id: RuleId, name: string): number | undefined {
  return model.rules.find((r) => r.id === id)?.params[name]?.default;
}
