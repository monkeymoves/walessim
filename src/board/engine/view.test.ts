import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { councilView, frames, MEASURE_IDS, type BoardModel, type BoardState, type CouncilState, type Frame, type MeasureId } from "./api";
import { moodWord } from "./view";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const flat = (v: number) => Object.fromEntries(MEASURE_IDS.map((m) => [m, v])) as Record<MeasureId, number>;

/** A hand-made state, so this test does not depend on the turn modules. */
function handState(model: BoardModel): BoardState {
  const council = (code: string, base: number): CouncilState => ({
    code, measures: { ...flat(base), health: base - 2 }, pop: model.councils.find((c) => c.code === code)!.real.pop!, young: 18, age65: 20,
    backing: 5, moods: { young: { mood: 2 }, older: { mood: 7, reason: { key: "mood.older.hub" } } }, risks: { flood: 2, tip: 3, employer: 1 }, lastReachedTurn: null,
  });
  const councils = { [merthyr]: council(merthyr, 4), [rct]: council(rct, 5), [cardiff]: council(cardiff, 6) };
  const frame = (turn: number, shift: number): Frame => ({
    turn, year: 2026 + 2 * turn, linkQuality: {}, events: [], flows: [], coins: 6, fairness: 1, projects: [],
    councils: Object.fromEntries(Object.entries(councils).map(([k, c]) => [k, { measures: flat(c.measures.work - shift), young: 18, backing: 5, risks: c.risks }])),
  });
  return {
    version: 1, modelHash: model.meta.hash, gameNumber: 7, seed: 7, start: "warm-homes", future: "quiet-years", turn: 2, year: 2030, phase: "build",
    steps: [], councils, linkQuality: { "rail:merthyr-rct": 2, "rail:rct-cardiff": 1 },
    projects: [
      { id: "frequent-trains@rail:merthyr-rct", project: "frequent-trains", site: { link: "rail:merthyr-rct" }, level: 1, status: "working", startedTurn: 0, readyTurn: 0 },
      { id: "social-homes@" + cardiff, project: "social-homes", site: { council: cardiff }, level: 1, status: "building", startedTurn: 1, readyTurn: 2 },
    ],
    coins: 6, freeProject: null, laws: [], lawChangesLeft: 1,
    election: { records: [{ year: 2030, turn: 1, result: "lost", backers: [cardiff], peopleShare: 0.56 }], weakUntil: 3, strongUntil: null },
    promise: { byYear: 2034, kept: null }, forecast: [], pending: [{ kind: "visit", place: "merthyr-station", council: merthyr, offeredBy: { project: "frequent-trains" } }],
    events: [], severityUsed: 0, visitsThisTurn: 0, history: [frame(0, 1), frame(1, 0.5)], ledger: [],
  };
}

describe("councilView", () => {
  const model = boardFixture();
  const state = handState(model);

  it("shows measures with their 2026 seed, change and honesty label", () => {
    const v = councilView(model, state, merthyr);
    const work = v.measures.find((m) => m.id === "work")!;
    expect(work).toMatchObject({ score: 4, seed: 3, change: 0.5, honesty: "game_estimate" });
    expect(v.asking[0]).toBe("health");
  });

  it("keeps the real 2026 figures with their sources", () => {
    const v = councilView(model, state, merthyr);
    const emp = v.real.find((r) => r.indicator === "employment")!;
    expect(emp).toMatchObject({ value: 68.4, source: "nomis_aps", measure: "work" });
    expect(v.real.find((r) => r.indicator === "pop")?.measure).toBeNull();
  });

  it("lists links both ways, with rail quality now", () => {
    const v = councilView(model, state, rct);
    expect(v.links.find((l) => l.link === "commute:rct-cardiff")).toMatchObject({ direction: "out", other: cardiff, share: 0.15 });
    expect(v.links.find((l) => l.link === "commute:merthyr-rct")).toMatchObject({ direction: "in", other: merthyr });
    expect(v.links.find((l) => l.link === "rail:merthyr-rct")).toMatchObject({ direction: "both", quality: 2 });
    expect(v.links.find((l) => l.link === "river:taff-rct-cardiff")).toMatchObject({ direction: "out" });
  });

  it("puts a link project in both end councils, and groups with moods and real shares", () => {
    expect(councilView(model, state, merthyr).projects.map((p) => p.project)).toEqual(["frequent-trains"]);
    expect(councilView(model, state, cardiff).projects.map((p) => p.project)).toEqual(["social-homes"]);
    const groups = councilView(model, state, merthyr).groups;
    expect(groups.find((g) => g.group === "young")).toMatchObject({ mood: "unhappy", share: 17.2475 });
    expect(groups.find((g) => g.group === "older")).toMatchObject({ mood: "pleased", reason: { key: "mood.older.hub" } });
    expect(groups.find((g) => g.group === "everyone")?.share).toBe(100);
  });

  it("knows who refuses big builds after a lost election, and offered visits", () => {
    expect(councilView(model, state, merthyr)).toMatchObject({ refusesBigBuilds: true, visit: "merthyr-station", backs: true });
    expect(councilView(model, state, cardiff).refusesBigBuilds).toBe(false);
  });

  it("mood words sit around the election line", () => {
    expect([2, 4.5, 5, 6.6].map((m) => moodWord(m, 5))).toEqual(["unhappy", "uneasy", "content", "pleased"]);
  });

  it("frames are the state's history", () => {
    expect(frames(model, state).map((f) => f.year)).toEqual([2026, 2028]);
  });
});
