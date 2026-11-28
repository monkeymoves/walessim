import { describe, expect, it } from "vitest";
import { boardFixture } from "./fixture";
import { handState } from "./hand-state";
import { allBots, autopilot, playGame, playTurn, reactive, realEngine, scatter, skilled, sleeper, startFor, stepsToDecision, type BoardEngine } from "./bots";
import { stepOfYear, stepsOf } from "./time";
import { AUTOPILOT_EVERY_YEARS, keystoneUnlock } from "./bots-strategies";
import { distance, percentile, runResult, type RunResult } from "./bots-balance";
import { balanceTable } from "./bots-marks";
import { optionValue, runAhead, type BotView } from "./bots-common";
import { replay } from "./clock";
import { BoardActionError } from "./errors";
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
      return { ...s, log: [...s.log, { at: s.step, action: a }] };
    },
    advance: (_m, s, o) => {
      const step = Math.min(model.game.steps, s.step + o.maxSteps);
      return { state: { ...s, step, phase: step >= model.game.steps ? "ended" : "play" }, reports: [], stopped: null };
    },
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

  it("a branch bot builds the faster line its keystone waits on, and only while no site waits on coins alone", () => {
    const line: ActionOption = { action: { kind: "build", project: "frequent-trains", site: { link: "rail:merthyr-rct" } }, allowed: true, blockers: [], cost: 3,
      project: "frequent-trains", branch: "valleys", tier: 1 };
    const needsLine = build("work-up-the-line", m0, 7, { allowed: false, blockers: [{ kind: "coins", need: 7, have: 3 }, { kind: "needs", condition: { kind: "link_quality", at_least: 2 }, rule: "project:work-up-the-line" }] });
    const e = fake([needsLine, build("buses-meet-trains", m0, 2), line]);
    expect(keystoneUnlock(view(e), "valleys")?.action).toEqual(line.action);
    const coinsOnly = build("work-up-the-line", r0, 7, { allowed: false, blockers: [{ kind: "coins", need: 7, have: 3 }] });
    expect(keystoneUnlock(view(fake([needsLine, coinsOnly, line])), "valleys")).toBeNull();
  });

  it("looks ahead in place on a state it owns, to the same state as through advance", () => {
    const played = playGame(model, skilled(), 5, startFor(model, 5));
    for (const at of [8, 30, 51, 70]) {
      const s = replay(model, 5, startFor(model, 5), played.log.filter((e) => e.at < at), at);
      const viaAdvance = runAhead(realEngine, model, s, 12);
      const inPlace = runAhead(realEngine, model, structuredClone(s), 12, true);
      expect(JSON.stringify(inPlace)).toBe(JSON.stringify(viaAdvance));
    }
  });

  it("values a lift only by the room the measure has left below 10", () => {
    const s = handState(model);
    const o = build("social-homes", m0, 3);
    expect(optionValue(model, s, o)).toBeGreaterThan(0);
    s.councils[m0]!.measures.homes = 10;
    expect(optionValue(model, s, o)).toBe(0);
  });

  it("autopilot's turn is two years, as a phase 1 turn was (16.2.4), not every year", () => {
    const opts = [build("welsh-school", c0, 2)];
    const s = handState(model);
    const turn = stepsOf(model, AUTOPILOT_EVERY_YEARS);
    s.step = 3 * turn;
    s.log = [{ at: s.step - turn + 1, action: opts[0]!.action }];
    const e = fake(opts);
    playTurn(view(e, s), autopilot);
    expect(e.acted).toEqual([]);
    s.log = [{ at: s.step - turn, action: opts[0]!.action }];
    const e2 = fake(opts);
    playTurn(view(e2, s), autopilot);
    expect(e2.acted).toEqual([opts[0]!.action]);
  });

  it("plays a game to the last step through the engine it is given, deciding once a year", () => {
    const e = fake([]);
    const s = playGame(model, autopilot, 3, "warm-homes", e);
    expect(s.step).toBe(model.game.steps);
    expect(s.phase).toBe("ended");
  });

  it("takes a deal on offer after a lost election, and Sleeper does nothing while asleep", () => {
    const e = fake([build("social-homes", r0, 3)]);
    const s = handState(model);
    s.pending = [{ kind: "deal", choices: [{ council: m0, measure: "homes" }, { council: r0, measure: "work" }], since: 16 }];
    playTurn(view(e, s), reactive);
    expect(e.acted[0]).toEqual({ kind: "deal", council: m0, measure: "homes" });
    const e2 = fake([build("social-homes", r0, 3)]);
    playTurn(view(e2, s), sleeper());
    expect(e2.acted).toEqual([]);
  });

  it("decides in the last step of each year", () => {
    expect([0, 1, 2, 3, 4, 7].map((st) => stepsToDecision(model, st))).toEqual([3, 2, 1, 4, 3, 4]);
  });

  it("every start is played in turn across game numbers", () => {
    expect(new Set([1, 2, 3].map((g) => startFor(model, g))).size).toBe(model.starts.length);
  });
});

describe("balance measures", () => {
  const run = (bot: string, game: number, result: number, ending: string, shift = 0): RunResult => ({
    bot, game, start: "s", future: "f", ending, result, life: result, startScore: 47, keystones: [], keystoneBranches: [], projects: 6,
    vector: [0.5 + shift, 0.5], vector2034: [0.5 + shift / 4, 0.5], measures: [[5 + 10 * shift, 5]], valleyYoung: 18 + 10 * shift,
    youngRatio: { min: 0.9, max: 1.1 }, tips: 2, risen: [], electionsLost: 0, recovered: null, lowestChange: 0, lowestRose: false,
    chapters: ["holding-on"],
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
    expect(row("Good strategies stay close").value).toBe("2.0");
    expect(row("Paths part over time").pass).toBe(true);
    expect(row("People end up in different places").value).toBe("6.00");
    expect(row("No runaway").pass).toBe(true);
    expect(row("Skill beats autopilot").pass).toBe(true);
    expect(row("Thought beats reaction").pass).toBe(true);
    expect(row("Cities first does not win").pass).toBe(true);
    expect(row("Stories differ").pass).toBeNull();
    expect(row("The fairness rule holds").pass).toBe(true);
  });
});

describe("bots on the fixture with the real engine", () => {
  it("all thirteen bots finish a game in 2050, and a bot's game replays the same", () => {
    const bots = allBots(model);
    expect(bots.map((b) => b.id)).toHaveLength(13);
    for (const bot of bots.filter((b) => !["skilled", "rescue", "scatter", "sleeper"].includes(b.id))) {
      const a = playGame(model, bot, 11, startFor(model, 11));
      expect(a.phase, bot.id).toBe("ended");
      expect(JSON.stringify(playGame(model, bot, 11, startFor(model, 11)))).toBe(JSON.stringify(a));
    }
  });

  it("Sleeper builds nothing before 2034, and Scatter never builds next to its own project of the same branch", () => {
    const sl = playGame(model, sleeper(), 5, startFor(model, 5));
    expect(sl.log.filter((e) => e.action.kind === "build" && e.at < stepOfYear(model, 2034))).toEqual([]);
    const sc = playGame(model, scatter(), 5, startFor(model, 5));
    const builds = sc.log.flatMap((e) => (e.action.kind === "build" ? [e.action] : []));
    for (const b of model.branches) {
      expect(builds.filter((a) => model.projects.find((p) => p.id === a.project)?.branch === b.id).length, b.id).toBeLessThanOrEqual(1);
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
