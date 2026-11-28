import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { acceptBoardModel } from "../model";
import { advance, act, newBoard, replay, tick } from "./clock";
import { causeKeyOf } from "./ctx";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { playGame } from "./test-play";
import { seasonOf, stepOfYear, yearOfStep } from "./time";
import type { BoardModel, BoardState } from "./types";
import { MEASURE_IDS } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const REAL = resolve(__dirname, "../../../public/board-model.json");

const sum = (s: BoardState, f: (c: BoardState["ledger"][number]) => boolean) => s.ledger.filter(f).reduce((a, c) => a + c.delta, 0);

/** Answer every waiting event with its free response, so the clock can run. */
function answer(model: BoardModel, s: BoardState): BoardState {
  let out = s;
  for (const p of out.pending) {
    if (p.kind !== "respond") continue;
    const free = model.events.find((e) => e.id === p.event)!.responses.find((r) => r.cost === 0)!;
    out = act(model, out, { kind: "respond", event: p.event, response: free.id });
  }
  return out;
}

/** Run to the end one tick at a time, answering events. */
function tickToEnd(model: BoardModel, s0: BoardState): BoardState {
  let s = s0;
  while (s.phase !== "ended") s = tick(model, answer(model, s)).state;
  return s;
}

describe("a new board", () => {
  const model = boardFixture();

  it("is May 2026 at step 0: the real board, the chosen start, a drawn future and one frame", () => {
    const s = newBoard(model, 2026, "warm-homes");
    expect(s).toMatchObject({ version: 2, step: 0, year: 2026, phase: "play", start: "warm-homes", freeProject: "warm-terraces", coins: 6, log: [], deals: [] });
    expect(s.story).toEqual({ chapters: [], moments: [] });
    expect(seasonOf(model, s.step)).toBe("summer");
    expect(model.futures.map((f) => f.id)).toContain(s.future);
    expect(s.history).toHaveLength(1);
    expect(s.history[0]).toMatchObject({ step: 0, year: 2026 });
    expect(Object.values(s.councils).every((c) => c.momentum === "steady" && c.lastReachedStep === null)).toBe(true);
    expect(s.linkQuality).toEqual({ "rail:merthyr-rct": 1, "rail:rct-cardiff": 1 });
  });

  it("draws the future from the game number alone, and refuses an unknown start", () => {
    expect(newBoard(model, "Aberfan", "warm-homes").future).toBe(newBoard(model, "Aberfan", "work-valleys").future);
    expect(() => newBoard(model, 1, "nope")).toThrow();
  });
});

