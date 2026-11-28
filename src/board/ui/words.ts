/**
 * Words for the board screens: the engine's `Say` sentences, names from the model, and the
 * plain forms of points, coins and years (docs/design/plain-wales.md). No player text is written
 * here: every string comes from model/i18n through t(), or from a `{en, cy}` field in the model.
 */
import { formatNum, hasKey, lang, pick, t } from "../../i18n";
import type { BoardModel, CouncilCode, MeasureId, NodeId, Say, SayVar, Text, WhyQuantity } from "../engine/api";

const isText = (v: unknown): v is Text => !!v && typeof v === "object" && "en" in (v as object);

/** The model, for naming ids that arrive as Say values (set once by the board route). */
let named: BoardModel | null = null;
export function nameIdsFrom(model: BoardModel | null): void { named = model; }

/** A Say value as words: a Text in the active language, a number, an i18n key, or an id given its name. */
function varText(v: SayVar): string {
  if (typeof v === "number") return formatNum(v, { maximumFractionDigits: 1 });
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
  const out = key ? t(key, vars) : vars["line"] ? vars["line"].replace(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all) : "";
  if (!out) return "";
  if (/\{\w+\}/.test(out)) { console.warn(`board: ${key} has a slot the engine did not fill`, s.vars); return ""; }
  return out;
}

/** "a, b and c" in the active language. */
export function listOf(items: string[]): string {
  if (items.length < 2) return items.join("");
  return items.slice(0, -1).join(t("boardui.list.comma")) + t("boardui.list.and") + items[items.length - 1];
}

/** A model `{en, cy}` field in the active language. */
export const tx = (text: Text | string | null | undefined): string => pick(text as never, lang());

/** Fill the {council}, {councils} and {river} slots of a model sentence (events, endings). */
export function fill(model: BoardModel, text: string, councils: CouncilCode[], river?: Text): string {
  return text
    .replace(/\{council\}/g, councilName(model, councils[0]))
    .replace(/\{councils\}/g, councils.map((c) => councilName(model, c)).join(t("boardui.list.and")))
    .replace(/\{river\}/g, river ? tx(river) : "");
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

/** "about 5 out of 10": a score is always an estimate after 2026, so it is said with "about". */
export function outOf10(n: number, about = true): string {
  return t(about ? "boardui.score.about" : "boardui.score.exact", { n: formatNum(n, { maximumFractionDigits: 1 }) });
}

/** "+0.4" or "-1.2", for previews and changes (points out of 10). */
export function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return (r > 0 ? "+" : r < 0 ? "−" : "") + formatNum(Math.abs(r), { maximumFractionDigits: 1 });
}

/** Years of a turn: turn 0 is 2026 to 2028. */
export const turnYears = (model: BoardModel, turn: number): [number, number] => {
  const from = model.game.first_year + turn * model.game.turn_years;
  return [from, from + model.game.turn_years];
};

/** Councils in play, in display order. */
export const inPlay = (model: BoardModel): CouncilCode[] => model.game.councils;
