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
  it("is the difference of the figures on screen, to a tenth as the top strip shows them, and never 0 when better or worse", () => {
    // the join's game: 45.3 to 51.6 showed "45 → 52" beside "about 6 points better"
    expect(shownGap(45.3, 51.6, "ahead")).toBe(6.3);
    // playtest 9: 45.4 and 57.6 must not read "about 13" beside "+12"
    expect(shownGap(45.44, 57.56, "ahead")).toBe(12.2);
    const tenth = (n: number) => Math.round(n * 10);
    for (let a = 40; a < 50; a += 0.13) {
      for (let b = 40; b < 50; b += 0.17) {
        const against = b - a > 0.5 ? "ahead" : b - a < -0.5 ? "behind" : "level";
        const g = shownGap(a, b, against);
        const shown = Math.abs(tenth(b) - tenth(a)) / 10;
        if (against === "level") expect(g).toBe(shown);
        else expect(g).toBe(Math.max(0.1, shown));
      }
    }
  });
});
