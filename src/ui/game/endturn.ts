import type { Card, Text } from "../../model/schema";
// The end-of-turn sheet's words for saved coins (plain-wales 3.3; cold playtest 5, item 6).

/**
 * The line under "Save {n} for a crisis": what the coins are for. A crisis can use 2; if none comes, up
 * to `carry` carry over and the rest are lost. Turn 1 of a first game has its own line already.
 */
export function saveNoteKey(save: number, carry: number, first: boolean, last: boolean): string | null {
  if (save <= 0 || first) return null;
  if (last) return "play.endturn.save_note_last";
  return save > carry ? "play.endturn.save_note_some" : "play.endturn.save_note";
}

/** One line of the results step's account of the coins: an i18n key and its count. */
export interface FundLine { key: string; n?: number }

/**
 * What happened to the coins not spent on cards, from the engine's own numbers (cold playtest 6,
 * item 2: "You saved 5" when only 2 could be saved). The fund is what the player saved
 * (`contingencyHeld`); coins left unsaved were lost at the end of the plan (`coinsNotSaved`); a crisis
 * used some; up to `carry` of the rest carry over, except after the last turn; the rest are lost.
 */
export function fundWords(o: { caretaker: boolean; contingencyHeld: number; coinsNotSaved?: number; shock: { response: number } | null }, carry: number, last: boolean): FundLine[] {
  if (o.caretaker) return [];
  const held = Math.max(0, o.contingencyHeld);
  const lostNow = Math.max(0, o.coinsNotSaved ?? 0);
  if (held <= 0 && lostNow <= 0) return [{ key: "play.result.all_spent" }];
  const used = Math.min(held, o.shock?.response ?? 0);
  const carried = last ? 0 : Math.min(carry, held - used);
  const lost = lostNow + (held - used - carried);
  const out: FundLine[] = [];
  if (held > 0) {
    out.push({ key: "play.result.fund", n: held });
    out.push(!o.shock ? { key: "play.result.no_crisis" } : used > 0 ? { key: "play.result.fund_used", n: used } : { key: "play2.result.fund_kept" });
  }
  if (carried > 0) out.push({ key: "play.result.carried", n: carried });
  if (lost > 0) out.push({ key: "play.result.lost", n: lost });
  return out;
}

/** A line of the visit invitation: an i18n key and its fill-ins, or a card's own authored line. */
export type WhyLine = { key: string; vars: Record<string, string | number> } | { text: Text };

/**
 * The visit invitation for the cards that asked (cold playtest 6, item 8): "You played X." then the
 * card's own line on what links it to this board, then, for cards that all work later, that work
 * starts now and it works from its year, never "it is being built there now" for a card that works
 * in 2038.
 */
export function visitWhyLines(
  state: { year: number },
  cards: string[],
  cardOf: (id: string) => Pick<Card, "visit_why" | "delay" | "arrival"> | undefined,
  list: (ids: string[]) => string,
): WhyLine[] {
  const out: WhyLine[] = [{ key: cards.length > 1 ? "play2.visit.played_many" : "play2.visit.played_one", vars: { card: list(cards) } }];
  const why = cards.map((id) => cardOf(id)?.visit_why).find(Boolean);
  if (why) out.push({ text: why });
  const firstOf = (id: string) => cardOf(id)?.arrival?.first ?? cardOf(id)?.delay ?? 0;
  if (cards.every((id) => firstOf(id) > 0)) out.push({ key: "play2.visit.slow", vars: { year: state.year + 4 * Math.min(...cards.map(firstOf)) } });
  else out.push({ key: "play2.visit.now", vars: {} });
  return out;
}

/**
 * The most coins worth saving for a crisis (cold playtest 6, item 2): a crisis can use at most 2, and
 * if none comes up to `carry` carry over, so the smaller of the two. With no crisis possible (turn 1
 * of a first game) only the carry counts.
 */
export function saveCap(carry: number, noCrisis: boolean): number {
  const crisisMax = 2;
  return noCrisis ? carry : Math.min(crisisMax, carry);
}

/**
 * The key for what the player spent on a crisis, said so it can sit beside the fund line (cold
 * playtest 6, item 3: "You did not spend a coin on it" next to "You spent every coin on cards"): with
 * nothing saved there was nothing to spend, and the line says that.
 */
export function responseKey(pips: number, held?: number): string {
  if (pips >= 2) return "game.changed.response_two";
  if (pips === 1) return "game.changed.response_one";
  return held != null && held <= 0 ? "play2.crisis.response_none_saved" : "game.changed.response_nothing";
}
