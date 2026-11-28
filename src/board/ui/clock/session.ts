/**
 * The clock as the board holds it (docs/design/v2-board.md 16.2): play and pause, the speed, step
 * by step, the stops waiting on screen, the ticker, the term reports, the last step's report for
 * the pulses, and the player's settings. The engine moves only through `tick` and `advance`; the
 * runner says when.
 *
 * The clock holds itself while a stop is on screen, while an event waits for an answer, while the
 * page is hidden, and (if the player keeps that setting) while they read a sheet. Only something
 * drawn on screen can hold it (./hold.ts). Closing a sheet carries on at the speed the player had;
 * after an answer the clock stays paused until the player presses Play (playtest 8, should fix 7):
 * it only runs again on its own after "Carry on", which is the player choosing it.
 */
import { batch, createEffect, createSignal, on, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";
import type { BoardModel, BoardState, CouncilCode, StepReport, TermReport } from "../../engine/api";
import { advance, closesYear, tick } from "../../engine/api";
import { holdOf, overlays, type HoldReason, type Overlay, type Screenful } from "./hold";
import { msPerStep, readPrefs, stopOnList, type Prefs } from "./prefs";
import { ClockRunner } from "./runner";
import { keepHard, stopsToShow, tickerLines, type QueuedStop, type TickerLine } from "./stops";

const TICKER_KEEP = 40;

export interface ClockDeps {
  state: Accessor<BoardState | null>;
  setState: (s: BoardState) => void;
  /** Save the run (after a year closes or a stop). */
  save: (s: BoardState) => void;
  /** What is open over the board (the sheets, Why?, a visit, a warning, a past term). */
  open: Accessor<Pick<Screenful, "sheet" | "selected" | "why" | "visit" | "warning" | "term">>;
  select: (code: CouncilCode | null) => void;
  onEnded: () => void;
  onError: (message: string) => void;
  store: { get(k: string): string | null; set(k: string, v: string): void };
}

export function createClock(model: BoardModel, deps: ClockDeps) {
  const prefsKey = `${model.game.save_key}prefs`;
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [prefs, setPrefsSignal] = createSignal<Prefs>(readPrefs(model, deps.store.get(prefsKey), reduced));
  const [playing, setPlaying] = createSignal(false);
  const [hidden, setHidden] = createSignal(false);
  const [queue, setQueue] = createSignal<QueuedStop[]>([]);
  const [ticker, setTicker] = createSignal<TickerLine[]>([]);
  const [terms, setTerms] = createSignal<Record<number, TermReport>>({});
  const [last, setLast] = createSignal<StepReport | null>(null);
  const [progress, setProgress] = createSignal(0);
  /** Time has been started in this game (the first press of Start time). */
  const [started, setStarted] = createSignal(false);
  /** Why the clock is paused when the clock paused itself, so the screen can say so. */
  const [pausedFor, setPausedFor] = createSignal<"answered" | null>(null);
  /** The first-run lesson on pause and speed has been seen through (kept in this browser). */
  const taughtKey = `${model.game.save_key}clocktaught`;
  const [taught, setTaught] = createSignal(deps.store.get(taughtKey) === "done");

  const phaseHolds = () => deps.state()?.phase !== "play";
  /** What the hold reads: the state, the stops waiting, the page, the setting and what is open. */
  const screenful = (): Screenful => {
    const s = deps.state();
    return {
      phase: s ? s.phase : null,
      answerWaiting: !!s && s.phase === "respond",
      queued: queue().length,
      hidden: hidden(),
      holdWhileReading: prefs().holdWhileReading,
      ...deps.open(),
    };
  };
  /** Why the clock is held now, or null when it may run. Only something on screen can hold it. */
  const heldBy = (): HoldReason | null => holdOf(screenful());
  /** What the board draws over the map: the board screen shows exactly these, so what holds the clock is always in sight. */
  const shown = (): Overlay[] => overlays(screenful());
  const running = () => playing() && !prefs().stepByStep && heldBy() === null;

  const runner = new ClockRunner(() => step());
  runner.setSpeed(msPerStep(model, prefs().speed));
  onCleanup(runner.onProgress(setProgress));
  createEffect(() => (running() ? runner.start() : runner.stop()));
  onCleanup(() => runner.stop());

  // an answered event leaves the clock paused: the player presses Play when ready
  createEffect(on(() => deps.state()?.phase, (phase, prev) => {
    if (prev === "respond" && phase === "play" && playing()) batch(() => { setPlaying(false); setPausedFor("answered"); });
  }));

  if (typeof document !== "undefined") {
    const vis = () => { setHidden(document.hidden); if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", vis);
    onCleanup(() => document.removeEventListener("visibilitychange", vis));
  }

  function setPrefs(next: Prefs): void {
    setPrefsSignal(next);
    runner.setSpeed(msPerStep(model, next.speed));
    if (next.stepByStep) setPlaying(false);
    deps.store.set(prefsKey, JSON.stringify(next));
  }

  /** Take in the reports of the steps that ran: the ticker, the term reports, the stops. */
  function absorb(reports: StepReport[], show = true): void {
    if (!reports.length) return;
    const lines = tickerLines(reports);
    const newTerms = reports.filter((r) => r.term).map((r) => r.term!);
    batch(() => {
      if (lines.length) setTicker((t) => [...t, ...lines].slice(-TICKER_KEEP));
      if (newTerms.length) setTerms((t) => ({ ...t, ...Object.fromEntries(newTerms.map((x) => [x.term, x])) }));
      setLast(reports[reports.length - 1]!);
      if (show) {
        const q = stopsToShow(model, prefs(), reports);
        if (q.length) setQueue((old) => [...old, ...q]);
      }
    });
  }

  function run(fn: (s: BoardState) => { state: BoardState; reports: StepReport[] }): void {
    const s = deps.state();
    if (!s || s.phase !== "play") return;
    let out: { state: BoardState; reports: StepReport[] };
    try {
      out = fn(s);
    } catch (e) {
      setPlaying(false);
      deps.onError(e instanceof Error ? e.message : String(e));
      return;
    }
    batch(() => {
      deps.setState(out.state);
      absorb(out.reports);
      setStarted(true);
    });
    if (queue().length || out.state.phase !== "play") runner.stop();
    if (queue().length || out.reports.some((r) => closesYear(model, r.step + 1))) deps.save(out.state);
  }

  /** One step: the runner's beat, "Next season", and the full stop key while paused. */
  function step(): void {
    run((s) => { const r = tick(model, s); return { state: r.state, reports: [r.report] }; });
  }

  /** Step by step: run until a stop the player has switched on, a hard stop, or 2050. */
  function runToNext(): void {
    run((s) => {
      const r = advance(model, s, { maxSteps: model.game.steps - s.step, stopOn: stopOnList(model, prefs()) });
      return { state: r.state, reports: r.reports };
    });
  }

  function markTaught(): void {
    if (taught()) return;
    setTaught(true);
    deps.store.set(taughtKey, "done");
  }
  function play(): void {
    if (prefs().stepByStep) return;
    runner.reset();
    batch(() => { setPlaying(true); setStarted(true); setPausedFor(null); });
  }
  /** The player pauses. Pausing once is what the first-run lesson asks for. */
  function pause(): void { if (playing() && started()) markTaught(); setPlaying(false); }
  function toggle(): void { if (playing()) pause(); else play(); }
  function setSpeed(id: string): void { if (started()) markTaught(); setPrefs({ ...prefs(), speed: id }); }

  /** The stop on screen is read: show the next, or carry on at the speed the player had. */
  function carryOn(): void {
    const [head, ...rest] = queue();
    if (!head) return;
    setQueue(rest);
    if (head.stop.kind === "ended") deps.onEnded();
  }

  /** "Look": stay paused with the stop's council selected. Soft stops still waiting are dropped (they are in the ticker). */
  function look(): void {
    const [head, ...rest] = queue();
    if (!head) return;
    batch(() => {
      setPlaying(false);
      setQueue(keepHard(rest));
      if (head.stop.council) deps.select(head.stop.council);
    });
  }

  /** A resumed game: its reports give back the ticker and the term reports, with nothing waiting. */
  function restore(reports: StepReport[]): void {
    batch(() => {
      setQueue([]);
      setTicker([]);
      setTerms({});
      setLast(null);
      setPlaying(false);
      setPausedFor(null);
      setStarted(reports.length > 0);
      absorb(reports, false);
    });
  }

  return {
    prefs, setPrefs, playing, running, heldBy, phaseHolds, progress, queue, ticker, terms, last,
    started, pausedFor, taught, markTaught, shown,
    play, pause, toggle, setSpeed, step, runToNext, carryOn, look, restore,
  };
}

export type Clock = ReturnType<typeof createClock>;
