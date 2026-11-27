/**
 * The engine's public surface. The UI imports from this file only.
 *
 * CHANGES (newest first; every change is backward compatible in shape):
 * - v2.1: `Preview.perCard` fields are all marginal changes (before, `median` was the eventual level,
 *   which read as a fall of about a pip on strands under baseline drift); added `Preview.strands[].baseline`
 *   (no plays, same horizon). Decision 15: national plays count for every region in the neglect test;
 *   the uneven-hand letter names a region that got no regional card of its own (or the least served
 *   when one region took over two thirds); `game.trust.neglect_note` holds the rule sentence.
 * - v2.0 (result v2, balance decision 14): `EndResult.lived`, `left` and `result` now carry the change
 *   since 2026 in net strand pips (bands -4, -1, +1, +4 from `game.judged_change`), Lived counts terms
 *   2 to 6 with the dip rule. Added `livedLevel`, `leftLevel`, `dippedBelowStart`, `vsCaretaker` and
 *   per-strand `livedLevel`/`leftLevel`; per-strand `lived`/`left` are changes; `caretakerGhost` is in
 *   change units; `worstTerm` is the lowest counted term. The letter uses the change bands. A shock is
 *   prepared only if a response card has landed in an authority the shock reaches.
 * - v1.2: the engine fills tuning fields missing from an older model.json (no NaN from a stale build);
 *   upkeep that ends is stored as term 9999, not Infinity, so GameState survives JSON. Rebuild with
 *   `npm run model:build` after pulling.
 * - v1.1: `preview` compares each card's marginal effect over the same horizon as the whole plan
 *   (fixes inflated negative deltas). A return-from-caretaker term always plays at the Thin limit (2).
 *   In the first game the Rhondda (term 2) and Bethesda (term 4) are offered even if another trigger
 *   card was played. `state.runsNote` is set if a slow device makes the engine drop to fewer runs.
 *   Schema additions (all optional): `Rule.change_lag`, `Condition.half_without_card`, `Card.confidence`,
 *   `PlaceBoard.thresholds`, `PlaceBoard.risk_rule`, `GameTuning.curveballs.slow_scale` and `shock_scale`.
 * - v1.0 (2026-11-26): first published contract.
 *
 * How a game flows
 * ----------------
 * `newGame(model, seed, options)` returns a `GameState` at step `opening` of term 1 (2026).
 * Each term is the seven steps of game-design section 2.2, held in `state.step`:
 *
 *   opening -> pledge (terms 2 to 6) -> plan -> visit (only if offered) -> passing -> changed -> election
 *
 * Move between steps with `dispatch(state, action)` (or the named helpers below, which call it).
 * Every call is pure: it returns a new state and never mutates its argument. Same seed, same
 * model and same actions always give the same game.
 *
 * - opening:  the year turns, arrivals land, the trend card is shown, the hand is dealt.
 *             Read `state.opening`. Send `{type: "open"}`.
 * - pledge:   from term 2. `state.pledgeOffer` is the strand the voice asks for.
 *             Send `{type: "pledge", strand}` (or `strand: null` to decline).
 * - plan:     the hand (`state.hand`), budget (`state.budget`), card limit (`state.cardLimit`).
 *             Call `preview(state, plays)` as often as you like (pure, about 50 runs).
 *             Optional `{type: "peek"}` (1 pip, once a term) fills `state.peekedNext`.
 *             Send `{type: "commit", plays}`; `validatePlays` says why a plan is refused.
 * - visit:    only when `state.visitOffer` is set. Send `{type: "visit", choice}` with
 *             `choice: null` to stay (resolves adequately) or the threads placed.
 *             `gradeVisit(state, choice)` previews a grade without committing.
 * - passing:  the timeline slides. `state.shock` says whether a shock lands (and whether you
 *             were ready). Send `{type: "respond", response: 0 | 1 | 2}` (pips of contingency;
 *             0 = absorb; send 0 when there is no shock). The whole term then resolves.
 * - changed:  `state.lastOutcome` holds the strand changes, three slips, Trust reasons, the voice.
 *             `pullThread(state, ...)` gives traces. Send `{type: "continue"}`.
 * - election: `state.lastOutcome.trust` has the new band and card limit. Send `{type: "next"}`.
 *             If Trust collapsed the next term is a caretaker term: step `caretaker`, where the
 *             player makes one choice, `{type: "caretaker", shadowPledge}`, and the whole term
 *             plays itself, landing on `changed`.
 * - ended:    after term 6. `state.result` is the `EndResult` (letter, Lived, Left, ledger).
 *
 * `resolve(state, plays, visit, response)` runs plan to changed in one call (used by bots and
 * tests); the UI should use the step machine so the shock can be shown before the response.
 *
 * Numbers
 * -------
 * Strand and component scores are 0 to 10. Pips shown to the player are whole numbers with
 * hysteresis (`StrandView.flowPips`). Trust is 0 to 100 internally; show only the band and dial.
 * Never show raw scores as decimals to the player (spec: no false precision).
 *
 * Save and load
 * -------------
 * `saveGame(state)` returns a short JSON string (seed, options, decisions). `loadGame(model, s)`
 * replays it. Store under keys prefixed `SAVE_PREFIX`.
 */

