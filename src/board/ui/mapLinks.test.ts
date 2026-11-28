import { describe, expect, it } from "vitest";
import { boardFixture, FIXTURE_COUNCILS, newBoard } from "../engine/api";
import { lensFor, linksFor, linkWeight, walesMean } from "./mapLinks";

describe("the board's links on the map", () => {
  const model = boardFixture();
  const state = newBoard(model, 7, model.starts[0]!.id);

  it("shows the rail and river network faintly when nothing is selected", () => {
    const links = linksFor(model, state);
    expect(links.map((l) => l.kind).sort()).toEqual(model.links.filter((l) => l.kind !== "commute").map((l) => l.kind).sort());
    expect(links.every((l) => l.state === "dim")).toBe(true);
  });

  it("shows a selected council's own links, stubs at their centre, and lights a preview", () => {
    const merthyr = linksFor(model, state, FIXTURE_COUNCILS.merthyr);
    const stub = merthyr.find((l) => l.id === "commute:merthyr-powys")!;
    expect(stub.to).toEqual({ x: model.stubs[0]!.centre[0], y: model.stubs[0]!.centre[1] });
    const links = linksFor(model, state, FIXTURE_COUNCILS.cardiff, ["rail:merthyr-rct"]);
    expect(links.find((l) => l.id === "rail:merthyr-rct")!.state).toBe("lit");
    expect(links.find((l) => l.id === "commute:rct-cardiff")!.state).toBe("rest");
    expect(links.find((l) => l.id === "commute:merthyr-rct")).toBeUndefined();
  });

  it("weighs rail by quality and commuting by share", () => {
    const rail = model.links.find((l) => l.kind === "rail")!;
    expect(linkWeight(rail, 3)).toBe(3);
    expect(linkWeight({ ...rail, kind: "commute", share: 0.15 })).toBe(3);
    expect(linkWeight({ ...rail, kind: "commute", share: 0.08 })).toBe(2);
    expect(linkWeight({ ...rail, kind: "commute", share: 0.02 })).toBe(1);
  });
});

describe("colouring the map", () => {
  const model = boardFixture();
  const state = newBoard(model, 7, model.starts[0]!.id);

  it("colours a measure in its goal's ramp, 0 to 10, for the councils in play only", () => {
    const lens = lensFor(model, state, "health", 5)!;
    expect(lens.ramp).toBe("sequential");
    expect(lens.domain).toEqual([0, 10]);
    expect(Object.keys(lens.values).sort()).toEqual([...model.game.councils].sort());
    expect(lens.stops).toHaveLength(5);
  });

  it("centres backing on the election line and who is behind on the middle council", () => {
    expect(lensFor(model, state, "backing", 5)!.centre).toBe(5);
    const behind = lensFor(model, state, "behind", 5)!;
    expect(behind.domain[0]).toBeLessThan(behind.centre!);
    expect(behind.domain[1]).toBeGreaterThan(behind.centre!);
    expect(lensFor(model, state, "none", 5)).toBeNull();
  });

  it("weights the region bars by real population", () => {
    const pop = Object.values(state.councils).reduce((a, c) => a + c.pop, 0);
    const hand = Object.values(state.councils).reduce((a, c) => a + c.measures.work * c.pop, 0) / pop;
    expect(walesMean(state, "work")).toBeCloseTo(hand, 10);
  });
});
