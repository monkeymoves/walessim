/**
 * The engine's public surface. The UI imports from this file only.
 *
 * CHANGES (newest first; every change is backward compatible in shape):
 * - v6.0 (plain wales, docs/design/plain-wales.md section 10): additive only, no rule, cost, effect or
 *   balance number moved and `GameState` keeps its shape. E1: `headline(model, state)` gives the two
 *   running scores out of 100 (`Headline`: Life now and Left for 2050 with their 2026 starts), the
 *   same weighted sums as `EndResult`; once ended they are `livedLevel`, `leftLevel` and `start`
 *   times ten. E2: a first game deals `game.first_game_hand` in turn 1 (Build flood walls, Warm homes,
 *   Welsh-medium childcare, Everyone online) and keeps `game.first_game_not_before_term3` (Regional
 *   compact) out of its first two hands; no crisis lands in turn 1 of any game. E3:
 *   `whatMattered(model, state, limit?)` lists the largest causes across the game (`Mattered`: card,
 *   shock, visit, promise, lost turn, coins unused) with year, place and goal, sized in score points
 *   out of 100; `unusedCoins(state)` counts coins left unspent and lost (not used by a crisis, not
 *   carried over).
 * - v5.1 (playtest 4): `Grade` gains `"very_well"` (above "well"): every test held with room to spare,
 *   the margins in each board's `very_well` block (Bethesda: every test in 9 runs in 10, against 6
 *   needed; the Rhondda: exposure a fifth above what it needs, two deprived neighbourhoods, every
 *   top-risk lifeline tip). It counts as good wherever well does (a place graded well or very well
 *   twice runs itself), delivers a little above well and earns a little more Trust. `GRADE_ORDER` and
 *   `isGoodGrade` are exported. `PlaceBoard` (this file) is the model's board plus `termConditions:
 *   Text[]`, the trends changing that board this term ("Prices pull away: one Homes thread is not
 *   enough."), empty when none: read it with `placeBoard(model, state, place)` at any step, and the same
 *   list is on every `VisitOffer.termConditions` (alternatives too). `CardPreview.needsPartner`: the card
 *   delivers nothing by itself and only enables other cards (Regional compact); when true and `real`
 *   is empty, `nothingThisTerm` and `landsAfterGame` are false (show "works through other cards", never
 *   "Lands {year}:" with nothing after it). A preview never shows a move under a pip against the card's
 *   own ticket (a strand it only helps, or only frays). The term 6 hand always holds a card that lands
 *   by 2050 and does something by itself. No shock lands twice in a game, including the first game's
 *   own (it fired early and again in its curated term). After a caretaker term Trust is at most
 *   `caretaker.return_trust_max` (Thin). Slips never credit a standing ticket or a lapsed upkeep with
 *   moving a strand against what it does (no "Put off the repairs lifted More equal"). The letter names
 *   every year of the loans left ("The loans from 2026 and 2034 are still on the books.").
 * - v5.0 (playtest 3): `Preview.perCard` entries are `CardPreview`: paired marginals at the card's own
 *   landing for flow (`strands`, as before) and stock (`stock`), this term (`thisTerm`), `real` strands,
 *   `nothingThisTerm`, `firstTerm/firstYear`, `landsInTerm/landsYear`, `landsAfterGame`. Visits:
 *   `VisitOffer.alternatives` when two places are triggered (choose either; the offer names its card);
 *   two tests of three held grades well. The promise result is always the first Trust reason. One
 *   shock response record (from the term it landed). The term 6 hand always holds a card that lands by 2050.
 * - v4.0 (playtest 2): slips agree with tickets. A card is never named before its first effects land
 *   or for a strand its ticket does not show; `Card.helps` now includes every strand a card moves
 *   (one chained rule on, the jobs ripple's Prosperous) and `Card.mixed` lists strands it can move
 *   either way by where it lands (equal). `Slip.recovery` (a temporary hit wearing off), `Slip.response`
 *   (pips spent on the shock, share of the hit, prepared), `Slip.thread` (key of its own thread);
 *   `Thread.key`; `pullThread` returns one thread per cause. `Contribution.recovery`. Delay:
 *   `Card.arrival` {first, full} from the effects' delays and rule lags; the post uses `full`, and
 *   `PostItem.firstTerm/firstYear` say when the first effects land ("first effects in 1, the rest in 2").
 *   Also: `VisitOffer.stitched` covers Bethesda (earlier options count, with a note); `VisitOutcome.mastered`
 *   (a place graded well twice runs itself: no third visit, its cards deliver well); voice templates can
 *   be gated (`requires_threads`, `requires_tests`, `requires_card`); `EndResult.worstFell`; the letter
 *   names all promises kept first when every one (three or more) was kept; no voice repeats in a game,
 *   openings included; returned cards are shuffled and a recent hand is not dealt again.
 * - v3.0 (playtest 1): `VisitOutcome.tests[].explanation` (filled bilingual text naming the player's
 *   threads) and `VisitOutcome.notes`; grades are by tests held (all: well, any: adequately, none:
 *   poorly); `VisitOffer.stitched` (Rhondda tips made safe on earlier visits, they count as covered and
 *   drop a risk step); a trigger card offers a visit only if it landed in the place's authority.
 *   `Letter.lines` now has two named lines and `Letter.namedAll` lists them with ledger kinds; the
 *   archetype follows the result band. `Slip.rule`, `Slip.shock`, `Slip.pipChange`: slips cover the
 *   strands whose pips moved and every landed shock (up to four slips). New Trust reason code
 *   `repairs_overdue`. `PlaceBoard.wimd` and `TipFacts.wimdEdition/wimdAreas` label WIMD 2019 ranks.
 *   Copy for these lives in model/i18n/{en,cy}/engine.json (`engine.*`), compiled into `model.engine_text`.
 *   `fillText` (Welsh mutation-aware slot filling), `joinNames` and `softMutate` are exported for UI copy.
 *   Trust in the guided first term is floored at Fair (`trust.first_term_floor`); each shock lands at
 *   most once a game; the pledge never repeats the strand of either of the last two terms; no voice
 *   repeats while fresh ones remain; R20 reads Welsh speakers by change from 2021, so the heartland
 *   cannot read "below half" from a clamped score.
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
 *   card was played. The run count is fixed for the game (never by the clock), so a save replays exactly.
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
  PlaceBoard as SchemaPlaceBoard,
} from "../model/schema";
import * as impl from "./game";

export type { CompiledModel, Grade, RegionId, StrandId, Text, TrustBand };
export { GRADE_ORDER, isGoodGrade } from "../model/schema";

/**
 * A place board as it stands this term (playtest 4): the model's board plus the conditions that apply
 * to it this term, in words, so the board can show them before the player chooses.
 */
