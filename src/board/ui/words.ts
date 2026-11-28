/**
 * Words for the board screens: the engine's `Say` sentences, names from the model, and the
 * plain forms of points, coins and years (docs/design/plain-wales.md). No player text is written
 * here: every string comes from model/i18n through t(), or from a `{en, cy}` field in the model.
 */
import { fillEn, formatNum, hasKey, lang, pick, t, tn } from "./lang";
import { fillCy, listCy } from "./cymraeg";
import type { BoardModel, ChapterRecord, CouncilCode, MeasureId, NodeId, Say, SayVar, Text, WhyQuantity } from "../engine/api";
import { seasonOf, stepsOf, yearOfStep } from "../engine/api";

const isText = (v: unknown): v is Text => !!v && typeof v === "object" && "en" in (v as object);

/** The model, for naming ids that arrive as Say values (set once by the board route). */
let named: BoardModel | null = null;
export function nameIdsFrom(model: BoardModel | null): void { named = model; }

/** A Say value as words: a Text in the active language, a number, an i18n key, or an id given its name. */
function varText(v: SayVar): string {
  // no thousands commas: the board's numbers are small, and a year must read 2035, not 2,035
  if (typeof v === "number") return num(v);
  if (isText(v)) return pick(v, lang());
  if (/^[a-z][\w-]*(\.[\w-]+)+$/.test(v) && (hasKey(v) || hasKey(`board.${v}`))) return t(hasKey(v) ? v : `board.${v}`);
  const m = named;
  if (m) {
    const c = m.councils.find((x) => x.code === v) ?? m.stubs.find((x) => x.id === v);
    if (c) return tx(c.name);
    if (m.measures.some((x) => x.id === v) || /^(young_adults|backing|risk_\w+|coins|fairness)$/.test(v)) return measureName(m, v as WhyQuantity);
    const named2 = m.projects.find((x) => x.id === v) ?? m.events.find((x) => x.id === v) ?? m.laws.find((x) => x.id === v) ?? m.places.find((x) => x.id === v) ?? m.links.find((x) => x.id === v && x.name);
    if (named2 && "name" in named2 && named2.name) return tx(named2.name);
  }
  return v;
}

/**
 * A Say from the engine, in the active language. Keys may be given with or without "board.".
 * Returns "" for a key that is in neither language yet, or a sentence left with an empty slot,
 * so the caller can fall back to model text rather than show a half-made sentence.
 */
export function say(s: Say | null | undefined): string {
  if (!s) return "";
  const key = hasKey(s.key) ? s.key : hasKey(`board.${s.key}`) ? `board.${s.key}` : null;
  const vars = Object.fromEntries(Object.entries(s.vars ?? {}).map(([k, v]) => [k, varText(v)]));
  // a sentence the engine carries whole from the model (an event warning, an evidence line), with
  // its slots filled from the other values, when there is no wrapping key for it yet
  // a value may itself be a model sentence with slots (an event warning in `line`): fill those from the same values
  const first = key ? t(key, vars) : vars["line"] ?? "";
  const out = lang() === "cy" ? fillCy(first, vars) : fillEn(first, vars);
  if (!out) return "";
  if (/\{\w+\}/.test(out)) { console.warn(`board: ${key} has a slot the engine did not fill`, s.vars); return ""; }
  return out;
}

/** "a, b and c" in the active language. */
export function listOf(items: string[]): string {
  if (items.length < 2) return items.join("");
  if (lang() === "cy") return listCy(items);
  return items.slice(0, -1).join(t("boardui.list.comma")) + t("boardui.list.and") + items[items.length - 1];
}

/** "a, b or c" in the active language (Welsh: "neu" softens the last name). */
export function orOf(items: string[]): string {
  if (items.length < 2) return items.join("");
  if (lang() === "cy") return listCy(items, true);
  return items.slice(0, -1).join(t("boardui.list.comma")) + t("boardui.list.or") + items[items.length - 1];
}

/** A model `{en, cy}` field in the active language. */
export const tx = (text: Text | string | null | undefined): string => pick(text as never, lang());

/** Fill the {council}, {councils} and {river} slots of a model sentence (events, endings). */
export function fill(model: BoardModel, text: string, councils: CouncilCode[], river?: Text): string {
  if (lang() === "cy") {
    return fillCy(text, { council: councilName(model, councils[0]), councils: listCy(councils.map((c) => councilName(model, c))), river: river ? tx(river) : "" });
  }
  return fillEn(text, { council: councilName(model, councils[0]), councils: councils.map((c) => councilName(model, c)).join(t("boardui.list.and")), river: river ? tx(river) : "" });
}

export function councilName(model: BoardModel, code: NodeId | null | undefined): string {
  if (!code) return t("boardui.wales");
  const c = model.councils.find((x) => x.code === code) ?? model.stubs.find((x) => x.id === code);
  return c ? tx(c.name) : code;
}

