/**
 * The board engine as the screens call it. Each call goes to the real API (../engine/api.ts) and,
 * only while that module throws `BoardNotBuiltError`, to the practice stand-in in ./standin.
 * `standIns()` lists the functions that fell back, so the board can say so on screen.
 */
import { createRoot, createSignal } from "solid-js";
import * as api from "../engine/api";
import type {
  Action, ActionOption, BoardModel, BoardState, CouncilCode, CouncilView, ElectionView, Ending, Forecast, Preview,
  StartId, TurnReport, Why, WhyTarget,
} from "../engine/api";
import * as sb from "./standin/build";
import * as st from "./standin/turn";

const store = createRoot(() => {
  const [used, setUsed] = createSignal<string[]>([]);
  return { used, setUsed };
});

/** API functions currently played by the stand-in. */
export const standIns = store.used;

function via<T>(name: string, real: () => T, fallback: () => T): T {
  try {
    return real();
  } catch (e) {
    if (!(e instanceof api.BoardNotBuiltError)) throw e;
    if (!store.used().includes(name)) store.setUsed([...store.used(), name]);
    return fallback();
  }
}

export const newBoard = (m: BoardModel, n: number | string, s: StartId): BoardState => via("newBoard", () => api.newBoard(m, n, s), () => sb.newBoard(m, n, s));
export const options = (m: BoardModel, s: BoardState, c?: CouncilCode): ActionOption[] => via("options", () => api.options(m, s, c), () => sb.options(m, s, c));
export const preview = (m: BoardModel, s: BoardState, a: Action): Preview => via("preview", () => api.preview(m, s, a), () => sb.preview(m, s, a));
export const act = (m: BoardModel, s: BoardState, a: Action): BoardState => via("act", () => api.act(m, s, a), () => sb.act(m, s, a));
export const endTurn = (m: BoardModel, s: BoardState): { state: BoardState; report: TurnReport } => via("endTurn", () => api.endTurn(m, s), () => st.endTurn(m, s));
export const forecast = (m: BoardModel, s: BoardState): Forecast => via("forecast", () => api.forecast(m, s), () => st.forecast(m, s));
export const why = (m: BoardModel, s: BoardState, t: WhyTarget): Why[] => via("why", () => api.why(m, s, t), () => st.why(m, s, t));
export const councilView = (m: BoardModel, s: BoardState, c: CouncilCode): CouncilView => api.councilView(m, s, c);
export const election = (m: BoardModel, s: BoardState): ElectionView => via("election", () => api.election(m, s), () => st.election(m, s));
export const encodeRun = (s: BoardState): string => via("encodeRun", () => api.encodeRun(s), () => st.encodeRun(s));
export const decodeRun = (m: BoardModel, code: string): BoardState => via("decodeRun", () => api.decodeRun(m, code), () => st.decodeRun(m, code));

/** The ending, or null while the endings module is not built (the stand-in does not judge games). */
export function ending(m: BoardModel, s: BoardState): Ending | null {
  try {
    return api.ending(m, s);
  } catch (e) {
    if (e instanceof api.BoardNotBuiltError) return null;
    throw e;
  }
}

/** Replay a run (game number, start and steps) with whichever engine is live. */
export function replay(m: BoardModel, gameNumber: number | string, start: StartId, steps: BoardState["steps"]): BoardState {
  let s = newBoard(m, gameNumber, start);
  for (const step of steps) s = step.kind === "end_turn" ? endTurn(m, s).state : act(m, s, step);
  return s;
}
