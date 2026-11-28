/**
 * The language lookup for the board screens: src/i18n with one difference. In Cymraeg, a board
 * sentence's `{slots}` are filled by the Welsh grammar in cymraeg.ts, so a council, town or season
 * takes the mutation the word before it asks for ("yng Nghasnewydd", "i Gaerffili", "o'r haf")
 * (playtest 8, must-fix 19). Board screens import `t` and `tn` from here, never from src/i18n.
 */
import { hasKey, lang, t as tPlain, tIn } from "../../i18n";
import { fillCy, isBoardKey } from "./cymraeg";
import { namesFrom, withArticles } from "./english";

const WITH_THE = "boardui.grammar.withThe";

export * from "../../i18n";

/**
 * `t()` with Welsh mutation of board slot values, and in English "the" before a place name that
 * takes it (english.ts). Keys outside the board are filled as they are.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  if (!vars || !isBoardKey(key)) return tPlain(key, vars);
  if (lang() !== "cy") return withArticles(tPlain(key, vars), namesFrom(tIn("en", WITH_THE), WITH_THE));
  const cy = tIn("cy", key);
  // a key with no Welsh yet falls back to English, which must not be mutated
  if (cy === tIn("en", key)) return tPlain(key, vars);
  return fillCy(cy, vars);
}

/** Fill a model sentence's `{slots}` in English, with "the" before a place name that takes it. */
export function fillEn(text: string, vars: Record<string, string>): string {
  return withArticles(text.replace(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all), namesFrom(tIn("en", WITH_THE), WITH_THE));
}

/**
 * Plural lookup, as src/i18n `tn`: "<key>.<rule>" by the plural rules of the active language
 * (Welsh has zero, one, two, few, many, other), falling back to "<key>.other". `{n}` is the number.
 */
export function tn(key: string, n: number, vars?: Record<string, string | number>): string {
  const rule = new Intl.PluralRules(lang() === "cy" ? "cy" : "en").select(n);
  const k = hasKey(`${key}.${rule}`) ? `${key}.${rule}` : `${key}.other`;
  return t(k, { n, ...vars });
}