describe("a tick", () => {
  it("moves the clock a quarter of a year, pays a quarter of a year's coins, and never changes the state it was given", () => {
    const model = boardFixture();
    const s0 = newBoard(model, 4, "work-valleys");
    const copy = JSON.stringify(s0);
    const { state, report } = tick(model, s0);
    expect(JSON.stringify(s0)).toBe(copy);
    expect(state).toMatchObject({ step: 1, year: 2026 });
    expect(report).toMatchObject({ step: 0, year: 2026, season: "summer", ended: false });
    expect(report.coins.income).toBeCloseTo(0.75, 4);
    expect(state.coins).toBeCloseTo(6.75, 4);
    expect(state.history).toHaveLength(1);
    expect(report.yearLines).toBeUndefined();
  });

  it("closes a year every fourth step, with a frame, year lines and a year stop", () => {
    const model = boardFixture();
    const out = advance(model, newBoard(model, 4, "work-valleys"), { maxSteps: 4 });
    expect(out.state).toMatchObject({ step: 4, year: 2027 });
    expect(out.state.history.map((f) => f.year)).toEqual([2026, 2027]);
    expect(out.reports[3]!.yearLines).toBeDefined();
    expect(out.reports[3]!.yearLines!.length).toBeLessThanOrEqual(model.game.year_lines_max);
    expect(out.reports[3]!.stops.map((x) => x.kind)).toContain("year");
    expect(out.reports[0]!.stops.map((x) => x.kind)).not.toContain("year");
  });

  it("starts a build working at the end of its last step, years after it was placed", () => {
    const model = boardFixture();
    let s = newBoard(model, 4, "warm-homes");
    s.coins = 30;
    s = act(model, s, { kind: "build", project: "social-homes", site: { council: cardiff } });
    const p = s.projects[0]!;
    expect(p).toMatchObject({ status: "building", startedStep: 0, readyStep: 15, roots: 1, joined: false });
    expect(s.log).toEqual([{ at: 0, action: { kind: "build", project: "social-homes", site: { council: cardiff } } }]);
    s = advance(model, s, { maxSteps: 15 }).state;
    expect(s.projects[0]!.status).toBe("building");
    const { state, report } = tick(model, answer(model, s));
    expect(state.projects[0]!.status).toBe("working");
    expect(report.finished).toEqual([p.id]);
  });

  it("holds a project's lift while it stands, and adds only the extra on upgrade", () => {
    const model = boardFixture();
    let s = newBoard(model, 4, "warm-homes");
    s.coins = 30;
    s = act(model, s, { kind: "build", project: "social-homes", site: { council: cardiff } });
    s = answer(model, advance(model, s, { maxSteps: 24 }).state);
    const lift = () => sum(s, (c) => c.council === cardiff && c.quantity === "homes" && c.cause.kind === "project" && c.rule === "project:social-homes");
    expect(lift()).toBeCloseTo(0.6, 3);
    s.projects.push(
      { id: `warm-terraces@${merthyr}`, project: "warm-terraces", site: { council: merthyr }, level: 1, status: "working", startedStep: 0, readyStep: 0, roots: 1, joined: false },
      { id: `welsh-school@${rct}`, project: "welsh-school", site: { council: rct }, level: 1, status: "working", startedStep: 0, readyStep: 0, roots: 1, joined: false },
    );
    s.coins = 30;
    s = act(model, s, { kind: "upgrade", project: "social-homes", site: { council: cardiff } });
    s = tick(model, s).state;
    expect(lift()).toBeCloseTo(0.6 * 2.2, 3);
  });

  it("applies a pair while its partner is within reach, and takes it back when it is not", () => {
    const model = boardFixture();
    let s = newBoard(model, 4, "work-valleys");
    s.coins = 30;
    s = act(model, s, { kind: "build", project: "skills-college", site: { council: merthyr } });
    s = answer(model, advance(model, s, { maxSteps: 8 }).state);
    const apart = () => sum(s, (c) => c.cause.kind === "pair" && c.rule === "pair:college-no-jobs");
    expect(apart()).toBeCloseTo(-0.3, 3);
    s.coins = 30;
    s = act(model, s, { kind: "build", project: "back-local-firms", site: { council: rct } });
    s = answer(model, advance(model, s, { maxSteps: 8 }).state);
    expect(apart()).toBeCloseTo(0, 3);
  });

  it("holds the clock while an event waits for an answer", () => {
    const model = boardFixture();
    let s = newBoard(model, 4, "work-valleys");
    let stopped = null;
    while (s.phase === "play") ({ state: s, stopped } = advance(model, s, { maxSteps: 96 }));
    expect(s.phase).toBe("respond");
    expect(stopped).toMatchObject({ kind: "respond", hard: true });
    expect(() => tick(model, s)).toThrow();
    expect(() => advance(model, s, { maxSteps: 1 })).toThrow();
    expect(tick(model, answer(model, s)).state.step).toBe(s.step + 1);
  });
});

