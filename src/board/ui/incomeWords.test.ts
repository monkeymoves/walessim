import { describe, expect, it } from "vitest";
import { incomeWords } from "./words";

describe("the coin rate on the top strip", () => {
  it("never shows a signed zero, and rounds to tenths", () => {
    for (const v of [-0.04, -0.03, 0, 0.02, 0.049, -0]) expect(incomeWords(v)).toBe("0");
    expect(incomeWords(1.06)).toBe("+1.1");
    expect(incomeWords(-0.26)).toBe("-0.3");
    for (let v = -3; v <= 3; v += 0.01) expect(incomeWords(v)).not.toMatch(/^[+\-−]0(?![.,]\d*[1-9])/);
  });
});
