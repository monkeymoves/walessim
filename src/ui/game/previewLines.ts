// "If you play this", as lines (plain-wales 2.1), from the engine's paired preview and the card's
// own ticket. Every goal the ticket names gets a line, downsides included (cold playtest 5: Skills
// and apprenticeships previewed only "Work and pay goes up", then the result said it hurt Homes and
// community and Welsh and culture). A card whose change is too small to move the Wales bars says what
// it does and that it is small (cold playtest 5: Buses and rail in Mid Wales said only "You will not
// see a change by 2050" for 3 coins and a running cost).
import type { CardPreview } from "../../engine/api";
import { STRAND_IDS, type Card, type StrandId } from "../../model/schema";

/** One line: an i18n key, an optional count for a plural key, and its fill-ins. */
export interface PreviewLine {
  key: string;
  n?: number;
  vars: Record<string, string | number>;
  /** The goals this line names, so callers and tests can check that none is left out. */
  goals: StrandId[];
}

/** A shown flow change of at least this many points gets its own line; less, and it is "a little". */
const SHOWN = 0.15;
/** A stock change of at least this much is "left for 2050". */
const LEFT = 0.05;

export function previewLines(p: CardPreview, card: Card, year: number, name: (id: StrandId) => string, list: (xs: string[]) => string): PreviewLine[] {
  if (p.needsPartner && !p.real.length) return [{ key: "play.card.partner", vars: {}, goals: [] }];
  if (p.landsAfterGame) return [{ key: "play.card.after_2050", vars: {}, goals: [] }];
  const end = year + 4;
  const by = p.nothingThisTerm || p.landsYear > end ? Math.max(p.landsYear, end) : end;
  const out: PreviewLine[] = [];
  if (p.nothingThisTerm) out.push({ key: "play.card.nothing_by", vars: { year: end }, goals: [] });
  const named = new Set<StrandId>();
  const more: StrandId[] = [], less: StrandId[] = [];
  for (const id of STRAND_IDS) {
    if (!p.real.includes(id)) continue;
    const f = p.strands[id];
    const st = p.stock[id];
    const goal = name(id);
    const d = f?.delta ?? 0;
    if (Math.abs(d) >= SHOWN) {
      const n = Math.round(Math.abs(d));
      if (n === 0) out.push({ key: d > 0 ? "play.card.up_small" : "play.card.down_small", vars: { goal, year: by }, goals: [id] });
      else out.push({ key: `play.card.${d > 0 ? "up" : "down"}${f?.sharp === false ? "_unsure" : ""}`, n, vars: { goal, year: by }, goals: [id] });
      named.add(id);
    } else if (Math.abs(st?.delta ?? 0) >= LEFT) {
      (st!.delta > 0 ? more : less).push(id);
      named.add(id);
    }
  }
  const seen = out.some((l) => l.goals.length) || more.length + less.length > 0;
  if (more.length) out.push({ key: "play.card.left_more", vars: { goals: list(more.map(name)) }, goals: more });
  if (less.length) out.push({ key: "play.card.left_less", vars: { goals: list(less.map(name)) }, goals: less });
  // every other goal on the ticket, in the ticket's own words: helps, hurts, or either way by place
  const helps = new Set(card.helps ?? []), frays = new Set(card.frays ?? []), mixed = new Set(card.mixed ?? []);
  const rest = STRAND_IDS.filter((id) => !named.has(id) && (helps.has(id) || frays.has(id) || mixed.has(id)));
  const both = rest.filter((id) => mixed.has(id) || (helps.has(id) && frays.has(id)));
  const up = rest.filter((id) => helps.has(id) && !both.includes(id));
  const down = rest.filter((id) => frays.has(id) && !both.includes(id));
  if (up.length) out.push({ key: "play.card.small_helps", vars: { goals: list(up.map(name)) }, goals: up });
  if (down.length) out.push({ key: "play.card.small_hurts", vars: { goals: list(down.map(name)) }, goals: down });
  if (both.length) out.push({ key: "play.card.small_mixed", vars: { goals: list(both.map(name)) }, goals: both });
  if (!seen && rest.length) out.push({ key: "play.card.too_small", vars: {}, goals: [] });
  if (!out.some((l) => l.goals.length)) out.push({ key: "play.card.nothing_seen", vars: {}, goals: [] });
  return out;
}

/** One "Needs" line: an i18n key and its fill-ins (card names are filled by the caller's `cardName`). */
export interface NeedLine { key: string; vars: Record<string, string> }

/**
 * What a card needs to work in full, as its own lines (cold playtest 6: "The catch" hid "only at full
 * strength if you have played Skills"). Read from the card's effect conditions, so no need is written
 * by hand and none is left out: another card played first, trained workers, local help, or a card in
 * force that stops a downside.
 */
export function needLines(card: Card, cards: readonly Card[], cardName: (id: string) => string, list: (xs: string[]) => string): NeedLine[] {
  const out: NeedLine[] = [];
  const seen = new Set<string>();
  const add = (key: string, vars: Record<string, string>) => {
    const k = `${key}|${JSON.stringify(vars)}`;
    if (!seen.has(k)) { seen.add(k); out.push({ key, vars }); }
  };
  for (const e of card.effects) {
    const c = e.condition;
    if (!c) continue;
    if (c.half_without_card) add("play2.needs.card", { card: cardName(c.half_without_card) });
    if (c.half_if_below) {
      // the cards that raise what it needs, from the model, never a name typed here
      const raisers = cards.filter((x) => x.id !== card.id && x.effects.some((f) => f.target === c.half_if_below!.component && f.sign > 0 && !f.side)).map((x) => cardName(x.id));
      add(raisers.length ? "play2.needs.below_cards" : "play2.needs.below", { cards: list(raisers) });
    }
    if (c.needs_partners || (card.needs_partners && !e.side)) add("play2.needs.partners", {});
    if (c.unless_card_in_scope) add("play2.needs.unless_scope", { card: cardName(c.unless_card_in_scope) });
    if (c.unless_card_in_force) add("play2.needs.unless_force", { card: cardName(c.unless_card_in_force) });
  }
  return out;
}

/** What choosing one region rather than all of Wales changes, for a card that offers both. */
export function scopeChoiceKey(card: Pick<Card, "scope">): string | null {
  return card.scope === "national_or_region" ? "play2.card.scope_choice" : card.scope === "region" ? "play2.card.scope_region" : null;
}
