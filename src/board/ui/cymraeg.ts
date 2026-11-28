/**
 * Welsh grammar for the board's slot sentences (playtest 8, must-fix 19: "yn Casnewydd",
 * "i Caerffili", "o yr haf", "bod yn Y gambl"). Every Welsh board sentence with a `{slot}` is filled
 * here, so a name dropped after a preposition takes its mutation and the article joins the word
 * before it. Draft rules for the fluent reviewer; English is never touched.
 *
 * - After i, o, am, ar, at, dan, dros, drwy, trwy, gan, heb, hyd, wrth, neu, mor, rhy, ail, dau, dwy:
 *   the soft mutation ("i Gaerffili", "o Gasnewydd").
 * - After "yn" before a place: the nasal mutation, and "yn" becomes "yng" or "ym"
 *   ("yng Nghasnewydd", "ym Mlaenau Gwent", "ym Merthyr Tudful"). Before a describing word
 *   (the slots in PREDICATE): the soft mutation, but not of Ll or Rh ("yn dda").
 * - After a, â, gyda, tua, na: the aspirate mutation ("a Chaerdydd"); "a" and "â" before a vowel
 *   are "ac" and "ag".
 * - A value that opens with the article (Y, Yr) joins a word that ends in a vowel ("o'r haf",
 *   "i'r Barri", "Mae'r Gymraeg", "codi'r Gymraeg", "i godi'r Gymraeg"), and is lower case in the
 *   middle of a sentence ("bod yn y gambl").
 * - A project's name that opens with a verb-noun is lower case in the middle of a sentence:
 *   "Byddai cefnogi cwmnïau lleol yno", never "Byddai Cefnogi cwmnïau lleol" (playtest 10, S10).
 *   A name that opens with a noun keeps its capital, which marks it as a name ("Mae Iechyd yn agos
 *   at adref yn gweithio"). cymraeg.test.ts makes every project's first word one or the other.
 * - A group of people is lower case in the middle of a sentence ("Mae pawb yma'n anesmwyth"),
 *   and "'n" softens a describing word as "yn" does ("yma'n fodlon").
 * - A town known in English by an English form is written in its Welsh form first, so it can take
 *   its mutation: Pill is Pil, "ym Mhil" (playtest 10, S10).
 */

const SOFT = new Set(["am", "ar", "at", "dan", "dros", "drwy", "trwy", "gan", "heb", "hyd", "i", "o", "wrth", "neu", "mor", "rhy", "ail", "dau", "dwy"]);
const ASPIRATE = new Set(["a", "â", "gyda", "tua", "na"]);
/** Words after which the article is written onto the word: "i'r", "o'r", "Mae'r", "codi'r". */
const ELIDE = new Set(["i", "o", "a", "â", "gyda", "tua", "na", "mae", "yw", "ydy", "drwy", "trwy", "dyma", "dyna", "wedi", "codi", "godi", "cefnogi", "gefnogi"]);
/** Slots that describe rather than place: "aeth yn {grade}", "yn {mood}". */
const PREDICATE = new Set(["grade", "mood", "step"]);
/** Names used in Welsh in their English form, which do not mutate. */
const KEEP = new Set(["Grangetown"]);
/** Towns the shared model names in an English form, with the Welsh form a Welsh sentence uses. */
const WELSH_FORM: Record<string, string> = { Pill: "Pil" };
/** Slots that hold a common noun, lower case in the middle of a sentence: "Mae pawb yma'n anesmwyth". */
const COMMON_SLOTS = new Set(["group"]);
/** Slots that hold a project's name. */
const NAME_SLOTS = new Set(["project", "keystone", "legacy"]);
/** Verb-nouns a project's name can open with ("Cefnogi cwmnïau lleol", "Arafu'r dŵr"). */
export const VERB_FIRST = new Set(["cefnogi", "denu", "gwneud", "arafu", "rhoi", "cynhesu", "talu", "codi", "adeiladu", "gwella",
  "diogelu", "plannu", "agor", "troi", "creu", "cadw", "helpu", "hyfforddi", "trwsio", "glanhau", "dal", "symud", "dod"]);
