/**
 * The time line (docs/design/v2-board.md section 16.2.6). Owner: package 9.
 *
 * Package 7 left a working default with the final signature, so the UI can build against it:
 * the past (chapters and moments), now, builds under way, and what is ahead (elections with the
 * result if one were held now, warnings, the promise, deals, the last keystone start, the care
 * bill and the end). Every mark ahead has a `board.timeline.<kind>` sentence; elections show the
 * result if one were held now. Keep the signature (api.ts calls it).
 */
import { countBacking } from "./people";
import { optParam } from "./rules";
import { seasonOf, stepOfYear, yearOfStep } from "./time";
import type { BoardModel, BoardState, CouncilCode, Text, TimelineMark, TimelineView } from "./types";
import { RULE_IDS } from "./types";

const nameOf = (model: BoardModel, code: CouncilCode): Text => model.councils.find((c) => c.code === code)?.name ?? { en: code, cy: code };

/** API: the time line now. Every mark ahead carries a sentence (`board.timeline.<kind>`). */
export function timeline(model: BoardModel, state: BoardState): TimelineView {
  const now = state.step;
  const ahead: TimelineMark[] = [];
  const projected = countBacking(model, state).result;
  for (const y of model.game.election_years) {
    const step = stepOfYear(model, y);
    if (step > now) ahead.push({ kind: "election", step, year: y, projected });
  }
  for (const f of state.forecast) {
    const e = model.events.find((d) => d.id === f.event);
    if (!e) continue;
    ahead.push({ kind: "warning", fromStep: f.fromStep, toStep: f.toStep, event: f.event, councils: [...f.councils], good: e.good, say: { key: "board.timeline.warning", vars: { event: e.name } } });
  }
  const promiseStep = stepOfYear(model, state.promise.byYear);
  if (state.promise.kept === null && promiseStep > now) {
    const text = model.starts.find((x) => x.id === state.start)?.promise.text;
    ahead.push({ kind: "promise", step: promiseStep, say: { key: "board.timeline.promise", vars: { year: state.promise.byYear, ...(text ? { promise: text } : {}) } } });
  }
  for (const d of state.deals) {
    if (d.kept !== null || d.dueStep <= now) continue;
    const vars = { council: nameOf(model, d.council), measure: model.measures.find((m) => m.id === d.measure)?.name ?? d.measure, year: yearOfStep(model, d.dueStep) };
    ahead.push({ kind: "deal", step: d.dueStep, council: d.council, say: { key: "board.timeline.deal", vars } });
  }
  const lastKeystone = stepOfYear(model, model.game.keystone_last_start_year + 1) - 1;
  if (lastKeystone >= now) ahead.push({ kind: "keystone_last_start", step: lastKeystone, say: { key: "board.timeline.keystone_last_start", vars: { year: model.game.keystone_last_start_year } } });
  const careFrom = optParam(model, RULE_IDS.careBill, "from_year");
  if (careFrom !== undefined && stepOfYear(model, careFrom) > now) ahead.push({ kind: "care_bill", step: stepOfYear(model, careFrom), say: { key: "board.timeline.care_bill", vars: { year: careFrom } } });
  ahead.push({ kind: "end", step: model.game.steps, say: { key: "board.timeline.end", vars: { year: model.game.end_year } } });
  const at = (m: TimelineMark): number => ("fromStep" in m ? m.fromStep : m.step);
  ahead.sort((a, b) => at(a) - at(b) || a.kind.localeCompare(b.kind));

  const underWay = state.projects
    .filter((p) => p.status === "building")
    .map((p) => ({
      id: p.id, project: p.project, site: { ...p.site } as typeof p.site, startedStep: p.startedStep, readyStep: p.readyStep,
      keystone: !!model.projects.find((d) => d.id === p.project)?.keystone,
    }))
    .sort((a, b) => a.readyStep - b.readyStep || a.id.localeCompare(b.id));

  return {
    step: now, steps: model.game.steps, year: yearOfStep(model, now), season: seasonOf(model, now),
    chapters: [...state.story.chapters], moments: [...state.story.moments], underWay, ahead,
  };
}
