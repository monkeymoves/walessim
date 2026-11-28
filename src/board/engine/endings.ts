/**
 * The end (docs/design/v2-board.md sections 5.4 and 8): which named Wales the player built, three
 * evidence lines from the board, both scores against the same Wales on autopilot, the council
 * that changed most and its letter, and the nearest Wales the player did not build.
 *
 * Player text is the model's: evidence lines, names and letters are `Text` with slots, and the
 * engine passes the slot values ({council}, {town}, {year}, {project}, {river}) in `Say.vars`.
 * Every line names the council and project it is really about: a slot is left out rather than
 * filled with a stand-in, and a line with an empty slot is not said (`sayable`).
 */
import { autopilot, branchBot, playGame } from "./bots";
import { secondBranch } from "./bots-strategies";
import { siteCouncil, siteCouncils } from "./conditions";
import { allEndHold, endHolds, flagged } from "./end-conditions";
import { councilMean, fairnessGap, lowestCouncils, scores } from "./score";
import { story } from "./story";
import { riverAt } from "./events";
import { isRiverEvent, townOf } from "./story-terms";
import { yearOfStep } from "./time";
import type {
  BoardModel, BoardState, CouncilCode, Ending, EndingDef, EvidenceDef, EvidenceLine, Frame, Grade, LetterDef, PlaceId, ProjectDef, ProjectState, Scores, Text,
} from "./types";

/** The first ending by priority whose conditions all hold. One ending has none, so one always fits. */
export function pickEnding(model: BoardModel, state: BoardState): EndingDef {
  const sorted = [...model.endings].sort((a, b) => a.priority - b.priority);
  return sorted.find((e) => allEndHold(model, state, e.when)) ?? sorted[sorted.length - 1]!;
}

const nameOf = (model: BoardModel, code: CouncilCode): Text => model.councils.find((c) => c.code === code)?.name ?? { en: code, cy: code };
const yearReady = (model: BoardModel, readyStep: number): number => yearOfStep(model, readyStep + 1);
const projectDefOf = (model: BoardModel, p: ProjectState): ProjectDef | undefined => model.projects.find((d) => d.id === p.project);
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
type Slots = Record<string, Text | string | number>;

/** Councils by how far their mean moved from 2026, most first (ties by code). */
export function mostChanged(model: BoardModel, state: BoardState): CouncilCode[] {
  const then = state.history[0]?.councils;
  const move = (c: CouncilCode) => Math.abs(councilMean(state.councils[c]!) - (then?.[c] ? councilMean(then[c]!) : councilMean(state.councils[c]!)));
  return model.game.councils.filter((c) => state.councils[c]).sort((a, b) => move(b) - move(a) || a.localeCompare(b));
}

/** How far a council's mean moved since 2026 (signed). */
function meanChange(state: BoardState, c: CouncilCode): number {
  const then = state.history[0]?.councils[c];
  return councilMean(state.councils[c]!) - (then ? councilMean(then) : councilMean(state.councils[c]!));
}

/** The step a council first tipped to rising, from the yearly frames, or null. */
export function firstRise(state: BoardState, code: CouncilCode): number | null {
  return state.history.find((f) => f.councils[code]?.momentum === "rising")?.step ?? null;
}

/**
 * The project that stands for a council in its letter: one the ending is about first (`about`);
 * then, where the council turned a corner, one that opened by then, since letters tell how a place
 * turned ("It started to turn with ..."; playtest 9: "Station quarter in 2045" for a council that
 * turned in 2030); then the highest tier; then the earliest to open.
 */
export function namedProject(model: BoardModel, state: BoardState, code: CouncilCode, about: (d: ProjectDef) => boolean = () => false): ProjectState | undefined {
  const def = (p: ProjectState) => projectDefOf(model, p);
  const tier = (p: ProjectState) => def(p)?.tier ?? 0;
  const fits = (p: ProjectState) => Number(!!def(p) && about(def(p)!));
  const rose = firstRise(state, code);
  const byRise = (p: ProjectState) => Number(rose !== null && p.readyStep + 1 <= rose);
  return state.projects
    .filter((p) => p.status !== "building" && siteCouncils(model, p).includes(code))
    .sort((a, b) => fits(b) - fits(a) || byRise(b) - byRise(a) || tier(b) - tier(a) || a.readyStep - b.readyStep || a.id.localeCompare(b.id))[0];
}

