// What the map in play knows about a place and the player's choices (plain-wales 5 and 6): which
// cards reach a council area, the real figures that matter for the hand, the four regions compared
// on a card's measure, and the game's own estimate of change since 2026. Pure functions over the
// compiled model and the game state, so the panels only format. No figure is made up here: real
// values come from `la_data`, game estimates from the engine's `componentView`.
import { componentView, type GameState, type PostItem, type RegionId } from "../../engine/api";
import { bandScore } from "../../engine/scores";
import { cardReach, playRegions, type ReachPlay } from "../../model/reach";
import type { Card, CompiledModel, Curveball, Where } from "../../model/schema";
import { atlasIndicators, WALES, type AtlasIndicator } from "../atlas/data";

const indCache = new WeakMap<CompiledModel, Map<string, AtlasIndicator>>();

/** Atlas indicators by id (those with data), cached per model. */
export function indicatorsOf(model: CompiledModel): Map<string, AtlasIndicator> {
  let m = indCache.get(model);
  if (!m) { m = new Map(atlasIndicators(model).map((i) => [i.id, i])); indCache.set(model, m); }
  return m;
}

/** The indicator behind a card's real figure, or null for a card with no honest figure. */
export function cardIndicator(model: CompiledModel, cardId: string): AtlasIndicator | null {
  const f = model.cards.find((c) => c.id === cardId)?.fact;
  return f ? indicatorsOf(model).get(f.indicator) ?? null : null;
}

/** Counts and totals that say nothing particular about a place when set against Wales. */
const NOT_COMPARABLE = new Set(["pop", "renewables_mw"]);

/**
 * The figures where an area stands furthest from Wales, as a share of the spread across the 22
 * (so a percent and a count compare fairly). Used when no card is open.
 */
export function widestGaps(model: CompiledModel, code: string, n = 3, skip: string[] = []): AtlasIndicator[] {
  const out: { ind: AtlasIndicator; gap: number }[] = [];
  for (const ind of indicatorsOf(model).values()) {
    if (NOT_COMPARABLE.has(ind.id) || skip.includes(ind.id) || ind.wales == null) continue;
    const v = ind.laValues[code];
    if (v == null) continue;
    const vals = Object.values(ind.laValues);
    const spread = Math.max(...vals) - Math.min(...vals);
    if (!(spread > 0)) continue;
    out.push({ ind, gap: Math.abs(v - ind.wales) / spread });
  }
  return out.sort((a, b) => b.gap - a.gap).slice(0, n).map((x) => x.ind);
}

/** The highest and lowest council area of a region on a measure (published figures only, no regional average). */
export function regionSpread(model: CompiledModel, ind: AtlasIndicator, region: RegionId): { high: { code: string; v: number }; low: { code: string; v: number } } | null {
  const codes = model.regions.find((r) => r.id === region)?.authorities ?? [];
  const vals = codes.map((code) => ({ code, v: ind.laValues[code] })).filter((x): x is { code: string; v: number } => x.v != null);
  if (!vals.length) return null;
  const sorted = [...vals].sort((a, b) => b.v - a.v);
  return { high: sorted[0]!, low: sorted[sorted.length - 1]! };
}

// ---------------------------------------------------------------- the player's cards on the map

export type CardStatus = "working" | "on_way" | "planned" | "lapsed";

export interface PlacedCard {
  card: string;
  /** Year played (this turn's start year for a planned card). */
  year: number;
  term: number;
  regions: RegionId[] | null;
  status: CardStatus;
  /** For a card on its way: the year it first works. */
  worksFrom?: number;
}

/** Plays of the player's own (not the stand-in's), oldest first, with what has become of each. */
export function placedCards(model: CompiledModel, state: GameState, draft: ReachPlay[] = []): PlacedCard[] {
  const out: PlacedCard[] = [];
  const postOf = (card: string, term: number): PostItem | undefined => state.post.find((p) => p.card === card && p.playedTerm === term);
  for (const h of state.history) {
    if (h.caretaker) continue;
    for (const p of h.plays.cards) {
      const card = model.cards.find((c) => c.id === p.card);
      if (!card) continue;
      const post = postOf(p.card, h.term);
      const lapsed = state.ledger.liabilities.some((l) => l.card === p.card && l.mintedYear === h.year && l.skipped > 0);
      out.push({
        card: p.card, year: h.year, term: h.term, regions: playRegions(card, p),
        status: post ? "on_way" : lapsed ? "lapsed" : "working",
        ...(post ? { worksFrom: post.firstYear ?? post.arrivesYear } : {}),
      });
    }
  }
  const finished = state.history.some((h) => h.term === state.term);
  const now = state.step === "plan" ? draft : !finished && state.plays ? state.plays.cards : [];
  for (const p of now) {
    const card = model.cards.find((c) => c.id === p.card);
    if (card) out.push({ card: p.card, year: state.year, term: state.term, regions: playRegions(card, p), status: "planned" });
  }
  return out;
}

/** The placed cards that reach one council area. */
export function cardsReaching(model: CompiledModel, placed: PlacedCard[], code: string): PlacedCard[] {
  return placed.filter((p) => cardReach(model, { card: p.card, regions: p.regions ?? undefined }).includes(code));
}

/**
 * The last turn (term index) a card reached each region, the engine's reading for Trust: a regional
 * play reaches its regions, a national play reaches all four. -1 when none has.
 */
