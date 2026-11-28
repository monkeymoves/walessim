import { describe, expect, it } from "vitest";
import { moveOldSaves, type KeyStore } from "./saves";

/** A plain map with the Storage calls the move uses, counting removals. */
function mapStore(init: Record<string, string>): KeyStore & { data: Map<string, string>; removed: string[] } {
  const data = new Map(Object.entries(init));
  const removed: string[] = [];
  return {
    data, removed,
    get length() { return data.size; },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); },
    removeItem: (k) => { removed.push(k); data.delete(k); },
  };
}

describe("saves from before boards", () => {
  const SE = "etifeddiaeth.board.v2.southeast.";

  it("move under the board's prefix key by key, drop the old run code and leave other keys alone", () => {
    const s = mapStore({
      "etifeddiaeth.board.v2.prefs": "{\"speed\":\"fast\"}",
      "etifeddiaeth.board.v2.endings": "[\"drift\"]",
      "etifeddiaeth.board.v2.run": "b2.xyz",
      "etifeddiaeth.board.v2.north.prefs": "{}",
      "etifeddiaeth.v1.lang": "cy",
      "faceys-patch.v1": "{}",
    });
    expect(moveOldSaves(SE, s).sort()).toEqual(["etifeddiaeth.board.v2.endings", "etifeddiaeth.board.v2.prefs", "etifeddiaeth.board.v2.run"]);
    expect(Object.fromEntries(s.data)).toEqual({
      [`${SE}prefs`]: "{\"speed\":\"fast\"}",
      [`${SE}endings`]: "[\"drift\"]",
      "etifeddiaeth.board.v2.north.prefs": "{}",
      "etifeddiaeth.v1.lang": "cy",
      "faceys-patch.v1": "{}",
    });
    expect(s.removed.sort()).toEqual(["etifeddiaeth.board.v2.endings", "etifeddiaeth.board.v2.prefs", "etifeddiaeth.board.v2.run"]);
  });

  it("do nothing a second time, with no storage, or for a prefix that names no board", () => {
    const s = mapStore({ [`${SE}prefs`]: "{}" });
    expect(moveOldSaves(SE, s)).toEqual([]);
    expect(moveOldSaves(SE, null)).toEqual([]);
    expect(moveOldSaves("etifeddiaeth.board.v2.", mapStore({ "etifeddiaeth.board.v2.prefs": "{}" }))).toEqual([]);
  });

  it("never throw when storage does", () => {
    const broken = { get length(): number { throw new Error("blocked"); } } as unknown as KeyStore;
    expect(moveOldSaves(SE, broken)).toEqual([]);
  });
});
