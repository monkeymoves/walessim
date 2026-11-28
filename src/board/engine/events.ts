/**
 * Futures, forecast, triggers, targets, responses and the severity budget
 * (docs/design/v2-board.md section 7).
 *
 * Hooks for turn.ts (package 2, through hooks.ts), each working on the turn context's draft:
 * - `drawFuture` in `newBoard`, to set `state.future` from the seed.
 * - `forecastNext` at the start of every turn: in `newBoard` for turn 0, and at the end of
 *   `endTurn` after the turn and year move on. Every event is warned here a turn ahead (fairness
 *   rule 1), and `severityUsed` counts the outside trouble drawn so far.
 * - `landEvents` at the end of every turn, after held project effects and before spread.
 * - `respond` (with `respondBlockers`) is ready for `act` on `{ kind: "respond" }` if wanted.
 */
import { uniform } from "../../engine/rng";
import { trackValue } from "./conditions";
import type { TurnCtx } from "./ctx";
import { applyOnce } from "./effects";
import { landOne, planEvent, preparedHere } from "./events-land";
import { outsideSchedule } from "./events-schedule";
import { ruleParam } from "./rule-defaults";
import type {
  Blocker, BoardModel, BoardState, CouncilCode, EventId, EventRecord, Flow, Forecast, ForecastWarning, Text, TrackId,
} from "./types";
import { RULE_IDS } from "./types";

export { drawFuture, outsideSchedule, scheduledSeverity } from "./events-schedule";

/** Grown events that may be warned now: not `once` and already seen, and not on a council hit in the last two turns. */
function grownChoices(model: BoardModel, draft: BoardState) {
  const seen = new Set(draft.events.map((r) => r.event));
  return model.events
    .filter((e) => e.origin === "grown" && !(e.once && seen.has(e.id)))
    .map((e) => planEvent(model, draft, e))
    .filter((f): f is NonNullable<typeof f> => !!f)
    .filter((f) => !draft.events.some((r) => r.event === f.event && r.turn >= draft.turn - 2 && r.councils.includes(f.councils[0]!)));
}

/** Warn this turn's events: the scheduled outside event, and up to E1 `grown_per_turn` grown ones. */
export function forecastNext(ctx: TurnCtx): void {
  const { model, state: draft } = ctx;
  const schedule = outsideSchedule(model, draft.seed, draft.future);
  draft.severityUsed = schedule.filter((s) => s.turn <= draft.turn).reduce((a, s) => a + s.severity, 0);
  const kept = draft.forecast.filter((f) => f.turn > draft.turn);
  const now = [];
  for (const s of schedule.filter((x) => x.turn === draft.turn)) {
    const e = model.events.find((d) => d.id === s.event);
    const f = e && planEvent(model, draft, e);
    if (f) now.push(f);
  }
  const perTurn = ruleParam(model, RULE_IDS.severity, "grown_per_turn");
  const grown = grownChoices(model, draft)
    .sort((a, b) => uniform(draft.seed, "grown", draft.turn, b.event) - uniform(draft.seed, "grown", draft.turn, a.event))
    .slice(0, perTurn);
  draft.forecast = [...kept, ...now, ...grown];
}

/**
 * Land this turn's warned events. Responses and visits left from earlier turns lapse first.
 * Each landed event may offer a response and a place visit until the end of the next turn.
 */
export function landEvents(ctx: TurnCtx): { records: EventRecord[]; flows: Flow[] } {
  const { model, state: draft } = ctx;
  // Every response and event visit open now was offered by an earlier turn's event: they lapse.
  draft.pending = draft.pending.filter((p) => p.kind === "visit" && !("event" in p.offeredBy));
  const records: EventRecord[] = [];
  const flows: Flow[] = [];
  for (const f of draft.forecast.filter((x) => x.turn === draft.turn)) {
    const e = model.events.find((d) => d.id === f.event);
    if (!e) continue;
    const out = landOne(ctx, f);
    records.push(out.record);
    flows.push(...out.flows);
    ctx.flows.push(...out.flows);
    if (e.responses.length > 0) draft.pending.push({ kind: "respond", event: e.id, councils: [...f.councils] });
    const place = e.visit ? model.places.find((p) => p.id === e.visit) : undefined;
    if (place && f.councils.includes(place.council)) draft.pending.push({ kind: "visit", place: place.id, council: place.council, offeredBy: { event: e.id } });
  }
  draft.events = [...draft.events, ...records];
  draft.forecast = draft.forecast.filter((x) => x.turn !== draft.turn);
  return { records, flows };
}

