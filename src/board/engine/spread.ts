/**
 * Rules S1 to S4: effects travelling one hop along real links (docs/design/v2-board.md section 4.3,
 * ADR 0005). Sizes are rule card params in model/board/rules/spread.yaml.
 *
 * - S1 Jobs travel home: new jobs in B lift Work and pay in the places B's workers live, by the
 *   commuting share times `coef` times the rail quality factor. Jobs lost travel home too.
 * - S2 Prices travel up the line: a rise in Work and pay in B lowers Homes and community where
 *   its workers live, less what homes there block.
 * - S3 Young people follow work and homes: bounded and two sided, in spread-young.ts.
 * - S4 Water runs downhill: carried by project effects with `where: downstream` (held.ts), and
 *   the helpers here for storms passing down a river (events.ts).
 *
 * One hop only: what arrives along a link never travels on in the same step. S1 and S2 read the
 * change in the step, so small steps add up to the same as one big one.
 */
import { siteCouncils } from "./conditions";
import { BoardModelError } from "./errors";
import type { StepCtx } from "./ctx";
import { causeKey } from "./held";
import { riverDown } from "./effects";
import { optParam, param, rule } from "./rules";
import { youngFollowWork } from "./spread-young";
import type {
  BoardModel, BoardState, Cause, CouncilCode, LinkDef, RuleId, SpreadSpec,
} from "./types";
import { RULE_IDS } from "./types";

export { optParam } from "./rules";
export { youngFollowWork, youngLinks, youngPull } from "./spread-young";

function spec(model: BoardModel, id: RuleId): SpreadSpec {
  const s = rule(model, id).spread;
  if (!s) throw new BoardModelError(`Rule ${id} has no spread block`);
  return s;
}

/** The best rail quality between two councils (1 if no rail link joins them). */
export function railQualityBetween(model: BoardModel, state: BoardState, a: CouncilCode, b: CouncilCode): number {
  let q = 1;
  for (const l of model.links) {
    if (l.kind !== "rail") continue;
    if ((l.from === a && l.to === b) || (l.from === b && l.to === a)) q = Math.max(q, state.linkQuality[l.id] ?? l.quality ?? 1);
  }
  return q;
}

/** 1 + (quality - 1) * quality_step, from the rule's own `quality_step` or else S1's. */
export function qualityFactor(model: BoardModel, id: RuleId, quality: number): number {
  const step = optParam(model, id, "quality_step") ?? param(model, RULE_IDS.jobsTravelHome, "quality_step");
  return 1 + (quality - 1) * step;
}

/** What one link carries: the real commuting share, or the fallback strength step times `strength_share`. */
export function linkWeight(model: BoardModel, id: RuleId, s: SpreadSpec, l: LinkDef): number {
  if (s.weight === "one") return 1;
  if (s.weight === "share" && l.share !== undefined) return l.share;
  if (l.strength !== undefined) return l.strength * (optParam(model, id, "strength_share") ?? 0);
  return l.share ?? 0;
}

function working(model: BoardModel, state: BoardState, code: CouncilCode) {
  return state.projects
    .filter((p) => p.status === "working" && siteCouncils(model, p).includes(code))
    .map((p) => ({ p, def: model.projects.find((d) => d.id === p.project) }));
}

/** Share (0 to 1) of a spread rule's effect blocked at a council: block effects of projects and laws, and tagged projects. */
export function blockShare(model: BoardModel, state: BoardState, code: CouncilCode, id: RuleId): number {
  const shares: number[] = [];
  for (const { def } of working(model, state, code)) {
    for (const e of def?.effects ?? []) if (e.kind === "block" && e.spread === id) shares.push(e.share);
  }
  const flags = model.councils.find((c) => c.code === code)?.flags ?? [];
  for (const lawId of state.laws) {
    for (const e of model.laws.find((l) => l.id === lawId)?.effects ?? []) {
      if (e.kind !== "block" || e.spread !== id) continue;
      if (e.where === "flagged" && !(e.flag && flags.includes(e.flag))) continue;
      shares.push(e.share);
    }
  }
  const tagBlock = optParam(model, id, "tag_block");
  const tags = rule(model, id).spread?.blocked_by_tags ?? [];
  if (tagBlock !== undefined) {
    for (const { def } of working(model, state, code)) if (def?.tags.some((t) => tags.includes(t))) shares.push(tagBlock);
  }
  return 1 - shares.reduce((left, b) => left * (1 - Math.min(1, Math.max(0, b))), 1);
}

/** Product of boost factors on a spread rule from projects standing at a council. */
export function boostFactor(model: BoardModel, state: BoardState, code: CouncilCode, id: RuleId): number {
  let f = 1;
  for (const { def } of working(model, state, code)) for (const e of def?.effects ?? []) if (e.kind === "boost" && e.spread === id) f *= e.factor;
  return f;
}

/** Does a working project with this special stand at the council? */
export function hasSpecial(model: BoardModel, state: BoardState, code: CouncilCode, special: string): boolean {
  return working(model, state, code).some(({ def }) => def?.effects.some((e) => e.kind === "special" && e.special === special));
}

