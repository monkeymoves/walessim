/**
 * English sentence grammar for board slot values: a place whose name takes the article reads "in
 * the Vale of Glamorgan", and "The Vale of Glamorgan backs you" at the start of a sentence (fix
 * round 2, package A's NEEDS: "Health in Vale of Glamorgan"). The names are data:
 * `boardui.grammar.withThe` in model/i18n/en/boardui.json, a list split on "|". Headings and lists
 * that show a name on its own keep the plain name; only sentences filled by `t` change.
 */

/** The names from `boardui.grammar.withThe` ("A|B"); a missing key gives none. */
export const namesFrom = (list: string, key: string): string[] => (list === key ? [] : list.split("|").map((s) => s.trim()).filter(Boolean));

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Put "the" before each name that takes it, unless it is already there. At the start of a
 * sentence it is "The"; at the start of a fragment (a list item or a label, which has no full
 * stop) the name stays bare, as a list of names reads.
 */
export function withArticles(text: string, names: string[]): string {
  const sentence = /[.!?]["')]?\s*$/.test(text.trim());
  let out = text;
  for (const name of names) {
    out = out.replace(new RegExp(`(^|[^A-Za-z])(?<!\\bthe )(?<!\\bThe )${escape(name)}\\b`, "g"), (_m, before: string, at: number) => {
      const lead = out.slice(0, at + before.length).trimEnd();
      if (lead === "" && !sentence) return `${before}${name}`;
      const startsSentence = lead === "" || /[.!?]$/.test(lead);
      return `${before}${startsSentence ? "The" : "the"} ${name}`;
    });
  }
  return out;
}
