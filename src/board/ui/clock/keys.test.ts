// Space pauses whatever has focus (cold playtest 9, must fix 5), and one key press never does two
// things: every case is tried, and a move that works the clock always cancels the key's default.
import { describe, expect, it } from "vitest";
import { keyMove, type KeyCtx, type KeyTarget } from "./keys";

const base: KeyCtx = {
  key: " ", mods: false, repeat: false, target: "page", inCard: false, onBoard: true, visit: false,
  head: null, stepByStep: false, playing: false, speeds: 3,
};

function* every(): Generator<KeyCtx> {
  const bools = [false, true];
  for (const key of [" ", "Enter", "1", "3", "4", ".", "a"])
    for (const target of ["field", "control", "page"] as KeyTarget[])
      for (const inCard of bools)
        for (const visit of bools)
          for (const head of [null, { hard: false }, { hard: true }])
            for (const stepByStep of bools)
              for (const playing of bools)
                for (const repeat of bools)
                  for (const mods of bools)
                    yield { ...base, key, target, inCard, visit, head, stepByStep, playing, repeat, mods };
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

  it("leaves Space to a button on a card that waits for the player, so the card is answered once", () => {
    expect(keyMove({ ...base, target: "control", inCard: true, head: { hard: true } })).toEqual({ kind: "ignore" });
    expect(keyMove({ ...base, target: "control", inCard: true, head: { hard: false } })).toEqual({ kind: "ignore" });
  });

  it("reads Space as Carry on for a soft stop, and never as a hard stop's answer", () => {
    expect(keyMove({ ...base, head: { hard: false } })).toEqual({ kind: "carryOn" });
    expect(keyMove({ ...base, head: { hard: true } })).toEqual({ kind: "swallow" });
  });

  it("Space with a modifier, or off the board, is not the clock's", () => {
    for (const c of every()) if (c.mods) expect(keyMove(c).kind).toBe("ignore");
    expect(keyMove({ ...base, onBoard: false }).kind).toBe("ignore");
  });

  it("does one thing per Space: a held key does not toggle again and again", () => {
    expect(keyMove({ ...base, repeat: true }).kind).toBe("swallow");
  });

  it("every Space on the board's controls outside a card works the clock (and so cancels the button)", () => {
    for (const c of every()) {
      if (c.key !== " " || c.mods || c.target !== "control" || c.inCard || c.visit) continue;
      expect(keyMove(c).kind, JSON.stringify(c)).not.toBe("ignore");
    }
  });

  it("picks speeds by number, only those that exist", () => {
    expect(keyMove({ ...base, key: "3" })).toEqual({ kind: "speed", index: 2 });
    expect(keyMove({ ...base, key: "4" }).kind).toBe("ignore");
  });
});
