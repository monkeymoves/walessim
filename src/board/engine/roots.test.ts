import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { act, newBoard } from "./clock";
import { makeCtx } from "./ctx";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { pinStart, setParam, withCards } from "./test-cards";
import { applyHeld } from "./held";
import { costOf, preview } from "./projects";
import { freshStartHere, freshlyJoined, growRoots, hasCompany, needFactor, rootsRate, seedScore } from "./roots";
import { seedMeasure } from "./seed";
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

/** Grow roots for `steps` steps from the state's step. */
function grow(model: BoardModel, s: BoardState, steps: number): void {
  for (let i = 0; i < steps; i++) growRoots(makeCtx(model, s, s.step + i));
}

describe("rule R1, roots", () => {
  it("does nothing without its card", () => {
    const model = boardFixture();
    const s = newBoard(model, 1, "warm-homes");
    s.projects.push(working("back-local-firms", merthyr), working("skills-college", rct));
    grow(model, s, 8);
    expect(s.projects.map((p) => [p.roots, p.joined])).toEqual([[1, false], [1, false]]);
  });

  it("grows 3 in 100 a year alone, a quarter year at a time, and 8 in 100 with company of its branch one link away", () => {
    const model = fixtureWith("R1");
    const s = newBoard(model, 1, "warm-homes");
    s.projects.push(working("back-local-firms", merthyr));
    grow(model, s, 4);
    expect(s.projects[0]!.joined).toBe(false);
    expect(s.projects[0]!.roots).toBeCloseTo(1.03, 3);
    s.projects.push(working("skills-college", rct));
    grow(model, s, 4);
    expect(s.projects.every((p) => p.joined)).toBe(true);
    expect(s.projects[0]!.roots).toBeCloseTo(1.03 * 1.08, 3);
  });

  it("makes early beat late: a joined project from 2028 reaches the limit of 5, one from 2040 about 2.2", () => {
    const model = fixtureWith("R1");
    setParam(model, "R1", "max_factor", 5);
    const early = newBoard(model, 1, "warm-homes");
    early.projects.push(working("back-local-firms", merthyr), working("skills-college", merthyr));
    grow(model, early, 22 * 4);
    expect(early.projects[0]!.roots).toBe(5);
    const late = newBoard(model, 1, "warm-homes");
    late.projects.push(working("back-local-firms", merthyr), working("skills-college", merthyr));
    grow(model, late, 10 * 4);
    expect(late.projects[0]!.roots).toBeGreaterThan(2.1);
    expect(late.projects[0]!.roots).toBeLessThan(2.3);
  });

  it("stops growing while building or run down", () => {
    const model = fixtureWith("R1");
    const s = newBoard(model, 1, "warm-homes");
    s.projects.push({ ...working("back-local-firms", merthyr), status: "run_down" }, { ...working("health-hub", rct), status: "building" });
    grow(model, s, 8);
    expect(s.projects.map((p) => p.roots)).toEqual([1, 1]);
  });

  it("counts a live together pair and a keystone with branch_joined as company", () => {
    const model = fixtureWith("R1");
    const s = newBoard(model, 1, "warm-homes");
    const college = working("skills-college", cardiff);
    s.projects.push(college);
    expect(hasCompany(model, s, college)).toBe(false);
    s.linkQuality["rail:rct-cardiff"] = 2;
    expect(hasCompany(model, s, college)).toBe(true);

    const keyed = fixtureWith("R1");
    keyed.projects.find((p) => p.id === "heat-and-homes")!.effects.push({ kind: "special", special: "branch_joined" });
    const t = newBoard(keyed, 1, "warm-homes");
    const school = working("welsh-school", merthyr);
    t.projects.push(school);
    expect(hasCompany(keyed, t, school)).toBe(false);
    t.projects.push(working("heat-and-homes", cardiff));
    expect(hasCompany(keyed, t, school)).toBe(true);
  });

  it("grows faster where the council is on the rise and slower where it slips, never below nothing (with R2)", () => {
    const model = fixtureWith("R1", "R2");
    const s = newBoard(model, 1, "warm-homes");
    const p = working("back-local-firms", merthyr);
    s.councils[merthyr]!.momentum = "rising";
    expect(rootsRate(model, s, p, false)).toBeCloseTo(0.05, 6);
    s.councils[merthyr]!.momentum = "slipping";
    expect(rootsRate(model, s, p, false)).toBeCloseTo(0.01, 6);
    setParam(model, "R2", "roots_bonus", 0.05);
    expect(rootsRate(model, s, p, false)).toBe(0);
  });

  it("multiplies its measure effects, and the extra has a Why? ending at R1 with the project as its cause", () => {
    const model = fixtureWith("R1");
    const s = newBoard(model, 1, "warm-homes");
    const p = working("back-local-firms", merthyr);
    s.projects.push(p);
    const w0 = s.councils[merthyr]!.measures.work;
    applyHeld(makeCtx(model, s, 0));
    expect(s.councils[merthyr]!.measures.work - w0).toBeCloseTo(0.2, 4);
    p.roots = 2;
    applyHeld(makeCtx(model, s, 1));
    expect(s.councils[merthyr]!.measures.work - w0).toBeCloseTo(0.4, 4);
    const r1 = s.ledger.find((c) => c.rule === "R1")!;
    expect(r1).toMatchObject({ council: merthyr, quantity: "work", cause: { kind: "project", project: "back-local-firms" } });
    expect(r1.delta).toBeCloseTo(0.2, 4);
  });
});