export interface PlaceBoard extends SchemaPlaceBoard {
  /** Trends changing this board this term, e.g. "Prices pull away: one Homes thread is not enough." Empty when none. */
  termConditions: Text[];
}

/** localStorage key prefix for this app (its own origin, ADR 0003). */
export const SAVE_PREFIX = "etifeddiaeth.v1.";

/**
 * Fill {slots} in a bilingual string with Welsh mutation and article handling by the word before the
 * slot ("i'r Rhondda", "Mae'r Rhondda", "i Ddiwylliant", "yn Nhreorci", "a Chaerffili"). Use it for any
 * template that puts a name after a preposition. `places` lists the params that are places (for "yn").
 */
export { fill as fillText, joinNames, softMutate } from "./welsh";

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
  /** Kept for old saves. The engine no longer times itself: runs never change mid-game, so a replay is exact. */
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
  /**
   * Coins put in the emergency fund (plain-wales 3.3; cold playtest 6, item 2). Omitted: every unspent
   * coin is held, as before. Given: at most this many are held, and the rest are lost now, so the fund
   * a crisis sees and what carries over are exactly what the player chose.
   */
  save?: number;
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
  /** Term index (0 = 2026) when the card's main effects have all landed (in full). 6 and beyond is after 2050. */
  arrivesTerm: number;
  arrivesYear: number;
  /** When its first main effects land (equal to `arrivesTerm` unless it arrives in stages). Same rule as `Card.arrival`. */
  firstTerm?: number;
  firstYear?: number;
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
  /** Contingency available to respond with: the coins the player saved (`Plays.save`). */
  contingency: number;
  /**
   * Coins this crisis takes off next turn's budget, whatever is spent now (cold playtest 6, item 4:
   * "Crisis last turn -2" read as a second charge for the coins already spent).
   */
  budgetCut?: number;
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
  /** For the Rhondda: current movement risk step per tip id (wet-decade raises them; made-safe tips drop one). */
  tipRisk?: Record<string, 1 | 2 | 3>;
  /** Threads from earlier visits (Rhondda tips made safe, Bethesda options in place). Draw them stitched; they count. */
  stitched?: string[];
  /** Trends active that change the Bethesda sums. */
  activeTrends: string[];
  /**
   * For a visit no card asked for (the first game's curated visits): the active slow change that bears
   * on this place's board, or null (cold playtest 6, item 8: Bethesda blamed "the wet decade").
   */
  trend?: string | null;
  /** The conditions on this board this term, in words (same as `placeBoard(...).termConditions`). */
  termConditions: Text[];
  /**
   * When cards this term ask for both places: the other place, as a choice (playtest 3). The player
   * may go to `place` or to an alternative (send its `place` in the visit choice), or stay.
   */
  alternatives?: Omit<VisitOffer, "alternatives">[];
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
  /** The end of a temporary effect (a shock's hit or a one-term side effect wearing off): word it as recovery. */
  recovery?: boolean;
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
  /** The cause's key: a slip's `thread.key` names the thread that explains it. */
  key?: string;
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

