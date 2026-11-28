/**
 * What each action does to the draft once `blockers` has allowed it: build, upgrade, pass or
 * repeal a law, and settle a place visit's grade on the project it scales. Responses are
 * events.ts (package 3), called through hooks.ts.
 */
import { siteCouncils } from "./conditions";
import type { StepCtx } from "./ctx";
import { shiftMoods } from "./people-moods";
import { buildDiscounts, buildSteps, costOf, projectDef, projectStateId, reachedBy, readyStepOf, siteOf } from "./projects";
import type { Action, Grade, PlaceDef, ProjectState } from "./types";
import { RULE_IDS } from "./types";

type Build = Extract<Action, { kind: "build" }>;
type Upgrade = Extract<Action, { kind: "upgrade" }>;
type Law = Extract<Action, { kind: "law" }>;
type Visit = Extract<Action, { kind: "visit" }>;

function pay(ctx: StepCtx, cost: number, project: string, site: ProjectState["site"]): void {
  if (cost <= 0) return;
  ctx.change({ council: null, quantity: "coins", delta: -cost, rule: `project:${project}`, cause: { kind: "project", project, site } });
}

/** Start a project: pay, place it as being built (or working at once), mark the places it reaches, offer any place it names. */
export function applyBuild(ctx: StepCtx, a: Build): void {
  const { model, state } = ctx;
  const def = projectDef(model, a.project)!;
  const cost = costOf(model, state, a);
  const free = state.freeProject === a.project;
  const { fresh, deal } = buildDiscounts(model, state, def, a.site);
  // Each discount is written as its own coins record, so its Why? ends at its rule (R3 or P6),
  // and roots.ts can find a fresh start later.
  const cause = { kind: "project", project: a.project, site: a.site } as const;
  if (fresh > 0) ctx.change({ council: null, quantity: "coins", delta: fresh, rule: RULE_IDS.freshStart, cause });
  if (deal > 0) ctx.change({ council: null, quantity: "coins", delta: deal, rule: RULE_IDS.hungTerm, cause });
  pay(ctx, cost + fresh + deal, a.project, a.site);
  if (free) state.freeProject = null;
  const bs = buildSteps(model, state, def, a.site);
  state.projects.push({
    id: projectStateId(a.project, a.site), project: a.project, site: { ...a.site } as ProjectState["site"], level: 1,
    status: bs === 0 ? "working" : "building", startedStep: state.step, readyStep: readyStepOf(state, bs), roots: 1, joined: false,
    ...(free ? { free: true } : {}),
  });
  for (const code of reachedBy(model, a.site)) {
    const c = state.councils[code];
    if (c) c.lastReachedStep = state.step;
  }
  const here = siteOf(model, a.site);
  for (const place of model.places) {
    const offered = place.id === def.visit || !!place.offered_by.projects?.includes(def.id);
    if (!offered || !here.includes(place.council) || state.pending.some((p) => p.kind === "visit" && p.place === place.id)) continue;
    state.pending.push({ kind: "visit", place: place.id, council: place.council, offeredBy: { project: def.id }, since: state.step });
  }
}

export function applyUpgrade(ctx: StepCtx, a: Upgrade): void {
  const p = ctx.state.projects.find((x) => x.id === projectStateId(a.project, a.site))!;
  pay(ctx, costOf(ctx.model, ctx.state, a), a.project, a.site);
  p.level = Math.min(3, p.level + 1) as ProjectState["level"];
}

/** Pass or repeal a law: one law change used, and its backing cost (never coins) where it falls. */
export function applyLaw(ctx: StepCtx, a: Law): void {
  const { model, state } = ctx;
  const law = model.laws.find((l) => l.id === a.law)!;
  state.laws = a.pass ? [...state.laws, a.law] : state.laws.filter((l) => l !== a.law);
  state.lawChangesLeft = Math.max(0, state.lawChangesLeft - 1);
  if (!a.pass) return;
  for (const b of law.backing) {
    for (const code of model.game.councils) {
      if (b.flag && !model.councils.find((c) => c.code === code)?.flags.includes(b.flag)) continue;
      shiftMoods(ctx, code, b.points, b.group, law.rule ?? RULE_IDS.moods, { kind: "law", law: law.id });
    }
  }
}

/** The project a place visit scales: the place's `scales` project standing in or touching its council. */
export function scaledProject(ctx: StepCtx, place: PlaceDef): ProjectState | undefined {
  if (!place.scales) return undefined;
  return ctx.state.projects.find((p) => p.project === place.scales && siteCouncils(ctx.model, p).includes(place.council));
}

/** After a visit is graded: the grade scales its project, the visit is used and the offer closes. */
export function settleVisit(ctx: StepCtx, a: Visit, grade: Grade): void {
  const { model, state } = ctx;
  const place = model.places.find((p) => p.id === a.place);
  const p = place ? scaledProject(ctx, place) : undefined;
  if (p) p.grade = grade;
  state.openVisitSince = state.step;
  state.pending = state.pending.filter((x) => !(x.kind === "visit" && x.place === a.place));
}
