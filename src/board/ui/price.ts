/**
 * One price for a build or an upgrade (playtest 9, must-fix 7: "Costs 1" beside "Build it: 2
 * coins"; Frequent trains 1, then 3). The card's fare, its Build button and the words for any
 * discount all read `priceOf`, which takes the engine's own figure (`ActionOption.cost`, the same
 * `costOf` the preview and `act` use) and says where any difference from the full price comes from.
 * price.test.ts checks every project and discount in real games against the preview and the coins
 * `act` takes.
 */
import { t, tn } from "./lang";
import type { ActionOption, BoardModel, BoardState, CouncilCode, Deal, ProjectDef } from "../engine/api";
import { councilView } from "./engine";
import { measureName, num } from "./words";

export interface Price {
  /** Coins it costs now: the engine's own figure. */
  cost: number;
  /** The project's full price (an upgrade has no discounts, so its full price is its cost). */
  full: number;
  /** The start's free project, the first time. */
  free: boolean;
  upgrade: boolean;
  /** A fresh start (rule R3) at one of its site's councils. */
  fresh: boolean;
  /** The open deal (rule P6) this build would keep, if any. */
  deal: Deal | null;
}

/** The councils a site touches: a council, or both ends of a rail link. */
export function siteCouncilsOf(model: BoardModel, o: ActionOption): CouncilCode[] {
  const a = o.action;
  if (a.kind !== "build" && a.kind !== "upgrade") return [];
  if (a.site.council) return [a.site.council];
  const l = model.links.find((x) => x.id === a.site.link);
  return l ? [l.from, l.to] : [];
}

/** Does a project lift this measure where it stands (rule P6 counts a project that does)? */
export const liftsMeasure = (def: ProjectDef | undefined, measure: string): boolean =>
  !!def?.effects.some((e) => e.kind === "measure" && e.measure === measure && e.points > 0);

export function priceOf(model: BoardModel, state: BoardState, o: ActionOption): Price {
  const def = model.projects.find((p) => p.id === o.project);
  const upgrade = o.action.kind === "upgrade";
  const free = o.action.kind === "build" && state.freeProject === o.project;
  const full = upgrade ? o.cost : def?.cost ?? o.cost;
  let fresh = false;
  let deal: Deal | null = null;
  if (!upgrade && !free && o.cost < full) {
    for (const code of siteCouncilsOf(model, o)) {
      try {
        const v = councilView(model, state, code);
        fresh ||= v.freshStart;
        if (!deal && v.deal && v.deal.kept === null && liftsMeasure(def, v.deal.measure)) deal = v.deal;
      } catch { /* a council outside play: no discount words */ }
    }
  }
  return { cost: o.cost, full, free, upgrade, fresh, deal };
}

/** The figure on the card's fare: "Free" or the coins. */
export const fareWords = (p: Price): string => (p.free ? t("boardui.build.free") : num(p.cost));

/** The words on the card's button: "Build it: 2 coins", "Make it bigger: 3 coins", or free. */
export function goWords(p: Price): string {
  if (p.free) return t("boardui.build.goFree");
  return tn(p.upgrade ? "boardui.build.goBigger" : "boardui.build.go", p.cost);
}

/** Why it costs less than its full price, or "" when it does not. Names the fresh start and the deal. */
export function offWords(model: BoardModel, p: Price): string {
  if (p.free || p.upgrade || p.cost >= p.full) return "";
  const why: string[] = [];
  if (p.fresh) why.push(t("boardui.build.offFresh"));
  if (p.deal) why.push(t("boardui.build.offDeal", { measure: measureName(model, p.deal.measure) }));
  return [t("boardui.build.off", { n: num(p.full - p.cost), full: num(p.full) }), ...why].join(" ");
}
