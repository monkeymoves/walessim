// Atlas view of the model: indicators grouped by strand, authority names and regions,
// values per authority and the Wales value, lens specs. Reads only the compiled model.
import { STRAND_RAMPS } from "./ramps";
import { STRAND_IDS, type CompiledModel, type Indicator, type StrandId, type Text } from "../../model/schema";
import type { LensSpec } from "../../map";
import { ordinal, t } from "../../i18n";
import { formatValue, rankOf } from "./format";

export const WALES = "W92000004";

/** The six headline figures on every place panel, in order. */
export const HEADLINE: readonly string[] = ["pop", "welsh_speakers", "employment", "earnings", "life_exp", "deprivation"];

/** The default lens: the one the beat sheet makes glow first. */
export const DEFAULT_LENS = "welsh_speakers";

/** Authorities with an authored place to visit in Yfory. */
export const PLACE_LAS: Record<string, "rhondda" | "bethesda"> = { W06000016: "rhondda", W06000002: "bethesda" };

export interface AtlasIndicator {
  id: string;
  name: Text;
  format: string;
  higherIsBetter: boolean | null;
  strand: StrandId | null;
  sources: string[];
  year: string;
  values: Record<string, number>;
  wales: number | null;
  /** Values for the 22 authorities only. */
  laValues: Record<string, number>;
}

export function indicatorSources(ind: Indicator): string[] {
  const s = ind.sources ?? ind.source;
  return Array.isArray(s) ? s : s ? [s] : [];
}

/**
 * Display formats that override indicators.yaml: the flood measure counts homes per 100 households,
 * once per kind of flood, so it is never shown as a per cent (plain-wales 6.1).
 */
const FORMAT_FIX: Record<string, string> = { flood_exposure: "decimal1" };

/** Every indicator that has data, with its values. */
export function atlasIndicators(model: CompiledModel): AtlasIndicator[] {
  const codes = model.authorities.map((a) => a.code);
  const out: AtlasIndicator[] = [];
  for (const ind of model.indicators) {
    const d = model.la_data[ind.id];
    if (!d) continue;
    const laValues: Record<string, number> = {};
    for (const c of codes) {
      const v = d.values[c];
      if (v != null && Number.isFinite(v)) laValues[c] = v;
    }
    const hib = ind.higher_is_better;
    const strand = (ind["strand"] as StrandId | undefined) ?? null;
    out.push({
      id: ind.id,
      name: ind.name,
      format: FORMAT_FIX[ind.id] ?? (ind["format"] as string | undefined) ?? "decimal1",
      higherIsBetter: hib === true ? true : hib === false ? false : null,
      strand: strand && STRAND_IDS.includes(strand) ? strand : null,
      sources: indicatorSources(ind),
      year: String(d.year ?? ind.year ?? ""),
      values: d.values,
      wales: d.values[WALES] ?? null,
      laValues,
    });
  }
  return out;
}

/** Indicators grouped by strand in the fixed strand order; ungrouped ones last. */
export function byStrand(inds: AtlasIndicator[]): { strand: StrandId | null; items: AtlasIndicator[] }[] {
  const groups: { strand: StrandId | null; items: AtlasIndicator[] }[] = [];
  for (const s of [...STRAND_IDS, null] as (StrandId | null)[]) {
    const items = inds.filter((i) => i.strand === s);
    if (items.length) groups.push({ strand: s, items });
  }
  return groups;
}

/** A lens over the 22 authorities, in the measure's goal colour (ramps.ts). Change-over-time indicators diverge about the Wales value. */
export function lensFor(ind: AtlasIndicator): LensSpec {
  const vals = Object.values(ind.laValues);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const diverging = ind.id.endsWith("_change");
  return {
    values: ind.laValues,
    domain: [lo, hi],
    ramp: diverging ? "diverging" : "sequential",
    higherIsBetter: ind.higherIsBetter,
    centre: diverging ? (ind.wales ?? undefined) : undefined,
    stops: !diverging && ind.strand ? [...STRAND_RAMPS[ind.strand]] : undefined,
  };
}

/** Formatted value, with a sign for changes. */
export function fmt(ind: AtlasIndicator, v: number | null | undefined): string | null {
  return formatValue(v, ind.format, { signed: ind.id.endsWith("_change") });
}

export function rank(ind: AtlasIndicator, code: string, codes: string[]): number | null {
  return rankOf(ind.laValues, code, codes);
}

/** "Highest of 22.", "Lowest of 22." or "8th highest of 22." in the active language. */
export function rankLine(ind: AtlasIndicator, code: string, codes: string[]): string {
  const r = rank(ind, code, codes);
  if (r == null) return t("atlas.noData");
  const n = Object.keys(ind.laValues).length;
  if (r === 1) return t("atlas.panel.rankTop", { n });
  if (r === n) return t("atlas.panel.rankBottom", { n });
  return t("atlas.panel.rank", { rank: ordinal(r), n });
}
