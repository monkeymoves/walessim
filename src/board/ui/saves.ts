/**
 * Saves from before boards (ADR 0009). Until v3 the one board saved under `etifeddiaeth.board.v2.`
 * with no board id ("etifeddiaeth.board.v2.prefs"). Each board now saves under its own prefix
 * (`game.save_key`, "etifeddiaeth.board.v2.southeast."). The first board opened takes the old
 * keys over, key by key: each is set under the board's prefix and then removed singly, never by
 * clearing storage (other apps share this origin). An old run code cannot replay on a board (it
 * names none), so it is removed, not moved. An old key only exists before the first v3 visit,
 * so it is the newer value and replaces the board's.
 */

/** The prefix every board's own prefix starts with: game.yaml's `save_key`. */
const OLD = "etifeddiaeth.board.v2.";
/** An old key: the prefix and one word, with no board id between them. */
const OLD_KEY = /^etifeddiaeth\.board\.v2\.([a-z]+)$/;
/** Old keys that are dropped instead of moved. */
const DROP = new Set(["run"]);

/** The part of `Storage` this needs, so tests can pass a plain map. */
export type KeyStore = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;

const local = (): KeyStore | null => {
  try { return globalThis.localStorage ?? null; } catch { return null; }
};

/** Move the keys saved before boards under this board's prefix. Returns the old keys it took. Never throws. */
export function moveOldSaves(boardPrefix: string, store: KeyStore | null = local()): string[] {
  if (!store || !boardPrefix.startsWith(OLD) || boardPrefix === OLD) return [];
  try {
    const old: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && OLD_KEY.test(k)) old.push(k);
    }
    for (const k of old) {
      const name = k.slice(OLD.length);
      const value = store.getItem(k);
      if (!DROP.has(name) && value !== null) store.setItem(boardPrefix + name, value);
      store.removeItem(k);
    }
    return old;
  } catch {
    return [];
  }
}