/**
 * What an ending is about, from its own conditions: its keystone; the project an event it needs
 * was set off by (The gamble's big employer); or a faster line for an ending about upgraded lines.
 */
export function endingAbout(model: BoardModel, e: EndingDef): (d: ProjectDef) => boolean {
  const key = e.when.find((c) => c.kind === "keystone");
  if (key?.kind === "keystone") return (d) => d.id === key.project;
  const landed = e.when.find((c) => c.kind === "event_landed");
  if (landed?.kind === "event_landed") {
    const ids = (model.events.find((d) => d.id === landed.event)?.trigger ?? []).flatMap((c) => (c.kind === "project" && c.project && !c.not ? [c.project] : []));
    if (ids.length) return (d) => ids.includes(d.id);
  }
  if (e.when.some((c) => c.kind === "links_upgraded")) return (d) => d.effects.some((x) => x.kind === "link_quality");
  return () => false;
}

/** A council's own words: its name, its town, its place and its river. */
function placeSlots(model: BoardModel, code: CouncilCode): Slots {
  const town = townOf(model, code);
  const place = model.places.find((x) => x.council === code);
  const river = riverAt(model, code);
  return { council: nameOf(model, code), town, place: place?.name ?? town, ...(river ? { river } : {}) };
}

/** A project's words: where it stands, its name and the year it opened. */
function projectSlots(model: BoardModel, p: ProjectState, code: CouncilCode): Slots {
  const def = projectDefOf(model, p);
  return { ...placeSlots(model, code), ...(def ? { project: def.name, year: yearReady(model, p.readyStep) } : {}) };
}

/**
 * The council a letter comes from: the place the ending is about. Its keystone's council; where
 * the event it needs landed; the one of the three places furthest behind in 2026 that moved most
 * the ending's way; the flagged council whose young adults moved most the ending's way; the
 * council of the latest keystone. Otherwise the council that changed most.
 */
export function letterFrom(model: BoardModel, state: BoardState, built: EndingDef): CouncilCode {
  const then = state.history[0]?.councils;
  const most = (codes: CouncilCode[], by: (c: CouncilCode) => number) =>
    [...codes].filter((c) => state.councils[c]).sort((a, b) => by(b) - by(a) || a.localeCompare(b))[0];
  for (const c of built.when) {
    if (c.kind === "keystone") {
      const p = state.projects.find((x) => x.project === c.project && x.status === "working");
      const at = p && siteCouncil(model, p);
      if (at) return at;
    }
  }
  for (const c of built.when) {
    if (c.kind === "event_landed") {
      const at = state.events.filter((e) => e.event === c.event).slice(-1)[0]?.councils[0];
      if (at) return at;
    }
  }
  for (const c of built.when) {
    if (c.kind === "lowest_three" && then) {
      const low = lowestCouncils(model, then, 3);
      const at = most(low, (x) => (c.vs_2026 === "higher" ? 1 : -1) * meanChange(state, x));
      if (at) return at;
    }
    if (c.kind === "young_adults" && then) {
      const at = most(flagged(model, c.flag), (x) => (c.vs_2026 === "held" ? 1 : -1) * (state.councils[x]!.young - (then[x]?.young ?? state.councils[x]!.young)));
      if (at) return at;
    }
  }
  if (built.when.some((c) => c.kind === "keystone_finished_after" || c.kind === "keystones")) {
    const late = state.projects.filter((p) => p.status === "working" && projectDefOf(model, p)?.keystone).sort((a, b) => b.readyStep - a.readyStep)[0];
    const at = late && siteCouncil(model, late);
    if (at) return at;
  }
  return mostChanged(model, state)[0] ?? model.game.councils[0]!;
}