import type {
  CompiledModel,
  Grade,
  LetterArchetype,
  NamedThingKind,
  RegionId,
  StrandId,
  Text,
  TrustBand,
  LetterSlot,
  Confidence,
  EvidenceGrade,
} from "../model/schema";
import * as impl from "./game";

export type { CompiledModel, Grade, RegionId, StrandId, Text, TrustBand };

/** localStorage key prefix for this app (its own origin, ADR 0003). */
export const SAVE_PREFIX = "etifeddiaeth.v1.";

/** Strand ids in display order (same as the model's strands). */
export { STRAND_IDS as STRAND_ORDER } from "../model/schema";

/** The term start years of short mode. */
export const TERM_YEARS: readonly number[] = [2026, 2030, 2034, 2038, 2042, 2046];

// ---------------------------------------------------------------------------
// Options

/** Options for `newGame`. All optional. */
export interface NewGameOptions {
  /** Uncertainty runs per resolution (default from model `game.runs`, 200). Run 0 uses default parameters. */
  runs?: number;
  /** Runs used by `preview` (default `game.preview_runs`, 50). */
  previewRuns?: number;
  /**
   * First game / guided mode: curated curveball order (`wet-decade`, `price-of-a-home`, `downturn`
   * shock in term 4), the Rhondda asks for you in term 2 and Bethesda by term 4.
   */
  firstGame?: boolean;
  /** Daily Wales: the date string `YYYY-MM-DD` the seed came from (shown on the end screen). */
  daily?: string;
  /** Strand weights (default one seventh each). Normalised to sum to 1. */
  weights?: Partial<Record<StrandId, number>>;
  /**
   * Model book changes: `"R13.coef": -1.2`. Values outside a parameter's range are refused by
   * `validateOverrides`. Any override marks the game as a modified rule set.
   */
  paramOverrides?: Record<string, number>;
  /** Also play the caretaker bot on the same seed for the end screen's ghost mark (default true). */
  caretakerGhost?: boolean;
  /** Time budget for `resolve` in ms (default 250). If a test run is slower, later terms use fewer runs and `state.runsNote` says so. */
  timeBudgetMs?: number;
}

/** The options as the engine applied them. */
export interface ResolvedOptions {
  runs: number;
  previewRuns: number;
  firstGame: boolean;
  daily: string | null;
  weights: Record<StrandId, number>;
  paramOverrides: Record<string, number>;
  caretakerGhost: boolean;
  timeBudgetMs: number;
}

// ---------------------------------------------------------------------------
// Player decisions

