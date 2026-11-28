/**
 * The story a game tells: moments, chapters and turning points (docs/design/v2-board.md 16.5).
 * Owner: package 9. The clock calls `noteStep` after every step and `nameChapter` when a term
 * closes; api.ts and endings.ts call `story`. Chapters are judged in story-terms.ts.
 *
 * Moments (16.5.2): a tier or legacy project opening (at the step it opened, or the next step for
 * one opened by a build between steps), a keystone finishing, a council tipping for
 * the first time each way, the region turning, an election, a landed event (outside trouble of
 * severity 2 or more as it landed, and every grown event), the promise judged, a deal judged, and
 * a council's young adult share 2 points from 2026. Each is weighed, each time a year closes, by
 * the size of the ledger records that share its cause in its first `WEIGHT_YEARS` years. The
 * turning points are the five heaviest, in order of time.
 */
import type { StepCtx, StepFacts } from "./ctx";
import { round4 } from "./ctx";
import { openedNow } from "./clock-stops";
import { regionTurnStep, risingCount } from "./momentum";
import { siteCouncil } from "./conditions";
import { pickChapter, shownYear } from "./story-terms";
import { yearOfStep } from "./time";
import type {
  BoardModel, BoardState, ChapterRecord, Contribution, CouncilCode, Moment, MomentKind, Say, SayVar, Story, Text,
} from "./types";
import { RULE_IDS } from "./types";

export { FALLBACK_CHAPTER } from "./story-terms";

/** Years of ledger after a moment that count towards its weight (16.5.2: "the next eight years"). */
export const WEIGHT_YEARS = 8;
/** Outside trouble that lands at this severity or more is a moment (16.5.2). */
export const EVENT_MOMENT_SEVERITY = 2;
/** A council's young adult share this many points from 2026 is a moment (16.5.2: "2 in 100"). */
export const PEOPLE_MOMENT_POINTS = 2;
/** How many turning points the story keeps. */
export const TURNING_POINTS = 5;

const nameOf = (model: BoardModel, code: CouncilCode): Text => model.councils.find((c) => c.code === code)?.name ?? { en: code, cy: code };
const projectName = (model: BoardModel, id: string): SayVar => model.projects.find((d) => d.id === id)?.name ?? id;

/** The moments one step made. Order is fixed so a replay writes the same list. */
function momentsOf(ctx: StepCtx, facts: StepFacts): Moment[] {
  const { model, state } = ctx;
  const out: Moment[] = [];
  const at = facts.step;
  // the year the board's season words give this step ("Spring 2035"), as every end screen shows it
  const year = shownYear(model, at);
  const has = (kind: MomentKind, ref: string, council?: CouncilCode) =>
    state.story.moments.some((m) => m.kind === kind && m.ref === ref && m.council === council) || out.some((m) => m.kind === kind && m.ref === ref && m.council === council);
  const add = (kind: MomentKind, ref: string, say: Say, council?: CouncilCode, when = year) => {
    if (!has(kind, ref, council)) out.push({ step: at, year: when, kind, ...(council ? { council } : {}), ref, say, weight: 0 });
  };
  const withCouncil = (code: CouncilCode | undefined, vars: Record<string, SayVar> = {}) => (code ? { ...vars, council: nameOf(model, code) } : vars);

  // a tier opened by a build between steps is not in `facts.opened`: catch it on the next step
  for (const key of new Set([...facts.opened, ...[...openedNow(model, state)].sort()])) {
    const [branch, tier] = key.split(":");
    const vars: Record<string, SayVar> = branch === "legacy"
      ? { project: projectName(model, tier ?? "") }
      : { branch: model.branches.find((b) => b.id === branch)?.name ?? branch ?? "", tier: Number(tier) };
    add("tier_open", key, { key: `board.moment.${branch === "legacy" ? "legacy_open" : "tier_open"}`, vars });
  }
  for (const id of facts.finished) {
    const p = state.projects.find((x) => x.id === id);
    if (!p || !model.projects.find((d) => d.id === p.project)?.keystone) continue;
    const code = siteCouncil(model, p);
    // dated the year it opens, as the letter, the evidence and every screen date it: the step after `readyStep`
    add("keystone", p.project, { key: "board.moment.keystone", vars: withCouncil(code, { project: projectName(model, p.project) }) }, code, shownYear(model, p.readyStep + 1));
  }
  for (const tip of facts.tipped) {
    if (tip.to === "steady") continue;
    add("tipped", tip.to, { key: `board.moment.tipped.${tip.to}`, vars: withCouncil(tip.council) }, tip.council);
  }
  if (facts.closedYears.length > 0 && regionTurnStep(model, state) !== null) {
    add("region_turn", "region", { key: "board.moment.region_turn", vars: { n: risingCount(model, state) } });
  }
  if (facts.election) {
    add("election", `${facts.election.year}:${facts.election.result}`, { key: `board.moment.election.${facts.election.result}`, vars: { year: facts.election.year } }, undefined, facts.election.year);
  }
  for (const e of facts.events) {
    const def = model.events.find((d) => d.id === e.event);
    if (!def || def.good) continue;
    if (def.origin === "outside" && e.severity < EVENT_MOMENT_SEVERITY) continue;
    add("event", `${e.event}@${e.step}`, { key: "board.moment.event", vars: withCouncil(e.councils[0], { event: def.name }) }, e.councils[0]);
  }
  if (state.promise.kept !== null) {
    const how = state.promise.kept ? "kept" : "broken";
    if (!state.story.moments.some((m) => m.kind === "promise")) add("promise", `promise:${how}`, { key: `board.moment.promise.${how}`, vars: { year: state.promise.byYear } });
  }
  for (const d of state.deals) {
    if (d.kept === null) continue;
    const how = d.kept ? "kept" : "broken";
    const measure = model.measures.find((m) => m.id === d.measure)?.name ?? d.measure;
    add("deal", `${d.council}@${d.madeStep}:${how}`, { key: `board.moment.deal.${how}`, vars: withCouncil(d.council, { measure }) }, d.council);
  }
  if (facts.closedYears.length > 0) {
    const then = state.history[0]?.councils;
    for (const code of model.game.councils) {
      const now = state.councils[code]?.young;
      const was = then?.[code]?.young;
      if (now === undefined || was === undefined || Math.abs(now - was) < PEOPLE_MOMENT_POINTS) continue;
      if (state.story.moments.some((m) => m.kind === "people" && m.council === code)) continue;
      add("people", now > was ? "up" : "down", { key: `board.moment.people.${now > was ? "up" : "down"}`, vars: withCouncil(code, { n: round4(Math.abs(now - was)) }) }, code);
    }
  }
  return out;
}