/**
 * The council an ending about an event is about: where that event last landed (The gamble: where the
 * big employer left). Its evidence lines read that council, so the ending names one place, not three
 * (playtest 9: "opened in Merthyr Tydfil", "Blaenau Gwent found new work"). Null for other endings.
 */
export function focusOf(model: BoardModel, state: BoardState, built: EndingDef): CouncilCode | null {
  for (const c of built.when) {
    if (c.kind !== "event_landed") continue;
    const at = state.events.filter((e) => e.event === c.event).slice(-1)[0]?.councils[0];
    if (at && state.councils[at]) return at;
  }
  return null;
}

/** River floods that hit a council, in order of time. */
const floodsAt = (model: BoardModel, state: BoardState, code: CouncilCode) =>
  state.events.filter((e) => e.councils.includes(code) && isRiverEvent(model, e.event) && !model.events.find((d) => d.id === e.event)?.good);

/**
 * One evidence line, true of the board it reads:
 * - `measure_change`: the flagged council whose measure (or all six together, with none named)
 *   moved most, and the line for its direction.
 * - `young_adults_change`: the same for young adults.
 * - `gap_change`: whether the fairness gap is narrower than in 2026.
 * - `project_standing`: a working project in a flagged council, the one the ending is about first,
 *   with its own council, name and opening year; else the council furthest behind, where nothing
 *   you built is working.
 * - `no_event_since`: the river council hit by the most floods (the one the ending's project
 *   guards when none were), with the year of its last flood; "up" when it has not flooded since
 *   the ending's project opened, or never flooded at all ({year} is then the first year).
 */
export function evidenceLine(model: BoardModel, state: BoardState, ev: EvidenceDef, about: (d: ProjectDef) => boolean = () => false, focus: CouncilCode | null = null): EvidenceLine {
  const then = state.history[0]?.councils;
  const codes = flagged(model, ev.flag).filter((c) => state.councils[c]);
  const pick = (change: (c: CouncilCode) => number) => {
    const best = (focus && codes.includes(focus) ? focus : undefined)
      ?? [...codes].sort((a, b) => Math.abs(change(b)) - Math.abs(change(a)) || a.localeCompare(b))[0] ?? model.game.councils[0]!;
    return { code: best, up: change(best) >= 0, vars: placeSlots(model, best) };
  };
  let code: CouncilCode | null;
  let up: boolean;
  let vars: Slots;
  if (ev.kind === "gap_change") {
    code = null;
    up = gapClosed(model, state);
    vars = {};
  } else if (ev.kind === "young_adults_change") {
    ({ code, up, vars } = pick((c) => state.councils[c]!.young - (then?.[c]?.young ?? state.councils[c]!.young)));
  } else if (ev.kind === "measure_change") {
    const m = ev.measure;
    ({ code, up, vars } = pick((c) => (m ? state.councils[c]!.measures[m] - (then?.[c]?.measures[m] ?? state.councils[c]!.measures[m]) : meanChange(state, c))));
  } else if (ev.kind === "project_standing") {
    const def = (p: ProjectState) => projectDefOf(model, p);
    const fits = (p: ProjectState) => Number(!!def(p) && about(def(p)!));
    const atFocus = (p: ProjectState) => Number(!!focus && siteCouncils(model, p).includes(focus));
    const best = state.projects
      .filter((p) => p.status === "working" && siteCouncils(model, p).some((c) => codes.includes(c)))
      .sort((a, b) => fits(b) - fits(a) || atFocus(b) - atFocus(a) || Number(!!def(b)?.keystone) - Number(!!def(a)?.keystone) || (def(b)?.tier ?? 0) - (def(a)?.tier ?? 0)
        || a.readyStep - b.readyStep || a.id.localeCompare(b.id))[0];
    if (best) {
      code = (focus && codes.includes(focus) && siteCouncils(model, best).includes(focus) ? focus : undefined)
        ?? siteCouncils(model, best).find((c) => codes.includes(c)) ?? siteCouncil(model, best) ?? null;
      up = true;
      vars = code ? projectSlots(model, best, code) : {};
    } else {
      code = [...codes].sort((a, b) => councilMean(state.councils[a]!) - councilMean(state.councils[b]!) || a.localeCompare(b))[0] ?? null;
      up = false;
      vars = code ? placeSlots(model, code) : {};
    }
  } else {
    const rivered = codes.filter((c) => riverAt(model, c));
    const guard = state.projects.filter((p) => p.status === "working" && !!projectDefOf(model, p) && about(projectDefOf(model, p)!)).sort((a, b) => a.readyStep - b.readyStep)[0];
    const guarded = guard ? siteCouncils(model, guard).find((c) => rivered.includes(c)) : undefined;
    const lastStep = (c: CouncilCode) => floodsAt(model, state, c).slice(-1)[0]?.step ?? -1;
    code = [...rivered].sort((a, b) => floodsAt(model, state, b).length - floodsAt(model, state, a).length || lastStep(b) - lastStep(a)
      || Number(b === guarded) - Number(a === guarded) || codes.indexOf(a) - codes.indexOf(b))[0] ?? null;
    const last = code ? floodsAt(model, state, code).slice(-1)[0] : undefined;
    up = !last || (!!guard && last.step <= guard.readyStep);
    vars = code ? { ...placeSlots(model, code), year: last ? yearOfStep(model, last.step) : model.game.first_year } : {};
  }
  return { council: code, say: { key: "board.ending.evidence", vars: { line: up ? ev.up : ev.down, ...vars } } };
}

