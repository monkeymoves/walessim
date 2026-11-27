// Small Welsh grammar helpers for names dropped into sentences (draft rules, for the fluent
// reviewer): soft and aspirate mutation of an initial consonant, the article before "Mae" and
// after "i", and "a" or "ac" in lists. English passes names through unchanged.
const SOFT: [RegExp, string][] = [
  [/^Ll/, "L"], [/^Rh/, "R"], [/^P/, "B"], [/^T(?!h)/, "D"], [/^C(?!h)/, "G"], [/^B/, "F"], [/^D(?!d)/, "Dd"], [/^G/, ""], [/^M/, "F"],
];
const ASP: [RegExp, string][] = [[/^P(?!h)/, "Ph"], [/^T(?!h)/, "Th"], [/^C(?!h)/, "Ch"]];

function apply(rules: [RegExp, string][], word: string): string {
  for (const [re, to] of rules) {
    if (re.test(word)) {
      const out = word.replace(re, to);
      return to === "" ? out.charAt(0).toUpperCase() + out.slice(1) : out;
    }
  }
  return word;
}

/** Soft mutation (after "i", "o", "yn" with nouns). */
export const soft = (w: string): string => apply(SOFT, w);
/** Soft mutation as after predicative "yn": not for Ll and Rh. */
export const softYn = (w: string): string => (/^(Ll|Rh)/.test(w) ? w : apply(SOFT, w));
/** Aspirate mutation (after "a" meaning "and"). */
export const aspirate = (w: string): string => apply(ASP, w);

const ARTICLE = /^Yr? /;

/** "Mae’r Rhondda" for "Y Rhondda", else "Mae Bethesda". */
export function maePlace(name: string): string {
  return ARTICLE.test(name) ? `Mae’r ${name.replace(ARTICLE, "")}` : `Mae ${name}`;
}
/** "i’r Rhondda" for "Y Rhondda", else "i Fethesda". */
export function iPlace(name: string): string {
  return ARTICLE.test(name) ? `i’r ${name.replace(ARTICLE, "")}` : `i ${soft(name)}`;
}
/** "a" or "ac", and the aspirate mutation, before the last item of a Welsh list. */
export function andCy(b: string): string {
  return /^[AEIOUWYÂÊÎÔÛŴŶaeiouwy]/.test(b) ? `ac ${b}` : `a ${aspirate(b)}`;
}

const NASAL: [RegExp, string, string][] = [
  [/^C(?!h)/, "yng", "Ngh"], [/^P(?!h)/, "ym", "Mh"], [/^T(?!h)/, "yn", "Nh"], [/^G/, "yng", "Ng"], [/^B/, "ym", "M"], [/^D(?!d)/, "yn", "N"],
];
/** "yn" before a name, with the nasal mutation: "yng Ngogledd Cymru", "ym Mhowys". */
export function ynPlace(name: string): string {
  for (const [re, yn, to] of NASAL) if (re.test(name)) return `${yn} ${name.replace(re, to)}`;
  return `yn ${name}`;
}

/** English: a place name mid-sentence, "the Rhondda" rather than "The Rhondda". */
export const midEn = (name: string): string => name.replace(/^The /, "the ");