/** Playing one card from the hand. */
export interface CardPlay {
  card: string;
  /**
   * For `region` cards: the chosen region. For `national_or_region` cards: omit for national.
   * For `two_regions` (regional-compact): set `regions` instead.
   */
  region?: RegionId;
  /**
   * For `two_regions` cards: the two regions. For a regional card while a compact is in force:
   * both compact regions, at one extra pip (game-design 6, regional-compact).
   */
  regions?: RegionId[];
}

/** Everything decided at the plan step. Unspent pips are held as contingency. */
export interface Plays {
  cards: CardPlay[];
  /** At most one standing ticket per term (uses no card slot). */
  standing?: "borrow-to-invest" | "defer-maintenance" | null;
  /** Debt tokens to clear this term (3 pips each). */
  repayDebt?: number;
  /** Repair deferred maintenance this term (3 pips): reverses one deferral. */
  repair?: boolean;
  /** Upkeep obligations (ids from `state.upkeepDue`) deliberately left unpaid; their effect lapses. */
  skipUpkeep?: string[];
  /** One unplayed card to hold over to next term's hand. */
  holdOver?: string | null;
}

/** A place visit decision: threads placed on board items, or null to stay (adequate). */
export type VisitChoice = { place: "rhondda" | "bethesda"; threads: string[] } | null;

/** Contingency pips spent on a shock: 0 absorb, 1 halves the hit, 2 quarters it. */
export type ShockResponse = 0 | 1 | 2;

/** The step machine's actions. Also the save log. */
export type Action =
  | { type: "open" }
  | { type: "pledge"; strand: StrandId | null }
  | { type: "peek" }
  | { type: "commit"; plays: Plays }
  | { type: "visit"; choice: VisitChoice }
  | { type: "respond"; response: ShockResponse }
  | { type: "continue" }
  | { type: "next" }
  | { type: "caretaker"; shadowPledge: StrandId };

/** Step ids, game-design 2.2, plus the caretaker step and the end. */
export type StepId = "opening" | "pledge" | "plan" | "visit" | "passing" | "changed" | "election" | "caretaker" | "ended";

// ---------------------------------------------------------------------------
// State

/** A strand as shown on the strand row. */
export interface StrandView {
  strand: StrandId;
  /** Flow score 0 to 10 (median of runs). Feeds Lived. */
  flow: number;
  /** Stock score 0 to 10 (median of runs). Feeds Left. Drawn as the stitched tick. */
  stock: number;
  /** Whole pips with hysteresis (what the player sees). */
  flowPips: number;
  stockPips: number;
  /** At least `sharp_share` of runs agree on the pip. */
  flowSharp: boolean;
  stockSharp: boolean;
  /** 10th and 90th percentile across runs. */
  flowP10: number;
  flowP90: number;
  /** The tick sits left of the filled pips: living beyond the inheritance (draw it rust). */
  beyondInheritance: boolean;
}

/** The budget for this term, itemised so the UI can explain it. */
export interface BudgetView {
  base: number;
  /** Interest on debt tokens (negative). */
  debtInterest: number;
  /** Return-from-caretaker penalty (negative). */
  returnPenalty: number;
  /** Curveball hits (negative), e.g. older-wales from 2038. */
  curveball: number;
  /** Shock hits carried from last term (negative). */
  carriedHit: number;
  /** Unspent contingency carried over (0 or 1). */
  carried: number;
  /** Upkeep owed this term (negative; paid unless skipped). */
  upkeep: number;
  /** Peek cost if peeked (negative). */
  peek: number;
  /** What is left to spend on cards, standing tickets and repayments. */
  available: number;
}

/** An upkeep payment owed this term. */
export interface UpkeepDue {
  id: string;
  card: string;
  pips: number;
  /** What lapses if unpaid (plain words from the card). */
  note: Text;
  region: RegionId | null;
}

/** A card in the post (the post rail under the map). */
export interface PostItem {
  card: string;
  playedTerm: number;
  playedYear: number;
  /** Term index (0 = 2026) when the main effect lands. 6 and beyond is after 2050. */
  arrivesTerm: number;
  arrivesYear: number;
  regions: RegionId[] | null;
  /** Counts in Left (arrives by 2058). */
  countsInLeft: boolean;
}