/** Is the fairness gap no wider than in 2026? The one measure every gap line and gap chapter reads (score.ts `fairnessGap`). */
export function gapClosed(model: BoardModel, state: BoardState): boolean {
  const then = state.history[0]?.councils;
  return !!then && fairnessGap(model, state.councils) <= fairnessGap(model, then);
}

/**
 * The ways the chapters told the gap: "closed" for a term named by a chapter whose condition is the
 * gap closing (Closing the gap), "wider" for one whose condition is the gap widening (Two speeds).
 */
export function gapTold(model: BoardModel, state: BoardState): Set<"closed" | "wider"> {
  const out = new Set<"closed" | "wider">();
  for (const rec of state.story.chapters) {
    for (const c of model.chapters.find((d) => d.id === rec.chapter)?.when ?? []) if (c.kind === "gap") out.add(c.change);
  }
  return out;
}

/**
 * Would a gap line say the opposite of a chapter? A chapter tells one term and the line the whole
 * run, so "Closing the gap" and "the gap has grown" can both be true, but read as a contradiction
 * (playtest 9, must-fix 3). The end then leaves the gap line out: it says less, never the opposite.
 */
export function gapClashes(model: BoardModel, state: BoardState): boolean {
  const told = gapTold(model, state);
  return gapClosed(model, state) ? told.has("wider") : told.has("closed");
}

/** True when every slot a line names has a value, so it can be said whole. */
export function sayable(line: EvidenceLine): boolean {
  const vars = line.say.vars ?? {};
  const text = vars.line as Text | undefined;
  if (!text) return false;
  return [...`${text.en} ${text.cy}`.matchAll(/\{(\w+)\}/g)].every((m) => vars[m[1]!] !== undefined);
}

/** The branch's own projects working now (legacy projects aside), highest tier first. */
const branchTier = (model: BoardModel, state: BoardState, branch: string): number => Math.max(0, ...state.projects
  .filter((p) => p.status === "working")
  .map((p) => projectDefOf(model, p))
  .filter((d): d is ProjectDef => !!d && d.branch === branch && !d.legacy_of)
  .map((d) => d.tier));

/**
 * How near one condition is, 0 to 1: 1 when it holds; for a keystone not standing, how far up its
 * branch you built (a working tier 2 is two thirds of the way to a tier 3 keystone, never 1).
 */
function conditionNear(model: BoardModel, state: BoardState, c: EndingDef["when"][number]): number {
  if (endHolds(model, state, c)) return 1;
  if (c.kind !== "keystone") return 0;
  const key = model.projects.find((d) => d.id === c.project);
  return key && key.tier > 0 ? Math.min(0.9, branchTier(model, state, key.branch) / key.tier) : 0;
}

