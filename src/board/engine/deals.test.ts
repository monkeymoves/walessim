import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { ctxOf, handState, nextYears, standing } from "./hand-state";
import { dealBlockers, dealChoices, dealDiscount, judgeDeals, offerDeals, takeDeal } from "./deals";
import { seedPeople } from "./people";
import { P6_START, withCard } from "./test-cards";
import type { BoardModel, BoardState, ElectionRecord } from "./types";

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

  it("broken when the due date passes first: Backing falls everywhere", () => {
    const s = seeded();
    s.deals.push({ council: merthyr, measure: "homes", madeStep: 0, dueStep: 16, kept: null });
    const before = s.councils[cardiff]!.backing;
    nextYears(model, s, 4);
    const ctx = ctxOf(model, s);
    ctx.step = 15;
    judgeDeals(ctx);
    expect(s.deals[0]!.kept).toBe(false);
    expect(s.councils[cardiff]!.backing - before).toBeCloseTo(-0.5, 3);
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
