/**
 * `preview`: the expected changes of an action, at "about" precision, without changing state.
 * Direct effects at full strength (bedding in sets the year, not the size) with R4 need where a lift
 * lands, the first spread hop of new jobs (S1) and of a rise in Work and pay (S2), the pairs it
 * makes or breaks, and notes on a fresh start (R3) and need (R4). Roots start at 1, so a preview
 * shows the size on the day it opens.
 */
import { effectAmount, effectTargets, type Origin } from "./effects";
import { pairApplies } from "./held";
import { dealServed } from "./deals";
import { rebuildAfter } from "./events";
import { blockers, buildDiscounts, buildSteps, costOf, projectDef, projectStateId, readyStepOf, siteOf, yearAfter } from "./projects";
import { needFactor, needOn } from "./roots";
import { yearOfStep } from "./time";
import { echoes } from "./spread";
import type {
  Action, BoardModel, BoardState, Effect, LinkId, PreviewChange, Preview, ProjectDef, ProjectState, RuleId, Say, Site,
} from "./types";
import { RULE_IDS } from "./types";

const r2 = (v: number): number => Math.round(v * 100) / 100;

/** R4 need where a project's lift lands: a factor other than 1 for measure lifts when the card is on. */
const liftNeed = (model: BoardModel, e: Effect, council: string, amount: number, need: boolean): number =>
  need && e.kind === "measure" && amount > 0 ? needFactor(model, council, e.measure) : 1;

function changesOf(model: BoardModel, state: BoardState, effects: readonly Effect[], origin: Origin, factor: number, startYear: number, rule: RuleId, links: Set<LinkId>, need = false): PreviewChange[] {
  const out: PreviewChange[] = [];
  for (const e of effects) {
    const amt = effectAmount(e, factor);
    if (!amt || amt.amount === 0) continue;
    const year = startYear + Math.floor(e.after_years ?? 0);
    for (const t of effectTargets(model, state, e, origin)) {
      const r = t.rule ?? e.rule ?? rule;
      const size = amt.amount * liftNeed(model, e, t.council, amt.amount, need);
      out.push({ council: t.council, quantity: amt.quantity, delta: r2(size), year, rule: r, ...(t.via ? { via: t.via } : {}) });
      if (t.via) links.add(t.via.link);
      if (e.kind !== "measure" || e.measure !== "work") continue;
      const hops = [...(e.jobs ? [RULE_IDS.jobsTravelHome] : []), ...(size > 0 ? [RULE_IDS.pricesUpTheLine] : [])];
      for (const id of hops) {
        const output = model.rules.find((x) => x.id === id)?.spread?.output ?? "work";
        for (const h of echoes(model, state, id, t.council, size)) {
          if (Math.abs(h.amount) < 0.005) continue;
          out.push({ council: h.council, quantity: output, delta: r2(h.amount), year, rule: id, via: { link: h.link.id, from: t.council } });
          links.add(h.link.id);
        }
      }
    }
  }
  return out;
}

/**
 * Notes for a build: a fresh start (rule R3), a deal it keeps (P6), a faster rebuild after trouble
 * (E2), and where need makes a lift do more or less (R4, at most one note each way, the largest).
 */
function growthNotes(model: BoardModel, state: BoardState, def: ProjectDef, site: Site, councils: string[], build: boolean): Say[] {
  const notes: Say[] = [];
  const council = (c: string) => model.councils.find((x) => x.code === c)?.name ?? c;
  if (build) {
    const fresh = buildDiscounts(model, state, def, site).fresh;
    if (fresh > 0) notes.push({ key: "board.build.preview_fresh_start", vars: { n: fresh } });
    const deal = dealServed(model, state, councils, def.id);
    if (deal) notes.push({ key: "board.build.deal", vars: { council: council(deal.council) } });
    const rebuild = councils.map((c) => rebuildAfter(model, state, c)).find((x) => !!x);
    const event = rebuild && model.events.find((e) => e.id === rebuild.record.event);
    if (rebuild && event) notes.push({ key: "board.build.rebuild", vars: { event: event.name, year: yearOfStep(model, rebuild.untilStep) } });
  }
  if (!needOn(model)) return notes;
  const lifts = def.effects.flatMap((e) => (e.kind === "measure" && e.points > 0 && (e.where ?? "here") === "here" ? [e.measure] : []));
  const seen = lifts.flatMap((m) => councils.map((c) => ({ m, c, f: needFactor(model, c, m) })));
  const name = (m: string) => model.measures.find((x) => x.id === m)?.name ?? m;
  const more = seen.filter((x) => x.f > 1).sort((a, b) => b.f - a.f)[0];
  const less = seen.filter((x) => x.f < 1).sort((a, b) => a.f - b.f)[0];
  if (more) notes.push({ key: "board.build.preview_need_more", vars: { measure: name(more.m), council: council(more.c), n: more.f } });
  if (less) notes.push({ key: "board.build.preview_need_less", vars: { measure: name(less.m), council: council(less.c), n: less.f } });
  return notes;
}