/**
 * A "what changed" slip (up to four a term). One for every strand whose shown pips moved, naming its
 * biggest cause in that direction; one for a shock that landed; at most one unexpected. A card is
 * never named before its first effects arrive or for a strand its ticket does not show. Each slip
 * names the thread that explains it (`thread`): open `pullThread(term, strand, part)` and take the
 * thread whose `key` equals `thread.key`.
 */
export interface Slip {
  strand: StrandId;
  part: "flow" | "stock";
  cause: Cause;
  /** Change of the strand score carried by this cause (points). Show as direction, not a number. */
  delta: number;
  /** Only for threshold events or chained effects of trends: things no ticket prints. */
  unexpected: boolean;
  /** The rule that carried it (R25 is the jobs ripple: "the building work for X made jobs for a while"). */
  rule?: string | null;
  /** This slip is the shock that landed (every landed shock gets one). */
  shock?: boolean;
  /** A temporary effect wearing off: word it as recovery ("Resilient is recovering from Storm winter"). */
  recovery?: boolean;
  /** A card's printed side effect (on its ticket's side note), which lands at once, even while the card is in the post. */
  sideEffect?: boolean;
  /** The strand's shown pip change this term (0: a quiet "held" slip). */
  pipChange?: number;
  /** For the shock slip: the pips spent responding, the share of the hit that landed, and whether a card had made you ready. */
  response?: { pips: number; hit: number; prepared: boolean };
  /** The thread behind this slip: `pullThread(model, state, term, strand, part)` has one with this `key`. */
  thread?: { term: number; strand: StrandId; part: "flow" | "stock"; key: string };
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
    | "repairs_overdue"
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
  /** The place was graded well (or very well) twice before: it runs itself, no visit is offered, and delivery is well. */
  mastered?: boolean;
  /**
   * Each test with a player-facing explanation in terms of the player's threads (bilingual, filled,
   * from model/i18n/{en,cy}/engine.json `engine.visit.*`). `share` is the share of runs it held in.
   * Grades: a majority of tests held (two of three) is well, at least one adequately, none poorly.
   */
  tests: { id: string; pass: boolean; share: number; explanation?: Text }[];
  /** Notes for the whole visit: tips counted from earlier visits, trends that changed the sums. */
  notes?: Text[];
}

