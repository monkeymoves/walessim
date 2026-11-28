import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { ctxOf, handState, standing } from "./hand-state";
import { seedPeople } from "./people";
import { gradeFactor, gradeVisit, visitGrade, wetNow } from "./places";
import { pickVisit } from "./bots-common";
import type { BoardModel, PlaceDef, V1PlaceBoard } from "./types";

const { merthyr, rct } = FIXTURE_COUNCILS;

function setup(model: BoardModel = boardFixture()) {
  const s = handState(model, { start: "warm-homes" });
  seedPeople(ctxOf(model, s));
  return { model, s };
}
const place = (model: BoardModel, id: string): PlaceDef => model.places.find((p) => p.id === id)!;

describe("T3 places: one hard choice", () => {
  it("grades by the option's first matching rule, else its default", () => {
    const { model, s } = setup();
    const station = place(model, "merthyr-station");
    s.councils[merthyr]!.measures.homes = 4;
    expect(visitGrade(model, s, station, ["homes"])).toBe("very_well");
    s.councils[merthyr]!.measures.homes = 6;
    expect(visitGrade(model, s, station, ["homes"])).toBe("well");
    expect(visitGrade(model, s, station, ["workspace"])).toBe("adequately");
    s.projects.push(standing("skills-college", { council: rct }));
    expect(visitGrade(model, s, station, ["workspace"])).toBe("very_well");
    expect(visitGrade(model, s, station, ["nothing"])).toBe("poorly");
  });

  it("gradeVisit applies the option where the place is, and moves backing by the grade (rule V1)", () => {
    const { model, s } = setup();
    s.councils[merthyr]!.measures.homes = 4;
    const backing = s.councils[merthyr]!.backing;
    const grade = gradeVisit(ctxOf(model, s), { kind: "visit", place: "merthyr-station", picks: ["homes"] },
      { kind: "visit", place: "merthyr-station", council: merthyr, offeredBy: { project: "frequent-trains" }, since: 0 });
    expect(grade).toBe("very_well");
    expect(s.councils[merthyr]!.measures.homes).toBeCloseTo(4.4, 4);
    expect(s.councils[merthyr]!.backing).toBeCloseTo(backing + 0.5, 4);
    expect(s.ledger.every((c) => c.cause.kind !== "visit" || c.cause.grade === "very_well")).toBe(true);
    expect(gradeFactor(model, "very_well")).toBe(1.5);
    expect(gradeFactor(model, "poorly")).toBeLessThan(gradeFactor(model, "adequately"));
  });
});

describe("T1 places: the Rhondda through v1's gradeRhondda", () => {
  it("grades adequately while the board is not yet in the model", () => {
    const { model, s } = setup();
    expect(visitGrade(model, s, place(model, "rhondda"), ["t1"])).toBe("adequately");
  });

  const v1 = resolve(__dirname, "../../../public/model.json");
  it.skipIf(!existsSync(v1))("grades the real Rhondda tips with v1's rules, careful picks at least as well as one tip", () => {
    const model = boardFixture();
    const board = (JSON.parse(readFileSync(v1, "utf8")) as { places: (V1PlaceBoard & { id: string })[] }).places.find((p) => p.id === "rhondda")!;
    place(model, "rhondda").board = board;
    const { s } = setup(model);
    const rank = ["poorly", "adequately", "well", "very_well"];
    const careful = visitGrade(model, s, place(model, "rhondda"), pickVisit(model, s, "rhondda", true));
    const careless = visitGrade(model, s, place(model, "rhondda"), pickVisit(model, s, "rhondda", false));
    expect(rank.indexOf(careful)).toBeGreaterThanOrEqual(rank.indexOf(careless));
    expect(pickVisit(model, s, "rhondda", true)).toHaveLength(board.threads);
  });

  it("a wet time follows the future's weather track", () => {
    const { model, s } = setup();
    s.future = "wet-decades";
    s.step = 40;
    expect(wetNow(model, s)).toBe(true);
    s.step = 0;
    expect(wetNow(model, s)).toBe(false);
  });
});
