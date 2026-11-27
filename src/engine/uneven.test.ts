/** Decision 15: the uneven-hand letter names a region that never got a card of its own. */
import { describe, expect, it } from "vitest";
import { overlookedRegion } from "./voices";
import { testModel } from "./test-model";
import { playBot, strategyBots, thoughtfulBot } from "./bots";

const pops = { north: 0.22, mid: 0.07, southwest: 0.23, southeast: 0.48 } as const;

describe("the overlooked region", () => {
  it("is a region that received no regional card of its own in the whole game", () => {
    expect(overlookedRegion({ north: 2, mid: 0, southwest: 1, southeast: 3 }, pops)).toBe("mid");
  });
  it("is the least served region when one region took more than two thirds of regional plays", () => {
    expect(overlookedRegion({ north: 2, mid: 1, southwest: 2, southeast: 11 }, pops)).toBe("mid");
    // ties go to the more populous region
    expect(overlookedRegion({ north: 1, mid: 1, southwest: 2, southeast: 9 }, pops)).toBe("north");
  });
  it("is null when the regional plays are spread", () => {
    expect(overlookedRegion({ north: 2, mid: 1, southwest: 2, southeast: 4 }, pops)).toBeNull();
    expect(overlookedRegion({ north: 0, mid: 0, southwest: 0, southeast: 0 }, pops)).toBeNull();
  });
  it("names that region in the letter of a south-east-only game that did well", () => {
    const m = testModel();
    const se = strategyBots.find((b) => b.id === "south-east-only")!;
    let found = false;
    for (let seed = 1; seed <= 12 && !found; seed++) {
      const r = playBot(m, se, seed, { runs: 10 }).result!;
      if (r.archetype !== "uneven") continue;
      found = true;
      expect(r.letter.named.kind).toBe("neglect");
      expect(["north", "mid", "southwest"]).toContain(r.letter.named.id);
    }
    expect(found).toBe(true);
  });
  it("does not send the uneven letter to a player who spread the cards", () => {
    const m = testModel();
    for (let seed = 1; seed <= 6; seed++) {
      const r = playBot(m, thoughtfulBot, seed, { runs: 10 }).result!;
      if (r.archetype === "uneven") expect(r.letter.named.kind).toBe("neglect");
    }
  });
});
