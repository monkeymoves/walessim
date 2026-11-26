import { describe, expect, it } from "vitest";
import { formatTick, formatValue, niceTicks, rankOf, sig3 } from "./format";

describe("formatValue", () => {
  it("rounds big counts to three significant figures", () => {
    expect(formatValue(381516, "integer")).toBe("382,000");
    expect(formatValue(68607, "integer")).toBe("68,600");
    expect(formatValue(150.47, "integer")).toBe("150");
    expect(formatValue(2589, "integer")).toBe("2,589");
  });
  it("prints percentages to one place", () => {
    expect(formatValue(55.7687, "percent")).toBe("55.8%");
    expect(formatValue(3.3339, "percent", { signed: true })).toBe("+3.3%");
    expect(formatValue(-1.164, "percent", { signed: true })).toBe("-1.2%");
  });
  it("prints pounds without pence", () => {
    expect(formatValue(21809.9194, "gbp")).toBe("£21,800");
    expect(formatValue(692.7, "gbp")).toBe("£693");
  });
  it("keeps decimals as the format says", () => {
    expect(formatValue(6.9683, "decimal1")).toBe("7.0");
    expect(formatValue(2.1932, "decimal2")).toBe("2.19");
    expect(formatValue(80.7, "years")).toBe("80.7");
    expect(formatValue(6.24, "ratio")).toBe("6.2");
  });
  it("says nothing for missing values", () => {
    expect(formatValue(null, "percent")).toBeNull();
    expect(formatValue(Number.NaN, "percent")).toBeNull();
  });
});

describe("helpers", () => {
  it("sig3", () => {
    expect(sig3(241015)).toBe(241000);
    expect(sig3(0)).toBe(0);
  });
  it("ranks highest first with shared ties", () => {
    const v = { a: 3, b: 5, c: 5, d: 1 };
    const codes = ["a", "b", "c", "d"];
    expect(rankOf(v, "b", codes)).toBe(1);
    expect(rankOf(v, "c", codes)).toBe(1);
    expect(rankOf(v, "a", codes)).toBe(3);
    expect(rankOf(v, "z", codes)).toBeNull();
  });
  it("makes nice ticks", () => {
    expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(formatTick(25000, "gbp")).toBe("£25k");
  });
});
