import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, shuffle, uniform } from "./rng";

describe("seeded randomness", () => {
  it("gives the same stream for the same seed", () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it("hashes strings to stable 32-bit seeds", () => {
    expect(hashSeed("2026-11-26")).toBe(hashSeed("2026-11-26"));
    expect(hashSeed("2026-11-26")).not.toBe(hashSeed("2026-11-27"));
    expect(hashSeed(17)).toBe(17);
  });
  it("draws keyed uniforms in [0, 1) that do not depend on call order", () => {
    const u1 = uniform(7, "shock", 3, "wet-decade");
    uniform(7, "other");
    expect(uniform(7, "shock", 3, "wet-decade")).toBe(u1);
    expect(u1).toBeGreaterThanOrEqual(0);
    expect(u1).toBeLessThan(1);
  });
  it("shuffles deterministically and keeps every item", () => {
    const xs = ["a", "b", "c", "d", "e", "f"];
    expect(shuffle(xs, 5)).toEqual(shuffle(xs, 5));
    expect([...shuffle(xs, 5)].sort()).toEqual(xs);
  });
});
