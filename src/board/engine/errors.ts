/** Typed errors of the board engine. */
import type { Blocker } from "./types";

/** Thrown by `act` for an action that is not allowed now. Carries the same blockers `options` gives. */
export class BoardActionError extends Error {
  constructor(public readonly blockers: Blocker[], message = "That action is not allowed now") {
    super(message);
    this.name = "BoardActionError";
  }
}

/** Thrown when a run code or save cannot be read, or was made with a different model. */
export class BoardRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoardRunError";
  }
}

/** Thrown when the model breaks an engine assumption (a missing rule id, an unknown council). */
export class BoardModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoardModelError";
  }
}
