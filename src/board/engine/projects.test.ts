import { describe, expect, it } from "vitest";
import { BoardActionError } from "./errors";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { blockers, options, preview } from "./projects";
import { act, advance, newBoard, tick } from "./clock";
import { keystoneLastStep, stepsOf } from "./time";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REAL = join(__dirname, "..", "..", "..", "public", "board-model.json");
import type { BoardModel, BoardState, ProjectState } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const working = (project: string, council: string): ProjectState => ({
  id: `${project}@${council}`, project, site: { council }, level: 1, status: "working", startedStep: 0, readyStep: 0, roots: 1, joined: false,
});
const fresh = (model: BoardModel, start = "work-valleys"): BoardState => newBoard(model, 9, start);

describe("what can be built", () => {
  const model = boardFixture();

  it("lists builds in a council, link projects on its lines, and responses and visits open there", () => {
    const s = fresh(model);
    const opts = options(model, s, merthyr);
    expect(opts.some((o) => o.action.kind === "build" && o.action.project === "skills-college")).toBe(true);
    expect(opts.some((o) => o.action.kind === "build" && o.action.site.link === "rail:merthyr-rct")).toBe(true);
    expect(opts.some((o) => o.action.kind === "build" && o.action.site.link === "rail:rct-cardiff")).toBe(false);
    expect(opts.some((o) => o.action.kind === "law")).toBe(false);
    expect(options(model, s).some((o) => o.action.kind === "law")).toBe(true);
  });

  it("makes the start's free project cost nothing, once", () => {
    let s = fresh(model);
    const free = { kind: "build" as const, project: "skills-college", site: { council: merthyr } };
    expect(preview(model, s, free).cost).toBe(0);
    s = act(model, s, free);
    expect(s.coins).toBe(6);
    expect(s.freeProject).toBeNull();
    expect(s.projects[0]).toMatchObject({ free: true, status: "building", startedStep: 0, readyStep: 7 });
    expect(preview(model, s, { ...free, site: { council: rct } }).cost).toBe(3);
  });

  it("refuses what it cannot afford, what is already there, and what lacks a feature", () => {
    const s = fresh(model);
    s.coins = 1;
    expect(blockers(model, s, { kind: "build", project: "social-homes", site: { council: cardiff } })).toContainEqual({ kind: "coins", need: 3, have: 1 });
    s.coins = 10;
    s.projects.push(working("social-homes", cardiff));
    expect(blockers(model, s, { kind: "build", project: "social-homes", site: { council: cardiff } })).toContainEqual({ kind: "already_here" });
    const b = blockers(model, s, { kind: "build", project: "coast-wetlands", site: { council: merthyr } });
    expect(b).toEqual([{ kind: "needs", condition: { kind: "feature", feature: "coast" }, rule: "project:coast-wetlands" }]);
    expect(() => act(model, s, { kind: "build", project: "coast-wetlands", site: { council: merthyr } })).toThrow(BoardActionError);
  });

  it("opens tier 2 when three tier 1 projects of the branch work anywhere, and says which rule", () => {
    const s = fresh(model);
    s.coins = 20;
    const hub = { kind: "build" as const, project: "health-hub", site: { council: merthyr } };
    expect(blockers(model, s, hub)).toEqual([{ kind: "needs", condition: { kind: "project", branch: "homes", tier: 1, where: "anywhere", at_least: 3 }, rule: "need:homes:2", have: 0 }]);
    s.projects.push(working("warm-terraces", merthyr), working("social-homes", rct));
    // The blocker counts what stands, so the screen can say "2 of 3".
    expect(blockers(model, s, hub)).toEqual([{ kind: "needs", condition: { kind: "project", branch: "homes", tier: 1, where: "anywhere", at_least: 3 }, rule: "need:homes:2", have: 2 }]);
    s.projects.push(working("welsh-school", cardiff));
    expect(blockers(model, s, hub)).toEqual([]);
  });

  it("gates upgrades by tier: level 2 needs tier 2 of the branch", () => {
    const s = fresh(model);
    s.coins = 20;
    s.projects.push(working("warm-terraces", merthyr));
    const up = { kind: "upgrade" as const, project: "warm-terraces", site: { council: merthyr } };
    expect(blockers(model, s, up)[0]).toMatchObject({ kind: "needs", rule: "need:homes:2" });
    s.projects.push(working("social-homes", rct), working("welsh-school", cardiff));
    expect(blockers(model, s, up)).toEqual([]);
    const after = act(model, s, up);
    expect(after.projects.find((p) => p.project === "warm-terraces")!.level).toBe(2);
    expect(after.coins).toBe(17);
  });

  it("will not start a keystone after the first step of 2042", () => {
    const s = fresh(model);
    s.coins = 20;
    s.year = 2042;
    s.step = keystoneLastStep(model) + 1;
    const b = blockers(model, s, { kind: "build", project: "rivers-room", site: { council: merthyr } });
    expect(b).toContainEqual({ kind: "too_late", lastStep: keystoneLastStep(model) });
  });

  it("lets every keystone started on its last step open by the last step, at its full build time", () => {
    for (const m of [model, ...(existsSync(REAL) ? [JSON.parse(readFileSync(REAL, "utf8")) as BoardModel] : [])]) {
      for (const k of m.projects.filter((p) => p.keystone)) {
        expect(keystoneLastStep(m) + stepsOf(m, k.build_years) - 1, k.id).toBeLessThan(m.game.steps);
      }
    }
  });

  it("allows one law change a term", () => {
    let s = fresh(model);
    s = act(model, s, { kind: "law", law: "local-homes-rule", pass: true });
    expect(s.laws).toEqual(["local-homes-rule"]);
    expect(blockers(model, s, { kind: "law", law: "flood-plain-rule", pass: true })).toEqual([{ kind: "law_changes_used" }]);
    expect(s.ledger.some((c) => c.quantity === "backing" && c.cause.kind === "law" && c.council === cardiff && c.delta < 0)).toBe(true);
  });

  it("offers the place a build names, and the visit closes the offer", () => {
    let s = fresh(model);
    s.coins = 10;
    s = act(model, s, { kind: "build", project: "frequent-trains", site: { link: "rail:merthyr-rct" } });
    expect(s.pending).toEqual([{ kind: "visit", place: "merthyr-station", council: merthyr, offeredBy: { project: "frequent-trains" }, since: 0 }]);
    const visits = options(model, s, merthyr).filter((o) => o.action.kind === "visit");
    expect(visits.map((o) => (o.action.kind === "visit" ? o.action.picks[0] : ""))).toEqual(["homes", "workspace", "park-ride"]);
    s = act(model, s, visits[0]!.action);
    expect(s.openVisitSince).toBe(0);
    expect(s.pending).toEqual([]);
    expect(s.projects[0]!.grade).toBeDefined();
  });

  it("never shows a visit it will refuse: a second offer within a year can be made", () => {
    let s = fresh(model);
    s.coins = 10;
    s = act(model, s, { kind: "build", project: "frequent-trains", site: { link: "rail:merthyr-rct" } });
    s = act(model, s, options(model, s, merthyr).find((o) => o.action.kind === "visit")!.action);
    // A second offer arrives a season later, well inside the year since the first visit.
    s = { ...s, step: s.step + 1, pending: [{ kind: "visit", place: "merthyr-station", council: merthyr, offeredBy: { project: "frequent-trains" }, since: s.step + 1 }] };
    const visits = options(model, s, merthyr).filter((o) => o.action.kind === "visit");
    expect(visits.length).toBeGreaterThan(0);
    expect(visits.every((o) => o.allowed)).toBe(true);
    expect(() => act(model, s, visits[0]!.action)).not.toThrow();
  });

  it("builds a project in its build time and keeps it for the rest of the game", () => {
    let s = fresh(model);
    s = act(model, s, { kind: "build", project: "welsh-school", site: { council: merthyr } });
    expect(s.projects[0]).toMatchObject({ status: "building", readyStep: 23 });
    while (s.step < 23) s = advance(model, s, { maxSteps: 23 - s.step }).state;
    expect(s.projects[0]!.status).toBe("building");
    const out = tick(model, s);
    expect(out.state.projects[0]!.status).toBe("working");
    expect(out.report.finished).toEqual([`welsh-school@${merthyr}`]);
  });
});

