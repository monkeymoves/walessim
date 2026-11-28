/**
 * What holds a council's backing under the line, and the builds that would lift it most
 * (playtest 10, must-fix 3 and 4: five of eight felt nothing they did could matter, "backing sat
 * near 4.9 whatever I built", and Why? said nothing about it). Read from the engine's own state:
 *
 * - rule P1: people compare what they care about with four years ago, and expect it to be better
 *   by `expectedGain` (more after each election). Each measure a group here cares about that has
 *   moved less than that is named with its move.
 * - standing parts (a law, a broken deal) that cost backing here, from `standingParts`.
 * - slipping (rule R2), and a group reason that is not a measure (a broken promise, trouble left,
 *   nothing built within reach).
 * - the builds open here whose preview lifts those measures most here, weighted by the share of
 *   the people who care.
 *
 * Pure: model and state in, words out. panels10.test.ts checks it over many bot games.
 */
import { t } from "./lang";
import type { ActionOption, BoardModel, BoardState, CouncilCode, MeasureId } from "../engine/api";
import { expectedGain, MEASURE_IDS, standingParts } from "../engine/api";
import { councilView, options, preview } from "./engine";
import { reasonWay } from "./causes";
import { ruleParamOf } from "./rules";
import { listOf, measureName, num, projectName, say, signed, tx } from "./words";

export interface Lift {
  option: ActionOption;
  project: string;
  /** Points of the measures people here care about, weighted by who cares. */
  score: number;
  /** What it lifts here, by measure. */
  lifts: { measure: MeasureId; delta: number }[];
}

export interface Holds {
  /** One plain line for each thing holding backing down, largest first. */
  lines: string[];
  /** The rule behind expectations, when it is one of the lines. */
  rule: string | null;
  /** The one or two builds that would lift it most, best first. */
  lifts: Lift[];
}

const MEASURES = new Set<string>(MEASURE_IDS);
const LIFTS_SHOWN = 2;

/** The measures people here care about, each weighted by the share of the people who care (and how unhappy they are). */
function caredMeasures(model: BoardModel, state: BoardState, code: CouncilCode): Map<MeasureId, number> {
  const v = councilView(model, state, code);
  const out = new Map<MeasureId, number>();
  for (const g of v.groups) {
    const def = model.groups.find((x) => x.id === g.group);
    const mood = state.councils[code]?.moods[g.group]?.mood ?? 5;
    // a group below the line counts more: lifting it is what moves backing towards 5
    const w = Math.max(0.05, g.share) * (mood < 5 ? 2 : 1);
    for (const care of def?.cares ?? []) if (MEASURES.has(care)) out.set(care as MeasureId, (out.get(care as MeasureId) ?? 0) + w);
  }
  return out;
}

/** A measure's move here over the window rule P1 compares (four years), from the yearly frames. */
function movedOver(model: BoardModel, state: BoardState, code: CouncilCode, m: MeasureId): number {
  const years = ruleParamOf(model, "P1", "compare_years", 4);
  let past = state.history[0];
  for (const f of state.history) if (f.year <= state.year - years) past = f;
  const was = past?.councils[code]?.measures[m];
  const now = state.councils[code]?.measures[m];
  return was === undefined || now === undefined ? 0 : now - was;
}

const movedWords = (d: number): string =>
  Math.abs(d) < 0.05 ? t("boardui.holds.moved.same") : t(d > 0 ? "boardui.holds.moved.up" : "boardui.holds.moved.down", { n: num(Math.abs(d)) });

