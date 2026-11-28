/**
 * The clock is a re-expression of phase 1, not a new game (docs/design/v2-board.md 16.2.4, ADR
 * 0007): the fixture run at `years_per_step: 2` and `steps: 12` matches the phase 1 fixture games
 * captured with turn.ts before the clock (clock-equivalence.snapshot.json) to 0.01, in coins,
 * every measure, Backing and young adults, after every step.
 *
 * The snapshot games build nothing with a running cost or a coin effect: 16.2.4 changes those
 * from a lump every other turn to a steady charge each step, by design, so they cannot match.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { act, newBoard, tick } from "./clock";
import { boardFixture } from "./fixture";
import { MEASURE_IDS, type Action, type BoardModel, type BoardState } from "./types";

interface Snap { coins: number; councils: Record<string, { measures: Record<string, number>; backing: number; young: number }> }
interface Game { gameNumber: number; start: string; log: { at: number; action: Action }[]; frames: Snap[]; elections: string[] }

const SNAPSHOT = JSON.parse(readFileSync(resolve(__dirname, "clock-equivalence.snapshot.json"), "utf8")) as { games: Game[] };

/** The fixture with one step of two years: phase 1's turn. */
function twoYearStep(): BoardModel {
  const m = boardFixture();
  m.game.years_per_step = 2;
  m.game.steps = 12;
  return m;
}

function expectClose(state: BoardState, snap: Snap, where: string): void {
  expect(state.coins, `${where} coins`).toBeCloseTo(snap.coins, 2);
  for (const [code, c] of Object.entries(snap.councils)) {
    const now = state.councils[code]!;
    for (const m of MEASURE_IDS) expect(Math.abs(now.measures[m] - c.measures[m]!), `${where} ${code} ${m}`).toBeLessThanOrEqual(0.01);
    expect(Math.abs(now.backing - c.backing), `${where} ${code} backing`).toBeLessThanOrEqual(0.01);
    expect(Math.abs(now.young - c.young), `${where} ${code} young adults`).toBeLessThanOrEqual(0.01);
  }
}

describe("the clock at a two year step matches phase 1", () => {
  it("has three snapshot games with lost and won elections and every outside event", () => {
    expect(SNAPSHOT.games).toHaveLength(3);
    expect(SNAPSHOT.games.flatMap((g) => g.elections)).toEqual(expect.arrayContaining(["lost", "win", "strong_win"]));
  });

  for (const game of SNAPSHOT.games) {
    it(`game ${game.gameNumber} (${game.start}): coins, measures, Backing and young adults within 0.01 at every step`, () => {
      const model = twoYearStep();
      let s = newBoard(model, game.gameNumber, game.start);
      expectClose(s, game.frames[0]!, "step 0");
      let next = 0;
      for (let step = 0; step < model.game.steps; step++) {
        while (next < game.log.length && game.log[next]!.at === step) s = act(model, s, game.log[next++]!.action);
        s = tick(model, s).state;
        expectClose(s, game.frames[step + 1]!, `step ${step + 1}`);
      }
      expect(next).toBe(game.log.length);
      expect(s.phase).toBe("ended");
      expect(s.election.records.map((r) => r.result)).toEqual(game.elections);
    });
  }
});
