/**
 * Rule S3, young people follow work and homes (docs/design/v2-board.md sections 4.3 and 16.3.4),
 * bounded and two sided. Owner: package 8. Sizes are rule card params in
 * model/board/rules/spread.yaml.
 *
 * Young adults move one hop along the links S3 names: rail links, and commuting links that are
 * among a council's `links_per_council` strongest by the real Census share (all of them when the
 * card has no such param). They move from the lower to the higher "pull" (Work and pay plus Homes
 * and community, plus or minus R2 momentum, plus `reverse_pull_points` at the valley end of an
 * upgraded line once a `reverse_commute` keystone stands): `pull_per_year` per point of the gap,
 * at most `max_per_year` percentage points, a step's share each step, counted on the smaller of
 * the two councils.
 *
 * Bounds: no council falls below `floor_share` or rises above `ceiling_share` times its real 2026
 * share (from the published figure). Knock-ons where they leave: Work and pay falls
 * `work_per_point` and Welsh and culture `welsh_per_point` for each point lost. Where they arrive:
 * Work and pay rises `work_gain_per_point`, Welsh and culture `welsh_gain_per_point`, and Homes
 * and community falls `homes_per_point`, less what homes projects block (`tag_block` each).
 * A param the card lacks is off, so phase 1's card behaves as it did.
 */
import type { StepCtx } from "./ctx";
import { BoardModelError } from "./errors";
import { momentumPull } from "./momentum";
import { optParam, param, rule } from "./rules";
import { specialStands } from "./specials";
import { blockShare, qualityFactor, railQualityBetween } from "./spread";
import { perStep } from "./time";
import type { BoardModel, BoardState, Cause, CouncilCode, CouncilState, LinkDef, SpreadSpec } from "./types";
import { RULE_IDS } from "./types";

const S3 = RULE_IDS.youngFollowWork;
const VALLEY_FLAGS = ["valley", "coal_valley"];

function spec(model: BoardModel): SpreadSpec {
  const s = rule(model, S3).spread;
  if (!s) throw new BoardModelError(`Rule ${S3} has no spread block`);
  return s;
}

const byId = (a: LinkDef, b: LinkDef): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The links S3 moves people along, sorted by id. Commuting links count when they are among the
 * `links_per_council` strongest (by share) from the council where the workers live.
 */
export function youngLinks(model: BoardModel): LinkDef[] {
  const s = spec(model);
  const play = new Set(model.game.councils);
  const inPlay = model.links.filter((l) => s.links.includes(l.kind) && play.has(l.from) && play.has(l.to));
  const top = optParam(model, S3, "links_per_council");
  if (top === undefined) return inPlay.sort(byId);
  const keep = inPlay.filter((l) => l.kind !== "commute");
  for (const code of model.game.councils) {
    const out = inPlay.filter((l) => l.kind === "commute" && l.from === code)
      .sort((a, b) => (b.share ?? (b.strength ?? 0) / 100) - (a.share ?? (a.strength ?? 0) / 100) || byId(a, b));
    keep.push(...out.slice(0, top));
  }
  return [...new Set(keep)].sort(byId);
}

/** Does a working project with the `reverse_commute` special stand anywhere? (Work comes up the line, for good.) */
const lineTurned = (model: BoardModel, state: BoardState): boolean => specialStands(model, state, "reverse_commute");

/** What draws young adults to a council over a link: Work and pay plus Homes and community, momentum, and an upgraded line's valley end. */
export function youngPull(model: BoardModel, state: BoardState, c: CouncilState, other: CouncilCode, turned = lineTurned(model, state)): number {
  let pull = c.measures.work + c.measures.homes + momentumPull(model, c.momentum);
  const extra = optParam(model, S3, "reverse_pull_points");
  if (extra && turned && railQualityBetween(model, state, c.code, other) >= 2) {
    const flags = model.councils.find((d) => d.code === c.code)?.flags ?? [];
    if (flags.some((f) => VALLEY_FLAGS.includes(f))) pull += extra;
  }
  return pull;
}

/** The real 2026 young adult share of a council (percent), or null. */
const realYoung = (model: BoardModel, code: CouncilCode): number | null => model.councils.find((c) => c.code === code)?.real.young_adults ?? null;

