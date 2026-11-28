import { describe, expect, it } from "vitest";
import { makeCtx } from "./ctx";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { downstreamOf, echoes, spreadAlongLinks, upstreamCut, youngFollowWork } from "./spread";
import { act, endTurn, newBoard } from "./turn";
import type { BoardModel, BoardState, Cause } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const cause: Cause = { kind: "project", project: "big-employer", site: { council: cardiff } };

function board(model: BoardModel): BoardState {
  return newBoard(model, 1, "work-valleys");
}

/** Pretend new jobs of `delta` landed in Cardiff this turn, then run one link rule. */
function jobsInCardiff(model: BoardModel, state: BoardState, delta: number, rule: "S1" | "S2") {
  const ctx = makeCtx(model, state);
  ctx.change({ council: cardiff, quantity: "work", delta, rule: "project:big-employer", cause, jobs: true });
  spreadAlongLinks(ctx, rule);
  return ctx;
}

describe("S1 jobs travel home", () => {
  it("lifts Work and pay where Cardiff's workers live, by the commuting share", () => {
    const model = boardFixture();
    const s = board(model);
    const before = { m: s.councils[merthyr]!.measures.work, r: s.councils[rct]!.measures.work };
    const ctx = jobsInCardiff(model, s, 1, "S1");
    expect(s.councils[rct]!.measures.work - before.r).toBeCloseTo(0.15, 3);
    expect(s.councils[merthyr]!.measures.work - before.m).toBeCloseTo(0.08, 3);
    const rec = s.ledger.find((c) => c.rule === "S1" && c.council === rct)!;
    expect(rec.via).toEqual({ link: "commute:rct-cardiff", from: cardiff });
    expect(rec.cause).toEqual(cause);
    expect(ctx.flows.some((f) => f.rule === "S1" && f.to === rct)).toBe(true);
  });

  it("travels further on a frequent line (quality 2)", () => {
    const model = boardFixture();
    const s = board(model);
    s.linkQuality["rail:rct-cardiff"] = 2;
    const before = s.councils[rct]!.measures.work;
    jobsInCardiff(model, s, 1, "S1");
    expect(s.councils[rct]!.measures.work - before).toBeCloseTo(0.15 * 1.5, 3);
  });

  it("stops after one hop: what arrives in Rhondda Cynon Taf does not travel on to Merthyr Tydfil", () => {
    const model = boardFixture();
    const s = board(model);
    jobsInCardiff(model, s, 1, "S1");
    expect(s.ledger.filter((c) => c.rule === "S1").every((c) => c.via?.from === cardiff)).toBe(true);
  });
});

describe("S2 prices travel up the line", () => {
  it("lowers Homes and community where Cardiff's workers live", () => {
    const model = boardFixture();
    const s = board(model);
    const before = s.councils[rct]!.measures.homes;
    jobsInCardiff(model, s, 1, "S2");
    expect(s.councils[rct]!.measures.homes - before).toBeCloseTo(-0.15 * 0.4, 3);
  });

  it("is held back by homes built there (social homes block half)", () => {
    const model = boardFixture();
    const s = board(model);
    s.projects.push({ id: `social-homes@${rct}`, project: "social-homes", site: { council: rct }, level: 1, status: "working", startedTurn: 0, readyTurn: 0 });
    const before = s.councils[rct]!.measures.homes;
    jobsInCardiff(model, s, 1, "S2");
    expect(s.councils[rct]!.measures.homes - before).toBeCloseTo(-0.15 * 0.4 * 0.5, 3);
  });

  it("previews the same echo it applies", () => {
    const model = boardFixture();
    const s = board(model);
    const e = echoes(model, s, "S2", cardiff, 1).find((x) => x.council === rct)!;
    expect(e.amount).toBeCloseTo(-0.06, 4);
  });
});

describe("S3 young people follow work and homes", () => {
  it("moves young adults from the lower to the higher, counting people on both sides", () => {
    const model = boardFixture();
    model.rules.find((r) => r.id === "S3")!.params.work_per_point = { default: 0.1, min: 0, max: 1, unit: { en: "points", cy: "pwyntiau" }, adjustable: true };
    const s = board(model);
    s.councils[cardiff]!.measures.work = 9;
    s.councils[rct]!.measures.work = 2;
    const people = (code: string) => (s.councils[code]!.young / 100) * s.councils[code]!.pop;
    const before = { r: people(rct), c: people(cardiff), work: s.councils[rct]!.measures.work };
    const ctx = makeCtx(model, s);
    youngFollowWork(ctx);
    const lost = before.r - people(rct);
    expect(lost).toBeGreaterThan(0);
    expect(s.councils[rct]!.measures.work).toBeLessThan(before.work);
    expect(s.ledger.some((c) => c.rule === "S3" && c.council === cardiff && c.quantity === "young_adults" && c.delta > 0 && c.via?.from === rct)).toBe(true);
    // At most `share` points (0.3) on one link, times the quality factor (1 here), on the smaller council.
    const moved = s.ledger.filter((c) => c.rule === "S3" && c.council === rct && c.quantity === "young_adults").reduce((a, c) => a + c.delta, 0);
    expect(moved).toBeLessThan(0);
  });
});

describe("S4 water runs downhill", () => {
  it("knows the river below a council, several hops down", () => {
    const model = boardFixture();
    expect(downstreamOf(model, merthyr)).toEqual([rct, cardiff]);
    expect(downstreamOf(model, cardiff)).toEqual([]);
  });

  it("cuts flood risk downstream a turn after the water is slowed upstream", () => {
    const model = boardFixture();
    let s = newBoard(model, 3, "ready-weather");
    s = act(model, s, { kind: "build", project: "slow-the-water", site: { council: merthyr } });
    s = endTurn(model, s).state;
    expect(s.ledger.some((c) => c.rule === "S4")).toBe(false);
    s = endTurn(model, s).state;
    const cut = s.ledger.find((c) => c.rule === "S4" && c.council === rct)!;
    expect(cut).toMatchObject({ turn: 1, quantity: "risk_flood", delta: -1, via: { link: "river:taff-merthyr-rct", from: merthyr } });
  });

  it("weakens a storm for each flood project in the way", () => {
    const model = boardFixture();
    const s = board(model);
    expect(upstreamCut(model, s, rct)).toBe(0);
    s.projects.push({ id: `slow-the-water@${merthyr}`, project: "slow-the-water", site: { council: merthyr }, level: 1, status: "working", startedTurn: 0, readyTurn: 0 });
    expect(upstreamCut(model, s, rct)).toBeCloseTo(0.25);
  });
});
