/**
 * The game: state, the step machine of a term (game-design 2.2), resolution across the ensemble,
 * Trust and the caretaker, preview, traces, the end result, save and load.
 * The public surface and its documentation are in ./api.ts.
 */
import type { Card, CompiledModel, Effect, Grade, LaFlag, RegionId, StrandId, Text, TrustBand } from "../model/schema";
import { REGION_IDS, STRAND_IDS } from "../model/schema";
import type * as A from "./api";
import { EngineError } from "./errors";
import { hashSeed, uniform } from "./rng";
import { bandValue, displayPips, makeContext, walesDelta, walesValue, type Ctx } from "./scores";
import { buildSchedule, type TermSchedule } from "./schedule";
import { deal, initialDeck } from "./deck";
import { gradeBethesda, gradeRhondda, tipName, tipRisk } from "./places";
import { bandFor, computeTrust } from "./trust";
import { archetypeOf, level, openingVoice, overlookedRegion, pickVoice, writeLetter, type NamedLine, type VoiceEventCandidate } from "./voices";
import { fill, type SlotValue } from "./welsh";
import {
  causeKey,
  cloneRun,
  initRun,
  maskWeights,
  runStrands,
  sampleParams,
  stepRun,
  type CauseRef,
  type Delivery,
  type Employer,
  type EventCheck,
  type RunParams,
  type RunState,
  type TermInput,
} from "./sim";
import { landOnly } from "./sim";
import { caretakerPlays } from "./caretaker";

// ---------------------------------------------------------------------------
// Internal state (state.sim)

interface PlayRec {
  id: string;
  card: string;
  term: number;
  regions: RegionId[] | null;
  las: number[];
  cost: number;
  caretaker: boolean;
}

interface UpkeepRec {
  id: string;
  card: string;
  play: string;
  regions: RegionId[] | null;
  las: number[];
  pips: number;
  every: number;
  times: number;
  paid: number;
  skipped: number;
  nextTerm: number;
  lapsed: boolean;
  mintedYear: number;
}

interface Sim {
  schedule: TermSchedule[];
  deliveries: Delivery[];
  plays: PlayRec[];
  upkeeps: UpkeepRec[];
  employers: Employer[];
  regionLastCard: Record<RegionId, number>;
  runs: RunState[];
  params: RunParams[];
  lastContribs: A.Contribution[] | null;
  flowPips: number[];
  stockPips: number[];
  start: { flow: number[]; stock: number[] };
  usedVoices: string[];
  carriedHit: number;
  carriedContingency: number;
  held: string | null;
  caretakerNext: boolean;
  /** Visits offered by the first game's curated script, already used. */
  firstVisits: string[];
  /** Strands asked for at each opening, oldest first (the pledge rotates). */
  pledgeOffers?: StrandId[];
  /** Rhondda tips made safe on earlier visits (they stay stitched and drop a risk step). */
  stitched?: string[];
  /** Grades per place this term. */
  termGrade: { place: "rhondda" | "bethesda"; grade: Grade; threads: string[]; stayed: boolean } | null;
  /** Trust reasons collected during the term (card side effects). */
  extraTrust: A.TrustReason[];
  pledgeBrokenByUpkeep: boolean;
  /** Budget effects of this term's standing ticket and repayments, for the ledger. */
  spent: number;
  ghost: { lived: number; left: number; result: number } | null;
}

const sim = (s: A.GameState) => s.sim as Sim;
/** A term that never comes (JSON-safe, unlike Infinity). */
const NEVER = 9999;

// ---------------------------------------------------------------------------
// Options and new game

function resolveOptions(model: CompiledModel, o: A.NewGameOptions = {}): A.ResolvedOptions {
  const w = { ...Object.fromEntries(STRAND_IDS.map((s) => [s, 1])), ...(o.weights ?? {}) } as Record<StrandId, number>;
  const total = STRAND_IDS.reduce((a, s) => a + Math.max(0, w[s]), 0) || 1;
  // already-normalised weights (a reloaded game) are kept exactly, so replays are bit-identical
  const weights = Object.fromEntries(STRAND_IDS.map((s) => [s, Math.abs(total - 1) < 1e-9 ? Math.max(0, w[s]) : Math.max(0, w[s]) / total])) as Record<StrandId, number>;
  return {
    // Clamp run counts: options can arrive from a shared save link, so they are untrusted.
    runs: clampRuns(o.runs, model.game.runs),
    previewRuns: clampRuns(o.previewRuns, model.game.preview_runs),
    firstGame: !!o.firstGame,
    daily: o.daily ?? null,
    weights,
    paramOverrides: { ...(o.paramOverrides ?? {}) },
    caretakerGhost: o.caretakerGhost ?? true,
    timeBudgetMs: Math.min(2000, Math.max(50, Number.isFinite(o.timeBudgetMs) ? (o.timeBudgetMs as number) : 250)),
  };
}

export function validateOverrides(model: CompiledModel, overrides: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(overrides)) {
    const [rid, pn] = k.split(".");
    const p = model.rules.find((r) => r.id === rid)?.params[pn ?? ""];
    if (!p) out.push(`unknown parameter ${k}`);
    else if (!p.adjustable) out.push(`${k} is fixed`);
    else if (typeof v !== "number" || v < p.min || v > p.max) out.push(`${k} must be between ${p.min} and ${p.max}`);
  }
  return out;
}

export function dailySeed(date: string): number {
  return hashSeed(`etifeddiaeth-daily-${date}`);
}

export function trustBand(model: CompiledModel, trust: number): TrustBand {
  return bandFor(model.game, trust).id;
}

export function newGame(model: CompiledModel, seedIn: number | string, options?: A.NewGameOptions): A.GameState {
  const ctx = makeContext(model);
  const opts = resolveOptions(model, options);
  const problems = validateOverrides(model, opts.paramOverrides);
  if (problems.length) throw new EngineError("bad_override", problems.join("; "));
  const seed = hashSeed(seedIn);
  const runs = Array.from({ length: opts.runs }, (_, r) => initRun(ctx, seed, r));
  const params = Array.from({ length: opts.runs }, (_, r) => sampleParams(ctx, seed, r, opts.paramOverrides));
  const start = runStrands(ctx, runs[0]!);
  const s: Sim = {
    schedule: buildSchedule(ctx, seed, opts.firstGame),
    deliveries: [],
    plays: [],
    upkeeps: [],
    employers: [],
    regionLastCard: { north: -1, mid: -1, southwest: -1, southeast: -1 },
    runs,
    params,
    lastContribs: null,
    flowPips: start.flow.map((v) => Math.round(v)),
    stockPips: start.stock.map((v) => Math.round(v)),
    start,
    usedVoices: [],
    carriedHit: 0,
    carriedContingency: 0,
    held: null,
    caretakerNext: false,
    firstVisits: [],
    termGrade: null,
    extraTrust: [],
    pledgeBrokenByUpkeep: false,
    spent: 0,
    ghost: null,
  };
  const state: A.GameState = {
    version: 1,
    modelHash: model.meta.hash,
    modified: Object.keys(opts.paramOverrides).length > 0,
    seed,
    seedLabel: opts.daily ?? String(seedIn),
    options: opts,
    term: 0,
    year: model.game.years[0]!,
    step: "opening",
    caretaker: false,
    returning: false,
    opening: null,
    budget: emptyBudget(),
    upkeepDue: [],
    trust: model.game.trust.start,
    trustBand: bandFor(model.game, model.game.trust.start).id,
    cardLimit: bandFor(model.game, model.game.trust.start).cards,
    hand: [],
    deck: initialDeck(ctx, seed),
    pledgeOffer: null,
    pledge: null,
    shadowPledge: null,
    activeTrends: [],
    peekedNext: null,
    peekedThisTerm: false,
    shock: null,
    visitOffer: null,
    plays: null,
    visit: null,
    post: [],
    debts: [],
    deferrals: 0,
    ledger: { debts: [], liabilities: [], deferrals: [], grades: [], lostTerms: [], pledges: [] },
    strands: [],
    history: [],
    lastOutcome: null,
    result: null,
    runsNote: null,
    log: [],
    sim: s,
  };
  state.strands = strandViews(ctx, state);
  return openTerm(ctx, state, 0);
}

const emptyBudget = (): A.BudgetView => ({ base: 0, debtInterest: 0, returnPenalty: 0, curveball: 0, carriedHit: 0, carried: 0, upkeep: 0, peek: 0, available: 0 });

// ---------------------------------------------------------------------------
// Opening a term

function openTerm(ctx: Ctx, prev: A.GameState, term: number): A.GameState {
  const g = ctx.model.game;
  const state: A.GameState = { ...prev, sim: { ...sim(prev) } };
  const s = sim(state);
  state.term = term;
  state.year = g.years[term]!;
  state.caretaker = s.caretakerNext;
  s.caretakerNext = false;
  state.plays = null;
  state.visit = null;
  state.visitOffer = null;
  state.shock = null;
  state.pledge = null;
  state.peekedThisTerm = false;
  state.peekedNext = null;
  s.termGrade = null;
  s.extraTrust = [];
  s.pledgeBrokenByUpkeep = false;
  s.spent = 0;

  const sch = s.schedule[term]!;
  const active = [...state.activeTrends];
  if (sch.newTrend) active.push({ curveball: sch.newTrend, sinceTerm: term, sinceYear: state.year });
  state.activeTrends = active;
  const activeIds = active.map((a) => a.curveball);

  // the hand
  const size = term === 0 ? g.first_hand_size : g.hand_size;
  const dealt = deal(ctx, state.deck, s.held, size, activeIds);
  state.hand = dealt.hand;
  state.deck = dealt.deck;
  s.held = null;

  // upkeep due
  state.upkeepDue = s.upkeeps
    .filter((u) => !u.lapsed && u.nextTerm === term)
    .map((u) => ({ id: u.id, card: u.card, pips: u.pips, note: ctx.cards.get(u.card)!.upkeep!.note, region: u.regions?.[0] ?? null }));

  // budget
  const b = emptyBudget();
  b.base = g.budget;
  b.debtInterest = -state.debts.length * g.debt.interest;
  b.returnPenalty = state.returning ? -g.caretaker.return_budget_penalty : 0;
  b.curveball = curveballBudget(ctx, state, activeIds);
  b.carriedHit = -s.carriedHit;
  b.carried = s.carriedContingency;
  b.upkeep = -state.upkeepDue.reduce((a, u) => a + u.pips, 0);
  b.available = Math.max(0, b.base + b.debtInterest + b.returnPenalty + b.curveball + b.carriedHit + b.carried + b.upkeep);
  state.budget = b;
  s.carriedHit = 0;
  s.carriedContingency = 0;

  // pledge offer and the opening voice
  const lastVoice = state.lastOutcome?.voice ?? null;
  state.pledgeOffer = term >= 1 && !state.caretaker ? pledgeStrand(ctx, state) : null;
  if (state.pledgeOffer) s.pledgeOffers = [...(s.pledgeOffers ?? []), state.pledgeOffer];
  // no voice twice in a game unless the pool runs out (playtest 1)
  const ov = state.pledgeOffer ? openingVoice(ctx, state.seed, term, state.pledgeOffer, mostMovedLa(ctx, s), s.usedVoices) : null;
  if (ov) s.usedVoices = [...s.usedVoices, ov.template];
  state.opening = {
    year: state.year,
    arrivals: state.post.filter((p) => p.arrivesTerm === term),
    newTrend: sch.newTrend,
    voice: ov ?? lastVoice,
    caretaker: state.caretaker,
    returning: state.returning,
  };
  if (state.caretaker) state.cardLimit = 2;
  state.step = "opening";
  state.strands = strandViews(ctx, state);
  return state;
}

function curveballBudget(ctx: Ctx, state: A.GameState, active: string[]): number {
  let v = 0;
  for (const id of active) {
    for (const e of ctx.curveballs.get(id)!.slow) {
      if (e.target !== "budget") continue;
      if (!worldCondition(ctx, state, e, null)) continue;
      v += (e.amount ?? 0) * e.sign;
    }
  }
  return v;
}

