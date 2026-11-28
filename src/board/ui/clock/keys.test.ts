// Space pauses whatever has focus (cold playtest 9, must fix 5), never answers a card (cold
// playtest 10, must fix 10), and one key press never does two things: every case is tried, and a
// move that works the clock always cancels the key's default. Escape closes one thing at a time.
import { describe, expect, it } from "vitest";
import { escapeTarget, keyMove, type EscCtx, type KeyCtx, type KeyTarget } from "./keys";

const base: KeyCtx = {
  key: " ", mods: false, repeat: false, target: "page", onBoard: true, visit: false,
  head: null, stepByStep: false, playing: false, speeds: 3,
};

function* every(): Generator<KeyCtx> {
  const bools = [false, true];
  for (const key of [" ", "Enter", "1", "3", "4", ".", "a"])
    for (const target of ["field", "control", "page"] as KeyTarget[])
        for (const visit of bools)
          for (const head of [null, { hard: false }, { hard: true }])
            for (const stepByStep of bools)
              for (const playing of bools)
                for (const repeat of bools)
                  for (const mods of bools)
                    yield { ...base, key, target, visit, head, stepByStep, playing, repeat, mods };
}

describe("the clock's keys", () => {
  it("Space pauses with a button or a link focused, not only the page", () => {
    expect(keyMove({ ...base, target: "control", playing: true })).toEqual({ kind: "toggle" });
    expect(keyMove({ ...base, target: "page", playing: true })).toEqual({ kind: "toggle" });
  });

  it("leaves every key to a text field", () => {
    for (const c of every()) if (c.target === "field") expect(keyMove(c), JSON.stringify(c)).toEqual({ kind: "ignore" });
  });

  it("never takes Enter, so Enter presses the focused button once", () => {
    for (const c of every()) if (c.key === "Enter") expect(keyMove(c).kind).toBe("ignore");
  });

  it("never lets Space press a card's button: on any card, focused or not, Space pauses or plays", () => {
    for (const c of every()) {
      if (c.key !== " " || c.mods || c.target === "field" || c.visit || c.repeat || c.stepByStep || !c.head) continue;
      expect(keyMove(c), JSON.stringify(c)).toEqual({ kind: "toggle" });
    }
  });

  it("in step by step mode, Space never moves time past a card waiting on screen", () => {
    expect(keyMove({ ...base, stepByStep: true, head: { hard: false } }).kind).toBe("swallow");
    expect(keyMove({ ...base, stepByStep: true, head: null }).kind).toBe("step");
  });

  it("Space with a modifier, or off the board, is not the clock's", () => {
    for (const c of every()) if (c.mods) expect(keyMove(c).kind).toBe("ignore");
    expect(keyMove({ ...base, onBoard: false }).kind).toBe("ignore");
  });

  it("does one thing per Space: a held key does not toggle again and again", () => {
    expect(keyMove({ ...base, repeat: true }).kind).toBe("swallow");
  });

  it("every Space on the board's controls works the clock (and so cancels the button)", () => {
    for (const c of every()) {
      if (c.key !== " " || c.mods || c.target !== "control" || c.visit) continue;
      expect(keyMove(c).kind, JSON.stringify(c)).not.toBe("ignore");
    }
  });

  it("picks speeds by number, only those that exist", () => {
    expect(keyMove({ ...base, key: "3" })).toEqual({ kind: "speed", index: 2 });
    expect(keyMove({ ...base, key: "4" }).kind).toBe("ignore");
  });

  it("Escape closes one thing at a time, the top one, and leaves a visit to its own keys", () => {
    const none: EscCtx = { visit: false, why: false, warning: false, term: false, sheet: false, build: false, council: false, card: false };
    const all: EscCtx = { visit: false, why: true, warning: true, term: true, sheet: true, build: true, council: true, card: false };
    expect(escapeTarget(none)).toBeNull();
    expect(escapeTarget({ ...all, visit: true })).toBeNull();
    // closing the top one each time takes exactly one press per thing open
    let open = { ...all };
    const closed: string[] = [];
    for (let k = escapeTarget(open); k; k = escapeTarget(open)) { closed.push(k); open = { ...open, [k]: false }; }
    expect(closed).toEqual(["why", "warning", "term", "sheet", "build", "council"]);
    // under a card, only Why? over it closes: the build menu and the council stay
    expect(escapeTarget({ ...none, card: true, why: true, build: true })).toBe("why");
    expect(escapeTarget({ ...none, card: true, build: true, council: true })).toBeNull();
  });
});
