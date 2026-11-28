import { describe, expect, it } from "vitest";
import { BoardRunError } from "./errors";
import { boardFixture } from "./fixture";
import { decodeRun, encodeRun, fromBase64Url, toBase64Url } from "./runcode";
import { playGame } from "./test-play";
import { newBoard } from "./turn";

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

  it("refuse codes they cannot read or that were made with another model", () => {
    const code = encodeRun(newBoard(model, 1, "warm-homes"));
    expect(() => decodeRun(model, "hello")).toThrow(BoardRunError);
    expect(() => decodeRun(model, "B1!!!")).toThrow(BoardRunError);
    expect(() => decodeRun(model, `B1${toBase64Url("[1,2,3]")}`)).toThrow(BoardRunError);
    const other = boardFixture();
    other.meta.hash = "another-model";
    expect(() => decodeRun(other, code)).toThrow(/different version/);
  });

  it("refuse a code whose steps do not replay", () => {
    const bad = `B1${toBase64Url(JSON.stringify([1, model.meta.hash.slice(0, 8), 1, "warm-homes", ["health-hub", "W06000024"], "b0:c1"]))}`;
    expect(() => decodeRun(model, bad)).toThrow(/does not replay/);
  });
});
