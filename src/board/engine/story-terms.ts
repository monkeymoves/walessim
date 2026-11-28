/**
 * Chapters the game writes (docs/design/v2-board.md section 16.5.1): judging the `TermCondition`s
 * of model/board/story.yaml on one election term, filling the chapter's slots, and picking the
 * chapter. Owner: package 9; story.ts calls `pickChapter`.
 *
 * A term runs from the step that reaches `fromYear` (May) to the step that reaches `toYear`, which
 * is the step the chapter is named on. "In the term" means a step from the first up to, but not
 * including, the last: the election that opens a term belongs to it (so "an election was lost"
 * names the hung term), the one that closes it belongs to the next.
 *
 * What each condition means:
 * - `event_landed`: an event landed (good or bad) with that track, a landed severity of at least
 *   `severity_at_least`, and prepared or not as asked (outside events only carry `prepared`); with
 *   `at_most`, no more than that many such events landed.
 * - `election`: an election held in the term had that result.
 * - `keystone`: "started", one was started in the term and is still being built; "finished", one
 *   started working in the term.
 * - `tier_opened`: a tier of that number opened in the term (any branch).
 * - `tipped`: at least `at_least` councils tipped to that momentum for the first time in the game.
 * - `region_turn`: the region turned (rule R2 `region_turn_councils` councils on the rise at once).
 * - `young_adults`: the mean young adult share of the flagged councils moved `by` points or more
 *   (with `councils_at_least`: that many flagged councils each moved `by` or more).
 * - `gap`: the fairness gap closed or widened by `by` points out of 10 or more.
 * - `finished`: how many projects started working in the term.
 * - `deal`, `promise`: one was judged in the term, kept or broken as asked.
 * - `level`: the board's score out of 100 (score.ts `boardScore`) moved `by` or more.
 */
import { openedNow } from "./clock-stops";
import type { StepCtx } from "./ctx";
import { flagged } from "./end-conditions";
import { frameAtYear } from "./frame";
import { regionTurnStep } from "./momentum";
import { boardScore, councilMean, fairnessGap } from "./score";
import { stepOfYear } from "./time";
import type {
  BoardModel, BoardState, ChapterDef, ChapterRecord, CouncilCode, EventRecord, Frame, Momentum, SayVar, TermCondition, Text,
} from "./types";

/** The fallback chapter id when the model has no chapters yet. */
export const FALLBACK_CHAPTER = "holding-on";

/** Everything a term condition reads, gathered once. */
export interface Term {
  model: BoardModel;
  state: BoardState;
  fromStep: number;
  /** The step the term closes on (the state's step when it is named). */
  toStep: number;
  /** The frame at the start of the term. */
  start: Frame | undefined;
  events: EventRecord[];
}

const inTerm = (t: Term, step: number): boolean => step >= t.fromStep && step < t.toStep;
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const isKeystone = (model: BoardModel, id: string): boolean => !!model.projects.find((d) => d.id === id)?.keystone;

export function termOf(model: BoardModel, state: BoardState, fromYear: number): Term {
  const fromStep = stepOfYear(model, fromYear);
  const t: Term = { model, state, fromStep, toStep: state.step, start: frameAtYear(state, fromYear), events: [] };
  t.events = state.events.filter((e) => inTerm(t, e.step));
  return t;
}

/** Councils that tipped to `to` for the first time in the game inside the term, from the yearly frames. */
export function firstTips(t: Term, to: Momentum): CouncilCode[] {
  return t.model.game.councils.filter((code) => {
    const first = t.state.history.find((f) => f.councils[code]?.momentum === to);
    return !!first && first.step > t.fromStep && first.step <= t.toStep;
  });
}

/** True when the region turned (momentum.ts `regionTurnStep`) inside the term. */
function regionTurnedIn(t: Term): boolean {
  const at = regionTurnStep(t.model, t.state);
  return at !== null && at > t.fromStep && at <= t.toStep;
}

/** Tiers opened in the term: from the moments, plus any opened in the closing step (not yet a moment). */
function tiersOpened(t: Term): string[] {
  const noted = t.state.story.moments.filter((m) => m.kind === "tier_open");
  const inside = noted.filter((m) => inTerm(t, m.step)).map((m) => m.ref ?? "");
  const known = new Set(noted.map((m) => m.ref));
  return [...inside, ...[...openedNow(t.model, t.state)].filter((k) => !known.has(k))];
}

