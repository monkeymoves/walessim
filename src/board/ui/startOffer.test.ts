// The start screen's game numbers match the game each button plays (playtest 8, must fix 15).
import { describe, expect, it } from "vitest";
import { advance, boardFixture, decodeRun, encodeRun, newBoard } from "../engine/api";
import { gameNo, startOffer } from "./startOffer";

describe("the start screen's offer", () => {
  it("names the new game's own number, plainly, as the end screen does", () => {
    const o = startOffer(null, 3036);
    expect(o.fresh).toEqual({ gameNumber: "3036", main: true });
    expect(o.resume).toBeNull();
    expect(o.seeEnd).toBeNull();
    // the end screen writes String(state.gameNumber)
    const s = newBoard(boardFixture(), 3036, boardFixture().starts[0]!.id);
    expect(gameNo(s.gameNumber)).toBe(o.fresh.gameNumber);
  });

  it("offers a running save as Carry on with the save's number, and the new game as the second choice", () => {
    const o = startOffer({ gameNumber: 1213, phase: "play", step: 12 }, 3036);
    expect(o.resume).toEqual({ gameNumber: "1213" });
    expect(o.fresh).toEqual({ gameNumber: "3036", main: false });
  });

  it("never offers an ended game as Carry on: the main button starts the new game shown", () => {
    const o = startOffer({ gameNumber: 1213, phase: "ended", step: 96 }, 3036);
    expect(o.resume).toBeNull();
    expect(o.seeEnd).toEqual({ gameNumber: "1213" });
    expect(o.fresh.main).toBe(true);
  });

  it("keeps a saved game's number through its run code", () => {
    const model = boardFixture();
    const s = advance(model, newBoard(model, 1440, model.starts[0]!.id), { maxSteps: 3 }).state;
    expect(gameNo(decodeRun(model, encodeRun(s)).gameNumber)).toBe("1440");
  });
});
