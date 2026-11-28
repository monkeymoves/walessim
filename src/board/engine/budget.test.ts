import { describe, expect, it } from "vitest";
import { careBillOff, due, income, projectCoins, settleCoins, workGained } from "./budget";
import { makeCtx } from "./ctx";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { newBoard } from "./turn";
import type { BoardModel, BoardState, ProjectState } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;

const working = (project: string, council: string, readyTurn = 0): ProjectState => ({
  id: `${project}@${council}`, project, site: { council }, level: 1, status: "working", startedTurn: readyTurn, readyTurn,
});

function fresh(model: BoardModel): BoardState {
  return newBoard(model, 5, "warm-homes");
}

describe("coins", () => {
  const model = boardFixture();

  it("start at rule B1 base, recorded with a reason", () => {
    const s = fresh(model);
    expect(s.coins).toBe(6);
    expect(s.ledger.find((c) => c.quantity === "coins")).toMatchObject({ rule: "B1", cause: { kind: "budget" }, delta: 6 });
  });

  it("grow by one a turn for every 4 points of Work and pay gained across the board", () => {
    const s = fresh(model);
    expect(income(model, s)).toBe(6);
    s.councils[merthyr]!.measures.work += 2.5;
    s.councils[rct]!.measures.work += 2;
    expect(workGained(s)).toBeCloseTo(4.5);
    expect(income(model, s)).toBe(7);
    s.councils[cardiff]!.measures.work -= 9;
    expect(income(model, s)).toBe(6);
  });

  it("carry over at most 2 unspent", () => {
    const s = fresh(model);
    s.coins = 5;
    const r = settleCoins(makeCtx(model, s));
    expect(r).toMatchObject({ before: 5, carried: 2, income: 6, after: 8 });
  });

  it("charge running costs every second turn once working", () => {
    expect([due(0, 0, 2), due(1, 0, 2), due(2, 0, 2), due(4, 0, 2)]).toEqual([false, false, true, true]);
    const s = fresh(model);
    s.projects.push(working("buses-meet-trains", merthyr, 0));
    expect(projectCoins(model, s, 1)).toEqual([]);
    expect(projectCoins(model, s, 2).map((x) => x.coins)).toEqual([-1]);
    s.coins = 0;
    const r = settleCoins(makeCtx(model, s, 2));
    expect(r.running).toBe(1);
    expect(r.after).toBe(5);
  });

  it("pay community energy's coin at level 2 only", () => {
    const s = fresh(model);
    const p = working("community-energy", rct, 0);
    s.projects.push(p);
    expect(projectCoins(model, s, 2)).toEqual([]);
    p.level = 2;
    expect(projectCoins(model, s, 2).map((x) => x.coins)).toEqual([1]);
  });

  it("charge the care bill from 2038 unless enough health hubs stand", () => {
    const s = fresh(model);
    s.year = 2036;
    s.coins = 0;
    expect(settleCoins(makeCtx(model, s, 5)).charges).toBe(1);
    s.coins = 0;
    s.projects.push(working("health-hub", merthyr), working("health-hub", rct));
    expect(careBillOff(model, s)).toBe(true);
    expect(settleCoins(makeCtx(model, s, 5)).charges).toBe(0);
  });

  it("take 2 coins a turn for the four years after a lost election", () => {
    const s = fresh(model);
    s.coins = 0;
    s.election = { records: [{ year: 2030, turn: 1, result: "lost", backers: [], peopleShare: 0.2 }], weakUntil: 3, strongUntil: null };
    const r = settleCoins(makeCtx(model, s, 1));
    expect(r.charges).toBe(2);
    expect(s.ledger[s.ledger.length - 1]).toMatchObject({ rule: "B3", cause: { kind: "election", year: 2030 } });
    s.coins = 0;
    expect(settleCoins(makeCtx(model, s, 3)).charges).toBe(0);
  });
});
