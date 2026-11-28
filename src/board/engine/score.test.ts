import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { handState, nextYears, standing } from "./hand-state";
import { boardLevel, boardScore, fairnessGap, leftBoard, resultBand, scores } from "./score";
import { MEASURE_IDS, type MeasureId } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const model = boardFixture();
const flat = (v: number) => ({ measures: Object.fromEntries(MEASURE_IDS.map((m) => [m, v])) as Record<MeasureId, number> });

describe("the board's level and score", () => {
  it("a flat board scores ten times its level", () => {
    const b = { [merthyr]: flat(5), [rct]: flat(5), [cardiff]: flat(5) };
    expect(boardLevel(model, b)).toBeCloseTo(5, 6);
    expect(boardScore(model, b)).toBeCloseTo(50, 6);
  });

  it("weights councils by people, with a quarter from the lowest councils (rule G1)", () => {
    const b = { [merthyr]: flat(2), [rct]: flat(5), [cardiff]: flat(8) };
    const pop = (c: string) => model.councils.find((x) => x.code === c)!.real.pop!;
    const total = pop(merthyr) + pop(rct) + pop(cardiff);
    const avg = (2 * pop(merthyr) + 5 * pop(rct) + 8 * pop(cardiff)) / total;
    expect(boardLevel(model, b)).toBeCloseTo(0.75 * avg + 0.25 * 5, 6);
  });

  it("leaving one place behind costs more than its people alone", () => {
    const fair = { [merthyr]: flat(5), [rct]: flat(5), [cardiff]: flat(5) };
    const unfair = { [merthyr]: flat(1), [rct]: flat(5), [cardiff]: flat(5) };
    const pop = (c: string) => model.councils.find((x) => x.code === c)!.real.pop!;
    const share = pop(merthyr) / (pop(merthyr) + pop(rct) + pop(cardiff));
    expect(boardScore(model, fair) - boardScore(model, unfair)).toBeGreaterThan(40 * share);
  });

  it("fairness is the middle council less the lowest", () => {
    expect(fairnessGap(model, { [merthyr]: flat(3), [rct]: flat(5), [cardiff]: flat(7) })).toBeCloseTo(0, 6);
    expect(fairnessGap(model, { [merthyr]: flat(3), [rct]: flat(5), [cardiff]: flat(5) })).toBeGreaterThan(0);
  });
});

describe("the two scores", () => {
  it("Life is the mean over the years played; Left carries building projects and high risks, and is the result (16.3.6)", () => {
    const s = handState(model);
    const start = boardScore(model, s.councils);
    const startPriced = boardScore(model, leftBoard(model, s));
    for (const c of Object.values(s.councils)) for (const m of MEASURE_IDS) c.measures[m] += 1;
    nextYears(model, s, 2);
    const sc = scores(model, s);
    expect(sc.start).toBeCloseTo(startPriced, 6);
    expect(sc.life).toBeCloseTo(start + 10, 4);
    expect(sc.result).toBe(sc.left);
    expect(sc.lower).toBe(sc.life <= sc.left ? "life" : "left");
    s.projects.push(standing("social-homes", { council: merthyr }, 8, "building"));
    s.projects[0]!.readyStep = 96;
    expect(leftBoard(model, s)[merthyr]!.measures.homes).toBeCloseTo(s.councils[merthyr]!.measures.homes + 0.6, 4);
    s.councils[cardiff]!.risks.flood = 3;
    expect(leftBoard(model, s)[cardiff]!.measures.nature).toBeCloseTo(s.councils[cardiff]!.measures.nature - 0.3, 4);
  });

  it("judges the 2026 board as Left for 2050 is, so a high risk already there in 2026 is not a slide", () => {
    const s = handState(model);
    s.councils[cardiff]!.risks.flood = 3;
    s.history = [];
    const sc = scores(model, s);
    expect(sc.start).toBeCloseTo(boardScore(model, leftBoard(model, s)), 6);
    expect(sc.result - sc.start).toBeCloseTo(0, 6);
    expect(sc.start).toBeLessThan(boardScore(model, s.councils));
  });

  it("puts the change in one of five plain bands", () => {
    expect(resultBand(model, -10)).toBe("much_worse");
    expect(resultBand(model, -3)).toBe("little_worse");
    expect(resultBand(model, 0)).toBe("same");
    expect(resultBand(model, 3)).toBe("little_better");
    expect(resultBand(model, 10)).toBe("much_better");
  });
});
