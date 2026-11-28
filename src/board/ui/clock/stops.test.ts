// Which stops pause the clock, in what order, and what the ticker is told.
import { describe, expect, it } from "vitest";
import type { Stop, StepReport, StopKind } from "../../engine/api";
import { boardFixture } from "../../engine/api";
import { defaultPrefs, pausesOn, readPrefs, stopOnList } from "./prefs";
import { keepHard, stopsToShow, tickerLines } from "./stops";

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
