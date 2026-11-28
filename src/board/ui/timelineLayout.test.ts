// The time line is laid out in time order, inside the strip, with builds in at most three lanes
// and never more than nine bars.
import { describe, expect, it } from "vitest";
import type { BoardState, TimelineView } from "../engine/api";
import { boardFixture, timeline } from "../engine/api";
import { playForTest } from "./testPlay";
import { LANES, layoutTimeline, MAX_BARS, startOf } from "./timelineLayout";

const model = boardFixture();

describe("layoutTimeline", () => {
  it("places a played game's past and future inside the strip, in time order", () => {
    const state = playForTest(model, 9);
    const mid = { ...state, step: 40 } as BoardState;
    const items = layoutTimeline(model, mid, timeline(model, mid));
    for (const i of items) {
      expect(startOf(i)).toBeGreaterThanOrEqual(0);
      expect(startOf(i)).toBeLessThanOrEqual(1);
    }
    const starts = items.map(startOf);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(items.some((i) => i.kind === "election" && i.held)).toBe(true);
  });

  it("keeps builds in three lanes, at most nine, and folds the rest into a count", () => {
    const s = playForTest(model, 5);
    const base = timeline(model, s);
    const underWay = Array.from({ length: 14 }, (_, n) => ({
      id: `p${n}`, project: model.projects[0]!.id, site: { council: model.game.councils[0]! }, startedStep: n, readyStep: n + 8, keystone: n === 3,
    }));
    const view: TimelineView = { ...base, step: 10, underWay, ahead: [] };
    const items = layoutTimeline(model, s, view, 10);
    const bars = items.filter((i) => i.kind === "build");
    expect(bars.length).toBeLessThanOrEqual(MAX_BARS);
    for (const b of bars) if (b.kind === "build") {
      expect(b.lane).toBeGreaterThanOrEqual(0);
      expect(b.lane).toBeLessThan(LANES);
      expect(b.done).toBeGreaterThanOrEqual(0);
      expect(b.done).toBeLessThanOrEqual(1);
    }
    const more = items.find((i) => i.kind === "more");
    expect(more && more.kind === "more" ? more.count + bars.length : bars.length).toBe(14);
  });
});
