// Lens tint ramps: an indicator value to a paper sheet colour.
import { rampAt, type Palette, type RGB } from "./palette";
import type { LensSpec } from "./types";

/** Position of a value on the ramp, 0 to 1. Diverging lenses put the centre at 0.5. */
export function lensPosition(spec: LensSpec, v: number): number {
  const [lo, hi] = spec.domain;
  if (spec.ramp === "diverging") {
    const c = spec.centre ?? (lo + hi) / 2;
    // each side scales on its own so the centre always lands on the middle stop
    const t = v >= c ? (hi > c ? 0.5 + (0.5 * (v - c)) / (hi - c) : 0.5) : c > lo ? 0.5 - (0.5 * (c - v)) / (c - lo) : 0.5;
    return Math.max(0, Math.min(1, t));
  }
  return hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : 0.5;
}

/** The ramp stops for a lens: diverging ramps are flipped when lower is better, neutral when no direction. */
export function lensStops(spec: LensSpec, pal: Palette): string[] {
  if (spec.ramp === "sequential") return pal.lensSeq;
  if (spec.higherIsBetter === null) return pal.lensDivNeutral;
  return spec.higherIsBetter ? pal.lensDiv : pal.lensDiv.slice().reverse();
}

/** Colour for one value, or null when missing. */
export function lensColour(spec: LensSpec, v: number | null | undefined, pal: Palette): RGB | null {
  if (v == null || !Number.isFinite(v)) return null;
  return rampAt(lensStops(spec, pal), lensPosition(spec, v));
}

/** Legend swatches: n evenly spaced values across the domain with their colours. */
export function lensLegend(spec: LensSpec, pal: Palette, n = 5): { value: number; colour: RGB }[] {
  const [lo, hi] = spec.domain;
  return Array.from({ length: n }, (_, i) => {
    const value = lo + ((hi - lo) * i) / (n - 1);
    return { value, colour: lensColour(spec, value, pal)! };
  });
}
