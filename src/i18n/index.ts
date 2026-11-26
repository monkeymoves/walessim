// Language lookup. Strings live in model/i18n/<lang>/<area>.json; a key is "<area>.<key>",
// for example t("shell.nav.heddiw"). The active language is a Solid signal, so any JSX that
// calls t() updates when it changes. Welsh drafts (cy_review) are used as they are and listed
// quietly by cyReviewKeys() for a fluent reviewer; nothing on screen marks them.
import { createRoot, createSignal } from "solid-js";
import type { Text } from "../model/schema";

export type Lang = "en" | "cy";
export const LANGS: readonly Lang[] = ["en", "cy"];
const LANG_KEY = "etifeddiaeth.v1.lang";

type Entry = string | { text: string; cy_review?: boolean };
type FileShape = Record<string, Entry | boolean | string[] | Record<string, unknown>>;

const files = import.meta.glob<FileShape>("../../model/i18n/*/*.json", { eager: true, import: "default" });

const dict: Record<Lang, Map<string, string>> = { en: new Map(), cy: new Map() };
const review = new Set<string>();

for (const [path, data] of Object.entries(files)) {
  const m = /i18n\/(en|cy)\/([\w-]+)\.json$/.exec(path);
  if (!m) continue;
  const lang = m[1] as Lang;
  const area = m[2]!;
  const fileDraft = data["_cy_review"] === true;
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith("_")) continue;
    const key = `${area}.${k}`;
    if (typeof v === "string") {
      dict[lang].set(key, v);
      if (lang === "cy" && fileDraft) review.add(key);
    } else if (v && typeof v === "object" && "text" in v && typeof (v as { text: unknown }).text === "string") {
      const e = v as { text: string; cy_review?: boolean };
      dict[lang].set(key, e.text);
      if (lang === "cy" && (fileDraft || e.cy_review)) review.add(key);
    }
  }
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "cy") return saved;
  } catch { /* storage blocked */ }
  if (typeof navigator !== "undefined" && /^cy\b/i.test(navigator.language)) return "cy";
  return "en";
}

const store = createRoot(() => {
  const [lang, setLangSignal] = createSignal<Lang>(typeof window === "undefined" ? "en" : initialLang());
  return { lang, setLangSignal };
});

/** The active interface language. */
export const lang = store.lang;

/** The language that is not active. */
export const otherLang = (): Lang => (lang() === "en" ? "cy" : "en");

/** Switch the interface language: persists it and sets the document's lang. */
export function setLang(next: Lang): void {
  store.setLangSignal(next);
  try { localStorage.setItem(LANG_KEY, next); } catch { /* storage blocked */ }
  if (typeof document !== "undefined") document.documentElement.lang = next;
}

if (typeof document !== "undefined") document.documentElement.lang = lang();

const warned = new Set<string>();

/** Is there a string for this key in either language? */
export function hasKey(key: string): boolean {
  return dict.en.has(key) || dict.cy.has(key);
}

/** Look a key up in a given language, falling back to English, then to the key itself. */
export function tIn(l: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = dict[l].get(key) ?? dict.en.get(key);
  if (s == null) {
    if (!warned.has(key)) { warned.add(key); console.warn(`i18n: missing key ${key}`); }
    s = key;
  }
  return vars ? interpolate(s, vars) : s;
}

/** Look a key up in the active language. `{name}` slots are filled from `vars`. */
export function t(key: string, vars?: Record<string, string | number>): string {
  return tIn(lang(), key, vars);
}

/**
 * Plural lookup: picks "<key>.<rule>" by Intl plural rules for the active language
 * (Welsh has zero, one, two, few, many, other), falling back to "<key>.other".
 * `{n}` is filled with the number.
 */
export function tn(key: string, n: number, vars?: Record<string, string | number>): string {
  const l = lang();
  const rule = new Intl.PluralRules(l === "cy" ? "cy" : "en").select(n);
  const k = dict[l].has(`${key}.${rule}`) || dict.en.has(`${key}.${rule}`) ? `${key}.${rule}` : `${key}.other`;
  return tIn(l, k, { n, ...vars });
}

function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

/** Pick one language from a {en, cy} field or a plain string. */
export function pick(text: Text | string | null | undefined, l: Lang = lang()): string {
  if (text == null) return "";
  if (typeof text === "string") return text;
  return (l === "cy" ? text.cy : text.en) || text.en || text.cy || "";
}

/** Reactive accessor for a {en, cy} content field in the active language. */
export function useText(text: () => Text | string | null | undefined): () => string {
  return () => pick(text(), lang());
}

/** Both languages of an i18n key as a {en, cy} pair, for the bilingual pair. */
export function textOf(key: string, vars?: Record<string, string | number>): Text {
  return { en: tIn("en", key, vars), cy: tIn("cy", key, vars) };
}

/** Keys whose Welsh is a machine draft awaiting review. */
export function cyReviewKeys(): string[] {
  return [...review].sort();
}

/** Ordinal for ranks ("3rd" or "3ydd"). Welsh forms to be checked by a fluent reviewer. */
export function ordinal(n: number, l: Lang = lang()): string {
  if (l === "cy") {
    const cy: Record<number, string> = {
      1: "1af", 2: "2il", 3: "3ydd", 4: "4ydd", 5: "5ed", 6: "6ed", 7: "7fed", 8: "8fed", 9: "9fed", 10: "10fed",
      11: "11eg", 12: "12fed", 13: "13eg", 14: "14eg", 15: "15fed", 16: "16eg", 17: "17eg", 18: "18fed", 19: "19eg",
      20: "20fed", 21: "21ain", 22: "22ain",
    };
    return cy[n] ?? `${n}fed`;
  }
  const s = n % 100;
  if (s >= 11 && s <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** Number formatting in the active language (en-GB grouping for both: Welsh uses the same). */
export function formatNum(v: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-GB", opts).format(v);
}

export { Pair, OtherLine } from "./Pair";
