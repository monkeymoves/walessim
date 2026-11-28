import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { bandScore, seedCouncils, seedMeasure, thirdsStep } from "./seed";
import { MEASURE_IDS } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;

describe("seeding the 2026 board", () => {
  const model = boardFixture();

  it("scores an indicator on its band, either way round, clamped 0 to 10", () => {
    expect(bandScore({ floor: 60, goal: 80, higher_is_better: true, origin: "v1", source: "x" }, 70)).toBeCloseTo(5);
    expect(bandScore({ floor: 12, goal: 4, higher_is_better: false, origin: "v1", source: "x" }, 6)).toBeCloseTo(7.5);
    expect(bandScore({ floor: 60, goal: 80, higher_is_better: true, origin: "v1", source: "x" }, 99)).toBe(10);
    expect(bandScore({ floor: 60, goal: 80, higher_is_better: true, origin: "v1", source: "x" }, 10)).toBe(0);
  });

  it("makes each measure the plain mean of its indicators' band scores (Merthyr Tydfil, Work and pay, by hand)", () => {
    const def = model.councils.find((c) => c.code === merthyr)!;
    // employment 68.4 on 63.7 to 79.1; earnings 685.3 on 635.73 to 902.7; jobs density 0.7 on 0.41 to 1.01; level 4 37 on 23.17 to 69.13
    const byHand = ((68.4 - 63.7) / 15.4 + (685.3 - 635.73) / 266.97 + (0.7 - 0.41) / 0.6 + (37 - 23.17) / 45.96) * 10 / 4;
    expect(seedMeasure(model, def, "work")).toBeCloseTo(byHand, 3);
  });

  it("seeds every council in play from the real figures, unchanged", () => {
    const councils = seedCouncils(model);
    expect(Object.keys(councils)).toEqual([merthyr, rct, cardiff]);
    for (const code of model.game.councils) {
      const def = model.councils.find((c) => c.code === code)!;
      const c = councils[code]!;
      expect(c.pop).toBe(def.real.pop);
      expect(c.young).toBeCloseTo(def.real.young_adults!, 3);
      for (const m of MEASURE_IDS) {
        expect(c.measures[m]).toBeGreaterThanOrEqual(0);
        expect(c.measures[m]).toBeLessThanOrEqual(10);
      }
    }
    expect(councils[cardiff]!.measures.work).toBeGreaterThan(councils[merthyr]!.measures.work);
  });

  it("seeds risk steps by thirds and flags", () => {
    expect([thirdsStep(1), thirdsStep(5), thirdsStep(9)]).toEqual([3, 2, 1]);
    const councils = seedCouncils(model);
    expect(councils[merthyr]!.risks.tip).toBe(3);
    expect(councils[cardiff]!.risks.tip).toBe(1);
    // Rhondda Cynon Taf: 24.4 homes in 100 at risk on a band of 54 to 0 scores about 5.5, the middle third.
    expect(councils[rct]!.risks.flood).toBe(2);
  });

  it("refuses to seed a council missing a figure", () => {
    const broken = boardFixture();
    delete broken.councils[0]!.real.employment;
    expect(() => seedCouncils(broken)).toThrow(/employment/);
  });
});
