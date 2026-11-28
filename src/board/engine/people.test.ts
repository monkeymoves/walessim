import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { ctxOf, handState, nextYears, standing } from "./hand-state";
import { election, fasterBuild, holdElection, judgePromise, peopleShares, seedPeople, shiftMoods, syncMoods, updatePeople } from "./people";
import { isElectionStep } from "./time";
import { backingFrom } from "./people-moods";
import { withCard } from "./test-cards";

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
    nextYears(model, s, 2);
    const before = s.councils[merthyr]!.backing;
    s.projects.push(standing("buses-meet-trains", { council: merthyr }, 8));
    updatePeople(ctxOf(model, s), 2);
    expect(s.councils[merthyr]!.backing).toBeGreaterThan(before);
    expect(s.councils[merthyr]!.moods.young!.mood).toBeGreaterThan(5);
    expect(s.councils[merthyr]!.moods.young!.reason?.key).toBe("board.mood.measure.up");
  });

  it("every backing change is in the ledger with its rule and group", () => {
    const s = seeded("warm-homes");
    s.councils[cardiff]!.measures.health -= 1;
    nextYears(model, s, 2);
    const before = s.councils[cardiff]!.backing;
    const mark = s.ledger.length;
    updatePeople(ctxOf(model, s), 2);
    const parts = s.ledger.slice(mark).filter((c) => c.council === cardiff);
    const sum = parts.reduce((a, c) => a + c.delta, 0);
    expect(sum).toBeCloseTo(s.councils[cardiff]!.backing - before, 3);
    expect(parts.every((c) => (c.rule === "P1" || c.rule === "P3") && c.cause.kind === "people")).toBe(true);
  });

  it("a council with nothing built near it for 8 years is passed over", () => {
    const s = seeded("warm-homes");
    for (let t = 0; t < 4; t++) nextYears(model, s, 2);
    updatePeople(ctxOf(model, s), 2);
    expect(s.ledger.some((c) => c.rule === "P3")).toBe(true);
    expect(s.councils[cardiff]!.moods.older!.reason?.key).toBe("board.mood.passed_over");
  });

  it("a project within one link stops a council being passed over", () => {
    const s = seeded("warm-homes");
    s.projects.push(standing("social-homes", { council: rct }, 24));
    for (let t = 0; t < 4; t++) nextYears(model, s, 2);
    updatePeople(ctxOf(model, s), 2);
    expect(s.ledger.filter((c) => c.rule === "P3")).toEqual([]);
    expect(s.councils[cardiff]!.lastReachedStep).toBe(24);
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
  it("is judged when the clock reaches its year, against 2026", () => {
    const s = seeded("warm-homes");
    nextYears(model, s, 4);
    judgePromise(ctxOf(model, s), s.step);
    expect(s.promise.kept).toBeNull();
    nextYears(model, s, 4);
    for (const c of Object.values(s.councils)) c.measures.homes += 0.5;
    judgePromise(ctxOf(model, s), s.step);
    expect(s.promise.kept).toBe(true);
  });
});

describe("elections (rule P4)", () => {
  it("are held on the first step of an election year", () => {
    const s = seeded();
    expect([15, 16, 17, 32].map((x) => isElectionStep(model, x))).toEqual([false, true, false, true]);
    expect(holdElection(ctxOf(model, s), 16)).toMatchObject({ year: 2030, step: 16 });
  });

  it("are won with backing councils holding more than half the people", () => {
    const s = seeded();
    nextYears(model, s, 2);
    for (const code of [merthyr, rct]) s.councils[code]!.backing = 6;
    s.councils[cardiff]!.backing = 4;
    const shares = peopleShares(model);
    s.step = 16;
    const v = holdElection(ctxOf(model, s), 16);
    expect(v.peopleShare).toBeCloseTo(shares[merthyr]! + shares[rct]!, 6);
    expect(v.result).toBe(v.peopleShare > 0.5 ? (v.peopleShare >= 0.667 ? "strong_win" : "win") : "lost");
    expect(v.backers).toHaveLength(2);
    expect(election(model, s)).toMatchObject({ held: true, backers: 2, nextYear: 2034 });
  });

  it("a loss means governing with others for the term: no law changes, and the weak hand while B3 stands", () => {
    const s = seeded();
    s.step = 16;
    s.councils[merthyr]!.backing = 6;
    s.councils[rct]!.backing = 4;
    s.councils[cardiff]!.backing = 4;
    const v = holdElection(ctxOf(model, s), 16);
    expect(v.result).toBe("lost");
    expect(s.election.hungUntil).toBe(31);
    expect(s.lawChangesLeft).toBe(0);
    expect(election(model, s).held).toBe(true);
    expect(election(model, s).says.map((x) => x.key)).toContain("board.election.weak_hand");
  });

  it("a strong win gives an extra law change and faster builds where you were backed", () => {
    const s = seeded();
    nextYears(model, s, 2);
    for (const code of [merthyr, rct, cardiff]) s.councils[code]!.backing = 7;
    s.step = 16;
    expect(holdElection(ctxOf(model, s), 16).result).toBe("strong_win");
    expect(s.lawChangesLeft).toBe(2);
    nextYears(model, s, 2);
    expect(fasterBuild(model, s, cardiff)).toBe(2);
  });

  it("mid term the view is a projection for the next election", () => {
    const s = seeded();
    const v = election(model, s);
    expect(v.held).toBe(false);
    expect(v.year).toBe(2030);
    expect(v.says[1]!.key).toMatch(/\.projected$/);
  });
});

describe("phase 2 people rules (16.3.1)", () => {
  it("moods judged only against four years ago (P1 middle_share 0) are not zero sum", () => {
    const run = (m: typeof model) => {
      const s = handState(m, { start: "warm-homes" });
      seedPeople(ctxOf(m, s));
      for (const c of Object.values(s.councils)) for (const k of ["work", "homes", "health"] as const) c.measures[k] += 1;
      nextYears(m, s, 2);
      updatePeople(ctxOf(m, s), 2);
      return s.councils[cardiff]!.backing;
    };
    expect(run(withCard(model, "P1", { middle_share: 0 }))).toBeGreaterThan(run(model));
  });

  it("with max_loss, only a council with nothing standing within one link is passed over, and the loss stops at the cap", () => {
    const m = withCard(model, "P3", { loss_per_year: 0.5, max_loss: 1 });
    const s = handState(m, { start: "warm-homes" });
    seedPeople(ctxOf(m, s));
    s.projects.push(standing("social-homes", { council: merthyr }, 0));
    for (let y = 0; y < 16; y++) {
      nextYears(m, s, 1);
      const ctx = ctxOf(m, s);
      ctx.step = s.step - 1;
      updatePeople(ctx, 1);
    }
    const lost = (code: string) => s.ledger.filter((c) => c.rule === "P3" && c.council === code).reduce((a, c) => a + c.delta, 0);
    expect(lost(merthyr)).toBe(0);
    expect(lost(rct)).toBe(0);
    expect(lost(cardiff)).toBe(0);
    s.projects = [];
    for (let y = 0; y < 6; y++) {
      nextYears(m, s, 1);
      const ctx = ctxOf(m, s);
      ctx.step = s.step - 1;
      updatePeople(ctx, 1);
    }
    expect(lost(cardiff)).toBeCloseTo(-1, 2);
  });
});