/** A debt token. */
export interface DebtToken {
  takenTerm: number;
  year: number;
}

/** An active curveball. */
export interface ActiveTrend {
  curveball: string;
  sinceTerm: number;
  sinceYear: number;
}

/** The shock landing this term (visible from step `passing`). */
export interface ShockView {
  curveball: string;
  /** A listed response card is in play or in the post: the hit is already halved and earns the stamp. */
  prepared: boolean;
  /** Cards that made you ready. */
  preparedBy: string[];
  /** Contingency available to respond with. */
  contingency: number;
  /** Hit multiplier for each response, after preparation and fragile infrastructure. */
  hit: { absorb: number; respond1: number; respond2: number };
}

/** A visit being offered at step `visit`. */
export interface VisitOffer {
  place: "rhondda" | "bethesda";
  /** The card(s) that triggered it, or "curveball" in first-game mode. */
  triggeredBy: string[];
  /** Threads the player may place (3, or 2 for a `visit_thread_fewer` card alone). */
  threads: number;
  /** For the Rhondda: current movement risk step per tip id (wet-decade raises them). */
  tipRisk?: Record<string, 1 | 2 | 3>;
  /** Trends active that change the Bethesda sums. */
  activeTrends: string[];
}

/** What the opening step shows. */
export interface OpeningView {
  year: number;
  /** Cards from the post that landed this term. */
  arrivals: PostItem[];
  /** A new slow trend revealed this term (the trend card, top left), or null. */
  newTrend: string | null;
  /** The opening voice (last term's voice carried). */
  voice: VoiceLine | null;
  /** "From the opposition benches" when this is a caretaker term. */
  caretaker: boolean;
  returning: boolean;
}

/** Ledger items for the end screen and the drawer. */
export interface Ledger {
  debts: DebtToken[];
  /** Upkeep obligations minted (flood walls, buses), with paid and skipped counts. */
  liabilities: { card: string; mintedYear: number; paid: number; skipped: number }[];
  deferrals: { year: number; repaired: boolean }[];
  grades: { place: "rhondda" | "bethesda"; year: number; grade: Grade }[];
  lostTerms: number[];
  pledges: { year: number; strand: StrandId; kept: boolean | null }[];
}

/**
 * The whole game. Plain JSON (serialisable), but treat it as opaque except for the documented
 * fields; `sim` is the engine's ensemble and may change shape between versions.
 */
export interface GameState {
  version: 1;
  modelHash: string;
  /** Any parameter override: show "you are playing a modified rule set". */
  modified: boolean;
  seed: number;
  /** What to show for the seed: the date for daily games, else the number. */
  seedLabel: string;
  options: ResolvedOptions;
  /** Term index 0 to 5 (6 once ended). */
  term: number;
  year: number;
  step: StepId;
  /** This term is played by the caretaker. */
  caretaker: boolean;
  /** This term follows a caretaker term (Trust floored at 20, budget minus 1). */
  returning: boolean;
  opening: OpeningView | null;
  budget: BudgetView;
  upkeepDue: UpkeepDue[];
  /** Trust 0 to 100. Show the band and dial, never the number. */
  trust: number;
  trustBand: TrustBand;
  /** Cards that may be played this term. */
  cardLimit: number;
  hand: string[];
  /** Card ids in deck order (top first). */
  deck: string[];
  /** Strand the opening voice asks you to promise (step pledge), or null. */
  pledgeOffer: StrandId | null;
  pledge: StrandId | null;
  /** Shadow pledge made during a caretaker term. */
  shadowPledge: StrandId | null;
  activeTrends: ActiveTrend[];
  /** Next term's curveball if peeked: a new trend id, "none", or null if not peeked. */
  peekedNext: string | null;
  peekedThisTerm: boolean;
  shock: ShockView | null;
  visitOffer: VisitOffer | null;
  /** The plays committed this term (from step visit on). */
  plays: Plays | null;
  visit: VisitChoice;
  post: PostItem[];
  debts: DebtToken[];
  /** Count of unrepaired deferrals. */
  deferrals: number;
  ledger: Ledger;
  strands: StrandView[];
  /** Outcomes of finished terms, oldest first. */
  history: TermOutcome[];
  lastOutcome: TermOutcome | null;
  result: EndResult | null;
  /** Set when the engine used fewer runs than asked to stay within the time budget. */
  runsNote: string | null;
  /** Decisions so far (the save log). */
  log: Action[];
  /** @internal The ensemble of runs. Opaque to the UI. */
  sim: unknown;
}

