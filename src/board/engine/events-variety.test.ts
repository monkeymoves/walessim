/**
 * Playtest 9 should-fix 12: a second game with a new game number met the same events in the same
 * order. On the real board, game numbers with the same start and the same play must meet
 * different trouble at different times.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { acceptBoardModel } from "../model/load";
import { autopilot, playGame } from "./bots";
import type { BoardModel } from "./types";

const REAL = resolve(__dirname, "../../../public/board-model.json");

describe.skipIf(!existsSync(REAL))("events differ between game numbers on the real board", () => {
  const model: BoardModel = acceptBoardModel(JSON.parse(readFileSync(REAL, "utf8")));

  it("the first events seen, and their years, differ between most pairs of game numbers", () => {
    const start = model.starts[0]!.id;
    const games = Array.from({ length: 12 }, (_, i) => playGame(model, autopilot, 101 + i, start));
    const firstTwo = games.map((s) => s.events.slice(0, 2).map((e) => `${e.event}@${Math.floor(e.step / 4)}`).join(" "));
    let same = 0;
    let pairs = 0;
    for (let i = 0; i < firstTwo.length; i++) for (let j = i + 1; j < firstTwo.length; j++, pairs++) if (firstTwo[i] === firstTwo[j]) same++;
    expect(same / pairs).toBeLessThanOrEqual(0.1);
    // No one event opens most games.
    const opener = new Map<string, number>();
    for (const s of games) opener.set(s.events[0]!.event, (opener.get(s.events[0]!.event) ?? 0) + 1);
    expect(Math.max(...opener.values())).toBeLessThanOrEqual(games.length / 2);
  }, 60_000);
});