/** Was something judged in the term? From its moment, or judged in the closing step when it has none yet. */
function judgedInTerm(t: Term, kind: "deal" | "promise", ref: string): boolean {
  const m = t.state.story.moments.find((x) => x.kind === kind && x.ref?.startsWith(ref));
  return m ? inTerm(t, m.step) : true;
}

export function dealsJudged(t: Term, kept: boolean): CouncilCode[] {
  return t.state.deals.filter((d) => d.kept === kept && judgedInTerm(t, "deal", `${d.council}@${d.madeStep}:`)).map((d) => d.council);
}

const youngMean = (board: Record<CouncilCode, { young: number }> | undefined, codes: CouncilCode[]): number =>
  mean(codes.filter((c) => board?.[c]).map((c) => board![c]!.young));

/** Events that landed in the term and match an `event_landed` condition, heaviest first. */
function landedMatching(t: Term, c: Extract<TermCondition, { kind: "event_landed" }>): EventRecord[] {
  return t.events.filter((e) => {
    const def = t.model.events.find((d) => d.id === e.event);
    return !!def && (!c.track || def.track === c.track) && e.severity >= (c.severity_at_least ?? 0)
      && (c.prepared === undefined || !!e.prepared === c.prepared);
  }).sort((a, b) => b.severity - a.severity || a.step - b.step);
}

/** Does one term condition hold? */
export function termHolds(t: Term, c: TermCondition): boolean {
  const { model, state } = t;
  switch (c.kind) {
    case "event_landed": {
      const n = landedMatching(t, c).length;
      return c.at_most !== undefined ? n <= c.at_most : n > 0;
    }
    case "election": return state.election.records.some((r) => inTerm(t, r.step) && r.result === c.result);
    case "keystone": return state.projects.some((p) => isKeystone(model, p.project) && (c.phase === "started"
      ? inTerm(t, p.startedStep) && p.status === "building"
      : inTerm(t, p.readyStep) && p.status !== "building"));
    case "tier_opened": return tiersOpened(t).some((k) => k.endsWith(`:${c.tier}`) && !k.startsWith("legacy:"));
    case "tipped": return firstTips(t, c.to).length >= c.at_least;
    case "region_turn": return regionTurnedIn(t);
    case "young_adults": {
      const codes = flagged(model, c.flag);
      const moved = (change: number) => (c.change === "up" ? change >= c.by : -change >= c.by);
      if (c.councils_at_least !== undefined) {
        const n = codes.filter((x) => state.councils[x] && t.start?.councils[x] && moved(state.councils[x]!.young - t.start.councils[x]!.young)).length;
        return n >= c.councils_at_least;
      }
      return moved(youngMean(state.councils, codes) - youngMean(t.start?.councils, codes));
    }
    case "gap": {
      if (!t.start) return false;
      const change = fairnessGap(model, state.councils) - fairnessGap(model, t.start.councils);
      return c.change === "wider" ? change >= c.by : -change >= c.by;
    }
    case "finished": {
      const n = state.projects.filter((p) => p.status !== "building" && inTerm(t, p.readyStep)).length;
      return n >= (c.at_least ?? 0) && (c.at_most === undefined || n <= c.at_most);
    }
    case "deal": return dealsJudged(t, c.kept).length > 0;
    case "promise": return state.promise.kept === c.kept && judgedInTerm(t, "promise", "promise");
    case "level": {
      if (!t.start) return false;
      const change = boardScore(model, state.councils) - boardScore(model, t.start.councils);
      return c.change === "up" ? change >= c.by : -change >= c.by;
    }
  }
}

const councilName = (model: BoardModel, code: CouncilCode): Text => model.councils.find((c) => c.code === code)?.name ?? { en: code, cy: code };
const townOf = (model: BoardModel, code: CouncilCode): Text => model.councils.find((c) => c.code === code)?.towns[0] ?? councilName(model, code);
const riverAt = (model: BoardModel, code: CouncilCode): Text | undefined =>
  model.links.find((l) => l.kind === "river" && (l.from === code || l.to === code) && l.name)?.name;

