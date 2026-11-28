/**
 * `Condition` tests evaluated on the board for one council (types-content.ts). Used by event
 * triggers and sizes, place grades, group cares and `requires` cards. Pure reads of model and state.
 *
 * Shared by every package (owner: package 7), so needs, gates, triggers and grades never disagree.
 */
import { frameAtYear } from "./frame";
import { blockOf } from "./time";
import type {
  BoardModel, BoardState, Condition, CouncilCode, LinkKind, MeasureId, ProjectDef, ProjectState,
} from "./types";

/** Councils one link away from `code`, over the given kinds (all kinds by default). Stubs are left out. */
export function neighbours(model: BoardModel, code: CouncilCode, kinds?: LinkKind[]): CouncilCode[] {
  const inPlay = new Set(model.game.councils);
  const out = new Set<CouncilCode>();
  for (const l of model.links) {
    if (kinds && !kinds.includes(l.kind)) continue;
    if (l.from === code && inPlay.has(l.to)) out.add(l.to);
    if (l.to === code && inPlay.has(l.from)) out.add(l.from);
  }
  out.delete(code);
  return [...out].sort();
}

/** The councils a project's site touches: its council, or both ends of its link. */
export function siteCouncils(model: BoardModel, p: Pick<ProjectState, "site">): CouncilCode[] {
  if (p.site.council !== undefined) return [p.site.council];
  const link = model.links.find((l) => l.id === p.site.link);
  if (!link) return [];
  const inPlay = new Set(model.game.councils);
  return [link.from, link.to].filter((c) => inPlay.has(c));
}

/** The council a project is named by: its own, or the first end of its link that is in play. */
export const siteCouncil = (model: BoardModel, p: Pick<ProjectState, "site">): CouncilCode | undefined => siteCouncils(model, p)[0];

export function projectDef(model: BoardModel, id: string): ProjectDef | undefined {
  return model.projects.find((p) => p.id === id);
}

/** A measure in the yearly frame `overYears` before the current step's year, or the 2026 board if the game is younger. */
export function pastMeasure(state: BoardState, code: CouncilCode, measure: MeasureId, overYears: number): number {
  const frame = frameAtYear(state, state.year - overYears);
  return frame?.councils[code]?.measures[measure] ?? state.councils[code]?.measures[measure] ?? 0;
}

/** The future's pressure on a track in the two year block of `step` (default: now), 0 to 1. */
export function trackValue(model: BoardModel, state: BoardState, track: "weather" | "economy" | "prices", step = state.step): number {
  const future = model.futures.find((f) => f.id === state.future);
  const values = future?.tracks[track] ?? [];
  return values[Math.min(Math.max(0, blockOf(model, step)), values.length - 1)] ?? 0;
}

/** Keystones working now, by project id. */
export function keystonesWorking(model: BoardModel, state: BoardState): string[] {
  return state.projects.filter((p) => p.status === "working" && projectDef(model, p.project)?.keystone).map((p) => p.project);
}

type ProjectTest = Extract<Condition, { kind: "project" }>;

/** Projects matching a `project` condition, counted for one council. */
export function countProjects(model: BoardModel, state: BoardState, code: CouncilCode, c: ProjectTest): number {
  const status = c.status ?? "working";
  const reach = new Set<CouncilCode>([code]);
  if (c.where === "within_link") for (const n of neighbours(model, code, c.links)) reach.add(n);
  return state.projects.filter((p) => {
    if (p.status !== status) return false;
    if (c.project && p.project !== c.project) return false;
    if (c.min_level && p.level < c.min_level) return false;
    const def = projectDef(model, p.project);
    if (c.tag && !def?.tags.includes(c.tag)) return false;
    if (c.branch && def?.branch !== c.branch) return false;
    if (c.tier && def?.tier !== c.tier) return false;
    if (c.where === "anywhere") return true;
    return siteCouncils(model, p).some((s) => reach.has(s));
  }).length;
}

function railTouching(model: BoardModel, state: BoardState, code: CouncilCode): number {
  let best = 0;
  for (const l of model.links) {
    if (l.kind !== "rail" || (l.from !== code && l.to !== code)) continue;
    best = Math.max(best, state.linkQuality[l.id] ?? l.quality ?? 1);
  }
  return best;
}

function holdsRaw(model: BoardModel, state: BoardState, code: CouncilCode, c: Condition): boolean {
  const council = state.councils[code];
  const def = model.councils.find((x) => x.code === code);
  switch (c.kind) {
    case "feature": return !!def?.features.includes(c.feature);
    case "flag": return !!def?.flags.includes(c.flag);
    case "tier_open": {
      if (c.tier === 1) return true;
      const tier = model.branches.find((b) => b.id === c.branch)?.tiers[c.tier - 1];
      return !!tier && tier.opens.every((x) => holds(model, state, code, x));
    }
    case "project": return countProjects(model, state, code, c) >= (c.at_least ?? 1);
    case "link_quality": return railTouching(model, state, code) >= c.at_least;
    case "risk": return (council?.risks[c.risk] ?? 0) >= c.at_least;
    case "measure": {
      const now = council?.measures[c.measure] ?? 0;
      if (c.op === "below") return now < (c.value ?? 0);
      if (c.op === "at_least") return now >= (c.value ?? 0);
      const past = pastMeasure(state, code, c.measure, c.over_years ?? 4);
      return c.op === "rising" ? now > past : now < past;
    }
    case "share": {
      const v = c.share === "young_adults" ? council?.young ?? 0 : council?.age65 ?? 0;
      return c.op === "below" ? v < c.value : v >= c.value;
    }
    case "backing": return c.op === "below" ? (council?.backing ?? 0) < c.value : (council?.backing ?? 0) >= c.value;
    case "track": return trackValue(model, state, c.track) >= c.at_least;
    case "year": return (c.from === undefined || state.year >= c.from) && (c.to === undefined || state.year <= c.to);
    case "law": return state.laws.includes(c.law);
    case "momentum": return (council?.momentum ?? "steady") === c.is;
    case "keystone": {
      const working = keystonesWorking(model, state);
      return c.project ? working.includes(c.project) : working.length > 0;
    }
  }
}

/** Does one condition hold for this council? `not: true` inverts it. */
export function holds(model: BoardModel, state: BoardState, code: CouncilCode, c: Condition): boolean {
  const r = holdsRaw(model, state, code, c);
  return c.not ? !r : r;
}

/** Do all of them hold? An empty list holds. */
export function allHold(model: BoardModel, state: BoardState, code: CouncilCode, cs: readonly Condition[], skip?: (c: Condition) => boolean): boolean {
  return cs.every((c) => (skip && skip(c)) || holds(model, state, code, c));
}
