import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { careBillOff, income, paysIn, projectCoins, purseMax, settleCoins, workGained } from "./budget";
import { pinStart, withCards } from "./test-cards";
import { makeCtx } from "./ctx";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { newBoard } from "./clock";
import type { BoardModel, BoardRule, BoardState, ProjectState } from "./types";

/** The growth, spread and budget cards on disk (model/board/rules). */
const diskCards: BoardRule[] = ["growth", "spread", "budget"].flatMap((f) =>
  (load(readFileSync(resolve(__dirname, `../../../model/board/rules/${f}.yaml`), "utf8")) as { rules: BoardRule[] }).rules);
/** The three council fixture with these real cards switched on. */
const fixtureWith = (...ids: string[]): BoardModel => pinStart(withCards(boardFixture(), diskCards, ids));

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;

const working = (project: string, council: string, readyStep = 0): ProjectState => ({
  id: `${project}@${council}`, project, site: { council }, level: 1, status: "working", startedStep: readyStep, readyStep, roots: 1, joined: false,
});

function fresh(model: BoardModel): BoardState {
  return newBoard(model, 5, "warm-homes");
}

describe("coins", () => {
  const model = boardFixture();

  it("start at rule B1 opening, recorded with a reason", () => {
    const s = fresh(model);
    expect(s.coins).toBe(6);
    expect(s.ledger.find((c) => c.quantity === "coins")).toMatchObject({ rule: "B1", cause: { kind: "budget" }, delta: 6 });
  });

  it("grow by half a coin a year for every 4 points of Work and pay gained across the board", () => {
    const s = fresh(model);
    expect(income(model, s)).toBe(3);
    s.councils[merthyr]!.measures.work += 2.5;
    s.councils[rct]!.measures.work += 2;
    expect(workGained(s)).toBeCloseTo(4.5);
    expect(income(model, s)).toBe(3.5);
    s.councils[cardiff]!.measures.work -= 9;
    expect(income(model, s)).toBe(3);
  });

  it("come in a quarter of a year at a time", () => {
    const s = fresh(model);
    s.coins = 5;
    expect(settleCoins(makeCtx(model, s, 0))).toMatchObject({ before: 5, income: 0.75, after: 5.75 });
  });

  it("lose unspent coins above B1 carry_max every two years, as phase 1's turn did", () => {
    const s = fresh(model);
    s.coins = 5;
    expect(settleCoins(makeCtx(model, s, 6)).after).toBeCloseTo(5.75, 4);
    s.coins = 5;
    expect(settleCoins(makeCtx(model, s, 7)).after).toBeCloseTo(2.75, 4);
  });

  it("charge running costs a little every step once working, from the step after it opens", () => {
    expect([paysIn(0, 0), paysIn(1, 0), paysIn(5, 3)]).toEqual([false, true, true]);
    const s = fresh(model);
    s.projects.push(working("buses-meet-trains", merthyr, 0));
    expect(projectCoins(model, s, 0)).toEqual([]);
    expect(projectCoins(model, s, 1).map((x) => x.coins)).toEqual([-0.0625]);
    s.coins = 0;
    const r = settleCoins(makeCtx(model, s, 1));
    expect(r.running).toBeCloseTo(0.0625, 4);
    expect(r.after).toBeCloseTo(0.6875, 4);
  });

  it("pay community energy's coins at level 2 only", () => {
    const s = fresh(model);
    const p = working("community-energy", rct, 0);
    s.projects.push(p);
    expect(projectCoins(model, s, 2)).toEqual([]);
    p.level = 2;
    expect(projectCoins(model, s, 2).map((x) => x.coins)).toEqual([0.0625]);
  });

  it("charge the care bill from 2038 unless enough health hubs stand", () => {
    const s = fresh(model);
    s.coins = 0;
    expect(settleCoins(makeCtx(model, s, 46)).charges).toBe(0);
    s.coins = 0;
    expect(settleCoins(makeCtx(model, s, 47)).charges).toBeCloseTo(0.125, 4);
    s.coins = 0;
    s.projects.push(working("health-hub", merthyr), working("health-hub", rct));
    expect(careBillOff(model, s)).toBe(true);
    expect(settleCoins(makeCtx(model, s, 47)).charges).toBe(0);
  });

  it("take a coin a year, a step at a time, for the term after a lost election while the B3 card stands", () => {
    const s = fresh(model);
    s.coins = 0;
    s.election = { records: [{ year: 2030, step: 16, result: "lost", backers: [], peopleShare: 0.2 }], hungUntil: 31, strongUntil: null };
    const r = settleCoins(makeCtx(model, s, 16));
    expect(r.charges).toBeCloseTo(0.25, 4);
    expect(s.ledger[s.ledger.length - 1]).toMatchObject({ rule: "B3", cause: { kind: "election", year: 2030 } });
    s.coins = 0;
    expect(settleCoins(makeCtx(model, s, 31)).charges).toBe(0);
    const noCard = boardFixture();
    noCard.rules = noCard.rules.filter((x) => x.id !== "B3");
    s.coins = 0;
    expect(settleCoins(makeCtx(noCard, s, 16)).charges).toBe(0);
  });

  it("hold at most the purse (B1 purse_max, 12): costs come first and coins above it are not paid, with no carry over loss", () => {
    const purse = fixtureWith("B1");
    expect(purseMax(purse)).toBe(12);
    expect(purseMax(model)).toBeUndefined();
    const s = fresh(purse);
    s.coins = 5;
    expect(settleCoins(makeCtx(purse, s, 7)).after).toBeCloseTo(5.75, 4);
    s.coins = 11.9;
    expect(settleCoins(makeCtx(purse, s, 8))).toMatchObject({ income: 0.1, after: 12 });
    s.coins = 12;
    s.projects.push(working("buses-meet-trains", merthyr, 0));
    const r = settleCoins(makeCtx(purse, s, 9));
    expect(r.running).toBeCloseTo(0.0625, 4);
    expect(r.after).toBe(12);
  });

  it("pay half a coin a year for each council on the rise, and a coin more for good once the region turns (rule R2)", () => {
    const m = fixtureWith("R2");
    const s = fresh(m);
    s.councils[merthyr]!.momentum = "rising";
    expect(income(m, s)).toBe(3.5);
    s.coins = 0;
    expect(settleCoins(makeCtx(m, s, 1)).income).toBeCloseTo(0.875, 4);
    expect(s.ledger[s.ledger.length - 1]).toMatchObject({ rule: "R2", cause: { kind: "momentum" }, delta: 0.125 });
  });
});
