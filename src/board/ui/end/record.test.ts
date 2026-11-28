// The result at the top of the end screen, and the letter a device shows: pure working, checked
// on hand-made games (the fixture) so each rule is seen once.
import { describe, expect, it } from "vitest";
import * as api from "../../engine/api";
import type { BoardState, Ending } from "../../engine/api";
import { pickLetter } from "./found";
import { dealsOf, electionsOf, hardGame, lowestIn, promiseOf, shownGap, turnsNotTaken, verdictOf } from "./record";
import { letterChoicesOf } from "./view";

const model = api.boardFixture();
const { merthyr, rct, cardiff } = api.FIXTURE_COUNCILS;
const scores = (start: number, left: number, auto: number): Pick<Ending, "scores" | "autopilot"> => ({
  scores: { life: left, left, lower: "left", result: left, start, band: left - start >= 3 ? "little_better" : left - start <= -3 ? "little_worse" : "same" },
  autopilot: { life: auto, left: auto, lower: "left", result: auto, start, band: "same" },
});
const fresh = (): BoardState => api.newBoard(model, 7, model.starts[0]!.id);

describe("the verdict", () => {
  it("says both comparisons: against 2026 and against doing nothing", () => {
    expect(verdictOf(scores(45, 51, 46) as Ending, 3)).toMatchObject({ vsStart: "ahead", vsNothing: "ahead", start: 45, left: 51, autopilot: 46 });
    expect(verdictOf(scores(45, 41, 46) as Ending, 3)).toMatchObject({ vsStart: "behind", vsNothing: "behind" });
    expect(verdictOf(scores(45, 45.3, 45.2) as Ending, 3)).toMatchObject({ vsStart: "level", vsNothing: "level" });
  });

  it("never says worse than 2026 when the verdict line says about the same (the band decides)", () => {
    expect(verdictOf(scores(45, 43.5, 43) as Ending, 3).vsStart).toBe("level");
  });

  it("a game is hard when it ends worse, behind doing nothing, or loses an election", () => {
    const s = fresh();
    expect(hardGame(s, verdictOf(scores(45, 50, 46) as Ending, 3))).toBe(false);
    expect(hardGame(s, verdictOf(scores(45, 50, 54) as Ending, 3))).toBe(true);
    s.election.records.push({ year: 2030, step: 16, result: "lost", backers: [merthyr], peopleShare: 0.2 });
    expect(hardGame(s, verdictOf(scores(45, 50, 46) as Ending, 3))).toBe(true);
  });
});

describe("the gap in words matches the figures shown", () => {
  it("is the difference of the whole numbers on screen, and never 0 when better or worse", () => {
    // the join's game: 45.3 to 51.6 showed "45 → 52" beside "about 6 points better"
    expect(shownGap(45.3, 51.6, "ahead")).toBe(7);
    for (let a = 40; a < 50; a += 0.13) {
      for (let b = 40; b < 50; b += 0.17) {
        const against = b - a > 0.5 ? "ahead" : b - a < -0.5 ? "behind" : "level";
        const g = shownGap(a, b, against);
        if (against === "level") expect(g).toBe(Math.abs(Math.round(b) - Math.round(a)));
        else expect(g).toBe(Math.max(1, Math.abs(Math.round(b) - Math.round(a))));
      }
    }
  });
});

describe("the record", () => {
  it("shows the promise of the start chosen, and whether it was kept", () => {
    const s = fresh();
    expect(promiseOf(model, s)).toMatchObject({ text: model.starts[0]!.promise.text, kept: null });
    s.promise.kept = false;
    expect(promiseOf(model, s)?.kept).toBe(false);
  });

  it("names the council furthest behind on a board", () => {
    const s = fresh();
    const f = api.frames(model, s)[0]!;
    const low = lowestIn(model, f)!;
    for (const c of model.game.councils) {
      const m = f.councils[c]!.measures;
      expect(Object.values(m).reduce((a, b) => a + b, 0) / 6).toBeGreaterThanOrEqual(low.score - 1e-9);
    }
  });

  it("lists elections and deals in order", () => {
    const s = fresh();
    s.election.records.push({ year: 2030, step: 16, result: "win", backers: [merthyr, rct], peopleShare: 0.6 }, { year: 2034, step: 32, result: "lost", backers: [], peopleShare: 0 });
    s.deals.push({ council: rct, measure: "homes", madeStep: 32, dueStep: 48, kept: true }, { council: merthyr, measure: "work", madeStep: 48, dueStep: 64, kept: null });
    expect(electionsOf(model, s).map((e) => [e.year, e.result, e.backers])).toEqual([[2030, "win", 2], [2034, "lost", 0]]);
    expect(dealsOf(s)).toEqual([{ council: rct, kept: true }]);
  });
});

describe("the turns you could have taken", () => {
  it("names the councils that would have carried a lost election, biggest first, and stops when it is carried", () => {
    const s = fresh();
    s.election.records.push({ year: 2034, step: 32, result: "lost", backers: [merthyr], peopleShare: 0.1 });
    const shares = { [merthyr]: 0.1, [rct]: 0.35, [cardiff]: 0.55 };
    const [turn] = turnsNotTaken(model, s, shares, 0.5);
    expect(turn).toEqual({ kind: "election", year: 2034, share: 0.1, needed: [cardiff] });
  });

  it("names trouble met unprepared and a project of its own that would have softened it", () => {
    const s = fresh();
    s.events.push({ event: "storm-taff", step: 20, councils: [rct], severity: 3, prepared: false }, { event: "storm-taff", step: 40, councils: [merthyr], severity: 1, prepared: false });
    const turns = turnsNotTaken(model, s, {}, 0.5);
    const def = model.events.find((e) => e.id === "storm-taff")!;
    expect(turns[0]).toEqual({ kind: "event", year: 2031, event: "storm-taff", council: rct, councils: [rct], project: def.prepared_by[0] });
  });

  it("names a broken promise, and nothing for a game with no turn missed", () => {
    const s = fresh();
    expect(turnsNotTaken(model, s, {}, 0.5)).toEqual([]);
    s.promise.kept = false;
    expect(turnsNotTaken(model, s, {}, 0.5)[0]?.kind).toBe("promise");
  });
});

describe("the letter this device shows", () => {
  it("keeps a game's letter, else the first not read, else the game's own", () => {
    const read = [{ game: "a", letter: "x" }, { game: "b", letter: "y" }];
    expect(pickLetter(["x", "y", "z"], read, "a")).toBe("x");
    expect(pickLetter(["x", "y", "z"], read, "c")).toBe("z");
    expect(pickLetter(["x", "y"], read, "c")).toBe("x");
    expect(pickLetter(["y", "x"], [], "c")).toBe("y");
  });

  it("offers the letters that fit, the game's own first", () => {
    const e = { id: model.endings[0]!.id, scores: { lower: "life" }, letter: { letter: "" } } as unknown as Ending;
    const fit = model.letters.filter((l) => l.ending === e.id).map((l) => l.id);
    expect(letterChoicesOf(model, e)).toEqual(fit);
  });
});
