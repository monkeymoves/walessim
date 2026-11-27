// Every copy key the game, place and end screens use must exist in English and in Welsh
// (plural keys in their "one" and "other" forms), and no copy may carry an em or en dash.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GRADE_ORDER } from "../../engine/api";

const root = join(__dirname, "..", "..", "..");
const load = (lang: string, ns: string) => JSON.parse(readFileSync(join(root, "model", "i18n", lang, `${ns}.json`), "utf8")) as Record<string, unknown>;
const dict = (lang: string) => {
  const out = new Set<string>();
  for (const f of readdirSync(join(root, "model", "i18n", lang))) {
    const ns = f.replace(/\.json$/, "");
    for (const k of Object.keys(load(lang, ns))) if (!k.startsWith("_")) out.add(`${ns}.${k}`);
  }
  return out;
};

function sources(): string[] {
  const dirs = ["game", "place", "end", "parts"].map((d) => join(root, "src", "ui", d));
  const files: string[] = [];
  for (const d of dirs) for (const f of readdirSync(d, { recursive: true }) as string[]) if (/\.tsx?$/.test(f) && !f.endsWith(".test.ts")) files.push(join(d, f));
  return files;
}

describe("copy keys for Yfory", () => {
  const en = dict("en");
  const cy = dict("cy");
  const used = new Map<string, "t" | "tn">();
  for (const f of sources()) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/\b(tn?|tw)\(\s*"((?:game|place|parts|play)\.[\w.]+)"/g)) used.set(m[2]!, m[1] === "tn" ? "tn" : "t");
  }

  it("finds the keys in the source", () => {
    expect(used.size).toBeGreaterThan(150);
  });

  for (const [lang, d] of [["en", en], ["cy", cy]] as const) {
    it(`has every key in ${lang}`, () => {
      const missing = [...used].filter(([k, kind]) => (kind === "tn" ? !(d.has(`${k}.one`) && d.has(`${k}.other`)) : !d.has(k)));
      expect(missing.map(([k]) => k)).toEqual([]);
    });
  }

  it("has a word for every grade in both languages, very well included", () => {
    for (const g of GRADE_ORDER) for (const d of [en, cy]) expect(d.has(`game.grade.${g}`), g).toBe(true);
  });

  it("never uses an em or en dash in game, place or play copy", () => {
    for (const lang of ["en", "cy"]) for (const ns of ["game", "place", "play"]) {
      const bad = Object.entries(load(lang, ns)).filter(([, v]) => typeof v === "string" && /[\u2013\u2014]/.test(v));
      expect(bad).toEqual([]);
    }
  });
});

describe("play strings (plain-wales)", () => {
  const en = load("en", "play");
  const cy = load("cy", "play");
  it("has the same keys in English and Welsh, and the Welsh is marked for review", () => {
    const keys = (o: Record<string, unknown>) => Object.keys(o).filter((k) => !k.startsWith("_")).sort();
    expect(keys(cy)).toEqual(keys(en));
    expect(cy["_cy_review"]).toBe(true);
  });
  it("keeps the same {slots} in both languages", () => {
    const slots = (v: unknown) => [...String(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of Object.keys(en)) if (!k.startsWith("_")) expect(slots(cy[k]), k).toEqual(slots(en[k]));
  });
  it("adds no key that another string file already has", () => {
    for (const lang of ["en", "cy"]) {
      const mine = Object.keys(load(lang, "play")).filter((k) => !k.startsWith("_")).map((k) => `play.${k}`);
      const others = new Set<string>();
      for (const f of readdirSync(join(root, "model", "i18n", lang))) {
        const ns = f.replace(/\.json$/, "");
        if (ns === "play") continue;
        for (const k of Object.keys(load(lang, ns))) others.add(`${ns}.${k}`);
      }
      expect(mine.filter((k) => others.has(k))).toEqual([]);
    }
  });
  it("never runs an English sentence past 18 words", () => {
    const long: string[] = [];
    for (const [k, v] of Object.entries(en)) {
      if (k.startsWith("_") || typeof v !== "string") continue;
      for (const sentence of v.split(/(?<=[.?!])\s+/)) if (sentence.split(/\s+/).filter(Boolean).length > 18) long.push(k);
    }
    expect(long).toEqual([]);
  });
});
