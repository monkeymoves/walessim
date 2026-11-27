// Real figures in words for the game (plain-wales 6.1): a measure's plain name, its value with the
// unit words that follow it, and the "Real Wales" sentence for a card. Every value is read from
// the compiled model; nothing is typed in. Wording lives in model/i18n/*/facts.json.
import { hasKey, pick, t } from "../../i18n";
import type { CompiledModel } from "../../model/schema";
import { formatValue } from "../atlas/format";
import type { AtlasIndicator } from "../atlas/data";
import { cardIndicator, indicatorsOf } from "./mapFacts";

/**
 * Formats that would mislead in a sentence: the flood measure counts homes per 100 households,
 * once per kind of flood, so it is never written as a per cent (plain-wales 6.1).
 */
const SENTENCE_FORMAT: Record<string, string> = { flood_exposure: "decimal1" };

/** A value as it reads in a sentence, before its unit words. */
export function figValue(ind: AtlasIndicator, v: number | null | undefined): string {
  return formatValue(v, SENTENCE_FORMAT[ind.id] ?? ind.format, { signed: ind.id.endsWith("_change") }) ?? t("atlas.noData");
}

/** The plain name of a measure. */
export function measureName(ind: AtlasIndicator): string {
  const k = `facts.measure.${ind.id}`;
  return hasKey(k) ? t(k) : pick(ind.name);
}

/** The words after a value ("for every 100 homes"); empty when there are none. */
export function unitWords(ind: AtlasIndicator): string {
  const k = `facts.unit.${ind.id}`;
  return hasKey(k) ? t(k) : "";
}

/** "26.1 for every 100 homes." */
export function valueLine(ind: AtlasIndicator, v: number | null | undefined): string {
  return t("facts.area.fig", { value: figValue(ind, v), unit: unitWords(ind) }).replace(/\s+\./, ".");
}

/** The council area's name in the active language. */
function laName(model: CompiledModel, code: string): string {
  return pick(model.authorities.find((a) => a.code === code)?.name ?? code);
}

/**
 * A card's "Real Wales" sentence, from its resolved `fact`: "Homes at flood risk: highest in Conwy,
 * 54.2 for every 100 homes. Wales: 21.8." Null for a card with no honest figure.
 */
export function realWalesText(model: CompiledModel, cardId: string): { text: string; source: string; year: string; indicator: string } | null {
  const card = model.cards.find((c) => c.id === cardId);
  const f = card?.fact;
  const ind = cardIndicator(model, cardId);
  if (!f || !ind) return null;
  const vars = {
    measure: measureName(ind),
    area: f.la ? laName(model, f.la) : "",
    value: figValue(ind, f.value),
    unit: unitWords(ind),
    wales: figValue(ind, f.wales),
  };
  const key = f.pick === "wales" ? "facts.real.wales" : f.pick === "highest" ? "facts.real.highest" : f.pick === "lowest" ? "facts.real.lowest" : "facts.real.area";
  return { text: t(key, vars).replace(/\s+\./g, ".").replace(/\s+,/g, ","), source: f.source, year: f.year, indicator: ind.id };
}

/** "Homes at flood risk in Wales: 21.8 for every 100 homes (2025)." for a result slip. */
export function forScaleText(model: CompiledModel, indicator: string): { text: string; source: string; year: string } | null {
  const ind = indicatorsOf(model).get(indicator);
  if (!ind || ind.wales == null) return null;
  return {
    text: t("facts.scale.line", { measure: measureName(ind), wales: figValue(ind, ind.wales), unit: unitWords(ind), year: ind.year }).replace(/\s+\(/, " ("),
    source: ind.sources[0] ?? "",
    year: ind.year,
  };
}