// ---------------------------------------------------------------------------
// Outcomes and traces

/** What caused a change. */
export type CauseKind =
  | "card" // a played card (id = card id)
  | "standing" // a standing ticket (id = ticket id)
  | "curveball" // a slow trend (id = curveball id)
  | "shock" // a shock (id = curveball id)
  | "baseline" // a baseline pressure rule (id = rule id)
  | "upkeep" // unpaid upkeep or deferred repairs (id = card id)
  | "event" // a threshold event: tip moved, employer left, heartland drop (id = rule id)
  | "caretaker"; // a card played by the caretaker (id = card id)

/** One cause of a change. */
export interface Cause {
  kind: CauseKind;
  id: string;
  /** Term index when it was played or began (for arrivals, the term played). */
  term: number;
  year: number;
  regions: RegionId[] | null;
  /** If a place visit shaped delivery. */
  place?: { place: "rhondda" | "bethesda"; grade: Grade; threads: string[] };
}

/** One contribution to a component this term (central run). */
export interface Contribution {
  component: string;
  cause: Cause;
  /** The rule that carried it. */
  rule: string | null;
  /** For chained rules: the input component that moved first. */
  via: string | null;
  /** Side effect or ripple (feeds the "Unexpected" slip). */
  side: boolean;
  /** Change of the Wales value of the component, in points. */
  wales: number;
  /** Change per authority, in points, in `model.authorities` order. */
  perLa: number[];
}

/** One stop on a thread (game-design 2.3). */
export type TraceStop =
  | { kind: "strand"; strand: StrandId; part: "flow" | "stock"; delta: number; pipsBefore: number; pipsAfter: number; sharp: boolean }
  | { kind: "component"; component: string; delta: number }
  | { kind: "cause"; cause: Cause; delta: number }
  | { kind: "place"; place: "rhondda" | "bethesda"; grade: Grade; threads: string[] }
  | {
      kind: "rule";
      rule: string;
      ruleKind: string;
      params: { name: string; value: number; min: number; max: number; unit: Text }[];
      confidence: Confidence;
      evidence: EvidenceGrade;
      placeholder: boolean;
      gameRule: boolean;
      sources: string[];
    };

/** A pulled thread: strand, cause, place, rule, in that order. Ends with the fixed closing line (UI copy). */
export interface Thread {
  strand: StrandId;
  part: "flow" | "stock";
  /** Change of the strand score (points) carried by this thread. */
  delta: number;
  stops: TraceStop[];
  /** Authorities to draw the red thread through (most moved first). */
  las: string[];
}

/** The change of one strand over a term. */
export interface StrandChange {
  strand: StrandId;
  flowBefore: number;
  flowAfter: number;
  stockBefore: number;
  stockAfter: number;
  pipsBefore: number;
  pipsAfter: number;
  stockPipsBefore: number;
  stockPipsAfter: number;
  sharp: boolean;
  stockSharp: boolean;
}

/** A "what changed" slip. Three per term: the biggest two plus one marked unexpected. */
export interface Slip {
  strand: StrandId;
  part: "flow" | "stock";
  cause: Cause;
  /** Change of the strand score carried by this cause (points). Show as direction, not a number. */
  delta: number;
  unexpected: boolean;
}

