import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { newBoard } from "./clock";
import { makeCtx } from "./ctx";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { makeFrame } from "./frame";
import { pinStart, setParam, withCards } from "./test-cards";
import {
  councilMean, momentumChange, momentumCoinsPerYear, momentumOn, momentumPull, momentumRootsBonus, nextMomentum, regionTurnStep,
  regionTurned, slipStartStep, updateMomentum,
} from "./momentum";
import type { BoardModel, BoardRule, BoardState } from "./types";
import { MEASURE_IDS } from "./types";

/** The growth, spread and budget cards on disk (model/board/rules). */
const diskCards: BoardRule[] = ["growth", "spread", "budget"].flatMap((f) =>
  (load(readFileSync(resolve(__dirname, `../../../model/board/rules/${f}.yaml`), "utf8")) as { rules: BoardRule[] }).rules);
/** The three council fixture with these real cards switched on. */
const fixtureWith = (...ids: string[]): BoardModel => pinStart(withCards(boardFixture(), diskCards, ids));

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;

/** Lift every measure of a council by `by` points. */
function lift(s: BoardState, code: string, by: number): void {
  for (const m of MEASURE_IDS) s.councils[code]!.measures[m] += by;
}

/** Close the year that ends on arriving at `arriving` (a multiple of 4), as the clock does: momentum, then the frame. */
function closeYear(model: BoardModel, s: BoardState, arriving: number): void {
  updateMomentum(makeCtx(model, s, arriving - 1), 1);
  s.step = arriving;
  s.history.push(makeFrame(model, s, arriving));
}

describe("rule R2, tipping points", () => {
  it("is off without its card: every council stays steady and every helper gives nothing", () => {
    const model = boardFixture();
    const s = newBoard(model, 1, "warm-homes");
    lift(s, merthyr, 2);
    closeYear(model, s, 16);
    expect(momentumOn(model)).toBe(false);
    expect(s.councils[merthyr]!.momentum).toBe("steady");
    expect([momentumPull(model, "rising"), momentumRootsBonus(model, "slipping"), momentumCoinsPerYear(model, s)]).toEqual([0, 0, 0]);
    expect(regionTurned(model, s)).toBe(false);
  });

  it("tips with two edges: in at 0.3, out only once back inside 0.1", () => {
    const model = fixtureWith("R2");
    expect(nextMomentum(model, "steady", 0.29)).toBe("steady");
    expect(nextMomentum(model, "steady", 0.3)).toBe("rising");
    expect(nextMomentum(model, "rising", 0.15)).toBe("rising");
    expect(nextMomentum(model, "rising", 0.1)).toBe("steady");
    expect(nextMomentum(model, "rising", -0.4)).toBe("slipping");
    expect(nextMomentum(model, "steady", -0.3)).toBe("slipping");
    expect(nextMomentum(model, "slipping", -0.2)).toBe("slipping");
    expect(nextMomentum(model, "slipping", -0.05)).toBe("steady");
  });

  it("compares the mean of the six measures with four years before, from the yearly frames", () => {
    const model = fixtureWith("R2");
    const s = newBoard(model, 1, "warm-homes");
    const mean0 = councilMean(s.councils[cardiff]!.measures);
    lift(s, cardiff, 0.5);
    expect(councilMean(s.councils[cardiff]!.measures)).toBeCloseTo(mean0 + 0.5, 6);
    expect(momentumChange(model, s, cardiff, 4)).toBeCloseTo(0.5, 6);
    for (let a = 4; a <= 16; a += 4) closeYear(model, s, a);
    // By May 2031 the frame four years back (2027) already holds the lift: no change, so it settles.
    expect(momentumChange(model, s, cardiff, 20)).toBeCloseTo(0, 6);
    expect(s.councils[cardiff]!.momentum).toBe("rising");
    closeYear(model, s, 20);
    expect(s.councils[cardiff]!.momentum).toBe("steady");
  });

  it("moves Backing a little each year while a council is on the rise or slipping, with a Why? ending at R2", () => {
    const model = fixtureWith("R2");
    const s = newBoard(model, 1, "warm-homes");
    const b0 = { up: s.councils[merthyr]!.backing, down: s.councils[rct]!.backing };
    lift(s, merthyr, 1);
    lift(s, rct, -1);
    closeYear(model, s, 4);
    expect(s.councils[merthyr]!.momentum).toBe("rising");
    expect(s.councils[rct]!.momentum).toBe("slipping");
    expect(s.councils[merthyr]!.backing - b0.up).toBeCloseTo(0.15, 3);
    expect(s.councils[rct]!.backing - b0.down).toBeCloseTo(-0.15, 3);
    expect(s.ledger.filter((c) => c.rule === "R2" && c.quantity === "backing").map((c) => c.cause)).toEqual([{ kind: "momentum" }, { kind: "momentum" }]);
  });

  it("pulls young adults, speeds roots and pays coins while on the rise; the region turns when enough rise at once", () => {
    const model = fixtureWith("R2");
    setParam(model, "R2", "region_turn_councils", 2);
    const s = newBoard(model, 1, "warm-homes");
    expect(momentumPull(model, "rising")).toBe(1);
    expect(momentumPull(model, "slipping")).toBe(-1);
    expect(momentumRootsBonus(model, "rising")).toBe(0.02);
    lift(s, merthyr, 1);
    closeYear(model, s, 4);
    expect(momentumCoinsPerYear(model, s)).toBe(0.5);
    expect(regionTurned(model, s)).toBe(false);
    lift(s, rct, 1);
    closeYear(model, s, 8);
    expect(regionTurnStep(model, s)).toBe(8);
    expect(momentumCoinsPerYear(model, s)).toBe(2);
    lift(s, merthyr, -1);
    lift(s, rct, -1);
    for (let a = 12; a <= 24; a += 4) closeYear(model, s, a);
    expect(regionTurnStep(model, s)).toBe(8);
  });

  it("knows when a council's current slip began, for a fresh start", () => {
    const model = fixtureWith("R2");
    const s = newBoard(model, 1, "warm-homes");
    expect(slipStartStep(s, rct)).toBeNull();
    closeYear(model, s, 4);
    lift(s, rct, -1);
    closeYear(model, s, 8);
    closeYear(model, s, 12);
    expect(s.councils[rct]!.momentum).toBe("slipping");
    expect(slipStartStep(s, rct)).toBe(8);
  });
});
