import { describe, expect, it } from "vitest";
import { gradeBethesda, gradeRhondda, tipRisk } from "./places";
import { testModel } from "./test-model";

const m = testModel();
const rh = m.places.find((p) => p.id === "rhondda")!;
const be = m.places.find((p) => p.id === "bethesda")!;
const tip = (n: number) => rh.tips!.find((t) => t.n === n)!.id;

describe("the Rhondda board", () => {
  it("has the 17 mapped tips with facts", () => {
    expect(rh.tips!.length).toBe(17);
  });
  it("raises risk steps in the wet decade", () => {
    const r0 = tipRisk(rh, false), r1 = tipRisk(rh, true);
    for (const t of rh.tips!) expect(r1[t.id]).toBe(Math.min(3, r0[t.id]! + 1));
  });
  it("grades by tests passed: three well, two adequately, fewer poorly", () => {
    const byHomes = [...rh.tips!].sort((a, b) => b.buildingsBelow - a.buildingsBelow).slice(0, 3).map((t) => t.id);
    const dry = gradeRhondda(rh, byHomes, false);
    expect(dry.grade).toBe("well");
    // in the wet decade, sorting by homes leaves top-step tips above the railway
    const wet = gradeRhondda(rh, byHomes, true);
    expect(wet.tests.find((t) => t.id === "lifelines")!.pass).toBe(false);
    expect(wet.grade).toBe("adequately");
    expect(gradeRhondda(rh, [tip(2), tip(13), tip(16)], true).grade).toBe("well");
    expect(gradeRhondda(rh, [tip(1), tip(3), tip(12)], true).grade).toBe("poorly");
  });
});

describe("the Bethesda board", () => {
  const ids = be.options!.map((o) => o.id);
  const trios: string[][] = [];
  for (let a = 0; a < 10; a++) for (let b = a + 1; b < 10; b++) for (let c = b + 1; c < 10; c++) trios.push([ids[a]!, ids[b]!, ids[c]!]);
  const ctx0 = { active: [] as string[], inPlay: ["homes-for-locals"], everPlayed: ["homes-for-locals"], seed: 11, runs: 200 };

  it("is judged across runs and deterministic", () => {
    expect(gradeBethesda(be, trios[5]!, ctx0)).toEqual(gradeBethesda(be, trios[5]!, ctx0));
  });
  it("lets several different trios pass well, and not most of them", () => {
    const well = trios.filter((t) => gradeBethesda(be, t, ctx0).grade === "well");
    expect(well.length).toBeGreaterThanOrEqual(3);
    expect(well.length).toBeLessThan(trios.length / 4);
  });
  it("makes each of the strongest options fail a test in the trio that leans on it hardest", () => {
    // quarry-edge homes (strongest Homes) and rework tips (strongest Work) each break Pwysau alone
    expect(gradeBethesda(be, ["quarry-edge-homes", "rework-tips", "welsh-youth-centre"], ctx0).tests.find((t) => t.id === "pwysau")!.pass).toBe(false);
    expect(gradeBethesda(be, ["rework-tips", "park-and-ride", "chapel-homes"], ctx0).tests.find((t) => t.id === "pwysau")!.pass).toBe(true);
  });
  it("punishes a trio without two Homes threads when the price of a home is active", () => {
    const one = ["chapel-homes", "quarry-workshops", "welsh-youth-centre"];
    const withSkills = { ...ctx0, everPlayed: [...ctx0.everPlayed, "skills-and-apprenticeships"] };
    expect(gradeBethesda(be, one, withSkills).tests.find((t) => t.id === "aros")!.pass).toBe(true);
    expect(gradeBethesda(be, one, { ...withSkills, active: ["price-of-a-home"] }).tests.find((t) => t.id === "aros")!.pass).toBe(false);
  });
  it("punishes ignoring the river in the wet decade", () => {
    const t = ["chapel-homes", "second-hydro", "welsh-youth-centre"];
    expect(gradeBethesda(be, t, { ...ctx0, active: ["wet-decade"] }).tests.find((x) => x.id === "pwysau")!.pass).toBe(false);
  });
});
