/**
 * `preview`: the expected changes of an action, at "about" precision, without changing state.
 * Direct effects at full strength (bedding in sets the year, not the size), the first spread hop
 * of new jobs (S1) and of a rise in Work and pay (S2), and the pairs it makes or breaks.
 */
import { effectAmount, effectTargets, type Origin } from "./effects";
import { pairApplies } from "./held";
import { blockers, costOf, projectDef, projectStateId, readyTurnOf, buildTurns, siteOf } from "./projects";
import { echoes } from "./spread";
import type {
  Action, BoardModel, BoardState, Effect, LinkId, PreviewChange, Preview, ProjectState, RuleId, Say,
} from "./types";
import { RULE_IDS } from "./types";

const r2 = (v: number): number => Math.round(v * 100) / 100;

function changesOf(model: BoardModel, state: BoardState, effects: readonly Effect[], origin: Origin, factor: number, startYear: number, rule: RuleId, links: Set<LinkId>): PreviewChange[] {
  const out: PreviewChange[] = [];
  for (const e of effects) {
    const amt = effectAmount(e, factor);
    if (!amt || amt.amount === 0) continue;
    const year = startYear + (e.after_turns ?? 0) * model.game.turn_years;
    for (const t of effectTargets(model, state, e, origin)) {
      const r = t.rule ?? e.rule ?? rule;
      out.push({ council: t.council, quantity: amt.quantity, delta: r2(amt.amount), year, rule: r, ...(t.via ? { via: t.via } : {}) });
      if (t.via) links.add(t.via.link);
      if (e.kind !== "measure" || e.measure !== "work") continue;
      const hops = [...(e.jobs ? [RULE_IDS.jobsTravelHome] : []), ...(amt.amount > 0 ? [RULE_IDS.pricesUpTheLine] : [])];
      for (const id of hops) {
        const output = model.rules.find((x) => x.id === id)?.spread?.output ?? "work";
        for (const h of echoes(model, state, id, t.council, amt.amount)) {
          if (Math.abs(h.amount) < 0.005) continue;
          out.push({ council: h.council, quantity: output, delta: r2(h.amount), year, rule: id, via: { link: h.link.id, from: t.council } });
          links.add(h.link.id);
        }
      }
    }
  }
  return out;
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
  const nowYear = model.game.first_year + (state.turn + 1) * model.game.turn_years;
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
      const turns = action.kind === "build" ? buildTurns(model, state, def, action.site) : 0;
      const year = model.game.first_year + (readyTurnOf(state, turns) + 1) * model.game.turn_years;
      changes = changesOf(model, state, def.effects, origin, factor, year, def.rule ?? `project:${def.id}`, links);
      if (action.kind === "build") {
        const fake: ProjectState = { id: projectStateId(def.id, action.site), project: def.id, site: action.site, level: 1, status: "working", startedTurn: state.turn, readyTurn: state.turn };
        notes = pairNotes(model, state, { ...state, projects: [...state.projects, fake] });
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
      changes = changesOf(model, state, r.effects, origin, 1, nowYear - model.game.turn_years, `event:${action.event}`, links);
    }
  } else {
    const place = model.places.find((p) => p.id === action.place);
    const opt = place?.options?.find((o) => o.id === action.picks[0]);
    if (place) origin = { councils: [place.council] };
    if (place && opt) changes = changesOf(model, state, opt.effects, origin, 1, nowYear - model.game.turn_years, `place:${place.id}`, links);
  }

  const councils = [...new Set([...origin.councils, ...changes.map((c) => c.council)])];
  return { action, allowed: b.length === 0, blockers: b, cost, coinsAfter: state.coins - cost, changes, links: [...links].sort(), councils, notes };
}
