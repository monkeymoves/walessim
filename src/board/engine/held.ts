/**
 * Effects held while their cause stands: working projects (scaled by level, after their bedding
 * in time and ramp), pairs while their partners are within reach, and laws in force.
 *
 * Each turn the engine works out what every held cause should be adding now (the target) and
 * compares it with what the ledger says it has added so far. The difference is applied through
 * `ctx.change`, so an upgrade adds only the extra, a broken pair or a repealed law takes its lift
 * back, and every point has a Why?.
 */
import { countProjects, siteCouncils } from "./conditions";
import type { TurnCtx } from "./ctx";
import { effectAmount, effectTargets, type Origin } from "./effects";
import { gradeFactor } from "./places";
import type {
  BoardModel, BoardState, Cause, Contribution, CouncilCode, Effect, LinkId, NodeId, PairDef, PairPartner,
  ProjectState, RuleId, WhyQuantity,
} from "./types";
import { RULE_IDS } from "./types";

interface Held {
  council: CouncilCode;
  quantity: WhyQuantity;
  rule: RuleId;
  cause: Cause;
  via?: { link: LinkId; from: NodeId };
  target: number;
  jobs: boolean;
}

/** Rules whose contributions are made fresh each turn by spread.ts, never held. */
const RUN_RULES = new Set<RuleId>([RULE_IDS.jobsTravelHome, RULE_IDS.pricesUpTheLine, RULE_IDS.youngFollowWork]);
const HELD_CAUSES = new Set<Cause["kind"]>(["project", "pair", "law"]);

export function causeKey(c: Cause): string {
  switch (c.kind) {
    case "project": return `project:${c.project}@${c.site.council ?? c.site.link}`;
    case "pair": return `pair:${c.pair}@${c.site.council ?? c.site.link}`;
    case "law": return `law:${c.law}`;
    case "event": return `event:${c.event}`;
    case "response": return `response:${c.event}:${c.response}`;
    case "visit": return `visit:${c.place}`;
    case "start": return `start:${c.start}`;
    case "election": return `election:${c.year}`;
    case "people": return `people:${c.group ?? ""}`;
    default: return c.kind;
  }
}

const heldKey = (x: { council: CouncilCode | null; quantity: WhyQuantity; rule: RuleId; cause: Cause; via?: { link: LinkId } }): string =>
  `${causeKey(x.cause)}|${x.council}|${x.quantity}|${x.rule}|${x.via?.link ?? ""}`;

/** The fraction of an effect working `age` turns after its cause started. */
export function ramp(effect: Effect, age: number): number {
  const after = effect.after_turns ?? 0;
  if (age < after) return 0;
  const r = effect.ramp_turns ?? 0;
  return r > 0 ? Math.min(1, (age - after + 1) / r) : 1;
}

/** A place visit's grade scales the project it is about (rule V1, places.ts). 1 when not visited. */
export function projectGradeFactor(model: BoardModel, p: ProjectState): number {
  return p.grade ? gradeFactor(model, p.grade) : 1;
}

/** The turn a law in force was last passed, read from the steps. */
export function lawPassedTurn(state: BoardState, law: string): number {
  let turn = 0;
  let passed = 0;
  for (const s of state.steps) {
    if (s.kind === "end_turn") turn++;
    else if (s.kind === "law" && s.law === law && s.pass) passed = turn;
  }
  return passed;
}

function partnerHolds(model: BoardModel, state: BoardState, self: ProjectState, code: CouncilCode, within: PairDef["within"], p: PairPartner): boolean {
  const where: "here" | "within_link" = within === "here" ? "here" : "within_link";
  if ("link_quality" in p) {
    return model.links.some((l) => l.kind === "rail" && (l.from === code || l.to === code) && (state.linkQuality[l.id] ?? l.quality ?? 1) >= p.link_quality);
  }
  const cond = "project" in p ? { kind: "project" as const, project: p.project, where } : { kind: "project" as const, tag: p.tag, where };
  const selfCounts = "project" in p ? self.project === p.project : !!model.projects.find((d) => d.id === self.project)?.tags.includes(p.tag);
  return countProjects(model, state, code, cond) - (selfCounts ? 1 : 0) >= 1;
}

/** Does a pair apply to this standing project now? */
export function pairApplies(model: BoardModel, state: BoardState, pair: PairDef, p: ProjectState): boolean {
  const councils = siteCouncils(model, p);
  const any = (partner: PairPartner) => councils.some((c) => partnerHolds(model, state, p, c, pair.within, partner));
  return pair.kind === "together" ? pair.partners.every(any) : !pair.partners.some(any);
}

