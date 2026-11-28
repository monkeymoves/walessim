// The plain words rule (docs/design/plain-wales.md, section 1.3). Every string the player reads, in
// English and in Welsh, avoids the game's old made-up words, keeps sentences short, and never uses an
// em dash or an en dash. Letters and voices are people talking, so they are exempt from the word list
// but not from the length and dash rules.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const model = join(root, "model");

/** Words the player must never read, in English (section 1.3). */
const BANNED_EN: RegExp[] = [
  /\bpips?\b/i,
  /\bthreads?\b/i,
  /\bstitch(es|ed|ing)?\b/i,
  /\bunpick(s|ed|ing)?\b/i,
  /\bstrands?\b/i,
  /\byarn\b/i,
  /\bfray(s|ed|ing)?\b/i,
  /\bripples?\b/i,
  /\bcurveballs?\b/i,
  /\bhorizon scan/i,
  /\bcontingency\b/i,
  /\bledgers?\b/i,
  /\bstanding tickets?\b/i,
  /\bcaretakers?\b/i,
  /\bbenches\b/i,
  /\blens(es)?\b/i,
  /\bmint(s|ed|ing)?\b/i,
  /\bliabilit(y|ies)\b/i,
  /\bcompacts?\b/i,
  /\bheartlands?\b/i,
  /\babsorb(s|ed|ing)?\b/i,
  /\badequately\b/i,
  /\bexposure\b/i,
  /\blifelines?\b/i,
  /\bsharp\b/i,
  /\bfuzzy\b/i,
  /\bseeds?\b/i,
  /\barchetypes?\b/i,
  /\bin the post\b/i,
  /\bruns in 10\b/i,
];

/** The same old words as the Welsh copy had them, with their mutated forms (draft list, for review). */
const BANNED_CY: RegExp[] = [
  /\b(pip|bip|mhip|phip)(iau)?\b/i,
  /\b(edau|edafedd|edefyn|hedefyn)\b/i,
  /\b(pwyth|bwyth|mhwyth|phwyth)\w*/i,
  /\b(g|ng|)ofalwr\b/i,
  /\b(pelen|belen|peli) (g|ng|)romlin\b/i,
  /\b(crych|grych|nghrych|chrych)(don)?\b/i,
  /\bsgan gorwelion\b/i,
  /\bllyfr cyfrifon\b/i,
  /\b(m|f)einciau\b/i,
  /\b(c|g|ngh|ch)ompact\b/i,
  /\b(c|g|ngh|ch)adarnle(oedd)?\b/i,
  /\bniwlog\b/i,
  /\bwrth gefn\b/i,
  /\bamsugno\b/i,
  /\bddigonol\b/i,
  /\bhedyn\b/i,
  /\bpendant\b/i,
];

const MAX_WORDS = 18;
const DASH = /[\u2013\u2014]/;

type Entry = { where: string; lang: "en" | "cy"; text: string };

function i18nEntries(): Entry[] {
  const out: Entry[] = [];
  for (const lang of ["en", "cy"] as const) {
    const dir = join(model, "i18n", lang);
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const d = JSON.parse(readFileSync(join(dir, f), "utf8")) as Record<string, unknown>;
      for (const [k, v] of Object.entries(d)) if (!k.startsWith("_") && typeof v === "string") out.push({ where: `${lang}/${f} ${k}`, lang, text: v });
    }
  }
  return out;
}

/** Every {en, cy} text object anywhere in a YAML file. */
function yamlEntries(file: string): Entry[] {
  const out: Entry[] = [];
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) node.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (node && typeof node === "object") {
      const o = node as Record<string, unknown>;
      if (typeof o.en === "string") {
        out.push({ where: `${file} ${path}`, lang: "en", text: o.en });
        if (typeof o.cy === "string") out.push({ where: `${file} ${path}`, lang: "cy", text: o.cy });
        return;
      }
      for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(yaml.load(readFileSync(join(model, file), "utf8")), "");
  return out;
}

const placeFiles = readdirSync(join(model, "places")).filter((f) => f.endsWith(".yaml")).map((f) => `places/${f}`);

/**
 * The board (docs/design/v2-board.md): every YAML file under model/board, at any depth, relative to
 * model/. Its i18n strings (model/i18n/{en,cy}/board.json) are already read by i18nEntries().
 * board/letters.yaml is people talking, so it joins the speech list.
 */
function boardFiles(dir = join(model, "board"), rel = "board"): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? boardFiles(join(dir, d.name), `${rel}/${d.name}`) : d.name.endsWith(".yaml") ? [`${rel}/${d.name}`] : []);
  } catch {
    return [];
  }
}
const BOARD_SPEECH = "board/letters.yaml";
const boardCopy = boardFiles().filter((f) => f !== BOARD_SPEECH);
const boardSpeech = boardFiles().filter((f) => f === BOARD_SPEECH);

/** Player-facing copy: the word list, length and dash rules all apply. */
const copy: Entry[] = [...i18nEntries(), ...["cards.yaml", "curveballs.yaml", "game.yaml", "strands.yaml", ...placeFiles, ...boardCopy].flatMap(yamlEntries)];
/** People talking: length and dash rules only. */
const speech: Entry[] = ["letters.yaml", "voices.yaml", ...boardSpeech].flatMap(yamlEntries);

const noSlots = (s: string) => s.replace(/\{[a-z_]+\}/g, "X");

function banned(e: Entry): string | undefined {
  const s = noSlots(e.text);
  const hit = (e.lang === "en" ? BANNED_EN : BANNED_CY).find((re) => re.test(s));
  return hit ? `${e.where}: "${s.match(hit)![0]}" in "${e.text}"` : undefined;
}

/** Sentences end at . ! or ? followed by a space. A slot counts as one word. */
function longSentence(e: Entry): string | undefined {
  for (const sentence of noSlots(e.text).split(/(?<=[.!?])\s+/)) {
    const words = sentence.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
    if (words.length > MAX_WORDS) return `${e.where}: ${words.length} words in "${sentence}"`;
  }
  return undefined;
}

describe("plain words in every player string", () => {
  it("finds the copy", () => {
    expect(copy.length).toBeGreaterThan(1000);
    expect(speech.length).toBeGreaterThan(100);
  });

  it("reads the board's words: board.json in both languages and the model/board files", () => {
    for (const lang of ["en", "cy"] as const) expect(copy.some((e) => e.where.startsWith(`${lang}/board.json `)), `${lang}/board.json`).toBe(true);
    expect(boardCopy).toContain("board/projects.yaml");
    expect(boardSpeech).toEqual([BOARD_SPEECH]);
  });

  it("uses none of the retired words in English", () => {
    expect(copy.filter((e) => e.lang === "en").map(banned).filter(Boolean)).toEqual([]);
  });

  it("uses none of the retired words in Welsh", () => {
    expect(copy.filter((e) => e.lang === "cy").map(banned).filter(Boolean)).toEqual([]);
  });

  it(`keeps every sentence to ${MAX_WORDS} words or fewer`, () => {
    expect([...copy, ...speech].map(longSentence).filter(Boolean)).toEqual([]);
  });

  it("never uses an em dash or an en dash", () => {
    expect([...copy, ...speech].filter((e) => DASH.test(e.text)).map((e) => e.where)).toEqual([]);
  });
});
