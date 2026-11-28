import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { newBoard } from "./clock";
import { makeCtx } from "./ctx";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { setParam, withCards } from "./test-cards";
import { youngFollowWork, youngLinks, youngPull } from "./spread-young";
import type { BoardModel, BoardRule, BoardState, ProjectState } from "./types";

/** The growth, spread and budget cards on disk (model/board/rules). */
const diskCards: BoardRule[] = ["growth", "spread", "budget"].flatMap((f) =>
  (load(readFileSync(resolve(__dirname, `../../../model/board/rules/${f}.yaml`), "utf8")) as { rules: BoardRule[] }).rules);
/** The three council fixture with these real cards switched on. */
const fixtureWith = (...ids: string[]): BoardModel => withCards(boardFixture(), diskCards, ids);

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;

const working = (project: string, site: ProjectState["site"]): ProjectState => ({
  id: `${project}@${site.council ?? site.link}`, project, site, level: 1, status: "working", startedStep: 0, readyStep: 0, roots: 1, joined: false,
});

const realYoung = (model: BoardModel, code: string): number => model.councils.find((c) => c.code === code)!.real.young_adults!;

/** One step of S3 on a fresh board, returning the board after. */
function step(model: BoardModel, s: BoardState = newBoard(model, 1, "work-valleys")): BoardState {
  youngFollowWork(makeCtx(model, s, s.step));
  return s;
}

describe("S3 along the real links, bounded and two sided", () => {
  it("keeps phase 1's card as it was: every commuting link, loss only", () => {
    const model = boardFixture();
    expect(youngLinks(model).map((l) => l.id)).toEqual(["commute:merthyr-cardiff", "commute:merthyr-rct", "commute:rct-cardiff", "commute:rct-merthyr", "rail:merthyr-rct", "rail:rct-cardiff"]);
    const s = newBoard(model, 1, "work-valleys");
    const w = s.councils[cardiff]!.measures.work;
    step(model, s);
    expect(s.councils[cardiff]!.measures.work).toBe(w);
  });

  it("moves people along each council's strongest commuting links only, and every rail link", () => {
    const model = fixtureWith("S3");
    setParam(model, "S3", "links_per_council", 1);
    expect(youngLinks(model).map((l) => l.id)).toEqual(["commute:merthyr-rct", "commute:rct-cardiff", "rail:merthyr-rct", "rail:rct-cardiff"]);
  });

  it("moves young adults to the higher pull and works both ways: work and Welsh down where they leave, up where they arrive, homes dearer", () => {
    const model = fixtureWith("S3");
    const s = newBoard(model, 1, "work-valleys");
    const before = structuredClone(s.councils);
    const byPull = [...model.game.councils].sort((a, b) => youngPull(model, s, s.councils[a]!, a) - youngPull(model, s, s.councils[b]!, b));
    const lo = byPull[0]!;
    const hi = byPull[byPull.length - 1]!;
    expect(hi).toBe(cardiff);
    step(model, s);
    const lost = before[lo]!.young - s.councils[lo]!.young;
    const gained = s.councils[cardiff]!.young - before[cardiff]!.young;
    expect(lost).toBeGreaterThan(0);
    expect(gained).toBeGreaterThan(0);
    expect(s.councils[lo]!.measures.work).toBeLessThan(before[lo]!.measures.work);
    expect(s.councils[cardiff]!.measures.work).toBeGreaterThan(before[cardiff]!.measures.work);
    expect(s.councils[cardiff]!.measures.welsh).toBeGreaterThan(before[cardiff]!.measures.welsh);
    expect(s.councils[cardiff]!.measures.homes).toBeLessThan(before[cardiff]!.measures.homes);
    const total = (b: Record<string, { young: number; pop: number }>) => Object.values(b).reduce((a, c) => a + (c.young / 100) * c.pop, 0);
    // People are counted, not made: young adults across the board stay the same to within rounding of populations.
    expect(Math.abs(total(s.councils) - total(before)) / total(before)).toBeLessThan(1e-3);
    expect(s.ledger.filter((c) => c.rule === "S3").every((c) => c.cause.kind === "people")).toBe(true);
  });

  it("lets homes projects hold back the dearer homes where they arrive", () => {
    const model = fixtureWith("S3");
    const plain = step(model);
    const s = newBoard(model, 1, "work-valleys");
    const h0 = s.councils[cardiff]!.measures.homes;
    s.projects.push(working("social-homes", { council: cardiff }));
    step(model, s);
    const cutPlain = h0 - plain.councils[cardiff]!.measures.homes;
    expect(h0 - s.councils[cardiff]!.measures.homes).toBeCloseTo(cutPlain / 2, 3);
  });

  it("never takes a council below its floor or above its ceiling, as shares of its real 2026 figure", () => {
    const model = fixtureWith("S3");
    setParam(model, "S3", "max_per_year", 0.5);
    setParam(model, "S3", "pull_per_year", 0.25);
    setParam(model, "S3", "floor_share", 0.6);
    let s = newBoard(model, 1, "work-valleys");
    for (let i = 0; i < 400; i++) s = step(model, s);
    for (const code of model.game.councils) {
      expect(s.councils[code]!.young).toBeGreaterThanOrEqual(0.6 * realYoung(model, code) - 1e-3);
      expect(s.councils[code]!.young).toBeLessThanOrEqual(1.5 * realYoung(model, code) + 1e-3);
    }
    expect(model.game.councils.some((c) => Math.abs(s.councils[c]!.young - 0.6 * realYoung(model, c)) < 0.05)).toBe(true);
  });

  it("counts momentum in the pull (with R2), and the valley end of an upgraded line once work comes up the line", () => {
    const model = fixtureWith("S3", "R2");
    const s = newBoard(model, 1, "work-valleys");
    const base = youngPull(model, s, s.councils[merthyr]!, rct);
    s.councils[merthyr]!.momentum = "rising";
    expect(youngPull(model, s, s.councils[merthyr]!, rct)).toBeCloseTo(base + 1, 6);
    s.councils[merthyr]!.momentum = "steady";
    s.projects.push(working("work-up-the-line", { council: merthyr }));
    expect(youngPull(model, s, s.councils[merthyr]!, rct)).toBeCloseTo(base, 6);
    s.linkQuality["rail:merthyr-rct"] = 2;
    expect(youngPull(model, s, s.councils[merthyr]!, rct)).toBeCloseTo(base + 2, 6);
    expect(youngPull(model, s, s.councils[cardiff]!, rct)).toBe(s.councils[cardiff]!.measures.work + s.councils[cardiff]!.measures.homes);
  });
});