/** One reason Trust moved. */
export interface TrustReason {
  code:
    | "pips_gained"
    | "pips_lost"
    | "promise_kept"
    | "pledge_kept"
    | "pledge_broken"
    | "gap_narrowed"
    | "gap_widened"
    | "shock_prepared"
    | "shock_responded"
    | "shock_absorbed"
    | "visit"
    | "neglect"
    | "debt_interest"
    | "nothing_visible"
    | "drift"
    | "curveball"
    | "card"
    | "shadow_pledge"
    | "return";
  points: number;
  /** Detail for the words: strand, region, card, grade or curveball id. */
  detail?: string;
}

/** Trust after a term. */
export interface TrustOutcome {
  before: number;
  after: number;
  band: TrustBand;
  /** Card limit for the next term (0 if a caretaker term follows). */
  cardLimit: number;
  reasons: TrustReason[];
  /** The two largest reasons by size, for "Pledge kept. The North went without again." */
  top: TrustReason[];
  /** Trust collapsed: next term is a caretaker term. */
  lostSeat: boolean;
}

/** A voice line: a template id plus filled slots. Always labelled illustrative. */
export interface VoiceLine {
  template: string;
  /** The filled text in both languages. */
  text: Text;
  /** Authority code of the place speaking. */
  la: string;
  town: Text;
  event: string;
}

/** Discrete events of the term, for voices, the map and the ledger. */
export interface GameEvent {
  kind: "tip_moved" | "employer_left" | "heartland_drop" | "upkeep_lapsed" | "neglect" | "arrival" | "shock" | "trend" | "visit";
  id: string;
  la?: string;
  region?: RegionId;
  detail?: string;
}

/** A shock as it resolved. */
export interface ShockOutcome {
  curveball: string;
  response: ShockResponse;
  prepared: boolean;
  preparedBy: string[];
  /** Final multiplier on the hit (1 = full). */
  hit: number;
}

/** A place visit as it resolved. */
export interface VisitOutcome {
  place: "rhondda" | "bethesda";
  grade: Grade;
  threads: string[];
  /** True if the player stayed (adequate by default). */
  stayed: boolean;
  tests: { id: string; pass: boolean; share: number }[];
}

/** Everything that happened in one term. */
export interface TermOutcome {
  term: number;
  year: number;
  caretaker: boolean;
  plays: Plays;
  spent: number;
  contingencyHeld: number;
  arrivals: PostItem[];
  newTrend: string | null;
  shock: ShockOutcome | null;
  visit: VisitOutcome | null;
  pledge: { strand: StrandId; kept: boolean } | null;
  strands: StrandChange[];
  slips: Slip[];
  trust: TrustOutcome;
  voice: VoiceLine | null;
  events: GameEvent[];
  /** Term wellbeing W_t (weighted flow), median. */
  wellbeing: number;
  /** All contributions of the term (central run), for traces and the map. */
  contributions: Contribution[];
}

// ---------------------------------------------------------------------------
// End of game

/** A result band 1 to 5 with its name. */
export interface ResultBand {
  band: 1 | 2 | 3 | 4 | 5;
  name: Text;
}

/** Lived or Left with its fuzzy edge. */
export interface Score {
  value: number;
  /** 10th and 90th percentile across runs. */
  p10: number;
  p90: number;
  band: ResultBand;
}

/** The letter from 2050, filled. */
export interface Letter {
  archetype: LetterArchetype;
  title: Text;
  /** The five slots in order, filled. */
  lines: { slot: LetterSlot; text: Text }[];
  /** Authority the writer lives in. */
  la: string;
  town: Text;
  named: { kind: NamedThingKind; id: string | null; year: number | null };
}

/**
 * The end screen. Since v2 (balance decision 14) `lived`, `left` and `result` are judged as the
 * change since 2026 in net strand pips (seven times the weighted change): show them rounded to
 * whole pips with "about", "level with 2026" between -0.5 and +0.5. The 0 to 10 levels for the
 * woven bands are `livedLevel`, `leftLevel` and `start`.
 */