/** The share of an ending's conditions that hold now (its nearness), 0 to 1, with a keystone's branch counted part way. */
export function nearness(model: BoardModel, state: BoardState, e: EndingDef): number {
  if (e.when.length === 0) return 0;
  return e.when.reduce((a, c) => a + conditionNear(model, state, c), 0) / e.when.length;
}

/**
 * Could this ending be "the Wales you did not build"? Not when you did build it: every condition
 * holds and it lost only on priority, or its keystone stands (playtest 9: "With room for the rivers,
 * you might have had: The green valleys" after building Rivers given room).
 */
export function notBuildable(model: BoardModel, state: BoardState, e: EndingDef): boolean {
  if (e.when.length === 0) return false;
  if (allEndHold(model, state, e.when)) return true;
  return e.when.some((c) => c.kind === "keystone" && state.projects.some((p) => p.project === c.project && p.status === "working"));
}

/**
 * The nearest other ending you did not build. A route of your own first, an ending with a keystone
 * (it has a ghost map, and it is a Wales worth trying for: playtest 9 found "you might have had:
 * Two countries" in game after game, since half its conditions hold whenever a keystone stands);
 * then the most of its conditions holding, a keystone's branch counted part way; then by priority.
 * Never the fallback, never one you built.
 */
export function nearestNotBuilt(model: BoardModel, state: BoardState, built: EndingDef): EndingDef {
  const others = model.endings.filter((e) => e.id !== built.id && e.when.length > 0);
  const open = others.filter((e) => !notBuildable(model, state, e));
  const route = (e: EndingDef) => Number(e.when.some((c) => c.kind === "keystone"));
  const byNear = (xs: EndingDef[]) => [...xs].sort((a, b) => route(b) - route(a) || nearness(model, state, b) - nearness(model, state, a) || a.priority - b.priority)[0];
  return byNear(open) ?? byNear(others) ?? built;
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

/**
 * The letters that fit an ending and the lower of the two scores (or either), in the order this
 * game offers them: rotated by the game's seed, so different games open on different letters.
 * The end screen shows the first one this device has not read yet.
 */
export function letterChoices(model: BoardModel, state: BoardState, built: EndingDef, lower: Scores["lower"]): LetterDef[] {
  const fit = model.letters.filter((l) => l.ending === built.id && (l.lower === lower || l.lower === "either"));
  if (fit.length === 0) return [];
  const k = Math.abs(state.seed) % fit.length;
  return [...fit.slice(k), ...fit.slice(0, k)];
}

/** API: the named ending and everything the end screen shows. */
export function ending(model: BoardModel, state: BoardState): Ending {
  const built = pickEnding(model, state);
  const own = scores(model, state);
  const changed = mostChanged(model, state);
  const about = endingAbout(model, built);
  const from = letterFrom(model, state, built);
  // a letter names the ending's own kind of project when the ending has one, or none at all
  const near = namedProject(model, state, from, about);
  const nearDef = near && projectDefOf(model, near);
  const named = near && (!model.projects.some(about) || (nearDef && about(nearDef))) ? near : undefined;
  const letter = letterChoices(model, state, built, own.lower)[0];
  const other = nearestNotBuilt(model, state, built);
  const focus = focusOf(model, state, built);
  const clash = gapClashes(model, state);
  return {
    id: built.id, name: built.name, summary: built.summary,
    evidence: built.evidence.filter((ev) => !(ev.kind === "gap_change" && clash))
      .map((ev) => evidenceLine(model, state, ev, about, focus)).filter(sayable).slice(0, 3),
    scores: own,
    autopilot: autopilotScores(model, state),
    mostChanged: changed.slice(0, 3),
    letter: { from, letter: letter?.id ?? "", slots: named ? projectSlots(model, named, from) : placeSlots(model, from) },
    notBuilt: { id: other.id, name: other.name, say: { key: "board.ending.not_built", vars: { line: other.not_built, ending: other.name } }, frame: ghostFrame(model, state, other) },
    visits: visitsMade(state),
    story: story(model, state),
  };
}