/** Does a ledger record share a moment's cause? */
export function sharesCause(model: BoardModel, m: Moment, c: Contribution): boolean {
  const cause = c.cause;
  switch (m.kind) {
    case "tier_open": {
      if (cause.kind !== "project") return false;
      const [branch, tier] = (m.ref ?? "").split(":");
      if (branch === "legacy") return cause.project === tier;
      const def = model.projects.find((d) => d.id === cause.project);
      return !!def && def.branch === branch && String(def.tier) === tier;
    }
    case "keystone": {
      if (cause.kind !== "project" || cause.project !== m.ref) return false;
      const at = cause.site.council ?? model.links.find((l) => l.id === cause.site.link)?.from;
      return at === m.council;
    }
    case "tipped": return cause.kind === "momentum" && c.council === m.council;
    case "region_turn": return c.rule === RULE_IDS.momentum && c.council === null;
    case "election": return (cause.kind === "election" && cause.year === m.year) || (cause.kind === "deal" && !!m.ref?.endsWith(":lost"));
    case "event": {
      const id = (m.ref ?? "").split("@")[0];
      return (cause.kind === "event" || cause.kind === "response") && cause.event === id;
    }
    case "promise": return cause.kind === "start";
    case "deal": return cause.kind === "deal" && cause.council === m.council;
    case "people": return c.quantity === "young_adults" && c.council === m.council && c.rule === RULE_IDS.youngFollowWork;
  }
}

/**
 * The game year (May to May, as the ledger counts years) a moment's weight is counted from: the
 * year of its step, or for a keystone the year of the step it opens. A moment's `year` is the year
 * the screens show (`shownYear`), which is the next calendar year for a spring step.
 */
const weighFrom = (model: BoardModel, m: Moment): number => yearOfStep(model, m.kind === "keystone" ? m.step + 1 : m.step);

/** Add a closed year's ledger to the weight of every moment whose window holds it. The ledger is in order of time. */
function weighYear(model: BoardModel, state: BoardState, year: number): void {
  const live = state.story.moments.filter((m) => weighFrom(model, m) <= year && year < weighFrom(model, m) + WEIGHT_YEARS);
  if (live.length === 0) return;
  const add = new Map<Moment, number>();
  for (let i = state.ledger.length - 1; i >= 0; i--) {
    const c = state.ledger[i]!;
    if (c.year < year) break;
    if (c.year !== year) continue;
    for (const m of live) if (sharesCause(model, m, c)) add.set(m, (add.get(m) ?? 0) + Math.abs(c.delta));
  }
  for (const [m, w] of add) m.weight = round4(m.weight + w);
}

/** After every step, with what it did: record its moments, and weigh moments when a year closes. */
export function noteStep(ctx: StepCtx, facts: StepFacts): void {
  ctx.state.story.moments.push(...momentsOf(ctx, facts));
  for (const year of facts.closedYears) weighYear(ctx.model, ctx.state, year);
}

/** Name an election term as it closes (term 1 is 2026 to 2030; term 6 closes in May 2050). */
export function nameChapter(ctx: StepCtx, term: number, fromYear: number, toYear: number): ChapterRecord {
  return pickChapter(ctx, term, fromYear, toYear);
}

/**
 * The response not chosen for an event moment, for the end screen's one honest line (16.5.2): the
 * response taken and one other, by name. Nothing is simulated.
 */
function otherChoice(model: BoardModel, state: BoardState, m: Moment): Record<string, SayVar> {
  if (m.kind !== "event") return {};
  const [id, step] = (m.ref ?? "").split("@");
  const rec = state.events.find((e) => e.event === id && String(e.step) === step);
  const def = model.events.find((d) => d.id === id);
  const chosen = def?.responses.find((r) => r.id === rec?.response);
  const other = def?.responses.find((r) => r.id !== rec?.response && r.cost > 0) ?? def?.responses.find((r) => r.id !== rec?.response);
  return chosen && other ? { chosen: chosen.name, other: other.name } : {};
}

/** API: the chapters so far and the five heaviest moments, in order of time. */
export function story(model: BoardModel, state: BoardState): Story {
  const heaviest = [...state.story.moments].sort((a, b) => b.weight - a.weight || a.step - b.step).slice(0, TURNING_POINTS);
  const turningPoints = heaviest.sort((a, b) => a.step - b.step).map((m) => {
    const extra = otherChoice(model, state, m);
    return Object.keys(extra).length ? { ...m, say: { ...m.say, vars: { ...m.say.vars, ...extra } } } : { ...m };
  });
  return { chapters: [...state.story.chapters], turningPoints };
}
