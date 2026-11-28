/** The `meta` block of board-model.json: Welsh strings awaiting review, rows to check, the hash. */
import { createHash } from "node:crypto";
import type { BoardModel } from "../../src/board/engine/types";

type Sectioned = Omit<BoardModel, "meta">;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** `section:id` for every entry (or the section itself) that holds a Welsh draft flagged for review. */
export function cyReviewPaths(model: Sectioned): string[] {
  const out = new Set<string>();
  const has = (v: unknown): boolean => (Array.isArray(v) ? v.some(has) : isObj(v) ? v.cy_review === true || Object.values(v).some(has) : false);
  for (const [section, value] of Object.entries(model)) {
    if (Array.isArray(value)) value.forEach((x, i) => { if (has(x)) out.add(`${section}:${isObj(x) && typeof x.id === "string" ? x.id : i}`); });
    else if (isObj(value)) {
      for (const [k, x] of Object.entries(value)) if (has(x)) out.add(`${section}:${k}`);
    }
  }
  return [...out].sort();
}

/** A short stable hash of the model content (everything except `meta`), for saves and run codes. */
export function contentHash(model: Sectioned): string {
  return createHash("sha256").update(JSON.stringify(model)).digest("hex").slice(0, 12);
}
