// The result at the top of the end screen, and the letter a device shows: pure working, checked
// on hand-made games (the fixture) so each rule is seen once.
import { describe, expect, it } from "vitest";
import * as api from "../../engine/api";
import type { BoardState, Ending } from "../../engine/api";
import { pickLetter } from "./found";
import { backingAtEnd, dealsOf, electionsOf, hardGame, lowestIn, promiseOf, shareShown, sharesShown, shownGap, shownYearOf, turnsNotTaken, verdictOf } from "./record";
import { letterChoicesOf, letterOf } from "./view";
import { setLang } from "../../../i18n";
import { whenWords } from "../words";

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

describe("the record (playtest 10, must-fix 1 and 6, should-fix 6 and 10)", () => {
  it("every year the end gives for a step is the year the board's season words give it", () => {
    setLang("en");
    for (let step = 0; step <= model.game.steps; step++) {
      const year = Number(whenWords(model, step).match(/\d{4}/)![0]);
      expect(shownYearOf(model, step), `step ${step}: ${whenWords(model, step)}`).toBe(year);
    }
  });

  it("a share of people never reads against its result", () => {
    const { win, strong } = sharesShown(model);
    for (let share = 0; share <= 1.0001; share += 0.0007) {
      for (const result of ["lost", "win", "strong_win"] as const) {
        const n = shareShown(model, share, result);
        if (result === "lost") expect(n, `${share} lost`).toBeLessThanOrEqual(win);
        if (result === "win") { expect(n, `${share} won`).toBeGreaterThan(win); expect(n).toBeLessThan(strong); }
        if (result === "strong_win") expect(n, `${share} won well`).toBeGreaterThanOrEqual(strong);
      }
    }
    // and is the share, rounded, wherever that already agrees
    expect(shareShown(model, 0.71, "strong_win")).toBe(71);
    expect(shareShown(model, 0.58, "win")).toBe(58);
    expect(shareShown(model, 0.42, "lost")).toBe(42);
  });

  it("each election line carries its share of people, and the record ends on 2050", () => {
    const s = fresh();
    s.election.records.push({ year: 2030, step: 16, result: "win", backers: [merthyr], peopleShare: 0.5004 }, { year: 2034, step: 32, result: "strong_win", backers: [merthyr, rct], peopleShare: 0.71 });
    expect(electionsOf(model, s).map((e) => [e.year, e.share])).toEqual([[2030, 51], [2034, 71]]);
    const end = backingAtEnd(model, s)!;
    expect(end.year).toBe(model.game.end_year);
    expect(end.councils).toBe(model.game.councils.length);
  });

  it("each deal line gives the year it was judged, so one council's deals never read as one line repeated", () => {
    const s = fresh();
    const measure = model.measures[0]!.id;
    for (const made of [16, 32, 48]) s.deals.push({ council: rct, measure, madeStep: made, dueStep: made + 16, kept: false, brokenStep: made + 16 });
    s.deals.push({ council: cardiff, measure, madeStep: 64, dueStep: 80, kept: true });
    s.story.moments.push({ step: 70, year: 2043, kind: "deal", council: cardiff, ref: `${cardiff}@64:kept`, say: { key: "board.moment.deal.kept" }, weight: 0 });
    const lines = dealsOf(model, s);
    expect(lines.map((d) => [d.council, d.kept, d.year])).toEqual([[rct, false, 2034], [rct, false, 2038], [rct, false, 2042], [cardiff, true, 2043]]);
    expect(new Set(lines.map((d) => `${d.council}:${d.year}`)).size).toBe(lines.length);
    expect(lines[0]!.made).toBe(2030);
  });
});

describe("letters that need a slot the game cannot fill", () => {
  it("are not offered, and the end screen offers the same letters as the engine", () => {
    const own = model.letters.find((l) => l.ending === model.endings[0]!.id)!;
    const t = (en: string) => ({ en, cy: en, cy_review: true as const });
    const back = { ...own, id: "test-back", lower: "either" as const, body: t("Work came back to {work_back_in}.") };
    const fell = { ...own, id: "test-fell", lower: "either" as const, body: t("We are still picking up the pieces in {work_fell_in}.") };
    const m = { ...model, letters: [...model.letters, back, fell] };
    const end = (slots: Record<string, unknown>) => ({ id: own.ending, scores: { lower: "left" }, letter: { from: rct, letter: own.id, slots } }) as unknown as Ending;
    const name = model.councils.find((c) => c.code === rct)!.name;
    expect(letterChoicesOf(m, end({ town: name, work_back_in: name }))).toContain("test-back");
    expect(letterChoicesOf(m, end({ town: name, work_back_in: name }))).not.toContain("test-fell");
    expect(letterChoicesOf(m, end({ town: name, work_fell_in: name }))).toContain("test-fell");
    expect(letterChoicesOf(m, end({ town: name, work_fell_in: name }))).not.toContain("test-back");
    // a letter with no project still fits: only its named line is left out
    expect(letterOf(m, end({ town: name, work_fell_in: name }), "en", "test-fell")!.body).toContain("picking up the pieces in");
  });
});