describe("rule R3, a fresh start", () => {
  it("is off without its card", () => {
    const model = boardFixture();
    const s = newBoard(model, 1, "warm-homes");
    expect(freshStartHere(model, s, merthyr)).toBe(false);
  });

  it("is offered in the lowest councils until something is placed there, and costs a coin less, never below 1", () => {
    const model = fixtureWith("R3");
    setParam(model, "R3", "lowest_count", 1);
    const s = newBoard(model, 1, "work-valleys");
    const lowest = model.game.councils.filter((c) => freshStartHere(model, s, c));
    expect(lowest).toHaveLength(1);
    const code = lowest[0]!;
    expect(costOf(model, s, { kind: "build", project: "back-local-firms", site: { council: code } })).toBe(1);
    expect(costOf(model, s, { kind: "build", project: "social-homes", site: { council: code } })).toBe(2);
    const other = model.game.councils.find((c) => c !== code)!;
    expect(costOf(model, s, { kind: "build", project: "social-homes", site: { council: other } })).toBe(3);
    const after = act(model, s, { kind: "build", project: "social-homes", site: { council: code } });
    expect(after.coins).toBe(s.coins - 2);
    const records = after.ledger.filter((c) => c.quantity === "coins" && c.step === 0).slice(-2);
    expect(records.map((c) => [c.rule, c.delta])).toEqual([["R3", 1], ["project:social-homes", -3]]);
    expect(freshStartHere(model, after, code)).toBe(false);
    expect(preview(model, s, { kind: "build", project: "social-homes", site: { council: code } }).notes[0]).toEqual({ key: "board.build.preview_fresh_start", vars: { n: 1 } });
  });

  it("counts as company for eight years, so its roots grow at the joined rate (with R1)", () => {
    const model = fixtureWith("R1", "R3");
    setParam(model, "R3", "lowest_count", 3);
    const s = act(model, newBoard(model, 1, "work-valleys"), { kind: "build", project: "back-local-firms", site: { council: merthyr } });
    const id = "back-local-firms@" + merthyr;
    expect(freshlyJoined(model, s, 0).has(id)).toBe(true);
    expect(freshlyJoined(model, s, 31).has(id)).toBe(true);
    expect(freshlyJoined(model, s, 32).has(id)).toBe(false);
  });

  it("is offered again in a council that starts to slip, until a new project is placed there", () => {
    const model = fixtureWith("R2", "R3");
    setParam(model, "R3", "lowest_count", 0);
    const s = newBoard(model, 1, "work-valleys");
    s.projects.push(working("back-local-firms", rct));
    expect(freshStartHere(model, s, rct)).toBe(false);
    s.step = 8;
    s.councils[rct]!.momentum = "slipping";
    expect(freshStartHere(model, s, rct)).toBe(true);
    s.projects.push({ ...working("skills-college", rct), startedStep: 8 });
    expect(freshStartHere(model, s, rct)).toBe(false);
  });
});

describe("rule R4, need", () => {
  it("is 1 without its card", () => {
    expect(needFactor(boardFixture(), merthyr, "health")).toBe(1);
  });

  it("is 1.3 less 0.08 for each point of the real 2026 score, held between 0.5 and 1.1", () => {
    const model = fixtureWith("R4");
    for (const code of model.game.councils) {
      for (const m of ["health", "work", "nature"] as const) {
        const seed = seedMeasure(model, model.councils.find((c) => c.code === code)!, m);
        expect(seedScore(model, code, m)).toBe(seed);
        expect(needFactor(model, code, m)).toBeCloseTo(Math.min(1.1, Math.max(0.5, 1.3 - 0.08 * seed)), 4);
      }
    }
    expect(needFactor(model, merthyr, "young_adults")).toBe(1);
  });

  it("scales lifts where they land, in the ledger as R4, and leaves losses in full", () => {
    const model = fixtureWith("R4");
    const s = newBoard(model, 1, "warm-homes");
    s.projects.push(working("health-hub", merthyr), working("big-employer", cardiff));
    const h0 = s.councils[merthyr]!.measures.health;
    applyHeld(makeCtx(model, s, 0));
    const f = needFactor(model, merthyr, "health");
    expect(s.councils[merthyr]!.measures.health - h0).toBeCloseTo(0.6 * f, 3);
    expect(s.ledger.find((c) => c.rule === "R4" && c.council === merthyr)?.delta).toBeCloseTo(0.6 * (f - 1), 3);
    expect(s.ledger.some((c) => c.rule === "R4" && c.quantity.startsWith("risk"))).toBe(false);
  });

  it("shows in the preview, with a note on where it does more or less", () => {
    const model = fixtureWith("R4");
    const s = newBoard(model, 1, "warm-homes");
    const pv = preview(model, s, { kind: "build", project: "buses-meet-trains", site: { council: merthyr } });
    const health = pv.changes.find((c) => c.quantity === "health" && c.council === merthyr)!;
    expect(health.delta).toBeCloseTo(0.3 * needFactor(model, merthyr, "health"), 2);
    expect(pv.notes.some((n) => n.key === "board.build.preview_need_more" || n.key === "board.build.preview_need_less")).toBe(true);
  });
});
