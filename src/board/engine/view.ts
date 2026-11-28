/**
 * `councilView`: one council as the council panel shows it. A pure read of model and state:
 * the moods, risks and measures it shows are written by the clock's step modules.
 */
import { BoardModelError } from "./errors";
import { freshStartHere } from "./roots";
import { param } from "./rules";
import type {
  BoardModel, BoardState, CouncilCode, CouncilView, LinkDef, MeasureId, Mood, ProjectState,
} from "./types";
import { MEASURE_IDS, RULE_IDS } from "./types";

/**
 * Mood words from a 0 to 10 mood, around the election line (rule P4 `backs_at`): more than
 * 1.5 points below is unhappy, below the line uneasy, up to 1.5 above content, then pleased.
 * The 1.5 is a presentation choice, not a model number.
 */
export function moodWord(mood: number, backsAt: number): Mood {
  if (mood < backsAt - 1.5) return "unhappy";
  if (mood < backsAt) return "uneasy";
  if (mood < backsAt + 1.5) return "content";
  return "pleased";
}

/** Does this project stand in this council (or on a link touching it)? */
export function projectTouches(model: BoardModel, p: ProjectState, code: CouncilCode): boolean {
  if (p.site.council !== undefined) return p.site.council === code;
  const link = model.links.find((l) => l.id === p.site.link);
  return !!link && (link.from === code || link.to === code);
}

function direction(link: LinkDef, code: CouncilCode): "in" | "out" | "both" {
  if (link.kind === "rail") return "both";
  return link.from === code ? "out" : "in";
}

export function councilView(model: BoardModel, state: BoardState, code: CouncilCode): CouncilView {
  const def = model.councils.find((c) => c.code === code);
  const now = state.councils[code];
  if (!def || !now) throw new BoardModelError(`No council ${code} on this board`);
  const first = state.history[0]?.councils[code];
  const last = state.history[state.history.length - 1]?.councils[code];
  const estimate = state.step > 0;
  const backsAt = param(model, RULE_IDS.election, "backs_at");

  const measureOf = (indicator: string): MeasureId | null => model.measures.find((m) => m.indicators.includes(indicator))?.id ?? null;
  const real = model.indicators
    .filter((i) => def.real[i.id] !== undefined)
    .map((i) => ({ indicator: i.id, name: i.name, value: def.real[i.id]!, unit: i.unit, year: i.year, source: i.source, measure: measureOf(i.id) }));

  const sorted = [...MEASURE_IDS].sort((a, b) => now.measures[a] - now.measures[b]);
  const pending = state.pending.find((p) => p.kind === "visit" && p.council === code);

  return {
    code,
    name: def.name,
    flags: def.flags,
    measures: MEASURE_IDS.map((id) => ({
      id,
      score: now.measures[id],
      seed: first?.measures[id] ?? now.measures[id],
      change: now.measures[id] - (last?.measures[id] ?? now.measures[id]),
      honesty: estimate ? "game_estimate" : "real",
    })),
    real,
    people: { pop: now.pop, young: now.young, age65: now.age65, honesty: estimate ? "game_estimate" : "real" },
    backing: now.backing,
    backs: now.backing >= backsAt,
    groups: model.groups.map((g) => ({
      group: g.id,
      name: g.name,
      share: g.share_from ? def.real[g.share_from] ?? 0 : 100,
      mood: moodWord(now.moods[g.id]?.mood ?? now.backing, backsAt),
      reason: now.moods[g.id]?.reason,
    })),
    risks: now.risks,
    links: model.links
      .filter((l) => l.from === code || l.to === code)
      .map((l) => ({
        link: l.id,
        kind: l.kind,
        other: l.from === code ? l.to : l.from,
        direction: direction(l, code),
        share: l.share,
        quality: l.kind === "rail" ? state.linkQuality[l.id] ?? l.quality ?? 1 : undefined,
        name: l.name,
      })),
    projects: state.projects.filter((p) => projectTouches(model, p, code)),
    asking: sorted.slice(0, 2),
    momentum: now.momentum,
    freshStart: freshStartHere(model, state, code),
    deal: state.deals.find((d) => d.council === code && d.kept === null) ?? null,
    visit: pending && pending.kind === "visit" ? pending.place : null,
  };
}
