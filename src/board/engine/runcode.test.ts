import { describe, expect, it } from "vitest";
import { BoardRunError } from "./errors";
import { boardFixture } from "./fixture";
import { decodeRun, encodeRun, fromBase64Url, toBase64Url } from "./runcode";
import { playGame } from "./test-play";
import { act, advance, newBoard } from "./clock";

describe("run codes", () => {
  const model = boardFixture();

  it("round trip text through base64url, Welsh letters included", () => {
    for (const t of ["", "a", "ab", "abc", "Ŵyl Dewi, Ynys Môn ŷ", JSON.stringify([1, "x", ["y"]])]) expect(fromBase64Url(toBase64Url(t))).toBe(t);
  });

  it("are short enough to paste for a whole game", () => {
    const state = playGame(model, 12, "warm-homes").state;
    expect(encodeRun(state).length).toBeLessThan(1500);
  });

  it("keep the game number's type", () => {
    expect(decodeRun(model, encodeRun(newBoard(model, 42, "warm-homes"))).gameNumber).toBe(42);
    expect(decodeRun(model, encodeRun(newBoard(model, "42", "warm-homes"))).gameNumber).toBe("42");
  });

  it("say plainly that a phase 1 code is from an older version", () => {
    expect(() => decodeRun(model, `B1${toBase64Url("[1,2,3]")}`)).toThrow("This code is from an older version of the game.");
  });

  it("keep the step reached, so a paused game comes back where it was", () => {
    let s = newBoard(model, 3, "warm-homes");
    s = act(model, s, { kind: "build", project: "warm-terraces", site: { council: "W06000024" } });
    const out = advance(model, s, { maxSteps: 7 }).state;
    expect(decodeRun(model, encodeRun(out)).step).toBe(out.step);
    expect(encodeRun(out)).toMatch(/^b2\./);
  });

  it("refuse codes they cannot read or that were made with another model", () => {
    const code = encodeRun(newBoard(model, 1, "warm-homes"));
    expect(() => decodeRun(model, "hello")).toThrow(BoardRunError);
    expect(() => decodeRun(model, "b2.!!!")).toThrow(BoardRunError);
    expect(() => decodeRun(model, `b2.${toBase64Url("[2,2,3]")}`)).toThrow(BoardRunError);
    const other = boardFixture();
    other.meta.hash = "another-model";
    expect(() => decodeRun(other, code)).toThrow(/different version/);
  });

  it("refuse a code whose log does not replay", () => {
    const bad = `b2.${toBase64Url(JSON.stringify([2, model.meta.hash.slice(0, 8), 1, "warm-homes", 0, ["health-hub", "W06000024"], "0@b0:c1"]))}`;
    expect(() => decodeRun(model, bad)).toThrow(/does not replay/);
  });
});
