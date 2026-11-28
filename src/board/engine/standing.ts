/**
 * Standing backing: the parts of a council's Backing that do not live in the groups' moods, so
 * they do not drift back as moods move (rule P1). Playtest 9 must-fix 2 and 9: a law's cost went
 * into moods and quietly came back, and a broken deal took 0.5 from every council at once.
 *
 * - A law costs (or wins) its backing points for as long as it stands, in the councils its card
 *   names, and gives them back when it is repealed. Nothing fades.
 * - A broken deal costs P6 `broken_here` in that council only, and fades evenly to nothing over P6
 *   `broken_years`, a step each time a year closes. The fade is its own record (rule P6, the deal),
 *   so Why? names it.
 *
 * Backing = the groups' moods weighted by their shares (people-moods.ts) + the standing parts.
 * What is applied is kept on the council (`standing`), and `settleStanding` records only the
 * change, each part under its own rule and cause.
 */
import type { StepCtx } from "./ctx";
import { groupWeight } from "./people-moods";
import { optParam } from "./rules";
import { stepsOf } from "./time";
import type { BoardModel, BoardState, Cause, CouncilCode, Deal, LawDef, RuleId } from "./types";
import { RULE_IDS } from "./types";

export interface StandingPart {
  /** `law:<id>` or `deal:<council>:<made step>`. */
  key: string;
  /** Backing points in this council, now. */
  points: number;
  rule: RuleId;
  cause: Cause;
}

const round4 = (v: number): number => Math.round(v * 1e4) / 1e4;

/** Backing points a law moves in one council while it stands: flagged councils whole, groups by their share there. */
export function lawPoints(model: BoardModel, law: LawDef, code: CouncilCode): number {
  const def = model.councils.find((c) => c.code === code);
  let total = 0;
  for (const g of model.groups) total += groupWeight(model, g, code);
  let points = 0;
  for (const b of law.backing) {
    if (b.flag && !def?.flags.includes(b.flag)) continue;
    if (b.group) {
      const g = model.groups.find((x) => x.id === b.group);
      points += g && total > 0 ? (b.points * groupWeight(model, g, code)) / total : 0;
    } else points += b.points;
  }
  return round4(points);
}

/** P6 params for a broken deal (0 without a P6 card). */
const brokenHere = (model: BoardModel): number => optParam(model, RULE_IDS.hungTerm, "broken_here") ?? 0;
const brokenYears = (model: BoardModel): number => Math.max(1, optParam(model, RULE_IDS.hungTerm, "broken_years") ?? 4);

/** The share of a broken deal's cost still felt at `step`: 1 when broken, less by 1 / `broken_years` each whole year after. */
export function brokenShare(model: BoardModel, d: Deal, step: number): number {
  if (d.kept !== false || d.brokenStep === undefined) return 0;
  const whole = Math.floor((step - d.brokenStep) / Math.max(1, stepsOf(model, 1)));
  return Math.max(0, 1 - Math.max(0, whole) / brokenYears(model));
}

/** The standing parts of Backing in one council at `step` (default: now). */
export function standingParts(model: BoardModel, state: BoardState, code: CouncilCode, step = state.step): StandingPart[] {
  const out: StandingPart[] = [];
  for (const id of state.laws) {
    const law = model.laws.find((l) => l.id === id);
    if (!law) continue;
    const points = lawPoints(model, law, code);
    if (points !== 0) out.push({ key: `law:${id}`, points, rule: law.rule ?? RULE_IDS.moods, cause: { kind: "law", law: id } });
  }
  for (const d of state.deals) {
    if (d.council !== code) continue;
    const points = round4(-brokenHere(model) * brokenShare(model, d, step));
    if (points !== 0) out.push({ key: `deal:${d.council}:${d.madeStep}`, points, rule: RULE_IDS.hungTerm, cause: { kind: "deal", council: d.council } });
  }
  return out;
}

/** The standing points last applied in a council (what `settleStanding` wrote). */
export const standingApplied = (state: BoardState, code: CouncilCode): number =>
  Object.values(state.councils[code]?.standing ?? {}).reduce((a, b) => a + b, 0);

/**
 * Bring every council's standing parts up to date at `step` (default: the step being run, or the
 * state's step in `act`): each part that changed moves Backing by the difference, recorded under
 * its own rule and cause. Call after a law changes, a deal is judged, and when a year closes.
 */
export function settleStanding(ctx: StepCtx, step = ctx.step): void {
  const { model, state } = ctx;
  for (const code of model.game.councils) {
    const c = state.councils[code];
    if (!c) continue;
    const was = { ...(c.standing ?? {}) };
    const now: Record<string, number> = {};
    const parts = standingParts(model, state, code, step);
    for (const p of parts) now[p.key] = p.points;
    for (const p of parts) {
      const delta = round4(p.points - (was[p.key] ?? 0));
      if (delta !== 0) ctx.change({ council: code, quantity: "backing", delta, rule: p.rule, cause: p.cause });
    }
    for (const [key, points] of Object.entries(was)) {
      if (key in now || points === 0) continue;
      // A part that ended (a law repealed, a deal's anger gone): give its points back.
      const law = key.startsWith("law:") ? key.slice(4) : null;
      const cause: Cause = law ? { kind: "law", law } : { kind: "deal", council: code };
      const rule = law ? model.laws.find((l) => l.id === law)?.rule ?? RULE_IDS.moods : RULE_IDS.hungTerm;
      ctx.change({ council: code, quantity: "backing", delta: round4(-points), rule, cause });
    }
    if (Object.keys(now).length > 0 || c.standing) c.standing = now;
  }
}

/**
 * What a law would do to Backing in each council while it stands, for the laws sheet before it is
 * passed (and what repealing it gives back). Councils it leaves alone are left out.
 */
export function lawBacking(model: BoardModel, lawId: string): { council: CouncilCode; points: number }[] {
  const law = model.laws.find((l) => l.id === lawId);
  if (!law) return [];
  return model.game.councils.map((council) => ({ council, points: lawPoints(model, law, council) })).filter((x) => x.points !== 0);
}
