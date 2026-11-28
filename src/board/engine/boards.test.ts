/**
 * One rule set, several boards (ADR 0009): both fixture boards check, play whole games with the
 * test player and the balance bots, and their shared conditions read each board's own areas.
 */
import { describe, expect, it } from "vitest";
import { checkBoardModel } from "../model/check";
import { inArea } from "./areas";
import { allBots, playGame as botGame } from "./bots";
import { decodeRun, encodeRun } from "./runcode";
import { boardFixture } from "./fixture";
import { boardFixtureTwo } from "./fixture-two";
import { ending, evidenceLine } from "./endings";
import { playGame } from "./test-play";
import type { BoardModel } from "./types";

const boards: [string, () => BoardModel][] = [["fixture", boardFixture], ["fixture-two", boardFixtureTwo]];

describe.each(boards)("the %s board", (id, make) => {
  const model = make();

  it("checks, names itself and saves under its own key", () => {
    expect(checkBoardModel(model)).toEqual([]);
    expect(model.game.board).toBe(id);
    expect(model.game.save_key).toBe(`etifeddiaeth.board.v2.${id}.`);
    for (const c of [...inArea(model, "core"), ...inArea(model, "edge")]) expect(model.game.councils).toContain(c);
  });

  it("plays whole games from every start, each ending on the board's own councils and replaying from its run code", () => {
    for (const start of model.starts.map((s) => s.id)) {
      for (const n of [1, 2, 3]) {
        const { state } = playGame(model, n, start);
        expect(state.phase, `${start} ${n}`).toBe("ended");
        expect(state.step).toBe(model.game.steps);
        expect(state.board).toBe(id);
        expect(Object.keys(state.councils).sort()).toEqual([...model.game.councils].sort());
        const end = ending(model, state);
        expect(model.endings.some((e) => e.id === end.id)).toBe(true);
        expect(decodeRun(model, encodeRun(state))).toEqual(state);
      }
    }
  });

  it("plays whole games with every balance bot", () => {
    for (const bot of allBots(model)) {
      const state = botGame(model, bot, 4, model.starts[0]!.id);
      expect(state.phase, bot.id).toBe("ended");
    }
  });

  it("picks an edge evidence line from the edge councils only", () => {
    const { state } = playGame(model, 2, "work-valleys");
    const line = evidenceLine(model, state, { kind: "young_adults_change", area: "edge", up: { en: "{council} up", cy: "{council}" }, down: { en: "{council} down", cy: "{council}" } });
    expect(inArea(model, "edge")).toContain(line.council);
  });
});

describe("the second fixture board", () => {
  it("is cut to its own councils: links, stubs, places and visits", () => {
    const two = boardFixtureTwo();
    const on = new Set([...two.game.councils, ...two.stubs.map((s) => s.id)]);
    for (const l of two.links) expect(on.has(l.from) && on.has(l.to), l.id).toBe(true);
    expect(two.places.every((p) => two.game.councils.includes(p.council))).toBe(true);
    const places = new Set(two.places.map((p) => p.id));
    for (const x of [...two.projects, ...two.events]) if (x.visit) expect(places.has(x.visit)).toBe(true);
    expect(two.game.map_groups.map((g) => g.id)).toEqual(["valleys", "city"]);
  });

  it("does not change the first board", () => {
    boardFixtureTwo();
    expect(boardFixture().game.councils).toHaveLength(3);
  });
});