export interface EndResult {
  weights: Record<StrandId, number>;
  /** Change since 2026 in net strand pips: terms 2 to 6, less a share of any dip below 2026. */
  lived: Score;
  /** Change since 2026 in net strand pips of what is handed on (stocks in 2050, debt priced). */
  left: Score;
  /** The lower of the two. */
  result: Score & { which: "lived" | "left" };
  /** The Lived level (0 to 10) behind `lived`: draw the woven band from this. */
  livedLevel: number;
  /** The Left level (0 to 10) behind `left`. */
  leftLevel: number;
  /**
   * Per strand: `lived` and `left` are that strand's own change in pips since 2026 (no factor of
   * seven), `lower` by change; `livedLevel` and `leftLevel` are its 0 to 10 levels.
   */
  perStrand: { strand: StrandId; lived: number; left: number; lower: "lived" | "left"; livedLevel: number; leftLevel: number }[];
  /** W_t (weighted flow level) for each of the six terms. Term 1 is inherited (not counted). */
  wellbeingByTerm: number[];
  /** Index of the lowest counted term (2 to 6). */
  worstTerm: number;
  /** A counted term fell below the 2026 start (mark it in rust). */
  dippedBelowStart: boolean;
  /** 2026 starting levels (weighted flow and stock, 0 to 10). */
  start: { lived: number; left: number };
  /** "Wales under a caretaker" on the same seed, in the same change units (null if disabled). */
  caretakerGhost: { lived: number; left: number; result: number } | null;
  /** How far the player finished from the caretaker: result.value minus the ghost's result (net pips). */
  vsCaretaker: number | null;
  letter: Letter;
  ledger: Ledger;
  inThePost: PostItem[];
  /** Seven coloured squares per band, no numbers: e.g. "Lived 🟩..." built by the UI from `squares`. */
  squares: { lived: StrandId[]; left: StrandId[] };
  seedLabel: string;
  modified: boolean;
  /** Letter archetypes this result counts towards ("letters received"). */
  archetype: LetterArchetype;
}

// ---------------------------------------------------------------------------
// Preview

/** A projected strand. */
export interface Projection {
  median: number;
  p10: number;
  p90: number;
  pips: number;
  sharp: boolean;
}

/** A problem with a plan (codes map to i18n keys `plan.problem.<code>`). */
export interface Problem {
  code:
    | "wrong_step"
    | "not_in_hand"
    | "duplicate"
    | "over_limit"
    | "over_budget"
    | "needs_region"
    | "bad_region"
    | "two_regions_needed"
    | "compact_not_in_force"
    | "standing_unknown"
    | "debt_max"
    | "no_debt"
    | "nothing_to_repair"
    | "hold_over_invalid"
    | "upkeep_unknown";
  card?: string;
  detail?: string;
}

/** What `preview` returns: the ghost on the strand row. */
export interface Preview {
  valid: boolean;
  problems: Problem[];
  cost: number;
  available: number;
  contingency: number;
  /**
   * Per strand, as levels (0 to 10): now, at the end of this term, once every played card has landed
   * (`eventual`), and the same horizon with no plays (`baseline`, the drift of trends and baseline
   * pressures). The plan's own effect is `eventual` minus `baseline`, not minus `now`.
   */
  strands: { strand: StrandId; now: number; end: Projection; eventual: Projection; baseline: Projection; stockNow: number; stockEventual: Projection }[];
  /**
   * Marginal eventual effect of each played card, per strand: every field is a change in strand
   * score (with the card minus without it, paired run by run, so exactly 0 where the card reaches
   * nothing). `median` equals `delta`; `pips` is its rounding; `sharp` means runs agree to a quarter pip.
   */
  perCard: { card: string; strands: Record<StrandId, Projection & { delta: number }> }[];
  /** Visit that would be offered. */
  visit: "rhondda" | "bethesda" | null;
  runs: number;
}

