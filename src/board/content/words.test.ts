/**
 * The engine's words (model/i18n/{en,cy}/board.json), package 10: the same keys and slots in
 * English and Welsh, the Welsh flagged for review, and a sentence for every Say key the engine
 * can emit. A literal `"board.<key>"` in an engine file must exist; keys the engine builds from a
 * kind are listed here by family.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STOP_KINDS } from "../engine/types";
import { boardWords, root, slots } from "./load";

const en = boardWords("en");
const cy = boardWords("cy");
const keys = (d: Record<string, unknown>) => Object.keys(d).filter((k) => !k.startsWith("_")).sort();

/** Every literal board.<key> in the engine's source (tests left out). */
function literalKeys(): string[] {
  const dir = join(root, "src", "board", "engine");
  const out = new Set<string>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts") && !x.endsWith(".test.ts"))) {
    for (const m of readFileSync(join(dir, f), "utf8").matchAll(/"board\.([a-z_]+(?:\.[a-zA-Z0-9_]+)*)"/g)) out.add(m[1]!);
  }
  return [...out].sort();
}

/** Keys the engine builds from a kind (template strings). */
const FAMILIES: string[] = [
  ...STOP_KINDS.map((k) => `stop.${k}`),
  ...["up", "down"].map((d) => `mood.measure.${d}`),
  ...["weather", "economy", "prices"].map((t) => `forecast.future.leaning.${t}`),
  ...["strong_win", "win", "lost"].flatMap((r) => [`election.${r}`, `election.${r}.projected`]),
  ...["project", "pair", "event", "response", "law", "visit", "start", "election", "people", "budget", "drift", "momentum", "deal"].map((c) => `cause.${c}`),
  ...["poorly", "adequately", "well", "very_well"].map((g) => `grade.${g}`),
  ...["rising", "slipping", "region"].map((s) => `stop.tipping.${s}`),
];

describe("board.json, the engine's words (package 10)", () => {
  it("has the same keys and slots in English and Welsh, and the Welsh is flagged for review", () => {
    expect(keys(cy)).toEqual(keys(en));
    expect(cy._cy_review).toBe(true);
    for (const k of keys(en)) expect(slots(String(cy[k])), k).toEqual(slots(String(en[k])));
  });

  it("has a sentence for every literal key the engine says", () => {
    const found = literalKeys();
    expect(found.length).toBeGreaterThan(10);
    expect(found.filter((k) => !(k in en))).toEqual([]);
  });

  it("has a sentence for every key the engine builds from a kind", () => {
    expect(FAMILIES.filter((k) => !(k in en))).toEqual([]);
  });

  it("fills the election count from the slots the engine sends", () => {
    expect(slots(String(en["election.count"]))).toEqual(["backers", "councils", "people"]);
  });

  it("no longer speaks of turns or the weaker of two scores", () => {
    for (const k of keys(en)) {
      expect(String(en[k]), k).not.toMatch(/\b(this|next|a|each|per) turn\b/i);
      expect(String(en[k]), k).not.toMatch(/weaker (score|of these)/i);
    }
  });
});