export function regionLastCard(model: CompiledModel, state: GameState, draft: ReachPlay[] = []): Record<RegionId, number> {
  const last: Record<RegionId, number> = { north: -1, mid: -1, southwest: -1, southeast: -1 };
  const national = model.game.trust.national_counts_for_neglect;
  const mark = (regions: RegionId[] | null, term: number) => {
    for (const r of regions ?? (national ? (Object.keys(last) as RegionId[]) : [])) last[r] = Math.max(last[r], term);
  };
  for (const h of state.history) for (const p of h.plays.cards) {
    const card = model.cards.find((c) => c.id === p.card);
    if (card) mark(playRegions(card, p), h.term);
  }
  if (state.step === "plan") for (const p of draft) {
    const card = model.cards.find((c) => c.id === p.card);
    if (card) mark(playRegions(card, p), state.term);
  }
  return last;
}

/**
 * Trust falls at the end of a turn for a region no card has reached this turn or last turn. True
 * when that will happen to this region at the end of the current turn, as things stand.
 */
export function regionAtRisk(state: GameState, last: number): boolean {
  return state.term >= 1 && last < state.term - 1;
}

// ---------------------------------------------------------------- slow changes here

const inWhere = (model: CompiledModel, code: string, w: Where | undefined): boolean => {
  if (!w) return true;
  const a = model.authorities.find((x) => x.code === code);
  if (!a) return false;
  if (w.regions?.length && !w.regions.includes(a.region)) return false;
  if (w.las?.length && !w.las.includes(code)) return false;
  if (w.flags?.length && !w.flags.some((f) => a.flags.includes(f))) return false;
  if (w.not_flags?.length && w.not_flags.some((f) => a.flags.includes(f))) return false;
  return true;
};

/** How an active slow change bears on an area: harder than most, here, across Wales, or not here. */
export function trendHere(model: CompiledModel, cb: Curveball, code: string): "hard" | "here" | "wales" | null {
  const effects = cb.slow;
  if (!effects.length) return null;
  if (effects.some((e) => (e.emphasis ?? []).some((em) => inWhere(model, code, em)) && inWhere(model, code, e.where))) return "hard";
  if (effects.some((e) => e.where && inWhere(model, code, e.where))) return "here";
  if (effects.some((e) => !e.where)) return "wales";
  return null;
}

// ---------------------------------------------------------------- since 2026, a game estimate

export interface SinceEstimate {
  /** The indicator the estimate is about (its own measure, read through its band). */
  indicator: string;
  /** Direction of the measure itself (more flood risk is "up"). */
  dir: "up" | "down" | "same";
  size: "little" | "lot";
  /** True when the change is for the better. */
  better: boolean;
  /** How much of it the player's cards did. */
  mine: "most" | "some" | "none" | "against";
}

/** Score changes smaller than this (in 0 to 10 points) read as "about the same". */
const SAME = 0.15;
/** At or above this, "a lot". */
const LOT = 0.75;

/**
 * The game's estimate of how a measure has moved in a council area since 2026, and how much of that
 * was the player's doing, from the engine's component view. Null when the game does not model the
 * measure place by place. Never a figure: a direction and a plain size.
 */
export function sinceEstimate(model: CompiledModel, state: GameState, indicator: string, code: string): SinceEstimate | null {
  const comp = model.components.find((c) => c.indicator === indicator);
  const band = model.bands.find((b) => b.indicator === indicator);
  const v2026 = model.la_data[indicator]?.values[code];
  const i = model.authorities.findIndex((a) => a.code === code);
  if (!comp || !band || v2026 == null || i < 0) return null;
  let view;
  try { view = componentView(model, state, comp.id); } catch { return null; }
  const now = view.scores[i];
  if (now == null) return null;
  const d = now - bandScore(band, v2026);
  const mineD = view.playerDelta[i] ?? 0;
  const better = d > 0;
  // the band runs floor (score 0) to goal (score 10); the raw measure rises with the score when goal > floor
  const rises = band.goal > band.floor && !band.invert;
  const dir = Math.abs(d) < SAME ? "same" : (d > 0) === rises ? "up" : "down";
  let mine: SinceEstimate["mine"];
  if (Math.abs(mineD) < SAME / 2) mine = "none";
  else if (dir !== "same" && Math.sign(mineD) !== Math.sign(d)) mine = "against";
  else if (dir === "same" || Math.abs(mineD) >= Math.abs(d) / 2) mine = "most";
  else mine = "some";
  return { indicator, dir, size: Math.abs(d) >= LOT ? "lot" : "little", better, mine };
}

/**
 * The measures the game models for a card: its real figure's indicator when the game tracks it, or
 * else the first main effect on a measured quantity.
 */
export function trackedIndicator(model: CompiledModel, card: Card): string | null {
  const tracked = (ind: string | undefined) =>
    !!ind && model.components.some((c) => c.indicator === ind) && model.bands.some((b) => b.indicator === ind) && !!model.la_data[ind];
  if (tracked(card.fact?.indicator)) return card.fact!.indicator;
  for (const e of card.effects) {
    if (e.side) continue;
    const ind = model.components.find((c) => c.id === e.target)?.indicator;
    if (tracked(ind)) return ind!;
  }
  return null;
}

export { WALES };
