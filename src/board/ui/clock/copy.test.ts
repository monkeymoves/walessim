// Every boardclock key the board screens and the title use exists in English and in Welsh, the
// Welsh is flagged for review, families built at run time are whole, and no copy has a dash.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE_NOTES } from "./guide";

const root = join(__dirname, "..", "..", "..", "..");
const load = (lang: string) => JSON.parse(readFileSync(join(root, "model", "i18n", lang, "boardclock.json"), "utf8")) as Record<string, unknown>;

function used(): Set<string> {
  const dir = join(__dirname, "..");
  const files = (readdirSync(dir, { recursive: true }) as string[]).filter((f) => /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f)).map((f) => join(dir, f));
  files.push(join(root, "src", "ui", "shell", "TitleScreen.tsx"));
  const out = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/\bt\(\s*"boardclock\.([\w.]+)"/g)) out.add(m[1]!);
    // a counted key: its plural forms, "one" and the "other" every language falls back to
    for (const m of src.matchAll(/\btn\(\s*"boardclock\.([\w.]+)"/g)) { out.add(`${m[1]}.one`); out.add(`${m[1]}.other`); }
  }
  return out;
}

const families: Record<string, readonly string[]> = {
  why: ["stop", "answer", "hidden", "ended", "build", "tree", "laws", "settings", "why", "visit", "warning", "term"],
  head: ["up", "down", "same"],
  guide: GUIDE_NOTES,
  "income.why": ["budget", "rising", "earns", "running", "care", "weak"].flatMap((k) => [`${k}.up`, `${k}.down`]),
  "income.part": ["budget", "earns", "rising", "care", "weak"],
  card: ["runs", "runsLook", "paused", "step", "count", "all", "stayPaused", "runAfter"],
  runup: ["label", "title"],
};

describe("board clock copy", () => {
  const en = load("en");
  const cy = load("cy");
  const keys = used();

  it("finds the keys in the source", () => expect(keys.size).toBeGreaterThan(20));

  for (const [lang, d] of [["en", en], ["cy", cy]] as const) {
    it(`has every key in ${lang}`, () => {
      expect([...keys].filter((k) => !(k in d))).toEqual([]);
      const missing = Object.entries(families).flatMap(([f, ms]) => ms.map((m) => `${f}.${m}`)).filter((k) => !(k in d));
      expect(missing).toEqual([]);
    });
  }

  it("has the same keys in both languages, and the Welsh is a draft for review", () => {
    const ek = Object.keys(en).filter((k) => !k.startsWith("_")).sort();
    const ck = Object.keys(cy).filter((k) => !k.startsWith("_")).sort();
    expect(ck).toEqual(ek);
    expect(cy["_cy_review"]).toBe(true);
  });

  it("has no em or en dash", () => {
    const dash = new RegExp("[\\u2013\\u2014]");
    for (const d of [en, cy]) for (const v of Object.values(d)) if (typeof v === "string") expect(v).not.toMatch(dash);
  });
});
