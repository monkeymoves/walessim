import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { ctxOf, handState, nextTurn, standing } from "./hand-state";
import { election, fasterBuild, holdElection, judgePromise, peopleShares, refusesBuild, seedPeople, shiftMoods, syncMoods, updatePeople } from "./people";
import { backingFrom } from "./people-moods";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const model = boardFixture();

function seeded(start = "work-valleys") {
  const s = handState(model, { start });
  seedPeople(ctxOf(model, s));
  return s;
}

describe("seedPeople (rule P2)", () => {
  it("starts every group at 5 and nudges the councils the start names", () => {
    const s = seeded("work-valleys");
    expect(s.councils[cardiff]!.backing).toBe(5);
    expect(s.councils[merthyr]!.backing).toBeCloseTo(6, 4);
    expect(Object.keys(s.councils[rct]!.moods).sort()).toEqual(model.groups.map((g) => g.id).sort());
    const start = s.ledger.filter((c) => c.cause.kind === "start");
    expect(start.map((c) => c.council).sort()).toEqual([merthyr, rct].sort());
    expect(start.every((c) => c.rule === "P2" && c.quantity === "backing")).toBe(true);
  });
});

describe("moods (rules P1 and P3)", () => {
  it("a council whose measures rise while others do not grows its backing", () => {
    const s = seeded("warm-homes");
    for (const m of ["work", "homes"] as const) s.councils[merthyr]!.measures[m] += 1;
    nextTurn(model, s);
    const before = s.councils[merthyr]!.backing;
    s.projects.push(standing("buses-meet-trains", { council: merthyr }, 1));
    updatePeople(ctxOf(model, s));
    expect(s.councils[merthyr]!.backing).toBeGreaterThan(before);
    expect(s.councils[merthyr]!.moods.young!.mood).toBeGreaterThan(5);
    expect(s.councils[merthyr]!.moods.young!.reason?.key).toBe("mood.measure.up");
  });

  it("every backing change is in the ledger with its rule and group", () => {
    const s = seeded("warm-homes");
    s.councils[cardiff]!.measures.health -= 1;
    nextTurn(model, s);
    const before = s.councils[cardiff]!.backing;
    const mark = s.ledger.length;
    updatePeople(ctxOf(model, s));
    const parts = s.ledger.slice(mark).filter((c) => c.council === cardiff);
    const sum = parts.reduce((a, c) => a + c.delta, 0);
    expect(sum).toBeCloseTo(s.councils[cardiff]!.backing - before, 3);
    expect(parts.every((c) => (c.rule === "P1" || c.rule === "P3") && c.cause.kind === "people")).toBe(true);
  });

  it("a council with nothing built near it for 8 years is passed over", () => {
    const s = seeded("warm-homes");
    for (let t = 0; t < 4; t++) nextTurn(model, s);
    updatePeople(ctxOf(model, s));
    expect(s.ledger.some((c) => c.rule === "P3")).toBe(true);
    expect(s.councils[cardiff]!.moods.older!.reason?.key).toBe("mood.passed_over");
  });

  it("a project within one link stops a council being passed over", () => {
    const s = seeded("warm-homes");
    s.projects.push(standing("social-homes", { council: rct }, 3));
    for (let t = 0; t < 4; t++) nextTurn(model, s);
    updatePeople(ctxOf(model, s));
    expect(s.ledger.filter((c) => c.rule === "P3")).toEqual([]);
    expect(s.councils[cardiff]!.lastReachedTurn).toBe(3);
  });

  it("shiftMoods moves one group and backing by its share; syncMoods keeps direct changes", () => {
    const s = seeded("warm-homes");
    const ctx = ctxOf(model, s);
    shiftMoods(ctx, rct, -2, "older", "P1", { kind: "event", event: "surgery-closes" });
    expect(s.councils[rct]!.moods.older!.mood).toBe(3);
    expect(s.councils[rct]!.backing).toBeLessThan(5);
    expect(s.councils[rct]!.backing).toBeGreaterThan(4);
    s.councils[cardiff]!.backing = 6;
    syncMoods(model, s, cardiff);
    expect(backingFrom(model, cardiff, s.councils[cardiff]!.moods, 0)).toBeCloseTo(6, 4);
  });
});

describe("the promise", () => {
  it("is judged in the turn that reaches its year, against 2026", () => {
    const s = seeded("warm-homes");
    for (let t = 0; t < 2; t++) nextTurn(model, s);
    judgePromise(ctxOf(model, s));
    expect(s.promise.kept).toBeNull();
    nextTurn(model, s); // turn 3 is 2032 to 2034
    for (const c of Object.values(s.councils)) c.measures.homes += 0.5;
    judgePromise(ctxOf(model, s));
    expect(s.promise.kept).toBe(true);
  });
});

describe("elections (rule P4)", () => {
  it("are held only when a turn ends in an election year", () => {
    const s = seeded();
    expect(holdElection(ctxOf(model, s))).toBeNull();
    nextTurn(model, s);
    expect(holdElection(ctxOf(model, s))?.year).toBe(2030);
  });

  it("are won with backing councils holding more than half the people", () => {
    const s = seeded();
    nextTurn(model, s);
    for (const code of [merthyr, rct]) s.councils[code]!.backing = 6;
    s.councils[cardiff]!.backing = 4;
    const shares = peopleShares(model);
    const v = holdElection(ctxOf(model, s))!;
    expect(v.peopleShare).toBeCloseTo(shares[merthyr]! + shares[rct]!, 6);
    expect(v.result).toBe(v.peopleShare > 0.5 ? (v.peopleShare >= 0.667 ? "strong_win" : "win") : "lost");
    expect(v.backers).toBe(2);
    expect(v.nextYear).toBe(2034);
  });

  it("a loss gives the weak hand: no law changes, and big builds refused where you were not backed", () => {
    const s = seeded();
    nextTurn(model, s);
    s.councils[merthyr]!.backing = 6;
    s.councils[rct]!.backing = 4;
    s.councils[cardiff]!.backing = 4;
    const v = holdElection(ctxOf(model, s))!;
    expect(v.result).toBe("lost");
    expect(s.election.weakUntil).toBe(3);
    expect(s.lawChangesLeft).toBe(0);
    nextTurn(model, s);
    expect(refusesBuild(model, s, cardiff, 4)).toBe(true);
    expect(refusesBuild(model, s, cardiff, 3)).toBe(false);
    expect(refusesBuild(model, s, merthyr, 7)).toBe(false);
    expect(election(model, s).held).toBe(true);
    expect(election(model, s).says.map((x) => x.key)).toContain("election.weak_hand");
  });

  it("a strong win gives an extra law change and faster builds where you were backed", () => {
    const s = seeded();
    nextTurn(model, s);
    for (const code of [merthyr, rct, cardiff]) s.councils[code]!.backing = 7;
    expect(holdElection(ctxOf(model, s))!.result).toBe("strong_win");
    expect(s.lawChangesLeft).toBe(2);
    nextTurn(model, s);
    expect(fasterBuild(model, s, cardiff)).toBe(1);
  });

  it("mid term the view is a projection for the next election", () => {
    const s = seeded();
    const v = election(model, s);
    expect(v.held).toBe(false);
    expect(v.year).toBe(2030);
    expect(v.says[1]!.key).toMatch(/\.projected$/);
  });
});
