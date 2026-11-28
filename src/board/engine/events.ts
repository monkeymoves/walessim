/**
 * Futures, forecast, triggers, targets, responses and the severity budget
 * (docs/design/v2-board.md section 7).
 *
 * Hooks for the clock (clock.ts and clock-step.ts), each working on the step context's draft:
 * - `drawFuture` in `newBoard`, to set `state.future` from the seed.
 * - `forecastNext` at the start of every step: in `newBoard` for step 0, and at the end of each
 *   step after the clock moves on. Outside events are warned E1 `warn_years` ahead (fairness rule
 *   1); grown events are judged when a year closes, at most E1 `grown_at_once` every
 *   `grown_gap_years`, and warned `grown_warn_years` ahead. `severityUsed` counts the outside
 *   trouble warned so far.
 * - `landEvents` in every step, after held project effects and before spread.
 * - `respond` (with `respondBlockers`) for `act` on `{ kind: "respond" }`.
 * Read only helper for projects.ts: `rebuildShare` (rule E2).
 */
import { uniform } from "../../engine/rng";
import { trackValue } from "./conditions";
import type { StepCtx } from "./ctx";
import { applyOnce } from "./effects";
import { landOne, planEvent, preparedHere } from "./events-land";
import { outsideSchedule, repeatLimits } from "./events-schedule";
import { optParam } from "./rules";
import { specialStands } from "./specials";
import { ruleParam } from "./rule-defaults";
import { closesSpan, lastLandingStep, stepOfYear, stepsOf } from "./time";
import type {
  Blocker, BoardModel, BoardState, CouncilCode, EventId, EventRecord, Flow, Forecast, ForecastWarning, Text, TrackId,
} from "./types";
import { RULE_IDS } from "./types";

export { drawFuture, outsideSchedule, scheduledSeverity } from "./events-schedule";

/** Steps ahead an event is on the time line before the step it lands in (at least 1: warned in its own step). */
const lead = (model: BoardModel, param: "warn_years" | "grown_warn_years"): number =>
  Math.max(1, stepsOf(model, ruleParam(model, RULE_IDS.severity, param)));

/**
 * Grown events that may be warned now: not `once` and already seen, not already warned, not back
 * sooner or more often than E1 allows (`repeatLimits`), and not on a council hit in the last four years.
 */
function grownChoices(model: BoardModel, draft: BoardState, landing: number) {
  const seen = new Set(draft.events.map((r) => r.event));
  const recent = draft.step - stepsOf(model, 4);
  const { most, gapYears } = repeatLimits(model);
  const gap = stepsOf(model, gapYears);
  const comesBack = (id: EventId) => {
    const before = draft.events.filter((r) => r.event === id);
    return before.length < most && before.every((r) => landing - r.step >= gap);
  };
  return model.events
    .filter((e) => e.origin === "grown" && !(e.once && seen.has(e.id)) && !draft.forecast.some((f) => f.event === e.id) && comesBack(e.id))
    .map((e) => planEvent(model, draft, e, landing))
    .filter((f): f is NonNullable<typeof f> => !!f)
    .filter((f) => !draft.events.some((r) => r.event === f.event && r.step >= recent && r.councils.includes(f.councils[0]!)));
}

/** The step the last grown event was warned (landing step less its lead), or null. */
function lastGrownWarned(model: BoardModel, draft: BoardState): number | null {
  const grown = new Set(model.events.filter((e) => e.origin === "grown").map((e) => e.id));
  const steps = [...draft.events, ...draft.forecast].filter((x) => grown.has(x.event)).map((x) => x.step - lead(model, "grown_warn_years") + 1);
  return steps.length ? Math.max(...steps) : null;
}

/**
 * Is a grown event due to be warned now? The first comes in a seeded whole year from 0 to E1
 * `grown_first_years`, and each next one `grown_gap_years` after the last plus a seeded 0 to
 * `grown_jitter_years` whole years. So two game numbers on the same board meet different trouble
 * at different times (playtest 9 should-fix 12: game 2 met the same events in the same order).
 * Both params are 0 when the card lacks them: the first at once, then every `grown_gap_years`.
 */
export function grownDue(model: BoardModel, draft: BoardState, last: number | null): boolean {
  const year = Math.max(1, stepsOf(model, 1));
  const whole = (span: number, ...keys: (string | number)[]) => Math.floor(uniform(draft.seed, ...keys) * (Math.max(0, Math.round(span)) + 1)) * year;
  if (last === null) return draft.step >= whole(optParam(model, RULE_IDS.severity, "grown_first_years") ?? 0, "grown-first");
  const gap = Math.max(1, stepsOf(model, ruleParam(model, RULE_IDS.severity, "grown_gap_years")));
  return draft.step - last >= gap + whole(optParam(model, RULE_IDS.severity, "grown_jitter_years") ?? 0, "grown-gap", last);
}

