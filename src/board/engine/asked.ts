/**
 * What a council asks for, and rule P7, "Asked and answered" (playtest 10 must-fix 4: "backing sat
 * at 4.9 whatever I built"). A council asks for its weakest measures (P7 `asked_count`, the
 * "Asking for" line of the council panel). In a council that does not back you (P7 `only_below`),
 * a new project that lifts one of them there, judged when it is started, raises Backing in that
 * council by P7 `points` once it is working, and that thanks fades evenly to nothing over P7 `years` (a standing part, standing.ts, so moods do not undo it).
 * Without a P7 card nothing here happens.
 */
import { siteCouncils } from "./conditions";
import { optParam } from "./rules";
import type { BoardModel, BoardState, CouncilCode, MeasureId, ProjectDef, ProjectState, Site } from "./types";
import { MEASURE_IDS, RULE_IDS } from "./types";

/** Is rule P7 in this model? */
export const hasAnswers = (model: BoardModel): boolean => model.rules.some((r) => r.id === RULE_IDS.answered);

/** P7 params, with their starting values when a model lacks one. */
export const answerPoints = (model: BoardModel): number => optParam(model, RULE_IDS.answered, "points") ?? 0;
export const answerYears = (model: BoardModel): number => Math.max(1, optParam(model, RULE_IDS.answered, "years") ?? 4);

/** How many measures a council asks for (P7 `asked_count`, else two, as the panel always showed). */
const askedCount = (model: BoardModel): number => Math.max(1, Math.round(optParam(model, RULE_IDS.answered, "asked_count") ?? 2));

/** The measures a council is asking for now: its weakest, lowest first (ties by the order of MEASURE_IDS). */
export function askingFor(model: BoardModel, state: BoardState, code: CouncilCode): MeasureId[] {
  const c = state.councils[code];
  if (!c) return [];
  return [...MEASURE_IDS].sort((a, b) => c.measures[a] - c.measures[b]).slice(0, askedCount(model));
}

/** The measures a project lifts where it stands (its own council, or both ends of its link). */
export function liftsWhereBuilt(def: ProjectDef): MeasureId[] {
  const out = new Set<MeasureId>();
  for (const e of def.effects) {
    if (e.kind === "measure" && e.points > 0 && (e.where === undefined || e.where === "here" || e.where === "link_ends")) out.add(e.measure);
  }
  return [...out];
}

/** One council a new build answers: the council, and the asked for measure it lifts there. */
export interface Answer { council: CouncilCode; measure: MeasureId }

/**
 * The councils a new build of `def` at `site` would answer now (rule P7): each site council that does
 * not back you and asks for a measure the project lifts there. Empty without a P7 card.
 */
export function answersOf(model: BoardModel, state: BoardState, def: ProjectDef, site: Site): Answer[] {
  if (!hasAnswers(model) || answerPoints(model) === 0) return [];
  const lifts = liftsWhereBuilt(def);
  // Only a council that does not back you now: it is the lever on a council under the line, not
  // a bonus everywhere (P7 `only_below`, 1; 0 lets every council answer).
  const onlyBelow = (optParam(model, RULE_IDS.answered, "only_below") ?? 1) > 0;
  const backsAt = optParam(model, RULE_IDS.election, "backs_at") ?? 5;
  const out: Answer[] = [];
  for (const council of siteCouncils(model, { site })) {
    if (onlyBelow && (state.councils[council]?.backing ?? 0) >= backsAt) continue;
    const m = askingFor(model, state, council).find((x) => lifts.includes(x));
    if (m) out.push({ council, measure: m });
  }
  return out;
}

/** The share of a project's thanks still felt at `step`: nothing before it works, then less by 1 / `years` each whole year. */
export function answerShare(model: BoardModel, p: ProjectState, step: number, stepsPerYear: number): number {
  if (!p.answers?.length || step < p.readyStep) return 0;
  const whole = Math.floor((step - p.readyStep) / Math.max(1, stepsPerYear));
  return Math.max(0, 1 - whole / answerYears(model));
}