/** The strand the opening voice asks for: the lowest flow pip, ties to the one that fell most. */
/**
 * The strand the opening voice asks you to promise (playtest 1): the one that fell furthest last term,
 * else the weakest, never a strand asked in either of the last two terms, preferring strands with an
 * opening voice template.
 */
function pledgeStrand(ctx: Ctx, state: A.GameState): StrandId {
  const last = state.lastOutcome?.strands ?? [];
  const recent = (sim(state).pledgeOffers ?? []).slice(-2);
  const fall = (id: StrandId) => {
    const c = last.find((x) => x.strand === id);
    return c ? c.flowAfter - c.flowBefore : 0;
  };
  const order = [...state.strands].sort((a, b) => fall(a.strand) - fall(b.strand) || a.flowPips - b.flowPips || a.flow - b.flow);
  const fresh = order.filter((x) => !recent.includes(x.strand));
  const pool = fresh.length ? fresh : order;
  const withVoice = pool.find((x) => ctx.model.voices.some((v) => v.event === "opening" && v.strand === x.strand));
  return (withVoice ?? pool[0]!).strand;
}

function mostMovedLa(ctx: Ctx, s: Sim, among?: number[]): number {
  const r = s.runs[0]!;
  let best = among?.[0] ?? 0, bestV = -1;
  for (const i of among ?? ctx.las.map((_, k) => k)) {
    let v = 0;
    for (const ids of ctx.strandFlow) for (const c of ids) if (ctx.comps[c]!.aggregate !== "gap") v += r.s[c]![i]! - ctx.base[c]![i]!;
    if (Math.abs(v) > bestV) {
      bestV = Math.abs(v);
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Strand views

function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return 0;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}
const median = (xs: number[]) => quantile(xs, 0.5);

function sharpOf(ctx: Ctx, values: number[], med: number): boolean {
  const pip = Math.round(med);
  return values.filter((v) => Math.round(v) === pip).length / values.length >= ctx.model.game.sharp_share;
}

function ensembleStrands(ctx: Ctx, runs: RunState[]) {
  const per = runs.map((r) => runStrands(ctx, r));
  return STRAND_IDS.map((_, i) => {
    const f = per.map((p) => p.flow[i]!);
    const k = per.map((p) => p.stock[i]!);
    const fm = median(f), km = median(k);
    return { flow: fm, stock: km, flowSharp: sharpOf(ctx, f, fm), stockSharp: sharpOf(ctx, k, km), p10: quantile(f, 0.1), p90: quantile(f, 0.9), kp10: quantile(k, 0.1), kp90: quantile(k, 0.9) };
  });
}

function strandViews(ctx: Ctx, state: A.GameState): A.StrandView[] {
  const s = sim(state);
  const e = ensembleStrands(ctx, s.runs);
  return STRAND_IDS.map((id, i) => ({
    strand: id,
    flow: e[i]!.flow,
    stock: e[i]!.stock,
    flowPips: s.flowPips[i]!,
    stockPips: s.stockPips[i]!,
    flowSharp: e[i]!.flowSharp,
    stockSharp: e[i]!.stockSharp,
    flowP10: e[i]!.p10,
    flowP90: e[i]!.p90,
    beyondInheritance: s.stockPips[i]! < s.flowPips[i]!,
  }));
}

// ---------------------------------------------------------------------------
// Plays: scope, cost, validation

function compactsInForce(state: A.GameState, term: number): PlayRec[] {
  return sim(state).plays.filter((p) => p.card === "regional-compact" && term - p.term <= 1 && p.term <= term);
}

export function cardCost(model: CompiledModel, state: A.GameState, play: A.CardPlay): number {
  const ctx = makeContext(model);
  const card = ctx.cards.get(play.card);
  if (!card) return 0;
  let cost = card.cost;
  for (const t of state.activeTrends) {
    for (const e of ctx.curveballs.get(t.curveball)!.slow) {
      if (e.target === "card_cost" && e.tag && card.tags.includes(e.tag)) cost += (e.amount ?? 0) * e.sign;
    }
  }
  if (card.scope !== "two_regions" && play.regions && play.regions.length === 2) cost += 1;
  return Math.max(0, cost);
}

function playRegions(card: Card, play: A.CardPlay): RegionId[] | null {
  if (card.scope === "national") return null;
  if (play.regions && play.regions.length) return [...play.regions];
  if (play.region) return [play.region];
  return null;
}

function regionLas(ctx: Ctx, regions: RegionId[] | null): number[] {
  if (!regions) return ctx.las.map((_, i) => i);
  return regions.flatMap((r) => ctx.regionLas[r]);
}

function standingBonus(model: CompiledModel, plays: A.Plays): number {
  if (!plays.standing) return 0;
  return model.standing.find((s) => s.id === plays.standing)?.budget ?? 0;
}

function playCost(model: CompiledModel, state: A.GameState, plays: A.Plays): number {
  const g = model.game;
  let cost = plays.cards.reduce((a, p) => a + cardCost(model, state, p), 0);
  cost += (plays.repayDebt ?? 0) * g.debt.clear_cost;
  if (plays.repair) cost += model.standing.find((s) => s.id === "defer-maintenance")?.clear_cost ?? 3;
  return cost;
}

function availableFor(model: CompiledModel, state: A.GameState, plays: A.Plays): number {
  const refund = (plays.skipUpkeep ?? []).reduce((a, id) => a + (state.upkeepDue.find((u) => u.id === id)?.pips ?? 0), 0);
  return state.budget.available + standingBonus(model, plays) + refund;
}

export function validatePlays(model: CompiledModel, state: A.GameState, plays: A.Plays): A.Problem[] {
  const ctx = makeContext(model);
  const out: A.Problem[] = [];
  if (state.step !== "plan") out.push({ code: "wrong_step", detail: state.step });
  const seen = new Set<string>();
  for (const p of plays.cards) {
    const card = ctx.cards.get(p.card);
    if (!card || !state.hand.includes(p.card)) {
      out.push({ code: "not_in_hand", card: p.card });
      continue;
    }
    if (seen.has(p.card)) out.push({ code: "duplicate", card: p.card });
    seen.add(p.card);
    const legal = card.regions ?? [...REGION_IDS];
    if (card.scope === "region" && !p.region && !(p.regions && p.regions.length)) out.push({ code: "needs_region", card: p.card });
    if (card.scope === "two_regions") {
      if (!p.regions || p.regions.length !== 2 || p.regions[0] === p.regions[1]) out.push({ code: "two_regions_needed", card: p.card });
    } else if (p.regions && p.regions.length) {
      if (card.scope === "national") out.push({ code: "bad_region", card: p.card });
      const compacts = compactsInForce(state, state.term);
      if (p.regions.length !== 2 || !compacts.some((c) => p.regions!.every((r) => c.regions?.includes(r)))) out.push({ code: "compact_not_in_force", card: p.card });
    }
    for (const r of [...(p.region ? [p.region] : []), ...(p.regions ?? [])]) if (!legal.includes(r) || card.scope === "national") out.push({ code: "bad_region", card: p.card, detail: r });
  }
  if (plays.cards.length > state.cardLimit) out.push({ code: "over_limit", detail: String(state.cardLimit) });
  if (plays.standing && !model.standing.some((s) => s.id === plays.standing)) out.push({ code: "standing_unknown", detail: plays.standing });
  if (plays.standing === "borrow-to-invest" && state.debts.length >= model.game.debt.max_tokens) out.push({ code: "debt_max" });
  if ((plays.repayDebt ?? 0) > state.debts.length) out.push({ code: "no_debt" });
  if (plays.repair && state.deferrals <= 0) out.push({ code: "nothing_to_repair" });
  if (plays.holdOver && (!state.hand.includes(plays.holdOver) || plays.cards.some((c) => c.card === plays.holdOver))) out.push({ code: "hold_over_invalid", card: plays.holdOver });
  for (const id of plays.skipUpkeep ?? []) if (!state.upkeepDue.some((u) => u.id === id)) out.push({ code: "upkeep_unknown", detail: id });
  if (playCost(model, state, plays) > availableFor(model, state, plays)) out.push({ code: "over_budget" });
  return out;
}

// ---------------------------------------------------------------------------
// The step machine

export function dispatch(model: CompiledModel, state: A.GameState, action: A.Action): A.GameState {
  const ctx = makeContext(model);
  const next = apply(ctx, state, action);
  return { ...next, log: [...state.log, action] };
}

function need(state: A.GameState, step: A.StepId, action: string) {
  if (state.step !== step) throw new EngineError("wrong_step", `${action} is not allowed at step ${state.step}`);
}

function apply(ctx: Ctx, state: A.GameState, action: A.Action): A.GameState {
  const model = ctx.model;
  switch (action.type) {
    case "open": {
      need(state, "opening", "open");
      if (state.caretaker) return { ...state, step: "caretaker" };
      return { ...state, step: state.term >= 1 ? "pledge" : "plan" };
    }
    case "pledge": {
      need(state, "pledge", "pledge");
      const st = { ...state, step: "plan" as const, pledge: action.strand };
      if (action.strand) st.ledger = { ...st.ledger, pledges: [...st.ledger.pledges, { year: st.year, strand: action.strand, kept: null }] };
      return st;
    }
    case "peek": {
      need(state, "plan", "peek");
      if (state.peekedThisTerm) throw new EngineError("peek_used", "already peeked this term");
      const cost = model.game.peek_cost;
      if (state.budget.available < cost) throw new EngineError("over_budget", "not enough pips to peek");
      const nxt = sim(state).schedule[state.term + 1];
      return {
        ...state,
        peekedThisTerm: true,
        peekedNext: nxt ? (nxt.newTrend ?? "none") : "none",
        budget: { ...state.budget, peek: -cost, available: state.budget.available - cost },
      };
    }
    case "commit": {
      need(state, "plan", "commit");
      const problems = validatePlays(model, state, action.plays);
      if (problems.length) throw new EngineError("invalid_plan", problems.map((p) => p.code + (p.card ? `:${p.card}` : "")).join(", "));
      return commit(ctx, state, action.plays, false);
    }
    case "visit": {
      need(state, "visit", "visit");
      return chooseVisit(ctx, state, action.choice);
    }
    case "respond": {
      need(state, "passing", "respond");
      return resolveTerm(ctx, state, action.response);
    }
    case "continue": {
      need(state, "changed", "continue");
      return { ...state, step: "election" };
    }
    case "next": {
      need(state, "election", "next");
      if (state.term + 1 >= model.game.years.length) return finish(ctx, state);
      const returning = state.caretaker;
      const st = openTerm(ctx, { ...state, returning }, state.term + 1);
      return st;
    }
    case "caretaker": {
      need(state, "caretaker", "caretaker");
      return playCaretaker(ctx, state, action.shadowPledge);
    }
  }
}

function commit(ctx: Ctx, prev: A.GameState, plays: A.Plays, caretaker: boolean): A.GameState {
  const model = ctx.model;
  const state: A.GameState = { ...prev, sim: { ...sim(prev) } };
  const s = sim(state);
  const g = model.game;
  s.plays = [...s.plays];
  s.upkeeps = s.upkeeps.map((u) => ({ ...u }));
  s.employers = [...s.employers];
  s.regionLastCard = { ...s.regionLastCard };
  const term = state.term;

  // cards
  plays.cards.forEach((p, i) => {
    const card = ctx.cards.get(p.card)!;
    const regions = playRegions(card, p);
    const rec: PlayRec = { id: `p${term}-${i}-${p.card}`, card: p.card, term, regions, las: regionLas(ctx, regions), cost: cardCost(model, state, p), caretaker };
    s.plays.push(rec);
    if (card.tags.includes("fragile")) s.employers.push({ play: rec.id, las: rec.las });
    if (card.upkeep) {
      s.upkeeps.push({
        id: `u-${rec.id}`,
        card: card.id,
        play: rec.id,
        regions,
        las: rec.las,
        pips: card.upkeep.pips,
        every: card.upkeep.every,
        times: card.upkeep.times,
        paid: 0,
        skipped: 0,
        nextTerm: term + card.upkeep.every,
        lapsed: false,
        mintedYear: state.year,
      });
    }
    const reached = regions ?? (model.game.trust.national_counts_for_neglect ? [...REGION_IDS] : []);
    for (const r of reached) s.regionLastCard[r] = term;
    // a national card that lands somewhere specific reaches the regions it lands in
    if (!regions && !model.game.trust.national_counts_for_neglect) {
      const lands = new Set<RegionId>();
      for (const e of card.effects) if (e.where?.flags || e.where?.regions) for (const i of maskWeights(ctx, e.where).flatMap((w, j) => (w > 0 ? [j] : []))) lands.add(ctx.laRegion[i]!);
      if (lands.size && lands.size < 4) for (const r of lands) s.regionLastCard[r] = term;
    }
  });

  // upkeep
  for (const u of s.upkeeps) {
    if (u.lapsed || u.nextTerm !== term) continue;
    if ((plays.skipUpkeep ?? []).includes(u.id)) {
      u.skipped++;
      const card = ctx.cards.get(u.card)!;
      if (card.upkeep!.reverses_card) u.lapsed = true;
      if (card.upkeep!.breaks_pledge) s.pledgeBrokenByUpkeep = true;
      u.nextTerm = term + u.every;
    } else {
      u.paid++;
      u.nextTerm = term + u.every;
    }
    if (u.times > 0 && u.paid + u.skipped >= u.times) u.nextTerm = NEVER;
  }

  // standing tickets, debt and repairs
  let debts = [...state.debts];
  let deferrals = state.deferrals;
  const ledger = { ...state.ledger, debts: [...state.ledger.debts], deferrals: [...state.ledger.deferrals] };
  if (plays.standing === "borrow-to-invest") {
    const tok = { takenTerm: term, year: state.year };
    debts.push(tok);
    ledger.debts.push(tok);
  }
  if (plays.standing === "defer-maintenance") {
    deferrals++;
    ledger.deferrals.push({ year: state.year, repaired: false });
  }
  if (plays.repayDebt) debts = debts.slice(plays.repayDebt);
  if (plays.repair) {
    deferrals--;
    const d = ledger.deferrals.find((x) => !x.repaired);
    if (d) d.repaired = true;
  }
  state.debts = debts;
  state.deferrals = deferrals;
  state.ledger = ledger;

  // budget: what is left is contingency
  const spent = playCost(model, state, plays);
  s.spent = spent;
  const available = availableFor(model, state, plays) - spent;
  state.budget = { ...state.budget, available };

  // the hand: played and discarded cards go to the bottom of the deck
  const held = plays.holdOver ?? null;
  s.held = held;
  const played = plays.cards.map((c) => c.card);
  const discarded = state.hand.filter((c) => !played.includes(c) && c !== held);
  state.deck = [...state.deck, ...played, ...discarded];
  state.hand = [];
  state.plays = plays;

  // post rail
  const post = [...state.post];
  for (const rec of s.plays.filter((p) => p.term === term)) {
    const card = ctx.cards.get(rec.card)!;
    const delay = Math.max(0, ...card.effects.filter((e) => !e.side).map((e) => effectDelay(ctx, card, e)));
    if (delay > 0) {
      const arrivesTerm = term + delay;
      const arrivesYear = g.years[0]! + 4 * arrivesTerm;
      post.push({ card: card.id, playedTerm: term, playedYear: state.year, arrivesTerm, arrivesYear, regions: rec.regions, countsInLeft: arrivesYear <= g.post_counts_until });
    }
  }
  state.post = post;

  // visit offer
  state.visitOffer = caretaker ? null : visitOffer(ctx, state);
  if (state.visitOffer) {
    state.step = "visit";
    return state;
  }
  return toPassing(ctx, state);
}

function effectDelay(ctx: Ctx, card: Card, e: Effect): number {
  let d = e.delay ?? (e.side ? 0 : card.delay);
  const rule = e.rule ? ctx.rules.get(e.rule) : undefined;
  if (rule) d = Math.max(d, rule.lag);
  return d;
}

function visitOffer(ctx: Ctx, state: A.GameState): A.VisitOffer | null {
  const s = sim(state);
  // a trigger card offers the visit only if it landed in the place's own authority (playtest 1)
  const landsIn = (p: PlayRec, place: string) => {
    const la = ctx.laIndex.get(ctx.places.get(place)?.la ?? "");
    return la !== undefined && p.las.includes(la);
  };
  const played = s.plays
    .filter((p) => p.term === state.term && ctx.cards.has(p.card))
    .filter((p) => {
      const v = ctx.cards.get(p.card)!.visit;
      return !!v && landsIn(p, v);
    })
    .map((p) => ctx.cards.get(p.card)!);
  const triggers = played.sort((a, b) => b.cost - a.cost);
  let place: "rhondda" | "bethesda" | null = triggers[0]?.visit ?? null;
  if (state.options.firstGame) {
    // the curated first game: the Rhondda asks in term 2, Bethesda by term 4
    const curated: "rhondda" | "bethesda" | null =
      state.term === 1 && !s.firstVisits.includes("rhondda")
        ? "rhondda"
        : state.term === 3 && !state.ledger.grades.some((g) => g.place === "bethesda")
          ? "bethesda"
          : null;
    if (curated) place = curated;
  }
  let triggeredBy = triggers.filter((c) => c.visit === place).map((c) => c.id);
  if (place && !triggeredBy.length) triggeredBy = ["curveball"];
  if (!place) return null;
  const board = ctx.places.get(place)!;
  const fewer = triggeredBy.length > 0 && triggeredBy.every((id) => id !== "curveball" && ctx.cards.get(id)!.visit_thread_fewer);
  const activeIds = state.activeTrends.map((a) => a.curveball);
  return {
    place,
    triggeredBy,
    threads: board.threads - (fewer ? 1 : 0),
    ...(place === "rhondda" ? { tipRisk: tipRisk(board, activeIds.includes("wet-decade"), s.stitched ?? []), stitched: [...(s.stitched ?? [])] } : {}),
    activeTrends: activeIds,
  };
}

export function gradeVisit(model: CompiledModel, state: A.GameState, choice: A.VisitChoice): A.VisitOutcome {
  const ctx = makeContext(model);
  const offer = state.visitOffer;
  const place = choice?.place ?? offer?.place ?? "rhondda";
  if (!choice || !offer) return { place, grade: "adequately", threads: [], stayed: true, tests: [], notes: [] };
  if (choice.place !== offer.place) throw new EngineError("wrong_place", `the visit on offer is ${offer.place}`);
  if (choice.threads.length > offer.threads || new Set(choice.threads).size !== choice.threads.length) throw new EngineError("bad_threads", `place at most ${offer.threads} different threads`);
  const board = ctx.places.get(place)!;
  const known = place === "rhondda" ? (board.tips ?? []).map((t) => t.id) : (board.options ?? []).map((o) => o.id);
  for (const t of choice.threads) if (!known.includes(t)) throw new EngineError("bad_threads", `unknown item ${t}`);
  const active = state.activeTrends.map((a) => a.curveball);
  const s = sim(state);
  const res =
    place === "rhondda"
      ? gradeRhondda(board, choice.threads, active.includes("wet-decade"), { stitched: s.stitched ?? [], text: ctx.model.engine_text, threadsAllowed: offer.threads })
      : gradeBethesda(board, choice.threads, {
          text: ctx.model.engine_text,
          active,
          inPlay: s.plays.filter((p) => p.term === state.term).map((p) => p.card),
          everPlayed: s.plays.map((p) => p.card),
          seed: uniformSeed(state.seed, state.term),
          runs: Math.max(50, state.options.runs),
        });
  return { place, grade: res.grade, threads: choice.threads, stayed: false, tests: res.tests, notes: res.notes };
}

const uniformSeed = (seed: number, term: number) => hashSeed(`${seed}:${term}:bethesda`);

function chooseVisit(ctx: Ctx, prev: A.GameState, choice: A.VisitChoice): A.GameState {
  const outcome = gradeVisit(ctx.model, prev, choice);
  const state: A.GameState = { ...prev, sim: { ...sim(prev) }, visit: choice };
  const s = sim(state);
  s.termGrade = { place: outcome.place, grade: outcome.grade, threads: outcome.threads, stayed: outcome.stayed };
  if (!outcome.stayed) {
    s.firstVisits = [...s.firstVisits, outcome.place];
    // tips covered in the Rhondda stay made safe for later visits
    if (outcome.place === "rhondda") s.stitched = [...new Set([...(s.stitched ?? []), ...outcome.threads])];
    state.ledger = { ...state.ledger, grades: [...state.ledger.grades, { place: outcome.place, year: state.year, grade: outcome.grade }] };
  }
  return toPassing(ctx, state);
}

function toPassing(ctx: Ctx, state: A.GameState): A.GameState {
  const s = sim(state);
  const shockId = s.schedule[state.term]!.shock;
  if (shockId) {
    const prepared = preparedBy(ctx, state, shockId);
    const m = ctx.model.game.response_multiplier;
    const fragile = fragileMultiplier(ctx, state);
    const base = (prepared.length ? m.prepared : 1) * fragile;
    state.shock = {
      curveball: shockId,
      prepared: prepared.length > 0,
      preparedBy: prepared,
      contingency: state.budget.available,
      hit: { absorb: base * m.absorb, respond1: base * m.respond1, respond2: base * m.respond2 },
    };
  } else state.shock = null;
  state.step = "passing";
  return state;
}

/** Authorities a shock reaches: its effects' areas, plus the tips or the heartland for its special events. */
export function shockReach(ctx: Ctx, shockId: string): number[] {
  const sh = ctx.curveballs.get(shockId)?.shock;
  if (!sh) return [];
  const reach = new Set<number>();
  for (const e of [...sh.effects, ...(sh.branches ?? []).flatMap((b) => b.effects)]) {
    if (e.target === "budget" || e.target === "trust" || e.target === "card_cost") continue;
    if (e.where?.in_scope) continue;
    maskWeights(ctx, e.where, e.emphasis).forEach((w, i) => w > 0 && reach.add(i));
  }
  for (const sp of sh.special ?? []) {
    if (sp === "tip_may_move") ctx.flagLas.coal_valley.forEach((i) => reach.add(i));
    if (sp === "heartland_drop") ctx.flagLas.heartland.forEach((i) => reach.add(i));
  }
  // a shock with no area (only budget or Trust) reaches all of Wales
  if (!reach.size) ctx.las.forEach((_, i) => reach.add(i));
  return [...reach];
}

/**
 * Cards that make you ready for a shock (decision 14): a listed response card whose main effect has
 * landed (not merely been played) in an authority the shock reaches.
 */
function preparedBy(ctx: Ctx, state: A.GameState, shockId: string): string[] {
  const cb = ctx.curveballs.get(shockId)!;
  const s = sim(state);
  const reach = new Set(shockReach(ctx, shockId));
  const ready = new Set<string>();
  for (const p of s.plays) {
    if (!cb.responses.includes(p.card)) continue;
    const card = ctx.cards.get(p.card);
    if (!card) continue;
    const mains = card.effects.filter((e) => !e.side && e.target !== "trust" && e.target !== "budget" && e.target !== "card_cost");
    if (!mains.length) {
      // a card with no effects of its own (the compact) is ready once played, where it was played
      if (p.term <= state.term && p.las.some((i) => reach.has(i))) ready.add(p.card);
      continue;
    }
    for (const e of mains) {
      if (p.term + effectDelay(ctx, card, e) > state.term) continue;
      const lands = maskWeights(ctx, e.where, e.emphasis, e.where?.in_scope === false ? null : p.las);
      if (lands.some((w, i) => w > 0 && reach.has(i))) {
        ready.add(p.card);
        break;
      }
    }
  }
  return cb.responses.filter((r) => ready.has(r));
}

function fragileMultiplier(ctx: Ctx, state: A.GameState): number {
  const f = ctx.model.game.fragile_infrastructure;
  const c = ctx.comp.get("infrastructure_condition");
  if (c === undefined) return 1;
  return walesValue(ctx, c, sim(state).runs[0]!.s) < f.below ? f.multiplier : 1;
}

// ---------------------------------------------------------------------------
// Building a term's input

/** World-level condition checks (anything that does not depend on a run's scores). */
function worldCondition(ctx: Ctx, state: A.GameState, e: Effect, play: PlayRec | null): boolean {
  const c = e.condition;
  if (!c) return true;
  const s = sim(state);
  if (c.from_year && state.year < c.from_year) return false;
  if (c.if_below) {
    const comp = ctx.comp.get(c.if_below.component);
    if (comp !== undefined && walesValue(ctx, comp, s.runs[0]!.s) >= c.if_below.value) return false;
  }
  if (c.unless_card_in_scope && play) {
    const regions = play.regions ?? [...REGION_IDS];
    if (s.plays.some((p) => p.card === c.unless_card_in_scope && p.term <= state.term && (p.regions ?? [...REGION_IDS]).some((r) => regions.includes(r)))) return false;
  }
  if (c.unless_card_in_force && cardInForce(state, c.unless_card_in_force)) return false;
  if (c.if_any_card_in_play && !c.if_any_card_in_play.some((id) => cardInForce(state, id))) return false;
  if (c.if_no_card_in_play && c.if_no_card_in_play.some((id) => cardInForce(state, id))) return false;
  return true;
}

function cardInForce(state: A.GameState, card: string): boolean {
  const s = sim(state);
  return s.plays.some((p) => p.card === card && state.term - p.term <= 2 && p.term <= state.term && !s.upkeeps.some((u) => u.play === p.id && u.lapsed));
}

function causeOf(state: A.GameState, kind: A.CauseKind, id: string, term: number, regions: RegionId[] | null): CauseRef {
  return { kind, id, term, year: state.year - 4 * (state.term - term), regions };
}

/** Deliveries for one card play this term. */
function cardDeliveries(ctx: Ctx, state: A.GameState, rec: PlayRec, grade: { place: string; grade: Grade; threads: string[] } | null): { deliveries: Delivery[]; trust: A.TrustReason[] } {
  const g = ctx.model.game;
  const s = sim(state);
  const card = ctx.cards.get(rec.card)!;
  const out: Delivery[] = [];
  const trust: A.TrustReason[] = [];
  const earlier = s.plays.filter((p) => p.card === rec.card && p.term < rec.term);
  const repeat = earlier.some((p) => rec.term - p.term <= (ctx.rules.get("R30")?.window ?? 2));
  const regional = !!rec.regions && card.scope !== "two_regions";
  const visitedPlace = grade && card.visit === grade.place ? grade : null;
  const mult = visitedPlace ? g.grade_multiplier[visitedPlace.grade] : g.grade_multiplier.adequately;
  const flag: LaFlag | undefined = card.visit ? ctx.places.get(card.visit)?.applies_to_flag : undefined;
  const compacts = compactsInForce(state, rec.term);
  const partnersOk = (rec.regions ?? []).length > 0 && rec.regions!.every((r) => compacts.some((c) => c.regions?.includes(r) && c.id !== rec.id)) || visitedPlace?.grade === "well";
  const cause: CauseRef = {
    ...causeOf(state, rec.caretaker ? "caretaker" : "card", rec.card, rec.term, rec.regions),
    ...(visitedPlace ? { place: { place: visitedPlace.place as "rhondda" | "bethesda", grade: visitedPlace.grade, threads: visitedPlace.threads } } : {}),
  };
  card.effects.forEach((e, k) => {
    if (e.target === "trust") {
      trust.push({ code: "card", points: (e.amount ?? 0) * e.sign, detail: card.id });
      return;
    }
    if (e.target === "budget" || e.target === "card_cost") return;
    if (!worldCondition(ctx, state, e, rec)) return;
    let scale = 1;
    if (e.condition?.needs_partners && !partnersOk) scale *= 0.5;
    if (e.condition?.half_without_card && !s.plays.some((p) => p.card === e.condition!.half_without_card && p.term <= rec.term)) scale *= 0.5;
    const scopeLas = e.where?.in_scope === false ? null : rec.las;
    const weights = maskWeights(ctx, e.where, e.emphasis, scopeLas).map((w, i) => (flag && ctx.laFlags[i]!.has(flag) ? w * mult : w));
    out.push({
      key: `${rec.id}:${k}`,
      cause,
      play: rec.id,
      effect: e,
      weights,
      sizeStep: regional ? g.regional_size_step : 0,
      fcmShare: rec.las.length / ctx.las.length,
      scale,
      repeat,
      playsBefore: earlier.length,
      landTerm: rec.term + effectDelay(ctx, card, e),
      main: !e.side,
      confidence: card.confidence ?? "medium",
      duration: e.duration ?? null,
    });
  });
  return { deliveries: out, trust };
}

/** The whole input for this term: shared by every run. */
function buildTermInput(ctx: Ctx, state: A.GameState, response: A.ShockResponse | null, withShock: boolean): { input: TermInput; trust: A.TrustReason[]; budgetHit: number } {
  const s = sim(state);
  const g = ctx.model.game;
  const term = state.term;
  const deliveries: Delivery[] = s.deliveries.filter((d) => d.landTerm >= term);
  const trust: A.TrustReason[] = [];
  let budgetHit = 0;

  // this term's plays
  for (const rec of s.plays.filter((p) => p.term === term)) {
    const r = cardDeliveries(ctx, state, rec, s.termGrade && !s.termGrade.stayed ? s.termGrade : null);
    deliveries.push(...r.deliveries);
    trust.push(...r.trust);
  }
  // standing tickets and repairs
  const plays = state.plays;
  const standingCause = (id: string) => causeOf(state, "standing", id, term, null);
  const all = ctx.las.map(() => 1);
  const standingDelivery = (id: string, e: Effect, k: string): Delivery => ({
    key: `standing:${term}:${k}`,
    cause: standingCause(id),
    play: null,
    effect: e,
    weights: all,
    sizeStep: 0,
    fcmShare: 1,
    scale: 1,
    repeat: false,
    playsBefore: 0,
    landTerm: term,
    main: true,
    confidence: "medium",
    duration: null,
  });
  if (plays?.standing) for (const [k, e] of (ctx.standing.get(plays.standing)?.effects ?? []).entries()) deliveries.push(standingDelivery(plays.standing, e, `${plays.standing}:${k}`));
  // a repair undoes what one deferral did (every effect of the ticket, reversed)
  if (plays?.repair) (ctx.standing.get("defer-maintenance")?.effects ?? []).forEach((e, k) => deliveries.push(standingDelivery("defer-maintenance", { ...e, sign: (-e.sign) as 1 | -1, side: false }, `repair:${k}`)));

  // upkeep lapses this term
  const reversePlays: TermInput["reversePlays"] = [];
  for (const u of s.upkeeps) {
    if (!(plays?.skipUpkeep ?? []).includes(u.id)) continue;
    const card = ctx.cards.get(u.card)!;
    const cause = causeOf(state, "upkeep", u.card, term, u.regions);
    if (card.upkeep!.reverses_card) reversePlays.push({ play: u.play, cause });
    card.upkeep!.lapse.forEach((e, k) =>
      deliveries.push({ ...standingDelivery(u.card, e, `lapse:${u.id}:${k}`), cause, weights: maskWeights(ctx, e.where, e.emphasis, u.las), main: false }),
    );
  }

  // slow trends
  for (const a of state.activeTrends) {
    const cb = ctx.curveballs.get(a.curveball)!;
    cb.slow.forEach((e, k) => {
      if (e.target === "budget" || e.target === "trust" || e.target === "card_cost") return;
      if (!worldCondition(ctx, state, e, null)) return;
      deliveries.push({
        key: `slow:${a.curveball}:${term}:${k}`,
        cause: causeOf(state, "curveball", a.curveball, a.sinceTerm, null),
        play: null,
        effect: e,
        weights: maskWeights(ctx, e.where, e.emphasis),
        sizeStep: 0,
        fcmShare: 1,
        scale: g.curveballs.slow_scale,
        repeat: false,
        playsBefore: 0,
        landTerm: term,
        main: false,
        confidence: "medium",
        duration: e.duration ?? null,
      });
    });
  }

  // the shock
  const events: EventCheck[] = [];
  const shockId = withShock ? s.schedule[term]!.shock : null;
  if (shockId && state.shock) {
    const cb = ctx.curveballs.get(shockId)!;
    const sh = cb.shock!;
    const hit = response === 2 ? state.shock.hit.respond2 : response === 1 ? state.shock.hit.respond1 : state.shock.hit.absorb;
    const cause = causeOf(state, "shock", shockId, term, null);
    let effects = sh.effects;
    let scopeLas: number[] | null = null;
    if (sh.branches) {
      const br = sh.branches.find((b) => !b.condition || worldCondition(ctx, state, { target: "trust", sign: 1, condition: b.condition }, null));
      if (br) {
        effects = [...effects, ...br.effects];
        const ids = br.condition?.if_any_card_in_play ?? [];
        const las = new Set(s.plays.filter((p) => ids.includes(p.card) && term - p.term <= 2).flatMap((p) => p.las));
        scopeLas = las.size ? [...las] : null;
      }
    }
    const affected = new Set<number>();
    effects.forEach((e, k) => {
      if (e.target === "trust") {
        trust.push({ code: "curveball", points: (e.amount ?? 0) * e.sign, detail: shockId });
        return;
      }
      if (e.target === "budget") {
        budgetHit += -(e.amount ?? 0) * e.sign;
        return;
      }
      const w = maskWeights(ctx, e.where, e.emphasis, e.where?.in_scope ? scopeLas : null);
      w.forEach((x, i) => x > 0 && affected.add(i));
      deliveries.push({
        key: `shock:${shockId}:${term}:${k}`,
        cause,
        play: null,
        effect: e,
        weights: w,
        sizeStep: 0,
        fcmShare: 1,
        scale: hit * g.curveballs.shock_scale,
        repeat: false,
        playsBefore: 0,
        landTerm: term,
        main: false,
        confidence: "medium",
        duration: e.duration ?? null,
      });
    });
    const active = state.activeTrends.map((a) => a.curveball);
    for (const sp of sh.special ?? []) {
      if (sp === "tip_may_move") events.push({ kind: "tip_movement", cause, hit, las: ctx.flagLas.coal_valley, riskUp: active.includes("wet-decade") });
      if (sp === "employers_leave") events.push({ kind: "employer_leaves", cause, hit, las: affected.size ? [...affected] : ctx.las.map((_, i) => i), riskUp: false });
      if (sp === "heartland_drop") events.push({ kind: "heartland_drop", cause, hit, las: ctx.flagLas.heartland, riskUp: false });
      if (sp === "debt_hurts") budgetHit += state.debts.length;
    }
  }

  // the jobs ripple (R25), this term's plays
  const ripples: TermInput["ripples"] = s.plays
    .filter((p) => p.term === term && ctx.cards.get(p.card)!.sector)
    .map((p) => ({ cause: causeOf(state, p.caretaker ? "caretaker" : "card", p.card, term, p.regions), play: p.id, cost: p.cost, sector: ctx.cards.get(p.card)!.sector!, weights: ctx.las.map((_, i) => (p.las.includes(i) ? 1 : 0)) }));

  return {
    input: { term, year: state.year, deliveries, reversePlays, events, employers: s.employers, ripples, seed: state.seed },
    trust,
    budgetHit,
  };
}

// ---------------------------------------------------------------------------
// Resolving a term

function resolveTerm(ctx: Ctx, prev: A.GameState, response: A.ShockResponse): A.GameState {
  const model = ctx.model;
  const g = model.game;
  const state: A.GameState = { ...prev, sim: { ...sim(prev) } };
  const s = sim(state);
  const term = state.term;
  const before = state.strands;
  const flowPipsBefore = [...s.flowPips];
  const stockPipsBefore = [...s.stockPips];
  const gapBefore = gapMean(ctx, s.runs);

  // response cost
  let resp: A.ShockResponse = state.shock ? (Math.min(response, Math.floor(state.budget.available)) as A.ShockResponse) : 0;
  if (resp < 0) resp = 0;
  const { input, trust: extraTrust, budgetHit } = buildTermInput(ctx, state, resp, true);

  // run the ensemble
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const runs = s.runs.map(cloneRun);
  let contribs: A.Contribution[] = [];
  let events: { kind: string; id: string; la?: number; play?: string }[] = [];
  runs.forEach((r, i) => {
    const out = stepRun(ctx, r, s.params[i]!, i, input, i === 0 ? s.lastContribs : null);
    if (i === 0) {
      contribs = out.contribs ?? [];
      events = out.events;
    }
  });
  for (const r of runs) {
    const st = runStrands(ctx, r);
    r.flowHist.push(st.flow);
    r.stockHist.push(st.stock);
  }
  // too slow for this device: later terms keep the first half of the runs (run 0 stays central)
  const elapsed = typeof performance !== "undefined" ? performance.now() - t0 : 0;
  if (elapsed > state.options.timeBudgetMs && runs.length > 20) {
    const keep = Math.max(20, Math.floor(runs.length / 2));
    runs.length = keep;
    s.params = s.params.slice(0, keep);
    state.runsNote = `Resolving took ${Math.round(elapsed)} ms, so later terms use ${keep} runs instead of ${state.options.runs}.`;
  }
  s.runs = runs;
  s.lastContribs = contribs;
  s.deliveries = input.deliveries.filter((d) => d.landTerm > term);

  // displayed pips
  const e = ensembleStrands(ctx, runs);
  s.flowPips = s.flowPips.map((p, i) => displayPips(p, e[i]!.flow, g.hysteresis));
  s.stockPips = s.stockPips.map((p, i) => displayPips(p, e[i]!.stock, g.hysteresis));

  // budget left
  const contingencyHeld = state.budget.available;
  const left = Math.max(0, contingencyHeld - resp);
  s.carriedContingency = Math.min(g.contingency_carry, left);
  s.carriedHit = budgetHit;

  // arrivals as forecast
  const arrivals = state.post.filter((p) => p.arrivesTerm === term);
  const lapsedPlays = new Set(s.upkeeps.filter((u) => u.lapsed).map((u) => u.play));
  const keptArrivals = arrivals.filter((a) => !s.plays.some((p) => p.card === a.card && p.term === a.playedTerm && lapsedPlays.has(p.id)));

  // neglect
  const neglected = term >= 1 ? REGION_IDS.filter((r) => s.regionLastCard[r] < term - 1) : [];

  // pledge
  const pledged = state.pledge ? STRAND_IDS.indexOf(state.pledge) : -1;
  const pledge = state.pledge ? { strand: state.pledge, kept: s.flowPips[pledged]! >= flowPipsBefore[pledged]! && !s.pledgeBrokenByUpkeep } : null;

  // threshold-event Trust hits (run 0)
  const eventTrust: A.TrustReason[] = [];
  for (const ev of events) {
    if (ev.kind === "tip_moved") eventTrust.push({ code: "curveball", points: s.params[0]!["R12.trust"] ?? -4, detail: "tip_moved" });
    if (ev.kind === "heartland_drop") eventTrust.push({ code: "curveball", points: s.params[0]!["R20.trust"] ?? -4, detail: "heartland_drop" });
  }

  const shockOutcome: A.ShockOutcome | null = state.shock
    ? { curveball: state.shock.curveball, response: resp, prepared: state.shock.prepared, preparedBy: state.shock.preparedBy, hit: resp === 2 ? state.shock.hit.respond2 : resp === 1 ? state.shock.hit.respond1 : state.shock.hit.absorb }
    : null;
  const visit: A.VisitOutcome | null = s.termGrade
    ? { place: s.termGrade.place, grade: s.termGrade.grade, threads: s.termGrade.threads, stayed: s.termGrade.stayed, tests: [] }
    : state.visitOffer
      ? { place: state.visitOffer.place, grade: "adequately", threads: [], stayed: true, tests: [] }
      : null;
  if (visit && !visit.stayed && state.visit) visit.tests = gradeVisit(model, { ...state, step: "visit" }, state.visit).tests;

  const trustOut = computeTrust(g, {
    before: state.trust,
    pipsBefore: flowPipsBefore,
    pipsAfter: s.flowPips,
    arrivals: keptArrivals.length,
    pledge,
    gapChange: gapMean(ctx, runs) - gapBefore,
    shock: shockOutcome ? { prepared: shockOutcome.prepared, response: resp } : null,
    visit: visit && !visit.stayed ? visit.grade : null,
    neglected,
    debtTokens: state.debts.filter((d) => d.takenTerm < term).length,
    repairsOverdue: state.ledger.deferrals.filter((d) => !d.repaired && d.year < state.year).length,
    extra: [...extraTrust, ...eventTrust],
    returning: state.returning,
  });

  // the caretaker and the election
  let after = trustOut.after;
  // the guided first term cannot cost a card slot (playtest 1)
  if (term === 0 && g.trust.first_term_floor !== undefined && after < g.trust.first_term_floor) after = Math.max(after, Math.min(state.trust, g.trust.first_term_floor));
  let lostSeat = false;
  const reasons = [...trustOut.reasons];
  if (state.caretaker) {
    const kept = state.shadowPledge ? s.flowPips[STRAND_IDS.indexOf(state.shadowPledge)]! >= flowPipsBefore[STRAND_IDS.indexOf(state.shadowPledge)]! : false;
    after = g.caretaker.return_trust + (kept ? g.caretaker.shadow_pledge_bonus : 0);
    reasons.push({ code: "return", points: after - trustOut.after });
    if (kept) reasons.push({ code: "shadow_pledge", points: g.caretaker.shadow_pledge_bonus, detail: state.shadowPledge! });
  } else if (after < 20 && term >= 1 && !state.returning && term + 1 < g.years.length) {
    lostSeat = true;
    s.caretakerNext = true;
  }
  const band = bandFor(g, after);
  // a return term plays at the Thin limit whatever the shadow pledge earned
  const cardLimit = s.caretakerNext ? 0 : state.caretaker ? bandFor(g, g.caretaker.return_trust).cards : band.id === "collapsed" ? bandFor(g, 20).cards : band.cards;

  // strand changes, slips, voice
  const changes: A.StrandChange[] = STRAND_IDS.map((id, i) => ({
    strand: id,
    flowBefore: before[i]!.flow,
    flowAfter: e[i]!.flow,
    stockBefore: before[i]!.stock,
    stockAfter: e[i]!.stock,
    pipsBefore: flowPipsBefore[i]!,
    pipsAfter: s.flowPips[i]!,
    stockPipsBefore: stockPipsBefore[i]!,
    stockPipsAfter: s.stockPips[i]!,
    sharp: e[i]!.flowSharp,
    stockSharp: e[i]!.stockSharp,
  }));
  const slips = pickSlips(ctx, contribs, changes, state.shock?.curveball ?? null);
  const gameEvents: A.GameEvent[] = [
    ...events.map((ev) => ({ kind: ev.kind as A.GameEvent["kind"], id: ev.id, ...(ev.la !== undefined ? { la: ctx.las[ev.la]!.code, region: ctx.laRegion[ev.la]! } : {}), ...(ev.play ? { detail: ev.play } : {}) })),
    ...neglected.map((r) => ({ kind: "neglect" as const, id: r, region: r })),
    ...arrivals.map((a) => ({ kind: "arrival" as const, id: a.card })),
    ...(state.shock ? [{ kind: "shock" as const, id: state.shock.curveball }] : []),
    ...(s.schedule[term]!.newTrend ? [{ kind: "trend" as const, id: s.schedule[term]!.newTrend! }] : []),
    ...s.upkeeps.filter((u) => (state.plays?.skipUpkeep ?? []).includes(u.id)).map((u) => ({ kind: "upkeep_lapsed" as const, id: u.card })),
    ...(visit && !visit.stayed ? [{ kind: "visit" as const, id: visit.place, detail: visit.grade }] : []),
  ];
  const voice = pickVoice(ctx, state.seed, term, voiceCandidates(ctx, state, contribs, changes, shockOutcome, visit, pledge, neglected, arrivals, events), s.usedVoices);
  if (voice) s.usedVoices = [...s.usedVoices, voice.template];

  const w = state.options.weights;
  const wellbeing = STRAND_IDS.reduce((a, id, i) => a + w[id] * e[i]!.flow, 0);
  const outcome: A.TermOutcome = {
    term,
    year: state.year,
    caretaker: state.caretaker,
    plays: state.plays ?? { cards: [] },
    spent: s.spent,
    contingencyHeld,
    arrivals,
    newTrend: s.schedule[term]!.newTrend,
    shock: shockOutcome,
    visit,
    pledge,
    strands: changes,
    slips,
    trust: { before: state.trust, after, band: band.id, cardLimit, reasons, top: trustOut.top, lostSeat },
    voice,
    events: gameEvents,
    wellbeing,
    contributions: contribs,
  };
  state.history = [...state.history, outcome];
  state.lastOutcome = outcome;
  state.trust = after;
  state.trustBand = band.id;
  state.cardLimit = cardLimit;
  if (pledge) state.ledger = { ...state.ledger, pledges: state.ledger.pledges.map((p) => (p.year === state.year && p.strand === pledge.strand ? { ...p, kept: pledge.kept } : p)) };
  if (state.caretaker) state.ledger = { ...state.ledger, lostTerms: [...state.ledger.lostTerms, state.year] };
  state.ledger = {
    ...state.ledger,
    liabilities: s.upkeeps.map((u) => ({ card: u.card, mintedYear: u.mintedYear, paid: u.paid, skipped: u.skipped })),
  };
  state.post = state.post.filter((p) => p.arrivesTerm > term);
  state.strands = strandViews(ctx, state);
  state.step = "changed";
  if (state.caretaker) state.returning = false;
  return state;
}

function gapMean(ctx: Ctx, runs: RunState[]): number {
  const gaps = ctx.comps.flatMap((c, i) => (c.aggregate === "gap" ? [i] : []));
  if (!gaps.length) return 0;
  return median(runs.map((r) => gaps.reduce((a, c) => a + walesValue(ctx, c, r.s), 0) / gaps.length));
}

/** Contribution of a component contribution to each strand's flow or stock score. */
function strandShares(ctx: Ctx, c: A.Contribution): { strand: number; part: "flow" | "stock"; delta: number }[] {
  const out: { strand: number; part: "flow" | "stock"; delta: number }[] = [];
  const ci = ctx.comp.get(c.component)!;
  ctx.strandFlow.forEach((ids, si) => {
    for (const id of ids) {
      if (id === ci) out.push({ strand: si, part: "flow", delta: c.wales / ids.length });
      else if (ctx.gap.get(id)?.of === ci) out.push({ strand: si, part: "flow", delta: walesDelta(ctx, id, c.perLa) / ids.length });
    }
  });
  ctx.strandStock.forEach((ids, si) => {
    for (const id of ids) if (id === ci) out.push({ strand: si, part: "stock", delta: c.wales / ids.length });
  });
  return out;
}

/**
 * The "what changed" slips (playtest 1): first, for every strand whose shown pips changed, its
 * biggest cause in the direction it moved (largest pip changes first); a shock that landed always
 * gets a slip; then the largest other causes; one "unexpected" slip only for effects no played ticket
 * prints (chained rules and threshold events). Up to four slips.
 */
function pickSlips(ctx: Ctx, contribs: A.Contribution[], changes: A.StrandChange[], shockId: string | null): A.Slip[] {
  type Agg = A.Slip & { chained: boolean };
  const agg = new Map<string, Agg>();
  for (const c of contribs) {
    for (const sh of strandShares(ctx, c)) {
      if (sh.part !== "flow") continue;
      const chained = !!c.via || c.cause.kind === "event";
      const k = `${sh.strand}|${causeKey(c.cause)}|${chained}`;
      const prev = agg.get(k);
      if (prev) prev.delta += sh.delta;
      else agg.set(k, { strand: STRAND_IDS[sh.strand]!, part: "flow", cause: c.cause, delta: sh.delta, unexpected: false, chained, rule: c.rule, shock: c.cause.kind === "shock" });
    }
  }
  const all = [...agg.values()].filter((x) => Math.abs(x.delta) > 1e-4).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const out: Agg[] = [];
  const has = (x: Agg) => out.includes(x);
  // 1. every strand whose pips moved, its biggest cause in that direction
  const moved = changes.filter((c) => c.pipsAfter !== c.pipsBefore).sort((a, b) => Math.abs(b.pipsAfter - b.pipsBefore) - Math.abs(a.pipsAfter - a.pipsBefore));
  for (const c of moved) {
    const dir = Math.sign(c.pipsAfter - c.pipsBefore);
    const top = all.find((x) => x.strand === c.strand && Math.sign(x.delta) === dir && !has(x));
    if (top && out.length < 3) out.push({ ...top, pipChange: c.pipsAfter - c.pipsBefore } as Agg);
  }
  // 2. a shock that landed always gets a slip
  if (shockId && !out.some((x) => x.cause.kind === "shock")) {
    const sh = all.find((x) => x.cause.kind === "shock" && x.cause.id === shockId);
    if (sh) out.push(sh);
  }
  // 3. fill to three with the largest other causes
  for (const x of all) {
    if (out.length >= 3) break;
    if (!out.some((y) => y.strand === x.strand && causeKey(y.cause) === causeKey(x.cause))) out.push(x);
  }
  // 4. one unexpected slip: an effect no played ticket prints (a chained rule or a threshold event)
  const unexpected = all.find((x) => x.chained && x.cause.kind !== "baseline" && !out.some((y) => y.strand === x.strand && causeKey(y.cause) === causeKey(x.cause)));
  if (unexpected && out.length < 4) out.push({ ...unexpected, unexpected: true });
  return out.map(({ chained: _c, ...x }) => x);
}

function voiceCandidates(
  ctx: Ctx,
  state: A.GameState,
  contribs: A.Contribution[],
  changes: A.StrandChange[],
  shock: A.ShockOutcome | null,
  visit: A.VisitOutcome | null,
  pledge: { strand: StrandId; kept: boolean } | null,
  neglected: RegionId[],
  arrivals: A.PostItem[],
  events: { kind: string; la?: number }[],
): VoiceEventCandidate[] {
  const s = sim(state);
  const out: VoiceEventCandidate[] = [];
  const laOfRegion = (r: RegionId | null | undefined) => (r ? ctx.regionLas[r][0]! : 0);
  const mostMoved = mostMovedLa(ctx, s);
  if (visit && !visit.stayed) out.push({ event: "visit", place: visit.place, grade: visit.grade, la: ctx.laIndex.get(ctx.places.get(visit.place)!.la)! });
  if (shock) {
    const tip = events.find((e) => e.kind === "tip_moved");
    out.push({ event: "shock", curveball: shock.curveball, response: shock.prepared ? "ready" : shock.response > 0 ? "responded" : "absorbed", la: tip?.la ?? mostMoved });
  }
  for (const u of state.plays?.skipUpkeep ?? []) {
    const rec = s.upkeeps.find((x) => x.id === u);
    if (rec) out.push({ event: "upkeep_unpaid", card: rec.card, la: rec.las[0] ?? mostMoved });
  }
  for (const a of arrivals) out.push({ event: "arrival", card: a.card, la: laOfRegion(a.regions?.[0]) || mostMoved });
  const biggest = [...changes].sort((a, b) => Math.abs(b.flowAfter - b.flowBefore) - Math.abs(a.flowAfter - a.flowBefore))[0];
  if (biggest) out.push({ event: "strand", strand: biggest.strand, direction: biggest.flowAfter >= biggest.flowBefore ? "up" : "down", la: mostMoved });
  for (const p of s.plays.filter((x) => x.term === state.term)) out.push({ event: "played", card: p.card, la: p.las[0] ?? mostMoved });
  if (pledge) out.push({ event: "pledge", strand: pledge.strand, kept: pledge.kept, la: mostMoved });
  for (const r of neglected) out.push({ event: "neglect", region: r, la: laOfRegion(r) });
  for (const t of state.activeTrends) out.push({ event: "trend", curveball: t.curveball, la: mostMoved });
  void contribs;
  return out;
}

// ---------------------------------------------------------------------------
// The caretaker term

function playCaretaker(ctx: Ctx, prev: A.GameState, shadowPledge: StrandId): A.GameState {
  let state: A.GameState = { ...prev, shadowPledge, step: "plan" };
  const plays = caretakerPlays(ctx, state);
  state = commit(ctx, state, plays, true);
  if (state.step === "visit") state = chooseVisit(ctx, state, null);
  const resp = (state.shock ? Math.min(2, Math.floor(state.budget.available)) : 0) as A.ShockResponse;
  return resolveTerm(ctx, state, resp);
}

// ---------------------------------------------------------------------------
// resolve: plan to changed in one call

export function resolve(model: CompiledModel, state: A.GameState, plays: A.Plays, visit: A.VisitChoice, response: A.ShockResponse): A.GameState {
  let st = dispatch(model, state, { type: "commit", plays });
  if (st.step === "visit") st = dispatch(model, st, { type: "visit", choice: visit && st.visitOffer && visit.place === st.visitOffer.place ? visit : null });
  return dispatch(model, st, { type: "respond", response });
}

// ---------------------------------------------------------------------------
// Preview

export function preview(model: CompiledModel, state: A.GameState, plays: A.Plays): A.Preview {
  const ctx = makeContext(model);
  const problems = validatePlays(model, state, plays);
  const n = Math.min(state.options.previewRuns, sim(state).runs.length);
  const withAll = projectPlays(ctx, state, plays, n, null);
  // marginal effects are compared over the same horizon as the full plan
  const project = (p: A.Plays) => projectPlays(ctx, state, p, n, withAll.horizon);
  // paired runs: with and without a card, run r uses the same parameters and the same keyed draws,
  // so the difference is exactly that card's effect in that run (zero where it reaches nothing)
  const marginal = (d: number[]): A.Projection & { delta: number } => {
    const clean = d.map((x) => (Math.abs(x) < 1e-9 ? 0 : x));
    const med = median(clean);
    // sharp: at least sharp_share of runs agree on the quarter pip
    const q = Math.round(med * 4);
    const sharp = clean.filter((x) => Math.round(x * 4) === q).length / clean.length >= ctx.model.game.sharp_share;
    return { median: med, p10: quantile(clean, 0.1), p90: quantile(clean, 0.9), pips: Math.round(med), sharp, delta: med };
  };
  const perCard = plays.cards.map((c) => {
    const without = project({ ...plays, cards: plays.cards.filter((x) => x !== c) });
    const strands = Object.fromEntries(STRAND_IDS.map((id, i) => [id, marginal(withAll.eventualRuns.map((v, r) => v[i]! - without.eventualRuns[r]![i]!))])) as Record<StrandId, A.Projection & { delta: number }>;
    return { card: c.card, strands };
  });
  const none = plays.cards.length ? project({ ...plays, cards: [] }) : withAll;
  const proj = (vals: number[]): A.Projection => {
    const m = median(vals);
    return { median: m, p10: quantile(vals, 0.1), p90: quantile(vals, 0.9), pips: Math.round(m), sharp: sharpOf(ctx, vals, m) };
  };
  const cost = playCost(model, state, plays);
  const available = availableFor(model, state, plays);
  const offerState = { ...state, sim: { ...sim(state), plays: [...sim(state).plays, ...plays.cards.map((c, i) => ({ id: `x${i}`, card: c.card, term: state.term, regions: null, las: [], cost: 0, caretaker: false }))] } };
  return {
    valid: problems.length === 0,
    problems,
    cost,
    available,
    contingency: Math.max(0, available - cost),
    strands: STRAND_IDS.map((id, i) => ({
      strand: id,
      now: state.strands[i]!.flow,
      end: proj(withAll.endRuns.map((v) => v[i]!)),
      eventual: proj(withAll.eventualRuns.map((v) => v[i]!)),
      baseline: proj(none.eventualRuns.map((v) => v[i]!)),
      stockNow: state.strands[i]!.stock,
      stockEventual: proj(withAll.eventualStock.map((v) => v[i]!)),
    })),
    perCard,
    visit: visitOffer(ctx, offerState)?.place ?? null,
    runs: n,
  };
}

/** Project a plan over the first `n` runs: this term (no shock) and until every played card has landed. */
function projectPlays(ctx: Ctx, state: A.GameState, plays: A.Plays, n: number, fixedHorizon: number | null) {
  const s = sim(state);
  // build a hypothetical committed state without validation side effects
  let st: A.GameState = { ...state, sim: { ...s } };
  try {
    st = commitLite(ctx, st, plays);
  } catch {
    /* an invalid plan previews as no plan */
  }
  const ss = sim(st);
  const { input } = buildTermInput(ctx, st, null, false);
  const runs = ss.runs.slice(0, n).map(cloneRun);
  runs.forEach((r, i) => stepRun(ctx, r, ss.params[i]!, i, input, null));
  const endRuns = runs.map((r) => runStrands(ctx, r).flow);
  const horizon = fixedHorizon ?? Math.min(state.term + 3, Math.max(state.term, ...input.deliveries.map((d) => d.landTerm)));
  let pending = input.deliveries.filter((d) => d.landTerm > state.term);
  for (let t = state.term + 1; t <= horizon; t++) {
    const slow = input.deliveries.filter((d) => d.key.startsWith("slow:")).map((d) => ({ ...d, key: d.key + `:${t}`, landTerm: t }));
    const inp: TermInput = { ...input, term: t, year: state.year + 4 * (t - state.term), deliveries: [...pending, ...slow], reversePlays: [], events: [], ripples: [] };
    runs.forEach((r, i) => stepRun(ctx, r, ss.params[i]!, i, inp, null));
    pending = pending.filter((d) => d.landTerm > t);
  }
  return { horizon, endRuns, eventualRuns: runs.map((r) => runStrands(ctx, r).flow), eventualStock: runs.map((r) => runStrands(ctx, r).stock) };
}

/** Record plays in a copy of the state, enough to build the term input (used by preview). */
function commitLite(ctx: Ctx, state: A.GameState, plays: A.Plays): A.GameState {
  const s = { ...sim(state) };
  s.plays = [...s.plays];
  plays.cards.forEach((p, i) => {
    const card = ctx.cards.get(p.card);
    if (!card) return;
    const regions = playRegions(card, p);
    s.plays.push({ id: `preview-${i}-${p.card}`, card: p.card, term: state.term, regions, las: regionLas(ctx, regions), cost: cardCost(ctx.model, state, p), caretaker: false });
  });
  return { ...state, plays, sim: s };
}

// ---------------------------------------------------------------------------
// Traces and component views

export function pullThread(model: CompiledModel, state: A.GameState, term: number, strand: StrandId, part: "flow" | "stock"): A.Thread[] {
  const ctx = makeContext(model);
  const out = state.history[term];
  if (!out) return [];
  const si = STRAND_IDS.indexOf(strand);
  const groups = new Map<string, { cause: A.Cause; rule: string | null; component: string; delta: number; perLa: number[] }>();
  for (const c of out.contributions) {
    for (const sh of strandShares(ctx, c)) {
      if (sh.strand !== si || sh.part !== part) continue;
      const k = `${causeKey(c.cause)}|${c.rule}|${c.component}`;
      const g = groups.get(k);
      if (g) {
        g.delta += sh.delta;
        g.perLa = g.perLa.map((v, i) => v + c.perLa[i]!);
      } else groups.set(k, { cause: c.cause, rule: c.rule, component: c.component, delta: sh.delta, perLa: [...c.perLa] });
    }
  }
  const change = out.strands[si]!;
  const threads: A.Thread[] = [...groups.values()]
    .filter((g) => Math.abs(g.delta) > 1e-4)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .map((g) => {
      const stops: A.TraceStop[] = [
        part === "flow"
          ? { kind: "strand", strand, part, delta: change.flowAfter - change.flowBefore, pipsBefore: change.pipsBefore, pipsAfter: change.pipsAfter, sharp: change.sharp }
          : { kind: "strand", strand, part, delta: change.stockAfter - change.stockBefore, pipsBefore: change.stockPipsBefore, pipsAfter: change.stockPipsAfter, sharp: change.stockSharp },
        { kind: "component", component: g.component, delta: g.delta },
        { kind: "cause", cause: g.cause, delta: g.delta },
      ];
      if (g.cause.place) stops.push({ kind: "place", place: g.cause.place.place, grade: g.cause.place.grade, threads: g.cause.place.threads });
      const rule = g.rule ? ctx.rules.get(g.rule) : undefined;
      if (rule) {
        stops.push({
          kind: "rule",
          rule: rule.id,
          ruleKind: rule.kind,
          params: Object.entries(rule.params).map(([name, p]) => ({ name, value: state.options.paramOverrides[`${rule.id}.${name}`] ?? p.default, min: p.min, max: p.max, unit: p.unit })),
          confidence: rule.confidence,
          evidence: rule.evidence,
          placeholder: rule.placeholder,
          gameRule: !!rule.game_rule,
          sources: rule.sources,
        });
      }
      const las = g.perLa
        .map((v, i) => ({ v: Math.abs(v), i }))
        .filter((x) => x.v > 1e-6)
        .sort((a, b) => b.v - a.v)
        .map((x) => ctx.las[x.i]!.code);
      return { strand, part, delta: g.delta, stops, las };
    });
  return threads;
}

export function componentView(model: CompiledModel, state: A.GameState, component: string): A.ComponentView {
  const ctx = makeContext(model);
  const c = ctx.comp.get(component);
  if (c === undefined) throw new EngineError("unknown_component", component);
  const s = sim(state);
  const scores = ctx.las.map((_, i) => median(s.runs.map((r) => r.s[c]![i]!)));
  const comp = ctx.comps[c]!;
  const band = comp.indicator ? ctx.bands.get(comp.indicator) : undefined;
  return {
    component,
    scores,
    playerDelta: s.runs[0]!.playerCum ? [...s.runs[0]!.playerCum[c]!] : ctx.las.map(() => 0),
    raw: scores.map((v) => (band ? bandValue(band, v) : null)),
    wales: median(s.runs.map((r) => walesValue(ctx, c, r.s))),
  };
}

// ---------------------------------------------------------------------------
// The end

function finish(ctx: Ctx, prev: A.GameState): A.GameState {
  const state: A.GameState = { ...prev, sim: { ...sim(prev) }, step: "ended", term: ctx.model.game.years.length, year: ctx.model.game.end_year };
  const s = sim(state);
  if (state.options.caretakerGhost && !s.ghost) s.ghost = ghostFor(ctx, state);
  state.result = computeResult(ctx, state, state.options.weights);
  return state;
}

function ghostFor(ctx: Ctx, state: A.GameState): { lived: number; left: number; result: number } {
  // the caretaker bot on the same seed, with fewer runs
  const runs = Math.min(state.options.runs, 30);
  let g = newGame(ctx.model, state.seed, { ...state.options, daily: state.options.daily ?? undefined, runs, previewRuns: 1, caretakerGhost: false });
  while (g.step !== "ended") {
    if (g.step === "opening") g = dispatch(ctx.model, g, { type: "open" });
    else if (g.step === "pledge") g = dispatch(ctx.model, g, { type: "pledge", strand: null });
    else if (g.step === "plan") g = resolve(ctx.model, g, caretakerPlays(ctx, g), null, 2);
    else if (g.step === "caretaker") g = dispatch(ctx.model, g, { type: "caretaker", shadowPledge: "healthier" });
    else if (g.step === "changed") g = dispatch(ctx.model, g, { type: "continue" });
    else if (g.step === "election") g = dispatch(ctx.model, g, { type: "next" });
    else if (g.step === "visit") g = dispatch(ctx.model, g, { type: "visit", choice: null });
    else if (g.step === "passing") g = dispatch(ctx.model, g, { type: "respond", response: 2 });
  }
  const r = g.result!;
  return { lived: r.lived.value, left: r.left.value, result: r.result.value };
}

export function recomputeResult(model: CompiledModel, state: A.GameState, weights: Partial<Record<StrandId, number>>): A.EndResult {
  const ctx = makeContext(model);
  if (state.step !== "ended") throw new EngineError("not_ended", "the game has not ended");
  return computeResult(ctx, state, resolveOptions(model, { weights }).weights);
}

function resultBand(model: CompiledModel, v: number): A.ResultBand {
  const bands = makeContext(model).model.game.judged_change.bands;
  let i = 0;
  bands.forEach((b, k) => {
    if (v >= b.min) i = k;
  });
  return { band: Math.min(5, i + 1) as A.ResultBand["band"], name: bands[i]!.name };
}

/**
 * The end result (balance decision 14): judged as the change since 2026 in net strand pips.
 *   counted     = W_F .. W_6 (F = judged_change.lived_first_term)
 *   lived_level = mean(counted) - dip_weight * max(0, W_0 - min(counted))
 *   left_level  = weighted 2050 stocks, with cards in the post by 2058, minus the debt penalty
 *   lived = n (lived_level - W_0), left = n (left_level - S_0), result = the lower
 * Each run is judged the same way (against the same W_0 and S_0) for the p10 to p90 edge.
 */
function computeResult(ctx: Ctx, state: A.GameState, weights: Record<StrandId, number>): A.EndResult {
  const model = ctx.model;
  const g = model.game;
  const jc = g.judged_change;
  const s = sim(state);
  const n = STRAND_IDS.length;
  const W = (vals: number[]) => STRAND_IDS.reduce((a, id, i) => a + weights[id] * vals[i]!, 0);
  const debtPenalty = Math.min(g.debt.left_penalty_cap, g.debt.left_penalty * state.debts.length);
  const lastTerm = g.years.length - 1;
  const postUntil = Math.floor((g.post_counts_until - g.years[0]!) / 4);
  const first = Math.max(0, Math.min(lastTerm, jc.lived_first_term - 1));
  const W0 = W(s.start.flow);
  const S0 = W(s.start.stock);
  /** Lived level from a series of term values and its own start. */
  const livedLevelOf = (series: number[], start: number) => {
    const counted = series.slice(first);
    const mean = counted.reduce((a, b) => a + b, 0) / counted.length;
    return mean - jc.dip_weight * Math.max(0, start - Math.min(...counted));
  };

  // per run: Lived from its own terms; Left from 2050 stocks plus cards in the post by 2058
  const perRun = s.runs.map((r, i) => {
    const proj = cloneRun(r);
    landOnly(ctx, proj, s.params[i]!, i, s.deliveries.filter((d) => d.landTerm > lastTerm && d.landTerm <= postUntil), state.seed);
    const stock = runStrands(ctx, proj).stock;
    const lived = n * (livedLevelOf(r.flowHist.map(W), W0) - W0);
    const left = n * (W(stock) - debtPenalty - S0);
    return { lived, left, stock };
  });
  // the median world
  const medFlowTerms = s.runs[0]!.flowHist.map((_, t) => STRAND_IDS.map((_, k) => median(s.runs.map((r) => r.flowHist[t]![k]!))));
  const medStock = STRAND_IDS.map((_, k) => median(perRun.map((p) => p.stock[k]!)));
  const wt = medFlowTerms.map(W);
  const livedLevel = livedLevelOf(wt, W0);
  const leftLevel = W(medStock) - debtPenalty;
  const livedV = n * (livedLevel - W0);
  const leftV = n * (leftLevel - S0);
  const score = (v: number, xs: number[]): A.Score => ({ value: v, p10: quantile(xs, 0.1), p90: quantile(xs, 0.9), band: resultBand(model, v) });
  const lived = score(livedV, perRun.map((p) => p.lived));
  const left = score(leftV, perRun.map((p) => p.left));
  const which = livedV <= leftV ? "lived" : "left";
  const result = { ...score(Math.min(livedV, leftV), perRun.map((p) => Math.min(p.lived, p.left))), which } as A.EndResult["result"];
  const counted = wt.slice(first);
  const worstTerm = first + counted.indexOf(Math.min(...counted));
  const perStrand = STRAND_IDS.map((id, k) => {
    const ft = medFlowTerms.map((f) => f[k]!);
    const f0 = s.start.flow[k]!, k0 = s.start.stock[k]!;
    const lvLevel = livedLevelOf(ft, f0);
    const lv = lvLevel - f0;
    const lf = medStock[k]! - k0;
    return { strand: id, lived: lv, left: lf, lower: (lv <= lf ? "lived" : "left") as "lived" | "left", livedLevel: lvLevel, leftLevel: medStock[k]! };
  });

  // the letter, chosen from the change bands
  const equalIdx = STRAND_IDS.indexOf("equal");
  // decision 15: uneven if a region never got a regional card of its own, or one region took over
  // two thirds of regional plays (the letter names the overlooked region), or equal is low
  const regionalPlays = { north: 0, mid: 0, southwest: 0, southeast: 0 } as Record<RegionId, number>;
  for (const p of s.plays) for (const r of p.regions ?? []) regionalPlays[r]++;
  const regionPop = Object.fromEntries(REGION_IDS.map((r) => [r, ctx.regionLas[r].reduce((a, i) => a + ctx.pop[i]!, 0)])) as Record<RegionId, number>;
  const overlooked = overlookedRegion(regionalPlays, regionPop);
  const uneven = medFlowTerms[medFlowTerms.length - 1]![equalIdx]! < 4 || overlooked !== null;
  // the archetype follows the result band first (playtest 1): a game that beat the caretaker is not hollow
  const resultBandNo = resultBand(model, Math.min(livedV, leftV)).band;
  const beatCaretaker = (s.ghost ? Math.min(livedV, leftV) - s.ghost.result : Math.min(livedV, leftV) + 2.8) > 0;
  const archetype = archetypeFromBand(resultBandNo, livedV, leftV, beatCaretaker, uneven && (overlooked !== null || livedV >= 1 || leftV >= 1));
  const named = ledgerLines(ctx, state, archetype, archetype === "uneven" ? overlooked : null);
  // the uneven letter is written from the overlooked region
  const la = archetype === "uneven" && overlooked ? mostMovedLa(ctx, s, ctx.regionLas[overlooked]) : mostMovedLa(ctx, s);
  const letter = writeLetter(ctx, state.seed, archetype, named, la, g.years[worstTerm]!, state.ledger.lostTerms[0] ?? null);
  void level;
  void archetypeOf;

  const squares = (vals: number[]) => {
    // ten squares per band from the real levels, shared out by weighted strand share (no numbers)
    const total = vals.reduce((a, v, i) => a + v * weights[STRAND_IDS[i]!], 0);
    const filled = Math.round(total);
    const shares = STRAND_IDS.map((id, i) => ({ id, v: vals[i]! * weights[id] }));
    const out: StrandId[] = [];
    let acc = 0;
    for (const sh of shares) {
      acc += sh.v;
      while (out.length < Math.min(filled, Math.round(acc))) out.push(sh.id);
    }
    return out;
  };
  return {
    weights,
    lived,
    left,
    result,
    livedLevel,
    leftLevel,
    perStrand,
    wellbeingByTerm: wt,
    worstTerm,
    dippedBelowStart: Math.min(...counted) < W0,
    start: { lived: W0, left: S0 },
    caretakerGhost: s.ghost,
    vsCaretaker: s.ghost ? result.value - s.ghost.result : null,
    letter,
    ledger: state.ledger,
    inThePost: s.deliveries.length ? postItemsLeft(ctx, state) : [],
    squares: { lived: squares(perStrand.map((p) => p.livedLevel)), left: squares(perStrand.map((p) => p.leftLevel)) },
    seedLabel: state.seedLabel,
    modified: state.modified,
    archetype,
  };
}

function postItemsLeft(ctx: Ctx, state: A.GameState): A.PostItem[] {
  const g = ctx.model.game;
  const seen = new Set<string>();
  const out: A.PostItem[] = [];
  for (const d of sim(state).deliveries) {
    if (!d.main || !d.play || d.cause.kind === "shock") continue;
    const key = `${d.play}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const arrivesYear = g.years[0]! + 4 * d.landTerm;
    out.push({ card: d.cause.id, playedTerm: d.cause.term, playedYear: d.cause.year, arrivesTerm: d.landTerm, arrivesYear, regions: d.cause.regions, countsInLeft: arrivesYear <= g.post_counts_until });
  }
  return out;
}

/**
 * The letter's archetype from the result band (playtest 1). Band 1: the hollow years (or the feast
 * if people lived well). Band 2: the feast or the long winter when Lived and Left part by three pips
 * or more, otherwise held steady if the player beat the caretaker, else hollow. Band 3: the long
 * winter when Left beats Lived by three, else steady. Bands 4 and 5: the gift. The uneven hand
 * replaces any but the bottom band when a region was overlooked.
 */
export function archetypeFromBand(band: number, lived: number, left: number, beatCaretaker: boolean, uneven: boolean): A.Letter["archetype"] {
  if (uneven && band >= 2) return "uneven";
  if (band <= 1) return lived >= 1 ? "feast" : "hollow";
  if (band === 2) {
    if (lived - left >= 3) return "feast";
    if (left - lived >= 3) return "long_winter";
    return beatCaretaker ? "steady" : "hollow";
  }
  if (band === 3) return left - lived >= 3 ? "long_winter" : "steady";
  return "gift";
}

/**
 * Specific things for the letter, from the ledger, in the archetype's order of tone. At least two
 * are always found when the player played any card: a tip made safe, a place visited, promises
 * kept or broken, debts left, repairs not done, an overlooked region, the card that did most, a card
 * landing after 2050, a lost term.
 */
function ledgerLines(ctx: Ctx, state: A.GameState, archetype: string, overlooked: RegionId | null): NamedLine[] {
  const L = state.ledger;
  const s = sim(state);
  const T = ctx.model.engine_text ?? {};
  const line = (key: string, params: Record<string, SlotValue>): Text | undefined => (T[key] ? fill(T[key]!, params, ["place"]) : undefined);
  const out: (NamedLine | null)[] = [];
  const positive = archetype === "gift" || archetype === "long_winter" || archetype === "steady";

  // a tip made safe (the best of them by homes below), and the best place visit
  const rh = ctx.places.get("rhondda");
  const safe = (s.stitched ?? []).map((id) => rh?.tips?.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t).sort((a, b) => b.buildingsBelow - a.buildingsBelow)[0];
  const tipSafe: NamedLine | null = safe ? { kind: "tip", ledger: "tip_safe", id: safe.id, year: L.grades.find((g) => g.place === "rhondda")?.year ?? null, thing: tipName(T, safe), line: line("engine.letter.named.tip_safe", { tip: tipName(T, safe) }) } : null;
  const order = { well: 2, adequately: 1, poorly: 0 } as const;
  const bestVisit = [...L.grades].sort((a, b) => order[b.grade] - order[a.grade] || b.year - a.year)[0];
  const visit: NamedLine | null = bestVisit && bestVisit.grade !== "poorly" ? { kind: "none", ledger: "visit", id: bestVisit.place, year: bestVisit.year, thing: ctx.places.get(bestVisit.place)!.name, line: line("engine.letter.named.visit", { place: ctx.places.get(bestVisit.place)!.name, year: bestVisit.year }) } : null;
  // promises
  const made = L.pledges.filter((p) => p.kept !== null);
  const kept = made.filter((p) => p.kept).length;
  const pledgeKept: NamedLine | null = made.length >= 2 && kept > made.length / 2 ? { kind: "none", ledger: "pledge_kept", id: null, year: null, thing: null, line: line("engine.letter.named.pledge_kept", { count: made.length, kept }) } : null;
  const broken = L.pledges.find((p) => p.kept === false);
  const strandName = (id: StrandId) => ctx.strands.find((x) => x.id === id)!.name;
  const pledgeBroken: NamedLine | null = broken ? { kind: "pledge", ledger: "pledge_broken", id: broken.strand, year: broken.year, thing: strandName(broken.strand) } : null;
  // debts, repairs, a lost term
  const debt: NamedLine | null = state.debts.length ? { kind: "debt", ledger: "debt", id: "borrow-to-invest", year: state.debts[0]!.year, thing: ctx.standing.get("borrow-to-invest")!.name } : null;
  const unrepaired = L.deferrals.find((d) => !d.repaired);
  const repairs: NamedLine | null = unrepaired ? { kind: "repairs", ledger: "repairs", id: "defer-maintenance", year: unrepaired.year, thing: ctx.standing.get("defer-maintenance")!.name } : null;
  const lost: NamedLine | null = L.lostTerms.length ? { kind: "lost_term", ledger: "lost_term", id: null, year: L.lostTerms[0]!, thing: null } : null;
  // an overlooked region
  const neglectRegion = overlooked ?? (state.history.flatMap((h) => h.events.filter((e) => e.kind === "neglect").map((e) => e.id as RegionId))[0] ?? null);
  const neglect: NamedLine | null = neglectRegion ? { kind: "neglect", ledger: "neglect", id: neglectRegion, year: null, thing: ctx.model.regions.find((r) => r.id === neglectRegion)!.name } : null;
  // the card that did most for the strands, and a card landing after 2050
  const byCard = new Map<string, number>();
  for (const h of state.history) for (const c of h.contributions) if (c.cause.kind === "card" && c.wales > 0) byCard.set(c.cause.id, (byCard.get(c.cause.id) ?? 0) + c.wales);
  const topCard = [...byCard.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topYear = topCard ? (s.plays.find((p) => p.card === topCard)?.term ?? 0) * 4 + ctx.model.game.years[0]! : null;
  const card: NamedLine | null = topCard ? { kind: "none", ledger: "card", id: topCard, year: topYear, thing: ctx.cards.get(topCard)!.name, line: line("engine.letter.named.card", { thing: ctx.cards.get(topCard)!.name, year: topYear ?? "" }) } : null;
  const late = postItemsLeft(ctx, state)[0];
  const arrival: NamedLine | null = late ? { kind: "arrival", ledger: "arrival", id: late.card, year: late.arrivesYear, thing: ctx.cards.get(late.card)!.name } : null;
  // a tip never made safe, for the bleaker letters
  const tipMoved = state.history.find((h) => h.events.some((e) => e.kind === "tip_moved"));
  const tipUnmade: NamedLine | null = !safe && (tipMoved || !s.plays.some((p) => p.card === "make-coal-tips-safe")) ? { kind: "tip", ledger: "tip", id: "make-coal-tips-safe", year: tipMoved?.year ?? null, thing: ctx.cards.get("make-coal-tips-safe")!.name } : null;

  if (archetype === "uneven") out.push(neglect, tipSafe, visit, debt, repairs, card);
  else if (positive) out.push(tipSafe, visit, pledgeKept, arrival, card, debt, repairs, pledgeBroken, neglect, lost);
  else out.push(lost, debt, repairs, pledgeBroken, neglect, tipUnmade, tipSafe, visit, card, arrival);
  // two different things; the second always as a ledger line (engine copy) so it is never the archetype's stock phrase
  const picked: NamedLine[] = [];
  for (const n of out) {
    if (!n || picked.some((p) => p.ledger === n.ledger)) continue;
    picked.push(n);
    if (picked.length === 2) break;
  }
  return picked.map((n, k) => {
    if (n.line) return n;
    // a template kind the archetype lacks, or the second line: render the ledger line from engine copy
    const tpl = ctx.model.letters.find((l) => l.archetype === archetype);
    const hasTemplate = k === 0 && n.kind !== "none" && !!tpl?.named[n.kind]?.length;
    if (hasTemplate) return n;
    const params: Record<string, SlotValue> = { thing: n.thing ?? "", year: n.year ?? "", count: n.ledger === "debt" ? state.debts.length : made.length, kept };
    const l = line(`engine.letter.named.${n.ledger}`, params);
    return l ? { ...n, line: l } : n;
  });
}

// ---------------------------------------------------------------------------
// Save and load

interface SaveFile {
  v: 1;
  hash: string;
  seed: number;
  seedLabel: string;
  options: A.ResolvedOptions;
  log: A.Action[];
}

export function saveGame(state: A.GameState): string {
  const f: SaveFile = { v: 1, hash: state.modelHash, seed: state.seed, seedLabel: state.seedLabel, options: state.options, log: state.log };
  return JSON.stringify(f);
}

/** The most actions a version 1 save can hold: six terms of a handful of steps each, with headroom. */
const MAX_SAVE_ACTIONS = 400;
/** The most simulation runs any option may ask for. */
const MAX_RUNS = 400;
function clampRuns(asked: number | undefined, fallback: number): number {
  const n = Number.isFinite(asked) ? Math.floor(asked as number) : fallback;
  return Math.min(MAX_RUNS, Math.max(1, n));
}

export function loadGame(model: CompiledModel, saved: string): A.GameState {
  let f: SaveFile;
  try {
    f = JSON.parse(saved) as SaveFile;
  } catch {
    throw new EngineError("bad_save", "the save is not readable");
  }
  if (!f || f.v !== 1 || !Array.isArray(f.log)) throw new EngineError("bad_save", "the save is not a version 1 save");
  // A save may come from a shared link: bound its size and ignore performance options it carries.
  if (f.log.length > MAX_SAVE_ACTIONS) throw new EngineError("bad_save", "the save is too long");
  if (!Number.isFinite(f.seed)) throw new EngineError("bad_save", "the save has no seed");
  // newGame clamps run counts to MAX_RUNS, so replays stay identical without trusting the save.
  let st = newGame(model, f.seed, { ...f.options, daily: f.options.daily ?? undefined });
  st = { ...st, seedLabel: f.seedLabel };
  for (const a of f.log) st = dispatch(model, st, a);
  return st;
}

// ---------------------------------------------------------------------------
// The model book

export function describeRule(model: CompiledModel, ruleId: string, overrides: Record<string, number>): { sentence: Text; equation: string } {
  const r = model.rules.find((x) => x.id === ruleId);
  if (!r) throw new EngineError("unknown_rule", ruleId);
  const p = (n: string) => overrides[`${r.id}.${n}`] ?? r.params[n]?.default ?? 0;
  const outs = r.outputs.join(", ");
  const ins = (Array.isArray(r.input) ? r.input : r.input ? [r.input] : r.inputs).join(" + ");
  let equation: string;
  switch (r.kind) {
    case "linear":
      equation =
        r.drive === "clock"
          ? `${outs} += ${p("coef")} per term`
          : r.drive === "change"
            ? `Δ${outs}(t) = ${p("coef")} × Δ${ins}(t - ${r.change_lag ?? r.lag})`
            : `${outs} += size × ${p("coef")} / ${r.params["coef"]?.default ?? 1} (after ${r.lag} terms)`;
      break;
    case "saturating":
      equation =
        r.saturate === "repeat"
          ? `effect × ${p("coef")} if played again within ${r.window ?? 2} terms`
          : r.saturate === "ceiling"
            ? `${outs} += min(size × ${p("coef")}, ${p("ceiling")} - total so far)`
            : r.saturate === "plays"
              ? `${outs} += ${p("coef")} per play, halved after ${r.after_plays ?? 3} plays`
              : `${outs} += size × ${p("coef")} / ${r.params["coef"]?.default ?? 1}, up to 10; Δemissions = ${p("coef_emissions_head")} × Δ${ins}`;
      break;
    case "stock":
      equation =
        r.stock === "decay"
          ? `${outs}(t+1) = ${outs}(t) + inflow - ${p("outflow")} × (${outs}(t) - ${outs}(2026))`
          : r.stock === "clock"
            ? `${outs} += ${p("rate")} per term`
            : r.stock === "approach_fcm"
              ? `nature(t+1) = nature(t) + ${p("rate")} × (FCM equilibrium - nature(t))`
              : r.stock === "accumulate"
                ? `carbon(t+1) = carbon(t) + ${p("coef")} × (emissions(t) - straight path(t))`
                : r.stock === "debt"
                  ? `budget -= ${p("interest")} per token per term; token cleared for ${p("clear_cost")} pips`
                  : `${outs} += inflow × ${p("coef")} / ${r.params["coef"]?.default ?? 1}`;
      break;
    case "threshold":
      equation = r.event === "tip_movement" ? `chance of a tip moving = ${p("chance1")}, ${p("chance2")}, ${p("chance3")} by risk step` : r.event === "heartland_drop" ? `event when Welsh speakers < ${p("level")} per cent` : `chance a fragile employer leaves = ${p("chance")}`;
      break;
    case "fcm":
      equation = `pressure offset = size × ${p("coef")} on the FCM scale`;
      break;
    case "io":
      equation = `employment += ${p("band1")}, ${p("band2")} or ${p("band3")} × cost × ${p("scale")}, this term and next`;
      break;
  }
  return { sentence: r.note, equation };
}

// re-exported for bots and tests
export { quantile, median, cardInForce, uniformSeed };
export const _internal = { sim, uniform };