/** Why a response cannot be made now. Empty when it can. */
export function respondBlockers(model: BoardModel, state: BoardState, event: EventId, response: string): Blocker[] {
  const pending = state.pending.some((p) => p.kind === "respond" && p.event === event);
  const r = model.events.find((e) => e.id === event)?.responses.find((x) => x.id === response);
  if (!pending || !r) return [{ kind: "not_offered" }];
  return r.cost > state.coins ? [{ kind: "coins", need: r.cost, have: state.coins }] : [];
}

/** Answer a landed event: pay its cost, apply its effects where it landed, and close the pending response. */
export function respond(ctx: TurnCtx, event: EventId, response: string): void {
  const { model, state: draft } = ctx;
  const r = model.events.find((e) => e.id === event)?.responses.find((x) => x.id === response);
  const idx = [...draft.events].reverse().findIndex((x) => x.event === event && !x.response);
  if (!r || idx < 0) return;
  const at = draft.events.length - 1 - idx;
  const rec = draft.events[at]!;
  const cause = { kind: "response", event, response } as const;
  if (r.cost > 0) ctx.change({ council: null, quantity: "coins", delta: -r.cost, rule: RULE_IDS.coins, cause });
  applyOnce(ctx, r.effects, { councils: rec.councils }, cause, { rule: RULE_IDS.severity });
  draft.events = draft.events.map((x, i) => (i === at ? { ...x, response } : x));
  draft.pending = draft.pending.filter((p) => !(p.kind === "respond" && p.event === event));
}

/** "A, B and C" in both languages, from council names. */
export function joinNames(names: Text[]): Text {
  const join = (xs: string[], and: string) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);
  const last = names[names.length - 1]?.cy ?? "";
  const cyAnd = /^[aeiouwyâêîôûŵŷAEIOUWY]/.test(last) ? "ac" : "a";
  return { en: join(names.map((n) => n.en), "and"), cy: join(names.map((n) => n.cy), cyAnd), cy_review: true };
}

const councilName = (model: BoardModel, code: CouncilCode): Text => model.councils.find((c) => c.code === code)?.name ?? { en: code, cy: code };

/** The first turn whose end is an election year: when the future is named on the forecast. */
function revealTurn(model: BoardModel): number {
  const first = model.game.election_years[0] ?? model.game.end_year;
  return Math.max(1, Math.round((first - model.game.first_year) / model.game.turn_years) - 1);
}

/** API: the warned events for the end of this turn, with their places, and a hint at the future. */
export function forecast(model: BoardModel, state: BoardState): Forecast {
  const warnings: ForecastWarning[] = state.forecast.filter((f) => f.turn === state.turn).map((f) => {
    const e = model.events.find((d) => d.id === f.event)!;
    const river = model.links.find((l) => l.kind === "river" && l.from === f.councils[0])?.name;
    return {
      event: e.id, name: e.name, good: e.good, councils: f.councils, preparedBy: e.prepared_by,
      cutBy: preparedHere(model, state, e, f.councils[0]!),
      say: { key: "forecast.warning", vars: { line: e.warning, council: councilName(model, f.councils[0]!), councils: joinNames(f.councils.map((c) => councilName(model, c))), ...(river ? { river } : {}) } },
    };
  });
  let future: Forecast["future"] = null;
  const f = model.futures.find((x) => x.id === state.future);
  if (f && state.turn >= revealTurn(model)) future = { key: "forecast.future.named", vars: { name: f.name, note: f.note } };
  else if (f && state.turn > 0) {
    const tracks: TrackId[] = ["weather", "economy", "prices"];
    const strongest = tracks.sort((a, b) => trackValue(model, state, b) - trackValue(model, state, a))[0]!;
    future = { key: `forecast.future.leaning.${strongest}` };
  }
  return { turn: state.turn, year: state.year, warnings, future };
}
