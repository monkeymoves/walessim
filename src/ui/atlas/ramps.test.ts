// The goal ramps keep the rules that make them readable: five steps, the same even lightness in
// every goal, and a Climate blue that cannot be mistaken for the sea.
import { describe, expect, it } from "vitest";
import { lensStops } from "../../map/lens";
import { DEFAULT_PALETTE, parseColour, toOklab } from "../../map/palette";
import { STRAND_IDS } from "../../model/schema";
import { STRAND_RAMPS } from "./ramps";

const lab = (hex: string) => toOklab(parseColour(hex));
const chroma = (hex: string) => { const [, a, b] = lab(hex); return Math.hypot(a, b); };

describe("goal map ramps", () => {
  it("every goal has five steps, light to dark, evenly spaced and the same in every goal", () => {
    const first = STRAND_RAMPS.prosperous.map((h) => lab(h)[0]);
    for (const s of STRAND_IDS) {
      const L = STRAND_RAMPS[s].map((h) => lab(h)[0]);
      expect(L.length, s).toBe(5);
      for (let i = 1; i < 5; i++) {
        const step = L[i - 1]! - L[i]!;
        expect(step, `${s} step ${i}`).toBeGreaterThan(0.1);
        expect(step, `${s} step ${i}`).toBeLessThan(0.15);
        expect(Math.abs(L[i]! - first[i]!), `${s} step ${i} against prosperous`).toBeLessThan(0.01);
      }
    }
  });

  it("Climate's middle steps are at least twice as colourful as the sea, so they never read as water", () => {
    for (const sea of ["#63808D", "#7F99A4", "#A9BEC4"]) {
      for (const h of STRAND_RAMPS.global.slice(2)) expect(chroma(h)).toBeGreaterThan(chroma(sea) * 2);
    }
  });

  it("a sequential lens uses its own stops; without them, and for diverging lenses, the palette ramps", () => {
    const base = { values: {}, domain: [0, 1] as [number, number], higherIsBetter: true };
    const stops = [...STRAND_RAMPS.resilient];
    expect(lensStops({ ...base, ramp: "sequential", stops }, DEFAULT_PALETTE)).toEqual(stops);
    expect(lensStops({ ...base, ramp: "sequential" }, DEFAULT_PALETTE)).toEqual(DEFAULT_PALETTE.lensSeq);
    expect(lensStops({ ...base, ramp: "diverging", stops }, DEFAULT_PALETTE)).toEqual(DEFAULT_PALETTE.lensDiv);
  });
});
