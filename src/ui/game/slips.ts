// What a "What happened" slip says, decided in one place from one number (cold playtest 5: "Nature and
// floods stayed the same... pulled it down" under a falling arrow; "Fairness stayed the same. a big
// employer leaving pushed it up"). The slip's header shows the bar's own change this turn, the
// sentence says how the named cause relates to that change, and both come from the same whole-point
// move, so a slip can never say "held level" beside an arrow, or "went down" beside a rise.
import type { Slip, StrandChange } from "../../engine/api";

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
