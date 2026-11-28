/**
 * A deal in plain words (rule P6; playtest 9, must-fix 9: "You broke your deal with Cardiff" and 8
 * councils became 1, though nothing had said a project must be built there). What you must build,
 * where and by when, with projects that would keep it; and afterwards what happened to it and what
 * that did to backing. "Keeps it" is judged by the engine itself (deals.ts `dealKeptBy`,
 * `buildCountsForDeal`, `dealProgress`): any project that lifts the deal's measure and works in
 * that council by the deal's last step, whenever it was started (playtest 10, must-fix 1). A deal is
 * never offered for a measure something there already lifts, so it is never met on the day it is made.
 */
import { t } from "./lang";
import type { ActionOption, BoardModel, BoardState, CouncilCode, Deal, MeasureId } from "../engine/api";
import { buildCountsForDeal, dealKeptBy, dealProgress } from "../engine/api";
import { liftsMeasure } from "./price";
import { ruleParamOf } from "./rules";
import { councilName, measureName, num, orOf, projectName, whenWords } from "./words";

const KEEPERS_SHOWN = 3;

/** Projects that would keep a deal on this measure here, quickest and cheapest first. */
export function dealKeepers(model: BoardModel, measure: MeasureId): string[] {
  return model.projects
    .filter((p) => !p.legacy_of && !p.keystone && liftsMeasure(p, measure))
    .sort((a, b) => a.tier - b.tier || a.build_years - b.build_years || a.cost - b.cost)
    .map((p) => p.id);
}

/** The project that kept a deal, as the engine judges it, or null. */
export function keptBy(model: BoardModel, state: BoardState, d: Deal): string | null {
  const id = dealKeptBy(model, state, d);
  return id ? state.projects.find((p) => p.id === id)?.project ?? null : null;
}

const p6 = (model: BoardModel) => ({
  kept: num(ruleParamOf(model, "P6", "kept_here", 1.5)),
  near: num(ruleParamOf(model, "P6", "kept_near", 0.5)),
  broken: num(ruleParamOf(model, "P6", "broken_here", 1.5)),
  fade: num(ruleParamOf(model, "P6", "broken_years", 4)),
  off: num(ruleParamOf(model, "P6", "deal_discount", 1)),
});

/** What a deal asks, with examples: for an offer (before you take it) or an open deal. */
export function dealAsk(model: BoardModel, council: CouncilCode, measure: MeasureId, dueStep: number): string {
  const keepers = dealKeepers(model, measure).slice(0, KEEPERS_SHOWN).map((id) => projectName(model, id));
  const ask = t("boardui.deal.must", { council: councilName(model, council), measure: measureName(model, measure), when: whenWords(model, dueStep) });
  return keepers.length ? `${ask} ${t("boardui.deal.examples", { list: orOf(keepers) })}` : ask;
}

/** The councils a site stands in: its council, or both ends of its line. */
const siteCouncils = (model: BoardModel, site: { council?: string; link?: string }): CouncilCode[] => {
  if (site.council) return [site.council];
  const l = model.links.find((x) => x.id === site.link);
  return l ? [l.from, l.to] : [];
};

/** For an open deal: each project there that lifts its measure, and whether it works in time to keep it. */
export function dealProjectLines(model: BoardModel, state: BoardState, d: Deal): string[] {
  if (d.kept !== null) return [];
  return dealProgress(model, state, d).map((p) =>
    t(p.inTime ? "boardui.deal.yourKeeps" : "boardui.deal.yourLate", { project: projectName(model, p.project), opens: whenWords(model, p.readyStep + 1) }));
}

/**
 * Whether a build in the build menu would count for an open deal in a council it touches, as the
 * engine judges it (`buildCountsForDeal`). An upgrade changes no deal. "" when no open deal is near.
 */
export function dealBuildWords(model: BoardModel, state: BoardState, o: ActionOption): string {
  const a = o.action;
  if (a.kind !== "build" && a.kind !== "upgrade") return "";
  const councils = siteCouncils(model, a.site);
  const d = state.deals.find((x) => x.kept === null && councils.includes(x.council));
  if (!d) return "";
  const v = { council: councilName(model, d.council), measure: measureName(model, d.measure), when: whenWords(model, d.dueStep) };
  const project = o.project ?? (a.kind === "build" ? a.project : undefined);
  if (a.kind === "upgrade" || !project) return t("boardui.build.dealUpgrade");
  const ready = o.readyStep ?? Number.POSITIVE_INFINITY;
  switch (buildCountsForDeal(model, d, project, councils, ready)) {
    case "counts": return t("boardui.build.dealKeeps", v);
    case "too_late": return t("boardui.build.dealLate", { ...v, opens: whenWords(model, ready + 1) });
    case "other_measure": return t("boardui.build.dealNo", v);
    default: return "";
  }
}

export interface DealWords {
  /** What it asks (open), or what happened (kept or broken). */
  what: string;
  /** What it did, or will do, to backing. */
  backing: string;
  state: "open" | "kept" | "broken";
}

export function dealWords(model: BoardModel, state: BoardState, d: Deal): DealWords {
  const v = { council: councilName(model, d.council), measure: measureName(model, d.measure), when: whenWords(model, d.dueStep), ...p6(model) };
  if (d.kept === true) {
    const by = keptBy(model, state, d);
    return {
      state: "kept",
      what: by ? t("boardui.deal.keptBy", { ...v, project: projectName(model, by) }) : t("boardui.deal.kept", v),
      backing: t("boardui.deal.keptBacking", v),
    };
  }
  if (d.kept === false) return { state: "broken", what: t("boardui.deal.broken", v), backing: t("boardui.deal.brokenBacking", v) };
  return { state: "open", what: `${t("boardui.deal.yours")} ${dealAsk(model, d.council, d.measure, d.dueStep)}`, backing: t("boardui.deal.note", v) };
}

/** The deal rule's sizes, for the offer's foot. */
export const dealNoteVars = p6;

