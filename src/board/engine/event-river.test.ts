/**
 * One flood, one river (playtest 10 must-fix 7). Over many games on the real board, every river
 * flood keeps the river it came down on its record, that river touches the council it hit first,
 * and `eventRiver` names that same river however often it is asked.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel } from "../../../scripts/board/assemble";
import { readBoardInputs } from "../../../scripts/board/read-inputs";
import { playGame, random, startFor } from "./bots";
import { eventRiver, isRiverEvent } from "./event-river";
import type { BoardModel } from "./types";

let model: BoardModel;
beforeAll(() => {
  model = assembleBoardModel(readBoardInputs()).model;
});

describe("the river of a flood", () => {
  it("is chosen once when it lands and every reading names the same one", () => {
    let floods = 0;
    for (let g = 1; g <= 6; g++) {
      const s = playGame(model, random, g, startFor(model, g));
      for (const e of s.events) {
        if (!isRiverEvent(model, e.event)) {
          expect(eventRiver(model, e)).toBeUndefined();
          continue;
        }
        floods++;
        expect(e.river, `${e.event} in game ${g}`).toBeDefined();
        const link = model.links.find((l) => l.id === e.river)!;
        expect([link.from, link.to]).toContain(e.councils[0]);
        expect(eventRiver(model, e)).toEqual(link.name);
        expect(eventRiver(model, { ...e })).toEqual(eventRiver(model, e));
      }
    }
    expect(floods).toBeGreaterThan(0);
  }, 60_000);
});
