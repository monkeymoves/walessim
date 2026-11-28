/**
 * Effects: where one lands (`effectTargets`), how big it is, and applying it once
 * (`applyOnce`, for events, responses, visits and laws' backing). Effects held while a project,
 * pair or law stands are in held.ts.
 */
import { allHold, neighbours } from "./conditions";
import type { StepCtx } from "./ctx";
import { shiftMoods } from "./people-moods";
import { boundYoung } from "./spread-young";
import type {
  BoardModel, BoardState, Cause, CouncilCode, Effect, LinkId, NodeId, RuleId, WhyQuantity,
} from "./types";
import { RULE_IDS } from "./types";

/** One council an effect reaches, and the link it travelled if any. */
export interface Target {
  council: CouncilCode;
  via?: { link: LinkId; from: NodeId };
  /** The spread rule that carried it (S4 for downstream). */
  rule?: RuleId;
}

/** Where an effect starts: the site's councils (one, or both ends of a link). */
export interface Origin {
  councils: CouncilCode[];
}

const inPlay = (model: BoardModel): Set<CouncilCode> => new Set(model.game.councils);

/** River links from `code` to councils in play directly downstream. */
export function riverDown(model: BoardModel, code: CouncilCode): { link: LinkId; to: CouncilCode }[] {
  const play = inPlay(model);
  return model.links
    .filter((l) => l.kind === "river" && l.from === code && play.has(l.to))
    .map((l) => ({ link: l.id, to: l.to }))
    .sort((a, b) => (a.link < b.link ? -1 : a.link > b.link ? 1 : 0));
}

/** The first link (by id) joining two councils, of any kind. */
function firstLinkBetween(model: BoardModel, a: CouncilCode, b: CouncilCode): LinkId | undefined {
  const ids = model.links.filter((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a)).map((l) => l.id).sort();
  return ids[0];
}

/**
 * The councils an effect reaches from its origin, each once, with `only_if` judged at the
 * receiving council. Default `where` is "here" (every origin council).
 */
export function effectTargets(model: BoardModel, state: BoardState, effect: Effect, origin: Origin): Target[] {
  const where = effect.where ?? "here";
  const out: Target[] = [];
  const seen = new Set<CouncilCode>();
  const add = (t: Target) => {
    if (seen.has(t.council) || !state.councils[t.council]) return;
    seen.add(t.council);
    out.push(t);
  };
  if (where === "here" || where === "link_ends") origin.councils.forEach((c) => add({ council: c }));
  else if (where === "downstream") {
    for (const c of origin.councils) for (const d of riverDown(model, c)) add({ council: d.to, via: { link: d.link, from: c }, rule: RULE_IDS.waterRunsDownhill });
  } else if (where === "linked") {
    for (const c of origin.councils) {
      for (const n of neighbours(model, c)) {
        const link = firstLinkBetween(model, c, n);
        if (link && !origin.councils.includes(n)) add({ council: n, via: { link, from: c } });
      }
    }
  } else if (where === "flagged") {
    for (const code of model.game.councils) {
      const def = model.councils.find((x) => x.code === code);
      if (effect.flag && def?.flags.includes(effect.flag)) add({ council: code });
    }
  } else model.game.councils.forEach((c) => add({ council: c }));
  return out.filter((t) => allHold(model, state, t.council, effect.only_if ?? []));
}

/** The quantity an effect moves and its size at `factor`, or null for blocks, boosts and specials. */
export function effectAmount(effect: Effect, factor: number): { quantity: WhyQuantity; amount: number } | null {
  switch (effect.kind) {
    case "measure": return { quantity: effect.measure, amount: effect.points * factor };
    case "young_adults": return { quantity: "young_adults", amount: effect.points * factor };
    case "backing": return { quantity: "backing", amount: effect.points * factor };
    case "risk": return { quantity: `risk_${effect.risk}` as WhyQuantity, amount: Math.round(effect.steps * factor) };
    default: return null;
  }
}

export interface OnceOptions {
  /** Size multiplier (an event's size, a project level). Default 1. */
  factor?: number;
  /** Rule the change ends at when the effect names none. */
  rule: RuleId;
}

/**
 * Apply effects once, now (`after_years` and `ramp_years` are for held effects and are ignored).
 * Young adults stay inside the S3 floor and ceiling (`boundYoung`).
 * Backing effects move the groups' moods (all, or the one named) and Backing with them. Returns the
 * total applied to other quantities.
 */
export function applyOnce(ctx: StepCtx, effects: readonly Effect[], origin: Origin, cause: Cause, opts: OnceOptions): number {
  let total = 0;
  for (const e of effects) {
    const amt = effectAmount(e, opts.factor ?? 1);
    if (!amt || amt.amount === 0) continue;
    for (const t of effectTargets(ctx.model, ctx.state, e, origin)) {
      const rule = t.rule ?? e.rule ?? opts.rule;
      if (e.kind === "backing") {
        shiftMoods(ctx, t.council, amt.amount, e.group, rule, cause);
        continue;
      }
      const delta = amt.quantity === "young_adults" ? boundYoung(ctx.model, ctx.state, t.council, amt.amount) : amt.amount;
      total += ctx.change({
        council: t.council, quantity: amt.quantity, delta, rule, cause,
        ...(t.via ? { via: t.via } : {}), jobs: e.kind === "measure" && !!e.jobs,
      });
    }
  }
  return total;
}