/** The builds here that would lift what people here care about most (allowed, or short only of coins). */
export function liftsHere(model: BoardModel, state: BoardState, code: CouncilCode, cared = caredMeasures(model, state, code)): Lift[] {
  const out: Lift[] = [];
  for (const o of options(model, state, code)) {
    if (o.action.kind !== "build" || !o.project) continue;
    if (!o.allowed && !o.blockers.every((b) => b.kind === "coins")) continue;
    let p;
    try { p = preview(model, state, o.action); } catch { continue; }
    const by = new Map<MeasureId, number>();
    for (const c of p.changes) {
      if (c.council !== code || !MEASURES.has(c.quantity) || c.delta <= 0) continue;
      by.set(c.quantity as MeasureId, (by.get(c.quantity as MeasureId) ?? 0) + c.delta);
    }
    const lifts = [...by.entries()].filter(([m]) => cared.has(m)).map(([measure, delta]) => ({ measure, delta })).sort((a, b) => b.delta - a.delta);
    const score = lifts.reduce((a, l) => a + l.delta * (cared.get(l.measure) ?? 0), 0);
    if (score > 0) out.push({ option: o, project: o.project, score, lifts });
  }
  // the same project on two sites (a council and a line) counts once: its best site
  const best = new Map<string, Lift>();
  for (const l of out) if (!best.has(l.project) || best.get(l.project)!.score < l.score) best.set(l.project, l);
  return [...best.values()].sort((a, b) => b.score - a.score || a.option.cost - b.option.cost || a.project.localeCompare(b.project)).slice(0, LIFTS_SHOWN);
}

/** What holds this council's backing down now, and what would lift it. */
export function backingHolds(model: BoardModel, state: BoardState, code: CouncilCode): Holds {
  const c = state.councils[code];
  if (!c) return { lines: [], rule: null, lifts: [] };
  const v = councilView(model, state, code);
  const cared = caredMeasures(model, state, code);
  const expected = expectedGain(model, state);
  const lines: { text: string; size: number }[] = [];

  // rule P1: what people care about, against what they expect after four years
  const seen = new Set<MeasureId>();
  for (const [m, w] of [...cared.entries()].sort((a, b) => b[1] - a[1])) {
    const d = movedOver(model, state, code, m);
    const short = expected - d;
    if (state.step === 0 || short < 0.05 || seen.has(m)) continue;
    seen.add(m);
    const text = expected > 0
      ? t("boardui.holds.expect", { measure: measureName(model, m), e: num(expected), moved: movedWords(d) })
      : t("boardui.holds.fell", { measure: measureName(model, m), moved: movedWords(d) });
    lines.push({ text, size: short * w });
  }

  // a law or a broken deal that costs backing here while it stands
  for (const part of standingParts(model, state, code)) {
    if (part.points >= -0.05) continue;
    if (part.cause.kind === "law") {
      const law = part.cause.law;
      lines.push({ text: t("boardui.holds.law", { law: tx(model.laws.find((l) => l.id === law)?.name ?? ""), n: num(-part.points) }), size: -part.points });
    } else {
      lines.push({ text: t("boardui.holds.deal", { n: num(-part.points), fade: num(ruleParamOf(model, "P6", "broken_years", 4)) }), size: -part.points });
    }
  }

  if (v.momentum === "slipping") lines.push({ text: t("boardui.holds.slipping"), size: 0.5 });

  // a group reason that is not about one measure: a broken promise, trouble left, nothing built within reach
  for (const g of v.groups) {
    const key = g.reason?.key ?? "";
    if (/\.measure\./.test(key) || reasonWay(key) !== "down" || g.mood === "content" || g.mood === "pleased") continue;
    const why = say(g.reason);
    if (why && !lines.some((l) => l.text.endsWith(why))) lines.push({ text: t("boardui.holds.group", { group: tx(g.name), why }), size: 0.3 });
  }

  lines.sort((a, b) => b.size - a.size);
  return {
    lines: lines.map((l) => l.text),
    rule: seen.size && expected > 0 ? t("boardui.holds.rule") : null,
    lifts: liftsHere(model, state, code, cared),
  };
}

/** A lift in words: "Affordable homes: Homes and community +0.8". */
export const liftWords = (model: BoardModel, l: Lift): string =>
  t("boardui.holds.liftItem", { project: projectName(model, l.project), list: listOf(l.lifts.map((x) => `${measureName(model, x.measure)} ${signed(x.delta)}`)) });
