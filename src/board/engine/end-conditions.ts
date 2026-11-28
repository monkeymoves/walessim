/**
 * `EndCondition` tests on the whole board against the 2026 board (types-story.ts): used by the
 * endings (endings.yaml) and by the promise of each start (starts.yaml).
 */
import { param } from "./rules";
import { councilMean, fairnessGap, lowestCouncils } from "./score";
import { yearOfStep } from "./time";
import { inArea } from "./areas";
import type { BoardModel, BoardState, CouncilCode, EndCondition, MeasureId } from "./types";
import { RULE_IDS } from "./types";

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Working keystones on the board. */
export function keystonesStanding(model: BoardModel, state: BoardState): string[] {
  return state.projects
    .filter((p) => p.status === "working" && model.projects.find((d) => d.id === p.project)?.keystone)
    .map((p) => p.project);
}

/** Rail links whose quality is above their 2026 quality. */
export function linksUpgraded(model: BoardModel, state: BoardState): number {
  return model.links.filter((l) => l.kind === "rail" && (state.linkQuality[l.id] ?? l.quality ?? 1) > (l.quality ?? 1)).length;
}

const within = (n: number, c: { at_least?: number; at_most?: number }, defaultAtLeast: number): boolean => {
  const lo = c.at_least ?? (c.at_most === undefined ? defaultAtLeast : 0);
  return n >= lo && (c.at_most === undefined || n <= c.at_most);
};

/** Does one end condition hold for this state? */
export function endHolds(model: BoardModel, state: BoardState, c: EndCondition): boolean {
  const then = state.history[0]?.councils;
  const now = state.councils;
  const measureMean = (board: Record<CouncilCode, { measures: Record<MeasureId, number> }> | undefined, m: MeasureId, codes: CouncilCode[]) =>
    mean(codes.filter((x) => board?.[x]).map((x) => board![x]!.measures[m]));
  switch (c.kind) {
    case "keystones": return within(keystonesStanding(model, state).length, c, 1);
    case "keystone": return keystonesStanding(model, state).includes(c.project);
    case "gap": {
      if (!then) return false;
      const before = fairnessGap(model, then);
      const after = fairnessGap(model, now);
      return c.vs_2026 === "closed" ? after < before : after > before;
    }
    case "lowest_three": {
      if (!then) return false;
      const codes = lowestCouncils(model, then, param(model, RULE_IDS.score, "lowest_count"));
      const before = mean(codes.map((x) => councilMean(then[x]!)));
      const after = mean(codes.map((x) => councilMean(now[x]!)));
      return c.vs_2026 === "higher" ? after > before : after < before;
    }
    case "young_adults": {
      if (!then) return false;
      const codes = inArea(model, c.area);
      const before = mean(codes.map((x) => then[x]?.young ?? 0));
      const after = mean(codes.map((x) => now[x]?.young ?? 0));
      return c.vs_2026 === "held" ? after >= before : after < before;
    }
    case "measure": {
      if (!then) return false;
      const codes = inArea(model, c.area);
      const diff = measureMean(now, c.measure, codes) - measureMean(then, c.measure, codes);
      const by = c.by ?? 0;
      return c.vs_2026 === "up" ? diff > by || (by > 0 && diff >= by) : -diff > by || (by > 0 && -diff >= by);
    }
    case "wales": {
      if (!then) return false;
      const codes = inArea(model);
      const diff = mean(codes.map((x) => councilMean(now[x]!))) - mean(codes.map((x) => councilMean(then[x]!)));
      const by = c.by ?? 0;
      return c.vs_2026 === "better" ? diff > by || (by > 0 && diff >= by) : -diff > by || (by > 0 && -diff >= by);
    }
    case "projects": {
      const n = state.projects.filter((p) => p.status === "working" && (!c.tier || model.projects.find((d) => d.id === p.project)?.tier === c.tier)).length;
      return within(n, c, 1);
    }
    case "links_upgraded": return within(linksUpgraded(model, state), c, 1);
    case "risks_landed": {
      const bad = state.events.filter((e) => !model.events.find((d) => d.id === e.event)?.good).length;
      return bad >= c.at_least;
    }
    case "elections_lost": return state.election.records.filter((r) => r.result === "lost").length >= c.at_least;
    case "deals_kept": return state.deals.filter((d) => d.kept === true).length >= c.at_least;
    case "keystone_finished_after": {
      const late = state.projects.filter((p) => p.status === "working" && model.projects.find((d) => d.id === p.project)?.keystone
        && yearOfStep(model, p.readyStep + 1) > c.year);
      return late.length >= c.at_least;
    }
    case "events_prepared": {
      const outside = state.events.filter((e) => {
        const def = model.events.find((d) => d.id === e.event);
        return def?.origin === "outside" && !def.good;
      });
      // A game with no outside trouble prepared for nothing: the ending is not earned.
      if (outside.length === 0) return false;
      return outside.filter((e) => e.prepared).length / outside.length >= c.share;
    }
    case "no_council_lower": {
      if (!then) return false;
      return inArea(model).every((x) => !now[x] || !then[x] || councilMean(now[x]!) >= councilMean(then[x]!));
    }
    case "event_landed": return state.events.some((e) => e.event === c.event);
  }
}

/** Do all of them hold? An empty list holds (the fallback ending). */
export function allEndHold(model: BoardModel, state: BoardState, cs: readonly EndCondition[]): boolean {
  return cs.every((c) => endHolds(model, state, c));
}