describe("preview", () => {
  const model = boardFixture();

  it("shows the direct lift, the year it is felt, and where new jobs travel", () => {
    const s = fresh(model);
    s.coins = 10;
    const p = preview(model, s, { kind: "build", project: "big-employer", site: { council: cardiff } });
    expect(p.allowed).toBe(true);
    expect(p.coinsAfter).toBe(6);
    expect(p.changes).toContainEqual({ council: cardiff, quantity: "work", delta: 0.8, year: 2026, rule: "project:big-employer" });
    expect(p.changes).toContainEqual({ council: rct, quantity: "work", delta: 0.12, year: 2026, rule: "S1", via: { link: "commute:rct-cardiff", from: cardiff } });
    expect(p.changes.some((c) => c.rule === "S2" && c.council === rct && c.delta < 0)).toBe(true);
    expect(p.links).toContain("commute:rct-cardiff");
    expect(p.councils).toEqual(expect.arrayContaining([cardiff, rct, merthyr]));
    expect(p.notes.some((n) => n.key === "board.build.catch")).toBe(true);
  });

  it("warns when a build leaves a pair apart (a college with no jobs or fast line in reach)", () => {
    const s = fresh(model);
    const p = preview(model, s, { kind: "build", project: "skills-college", site: { council: merthyr } });
    expect(p.notes).toContainEqual(expect.objectContaining({ key: "board.build.preview_apart" }));
  });

  it("shows only the extra for an upgrade", () => {
    const s = fresh(model);
    s.coins = 20;
    s.projects.push(working("warm-terraces", merthyr), working("social-homes", rct), working("welsh-school", cardiff));
    const p = preview(model, s, { kind: "upgrade", project: "social-homes", site: { council: rct } });
    expect(p.changes.find((c) => c.quantity === "homes" && c.council === rct)!.delta).toBeCloseTo(0.6 * 1.2, 2);
  });
});
