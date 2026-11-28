/**
 * The full purse card's lever (purseLever.ts), over whole bot games: it names only a council that
 * does not back you, a build there you can make now, and every slot is filled.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoardModel } from "../engine/api";
import { acceptBoardModel } from "../model";
import { backersNow } from "./electionTargets";
import { councilView } from "./engine";
import { purseLever } from "./purseLever";
import { statesForTest } from "./testStates";
import { councilName, nameIdsFrom } from "./words";

const realPath = join(__dirname, "..", "..", "..", "public", "board-model.json");

describe.skipIf(!existsSync(realPath))("the full purse card's lever", () => {
  const model: BoardModel = acceptBoardModel(JSON.parse(readFileSync(realPath, "utf8")));
  nameIdsFrom(model);
  it("names a council that does not back you, and a build there you can make now", () => {
    let named = 0;
    for (const s of statesForTest(model, 2026).filter((x, i) => x.phase !== "ended" && i % 2 === 0)) {
      const line = purseLever(model, s);
      if (!line) continue;
      named++;
      expect(line).not.toMatch(/\{\w+\}|undefined|NaN/);
      const head = line.split(" is asking")[0]!.split(": ").pop()!.toLowerCase();
      const code = model.game.councils.find((c) => head.endsWith(councilName(model, c).toLowerCase()));
      expect(code, line).toBeDefined();
      expect(backersNow(model, s).backers).not.toContain(code);
      expect(councilView(model, s, code!).lever.builds.some((b) => b.allowed)).toBe(true);
    }
    expect(named).toBeGreaterThan(0);
  });
});
