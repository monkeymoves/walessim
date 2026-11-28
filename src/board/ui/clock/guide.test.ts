// The guide shows a note only when what it talks about is on screen (playtest 8, should fix 4).
import { describe, expect, it } from "vitest";
import { GUIDE_DONE, GUIDE_NOTES, guideAfter, guideGotIt, guideNote, type GuideCtx } from "./guide";

const bools = [false, true];
function* every(): Generator<GuideCtx> {
  for (const selected of bools) for (const buildOpen of bools) for (const otherOpen of bools) for (const built of bools) yield { selected, buildOpen, otherOpen, built };
}

describe("the guide", () => {
  it("never talks about a council's bars with no council open, nor about the build menu when it is shut", () => {
    for (let n = 0; n < GUIDE_NOTES.length; n++) {
      for (const c of every()) {
        const shown = guideNote(n, c)?.note;
        if (shown === "council") expect(c.selected && !c.buildOpen, JSON.stringify(c)).toBe(true);
        if (shown === "build") expect(c.buildOpen).toBe(true);
        if (shown === "map") expect(c.selected || c.buildOpen).toBe(false);
      }
    }
  });

  it("stays out of the way of anything else open, and of a player who has built", () => {
    for (let n = 0; n < GUIDE_NOTES.length; n++) {
      for (const c of every()) if (c.otherOpen || c.built) expect(guideNote(n, c)).toBeNull();
    }
  });

  it("skips past notes whose subject is not on screen after Got it (cold playtest, business g1-05)", () => {
    const none: GuideCtx = { selected: false, buildOpen: false, otherOpen: false, built: false };
    expect(guideNote(0, none)?.note).toBe("map");
    const next = guideGotIt(0);
    // with no council open the council note does not show its words about bars
    expect(guideNote(next, none)).toBeNull();
    expect(guideNote(next, { ...none, selected: true })?.note).toBe("council");
  });

  it("moves on when the player does what it asks, and ends once they build", () => {
    expect(guideAfter(0, { selected: true, buildOpen: false, otherOpen: false, built: false })).toBe(1);
    expect(guideAfter(0, { selected: true, buildOpen: true, otherOpen: false, built: false })).toBe(2);
    expect(guideAfter(1, { selected: true, buildOpen: true, otherOpen: false, built: true })).toBe(GUIDE_DONE);
    expect(guideAfter(GUIDE_DONE, { selected: true, buildOpen: true, otherOpen: false, built: false })).toBe(GUIDE_DONE);
    expect(guideGotIt(GUIDE_NOTES.length - 1)).toBe(GUIDE_DONE);
  });
});
