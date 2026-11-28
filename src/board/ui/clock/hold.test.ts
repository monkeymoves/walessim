// The clock is held only by something the player can see (playtest 8, must fix 2): every state
// the screen can be in is tried, and none leaves the clock held with nothing open to close.
import { describe, expect, it } from "vitest";
import { holdOf, LANE_READING, overlays, type Overlay, type Screenful, type SheetKind } from "./hold";

const SHEETS: SheetKind[] = [null, "build", "tree", "laws", "settings"];
const bools = [false, true];

function* every(): Generator<Screenful> {
  for (const phase of ["play", "respond", "ended"] as const)
    for (const queued of [0, 1])
      for (const hidden of bools)
        for (const holdWhileReading of bools)
          for (const sheet of SHEETS)
            for (const selected of bools)
              for (const why of bools)
                for (const visit of bools)
                  for (const warning of bools)
                    for (const term of bools)
                      yield { phase, answerWaiting: phase === "respond", queued, hidden, holdWhileReading, sheet, selected, why, visit, warning, term };
}

describe("the clock's hold", () => {
  it("is always something on screen, a hidden page, or 2050", () => {
    let n = 0;
    for (const s of every()) {
      n++;
      const why = holdOf(s);
      if (why === null || why === "ended" || why === "hidden") continue;
      expect(overlays(s), JSON.stringify(s)).toContain(why as Overlay);
    }
    expect(n).toBe(3 * 2 * 2 * 2 * 5 * 2 * 2 * 2 * 2 * 2);
  });

  it("lets go when nothing is open: no state leaves the clock stuck", () => {
    for (const s of every()) {
      if (s.phase !== "play" || s.hidden) continue;
      if (overlays(s).length === 0) expect(holdOf(s), JSON.stringify(s)).toBeNull();
    }
  });

  it("lets go once each open thing is closed, one at a time", () => {
    for (const s of every()) {
      if (s.phase !== "play" || s.hidden || s.queued) continue;
      const closed: Screenful = { ...s, sheet: null, why: false, visit: false, warning: false, term: false };
      expect(holdOf(closed)).toBeNull();
    }
  });

  it("is never held by a build menu whose council was closed (cold playtest, cymraeg g1-18)", () => {
    const s: Screenful = { phase: "play", answerWaiting: false, queued: 0, hidden: false, holdWhileReading: true, sheet: "build", selected: false, why: false, visit: false, warning: false, term: false };
    expect(overlays(s)).toEqual([]);
    expect(holdOf(s)).toBeNull();
    expect(holdOf({ ...s, selected: true })).toBe("build");
  });

  it("does not hold for reading when the player switched that off", () => {
    const s: Screenful = { phase: "play", answerWaiting: false, queued: 0, hidden: false, holdWhileReading: false, sheet: "tree", selected: false, why: true, visit: false, warning: false, term: false };
    expect(holdOf(s)).toBeNull();
    // a stop comes first: the branches step aside under it
    expect(holdOf({ ...s, queued: 1 })).toBe("stop");
    expect(overlays({ ...s, queued: 1 })).not.toContain("tree");
  });

  it("puts an answer before a stop, as the screen draws it", () => {
    const s: Screenful = { phase: "respond", answerWaiting: true, queued: 1, hidden: false, holdWhileReading: true, sheet: null, selected: false, why: false, visit: false, warning: false, term: false };
    expect(overlays(s)).toEqual(["answer"]);
    expect(holdOf(s)).toBe("answer");
  });

  it("draws one card at a time in the lane: never a card over a past term, a warning, the branches or the laws (cold playtest 10, must fix 11)", () => {
    for (const s of every()) {
      const shown = overlays(s);
      const cards = shown.filter((o) => o === "answer" || o === "stop" || (LANE_READING as readonly string[]).includes(o));
      if (shown.includes("answer") || shown.includes("stop")) expect(cards, JSON.stringify(s)).toHaveLength(1);
    }
  });

  it("brings back what stepped aside once the card is gone, as it was", () => {
    for (const s of every()) {
      if (s.phase !== "play" || s.queued === 0) continue;
      const after = overlays({ ...s, queued: 0 });
      if (s.term) expect(after).toContain("term");
      if (s.warning) expect(after).toContain("warning");
      if (s.sheet === "tree" || s.sheet === "laws") expect(after).toContain(s.sheet);
    }
  });

  it("holds while anything the player opened, or any card, is on screen (cold playtest 9: 6 of 8 felt rushed)", () => {
    for (const s of every()) {
      if (s.phase !== "play" && s.phase !== "respond") continue;
      if (!s.holdWhileReading) continue;
      if (overlays(s).length) expect(holdOf(s), JSON.stringify(s)).not.toBeNull();
    }
  });

  it("holds for a card whatever the setting: a stop or an answer always holds", () => {
    for (const s of every()) {
      if (s.phase === "ended") continue;
      const shown = overlays(s);
      if (shown.includes("stop") || shown.includes("answer")) expect(holdOf(s), JSON.stringify(s)).not.toBeNull();
    }
  });
});
