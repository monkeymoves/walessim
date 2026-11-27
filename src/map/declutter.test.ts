import { describe, expect, it } from "vitest";
import { clearLabels, overlaps, textBox } from "./declutter";

describe("label clearance", () => {
  it("measures a box from the baseline and alignment", () => {
    expect(textBox(100, 50, 40, 10, "start", 0)).toEqual([100, 42, 140, 52.5]);
    expect(textBox(100, 50, 40, 10, "center", 0)[0]).toBe(80);
    expect(textBox(100, 50, 40, 10, "end", 0)[2]).toBe(100);
  });
  it("keeps the first of two labels that collide, and always keeps cities", () => {
    const a = { box: [0, 0, 50, 10] as [number, number, number, number], always: true };
    const b = { box: [40, 0, 90, 10] as [number, number, number, number] };
    const c = { box: [100, 0, 140, 10] as [number, number, number, number] };
    expect([...clearLabels([a, b, c])]).toEqual([0, 2]);
    expect(overlaps(a.box, c.box)).toBe(false);
  });
  it("drops a label that sits on another town's house but not on its own", () => {
    const house = { box: [10, 0, 20, 10] as [number, number, number, number], owner: 1 };
    expect([...clearLabels([{ box: [0, 0, 30, 10], own: 1 }], [house])]).toEqual([0]);
    expect([...clearLabels([{ box: [0, 0, 30, 10], own: 2 }], [house])]).toEqual([]);
  });
});
