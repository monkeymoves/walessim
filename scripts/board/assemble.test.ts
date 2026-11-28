import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel, BoardBuildError, SOUTH_EAST, type BoardInputs } from "./assemble";
import { readBoardInputs } from "./read-inputs";

let inputs: Omit<BoardInputs, "v1Places" | "forceFallback" | "strict">;
beforeAll(() => {
  inputs = readBoardInputs();
});

describe("assembleBoardModel", () => {
  it("builds a model that passes every shape and cross check, with a stable hash", () => {
    const a = assembleBoardModel(inputs).model;
    const b = assembleBoardModel(inputs).model;
    expect(a.meta.hash).toMatch(/^[0-9a-f]{12}$/);
    expect(a.meta.hash).toBe(b.meta.hash);
    expect(a.game.councils.sort()).toEqual([...SOUTH_EAST].sort());
  });

  it("leaves out a content file that fails its shape check, with a warning, and stops when strict", () => {
    const broken = { ...inputs, files: { ...inputs.files, "futures.yaml": { futures: [{ id: "x" }] } } };
    const built = assembleBoardModel(broken);
    expect(built.warnings.some((w) => w.includes("futures.yaml is left out"))).toBe(true);
    expect(built.model.futures.length).toBeGreaterThan(0);
    expect(() => assembleBoardModel({ ...broken, strict: true })).toThrow(BoardBuildError);
  });

  it("always stops on a problem in a file this package owns", () => {
    const measures = inputs.files["measures.yaml"] as { measures: { indicators: string[] }[] };
    const bad = { ...inputs.files, "measures.yaml": { measures: [{ ...measures.measures[0], indicators: ["no_such_indicator"] }, ...measures.measures.slice(1)] } };
    expect(() => assembleBoardModel({ ...inputs, files: bad })).toThrow(/no_such_indicator/);
    const noBands = { ...inputs.files };
    delete noBands["bands.yaml"];
    expect(() => assembleBoardModel({ ...inputs, files: noBands })).toThrow(/bands.yaml is missing/);
  });

  it("stops if a council has no real value for a seeded indicator", () => {
    const la = structuredClone(inputs.laIndicators);
    delete la.indicators.employment!.values["W06000024"];
    expect(() => assembleBoardModel({ ...inputs, laIndicators: la })).toThrow(/no real value for employment in Merthyr Tydfil/);
  });

  it("stops if a source the data names has no entry", () => {
    const sources = inputs.sources.filter((s) => s.id !== "nomis_aps");
    expect(() => assembleBoardModel({ ...inputs, sources })).toThrow(/nomis_aps/);
  });

  it("strict mode refuses content filled in from the fixture", () => {
    const own = ["measures.yaml", "bands.yaml", "links.yaml", "indicators.yaml"];
    const files = Object.fromEntries(Object.entries(inputs.files).filter(([n]) => own.includes(n)));
    expect(() => assembleBoardModel({ ...inputs, files, places: {}, strict: true })).toThrow(/not all written yet/);
    const built = assembleBoardModel({ ...inputs, files, places: {} }).model;
    expect(built.meta.to_check.some((t) => t.startsWith("content: endings"))).toBe(true);
    expect(built.councils).toHaveLength(10);
  });
});
