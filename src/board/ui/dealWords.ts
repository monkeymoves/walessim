/**
 * A deal in plain words (rule P6; playtest 9, must-fix 9: "You broke your deal with Cardiff" and 8
 * councils became 1, though nothing had said a project must be built there). What you must build,
 * where and by when, with projects that would keep it; and afterwards what happened to it and what
 * that did to backing. "Keeps it" is judged as the engine judges it (deals.ts `dealKeptBy`): a
 * project that lifts the deal's measure, started after the deal, working in that council.
 */
import { t } from "./lang";
import type { BoardModel, BoardState, CouncilCode, Deal, MeasureId } from "../engine/api";
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
  const here = (p: BoardState["projects"][number]) =>
    p.site.council === d.council || model.links.some((l) => l.id === p.site.link && (l.from === d.council || l.to === d.council));
  const p = state.projects.find((x) => x.status === "working" && x.startedStep >= d.madeStep && here(x) && liftsMeasure(model.projects.find((q) => q.id === x.project), d.measure));
  return p?.project ?? null;
}

const p6 = (model: BoardModel) => ({
  kept: num(ruleParamOf(model, "P6", "kept_here", 1.5)),
  near: num(ruleParamOf(model, "P6", "kept_near", 0.5)),
  broken: num(ruleParamOf(model, "P6", "broken_here", 1.5)),
  fade: num(ruleParamOf(model, "P6", "broken_years", 4)),
  off: num(ruleParamOf(model, "P6", "deal_discount", 1)),
});

/** What a deal asks, in one sentence with examples: for an offer (before you take it) or an open deal. */
export function dealAsk(model: BoardModel, council: CouncilCode, measure: MeasureId, dueStep: number): string {
  const keepers = dealKeepers(model, measure).slice(0, KEEPERS_SHOWN).map((id) => projectName(model, id));
  const ask = t("boardui.deal.must", { council: councilName(model, council), measure: measureName(model, measure), when: whenWords(model, dueStep) });
  return keepers.length ? `${ask} ${t("boardui.deal.examples", { list: orOf(keepers) })}` : ask;
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