/** Warn what is coming: scheduled outside events within their lead, and, when a year closes, grown ones. */
export function forecastNext(ctx: StepCtx): void {
  const { model, state: draft } = ctx;
  const now = draft.step;
  const schedule = outsideSchedule(model, draft.seed, draft.future);
  const outsideLead = lead(model, "warn_years");
  draft.severityUsed = schedule.filter((s) => s.step - outsideLead + 1 <= now).reduce((a, s) => a + s.severity, 0);
  const kept = draft.forecast.filter((f) => f.step >= now);
  const warned = new Set(kept.map((f) => `${f.event}@${f.step}`));
  const fresh = [];
  for (const s of schedule.filter((x) => x.step >= now && x.step - outsideLead + 1 <= now && !warned.has(`${x.event}@${x.step}`))) {
    const e = model.events.find((d) => d.id === s.event);
    const f = e && planEvent(model, draft, e, s.step);
    if (f) fresh.push(f);
  }
  draft.forecast = [...kept, ...fresh];
  const last = lastGrownWarned(model, draft);
  const judged = now === 0 || closesSpan(model, now, 1);
  const landing = now + lead(model, "grown_warn_years") - 1;
  if (judged && grownDue(model, draft, last) && landing <= lastLandingStep(model)) {
    const grown = grownChoices(model, draft, landing)
      .sort((a, b) => uniform(draft.seed, "grown", now, b.event) - uniform(draft.seed, "grown", now, a.event))
      .slice(0, ruleParam(model, RULE_IDS.severity, "grown_at_once"));
    draft.forecast = [...draft.forecast, ...grown];
  }
}

/**
 * Land the warned events whose landing step is this step. Responses left from earlier steps lapse
 * first (a response holds the clock, so in play none is left open). Each landed event may offer a
 * response, and a place visit open from the next step for `game.visit_open_years`.
 */
export function landEvents(ctx: StepCtx): { records: EventRecord[]; flows: Flow[] } {
  const { model, state: draft } = ctx;
  // Every response and event visit open now was offered by an earlier event: they lapse.
  const records: EventRecord[] = [];
  const flows: Flow[] = [];
  draft.pending = draft.pending.filter((p) => p.kind !== "respond");
  const due = draft.forecast.filter((x) => x.step === draft.step);
  for (const f of due) {
    const e = model.events.find((d) => d.id === f.event);
    if (!e) continue;
    const out = landOne(ctx, f);
    records.push(out.record);
    flows.push(...out.flows);
    ctx.flows.push(...out.flows);
    if (e.responses.length > 0) draft.pending.push({ kind: "respond", event: e.id, councils: [...f.councils] });
    const place = e.visit ? model.places.find((p) => p.id === e.visit) : undefined;
    if (place && f.councils.includes(place.council)) draft.pending.push({ kind: "visit", place: place.id, council: place.council, offeredBy: { event: e.id }, since: draft.step + 1 });
  }
  draft.events = [...draft.events, ...records];
  draft.forecast = draft.forecast.filter((x) => x.step !== draft.step);
  return { records, flows };
}

/** Coins an answer costs now: nothing for a storm once Farms paid to hold water is working (`storm_no_coins`). */
export function responseCost(model: BoardModel, state: BoardState, event: EventId, response: string): number {
  const e = model.events.find((d) => d.id === event);
  const cost = e?.responses.find((x) => x.id === response)?.cost ?? 0;
  return e?.track === "weather" && specialStands(model, state, "storm_no_coins") ? 0 : cost;
}

/** Why a response cannot be made now. Empty when it can. */
export function respondBlockers(model: BoardModel, state: BoardState, event: EventId, response: string): Blocker[] {
  const pending = state.pending.some((p) => p.kind === "respond" && p.event === event);
  const r = model.events.find((e) => e.id === event)?.responses.find((x) => x.id === response);
  if (!pending || !r) return [{ kind: "not_offered" }];
  const cost = responseCost(model, state, event, response);
  return cost > state.coins ? [{ kind: "coins", need: cost, have: state.coins }] : [];
}

/** Answer a landed event: pay its cost, apply its effects where it landed, and close the pending response. */
export function respond(ctx: StepCtx, event: EventId, response: string): void {
  const { model, state: draft } = ctx;
  const r = model.events.find((e) => e.id === event)?.responses.find((x) => x.id === response);
  const idx = [...draft.events].reverse().findIndex((x) => x.event === event && !x.response);
  if (!r || idx < 0) return;
  const at = draft.events.length - 1 - idx;
  const rec = draft.events[at]!;
  const cause = { kind: "response", event, response } as const;
  const cost = responseCost(model, draft, event, response);
  if (cost > 0) ctx.change({ council: null, quantity: "coins", delta: -cost, rule: RULE_IDS.coins, cause });
  applyOnce(ctx, r.effects, { councils: rec.councils }, cause, { rule: RULE_IDS.severity });
  draft.events = draft.events.map((x, i) => (i === at ? { ...x, response } : x));
  draft.pending = draft.pending.filter((p) => !(p.kind === "respond" && p.event === event));
}

