/**
 * The end (docs/design/v2-board.md sections 5.4 and 8): which named Wales the player built, three
 * evidence lines from the board, both scores against the same Wales on autopilot, the council
 * that changed most and its letter, and the nearest Wales the player did not build.
 *
 * Player text is the model's: evidence lines, names and letters are `Text` with slots, and the
 * engine passes the slot values ({council}, {town}, {year}, {project}, {river}) in `Say.vars`.
 */
import { autopilot, branchBot, playGame } from "./bots";
import { secondBranch } from "./bots-strategies";
import { allEndHold, endHolds, flagged } from "./end-conditions";
import { councilMean, fairnessGap, scores } from "./score";
import { story } from "./story";
import { yearOfStep } from "./time";
import type {
  BoardModel, BoardState, CouncilCode, Ending, EndingDef, EvidenceDef, EvidenceLine, Frame, Grade, PlaceId, ProjectDef, ProjectState, Scores, Text,
} from "./types";

/** The first ending by priority whose conditions all hold. One ending has none, so one always fits. */
export function pickEnding(model: BoardModel, state: BoardState): EndingDef {
  const sorted = [...model.endings].sort((a, b) => a.priority - b.priority);
  return sorted.find((e) => allEndHold(model, state, e.when)) ?? sorted[sorted.length - 1]!;
}

const nameOf = (model: BoardModel, code: CouncilCode): Text => model.councils.find((c) => c.code === code)?.name ?? { en: code, cy: code };
const townOf = (model: BoardModel, code: CouncilCode): Text => model.councils.find((c) => c.code === code)?.towns[0] ?? nameOf(model, code);
const yearReady = (model: BoardModel, readyStep: number): number => yearOfStep(model, readyStep + 1);

/** Councils by how far their mean moved from 2026, most first (ties by code). */
export function mostChanged(model: BoardModel, state: BoardState): CouncilCode[] {
  const then = state.history[0]?.councils;
  const move = (c: CouncilCode) => Math.abs(councilMean(state.councils[c]!) - (then?.[c] ? councilMean(then[c]!) : councilMean(state.councils[c]!)));
  return model.game.councils.filter((c) => state.councils[c]).sort((a, b) => move(b) - move(a) || a.localeCompare(b));
}

/**
 * The project that stands for a council in its letter: one the ending is about first (`about`),
 * then a keystone, then the highest tier, then the latest.
 */
export function namedProject(model: BoardModel, state: BoardState, code: CouncilCode, about: (d: ProjectDef) => boolean = () => false): ProjectState | undefined {
  const def = (p: ProjectState) => model.projects.find((d) => d.id === p.project);
  const tier = (p: ProjectState) => def(p)?.tier ?? 0;
  const fits = (p: ProjectState) => Number(!!def(p) && about(def(p)!));
  return state.projects
    .filter((p) => p.site.council === code || (p.site.link !== undefined && model.links.some((l) => l.id === p.site.link && (l.from === code || l.to === code))))
    .sort((a, b) => fits(b) - fits(a) || tier(b) - tier(a) || b.startedStep - a.startedStep || a.id.localeCompare(b.id))[0];
}

/** What an ending's letter is about: its keystone, or a faster line for an ending about upgraded lines. */
function endingAbout(e: EndingDef): (d: ProjectDef) => boolean {
  const key = e.when.find((c) => c.kind === "keystone");
  if (key?.kind === "keystone") return (d) => d.id === key.project;
  if (e.when.some((c) => c.kind === "links_upgraded")) return (d) => d.effects.some((x) => x.kind === "link_quality");
  return () => false;
}

function slots(model: BoardModel, state: BoardState, code: CouncilCode, about?: (d: ProjectDef) => boolean): Record<string, Text | string | number> {
  const p = namedProject(model, state, code, about);
  const def = p ? model.projects.find((d) => d.id === p.project) : undefined;
  const place = model.places.find((x) => x.council === code);
  const river = model.links.find((l) => l.kind === "river" && (l.from === code || l.to === code))?.name;
  return {
    council: nameOf(model, code), town: townOf(model, code),
    project: def?.name ?? townOf(model, code), year: p ? yearReady(model, p.readyStep) : model.game.end_year,
    place: place?.name ?? townOf(model, code), ...(river ? { river } : {}),
  };
}

