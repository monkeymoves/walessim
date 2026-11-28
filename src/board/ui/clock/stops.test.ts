// Which stops pause the clock, in what order, and what the ticker is told.
import { describe, expect, it } from "vitest";
import type { Stop, StepReport, StopKind } from "../../engine/api";
import { act, boardFixture, newBoard, options, STOP_KINDS, tick } from "../../engine/api";
import { defaultPrefs, pausesOn, readPrefs, startSpeed, stopOnList } from "./prefs";
import { keepHard, liveQueue, newsTrue, passedWarnings, perYearOf, purseOnce, purseSoon, runUpStops, stopsToShow, tickerLines, type QueuedStop, type TickerLine } from "./stops";
import { opensRunUp } from "./runup";

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
    expect(p.flashingOutline).toBe(true);
    expect(readPrefs(model, JSON.stringify({ flashingOutline: false }), false).flashingOutline).toBe(false);
    expect(readPrefs(model, "{not json", false)).toEqual(defaultPrefs(model, false));
    expect(stopOnList(model, p)).toContain("year");
  });
});

describe("the starting speed (v3-wales.md section 7: Fast for everyone)", () => {
  it("is game.yaml's default, and a speed saved by an older version is ignored", () => {
    expect(startSpeed(model)).toBe(model.game.default_speed);
    expect(readPrefs(model, JSON.stringify({ speed: "steady" }), false)).toEqual(defaultPrefs(model, false));
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

describe("cold playtest 10: the purse, the ticker, passed warnings and the run-up", () => {
  const all = { ...defaultPrefs(model, false), stops: Object.fromEntries(STOP_KINDS.map((k) => [k, true])) };
  const purse = model.rules.find((r) => r.id === "B1")?.params["purse_max"]?.default ?? 0;
  const q = (kind: StopKind, ref?: string, hard = false): QueuedStop => ({ id: `${kind}${ref ?? ""}`, step: 1, stop: { ...stop(kind, hard), ...(ref ? { ref } : {}) } });

  it("shows the full purse card once a game, however often the purse fills", () => {
    const first = purseOnce([q("purse_full"), q("tipping"), q("purse_full")], false);
    expect(first.queue.map((x) => x.stop.kind)).toEqual(["purse_full", "tipping"]);
    expect(first.shown).toBe(true);
    expect(purseOnce([q("purse_full"), q("warning", "storm")], true).queue.map((x) => x.stop.kind)).toEqual(["warning"]);
  });

  it("keeps every warning it passes, unread, and nothing else", () => {
    expect(passedWarnings([q("warning", "storm"), q("tipping"), q("warning", "fuel"), q("election", undefined, true)])).toEqual(["storm", "fuel"]);
  });

  it("drops a ticker line once its fact is no longer true, and keeps the purse line only while the purse is nearly full", () => {
    if (purse <= 0) return;
    const s = newBoard(model, 3, model.starts[0]!.id);
    const full = tickerLines([report(2, [stop("purse_full")])])[0]!;
    expect(newsTrue(full, { ...s, coins: purse }, purse, 4)).toBe(true);
    expect(newsTrue(full, { ...s, coins: purse - 2 }, purse, 4)).toBe(false);
    const soon: TickerLine = { id: "s", step: 2, kind: "news", council: null, say: { key: "boardclock.purse.tickerSoon" }, live: "purse_soon" };
    expect(newsTrue(soon, { ...s, coins: purse - 2 }, purse, 4)).toBe(true);
    expect(newsTrue(soon, { ...s, coins: purse }, purse, 4)).toBe(false);
    expect(newsTrue(soon, { ...s, coins: purse - 8 }, purse, 4)).toBe(false);
    expect(purseSoon(purse - 1, purse, 4)).toBe(true);
    expect(perYearOf({ before: 0, income: 1, running: 0.25, charges: 0, after: 0 }, 4)).toBe(3);
  });

  it("raises the run-up card exactly once a year before each election, over a whole game", () => {
    let s = newBoard(model, 5, model.starts[0]!.id);
    const raised: number[] = [];
    for (let guard = 0; guard < model.game.steps * 2 && s.phase !== "ended"; guard++) {
      if (s.phase === "respond") {
        const o = options(model, s).find((x) => x.allowed && x.action.kind === "respond");
        if (o) s = act(model, s, o.action);
        continue;
      }
      const r = tick(model, s);
      s = r.state;
      const cards = runUpStops(model, [r.report], s);
      for (const c of cards) {
        raised.push(r.report.step + 1);
        expect(liveQueue([c], s, purse)).toHaveLength(1);
        expect(stopsToShow(model, all, [r.report]).some((x) => x.stop.kind === "election")).toBe(false);
      }
    }
    const expected = Array.from({ length: model.game.steps }, (_, k) => k).filter((k) => opensRunUp(model, k));
    expect(raised).toEqual(expected);
  });
});
