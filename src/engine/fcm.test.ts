import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { compileFcm, runFcm, stateMean } from "./fcm";
import type { FcmGraph } from "../model/schema";

const graph = JSON.parse(readFileSync(new URL("../../model/data/sonarr-dpsir.json", import.meta.url), "utf8")) as FcmGraph;

describe("SoNaRR fuzzy cognitive map", () => {
  const c = compileFcm(graph);
  it("reproduces the SoNaRR baseline exactly with no change", () => {
    const a = runFcm(c, {});
    for (const n of graph.nodes) expect(a[c.index.get(n.id)!]).toBeCloseTo(n.initial, 5);
  });
  it("improves ecosystem states when a pressure is relieved", () => {
    const base = stateMean(c, runFcm(c, {}));
    const relieved = stateMean(c, runFcm(c, { "pressure:agricultural_intensification": -0.2 }));
    expect(relieved).toBeGreaterThan(base);
  });
  it("worsens states when a driver rises", () => {
    expect(stateMean(c, runFcm(c, { "driver:climate_change": 0.2 }))).toBeLessThan(stateMean(c, runFcm(c, {})));
  });
  it("is deterministic and converges", () => {
    expect(runFcm(c, { "pressure:drainage": -0.1 })).toEqual(runFcm(c, { "pressure:drainage": -0.1 }));
  });
});