/** The first word of a name, without a joined article: "Arafu'r dŵr" gives "arafu". */
export const firstWord = (name: string): string => (name.split(/\s/)[0] ?? "").replace(/'r$/, "").toLowerCase();

const VOWEL = /^[aeiouwyâêîôûŵŷ]/i;
const keepCase = (orig: string, out: string): string => (orig[0] && orig[0] !== orig[0].toLowerCase() ? out.charAt(0).toUpperCase() + out.slice(1) : out);
const kept = (w: string): boolean => KEEP.has(w.split(/[\s,.]/)[0] ?? "") || /^\d/.test(w);

/** The soft mutation of a word's first letter: Caerdydd to Gaerdydd, Blaenau to Flaenau, Rhondda to Rondda. */
export function soft(w: string): string {
  if (kept(w)) return w;
  const l = w.toLowerCase();
  if (l.startsWith("ll")) return keepCase(w, "l" + w.slice(2));
  if (l.startsWith("rh")) return keepCase(w, "r" + w.slice(2));
  if (/^(dd|ch|ph|th|ng)/.test(l)) return w;
  if (l[0] === "g") return keepCase(w, w.slice(1));
  const to = ({ p: "b", t: "d", c: "g", b: "f", d: "dd", m: "f" } as Record<string, string>)[l[0] ?? ""];
  return to ? keepCase(w, to + w.slice(1)) : w;
}

/** The aspirate mutation: Caerdydd to Chaerdydd, Tor-faen to Thor-faen. */
export function aspirate(w: string): string {
  if (kept(w)) return w;
  const l = w.toLowerCase();
  if (/^(ch|ph|th)/.test(l)) return w;
  const to = ({ p: "ph", t: "th", c: "ch" } as Record<string, string>)[l[0] ?? ""];
  return to ? keepCase(w, to + w.slice(1)) : w;
}

/** "yn" before a place, with the nasal mutation: "yng Nghaerdydd", "ym Mhowys", "ym Merthyr", "yn Abertawe". */
export function ynPlace(w: string): { yn: string; word: string } {
  if (kept(w)) return { yn: "yn", word: w };
  const l = w.toLowerCase();
  if (/^(ch|ph|th|dd|ll|rh|ng)/.test(l)) return { yn: "yn", word: w };
  const rules: Record<string, [string, string]> = { c: ["yng", "ngh"], p: ["ym", "mh"], t: ["yn", "nh"], g: ["yng", "ng"], b: ["ym", "m"], d: ["yn", "n"] };
  const r = rules[l[0] ?? ""];
  if (r) return { yn: r[0], word: keepCase(w, r[1] + w.slice(1)) };
  if (l[0] === "m") return { yn: "ym", word: w };
  return { yn: "yn", word: w };
}

/** "a" or "ac", and the aspirate, before the last name of a Welsh list: "Casnewydd a Chaerffili", "... ac Abertawe". */
export function andLast(w: string): string {
  return VOWEL.test(w) ? `ac ${w}` : `a ${aspirate(w)}`;
}

/** A Welsh list: "A, B a C", with the aspirate after "a" and "ac" before a vowel. */
export function listCy(items: string[], or = false): string {
  if (items.length < 2) return items.join("");
  const last = items[items.length - 1]!;
  return `${items.slice(0, -1).join(", ")} ${or ? `neu ${soft(last)}` : andLast(last)}`;
}

const ARTICLE = /^(Y|Yr|y|yr) (.+)$/s;
const LETTERS = /[a-zâêîôûŵŷ']+$/i;

/**
 * Fill a Welsh sentence's `{slots}` with Welsh words, mutating each value by the word before it.
 * Numbers, unknown slots and values glued to punctuation are left as they are.
 */
export function fillCy(s: string, vars: Record<string, string | number>): string {
  return numberWords(fillSlots(s, vars));
}

function fillSlots(s: string, vars: Record<string, string | number>): string {
  // the word before may not hold a slot of its own ("{council}: {measure}" fills both)
  return s.replace(/([^\s{}]*)(\s*)\{(\w+)\}/g, (all, before: string, space: string, key: string) => {
    if (!(key in vars)) return all;
    let v = String(vars[key]);
    // the first word only: a town slot can carry its council too ("Pill, yng Nghasnewydd")
    v = v.replace(/^[^\s,.]+/, (w) => WELSH_FORM[w] ?? w);
    // the word before, only when the slot follows it directly ("Rhybudd: {name}" has none)
    const prev = space ? (LETTERS.exec(before)?.[0] ?? "").toLowerCase() : "";
    const atStart = !before || /[.!?:]$/.test(before);
    if (!v || /^\d/.test(v) || (!prev && !ARTICLE.test(v))) return `${before}${space}${v}`;
    // "afon {river}" with a river named "Afon Lwyd": one "afon", not two
    if (prev === "afon" && /^afon /i.test(v)) return `${before.slice(0, -4)}${v}`;
    const art = ARTICLE.exec(v);
    if (art) {
      const rest = art[2]!;
      if (prev && ELIDE.has(prev.replace(/^.*'/, ""))) return `${before}'r ${rest}`;
      return `${before}${space}${atStart ? v : `${art[1]!.toLowerCase()} ${rest}`}`;
    }
    if (!atStart && (COMMON_SLOTS.has(key) || (NAME_SLOTS.has(key) && VERB_FIRST.has(firstWord(v))))) v = v.charAt(0).toLowerCase() + v.slice(1);
    // "yma'n {mood}": the 'n is yn, and softens a describing word ("yma'n fodlon")
    if (prev.endsWith("'n") && PREDICATE.has(key)) return `${before}${space}${/^(ll|rh)/i.test(v) ? v : soft(v)}`;
    if (prev === "yn") {
      if (PREDICATE.has(key)) return `${before}${space}${/^(ll|rh)/i.test(v) ? v : soft(v)}`;
      const p = ynPlace(v);
      const yn = before.replace(/yn$/i, (x) => (x[0] === "Y" ? p.yn.charAt(0).toUpperCase() + p.yn.slice(1) : p.yn));
      return `${yn}${space}${p.word}`;
    }
    if ((prev === "a" || prev === "â" || prev === "na") && VOWEL.test(v)) {
      const joined = before.replace(/(a|â|na)$/i, (x) => ({ a: "ac", A: "Ac", "â": "ag", "Â": "Ag", na: "nag", Na: "Nag" } as Record<string, string>)[x] ?? x);
      return `${joined}${space}${v}`;
    }
    if (SOFT.has(prev)) v = soft(v);
    else if (ASPIRATE.has(prev)) v = aspirate(v);
    return `${before}${space}${v}`;
  });
}

/** "blynedd" after a number: 1 flwyddyn, 2 flynedd, 3 blynedd, 5 mlynedd; "o flynyddoedd" after a part. */
export function yearsAfter(n: string): string {
  if (!/^\d+$/.test(n)) return "o flynyddoedd";
  const k = Number(n);
  if (k === 1) return "flwyddyn";
  if (k === 2) return "flynedd";
  return [5, 7, 8, 9, 10, 12, 15, 18, 20, 30, 40, 50, 60, 100].includes(k) ? "mlynedd" : "blynedd";
}

/**
 * Numbers written as figures still take their mutation: "1 flwyddyn", "8 mlynedd", "2 brosiect",
 * "2 gyngor" (two softens the word after it). Run on a filled Welsh sentence.
 */
export function numberWords(s: string): string {
  return s
    .replace(/(?<![\d.,])(\d+(?:\.\d+)?) blynedd\b/g, (_all, n: string) => `${n} ${yearsAfter(n)}`)
    .replace(/(?<![\d.,])2 ([a-zâêîôûŵŷ][\wâêîôûŵŷ'-]*)/g, (_all, w: string) => `2 ${soft(w)}`);
}

/** Is this an i18n key of the board (board, boardui, boardend, boardclock)? */
export const isBoardKey = (key: string): boolean => /^board(ui|end|clock)?\./.test(key);
