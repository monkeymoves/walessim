// The top strip's account of the headline adds up: the change since 2026 is the headline less
// its start, what is on the way is part of it until it lands, and the words match the sign.
import { describe, expect, it } from "vitest";
import { act, advance, boardFixture, newBoard, options, scores, yearOfStep } from "../../engine/api";
import { direction, headlineIf, headway, tenths } from "./headway";

const model = boardFixture();

describe("headway", () => {
  it("starts with nothing since 2026 and nothing being built", () => {
    const s = newBoard(model, 1213, model.starts[0]!.id);
    const h = headway(model, s);
    expect(h.since).toBeCloseTo(h.now - h.start, 9);
    expect(h.now).toBeCloseTo(scores(model, s).left, 9);
    if (!s.projects.some((p) => p.status === "building")) {
      expect(h.building).toBe(0);
      expect(h.buildingBy).toBeNull();
    }
  });

  it("counts a build under way until it opens, with the year it opens", () => {
    let s = newBoard(model, 1213, model.starts[0]!.id);
    const build = options(model, s).filter((o) => o.allowed && o.action.kind === "build").sort((a, b) => b.cost - a.cost)[0]!;
    const before = headway(model, s);
    const ifBuilt = headlineIf(model, s, build.action);
    s = act(model, s, build.action);
    const h = headway(model, s);
    expect(ifBuilt).not.toBeNull();
    expect(ifBuilt!).toBeCloseTo(h.now, 9);
    const p = s.projects.find((x) => x.status === "building");
    if (p) {
      expect(h.building).toBeGreaterThan(0);
      // the year on the strip is never before the season the map and panel say it opens
      // (cold playtest 8 join: "open by 2027" beside a ring marked "Summer 2028")
      expect(h.buildingBy).toBeGreaterThanOrEqual(yearOfStep(model, p.readyStep + 1));
      // run until everything has landed: nothing is left on the way
      const done = advance(model, s, { maxSteps: 96, stopOn: [] }).state;
      if (done.phase === "play" && !done.projects.some((x) => x.status === "building")) {
        expect(headway(model, done).building).toBeCloseTo(0, 6);
        expect(headway(model, done).buildingBy).toBeNull();
      }
    }
    expect(h.start).toBeCloseTo(before.start, 9);
  });

  it("does not change the state it is asked about", () => {
    const s = newBoard(model, 77, model.starts[0]!.id);
    const copy = JSON.stringify(s);
    const o = options(model, s).find((x) => x.allowed && x.action.kind === "build");
    if (o) headlineIf(model, s, o.action);
    headway(model, s);
    expect(JSON.stringify(s)).toBe(copy);
  });

  it("reads a change at one decimal, so the words never contradict the number shown", () => {
    for (let c = -2; c <= 2; c += 0.01) {
      const d = direction(c);
      const shown = tenths(c);
      expect(d === "same" ? shown === 0 : d === "up" ? shown > 0 : shown < 0).toBe(true);
    }
  });
});
