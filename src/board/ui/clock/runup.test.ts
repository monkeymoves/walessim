// The run-up card comes a year before each election (cold playtest 10, the critic's one change),
// and its Look opens a council that really tips the engine's own projection, over whole games.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoardModel, BoardState } from "../../engine/api";
import { act, advance, boardFixture, election, newBoard, options, stepOfYear, stepsOf } from "../../engine/api";
import { backersNow, electionTargets } from "../electionTargets";
import { acceptBoardModel } from "../../model";
import { statesForTest } from "../testStates";
import { nextElectionStep, opensRunUp, runUpCouncil } from "./runup";

const realPath = join(__dirname, "..", "..", "..", "..", "public", "board-model.json");
/** The real model when it is built and checks; the fixture while another package has it half changed. */
function load(): BoardModel {
  try { if (existsSync(realPath)) return acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8"))); } catch { /* being rebuilt */ }
  return boardFixture();
}
const model = load();

/** A careless player: builds every third year, so elections are lost too. */
function careless(gameNumber: number): BoardState[] {
  let s = newBoard(model, gameNumber, model.starts[0]!.id);
  const out: BoardState[] = [];
  for (let year = 0; year < 40 && s.phase !== "ended"; year++) {
    for (const kind of ["respond", "deal"] as const) {
      const o = options(model, s).find((x) => x.allowed && x.action.kind === kind);
      if (o) s = act(model, s, o.action);
    }
    if (year % 3 === 0) {
      const b = options(model, s).filter((x) => x.allowed && x.action.kind === "build").sort((x, y) => x.cost - y.cost)[0];
      if (b) s = act(model, s, b.action);
    }
    out.push(s);
    if (s.phase === "play") s = advance(model, s, { maxSteps: stepsOf(model, 1) }).state;
  }
  return out;
}

/** The engine's projection with one council's backing set. */
const withBacking = (s: BoardState, council: string, backing: number): BoardState =>
  ({ ...s, councils: { ...s.councils, [council]: { ...s.councils[council]!, backing } } });

describe("the run-up to an election", () => {
  const states = [...statesForTest(model, 2026), ...careless(2029), ...careless(4411)].filter((s) => s.phase === "play");

  it("opens exactly a year before each election, and never after the last", () => {
    const opens = Array.from({ length: model.game.steps + 1 }, (_, k) => k).filter((k) => opensRunUp(model, k));
    expect(opens).toEqual(model.game.election_years.map((y) => stepOfYear(model, y) - stepsOf(model, 1)));
    expect(nextElectionStep(model, model.game.steps)).toBeNull();
  });

  it("looks at a council that really tips the engine's projection: bring it round and the result changes, or lose it and it does", () => {
    let named = 0;
    for (const s of states) {
      const code = runUpCouncil(model, s);
      const tg = electionTargets(model, s);
      if (!code || !tg) continue;
      named++;
      // the live count (at an election step the engine's election() gives the count just held)
      const before = backersNow(model, s).result;
      const bringing = !!tg.win?.length;
      const moved = withBacking(s, code, bringing ? 5 : 4.5);
      if (bringing && tg.win!.length === 1) expect(backersNow(model, moved).result, code).not.toBe("lost");
      if (!bringing) expect(backersNow(model, moved).result, code).not.toBe(before);
      // away from an election step the live count is the engine's own projection
      if (!s.election.records.some((r) => r.step === s.step)) expect(before).toBe(election(model, s).result);
    }
    expect(named).toBeGreaterThan(10);
  });
});
