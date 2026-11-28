/**
 * Same game number, same actions at the same steps, same game (fairness rule 4, section 12, ADR
 * 0007): the save format, the run code and this test are one thing.
 */
import { describe, expect, it } from "vitest";
import { newBoard, replay } from "./clock";
import { boardFixture } from "./fixture";
import { decodeRun, encodeRun } from "./runcode";
import { playGame } from "./test-play";

describe("determinism", () => {
  const model = boardFixture();

  it("gives a byte equal state for the same game number and log", () => {
    for (const [n, start] of [[1, "work-valleys"], [77, "warm-homes"], ["Treorci", "ready-weather"]] as const) {
      const a = playGame(model, n, start).state;
      const b = replay(model, n, start, a.log, a.step);
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
      expect(code).toMatch(/^b3\.[A-Za-z0-9_-]+$/);
      expect(JSON.stringify(decodeRun(model, code))).toBe(JSON.stringify(state));
    }
  });

  it("round trips a game in progress, paused at any step", () => {
    const full = playGame(model, 6, "warm-homes").state;
    const log = full.log.filter((e) => e.at <= 41);
    const half = replay(model, 6, "warm-homes", log, 41);
    expect(half.step).toBe(41);
    expect(JSON.stringify(decodeRun(model, encodeRun(half)))).toBe(JSON.stringify(half));
  });
});