/** Per-authority view of a component for map lenses during Yfory. */
export interface ComponentView {
  component: string;
  /** Median score per authority, model.authorities order. */
  scores: number[];
  /** Change since 2026 caused by the player (cards, standing tickets, places), per authority. */
  playerDelta: number[];
  /** Raw value per authority via the band (null for components with no indicator). */
  raw: (number | null)[];
  wales: number;
}

// ---------------------------------------------------------------------------
// Functions

/** Start a game. `seed` may be a number or any string (hashed). Returns step `opening` of 2026. */
export function newGame(model: CompiledModel, seed: number | string, options?: NewGameOptions): GameState {
  return impl.newGame(model, seed, options);
}

/** Apply one action. Throws `EngineError` if the action is not allowed at this step. */
export function dispatch(model: CompiledModel, state: GameState, action: Action): GameState {
  return impl.dispatch(model, state, action);
}

/** Check a plan without committing it. */
export function validatePlays(model: CompiledModel, state: GameState, plays: Plays): Problem[] {
  return impl.validatePlays(model, state, plays);
}

/** The pip cost of a card for this state (power-rush discounts, compact extra pip). */
export function cardCost(model: CompiledModel, state: GameState, play: CardPlay): number {
  return impl.cardCost(model, state, play);
}

/** Ghost preview of a plan (pure; uses `previewRuns` runs). */
export function preview(model: CompiledModel, state: GameState, plays: Plays): Preview {
  return impl.preview(model, state, plays);
}

/** Grade a visit choice without committing (judged across runs). */
export function gradeVisit(model: CompiledModel, state: GameState, choice: VisitChoice): VisitOutcome {
  return impl.gradeVisit(model, state, choice);
}

/**
 * Run a whole term from step `plan`: commit, visit, respond. Returns the state at step `changed`
 * with `lastOutcome` set. `response` is ignored if no shock lands.
 */
export function resolve(model: CompiledModel, state: GameState, plays: Plays, visit: VisitChoice, response: ShockResponse): GameState {
  return impl.resolve(model, state, plays, visit, response);
}

/** Pull the threads behind one strand's change in a finished term (most important first). */
export function pullThread(model: CompiledModel, state: GameState, term: number, strand: StrandId, part?: "flow" | "stock"): Thread[] {
  return impl.pullThread(model, state, term, strand, part ?? "flow");
}

/** Per-authority view of a component (for lenses with modelled values and thread hatching). */
export function componentView(model: CompiledModel, state: GameState, component: string): ComponentView {
  return impl.componentView(model, state, component);
}

/** Recompute the end result with other strand weights (the end screen slider). */
export function recomputeResult(model: CompiledModel, state: GameState, weights: Partial<Record<StrandId, number>>): EndResult {
  return impl.recomputeResult(model, state, weights);
}

/** Serialise a game (seed, options, decision log) as a short JSON string. */
export function saveGame(state: GameState): string {
  return impl.saveGame(state);
}

/** Restore a saved game by replaying it. Throws `EngineError` if the save is unreadable. */
export function loadGame(model: CompiledModel, saved: string): GameState {
  return impl.loadGame(model, saved);
}

/** The daily Wales seed for a date `YYYY-MM-DD` (same for everyone that day). */
export function dailySeed(date: string): number {
  return impl.dailySeed(date);
}

/** Check model book overrides. Returns problems (unknown parameter, out of range); empty if fine. */
export function validateOverrides(model: CompiledModel, overrides: Record<string, number>): string[] {
  return impl.validateOverrides(model, overrides);
}

/** The model book sentence and equation for a rule (equation is language neutral). */
export function describeRule(model: CompiledModel, ruleId: string, overrides?: Record<string, number>): { sentence: Text; equation: string } {
  return impl.describeRule(model, ruleId, overrides ?? {});
}

/** Trust band for a Trust value. */
export function trustBand(model: CompiledModel, trust: number): TrustBand {
  return impl.trustBand(model, trust);
}

/** Raised for illegal actions or unreadable saves. `code` is stable for i18n. */
export { EngineError } from "./errors";
