import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { acceptBoardModel } from "../model";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { playGame } from "./test-play";
import { act, endTurn, newBoard } from "./turn";
import type { BoardModel, BoardState } from "./types";
import { MEASURE_IDS } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const REAL = resolve(__dirname, "../../../public/board-model.json");

const sum = (s: BoardState, f: (c: BoardState["ledger"][number]) => boolean) => s.ledger.filter(f).reduce((a, c) => a + c.delta, 0);

describe("a new board", () => {
  const model = boardFixture();

  it("is the real 2026 board with the chosen start, a drawn future and one frame", () => {
    const s = newBoard(model, 2026, "warm-homes");
    expect(s).toMatchObject({ turn: 0, year: 2026, phase: "build", start: "warm-homes", freeProject: "warm-terraces", coins: 6, steps: [] });
    expect(model.futures.map((f) => f.id)).toContain(s.future);
    expect(s.history).toHaveLength(1);
    expect(s.history[0]!.year).toBe(2026);
    expect(s.linkQuality).toEqual({ "rail:merthyr-rct": 1, "rail:rct-cardiff": 1 });
  });

  it("draws the future from the game number alone", () => {
    expect(newBoard(model, "Aberfan", "warm-homes").future).toBe(newBoard(model, "Aberfan", "work-valleys").future);
  });

  it("refuses an unknown start", () => {
    expect(() => newBoard(model, 1, "nope")).toThrow();
  });
});

describe("a turn", () => {
  it("moves the clock two years, never changes the state it was given, and reports", () => {
    const model = boardFixture();
    const s0 = newBoard(model, 4, "work-valleys");
    const copy = JSON.stringify(s0);
    const { state, report } = endTurn(model, s0);
    expect(JSON.stringify(s0)).toBe(copy);
    expect(state).toMatchObject({ turn: 1, year: 2028 });
    expect(state.steps).toEqual([{ kind: "end_turn" }]);
    expect(report).toMatchObject({ turn: 0, fromYear: 2026, toYear: 2028, ended: false });
    expect(state.history).toHaveLength(2);
  });

  it("holds a project's lift while it stands, adds only the extra on upgrade", () => {
    const model = boardFixture();
    let s = newBoard(model, 4, "warm-homes");
    s.coins = 30;
    s = act(model, s, { kind: "build", project: "social-homes", site: { council: cardiff } });
    for (let i = 0; i < 3; i++) s = endTurn(model, s).state;
    const lift = () => sum(s, (c) => c.council === cardiff && c.quantity === "homes" && c.cause.kind === "project" && c.rule === "project:social-homes");
    expect(lift()).toBeCloseTo(0.6, 3);
    s.projects.push(
      { id: `warm-terraces@${merthyr}`, project: "warm-terraces", site: { council: merthyr }, level: 1, status: "working", startedTurn: 0, readyTurn: 0 },
      { id: `welsh-school@${rct}`, project: "welsh-school", site: { council: rct }, level: 1, status: "working", startedTurn: 0, readyTurn: 0 },
    );
    s.coins = 30;
    s = act(model, s, { kind: "upgrade", project: "social-homes", site: { council: cardiff } });
    s = endTurn(model, s).state;
    expect(lift()).toBeCloseTo(0.6 * 2.2, 3);
  });

  it("applies a pair while its partner is within reach, and takes it back when it is not", () => {
    const model = boardFixture();
    let s = newBoard(model, 4, "work-valleys");
    s.coins = 30;
    s = act(model, s, { kind: "build", project: "skills-college", site: { council: merthyr } });
    s = endTurn(model, s).state;
    const apart = () => sum(s, (c) => c.cause.kind === "pair" && c.rule === "pair:college-no-jobs");
    expect(apart()).toBeCloseTo(-0.3, 3);
    s.coins = 30;
    s = act(model, s, { kind: "build", project: "back-local-firms", site: { council: rct } });
    s = endTurn(model, s).state;
    expect(apart()).toBeCloseTo(0, 3);
  });

  it("ends after twelve turns in 2050 with thirteen frames", () => {
    const model = boardFixture();
    const { state, reports } = playGame(model, 11, "ready-weather");
    expect(state).toMatchObject({ turn: 12, year: 2050, phase: "ended" });
    expect(state.history).toHaveLength(13);
    expect(reports[reports.length - 1]!.ended).toBe(true);
    expect(reports.filter((r) => r.election).map((r) => r.election!.year)).toEqual([2030, 2034, 2038, 2042, 2046]);
    expect(() => endTurn(model, state)).toThrow();
    for (const r of reports) expect(r.lines.length).toBeLessThanOrEqual(model.game.report_lines_max);
  });

  it("builds a different board from a different plan", () => {
    const model = boardFixture();
    const a = playGame(model, 11, "ready-weather", 3).state;
    const b = playGame(model, 11, "ready-weather", 0).state;
    expect(a.projects.length).toBeGreaterThan(b.projects.length);
    const diff = MEASURE_IDS.reduce((d, m) => d + Math.abs(a.councils[merthyr]!.measures[m] - b.councils[merthyr]!.measures[m]), 0);
    expect(diff).toBeGreaterThan(0.5);
  });
});

describe.skipIf(!existsSync(REAL))("on the real board model", () => {
  const load = (): BoardModel => acceptBoardModel(JSON.parse(readFileSync(REAL, "utf8")));

  it("seeds ten councils and plays twelve turns with every start", () => {
    const model = load();
    for (const start of model.starts) {
      const { state } = playGame(model, 2026, start.id);
      expect(state.turn).toBe(model.game.turns);
      expect(Object.keys(state.councils)).toHaveLength(model.game.councils.length);
      for (const c of Object.values(state.councils)) for (const m of MEASURE_IDS) expect(Number.isFinite(c.measures[m])).toBe(true);
    }
  });
});