/** The links a change at `source` travels along under a spec, and the council each reaches. */
function receivers(model: BoardModel, s: SpreadSpec, source: CouncilCode): { link: LinkDef; council: CouncilCode }[] {
  const play = new Set(model.game.councils);
  const out: { link: LinkDef; council: CouncilCode }[] = [];
  for (const l of model.links) {
    if (!s.links.includes(l.kind)) continue;
    if ((s.travel === "to_home" || s.travel === "both_ways") && l.to === source && play.has(l.from)) out.push({ link: l, council: l.from });
    if ((s.travel === "to_work" || s.travel === "both_ways") && l.from === source && play.has(l.to)) out.push({ link: l, council: l.to });
    if (s.travel === "downstream" && l.from === source && play.has(l.to)) out.push({ link: l, council: l.to });
  }
  return out.sort((a, b) => (a.link.id < b.link.id ? -1 : a.link.id > b.link.id ? 1 : 0));
}

interface Input { council: CouncilCode; delta: number; cause: Cause }

/** Group changes by council and first cause, in first seen order. */
function grouped(items: Input[]): Input[] {
  const out = new Map<string, Input>();
  for (const i of items) {
    const k = `${i.council}|${causeKey(i.cause)}`;
    const got = out.get(k);
    if (got) got.delta += i.delta;
    else out.set(k, { ...i });
  }
  return [...out.values()];
}

/** The inputs of a link rule in this step: jobs (both signs) or, for other rules, rises not made by spread. */
function inputs(ctx: StepCtx, id: RuleId, s: SpreadSpec): Input[] {
  if (s.only_from_projects) return grouped(ctx.jobs);
  const runRules = new Set<RuleId>([RULE_IDS.jobsTravelHome, RULE_IDS.pricesUpTheLine, RULE_IDS.youngFollowWork, id]);
  return grouped(ctx.state.ledger
    .filter((c) => c.step === ctx.step && c.quantity === s.input && !c.via && c.delta > 0 && c.council && !runRules.has(c.rule))
    .map((c) => ({ council: c.council!, delta: c.delta, cause: c.cause })));
}

/** Where a change of `delta` at `source` arrives under a link rule now, and how much (sign included). */
export function echoes(model: BoardModel, state: BoardState, id: RuleId, source: CouncilCode, delta: number): { council: CouncilCode; link: LinkDef; amount: number }[] {
  const s = spec(model, id);
  const coef = param(model, id, "coef");
  const reach = receivers(model, s, source);
  if (id === RULE_IDS.jobsTravelHome && hasSpecial(model, state, source, "reverse_commute")) {
    for (const r of receivers(model, { ...s, travel: "to_work" }, source)) {
      if (railQualityBetween(model, state, source, r.council) >= 2) reach.push(r);
    }
  }
  return reach.map((r) => {
    const q = s.quality_multiplies ? qualityFactor(model, id, railQualityBetween(model, state, source, r.council)) : 1;
    const open = 1 - blockShare(model, state, r.council, id);
    const amount = delta * linkWeight(model, id, s, r.link) * coef * q * open
      * boostFactor(model, state, r.council, id) * boostFactor(model, state, source, id);
    return { council: r.council, link: r.link, amount: s.sign * amount };
  });
}

/** S1 and S2: a change at one end of a link moves a quantity at the other end. */
export function spreadAlongLinks(ctx: StepCtx, id: RuleId): void {
  const s = spec(ctx.model, id);
  for (const input of inputs(ctx, id, s)) {
    for (const e of echoes(ctx.model, ctx.state, id, input.council, input.delta)) {
      ctx.change({ council: e.council, quantity: s.output, delta: e.amount, rule: id, cause: input.cause, via: { link: e.link.id, from: input.council } });
    }
  }
}

/** Every link rule in order: S1, S2, then S3 on the board they leave. */
export function runSpread(ctx: StepCtx): void {
  spreadAlongLinks(ctx, RULE_IDS.jobsTravelHome);
  spreadAlongLinks(ctx, RULE_IDS.pricesUpTheLine);
  youngFollowWork(ctx);
}

/** S4 for storms: the councils a river passes through below `code`, nearest first (several hops). */
export function downstreamOf(model: BoardModel, code: CouncilCode): CouncilCode[] {
  const out: CouncilCode[] = [];
  const queue = [code];
  while (queue.length) {
    const c = queue.shift()!;
    for (const d of riverDown(model, c)) {
      if (d.to === code || out.includes(d.to)) continue;
      out.push(d.to);
      queue.push(d.to);
    }
  }
  return out;
}

/**
 * S4 for storms: the share (0 to 1) a storm reaching `code` is cut by what is in the way: rule S4
 * `storm_weaken` for each working flood project here or directly upstream.
 */
export function upstreamCut(model: BoardModel, state: BoardState, code: CouncilCode): number {
  const weaken = param(model, RULE_IDS.waterRunsDownhill, "storm_weaken");
  const up = model.links.filter((l) => l.kind === "river" && l.to === code).map((l) => l.from);
  const places = new Set([code, ...up]);
  const n = state.projects.filter((p) => p.status === "working"
    && model.projects.find((d) => d.id === p.project)?.tags.includes("flood")
    && siteCouncils(model, p).some((c) => places.has(c))).length;
  return Math.min(1, n * weaken);
}