/** One evidence line: the council with the largest change of the kind asked, and the line for its direction. */
export function evidenceLine(model: BoardModel, state: BoardState, ev: EvidenceDef): EvidenceLine {
  const then = state.history[0]?.councils;
  const codes = flagged(model, ev.flag).filter((c) => state.councils[c]);
  const pick = (change: (c: CouncilCode) => number) => {
    const best = [...codes].sort((a, b) => Math.abs(change(b)) - Math.abs(change(a)) || a.localeCompare(b))[0] ?? model.game.councils[0]!;
    return { code: best, up: change(best) >= 0 };
  };
  let code: CouncilCode | null;
  let up: boolean;
  if (ev.kind === "gap_change") {
    code = null;
    up = !!then && fairnessGap(model, state.councils) <= fairnessGap(model, then);
  } else if (ev.kind === "young_adults_change") {
    ({ code, up } = pick((c) => state.councils[c]!.young - (then?.[c]?.young ?? state.councils[c]!.young)));
  } else if (ev.kind === "measure_change") {
    const m = ev.measure ?? "work";
    ({ code, up } = pick((c) => state.councils[c]!.measures[m] - (then?.[c]?.measures[m] ?? state.councils[c]!.measures[m])));
  } else if (ev.kind === "project_standing") {
    const standing = codes.filter((c) => namedProject(model, state, c)?.status === "working");
    code = standing[0] ?? codes[0] ?? null;
    up = standing.length > 0;
  } else {
    // no_event_since: the council a bad event hit most often, and whether it has been spared since.
    const hits = (c: CouncilCode) => state.events.filter((e) => e.councils.includes(c) && !model.events.find((d) => d.id === e.event)?.good);
    code = [...codes].sort((a, b) => hits(b).length - hits(a).length || a.localeCompare(b))[0] ?? null;
    const last = code ? hits(code).slice(-1)[0] : undefined;
    up = !last;
  }
  const vars = code ? slots(model, state, code) : { year: model.game.end_year };
  return { council: code, say: { key: "board.ending.evidence", vars: { line: up ? ev.up : ev.down, ...vars } } };
}

/** The share of an ending's conditions that hold now (its nearness), 0 to 1. */
export function nearness(model: BoardModel, state: BoardState, e: EndingDef): number {
  if (e.when.length === 0) return 0;
  return e.when.filter((c) => endHolds(model, state, c)).length / e.when.length;
}

/** The nearest other ending: the most of its conditions holding, then by priority. Never the fallback. */
export function nearestNotBuilt(model: BoardModel, state: BoardState, built: EndingDef): EndingDef {
  const others = model.endings.filter((e) => e.id !== built.id && e.when.length > 0);
  return others.sort((a, b) => nearness(model, state, b) - nearness(model, state, a) || a.priority - b.priority)[0] ?? built;
}

/** Scores of the same game number and start played on autopilot. */
export function autopilotScores(model: BoardModel, state: BoardState): Scores {
  return scores(model, playGame(model, autopilot, state.gameNumber, state.start));
}

/**
 * The ghost map of the Wales you did not build (16.5.3 item 6): the 2050 board of the same game
 * number and start, played by the branch bot of that ending's keystone. Null for an ending with no
 * keystone of its own, since no one bot plays that route. A game estimate of another route.
 */
export function ghostFrame(model: BoardModel, state: BoardState, other: EndingDef): Frame | null {
  const key = other.when.find((c) => c.kind === "keystone" && c.project);
  const project = key?.kind === "keystone" ? model.projects.find((p) => p.id === key.project) : undefined;
  if (!project) return null;
  const ghost = playGame(model, branchBot(project.branch, secondBranch(model, project.branch)), state.gameNumber, state.start);
  return ghost.history[ghost.history.length - 1] ?? null;
}

/** Place visits made, from the ledger (a visit's grade is on its cause). */
function visitsMade(state: BoardState): { place: PlaceId; grade: Grade }[] {
  const out: { place: PlaceId; grade: Grade }[] = [];
  const seen = new Set<string>();
  for (const c of state.ledger) {
    if (c.cause.kind !== "visit") continue;
    const key = `${c.step}:${c.cause.place}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ place: c.cause.place, grade: c.cause.grade });
  }
  return out;
}

/** API: the named ending and everything the end screen shows. */
export function ending(model: BoardModel, state: BoardState): Ending {
  const built = pickEnding(model, state);
  const own = scores(model, state);
  const changed = mostChanged(model, state);
  const from = changed[0] ?? model.game.councils[0]!;
  const letters = model.letters.filter((l) => l.ending === built.id);
  const letter = letters.find((l) => l.lower === own.lower) ?? letters.find((l) => l.lower === "either") ?? letters[0];
  const other = nearestNotBuilt(model, state, built);
  return {
    id: built.id, name: built.name, summary: built.summary,
    evidence: built.evidence.slice(0, 3).map((ev) => evidenceLine(model, state, ev)),
    scores: own,
    autopilot: autopilotScores(model, state),
    mostChanged: changed.slice(0, 3),
    letter: { from, letter: letter?.id ?? "", slots: slots(model, state, from, endingAbout(built)) },
    notBuilt: { id: other.id, name: other.name, say: { key: "board.ending.not_built", vars: { line: other.not_built, ending: other.name } }, frame: ghostFrame(model, state, other) },
    visits: visitsMade(state),
    story: story(model, state),
  };
}
