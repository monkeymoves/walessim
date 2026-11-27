// What a "What happened" slip says, decided in one place from one number (cold playtest 5: "Nature and
// floods stayed the same... pulled it down" under a falling arrow; "Fairness stayed the same. a big
// employer leaving pushed it up"). The slip's header shows the bar's own change this turn, the
// sentence says how the named cause relates to that change, and both come from the same whole-point
// move, so a slip can never say "held level" beside an arrow, or "went down" beside a rise.
import type { PostItem, Slip, StrandChange } from "../../engine/api";

export type SlipDir = "up" | "down" | "level";

export interface SlipWording {
  /** The bar's change this turn in whole points (what the header shows); 0 for a 2050-marker slip. */
  net: number;
  /** The header's arrow: the bar's own direction, or level (no arrow). A 2050-marker slip points the cause's way. */
  dir: SlipDir;
  /** How the named cause sits against the bar's change: it moved it ("with"), it was outweighed ("against"), or the bar held ("level"). */
  relation: "with" | "against" | "level";
  /** The i18n key for the sentence. */
  key: string;
  /** Where {cause} sits in the English sentence: at the start (keep its capital) or mid-sentence. */
  causeAt: "start" | "mid";
}

export function slipWording(sl: Slip, strands: StrandChange[]): SlipWording {
  const causeUp = sl.delta >= 0;
  if (sl.part === "stock") {
    return { net: 0, dir: causeUp ? "up" : "down", relation: "with", key: causeUp ? "game.changed.stock_up" : "game.changed.stock_down", causeAt: "start" };
  }
  const ch = strands.find((c) => c.strand === sl.strand);
  const net = ch ? ch.pipsAfter - ch.pipsBefore : sl.pipChange ?? 0;
  const dir: SlipDir = net > 0 ? "up" : net < 0 ? "down" : "level";
  const relation = net === 0 ? "level" : net > 0 === causeUp ? "with" : "against";
  if (relation === "level") return { net, dir, relation, key: causeUp ? "game.changed.held_up" : "game.changed.held_down", causeAt: "mid" };
  if (relation === "against") return { net, dir, relation, key: causeUp ? "game.changed.against_up" : "game.changed.against_down", causeAt: "start" };
  if (sl.recovery) return { net, dir, relation, key: sl.cause.kind === "card" ? "game.changed.recovery_card" : "game.changed.recovery", causeAt: "mid" };
  if (sl.rule === "R25" && sl.cause.kind === "card") return { net, dir, relation, key: "game.changed.ripple", causeAt: "mid" };
  if (sl.sideEffect) return { net, dir, relation, key: "game.changed.side", causeAt: "mid" };
  return { net, dir, relation, key: causeUp ? "game.changed.up" : "game.changed.down", causeAt: "mid" };
}

/**
 * How much of a crisis landed, in words, from the final multiplier on the hit (cards that got Wales
 * ready, coins spent, repairs put off, all together). The bands sit halfway between the shares they
 * name, so 1 coin on its own (0.5) is "half", 2 coins (0.25) "a quarter", and ready plus 1 coin (0.35)
 * "about a third", never "a quarter".
 */
export function shareOfHit(hit: number): "all" | "most" | "half" | "third" | "quarter" | "little" {
  if (hit >= 0.95) return "all";
  if (hit >= 0.6) return "most";
  if (hit >= 0.42) return "half";
  if (hit >= 0.29) return "third";
  if (hit >= 0.18) return "quarter";
  return "little";
}

/** A line on the results step about a card starting work: an i18n key and its fill-ins. */
export interface StartLine { key: string; card: string; vars: Record<string, number> }

/**
 * When a slow card's work shows (cold playtest 7, item 8: "Works from 2034" first seen in the 2038
 * results, and Everyone online, "works from 2030", never reported). A card works from the start of a
 * turn, so its results show when that turn ends. After each turn: a card that started work in it but
 * moved no goal a whole point says so; a card that starts next turn says which results will show it.
 */
export function startLines(
  o: { term: number; year: number; arrivals: PostItem[]; slips: Pick<Slip, "cause">[] },
  post: PostItem[],
): StartLine[] {
  const out: StartLine[] = [];
  const firstOf = (p: PostItem) => p.firstTerm ?? p.arrivesTerm;
  const started = [...o.arrivals, ...post.filter((p) => p.arrivesTerm > o.term)].filter((p) => firstOf(p) === o.term && p.playedTerm < o.term);
  const seen = new Set<string>();
  for (const p of started) {
    const key = `${p.playedTerm}:${p.card}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const moved = o.slips.some((sl) => sl.cause.kind === "card" && sl.cause.id === p.card && sl.cause.term === p.playedTerm);
    if (!moved) out.push({ key: "play5.changed.started_quiet", card: p.card, vars: {} });
  }
  for (const p of post) {
    if (firstOf(p) !== o.term + 1 || p.playedTerm > o.term) continue;
    out.push({ key: "play5.changed.starts_next", card: p.card, vars: { from: o.year + 4, to: o.year + 8 } });
  }
  return out;
}
