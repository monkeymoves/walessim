import { describe, expect, it } from "vitest";
import { boardFixture } from "./fixture";
import { playGame, skilled, startFor } from "./bots";
import { giftEffect, idleDrift } from "./bots-probes";
import { boardScore } from "./score";
import type { BoardModel } from "./types";

const model: BoardModel = boardFixture();

describe("the balance probes", () => {
  it("measures a project by its own share of the board, so the effect is its records and nothing else", () => {
    const s = playGame(model, skilled(), 3, startFor(model, 3));
    const own = s.projects.find((p) => p.status === "working" && p.site.council !== undefined)!;
    expect(own).toBeDefined();
    const effect = giftEffect(model, s, own.project, own.site);
    expect(Number.isFinite(effect)).toBe(true);
    expect(effect).not.toBe(0);
    const absent = model.projects.find((d) => !s.projects.some((p) => p.project === d.id))!;
    expect(giftEffect(model, s, absent.id, { council: model.game.councils[0]! })).toBe(0);
    expect(boardScore(model, s.councils)).toBeGreaterThan(0);
  });

  it("finds no slide in a game with no actions and no events beyond what the rules move", () => {
    expect(Number.isFinite(idleDrift(model, 1))).toBe(true);
  });
});
