// Names for the things rules read and write, and the book's page order.
import { hasKey, pick, t } from "../../i18n";
import type { CompiledModel, Rule } from "../../model/schema";

/** A readable name for a rule input or output id (component, card, curveball, or a fixed word). */
export function thingName(model: CompiledModel, id: string): string {
  const c = model.components.find((x) => x.id === id);
  if (c) return pick(c.name);
  const card = model.cards.find((x) => x.id === id);
  if (card) return pick(card.name);
  const cb = model.curveballs.find((x) => x.id === id);
  if (cb) return pick(cb.name);
  const st = model.standing.find((x) => x.id === id);
  if (st) return pick(st.name);
  const ind = model.indicators.find((x) => x.id === id);
  if (ind) return pick(ind.name);
  if (id.startsWith("fcm:")) {
    const node = model.fcm.nodes.find((n) => n.id === id.slice(4));
    if (node) return t("book.input.fcmNode", { name: node.label });
  }
  const key = `book.input.${id.replace(/[\s:]+/g, "_")}`;
  return hasKey(key) ? t(key) : id;
}

export const THEMES = ["people", "nature", "economy", "places", "game"] as const;

/** Rules grouped by theme, placeholders first within each theme, then by id. */
export function rulesByTheme(model: CompiledModel): { theme: string; rules: Rule[] }[] {
  const themes = [...THEMES, ...new Set(model.rules.map((r) => r.theme).filter((th) => !(THEMES as readonly string[]).includes(th)))];
  return themes
    .map((theme) => ({
      theme,
      rules: model.rules
        .filter((r) => r.theme === theme)
        .sort((a, b) => Number(b.placeholder) - Number(a.placeholder) || a.id.localeCompare(b.id, "en", { numeric: true })),
    }))
    .filter((g) => g.rules.length);
}

export const SECTIONS = ["indicators", "strands", "cards", "curveballs", "sources"] as const;
export type Section = (typeof SECTIONS)[number];

/** Every page of the book in reading order: contents, the rules, then the sections. */
export function pageOrder(model: CompiledModel): string[] {
  return ["", ...rulesByTheme(model).flatMap((g) => g.rules.map((r) => r.id)), ...SECTIONS];
}

/** Decimal places that suit a parameter's range. */
export function decimalsFor(min: number, max: number): number {
  const span = Math.abs(max - min);
  if (span >= 20) return 0;
  if (span >= 2) return 1;
  if (span >= 0.2) return 2;
  return 3;
}

/** Slider step: one unit in the last decimal place shown. */
export function stepFor(min: number, max: number): number {
  return Math.pow(10, -decimalsFor(min, max));
}

/** A parameter's name in words ("coef" is "Strength"). */
export function paramLabel(name: string): string {
  const key = `book.param.${name}`;
  return hasKey(key) ? t(key) : name;
}
