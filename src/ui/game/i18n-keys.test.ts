// Every copy key the game, place and end screens use must exist in English and in Welsh
// (plural keys in their "one" and "other" forms), and no copy may carry an em or en dash.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
  const dirs = ["game", "place", "end"].map((d) => join(root, "src", "ui", d));
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
    for (const m of src.matchAll(/\b(tn?)\(\s*"((?:game|place|parts)\.[\w.]+)"/g)) used.set(m[2]!, m[1] as "t" | "tn");
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

  it("never uses an em or en dash in game or place copy", () => {
    for (const lang of ["en", "cy"]) for (const ns of ["game", "place"]) {
      const bad = Object.entries(load(lang, ns)).filter(([, v]) => typeof v === "string" && /[\u2013\u2014]/.test(v));
      expect(bad).toEqual([]);
    }
  });
});
