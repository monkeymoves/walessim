/**
 * One game of the board as the screens hold it: the model, the state, what is on screen, what is
 * selected, the clock (./clock/session.ts) and the save. Created once per mount of the route and
 * shared through `useGame()`.
 *
 * The save is the run code (the game number, the start, the step reached and the log) under the
 * model's own key prefix (`etifeddiaeth.board.v2.`), set and removed singly, never cleared.
 * Replaying it gives the same state, and the reports for the time line and the ticker.
 */
import { batch, createContext, createMemo, createSignal, useContext } from "solid-js";
import type { Action, BoardModel, BoardState, CouncilCode, MeasureId, StartId, WhyTarget } from "../engine/api";
import * as eng from "../engine/api";
import { createClock } from "./clock/session";
import { replayWithReports } from "./clock/replay";

export type Screen = "start" | "board" | "end";
export type ColourBy = MeasureId | "backing" | "behind" | "none";
export type Sheet = null | "build" | "tree" | "laws" | "settings";

export const store = {
  get(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, v: string): void { try { localStorage.setItem(key, v); } catch { /* storage blocked */ } },
  remove(key: string): void { try { localStorage.removeItem(key); } catch { /* storage blocked */ } },
};

export function createGame(model: BoardModel) {
  const runKey = `${model.game.save_key}run`;
  const guideKey = `${model.game.save_key}guide`;

  const [state, setState] = createSignal<BoardState | null>(null);
  const [screen, setScreen] = createSignal<Screen>("start");
  const [selected, setSelectedSignal] = createSignal<CouncilCode | null>(null);
  const [colourBy, setColourBy] = createSignal<ColourBy>("work");
  const [sheet, setSheetSignal] = createSignal<Sheet>(null);
  const [hover, setHover] = createSignal<Action | null>(null);
  const [whyAt, setWhyAt] = createSignal<WhyTarget | null>(null);
  /** A place visit open on screen (package 12 draws it), by place id. */
  const [visit, setVisit] = createSignal<string | null>(null);
  /** A warned event opened from the time line, by event id. */
  const [warning, setWarning] = createSignal<string | null>(null);
  /** A past term opened from the time line. */
  const [termOpen, setTermOpen] = createSignal<number | null>(null);
  const [litLink, setLitLink] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [guide, setGuide] = createSignal<number>(store.get(guideKey) === "done" ? -1 : 0);

  const save = (s: BoardState) => {
    try { store.set(runKey, eng.encodeRun(s)); } catch (e) { console.warn("board: could not save", e); }
  };

  /**
   * The build menu belongs to the selected council: closing the council closes the menu, so no
   * menu is left open that nothing draws (it held the clock for minutes, playtest 8 must fix 2).
   * Leaving the build menu drops the project being pointed at, so the top strip never shows a
   * stale "left if you build it" (must fix 16).
   */
  const setSelected = (code: CouncilCode | null) => batch(() => {
    setSelectedSignal(code);
    if (code === null && sheet() === "build") { setSheetSignal(null); setHover(null); }
  });
  const setSheet = (next: Sheet) => batch(() => {
    if (next !== "build") setHover(null);
    setSheetSignal(next);
  });

  const clock = createClock(model, {
    state, setState, save,
    open: () => {
      const n = termOpen();
      return {
        sheet: sheet(), selected: selected() !== null, why: whyAt() !== null, visit: visit() !== null,
        warning: warning() !== null, term: n !== null && !!clock.terms()[n],
      };
    },
    select: (code) => setSelected(code),
    onEnded: () => { batch(() => { setSheet(null); setWhyAt(null); setScreen("end"); }); },
    onError: (m) => setError(m),
    store,
  });

  /** Bumped when a game starts or is thrown away, so the start screen reads the save again. */
  const [saveVersion, setSaveVersion] = createSignal(0);
  /** A saved game for this model, if its code still replays. */
  const savedRun = createMemo((): BoardState | null => {
    saveVersion();
    const code = store.get(runKey);
    if (!code) return null;
    try { return eng.decodeRun(model, code); } catch { return null; }
  });

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

  const closeAll = () => { setSheet(null); setWhyAt(null); setWarning(null); setTermOpen(null); setHover(null); };

  function start(gameNumber: number | string, startId: StartId): void {
    const s = eng.newBoard(model, gameNumber, startId);
    // a new game starts at the default speed (cold playtest 9: Fast carried over from the last game)
    batch(() => { setState(s); clock.freshGame(); setScreen("board"); setSelected(null); closeAll(); });
    save(s);
    setSaveVersion((n) => n + 1);
  }

  function resume(): boolean {
    const saved = savedRun();
    if (!saved) return false;
    try {
      const out = replayWithReports(model, saved.gameNumber, saved.start, saved.log, saved.step);
      batch(() => { setState(out.state); clock.restore(out.reports); setScreen(out.state.phase === "ended" ? "end" : "board"); closeAll(); });
      return true;
    } catch (e) {
      console.warn("board: the saved game could not be replayed", e);
      store.remove(runKey);
      return false;
    }
  }

  function act(a: Action): boolean {
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

  function newGame(): void {
    store.remove(runKey);
    batch(() => { setState(null); clock.restore([]); setSelected(null); closeAll(); setScreen("start"); setSaveVersion((n) => n + 1); });
  }

  /** Move the guide to note `n`, or end it (-1, remembered in this browser). */
  function guideTo(n: number): void {
    if (n < 0) { setGuide(-1); store.set(guideKey, "done"); }
    else setGuide(n);
  }

  return {
    model, state, screen, setScreen, selected, setSelected, colourBy, setColourBy, sheet, setSheet, hover, setHover,
    preview, forecast, whyAt, setWhyAt, visit, setVisit, warning, setWarning, termOpen, setTermOpen, litLink, setLitLink,
    error, setError, guide, guideTo, savedRun, clock, closeAll,
    start, resume, act, newGame,
  };
}

export type Game = ReturnType<typeof createGame>;

export const GameContext = createContext<Game>();

export function useGame(): Game {
  const g = useContext(GameContext);
  if (!g) throw new Error("useGame outside the board");
  return g;
}
