import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { ctxOf, handState, nextYears, standing } from "./hand-state";
import {
  buildCountsForDeal, dealBlockers, dealChoices, dealDiscount, dealKeptBy, dealLastStep, dealMeasure, dealProgress, judgeDeals, offerDeals, takeDeal,
} from "./deals";
import { seedPeople } from "./people";
import { P6_START, withCard } from "./test-cards";
import type { BoardModel, BoardState, Deal, ElectionRecord } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const plain = boardFixture();
const model: BoardModel = withCard(plain, "P6", P6_START);
const lost: ElectionRecord = { year: 2030, step: 16, result: "lost", backers: [], peopleShare: 0 };

function seeded(m: BoardModel = model): BoardState {
  const s = handState(m, { start: "warm-homes" });
  seedPeople(ctxOf(m, s));
  return s;
}

describe("deals after a lost election (rule P6)", () => {
  it("without the P6 card a lost election offers nothing", () => {
    const s = seeded(plain);
    offerDeals(ctxOf(plain, s), lost);
    expect(s.pending).toEqual([]);
  });

  it("offers two deals: the councils that back you least, each with its weakest measure", () => {
    const s = seeded();
    s.councils[merthyr]!.backing = 3;
    s.councils[rct]!.backing = 4;
    s.councils[rct]!.measures.health = 0.5;
    offerDeals(ctxOf(model, s), lost);
    const offer = s.pending.find((p) => p.kind === "deal");
    expect(offer?.kind === "deal" && offer.choices.map((c) => c.council)).toEqual([merthyr, rct]);
    expect(dealChoices(model, s)[1]).toEqual({ council: rct, measure: "health" });
    offerDeals(ctxOf(model, s), { ...lost, result: "win" });
    expect(s.pending.some((p) => p.kind === "deal")).toBe(false);
  });

  it("a deal taken is due four years later and closes the offer; only offered deals can be taken", () => {
    const s = seeded();
    offerDeals(ctxOf(model, s), lost);
    const choice = dealChoices(model, s)[0]!;
    expect(dealBlockers(model, s, { kind: "deal", council: cardiff === choice.council ? merthyr : cardiff, measure: "nature" })).toEqual([{ kind: "not_offered" }]);
    takeDeal(ctxOf(model, s), { kind: "deal", ...choice });
    expect(s.deals).toEqual([{ ...choice, madeStep: 0, dueStep: 16, kept: null }]);
    expect(s.pending).toEqual([]);
  });

  it("kept when a project that lifts the measure works there: Backing rises there and one link away", () => {
    const s = seeded();
    s.deals.push({ council: merthyr, measure: "homes", madeStep: 0, dueStep: 16, kept: null });
    const before = { here: s.councils[merthyr]!.backing, near: s.councils[rct]!.backing };
    judgeDeals(ctxOf(model, s));
    expect(s.deals[0]!.kept).toBeNull();
    s.projects.push(standing("social-homes", { council: merthyr }, 2));
    judgeDeals(ctxOf(model, s));
    expect(s.deals[0]!.kept).toBe(true);
    expect(s.councils[merthyr]!.backing - before.here).toBeCloseTo(1.5, 3);
    expect(s.councils[rct]!.backing - before.near).toBeCloseTo(0.5, 3);
    expect(s.ledger.filter((c) => c.rule === "P6").every((c) => c.cause.kind === "deal" && c.cause.council === merthyr)).toBe(true);
  });

  it("broken when the due date passes first: Backing falls in that council only, then fades evenly over four years", () => {
    const s = seeded();
    s.deals.push({ council: merthyr, measure: "homes", madeStep: 0, dueStep: 16, kept: null });
    const before = { here: s.councils[merthyr]!.backing, other: s.councils[cardiff]!.backing };
    nextYears(model, s, 4);
    const ctx = ctxOf(model, s);
    ctx.step = 15;
    judgeDeals(ctx);
    expect(s.deals[0]!.kept).toBe(false);
    expect(s.councils[merthyr]!.backing - before.here).toBeCloseTo(-1.5, 3);
    expect(s.councils[cardiff]!.backing).toBeCloseTo(before.other, 6);
    // Each year that closes gives back a quarter, recorded under P6 with the deal as its cause.
    const fade: number[] = [];
    for (let year = 1; year <= 5; year++) {
      const at = ctxOf(model, s);
      at.step = 15 + 4 * year;
      const was = s.councils[merthyr]!.backing;
      judgeDeals(at);
      fade.push(Math.round((s.councils[merthyr]!.backing - was) * 1000) / 1000);
    }
    expect(fade).toEqual([0.375, 0.375, 0.375, 0.375, 0]);
    expect(s.ledger.filter((c) => c.rule === "P6").every((c) => c.cause.kind === "deal" && c.cause.council === merthyr)).toBe(true);
  });

  it("the project that keeps an open deal costs a coin less there, and only there", () => {
    const s = seeded();
    s.deals.push({ council: merthyr, measure: "homes", madeStep: 0, dueStep: 16, kept: null });
    expect(dealDiscount(model, s, [merthyr], "social-homes")).toBe(1);
    expect(dealDiscount(model, s, [cardiff], "social-homes")).toBe(0);
    expect(dealDiscount(model, s, [merthyr], "skills-college")).toBe(0);
    expect(dealDiscount(plain, s, [merthyr], "social-homes")).toBe(0);
  });
});

