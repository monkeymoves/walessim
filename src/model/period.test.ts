import { describe, expect, it } from "vitest";
import { periodIn } from "./period";

describe("a data period in the reader's language", () => {
  it("leaves English alone and puts months, 'to' and WIMD into Welsh", () => {
    expect(periodIn("en", "Jul 2025 to Jun 2026")).toBe("Jul 2025 to Jun 2026");
    expect(periodIn("cy", "Jul 2025 to Jun 2026")).toBe("Gorff 2025 i Meh 2026");
    expect(periodIn("cy", "2015 to 2025")).toBe("2015 i 2025");
    expect(periodIn("cy", "WIMD 2025")).toBe("MAALlC 2025");
    expect(periodIn("cy", "2024")).toBe("2024");
  });
});
