/**
 * Filling {slots} in bilingual copy, with Welsh initial mutation and the article handled by the word
 * before the slot (playtest 1, item 6). English is filled as it is.
 *
 * - Soft mutation after: am, ar, at, dan, dros, drwy, trwy, gan, heb, hyd, i, o, wrth, dy, neu, pa,
 *   mor, rhy, ail, dau, dwy, and "yn" before something that is not a place.
 * - Nasal mutation after "yn" before a place, and after "fy".
 * - Aspirate mutation after: a, â, gyda, tua, na.
 * - A value starting with the article (Y, Yr) loses it after i, o, a, â, gyda, tua, na, mae, ac
 *   ("i'r Rhondda", "Mae'r Rhondda"), becomes "y" after "yn", and is lower case mid-sentence.
 */
import type { Text } from "../model/schema";

const SOFT = new Set(["am", "ar", "at", "dan", "dros", "drwy", "trwy", "gan", "heb", "hyd", "i", "o", "wrth", "dy", "neu", "pa", "mor", "rhy", "ail", "dau", "dwy"]);
const ASPIRATE = new Set(["a", "â", "gyda", "tua", "na"]);
const NASAL = new Set(["fy"]);
/** Words after which the article is elided onto the word ("i'r", "Mae'r"). */
const ELIDE = new Set(["i", "o", "a", "â", "gyda", "tua", "na", "mae", "ac"]);

const keepCase = (orig: string, out: string) => (orig[0] && orig[0] === orig[0].toUpperCase() ? out.charAt(0).toUpperCase() + out.slice(1) : out);

export function softMutate(w: string): string {
  const l = w.toLowerCase();
  if (/^(dd|ll|rh|ch|ph|th|ng)/.test(l)) {
    if (l.startsWith("ll")) return keepCase(w, "l" + w.slice(2));
    if (l.startsWith("rh")) return keepCase(w, "r" + w.slice(2));
    return w;
  }
  const map: Record<string, string> = { p: "b", t: "d", c: "g", b: "f", d: "dd", m: "f" };
  if (l[0] === "g") return keepCase(w, w.slice(1));
  const m = map[l[0] ?? ""];
  return m ? keepCase(w, m + w.slice(1)) : w;
}

export function nasalMutate(w: string): string {
  const l = w.toLowerCase();
  if (/^(dd|ll|rh|ch|ph|th|ng)/.test(l)) return w;
  const map: Record<string, string> = { p: "mh", t: "nh", c: "ngh", b: "m", d: "n", g: "ng" };
  const m = map[l[0] ?? ""];
  return m ? keepCase(w, m + w.slice(1)) : w;
}

export function aspirateMutate(w: string): string {
  const l = w.toLowerCase();
  if (/^(ch|ph|th)/.test(l)) return w;
  const map: Record<string, string> = { p: "ph", t: "th", c: "ch" };
  const m = map[l[0] ?? ""];
  return m ? keepCase(w, m + w.slice(1)) : w;
}

/** Fill a Welsh string's slots. `places` names the params that are places (for "yn" + nasal). */
function fillCy(s: string, values: Record<string, string>, places: Set<string>): string {
  return s.replace(/(\S*)(\s*)\{([a-z_]+)\}/g, (all, before: string, space: string, key: string) => {
    if (!(key in values)) return all;
    let v = values[key]!;
    const prev = before.toLowerCase().replace(/[^a-zâêîôûŵŷ']/g, "");
    const article = /^(Y|Yr|y|yr) /.exec(v);
    if (article) {
      const rest = v.slice(article[0].length);
      if (space && ELIDE.has(prev)) return `${before}'r ${rest}`;
      if (space && prev === "yn") return `${before}${space}${article[1]!.toLowerCase()} ${rest}`;
      // mid-sentence the article is lower case
      const atStart = !before || /[.!?]$/.test(before);
      return `${before}${space}${atStart ? v : article[1]!.toLowerCase() + " " + rest}`;
    }
    if (space && /^\D/.test(v)) {
      if (prev === "yn") v = places.has(key) ? nasalMutate(v) : /^(ll|rh)/i.test(v) ? v : softMutate(v);
      else if (SOFT.has(prev)) v = softMutate(v);
      else if (ASPIRATE.has(prev)) v = aspirateMutate(v);
      else if (NASAL.has(prev)) v = nasalMutate(v);
    }
    return `${before}${space}${v}`;
  });
}

export type SlotValue = string | number | Text;

/** Fill slots in both languages. Text values supply their own language; numbers and strings are used as they are. */
export function fill(t: Text, params: Record<string, SlotValue>, places: string[] = ["place"]): Text {
  const en: Record<string, string> = {};
  const cy: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "object") {
      en[k] = v.en;
      cy[k] = v.cy || v.en;
    } else en[k] = cy[k] = String(v);
  }
  const enOut = t.en.replace(/\{([a-z_]+)\}/g, (all, k: string) => (k in en ? en[k]! : all));
  const review = t.cy_review || Object.values(params).some((v) => typeof v === "object" && v.cy_review);
  return { en: enOut, cy: fillCy(t.cy, cy, new Set(places)), ...(review ? { cy_review: true } : {}) };
}

/** Join names as a list in each language: "A, B and C" / "A, B a C" (with the aspirate after "a"). */
export function joinNames(names: Text[]): Text {
  if (!names.length) return { en: "", cy: "" };
  const j = (xs: string[], and: string) => (xs.length === 1 ? xs[0]! : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);
  const cy = names.map((n) => n.cy || n.en);
  const lastCy = names.length > 1 ? aspirateMutate(cy[cy.length - 1]!) : cy[0]!;
  return { en: j(names.map((n) => n.en), "and"), cy: names.length > 1 ? `${cy.slice(0, -1).join(", ")} a ${lastCy}` : lastCy };
}

/**
 * For tests: "trigger Word" pairs where a capitalised word plainly did not mutate or lose its article.
 * Only initials that can never be a mutated form are flagged (P, T, C, M, Ll, Rh after a soft trigger;
 * P, T, C after an aspirate trigger; the article Y or Yr): G, B and D may already be mutations.
 */
export function unmutatedAfterTrigger(s: string): string[] {
  const out: string[] = [];
  const re = /(?:^|[\s(])(i|o|am|ar|at|dan|dros|drwy|gan|heb|wrth|a|gyda|tua)\s+([A-ZÂÊÎÔÛŴŶ][\wâêîôûŵŷ']*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const trig = m[1]!, word = m[2]!;
    if (/^(Y|Yr)$/.test(word)) out.push(`${trig} ${word}`);
    else if (ASPIRATE.has(trig) ? /^(P(?!h)|T(?!h)|C(?!h))/.test(word) : /^(P(?!h)|T(?!h)|C(?!h)|M|Ll|Rh)/.test(word)) out.push(`${trig} ${word}`);
  }
  return out;
}
