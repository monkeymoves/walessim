/**
 * One game of the board as the screens hold it: the model, the state, what is on screen, what is
 * selected, and the save. Created once per mount of the route and shared through `useGame()`.
 *
 * The save is the game number, the start and the steps, under the model's own key prefix
 * (`etifeddiaeth.board.v1.`), set and removed singly. Replaying the steps gives the same state.
 */
import { batch, createContext, createMemo, createSignal, useContext } from "solid-js";
import type { Action, BoardModel, BoardState, CouncilCode, MeasureId, RunStep, StartId, TurnReport, WhyTarget } from "../engine/api";
import * as eng from "./engine";

export type Screen = "start" | "board" | "passing" | "report" | "election" | "end";
export type ColourBy = MeasureId | "backing" | "behind" | "none";
export type Sheet = null | "build" | "tree" | "laws";

interface Saved { hash: string; g: number | string; s: StartId; x: RunStep[] }

const store = {
  get(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, v: string): void { try { localStorage.setItem(key, v); } catch { /* storage blocked */ } },
  remove(key: string): void { try { localStorage.removeItem(key); } catch { /* storage blocked */ } },
};

export function createGame(model: BoardModel) {
  const runKey = `${model.game.save_key}run`;
  const guideKey = `${model.game.save_key}guide`;

  const [state, setState] = createSignal<BoardState | null>(null);
  const [screen, setScreen] = createSignal<Screen>("start");
  const [selected, setSelected] = createSignal<CouncilCode | null>(null);
  const [colourBy, setColourBy] = createSignal<ColourBy>("work");
  const [sheet, setSheet] = createSignal<Sheet>(null);
  const [hover, setHover] = createSignal<Action | null>(null);
  const [report, setReport] = createSignal<TurnReport | null>(null);
  const [whyAt, setWhyAt] = createSignal<WhyTarget | null>(null);
  /** A place visit open on screen (package 6 draws it), by place id. */
  const [visit, setVisit] = createSignal<string | null>(null);
  /** A link lit from the council panel's list. */
  const [litLink, setLitLink] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [guide, setGuide] = createSignal<number>(store.get(guideKey) === "done" ? -1 : 0);

  const save = (s: BoardState) => {
    const saved: Saved = { hash: model.meta.hash, g: s.gameNumber, s: s.start, x: s.steps };
    store.set(runKey, JSON.stringify(saved));
  };

  /** A saved game for this model, if there is one. */
  const savedRun = (): Saved | null => {
    const raw = store.get(runKey);
    if (!raw) return null;
    try {
      const v = JSON.parse(raw) as Saved;
      return v.hash === model.meta.hash ? v : null;
    } catch { return null; }
  };

  const preview = createMemo(() => {
    const s = state(), a = hover();
    if (!s || !a) return null;
    try { return eng.preview(model, s, a); } catch { return null; }
  });

  const forecast = createMemo(() => {
    const s = state();
    if (!s || s.phase === "ended") return null;
    try { return eng.forecast(model, s); } catch (e) { console.warn(e); return null; }
  });

  function start(gameNumber: number | string, startId: StartId): void {
    const s = eng.newBoard(model, gameNumber, startId);
    batch(() => { setState(s); setScreen("board"); setSelected(null); setReport(null); });
    save(s);
  }

  function resume(): boolean {
    const v = savedRun();
    if (!v) return false;
    try {
      const s = eng.replay(model, v.g, v.s, v.x);
      batch(() => { setState(s); setScreen(s.phase === "ended" ? "end" : "board"); });
      return true;
    } catch (e) {
      console.warn("board: the saved game could not be replayed", e);
      store.remove(runKey);
      return false;
    }
  }

  function doAct(a: Action): boolean {
    const s = state();
    if (!s) return false;
    try {
      const next = eng.act(model, s, a);
      batch(() => { setState(next); setHover(null); setError(null); });
      save(next);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  function endTurn(): void {
    const s = state();
    if (!s) return;
    const out = eng.endTurn(model, s);
    batch(() => {
      setState(out.state);
      setReport(out.report);
      setSheet(null);
      setHover(null);
      setSelected(null);
      setScreen("passing");
    });
    save(out.state);
  }

  /** After the two years pass: the report, then the election if one was held, then the board or the end. */
  function nextScreen(): void {
    const sc = screen(), r = report();
    if (sc === "passing") setScreen("report");
    else if (sc === "report" && r?.election) setScreen("election");
    else if (r?.ended) setScreen("end");
    else setScreen("board");
  }

  function newGame(): void {
    store.remove(runKey);
    batch(() => { setState(null); setReport(null); setSelected(null); setScreen("start"); });
  }

  function guideNext(skip = false): void {
    const n = guide();
    if (skip || n >= 3) { setGuide(-1); store.set(guideKey, "done"); }
    else setGuide(n + 1);
  }

  return {
    model, state, screen, setScreen, selected, setSelected, colourBy, setColourBy, sheet, setSheet, hover, setHover,
    preview, forecast, report, whyAt, setWhyAt, visit, setVisit, litLink, setLitLink, error, setError, guide, guideNext, savedRun,
    start, resume, act: doAct, endTurn, nextScreen, newGame,
  };
}

export type Game = ReturnType<typeof createGame>;

export const GameContext = createContext<Game>();

export function useGame(): Game {
  const g = useContext(GameContext);
  if (!g) throw new Error("useGame outside the board");
  return g;
}
