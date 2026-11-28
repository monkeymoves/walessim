/**
 * Effects held while their cause stands: working projects (scaled by level, after their bedding
 * in time and ramp, by R4 need where a lift lands and by R1 roots), pairs while their partners are
 * within reach (with need), and laws in force.
 *
 * Each step the engine works out what every held cause should be adding now (the target) and
 * compares it with what the ledger says it has added so far. The difference is applied through
 * `ctx.change`, so an upgrade adds only the extra, a broken pair or a repealed law takes its lift
 * back, and every point has a Why?.
 */
import { countProjects, siteCouncils } from "./conditions";
import { causeKeyOf, type StepCtx } from "./ctx";
import { effectAmount, effectTargets, type Origin } from "./effects";
import { needFactor, needOn } from "./need";
import { gradeFactor } from "./places";
import { specialStands } from "./specials";
import { boundYoung } from "./spread-young";
import { stepsOf } from "./time";
import type {
  BoardModel, BoardState, Cause, Contribution, CouncilCode, Effect, LinkId, NodeId, PairDef, PairPartner,
  ProjectDef, ProjectState, RuleId, WhyQuantity,
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

/** Rules whose contributions are made fresh each step by spread.ts, never held. */
const RUN_RULES = new Set<RuleId>([RULE_IDS.jobsTravelHome, RULE_IDS.pricesUpTheLine, RULE_IDS.youngFollowWork]);
const HELD_CAUSES = new Set<Cause["kind"]>(["project", "pair", "law"]);

/** A stable key for a cause (defined in ctx.ts, where the ledger folds by it). */
export const causeKey = causeKeyOf;

const heldKey = (x: { council: CouncilCode | null; quantity: WhyQuantity; rule: RuleId; cause: Cause; via?: { link: LinkId } }): string =>
  `${causeKey(x.cause)}|${x.council}|${x.quantity}|${x.rule}|${x.via?.link ?? ""}`;

/** The fraction of an effect working `age` steps after its cause started: nothing until `after_years`, then rising a little each step over `ramp_years`. */
export function ramp(model: BoardModel, effect: Effect, age: number): number {
  const after = stepsOf(model, effect.after_years ?? 0);
  if (age < after) return 0;
  const r = stepsOf(model, effect.ramp_years ?? 0);
  return r > 0 ? Math.min(1, (age - after + 1) / r) : 1;
}

/** A place visit's grade scales the project it is about (rule V1, places.ts). 1 when not visited. */
export function projectGradeFactor(model: BoardModel, p: ProjectState): number {
  return p.grade ? gradeFactor(model, p.grade) : 1;
}

/** The step a law in force was last passed, read from the log. */
export function lawPassedStep(state: BoardState, law: string): number {
  let passed = 0;
  for (const e of state.log) if (e.action.kind === "law" && e.action.law === law && e.action.pass) passed = e.at;
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

/** How a project scales its own lifts: R4 need where the lift lands and R1 roots. Absent for pairs' roots and for laws. */
interface Growth {
  /** R1 `roots` of the project (1 when R1 is off). */
  roots: number;
  /** Apply R4 need to measure lifts. */
  need: boolean;
}

const NO_GROWTH: Growth = { roots: 1, need: false };

/**
 * Push the held targets of some effects. A project's lift is split into its own part (its rule),
 * the R4 need part and the R1 roots part, each its own held record with the same cause, so a Why?
 * shows how much came from the project, from need and from roots.
 */
function collect(model: BoardModel, state: BoardState, effects: readonly Effect[], origin: Origin, cause: Cause, factor: number, age: number, rule: RuleId, out: Held[], growth: Growth = NO_GROWTH): void {
  for (const e of effects) {
    const f = ramp(model, e, age);
    const amt = effectAmount(e, factor);
    if (!amt || f === 0) continue;
    const jobs = e.kind === "measure" && !!e.jobs;
    for (const t of effectTargets(model, state, e, origin)) {
      const via = t.via ? { via: t.via } : {};
      const base = amt.amount * f;
      out.push({ council: t.council, quantity: amt.quantity, rule: t.rule ?? e.rule ?? rule, cause, target: base, jobs, ...via });
      const need = growth.need && e.kind === "measure" && base > 0 ? needFactor(model, t.council, e.measure) : 1;
      if (need !== 1) out.push({ council: t.council, quantity: amt.quantity, rule: RULE_IDS.need, cause, target: base * (need - 1), jobs, ...via });
      const grows = e.kind === "measure" || e.kind === "young_adults";
      if (grows && growth.roots !== 1) out.push({ council: t.council, quantity: amt.quantity, rule: RULE_IDS.roots, cause, target: base * need * (growth.roots - 1), jobs, ...via });
    }
  }
}

/** The level a project works at: one higher for a skills college once Firms that train their own works (`colleges_up`), at most 3. */
export const workingLevel = (def: ProjectDef, level: number, collegesUp: boolean): number =>
  collegesUp && def.tags.includes("college") ? Math.min(3, level + 1) : level;

/** What every held cause should be adding now, at step `step`. */
export function heldTargets(model: BoardModel, state: BoardState, step: number): Held[] {
  const out: Held[] = [];
  const collegesUp = specialStands(model, state, "colleges_up");
  for (const p of state.projects) {
    if (p.status !== "working") continue;
    const def = model.projects.find((d) => d.id === p.project);
    if (!def) continue;
    const origin = { councils: siteCouncils(model, p) };
    const lf = (def.level_factor[workingLevel(def, p.level, collegesUp) - 1] ?? 1) * projectGradeFactor(model, p);
    const cause: Cause = { kind: "project", project: p.project, site: p.site };
    const need = needOn(model);
    collect(model, state, def.effects, origin, cause, lf, step - p.readyStep, def.rule ?? `project:${def.id}`, out, { roots: p.roots ?? 1, need });
    for (const pair of model.pairs) {
      if (pair.project !== p.project || !pairApplies(model, state, pair, p)) continue;
      collect(model, state, pair.effects, origin, { kind: "pair", pair: pair.id, site: p.site }, lf, Number.MAX_SAFE_INTEGER, pair.rule ?? `pair:${pair.id}`, out, { roots: 1, need });
    }
  }
  for (const id of state.laws) {
    const law = model.laws.find((l) => l.id === id);
    if (!law) continue;
    const everywhere = law.effects.map((e) => ({ ...e, where: e.where ?? "everywhere" })) as Effect[];
    collect(model, state, everywhere, { councils: [...model.game.councils] }, { kind: "law", law: id }, 1, step - lawPassedStep(state, id), law.rule ?? `law:${id}`, out);
  }
  return out;
}

type Applied = Map<string, { sum: number; first: Contribution }>;

/**
 * The sums so far for a ledger array, and how many of its records they cover. The ledger only
 * grows by push within a year (`foldLedger` makes a new array when a year closes, and a clone is a
 * new array), so a later call reads only the records added since. Saves a scan of the whole
 * ledger every step (the bots' look ahead is most of the balance run).
 */
const appliedCache = new WeakMap<readonly Contribution[], { upTo: number; sums: Applied }>();

function addTo(sums: Applied, c: Contribution): void {
  if (!HELD_CAUSES.has(c.cause.kind) || RUN_RULES.has(c.rule) || c.quantity === "coins" || c.quantity === "fairness") return;
  // A law's backing is a standing part (standing.ts), not a held effect: never take it back here.
  // (Playtest 9 must-fix 2: it was taken back the step after the law passed, while the moods kept it.)
  if (c.cause.kind === "law" && c.quantity === "backing") return;
  const k = heldKey(c);
  const got = sums.get(k);
  if (got) got.sum += c.delta;
  else sums.set(k, { sum: c.delta, first: c });
}

/** What held causes have added so far, by key, with the first record for each key. Read only: the map is cached. */
function appliedSoFar(ledger: readonly Contribution[]): Applied {
  let cached = appliedCache.get(ledger);
  if (!cached || cached.upTo > ledger.length) {
    cached = { upTo: 0, sums: new Map() };
    appliedCache.set(ledger, cached);
  }
  for (let i = cached.upTo; i < ledger.length; i++) addTo(cached.sums, ledger[i]!);
  cached.upTo = ledger.length;
  return cached.sums;
}

/** Bring every held effect to its target for this step. */
export function applyHeld(ctx: StepCtx): void {
  const targets = new Map<string, Held>();
  for (const h of heldTargets(ctx.model, ctx.state, ctx.step)) {
    const k = heldKey(h);
    const got = targets.get(k);
    if (got) got.target += h.target;
    else targets.set(k, { ...h });
  }
  const applied = appliedSoFar(ctx.state.ledger);
  for (const [k, h] of targets) {
    const gap = h.target - (applied.get(k)?.sum ?? 0);
    // Young adults stay inside the S3 floor and ceiling; what is held back is tried again next step.
    const delta = h.quantity === "young_adults" ? boundYoung(ctx.model, ctx.state, h.council, gap) : gap;
    if (Math.abs(delta) < 1e-6) continue;
    ctx.change({ council: h.council, quantity: h.quantity, delta, rule: h.rule, cause: h.cause, jobs: h.jobs, ...(h.via ? { via: h.via } : {}) });
  }
  for (const [k, a] of applied) {
    if (targets.has(k) || Math.abs(a.sum) < 1e-6) continue;
    const c = a.first;
    const back = c.quantity === "young_adults" && c.council ? boundYoung(ctx.model, ctx.state, c.council, -a.sum) : -a.sum;
    if (Math.abs(back) < 1e-6) continue;
    ctx.change({ council: c.council, quantity: c.quantity, delta: back, rule: c.rule, cause: c.cause, ...(c.via ? { via: c.via } : {}) });
  }
}

/**
 * Rail link quality now: the 2026 quality plus working link projects (steps times level), one
 * more step on an upgraded link once Trains all evening and on Sundays works (`links_up`), at most 3.
 */
export function applyLinkQuality(model: BoardModel, state: BoardState): void {
  const linksUp = specialStands(model, state, "links_up");
  for (const l of model.links) {
    if (l.kind !== "rail") continue;
    const base = l.quality ?? 1;
    let q = base;
    for (const p of state.projects) {
      if (p.status !== "working" || p.site.link !== l.id) continue;
      const def = model.projects.find((d) => d.id === p.project);
      for (const e of def?.effects ?? []) if (e.kind === "link_quality") q += e.steps * p.level;
    }
    if (linksUp && q > base) q += 1;
    state.linkQuality[l.id] = Math.max(1, Math.min(3, q)) as 1 | 2 | 3;
  }
}
