// Every boardend key the end screen, the place visits and the rule book's board section use exists
// in English and in Welsh (plural keys in their "one" and "other" forms), the Welsh file is a
// draft for review, the two files hold the same keys, and nothing carries an em or en dash.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..", "..");
const load = (lang: string) => JSON.parse(readFileSync(join(root, "model", "i18n", lang, "boardend.json"), "utf8")) as Record<string, unknown>;
const DIRS = [join(root, "src", "board", "ui", "end"), join(root, "src", "board", "ui", "place"), join(root, "src", "ui", "book", "board"), join(root, "src", "ui", "book")];
const PLURAL_EXTRA = /\.(zero|two|few|many)$/;

function used(): Map<string, "t" | "tn"> {
  const out = new Map<string, "t" | "tn">();
  for (const dir of DIRS) {
    for (const f of readdirSync(dir).filter((x) => /\.tsx?$/.test(x) && !x.endsWith(".test.ts"))) {
      const src = readFileSync(join(dir, f), "utf8");
      for (const m of src.matchAll(/\b(tn?)\(\s*"boardend\.([\w.-]+)"/g)) out.set(m[2]!, m[1] === "tn" ? "tn" : "t");
    }
  }
  return out;
}

describe("boardend copy", () => {
  const keys = used();
  const en = load("en");
  const cy = load("cy");

  it("finds the keys in the source", () => {
    expect(keys.size).toBeGreaterThan(120);
  });

  for (const [lang, d] of [["en", en], ["cy", cy]] as const) {
    it(`has every key in ${lang}`, () => {
      const missing = [...keys].filter(([k, kind]) => (kind === "tn" ? !(`${k}.one` in d && `${k}.other` in d) : !(k in d))).map(([k]) => k);
      expect(missing).toEqual([]);
    });
  }

  it("has the keys that are built from data (bands, grades, moments, themes, kinds)", () => {
    const need = [
      ...["much_worse", "little_worse", "same", "little_better", "much_better"].map((b) => `band.${b}`),
      ...["poorly", "adequately", "well", "very_well"].map((g) => `grade.${g}`),
      ...["tier_open", "keystone", "tipped", "region_turn", "election", "event", "promise", "deal", "people"].map((k) => `moment.${k}`),
      ...["spread", "budget", "people", "projects", "events", "score", "growth"].map((k) => `book.theme.${k}`),
      ...["linear", "saturating", "stock", "threshold", "spread", "requires"].map((k) => `book.kind.${k}`),
      ...["links", "projects", "events", "endings", "chapters"].flatMap((p) => [`book.${p}.title`, `book.${p}.blurb`]),
      ...["commute", "rail", "river"].map((k) => `book.links.${k}`),
      "rhondda.risk1", "rhondda.risk2", "rhondda.risk3", "chapter.holding-on",
      ...["ahead", "behind", "level"].flatMap((x) => [`verdict.nothing.${x}`, `verdict.start.${x}`]),
      ...["strong_win", "win", "lost"].map((r) => `record.result.${r}`),
    ];
    for (const d of [en, cy]) expect(need.filter((k) => !(k in d))).toEqual([]);
  });

  it("holds the same keys in both languages, and the Welsh is a draft for review", () => {
    const ek = Object.keys(en).filter((k) => !k.startsWith("_"));
    const ck = Object.keys(cy).filter((k) => !k.startsWith("_"));
    expect(ek.filter((k) => !ck.includes(k))).toEqual([]);
    expect(ck.filter((k) => !ek.includes(k) && !PLURAL_EXTRA.test(k))).toEqual([]);
    expect(cy["_cy_review"]).toBe(true);
  });

  it("uses no em or en dash", () => {
    const dash = new RegExp("[\\u2013\\u2014]");
    for (const d of [en, cy]) for (const v of Object.values(d)) if (typeof v === "string") expect(v).not.toMatch(dash);
  });
});
