/**
 * Same game number, same steps, same game (fairness rule 4, section 12): the save format, the run
 * code and this test are one thing.
 */
import { describe, expect, it } from "vitest";
import { boardFixture } from "./fixture";
import { decodeRun, encodeRun, replay } from "./runcode";
import { playGame } from "./test-play";
import { newBoard } from "./turn";

describe("determinism", () => {
  const model = boardFixture();

  it("gives a byte equal state for the same game number and steps", () => {
    for (const [n, start] of [[1, "work-valleys"], [77, "warm-homes"], ["Treorci", "ready-weather"]] as const) {
      const a = playGame(model, n, start).state;
      const b = replay(model, n, start, a.steps);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  });

  it("gives the same new board for the same game number", () => {
    expect(JSON.stringify(newBoard(model, 123, "warm-homes"))).toBe(JSON.stringify(newBoard(model, 123, "warm-homes")));
  });

  it("varies the game with the game number", () => {
    const futures = new Set(Array.from({ length: 40 }, (_, i) => newBoard(model, i, "warm-homes").future));
    expect(futures.size).toBeGreaterThan(1);
  });

  it("decodes an encoded run to the identical state", () => {
    for (const n of [5, 908, "Merthyr Tudful 2050"]) {
      const state = playGame(model, n, "work-valleys").state;
      const code = encodeRun(state);
      expect(code).toMatch(/^B1[A-Za-z0-9_-]+$/);
      expect(JSON.stringify(decodeRun(model, code))).toBe(JSON.stringify(state));
    }
  });

  it("round trips a game in progress", () => {
    const mid = playGame(model, 6, "warm-homes").state;
    const steps = mid.steps.slice(0, mid.steps.findIndex((s, i) => s.kind === "end_turn" && mid.steps.slice(0, i + 1).filter((x) => x.kind === "end_turn").length === 5) + 1);
    const half = replay(model, 6, "warm-homes", steps);
    expect(half.turn).toBe(5);
    expect(JSON.stringify(decodeRun(model, encodeRun(half)))).toBe(JSON.stringify(half));
  });
});