function collect(model: BoardModel, state: BoardState, effects: readonly Effect[], origin: Origin, cause: Cause, factor: number, age: number, rule: RuleId, out: Held[]): void {
  for (const e of effects) {
    const f = ramp(e, age);
    const amt = effectAmount(e, factor);
    if (!amt || f === 0) continue;
    for (const t of effectTargets(model, state, e, origin)) {
      out.push({
        council: t.council, quantity: amt.quantity, rule: t.rule ?? e.rule ?? rule, cause, target: amt.amount * f,
        jobs: e.kind === "measure" && !!e.jobs, ...(t.via ? { via: t.via } : {}),
      });
    }
  }
}

/** What every held cause should be adding now, at turn `turn`. */
export function heldTargets(model: BoardModel, state: BoardState, turn: number): Held[] {
  const out: Held[] = [];
  for (const p of state.projects) {
    if (p.status !== "working") continue;
    const def = model.projects.find((d) => d.id === p.project);
    if (!def) continue;
    const origin = { councils: siteCouncils(model, p) };
    const lf = (def.level_factor[p.level - 1] ?? 1) * projectGradeFactor(model, p);
    const cause: Cause = { kind: "project", project: p.project, site: p.site };
    collect(model, state, def.effects, origin, cause, lf, turn - p.readyTurn, def.rule ?? `project:${def.id}`, out);
    for (const pair of model.pairs) {
      if (pair.project !== p.project || !pairApplies(model, state, pair, p)) continue;
      collect(model, state, pair.effects, origin, { kind: "pair", pair: pair.id, site: p.site }, lf, Number.MAX_SAFE_INTEGER, pair.rule ?? `pair:${pair.id}`, out);
    }
  }
  for (const id of state.laws) {
    const law = model.laws.find((l) => l.id === id);
    if (!law) continue;
    const everywhere = law.effects.map((e) => ({ ...e, where: e.where ?? "everywhere" })) as Effect[];
    collect(model, state, everywhere, { councils: [...model.game.councils] }, { kind: "law", law: id }, 1, turn - lawPassedTurn(state, id), law.rule ?? `law:${id}`, out);
  }
  return out;
}

/** What held causes have added so far, by key, with the first record for each key. */
function appliedSoFar(ledger: readonly Contribution[]): Map<string, { sum: number; first: Contribution }> {
  const out = new Map<string, { sum: number; first: Contribution }>();
  for (const c of ledger) {
    if (!HELD_CAUSES.has(c.cause.kind) || RUN_RULES.has(c.rule) || c.quantity === "coins" || c.quantity === "fairness") continue;
    const k = heldKey(c);
    const got = out.get(k);
    if (got) got.sum += c.delta;
    else out.set(k, { sum: c.delta, first: c });
  }
  return out;
}

/** Bring every held effect to its target for this turn. */
export function applyHeld(ctx: TurnCtx): void {
  const targets = new Map<string, Held>();
  for (const h of heldTargets(ctx.model, ctx.state, ctx.turn)) {
    const k = heldKey(h);
    const got = targets.get(k);
    if (got) got.target += h.target;
    else targets.set(k, { ...h });
  }
  const applied = appliedSoFar(ctx.state.ledger);
  for (const [k, h] of targets) {
    const delta = h.target - (applied.get(k)?.sum ?? 0);
    if (Math.abs(delta) < 1e-6) continue;
    ctx.change({ council: h.council, quantity: h.quantity, delta, rule: h.rule, cause: h.cause, jobs: h.jobs, ...(h.via ? { via: h.via } : {}) });
  }
  for (const [k, a] of applied) {
    if (targets.has(k) || Math.abs(a.sum) < 1e-6) continue;
    const c = a.first;
    ctx.change({ council: c.council, quantity: c.quantity, delta: -a.sum, rule: c.rule, cause: c.cause, ...(c.via ? { via: c.via } : {}) });
  }
}

/** Rail link quality now: the 2026 quality plus working link projects (steps times level), at most 3. */
export function applyLinkQuality(model: BoardModel, state: BoardState): void {
  for (const l of model.links) {
    if (l.kind !== "rail") continue;
    let q = l.quality ?? 1;
    for (const p of state.projects) {
      if (p.status !== "working" || p.site.link !== l.id) continue;
      const def = model.projects.find((d) => d.id === p.project);
      for (const e of def?.effects ?? []) if (e.kind === "link_quality") q += e.steps * p.level;
    }
    state.linkQuality[l.id] = Math.max(1, Math.min(3, q)) as 1 | 2 | 3;
  }
}