describe("the honest deal rule (playtest 10 must-fix 1 and should-fix 8)", () => {
  const deal = (over: Partial<Deal> = {}): Deal => ({ council: merthyr, measure: "homes", madeStep: 16, dueStep: 32, kept: null, ...over });

  it("any project that lifts the measure there and works by the date keeps it, even one started before the deal", () => {
    const s = seeded();
    s.deals.push(deal());
    // Started at step 4, long before the deal, and opening at step 20: it counts.
    s.projects.push(standing("social-homes", { council: merthyr }, 4, "building"));
    s.projects[0]!.readyStep = 20;
    expect(dealKeptBy(model, s, s.deals[0]!)).toBeNull();
    s.projects[0]!.status = "working";
    expect(dealKeptBy(model, s, s.deals[0]!)).toBe("social-homes@" + merthyr);
    expect(dealProgress(model, s, s.deals[0]!)).toEqual([{ id: "social-homes@" + merthyr, project: "social-homes", readyStep: 20, inTime: true }]);
  });

  it("says whether a build counts, and why not: another council, another measure, too late, or the deal is closed", () => {
    const d = deal();
    const last = dealLastStep(model, d);
    expect(last).toBe(31);
    expect(buildCountsForDeal(model, d, "social-homes", [merthyr], last)).toBe("counts");
    expect(buildCountsForDeal(model, d, "social-homes", [merthyr], last + 1)).toBe("too_late");
    expect(buildCountsForDeal(model, d, "social-homes", [cardiff], last)).toBe("other_council");
    expect(buildCountsForDeal(model, d, "skills-college", [merthyr], last)).toBe("other_measure");
    expect(buildCountsForDeal(model, deal({ kept: true }), "social-homes", [merthyr], last)).toBe("closed");
    // A deal taken part way through a year runs to the first year close after its due step.
    expect(dealLastStep(model, deal({ madeStep: 18, dueStep: 34 }))).toBe(35);
  });

  it("a build that opens too late gets no deal discount", () => {
    const s = seeded();
    s.deals.push(deal({ madeStep: 0, dueStep: 4 }));
    expect(dealDiscount(model, s, [merthyr], "social-homes", 3)).toBe(1);
    expect(dealDiscount(model, s, [merthyr], "social-homes", 4)).toBe(0);
  });

  it("is never offered already met: the measure asked for is one nothing there lifts yet", () => {
    const s = seeded();
    s.councils[merthyr]!.backing = 1;
    const weakest = dealMeasure(model, s, merthyr)!;
    const lifter = model.projects.find((d) => d.site === "council" && d.effects.some((e) => e.kind === "measure" && e.measure === weakest && e.points > 0))!;
    s.projects.push(standing(lifter.id, { council: merthyr }, 0, "building"));
    const offered = dealChoices(model, s).find((c) => c.council === merthyr)!;
    expect(offered.measure).not.toBe(weakest);
    expect(dealProgress(model, s, { ...deal(), measure: offered.measure })).toEqual([]);
  });

  it("offers a council never in a deal before one already in a deal, and a broken one last", () => {
    const s = seeded();
    s.councils[merthyr]!.backing = 1;
    s.councils[rct]!.backing = 2;
    s.councils[cardiff]!.backing = 3;
    expect(dealChoices(model, s).map((c) => c.council)).toEqual([merthyr, rct]);
    s.deals.push(deal({ kept: false, brokenStep: 32 }));
    expect(dealChoices(model, s).map((c) => c.council)).toEqual([rct, cardiff]);
    s.deals.push(deal({ council: rct, kept: true }));
    expect(dealChoices(model, s).map((c) => c.council)).toEqual([cardiff, rct]);
  });
});