/**
 * The i18n key of an event's name as a noun phrase that fits inside a sentence ("a dirty river",
 * "afon fudr"), in board.json `event.<id>`. Say values carry it as a key and the screens look it
 * up; the event's `name` stays its title (playtest 8, must-fix 7: "The river runs dirty may hit").
 */
export const eventNoun = (event: EventId): string => `board.event.${event}`;

/**
 * The river an event names in a council: the one flowing on from it to `next` (the next council
 * an event that travels downstream reaches), else any flowing out of it, else any flowing into
 * it (a river's last council, such as Cardiff on the Taff). Undefined where no river runs.
 */
export function riverAt(model: BoardModel, council: CouncilCode, next?: CouncilCode): Text | undefined {
  const rivers = model.links.filter((l) => l.kind === "river" && l.name);
  return (rivers.find((l) => l.from === council && l.to === next) ?? rivers.find((l) => l.from === council) ?? rivers.find((l) => l.to === council))?.name;
}

/** "A, B and C" in both languages, from council names. */
export function joinNames(names: Text[]): Text {
  const join = (xs: string[], and: string) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);
  const last = names[names.length - 1]?.cy ?? "";
  const cyAnd = /^[aeiouwyâêîôûŵŷAEIOUWY]/.test(last) ? "ac" : "a";
  return { en: join(names.map((n) => n.en), "and"), cy: join(names.map((n) => n.cy), cyAnd), cy_review: true };
}

const councilName = (model: BoardModel, code: CouncilCode): Text => model.councils.find((c) => c.code === code)?.name ?? { en: code, cy: code };

/** When the future is named on the forecast: two years (one track block) before the first election. */
function revealStep(model: BoardModel): number {
  const first = model.game.election_years[0] ?? model.game.end_year;
  return Math.max(1, stepOfYear(model, first - model.game.track_years));
}

/** API: every warned event, soonest first, with its window and places, and a hint at the future. */
export function forecast(model: BoardModel, state: BoardState): Forecast {
  const soonest = [...state.forecast].sort((a, b) => a.fromStep - b.fromStep || a.step - b.step || a.event.localeCompare(b.event));
  const warnings: ForecastWarning[] = soonest.map((f) => {
    const e = model.events.find((d) => d.id === f.event)!;
    const river = riverAt(model, f.councils[0]!, f.councils[1]);
    return {
      event: e.id, name: e.name, good: e.good, councils: f.councils, preparedBy: e.prepared_by, fromStep: f.fromStep, toStep: f.toStep,
      cutBy: preparedHere(model, state, e, f.councils[0]!),
      say: { key: "board.forecast.warning", vars: { line: e.warning, council: councilName(model, f.councils[0]!), councils: joinNames(f.councils.map((c) => councilName(model, c))), ...(river ? { river } : {}) } },
    };
  });
  let future: Forecast["future"] = null;
  const f = model.futures.find((x) => x.id === state.future);
  if (f && state.step >= revealStep(model)) future = { key: "board.forecast.future.named", vars: { name: f.name, note: f.note } };
  else if (f && state.step > 0) {
    const tracks: TrackId[] = ["weather", "economy", "prices"];
    const strongest = tracks.sort((a, b) => trackValue(model, state, b) - trackValue(model, state, a))[0]!;
    future = { key: `board.forecast.future.leaning.${strongest}` };
  }
  return { step: state.step, year: state.year, warnings, future };
}

/**
 * Rule E2, "rebuild better" (16.4): the trouble that makes builds in this council faster now, if
 * any. An event of E2 `severity_at_least` or more (as it landed) hit the council in the last `years`.
 * Undefined when the model has no E2 card.
 */
export function rebuildAfter(model: BoardModel, state: BoardState, council: CouncilCode): { record: EventRecord; untilStep: number } | undefined {
  const at = optParam(model, RULE_IDS.rebuild, "severity_at_least");
  if (at === undefined) return undefined;
  const span = stepsOf(model, optParam(model, RULE_IDS.rebuild, "years") ?? 2);
  const record = [...state.events].reverse().find((e) => e.step >= state.step - span && e.severity >= at && e.councils.includes(council)
    && !model.events.find((d) => d.id === e.event)?.good);
  return record ? { record, untilStep: record.step + span } : undefined;
}

/** The share of its build time a new build in this council takes now (rule E2): `time_share` after trouble, else 1. */
export function rebuildShare(model: BoardModel, state: BoardState, council: CouncilCode): number {
  return rebuildAfter(model, state, council) ? (optParam(model, RULE_IDS.rebuild, "time_share") ?? 0.5) : 1;
}