/** The council whose mean moved most in the term (up when `up`, else either way), or undefined. */
function mostMoved(t: Term, up: boolean): CouncilCode | undefined {
  const move = (c: CouncilCode) => councilMean(t.state.councils[c]!) - (t.start?.councils[c] ? councilMean(t.start.councils[c]!) : councilMean(t.state.councils[c]!));
  const codes = t.model.game.councils.filter((c) => t.state.councils[c]);
  return [...codes].sort((a, b) => (up ? move(b) - move(a) : Math.abs(move(b)) - Math.abs(move(a))) || a.localeCompare(b))[0];
}

/** Slot values for a chapter's name and line: {river}, {council}, {town}, {project}. */
export function termSlots(t: Term): Record<string, SayVar> {
  const { model, state } = t;
  const slots: Record<string, SayVar> = {};
  const bad = t.events.filter((e) => !model.events.find((d) => d.id === e.event)?.good);
  const storm = [...bad].filter((e) => model.events.find((d) => d.id === e.event)?.track === "weather").sort((a, b) => b.severity - a.severity || a.step - b.step)[0];
  const river = storm ? riverAt(model, storm.councils[0]!) : undefined;
  if (river) slots.river = river;
  const council = dealsJudged(t, true)[0] ?? dealsJudged(t, false)[0] ?? mostMoved(t, false);
  if (council) slots.council = councilName(model, council);
  const town = firstTips(t, "rising")[0] ?? mostMoved(t, true);
  if (town) slots.town = townOf(model, town);
  const keystones = state.projects.filter((p) => isKeystone(model, p.project));
  const k = keystones.find((p) => p.status !== "building" && inTerm(t, p.readyStep)) ?? keystones.find((p) => inTerm(t, p.startedStep));
  const def = k ? model.projects.find((d) => d.id === k.project) : undefined;
  if (def) slots.project = def.name;
  return slots;
}

/**
 * A chapter about an event tells it where it landed: {town} and {river} come from the heaviest
 * event its `event_landed` condition matched, not from the term at large.
 */
function slotsFor(t: Term, def: ChapterDef, slots: Record<string, SayVar>): Record<string, SayVar> {
  const c = def.when.find((x): x is Extract<TermCondition, { kind: "event_landed" }> => x.kind === "event_landed" && x.at_most === undefined);
  const where = c && landedMatching(t, c)[0]?.councils[0];
  if (!where) return slots;
  const river = riverAt(t.model, where);
  return { ...slots, town: townOf(t.model, where), ...(river ? { river } : {}) };
}

/** The slots a chapter's name uses: two chapters with the same id and the same name slots are the same name. */
function nameKey(def: ChapterDef, slots: Record<string, SayVar>): string {
  const used = [...def.name.en.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
  return `${def.id}|${used.map((u) => JSON.stringify(slots[u] ?? null)).join("|")}`;
}

/** A chapter whose name needs a slot the term cannot fill does not fit. */
const slotsFilled = (def: ChapterDef, slots: Record<string, SayVar>): boolean =>
  [...def.name.en.matchAll(/\{(\w+)\}/g)].every((m) => slots[m[1]!] !== undefined);

/**
 * Name an election term as it closes: the first chapter by `priority` (1 first, as endings) whose
 * conditions all hold and whose name is not used yet in this game. If every fitting name is used,
 * the first that fits. With no chapters in the model, the fallback id.
 */
export function pickChapter(ctx: StepCtx, term: number, fromYear: number, toYear: number): ChapterRecord {
  const { model, state } = ctx;
  const t = termOf(model, state, fromYear);
  const slots = termSlots(t);
  const sorted = [...model.chapters].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const used = new Set(state.story.chapters.map((r) => {
    const def = model.chapters.find((d) => d.id === r.chapter);
    return def ? nameKey(def, r.slots) : r.chapter;
  }));
  const fits = sorted.filter((d) => d.when.every((c) => termHolds(t, c)))
    .map((d) => ({ d, s: slotsFor(t, d, slots) }))
    .filter(({ d, s }) => slotsFilled(d, s));
  const pick = fits.find(({ d, s }) => !used.has(nameKey(d, s))) ?? fits[0];
  return { term, fromYear, toYear, chapter: pick?.d.id ?? FALLBACK_CHAPTER, slots: pick?.s ?? slots };
}