describe("a whole game", () => {
  it("ends at step 96, May 2050, with 25 yearly frames, five elections on their steps and six chapters", () => {
    const model = boardFixture();
    const { state, reports } = playGame(model, 11, "ready-weather");
    expect(state).toMatchObject({ step: 96, year: 2050, phase: "ended" });
    expect(state.history.map((f) => f.year)).toEqual(Array.from({ length: 25 }, (_, i) => 2026 + i));
    expect(state.history.map((f) => f.step)).toEqual(Array.from({ length: 25 }, (_, i) => i * 4));
    expect(state.election.records.map((r) => [r.year, r.step])).toEqual([[2030, 16], [2034, 32], [2038, 48], [2042, 64], [2046, 80]]);
    expect(reports.filter((r) => r.term).map((r) => r.term!.toYear)).toEqual([2030, 2034, 2038, 2042, 2046]);
    expect(state.story.chapters.map((c) => [c.term, c.fromYear, c.toYear])).toEqual([[1, 2026, 2030], [2, 2030, 2034], [3, 2034, 2038], [4, 2038, 2042], [5, 2042, 2046], [6, 2046, 2050]]);
    expect(reports[reports.length - 1]!.ended).toBe(true);
    expect(reports[reports.length - 1]!.stops.map((x) => x.kind)).toContain("ended");
    expect(() => tick(model, state)).toThrow();
    for (const r of reports) if (r.term) expect(r.term.lines.length).toBeLessThanOrEqual(model.game.term_report_lines_max);
  });

  it("gives the same state ticked 96 times as advanced to the end, and light as full", () => {
    const model = boardFixture();
    const start = (() => {
      let s = newBoard(model, 21, "work-valleys");
      s = act(model, s, { kind: "build", project: "frequent-trains", site: { link: "rail:merthyr-rct" } });
      return s;
    })();
    const ticked = tickToEnd(model, start);
    const run = (light: boolean) => {
      let s = start;
      while (s.phase !== "ended") s = advance(model, answer(model, s), { maxSteps: 96, light }).state;
      return s;
    };
    expect(JSON.stringify(run(false))).toBe(JSON.stringify(ticked));
    expect(JSON.stringify(run(true))).toBe(JSON.stringify(ticked));
  });

  it("replays its log to a byte equal state", () => {
    const model = boardFixture();
    const { state } = playGame(model, 9, "warm-homes");
    expect(JSON.stringify(replay(model, 9, "warm-homes", state.log, state.step))).toBe(JSON.stringify(state));
  });

  it("folds the ledger by year: one record per council, quantity, rule, cause and link in each closed year", () => {
    const model = boardFixture();
    const { state } = playGame(model, 3, "work-valleys");
    const keys = state.ledger.map((c) => `${c.year}|${c.council}|${c.quantity}|${c.rule}|${causeKeyOf(c.cause)}|${c.via?.link ?? ""}|${c.via?.from ?? ""}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(state.ledger.every((c) => c.year === yearOfStep(model, c.step) && c.delta !== 0)).toBe(true);
  });

  it("builds a different board from a different plan", () => {
    const model = boardFixture();
    const a = playGame(model, 11, "ready-weather", 3).state;
    const b = playGame(model, 11, "ready-weather", 0).state;
    expect(a.projects.length).toBeGreaterThan(b.projects.length);
    const diff = MEASURE_IDS.reduce((d, m) => d + Math.abs(a.councils[merthyr]!.measures[m] - b.councils[merthyr]!.measures[m]), 0);
    expect(diff).toBeGreaterThan(0.5);
  });

  it("puts elections on the first step of their year", () => {
    const model = boardFixture();
    expect(model.game.election_years.map((y) => stepOfYear(model, y))).toEqual([16, 32, 48, 64, 80]);
  });
});

describe.skipIf(!existsSync(REAL))("on the real board model", () => {
  const load = (): BoardModel => acceptBoardModel(JSON.parse(readFileSync(REAL, "utf8")));

  it("seeds ten councils and plays 96 steps with every start", () => {
    const model = load();
    for (const start of model.starts) {
      const { state } = playGame(model, 2026, start.id);
      expect(state.step).toBe(model.game.steps);
      expect(Object.keys(state.councils)).toHaveLength(model.game.councils.length);
      for (const c of Object.values(state.councils)) for (const m of MEASURE_IDS) expect(Number.isFinite(c.measures[m])).toBe(true);
    }
  });
});
