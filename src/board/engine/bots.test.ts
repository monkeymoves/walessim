import { describe, expect, it } from "vitest";
import { boardFixture } from "./fixture";
import { handState } from "./hand-state";
import { allBots, autopilot, playGame, playTurn, reactive, skilled, startFor, type BoardEngine } from "./bots";
import { balanceTable, distance, percentile, runResult, type RunResult } from "./bots-balance";
import type { BotView } from "./bots-common";
import { BoardActionError, BoardNotBuiltError } from "./errors";
import { newBoard } from "./turn";
import type { Action, ActionOption, BoardModel, BoardState } from "./types";

const model: BoardModel = boardFixture();

/** A fake engine: fixed options, records what was acted, refuses one action. */
function fake(opts: ActionOption[], refuse?: string): BoardEngine & { acted: Action[] } {
  const acted: Action[] = [];
  return {
    acted,
    newBoard: () => handState(model),
    options: () => opts,
    act: (_m, s, a) => {
      if (refuse && JSON.stringify(a) === refuse) throw new BoardActionError([{ kind: "phase", phase: "test" }]);
      acted.push(a);
      return { ...s, steps: [...s.steps, a] };
    },
    endTurn: (_m, s) => ({ state: { ...s, steps: [...s.steps, { kind: "end_turn" }], turn: s.turn + 1, phase: s.turn + 1 >= model.game.turns ? "ended" : "build" }, report: {} as never }),
  };
}
const build = (project: string, council: string, cost: number, extra: Partial<ActionOption> = {}): ActionOption => ({
  action: { kind: "build", project, site: { council } }, allowed: true, blockers: [], cost, project,
  branch: model.projects.find((p) => p.id === project)!.branch, tier: model.projects.find((p) => p.id === project)!.tier, ...extra,
});
const view = (engine: BoardEngine, state: BoardState = handState(model)): BotView => ({ model, engine, state, seed: 1, tried: new Set() });
const [m0, r0, c0] = model.game.councils as [string, string, string];

describe("the bot runner", () => {
  it("answers a landed event before building, carefully when the bot is careful", () => {
    const e = fake([]);
    const s = handState(model);
    s.coins = 5;
    s.pending = [{ kind: "respond", event: "storm-taff", councils: [m0] }];
    playTurn(view(e, s), reactive);
    expect(e.acted[0]).toEqual({ kind: "respond", event: "storm-taff", response: "repair" });
    const e2 = fake([]);
    playTurn(view(e2, s), autopilot);
    expect(e2.acted[0]).toEqual({ kind: "respond", event: "storm-taff", response: "accept" });
  });

  it("skips an action the engine refuses and carries on", () => {
    const opts = [build("buses-meet-trains", m0, 2), build("social-homes", r0, 3)];
    const e = fake(opts, JSON.stringify(opts[0]!.action));
    playTurn(view(e), autopilot);
    expect(e.acted).toEqual([opts[1]!.action]);
  });

  it("autopilot builds the cheapest legal project once a turn", () => {
    const opts = [build("social-homes", r0, 3), build("welsh-school", c0, 2), build("buses-meet-trains", m0, 2)];
    const e = fake(opts);
    playTurn(view(e), autopilot);
    expect(e.acted).toEqual([opts[1]!.action]);
  });

  it("plays a game to the last turn through the engine it is given", () => {
    const e = fake([]);
    const s = playGame(model, autopilot, 3, "warm-homes", e);
    expect(s.turn).toBe(model.game.turns);
    expect(s.steps.filter((x) => x.kind === "end_turn")).toHaveLength(model.game.turns);
  });

  it("every start is played in turn across game numbers", () => {
    expect(new Set([1, 2, 3].map((g) => startFor(model, g))).size).toBe(model.starts.length);
  });
});

describe("balance measures", () => {
  const run = (bot: string, game: number, result: number, ending: string, shift = 0): RunResult => ({
    bot, game, start: "s", future: "f", ending, result, keystones: 0,
    vector: [0.5 + shift, 0.5], measures: [[5 + 10 * shift, 5]],
  });
  it("distance and percentiles", () => {
    expect(distance([0, 1], [1, 1])).toBe(0.5);
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([0, 10], 90)).toBeCloseTo(9);
  });
  it("finds the claims of section 13.2 in made-up runs", () => {
    const runs = [1, 2, 3].flatMap((g) => [
      run("branch-a", g, 60, "a", 0.3), run("branch-b", g, 58, "b", -0.3), run("skilled", g, 70, "a"),
      run("autopilot", g, 50, "drift"), run("reactive", g, 55, "drift"), run("cardiff-first", g, 52, "city-bedrooms"),
    ]);
    const rows = balanceTable(runs, { severity: { min: 9, max: 11, lo: 9, hi: 11 } });
    const row = (claim: string) => rows.find((r) => r.claim === claim)!;
    expect(row("Strategies build different Waleses").pass).toBe(true);
    expect(row("No dominant strategy").value).toBe("2.0");
    expect(row("Skill beats autopilot").pass).toBe(true);
    expect(row("Thought beats reaction").pass).toBe(true);
    expect(row("Cardiff first does not win").pass).toBe(true);
    expect(row("The fairness rule holds").pass).toBe(true);
  });
});

/** The real engine, once package 2's turn.ts can start a game. */
const engineBuilt = (() => {
  try {
    newBoard(model, 1, model.starts[0]!.id);
    return true;
  } catch (e) {
    if (e instanceof BoardNotBuiltError) return false;
    throw e;
  }
})();

describe.skipIf(!engineBuilt)("bots on the fixture with the real engine", () => {
  it("all nine bots finish a game in 2050, and a bot's game replays the same", () => {
    const bots = allBots(model);
    expect(bots.map((b) => b.id)).toHaveLength(9);
    for (const bot of bots.filter((b) => b.id !== "skilled")) {
      const a = playGame(model, bot, 11, startFor(model, 11));
      expect(a.phase, bot.id).toBe("ended");
      expect(JSON.stringify(playGame(model, bot, 11, startFor(model, 11)))).toBe(JSON.stringify(a));
    }
  });

  it("Skilled leaves a better Wales than Autopilot and Reactive on the same game numbers", () => {
    for (const g of [1, 2, 3]) {
      const start = startFor(model, g);
      const sk = runResult(model, "skilled", g, playGame(model, skilled(), g, start));
      expect(sk.result).toBeGreaterThan(runResult(model, "autopilot", g, playGame(model, autopilot, g, start)).result);
      expect(sk.result).toBeGreaterThan(runResult(model, "reactive", g, playGame(model, reactive, g, start)).result);
    }
  });

  it("branch bots reach their keystones and different endings", () => {
    const branchBots = allBots(model).filter((b) => b.id.startsWith("branch-"));
    const endings = new Set(branchBots.map((b) => runResult(model, b.id, 4, playGame(model, b, 4, startFor(model, 4))).ending));
    expect(endings.size).toBeGreaterThanOrEqual(3);
  });
});