/** People (not points) that may still leave `c` before its floor, or arrive before its ceiling. Infinity without the bound. */
function room(model: BoardModel, c: CouncilState, side: "floor" | "ceiling"): number {
  const share = optParam(model, S3, side === "floor" ? "floor_share" : "ceiling_share");
  const real = realYoung(model, c.code);
  if (share === undefined || real === null) return Infinity;
  const points = side === "floor" ? c.young - share * real : share * real - c.young;
  return Math.max(0, points / 100) * c.pop;
}

/**
 * The S3 floor and ceiling for any change to a council's young adults (projects, pairs, events,
 * visits): the part of `delta` that keeps the share inside its bounds. A change already past a
 * bound in its own direction is cut to nothing; one back towards the range is left whole.
 */
export function boundYoung(model: BoardModel, state: BoardState, code: CouncilCode, delta: number): number {
  const c = state.councils[code];
  const real = realYoung(model, code);
  if (!c || real === null) return delta;
  const floor = optParam(model, S3, "floor_share");
  const ceiling = optParam(model, S3, "ceiling_share");
  if (delta < 0 && floor !== undefined) return Math.min(0, Math.max(delta, floor * real - c.young));
  if (delta > 0 && ceiling !== undefined) return Math.max(0, Math.min(delta, ceiling * real - c.young));
  return delta;
}

/** S3 for one step: young adults move one hop along each pair of councils joined by an S3 link, at most once a pair. */
export function youngFollowWork(ctx: StepCtx): void {
  const { model, state } = ctx;
  const s = spec(model);
  const most = perStep(model, param(model, S3, "max_per_year"));
  const pull = perStep(model, param(model, S3, "pull_per_year"));
  const k = (name: string): number => optParam(model, S3, name) ?? 0;
  const turned = lineTurned(model, state);
  const seen = new Set<string>();
  const cause: Cause = { kind: "people", group: "young" };
  for (const l of youngLinks(model)) {
    const a = state.councils[l.from];
    const b = state.councils[l.to];
    if (!a || !b) continue;
    const pairKey = [l.from, l.to].sort().join("|");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);
    const pa = youngPull(model, state, a, b.code, turned);
    const pb = youngPull(model, state, b, a.code, turned);
    const [lo, hi, gap] = pa < pb ? [a, b, pb - pa] : [b, a, pa - pb];
    if (gap <= 0) continue;
    const q = s.quality_multiplies ? qualityFactor(model, S3, railQualityBetween(model, state, lo.code, hi.code)) : 1;
    // The share moves as people, sized on the smaller council so a big place cannot swamp a small one.
    const want = (Math.min(most, pull * gap) * q / 100) * Math.min(lo.pop, hi.pop);
    const people = Math.min(want, room(model, lo, "floor"), room(model, hi, "ceiling"));
    if (!(people > 0)) continue;
    const left = -ctx.change({ council: lo.code, quantity: "young_adults", delta: -(people / lo.pop) * 100, rule: S3, cause, via: { link: l.id, from: hi.code } });
    if (left <= 0) continue;
    const moved = (left / 100) * lo.pop;
    const gained = ctx.change({ council: hi.code, quantity: "young_adults", delta: (moved / hi.pop) * 100, rule: S3, cause, via: { link: l.id, from: lo.code } });
    lo.pop = Math.round(lo.pop - moved);
    hi.pop = Math.round(hi.pop + moved);
    knockOn(ctx, lo.code, -left, k("work_per_point"), k("welsh_per_point"), 0, cause);
    if (gained > 0) knockOn(ctx, hi.code, gained, k("work_gain_per_point"), k("welsh_gain_per_point"), k("homes_per_point"), cause);
  }
}

/** What a council's young adults moving by `points` does to its measures (negative points: they left). */
function knockOn(ctx: StepCtx, code: CouncilCode, points: number, work: number, welsh: number, homes: number, cause: Cause): void {
  const id = S3;
  if (work) ctx.change({ council: code, quantity: "work", delta: points * work, rule: id, cause });
  if (welsh) ctx.change({ council: code, quantity: "welsh", delta: points * welsh, rule: id, cause });
  if (homes && points > 0) {
    const open = 1 - blockShare(ctx.model, ctx.state, code, id);
    if (open > 0) ctx.change({ council: code, quantity: "homes", delta: -points * homes * open, rule: id, cause });
  }
}
