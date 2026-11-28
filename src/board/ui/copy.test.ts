// Every copy key the board screens use exists in English and in Welsh (plural keys in their "one"
// and "other" forms), the Welsh file is flagged for review, and no copy carries an em or en dash.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const load = (lang: string) => JSON.parse(readFileSync(join(root, "model", "i18n", lang, "boardui.json"), "utf8")) as Record<string, unknown>;

function used(): Map<string, "t" | "tn"> {
  const dir = join(__dirname);
  const files = (readdirSync(dir, { recursive: true }) as string[]).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts")).map((f) => join(dir, f));
  files.push(join(root, "src", "ui", "shell", "TitleScreen.tsx"));
  const out = new Map<string, "t" | "tn">();
  for (const f of files) {
    for (const m of readFileSync(f, "utf8").matchAll(/\b(tn?)\(\s*"boardui\.([\w.]+)"/g)) out.set(m[2]!, m[1] === "tn" ? "tn" : "t");
  }
  return out;
}

const DASH = new RegExp("[\\u2013\\u2014]");

describe("board screen copy", () => {
  const keys = used();
  const en = load("en");
  const cy = load("cy");

  it("finds the keys in the source", () => {
    expect(keys.size).toBeGreaterThan(150);
  });

  for (const [lang, d] of [["en", en], ["cy", cy]] as const) {
    it(`has every key in ${lang}`, () => {
      const missing = [...keys].filter(([k, kind]) => (kind === "tn" ? !(`${k}.one` in d && `${k}.other` in d) : !(k in d))).map(([k]) => k);
      expect(missing).toEqual([]);
    });
  }

  it("has the same keys in both languages, and the Welsh is a draft for review", () => {
    const ek = Object.keys(en).filter((k) => !k.startsWith("_"));
    const ck = new Set(Object.keys(cy).filter((k) => !k.startsWith("_")));
    expect(ek.filter((k) => !ck.has(k))).toEqual([]);
    expect(cy["_cy_review"]).toBe(true);
  });

  // keys built from a value at run time: every member of each family must exist in both languages
  const families: Record<string, readonly string[]> = {
    "season": ["summer", "autumn", "winter", "spring"],
    "clock.speed": ["steady", "brisk", "fast"],
    "settings.stop": ["respond", "election", "ended", "warning", "keystone", "tier_open", "visit", "tipping", "chapter", "deal_due", "purse_full", "finished", "year"],
    "timeline.would": ["strong_win", "win", "lost"],
    "timeline.mark": ["promise", "deal", "keystone_last_start", "care_bill", "end"],
    "timeline.markShort": ["promise", "deal", "keystone_last_start", "care_bill", "end"],
    "election.short": ["strong_win", "win", "lost"],
    "election.result": ["strong_win", "win", "lost"],
    "council.momentum": ["rising", "slipping"],
    "momentum": ["rising", "slipping"],
    "stop.tipping": ["rising", "slipping"],
    "why.span": ["year", "term", "all"],
    ...Object.fromEntries(["election", "ended", "warning", "keystone", "tier_open", "visit", "tipping", "chapter", "deal_due", "purse_full", "finished", "year"].map((k) => [`stop.${k}`, ["title", "line"]])),
  };
  for (const [lang, d] of [["en", en], ["cy", cy]] as const) {
    it(`has every key built at run time in ${lang}`, () => {
      const missing = Object.entries(families).flatMap(([f, ms]) => ms.map((m) => `${f}.${m}`)).filter((k) => !(k in d));
      expect(missing).toEqual([]);
    });
  }

  it("uses no em or en dash", () => {
    for (const d of [en, cy]) for (const v of Object.values(d)) if (typeof v === "string") expect(v).not.toMatch(DASH);
  });
});