/** Pairs a build sets off: "works better here" (together) or "watch out" (apart). */
function pairNotes(model: BoardModel, before: BoardState, after: BoardState): Say[] {
  const notes: Say[] = [];
  for (const p of after.projects) {
    if (p.status !== "working") continue;
    for (const pair of model.pairs) {
      if (pair.project !== p.project) continue;
      const was = before.projects.some((x) => x.id === p.id) && pairApplies(model, before, pair, p);
      const now = pairApplies(model, after, pair, p);
      if (was === now || !now) continue;
      notes.push({ key: pair.kind === "together" ? "board.build.preview_pair" : "board.build.preview_apart", vars: { pair: pair.name, note: pair.note } });
    }
  }
  return notes;
}

export function preview(model: BoardModel, state: BoardState, action: Action): Preview {
  const b = blockers(model, state, action);
  const cost = costOf(model, state, action);
  const links = new Set<LinkId>();
  let changes: PreviewChange[] = [];
  let notes: Say[] = [];
  const nowYear = yearAfter(model, state.step);
  let origin: Origin = { councils: [] };

  if (action.kind === "build" || action.kind === "upgrade") {
    const def = projectDef(model, action.project);
    if (def) {
      origin = { councils: siteOf(model, action.site) };
      if (action.site.link) links.add(action.site.link);
      const standing = state.projects.find((p) => p.id === projectStateId(def.id, action.site));
      const level = standing?.level ?? 0;
      const lf = (l: number) => (l === 0 ? 0 : def.level_factor[l - 1] ?? 1);
      const factor = action.kind === "build" ? lf(1) : lf(Math.min(3, level + 1)) - lf(level);
      const steps = action.kind === "build" ? buildSteps(model, state, def, action.site) : 0;
      const year = yearAfter(model, readyStepOf(state, steps));
      changes = changesOf(model, state, def.effects, origin, factor, year, def.rule ?? `project:${def.id}`, links, needOn(model));
      notes = growthNotes(model, state, def, action.site, origin.councils, action.kind === "build");
      if (action.kind === "build") {
        const fake: ProjectState = { id: projectStateId(def.id, action.site), project: def.id, site: action.site, level: 1, status: "working", startedStep: state.step, readyStep: state.step, roots: 1, joined: false };
        notes.push(...pairNotes(model, state, { ...state, projects: [...state.projects, fake] }));
        if (def.catch) notes.push({ key: "board.build.catch", vars: { catch: def.catch } });
      }
    }
  } else if (action.kind === "law") {
    const law = model.laws.find((l) => l.id === action.law);
    if (law) {
      origin = { councils: [...model.game.councils] };
      const everywhere = law.effects.map((e) => ({ ...e, where: e.where ?? "everywhere" })) as Effect[];
      changes = changesOf(model, state, everywhere, origin, action.pass ? 1 : -1, nowYear, law.rule ?? `law:${law.id}`, links);
      notes.push({ key: "board.build.catch", vars: { catch: law.catch } });
    }
  } else if (action.kind === "respond") {
    const pending = state.pending.find((p) => p.kind === "respond" && p.event === action.event);
    const r = model.events.find((e) => e.id === action.event)?.responses.find((x) => x.id === action.response);
    if (pending && pending.kind === "respond" && r) {
      origin = { councils: pending.councils };
      changes = changesOf(model, state, r.effects, origin, 1, state.year, `event:${action.event}`, links);
    }
  } else if (action.kind === "visit") {
    const place = model.places.find((p) => p.id === action.place);
    const opt = place?.options?.find((o) => o.id === action.picks[0]);
    if (place) origin = { councils: [place.council] };
    if (place && opt) changes = changesOf(model, state, opt.effects, origin, 1, state.year, `place:${place.id}`, links);
  }

  const councils = [...new Set([...origin.councils, ...changes.map((c) => c.council)])];
  return { action, allowed: b.length === 0, blockers: b, cost, coinsAfter: state.coins - cost, changes, links: [...links].sort(), councils, notes };
}