export function measureName(model: BoardModel, id: WhyQuantity | MeasureId): string {
  const m = model.measures.find((x) => x.id === id);
  if (m) return tx(m.name);
  return t(`boardui.quantity.${id}`);
}

export const projectName = (model: BoardModel, id: string): string => tx(model.projects.find((p) => p.id === id)?.name ?? id);
export const branchName = (model: BoardModel, id: string): string => tx(model.branches.find((b) => b.id === id)?.name ?? id);

/**
 * A number as every board screen shows it: at most one decimal, no thousands comma
 * (playtest 8, must-fix 8: "You have 1.8132"). Every figure on a board screen goes through here.
 */
export const num = (n: number): string => formatNum(n, { maximumFractionDigits: 1, useGrouping: false });

/** Coins as the screens count them: the engine keeps four decimals, the screens show whole coins (and a ring). */
export const wholeCoins = (n: number): number => Math.floor(n + 1e-6);

/**
 * Backing as the screens show it: cut DOWN to one decimal, never rounded up, so a shown figure of
 * `backs_at` (5) or more always means "backs you" and a lower one never does (rule P4, playtest 8
 * must-fix 6: "Does not back you. Backing 5 out of 10"). The engine's test is backing >= backs_at.
 */
export const backingShown = (n: number): number => Math.floor(n * 10) / 10;

/** "about 5 out of 10": a score is always an estimate after 2026, so it is said with "about". */
export function outOf10(n: number, about = true): string {
  return t(about ? "boardui.score.about" : "boardui.score.exact", { n: num(n) });
}

/** "+0.4" or "-1.2", for previews and changes (points out of 10). */
export function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return (r > 0 ? "+" : r < 0 ? "−" : "") + num(Math.abs(r));
}

/** The first letter in capitals, for words that open a line ("yr haf" opens as "Yr haf"). */
export const capFirst = (s: string): string => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/**
 * "Autumn 2031": a step as the screen says it, never as a step number. Spring falls in the next
 * calendar year. Welsh seasons are lower case inside a sentence; `lead` capitalises one that opens a line.
 */
export function whenWords(model: BoardModel, step: number, lead = false): string {
  const season = seasonOf(model, step);
  const year = yearOfStep(model, step) + (season === "spring" ? 1 : 0);
  const out = t("boardui.when", { season: t(`boardui.season.${season}`), year });
  return lead ? capFirst(out) : out;
}

/**
 * How long a build takes, in words that cannot clash with its opening date (playtest 9, must-fix
 * 11: "Takes 1 years", "Takes 0 years to build" beside "works within a year"). Under a year it
 * "works within a year"; otherwise "Takes 1 year" or "Takes 3 years".
 */
export function takesWords(years: number): string {
  if (years < 1) return t("boardui.build.takesQuick");
  return tn("boardui.build.takes", Math.round(years * 10) / 10, { n: num(years) });
}

/**
 * The season a previewed change is first felt, as a step: the season the build starts working,
 * plus the whole years it beds in (the preview's `year` counts from the opening year). So a card
 * that opens "Summer 2028" never previews a change "from 2027", and Spring is never a year early.
 */
export function feltStep(model: BoardModel, readyStep: number, readyYear: number, changeYear: number): number {
  return readyStep + 1 + stepsOf(model, Math.max(0, changeYear - readyYear));
}

function fillChapter(model: BoardModel, rec: ChapterRecord, field: "name" | "line"): string | null {
  const def = model.chapters?.find((c) => c.id === rec.chapter);
  if (!def) return null;
  const vars = Object.fromEntries(Object.entries(rec.slots ?? {}).map(([k, v]) => [k, varText(v)]));
  const s = tx(def[field]);
  return lang() === "cy" ? fillCy(s, vars) : fillEn(s, vars);
}

/** A chapter's name with its slots filled, or the fallback name while the chapters are not written. */
export const chapterName = (model: BoardModel, rec: ChapterRecord): string => fillChapter(model, rec, "name") ?? t("boardui.chapter.fallback");

/** A chapter's one line, filled the same way, or "". */
export const chapterLine = (model: BoardModel, rec: ChapterRecord): string => fillChapter(model, rec, "line") ?? "";

/** Councils in play, in display order. */
export const inPlay = (model: BoardModel): CouncilCode[] => model.game.councils;

/** A coin rate to tenths, signed, with no sign at zero (never "-0" or "+0"). */
export function incomeWords(perYear: number): string {
  const v = Math.round(perYear * 10) / 10;
  if (v === 0) return formatNum(0);
  return (v > 0 ? "+" : "") + formatNum(v, { maximumFractionDigits: 1 });
}
