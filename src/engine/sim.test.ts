import { describe, expect, it } from "vitest";
import { initRun, sampleParams, stepRun, runStrands, type Delivery, type TermInput } from "./sim";
import { makeContext, walesValue } from "./scores";
import { testModel } from "./test-model";

const ctx = makeContext(testModel());
const P0 = sampleParams(ctx, 1, 0, {});
const input = (term: number, deliveries: Delivery[] = []): TermInput => ({
  term,
  year: 2026 + 4 * term,
  deliveries,
  reversePlays: [],
  events: [],
  employers: [],
  ripples: [],
  seed: 1,
});
const all = ctx.las.map(() => 1);
const delivery = (over: Partial<Delivery>): Delivery => ({
  key: "k",
  cause: { kind: "card", id: "warm-homes", term: 0, year: 2026, regions: null },
  play: "p0",
  effect: { target: "fuel_poverty", size: "M", sign: 1, rule: "R13" },
  weights: all,
  sizeStep: 0,
  fcmShare: 1,
  scale: 1,
  repeat: false,
  playsBefore: 0,
  landTerm: 0,
  main: true,
  confidence: "medium",
  duration: null,
  ...over,
});
const W = (run: ReturnType<typeof initRun>, id: string) => walesValue(ctx, ctx.comp.get(id)!, run.s);

describe("one run through a term", () => {
  it("applies the baseline pressures with no cards: care pressure and flood risk worsen, the grid cleans", () => {
    const r = initRun(ctx, 1, 0);
    const before = { care: W(r, "care_pressure"), flood: W(r, "flood_exposure"), em: W(r, "emissions_head") };
    stepRun(ctx, r, P0, 0, input(0), null);
    expect(W(r, "care_pressure")).toBeLessThan(before.care);
    expect(W(r, "flood_exposure")).toBeLessThan(before.flood);
    expect(W(r, "emissions_head")).toBeGreaterThan(before.em);
  });

  it("lands a delivery only in its term", () => {
    const r = initRun(ctx, 1, 0);
    const d = delivery({ landTerm: 1 });
    const fp0 = W(r, "fuel_poverty");
    stepRun(ctx, r, P0, 0, input(0, [d]), null);
    expect(W(r, "fuel_poverty")).toBeCloseTo(fp0);
    stepRun(ctx, r, P0, 0, input(1, [d]), null);
    expect(W(r, "fuel_poverty") - fp0).toBeCloseTo(ctx.model.game.sizes.M, 1);
  });

  it("reverses a temporary effect after its duration", () => {
    const r = initRun(ctx, 1, 0);
    const d = delivery({ effect: { target: "access", size: "M", sign: -1 }, duration: 1 });
    const a0 = W(r, "access");
    stepRun(ctx, r, P0, 0, input(0, [d]), null);
    expect(W(r, "access")).toBeCloseTo(a0 - ctx.model.game.sizes.M);
    stepRun(ctx, r, P0, 0, input(1, [d]), null);
    expect(W(r, "access")).toBeCloseTo(a0);
  });

  it("carries a chained rule a term later (skills raise earnings, R22)", () => {
    const r = initRun(ctx, 1, 0);
    const d = delivery({ effect: { target: "skills_stock", size: "M", sign: 1, rule: "R21" } });
    const e0 = W(r, "earnings");
    const out0 = stepRun(ctx, r, P0, 0, input(0, [d]), null);
    const e1 = W(r, "earnings");
    stepRun(ctx, r, P0, 0, input(1, []), out0.contribs);
    expect(W(r, "earnings") - e1).toBeGreaterThan(0.1);
    expect(Math.abs(e1 - e0)).toBeLessThan(0.05);
  });

  it("records contributions in run 0 that add up to the change of each component", () => {
    const r = initRun(ctx, 1, 0);
    const d = delivery({});
    const before = ctx.comps.map((_, c) => walesValue(ctx, c, r.s));
    const out = stepRun(ctx, r, P0, 0, input(0, [d, delivery({ key: "b", effect: { target: "pressure_drain", size: "S", sign: -1 } as never })]), null);
    for (const id of ["fuel_poverty", "care_pressure", "emissions_head", "nature_condition", "carbon_budget"]) {
      const c = ctx.comp.get(id)!;
      const sum = out.contribs!.filter((x) => x.component === id).reduce((a, x) => a + x.wales, 0);
      expect(sum, id).toBeCloseTo(walesValue(ctx, c, r.s) - before[c]!, 6);
    }
  });

  it("moves nature through the FCM when a pressure is relieved", () => {
    const a = initRun(ctx, 1, 0), b = initRun(ctx, 1, 0);
    const d = delivery({ effect: { target: "fcm:pressure:agricultural_intensification", size: "M", sign: -1, rule: "R29" } });
    stepRun(ctx, a, P0, 0, input(0), null);
    stepRun(ctx, b, P0, 0, input(0, [d]), null);
    expect(W(b, "nature_condition")).toBeGreaterThan(W(a, "nature_condition"));
  });

  it("samples parameters inside their ranges, with defaults in run 0", () => {
    const p = sampleParams(ctx, 9, 3, {});
    for (const r of ctx.model.rules) for (const [n, q] of Object.entries(r.params)) {
      expect(p[`${r.id}.${n}`]).toBeGreaterThanOrEqual(q.min);
      expect(p[`${r.id}.${n}`]).toBeLessThanOrEqual(q.max);
      expect(P0[`${r.id}.${n}`]).toBe(q.default);
    }
  });

  it("strand scores stay within 0 to 10", () => {
    const r = initRun(ctx, 1, 0);
    for (let t = 0; t < 6; t++) stepRun(ctx, r, P0, 0, input(t), null);
    const s = runStrands(ctx, r);
    for (const v of [...s.flow, ...s.stock]) expect(v >= 0 && v <= 10).toBe(true);
  });
});
