import { describe, expect, it } from "vitest";
import { bandFor, computeTrust, type TrustFacts } from "./trust";
import { testModel } from "./test-model";

const g = testModel().game;
const facts = (over: Partial<TrustFacts> = {}): TrustFacts => ({
  before: 50,
  pipsBefore: [4, 4, 5, 4, 5, 5, 4],
  pipsAfter: [4, 4, 5, 4, 5, 5, 4],
  arrivals: 0,
  pledge: null,
  gapChange: 0,
  shock: null,
  visit: null,
  neglected: [],
  debtTokens: 0,
  extra: [],
  returning: false,
  ...over,
});
const pts = (f: TrustFacts, code: string) => computeTrust(g, f).reasons.filter((r) => r.code === code).reduce((a, r) => a + r.points, 0);

describe("Trust", () => {
  it("has the four bands with card limits 4, 3, 2 and the caretaker", () => {
    expect(bandFor(g, 75)).toMatchObject({ id: "strong", cards: 4 });
    expect(bandFor(g, 55)).toMatchObject({ id: "fair", cards: 3 });
    expect(bandFor(g, 30)).toMatchObject({ id: "thin", cards: 2 });
    expect(bandFor(g, 19)).toMatchObject({ id: "collapsed" });
  });
  it("rewards pips gained on the five visible strands, capped at +12", () => {
    expect(pts(facts({ pipsAfter: [5, 4, 5, 4, 5, 5, 4] }), "pips_gained")).toBe(4);
    expect(pts(facts({ pipsAfter: [7, 4, 7, 4, 5, 5, 4] }), "pips_gained")).toBe(12);
    // resilient and global do not count
    expect(pts(facts({ pipsAfter: [4, 5, 5, 4, 5, 5, 5] }), "pips_gained")).toBe(0);
  });
  it("punishes each pip lost on any strand", () => {
    expect(pts(facts({ pipsAfter: [4, 3, 5, 4, 5, 5, 3] }), "pips_lost")).toBe(-10);
  });
  it("counts nothing visible when no pip rose and nothing arrived", () => {
    expect(pts(facts(), "nothing_visible")).toBe(-4);
    expect(pts(facts({ arrivals: 1 }), "nothing_visible")).toBe(0);
    expect(pts(facts({ arrivals: 3 }), "promise_kept")).toBe(6);
  });
  it("scores pledges, the gap, shocks, visits, neglect and debt", () => {
    expect(pts(facts({ pledge: { strand: "healthier", kept: true } }), "pledge_kept")).toBe(5);
    expect(pts(facts({ pledge: { strand: "healthier", kept: false } }), "pledge_broken")).toBe(-8);
    expect(pts(facts({ gapChange: 0.2 }), "gap_narrowed")).toBe(5);
    expect(pts(facts({ gapChange: -0.2 }), "gap_widened")).toBe(-6);
    expect(pts(facts({ gapChange: 0.01 }), "gap_narrowed")).toBe(0);
    expect(pts(facts({ shock: { prepared: true, response: 0 } }), "shock_prepared")).toBe(5);
    expect(pts(facts({ shock: { prepared: false, response: 1 } }), "shock_responded")).toBe(3);
    expect(pts(facts({ shock: { prepared: false, response: 0 } }), "shock_absorbed")).toBe(-6);
    expect(pts(facts({ visit: "well" }), "visit")).toBe(6);
    expect(pts(facts({ visit: "poorly" }), "visit")).toBe(-6);
    expect(pts(facts({ neglected: ["north", "mid"] }), "neglect")).toBe(-8);
    expect(pts(facts({ debtTokens: 2 }), "debt_interest")).toBe(2 * g.trust.debt_interest);
    expect(pts(facts({ repairsOverdue: 2 }), "repairs_overdue")).toBe(2 * (g.trust.repairs_overdue ?? 0));
  });
  it("drifts a tenth of the way back to 50 and clamps the net change to 25", () => {
    expect(computeTrust(g, facts({ before: 70, arrivals: 1 })).after).toBeCloseTo(70 + 3 - 2);
    const big = computeTrust(g, facts({ before: 50, pipsAfter: [0, 0, 0, 0, 0, 0, 0] }));
    expect(big.after).toBe(25);
  });
  it("floors Trust at 20 in a return term", () => {
    expect(computeTrust(g, facts({ before: 40, returning: true, pipsAfter: [0, 4, 5, 4, 5, 5, 4] })).after).toBeGreaterThanOrEqual(20);
  });
  it("lists the two largest reasons first", () => {
    const r = computeTrust(g, facts({ pledge: { strand: "equal", kept: false }, neglected: ["mid"], arrivals: 1 }));
    expect(r.top.map((x) => x.code)).toEqual(["pledge_broken", "neglect"]);
  });
});
