// Which stops pause the clock, in what order, and what the ticker is told.
import { describe, expect, it } from "vitest";
import type { Stop, StepReport, StopKind } from "../../engine/api";
import { act, boardFixture, newBoard, options, STOP_KINDS, tick } from "../../engine/api";
import { defaultPrefs, pausesOn, readPrefs, stopOnList } from "./prefs";
import { keepHard, liveQueue, stopsToShow, tickerLines, type QueuedStop } from "./stops";

const model = boardFixture();
const stop = (kind: StopKind, hard = false): Stop => ({ kind, hard, say: { key: `board.stop.${kind}` } });
const report = (step: number, stops: Stop[], extra: Partial<StepReport> = {}): StepReport => ({
  step, year: 2026, season: "summer", finished: [], flows: [], events: [], stops, ended: false,
  coins: { before: 0, income: 0, running: 0, charges: 0, after: 0 }, ...extra,
});

describe("prefs", () => {
  it("start from game.yaml: warnings pause, years do not, hard stops always", () => {
    const p = defaultPrefs(model, false);
    expect(pausesOn(model, p, "warning")).toBe(model.game.stops.warning?.on ?? false);
    expect(pausesOn(model, p, "election")).toBe(true);
    expect(p.stepByStep).toBe(false);
    expect(defaultPrefs(model, true).stepByStep).toBe(true);
  });

  it("read back what was saved, and ignore what is not a setting", () => {
    const p = readPrefs(model, JSON.stringify({ stops: { year: true, election: false }, stepByStep: true, speed: "nope" }), false);
    expect(p.stops.year).toBe(true);
    expect(pausesOn(model, p, "election")).toBe(true);
    expect(p.stepByStep).toBe(true);
    expect(p.speed).toBe(model.game.default_speed);
    expect(readPrefs(model, "{not json", false)).toEqual(defaultPrefs(model, false));
    expect(stopOnList(model, p)).toContain("year");
  });
});

describe("stopsToShow", () => {
  const prefs = defaultPrefs(model, false);

  it("leaves answers to the state, and puts hard stops first", () => {
    const q = stopsToShow(model, { ...prefs, stops: { ...prefs.stops, warning: true } }, [report(3, [stop("respond", true), stop("warning"), stop("election", true)])]);
    expect(q.map((x) => x.stop.kind)).toEqual(["election", "warning"]);
  });

  it("skips soft stops switched off", () => {
    const q = stopsToShow(model, { ...prefs, stops: { ...prefs.stops, finished: false } }, [report(3, [stop("finished")])]);
    expect(q).toEqual([]);
  });

  it("shows the chapter with the election, and the end instead of an election that falls with it", () => {
    const term = { term: 6 } as unknown as StepReport["term"];
    const q = stopsToShow(model, { ...prefs, stops: { ...prefs.stops, chapter: true } }, [report(95, [stop("election", true), stop("ended", true), stop("chapter")], { term })]);
    expect(q.map((x) => x.stop.kind)).toEqual(["ended"]);
    expect(q[0]!.term).toBe(term);
  });

  it("keeps only hard stops after Look", () => {
    const q = stopsToShow(model, { ...prefs, stops: { ...prefs.stops, warning: true, tipping: true } }, [report(3, [stop("election", true), stop("warning"), stop("tipping")])]);
    expect(keepHard(q.slice(1))).toEqual([]);
    expect(keepHard(q).length).toBe(1);
  });
});

describe("tickerLines", () => {
  it("writes the news and the year's lines", () => {
    const line = { council: null, quantity: "coins" as const, delta: 1, say: { key: "x" }, why: {} as never };
    const out = tickerLines([report(3, [stop("finished"), stop("election", true)], { yearLines: [line] })]);
    expect(out.map((x) => x.kind)).toEqual(["news", "year"]);
  });
});

describe("a card says only what is still true (cold playtest 9, must fix 8)", () => {
  const all = { ...defaultPrefs(model, false), stops: Object.fromEntries(STOP_KINDS.map((k) => [k, true])) };
  const purse = model.rules.find((r) => r.id === "B1")?.params["purse_max"]?.default ?? 0;

  it("drops a full purse once coins are spent", () => {
    const s = newBoard(model, 3, model.starts[0]!.id);
    const q: QueuedStop = { id: "x", step: 0, stop: { kind: "purse_full", hard: false, say: { key: "board.stop.purse_full" } } };
    expect(liveQueue([q], { ...s, coins: purse }, purse)).toHaveLength(purse > 0 ? 1 : 0);
    expect(liveQueue([q], { ...s, coins: Math.max(0, purse - 3) }, purse)).toEqual([]);
  });

  it("over whole games, saving then spending, no card waiting says what the board does not", () => {
    let dropped = 0;
    for (const game of [1, 2, 3, 4]) {
      let s = newBoard(model, game, model.starts[game % model.starts.length]!.id);
      let queue: QueuedStop[] = [];
      for (let guard = 0; guard < model.game.steps * 3 && s.phase !== "ended"; guard++) {
        // a player who builds while cards wait: the queue is read against the board after each spend
        for (const kind of ["respond", "visit", "deal"] as const) {
          const o = options(model, s).find((x) => x.allowed && x.action.kind === kind);
          if (o) s = act(model, s, o.action);
        }
        // saves for a while (the purse fills), then spends on the dearest build
        const b = options(model, s).filter((x) => x.allowed && x.action.kind === "build").sort((x, y) => y.cost - x.cost)[0];
        if (b && guard % 24 > 12) s = act(model, s, b.action);
        const before = queue.length;
        queue = liveQueue(queue, s, purse);
        dropped += before - queue.length;
        for (const q of queue) {
          if (q.stop.kind === "purse_full") expect(s.coins).toBeGreaterThanOrEqual(purse - 1e-6);
          if (q.stop.kind === "warning") expect(s.forecast.some((f) => f.event === q.stop.ref)).toBe(true);
          if (q.stop.kind === "visit") expect(s.pending.some((p) => p.kind === "visit" && p.place === q.stop.ref)).toBe(true);
        }
        // a card is read now and then, so some wait a while
        if (guard % 3 === 0) queue = queue.slice(1);
        if (s.phase !== "play") continue;
        const r = tick(model, s);
        s = r.state;
        queue = [...queue, ...stopsToShow(model, all, [r.report])];
      }
    }
    // the games did meet cards that stopped being true
    expect(dropped).toBeGreaterThan(0);
  });
});