/** Everything that happened in one term. */
export interface TermOutcome {
  term: number;
  year: number;
  caretaker: boolean;
  plays: Plays;
  spent: number;
  contingencyHeld: number;
  /** Coins left unspent and not saved: lost at the end of the plan step (`Plays.save`). */
  coinsNotSaved?: number;
  /**
   * No more cards could be played at the commit: Trust's card limit was reached ("limit"), or every
   * card left in the hand cost more than the coins left ("price"). Absent otherwise.
   */
  cardsCapped?: "limit" | "price";
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
  /**
   * The slots in order, filled: salutation, lived, left, then two named lines (each a specific thing
   * the player did, from the ledger), then the sign-off. Older letters had one named line.
   */
  lines: { slot: LetterSlot; text: Text }[];
  /** Authority the writer lives in. */
  la: string;
  town: Text;
  /** The first named thing (kind in the archetype templates' vocabulary). */
  named: { kind: NamedThingKind; id: string | null; year: number | null };
  /**
   * Every named thing in order, with its ledger kind: tip_safe (id: tip), visit (id: place),
   * pledge_kept, pledge_broken (id: strand), debt, repairs, neglect (id: region), card (id: card),
   * arrival (id: card), lost_term, tip (a tip never made safe). Draw a thread from each line to it.
   */
  namedAll?: { kind: string; id: string | null; year: number | null }[];
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
  /**
   * The worst counted term really was a fall (below 2026 or below the term before). When false, do
   * not call it the worst term: say "weakest" or nothing (playtest 2).
   */
  worstFell?: boolean;
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
// Plain scores (v6.0)

/** The two running scores, out of 100 (unrounded: show "about" and a whole number). */
export interface Headline {
  /** Life now: weighted average of the seven flow scores, times ten. At the end, `livedLevel` times ten. */
  lifeNow: number;
  /**
   * Left for 2050: weighted average of the seven stock scores, with cards on their way landed (those
   * arriving by `post_counts_until`, as the end result counts them), less the debt penalty, times ten.
   * At the end, `leftLevel` times ten; in the last turn's results it already equals it.
   */
  left2050: number;
  /** Both in 2026. */
  start: { lifeNow: number; left2050: number };
  /** The game has ended: the values are the end result's own. */
  final: boolean;
}

/** One thing that mattered over the game, for the end screen's "What you did that mattered". */
export interface Mattered {
  kind: "card" | "shock" | "visit" | "promise" | "lost_turn" | "coins_unused";
  /** Card id, curveball id (shock), place id (visit), strand id (promise), or a fixed id. */
  id: string;
  /** Term index (0 = 2026) and its start year. */
  term: number;
  year: number;
  /** Where a card was played (null for national). */
  regions: RegionId[] | null;
  /** For a card: the first year it worked (its first effect), which can be later than `year`. */
  fromYear?: number;
  /** Size in score points out of 100 (signed: negative hurt). Fixed sizes for promises, visits, lost turns and unused coins. */
  size: number;
  /** The goal it moved most (or the promised goal), or null. */
  strand: StrandId | null;
  /** A place visit that shaped a card, or the visit itself. */
  place?: { place: "rhondda" | "bethesda"; grade: Grade };
  /** For a visit: the picks made. */
  picks?: string[];
  /** For a shock: coins spent on it and whether a card had made Wales ready. */
  response?: ShockResponse;
  prepared?: boolean;
  /** For a promise: kept or broken. */
  kept?: boolean;
  /** For coins unused: how many were lost, over how many turns. */
  coins?: number;
  turns?: number;
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

/**
 * One card's own effect in a preview (playtest 3). Every number is a paired marginal: the same runs and
 * draws with the card and without it, so the term's drift is never attributed to a card. Never compute
 * a card's effect as `strands[].eventual - now`: that is the whole plan plus the drift.
 */
export interface CardPreview {
  card: string;
  /** Flow change (what people live) by strand, measured when this card's effects have landed. */
  strands: Record<StrandId, Projection & { delta: number }>;
  /** Stock change (what is handed on) by strand at the same point. */
  stock: Record<StrandId, Projection & { delta: number }>;
  /** Flow change by the end of this term only. */
  thisTerm: Record<StrandId, Projection & { delta: number }>;
  /** Strands where the card really moves flow or stock (a twentieth of a point or more); show only these. */
  real: StrandId[];
  /** Nothing visible this term: say "Nothing this term. Lands {landsYear}: ...". */
  nothingThisTerm: boolean;
  /** When the first effects land, and when it has landed in full (`Card.arrival`). */
  firstTerm: number;
  firstYear: number;
  landsInTerm: number;
  landsYear: number;
  /** Lands after 2050: "Lands after 2050: counts in Left". */
  landsAfterGame: boolean;
  /**
   * The card delivers nothing by itself and only enables or multiplies other cards (Regional compact).
   * When `real` is empty say so ("works through other cards"); `nothingThisTerm` and `landsAfterGame`
   * are then false. When cards it enables are in the plan, `real` holds what it adds to them.
   */
  needsPartner?: boolean;
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
  perCard: CardPreview[];
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

/** A place board as it stands this term, with `termConditions` (trends changing it now). */
export function placeBoard(model: CompiledModel, state: GameState, place: "rhondda" | "bethesda"): PlaceBoard {
  return impl.placeBoard(model, state, place);
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

/** The two running scores out of 100 (v6.0, plain-wales E1). */
export function headline(model: CompiledModel, state: GameState): Headline {
  return impl.headline(model, state);
}

/** The largest causes across the game, largest first (v6.0, plain-wales E3). Default limit 3. */
export function whatMattered(model: CompiledModel, state: GameState, limit?: number): Mattered[] {
  return impl.whatMattered(model, state, limit);
}

/**
 * Coins left unspent and lost over the game (not used by a crisis, not carried over) that the player
 * could have used. `forced` counts the coins lost in turns where no more cards could be played and
 * saving could not keep them: those are not the player's doing and are left out of `coins`.
 */
export function unusedCoins(model: CompiledModel, state: GameState): { coins: number; turns: number; firstTerm: number; perTurn: number[]; forced: number } {
  return impl.unusedCoins(state, model.game.contingency_carry);
}

/** Whether a plan can play no more cards: Trust's card limit ("limit"), or every card left costs too much ("price"). */
export function cardsCapped(model: CompiledModel, state: GameState, plays: Plays): "limit" | "price" | null {
  return impl.cardsCapped(model, state, plays);
}

/** Raised for illegal actions or unreadable saves. `code` is stable for i18n. */
export { EngineError } from "./errors";
export { promiseHelpersOf, promiseHelpable, type PromiseHelpers } from "./promise";
export { trustDirection, topReasons } from "./trust";
