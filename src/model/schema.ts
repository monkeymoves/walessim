/**
 * The shared types of the model: every YAML and JSON file under `model/`, and the
 * compiled `public/model.json` that the build script writes and the browser loads.
 *
 * This is the only file that knows the model formats (CLAUDE.md). The engine
 * (`src/engine/`) reads a `CompiledModel`; the UI reads the same object for names,
 * sources and the model book. Plain data only: no functions, no classes, so the
 * whole model is JSON.
 *
 * Conventions used throughout:
 * - Every user-facing string is a `Text` ({en, cy}); machine-drafted Welsh carries
 *   `cy_review: true` until a fluent speaker has checked it.
 * - Every quantity the engine moves is a "component" scored 0 to 10, higher is better
 *   (indicators where lower is better are inverted by their band). Effect sizes are in
 *   these points: S, M and L (see `GameTuning.sizes`).
 * - Ids are kebab-case for cards, curveballs and places, snake_case for components
 *   and indicators, `R01` style for rules, `W06000001` style ONS codes for authorities.
 */

// ---------------------------------------------------------------------------
// Text and small shared types

/** A bilingual string. `cy_review: true` marks a machine draft awaiting a fluent reviewer. */
export interface Text {
  en: string;
  cy: string;
  cy_review?: boolean;
}

/** The two interface languages. */
export type Lang = "en" | "cy";

/** The seven strands (well-being goals). Fixed for v1. */
export type StrandId = "prosperous" | "resilient" | "healthier" | "equal" | "cohesive" | "culture" | "global";

/** All strand ids in display order. */
export const STRAND_IDS: readonly StrandId[] = ["prosperous", "resilient", "healthier", "equal", "cohesive", "culture", "global"];

/** The four regions (Corporate Joint Committee areas). */
export type RegionId = "north" | "mid" | "southwest" | "southeast";

/** All region ids in display order. */
export const REGION_IDS: readonly RegionId[] = ["north", "mid", "southwest", "southeast"];

/** How sure the evidence is. */
export type Confidence = "high" | "medium" | "low";

/** Where the evidence comes from: assessed (SoNaRR, official statistics), published, expert judgement, or a placeholder. */
export type EvidenceGrade = "assessed" | "published" | "expert" | "placeholder";

/** Card and curveball effect sizes, in indicator points on the 0 to 10 scale (values in `GameTuning.sizes`). */
export type Size = "S" | "M" | "L";

// ---------------------------------------------------------------------------
// Sources and indicators (model/sources.yaml, model/sources-extra.yaml, model/indicators.yaml)

/**
 * A source card. Written by the data agent in `model/sources.yaml`; the engine lead adds
 * any extra sources needed by rules in `model/sources-extra.yaml`. Unknown extra fields
 * are kept as they are.
 */
export interface Source {
  id: string;
  /** Title of the publication or dataset. Plain string or bilingual. */
  title: string | Text;
  publisher?: string;
  url?: string;
  licence?: string;
  year?: string | number;
  /** Free notes (caveats, what it is used for). */
  note?: string | Text;
  /** True for sources added by the engine lead in sources-extra.yaml. */
  extra?: boolean;
  [key: string]: unknown;
}

/** One real measured quantity per authority, as described in `model/indicators.yaml`. */
export interface Indicator {
  id: string;
  name: Text;
  /** Unit label, e.g. "%" or {en: "years", cy: "blynyddoedd"}. */
  unit?: string | Text;
  /** True if a higher raw value is better (the band inverts otherwise). */
  higher_is_better?: boolean;
  /** Source id(s) in sources.yaml. */
  source?: string | string[];
  sources?: string[];
  year?: string | number;
  [key: string]: unknown;
}

/**
 * A reference band (model/bands.yaml): raw value `floor` scores 0, `goal` scores 10.
 * Score = 10 * (value - floor) / (goal - floor), clamped. When lower is better, the data
 * agent writes floor above goal (or sets `invert: true`); both work.
 */
export interface Band {
  indicator: string;
  floor: number;
  goal: number;
  invert?: boolean;
  source?: string | string[];
  sources?: string[];
  note?: string | Text;
  [key: string]: unknown;
}

/** model/data/la-indicators.json, as written by pipeline/fetch_la_indicators.py. */
export interface LaIndicatorFile {
  generated?: string;
  indicators: Record<string, { year: string; values: Record<string, number> }>;
}

// ---------------------------------------------------------------------------
// Authorities and regions (model/regions.yaml, model/authorities.yaml)

/** Flags that card and curveball effects can target. */
export type LaFlag =
  | "coal_valley" // the Rhondda place type: RCT, Merthyr, Blaenau Gwent, Caerphilly, Torfaen, NPT, Bridgend
  | "slate" // the Bethesda place type: Gwynedd, Anglesey, Conwy, Ceredigion, Carmarthenshire
  | "heartland" // Welsh-speaking heartland: Gwynedd, Anglesey, Ceredigion, Carmarthenshire
  | "rural"
  | "valley"
  | "port"
  | "city"
  | "coast"
  | "off_gas"
  | "worst5"; // assigned at game start: the five authorities with the highest deprivation

export interface Region {
  id: RegionId;
  name: Text;
  /** ONS codes of the authorities in the region. */
  authorities: string[];
}

export interface Authority {
  /** ONS code, e.g. W06000016. */
  code: string;
  name: Text;
  region: RegionId;
  flags: LaFlag[];
  /** Population used for weighting; from la-indicators `pop` when present, else this fallback. */
  population: number;
  /** One or two towns for voices and letters. */
  towns: Text[];
}

// ---------------------------------------------------------------------------
// Components and strands (model/strands.yaml)

/**
 * How a component's Wales value is formed from its 22 authority scores.
 * - `pop`: population-weighted mean.
 * - `mean`: unweighted mean (every place counts once).
 * - `heartland`: unweighted mean over `heartland` authorities only.
 * - `gap`: `initial` + gap_scale * (2026 gap - gap now), where the gap is the score of the median
 *   authority minus the mean of the five worst-off on `of` (another component); the median and worst
 *   five are fixed at game start.
 */
export type Aggregate = "pop" | "mean" | "heartland" | "gap";

/**
 * A quantity the engine moves, scored 0 to 10 per authority (higher is better).
 * Flow components say how people are faring now (feed Lived); stock components say what is
 * handed on (feed Left).
 */
export interface Component {
  id: string;
  name: Text;
  /** Plain words: what this stands for and how it is measured. */
  note: Text;
  role: "flow" | "stock";
  aggregate: Aggregate;
  /** For `gap`: the component whose gap is measured. */
  of?: string;
  /** Indicator id whose 2026 values, through its band, give the starting scores. */
  indicator?: string;
  /** Starting score used when there is no indicator, or the dataset is missing (marked illustrative). */
  initial: number;
  /** Optional per-flag starting score override (e.g. tip_liability lower in coal valleys). */
  initial_by_flag?: Partial<Record<LaFlag, number>>;
  /** True when the starting value is illustrative, not data. Shown as such. */
  illustrative?: boolean;
  /** Source ids for the starting value (when not from an indicator). */
  sources?: string[];
}

/** One strand: seven per game. */
export interface Strand {
  id: StrandId;
  name: Text;
  /** One-line description of the goal. */
  description: Text;
  /** Design token name for the strand colour (docs/design/tokens.css). */
  colour: string;
  /** Component ids averaged for the flow score (Lived). */
  flow: string[];
  /** Component ids averaged for the stock score (Left). */
  stock: string[];
  /** Expected 2026 flow pips from the design (acceptance check). */
  expected_2026: number;
}

// ---------------------------------------------------------------------------
// Rules (model/rules/*.yaml), the fixed kinds of ADR 0002

/** A rule kind. A new kind needs an ADR. */
export type RuleKind = "linear" | "saturating" | "stock" | "threshold" | "fcm" | "io";

/** One adjustable number on a rule. The engine samples uniformly in [min, max] for uncertainty runs. */
export interface Param {
  default: number;
  min: number;
  max: number;
  unit: Text;
  /** False for fixed numbers (game rules, exact accumulations). */
  adjustable: boolean;
  /** True when this parameter in particular is a placeholder awaiting evidence. */
  placeholder?: boolean;
  /** Marked (tune) in the design: calibrated against the bot tests. */
  tune?: boolean;
}

/**
 * What drives a linear or saturating rule:
 * - `clock`: a fixed amount every term (baseline pressures R01, R02, R05).
 * - `card`: the rule parameterises card or curveball effects that name it (`Effect.rule`).
 *   Its `coef` default equals the effect size; a sampled coef scales the effect by coef/default.
 * - `change`: the output moves by `coef` times the change in `input` over the term `lag` terms ago.
 */
export type Drive = "clock" | "card" | "change";

/**
 * Stock behaviours (kind `stock`):
 * - `decay`: gains above the 2026 value erode by `outflow` (a fraction) each term.
 * - `clock`: the stock moves by `rate` every term (R04 speakers).
 * - `approach_fcm`: moves towards the SoNaRR FCM equilibrium, closing `rate` of the gap each term (R03).
 * - `accumulate`: carbon budget, adds `coef * (input - path)` each term, where path rises in a
 *   straight line to 10 by 2050 (R34).
 * - `card`: inflow only from card effects that name the rule (R11, R19, R32).
 * - `upkeep`: unpaid upkeep or deferred repairs take `coef` from the output (R10).
 * - `debt`: debt tokens (R35): game rule, read by the budget step.
 */
export type StockMode = "decay" | "clock" | "approach_fcm" | "accumulate" | "card" | "upkeep" | "debt";

/**
 * Saturation behaviours (kind `saturating`):
 * - `plays`: each play adds `coef`; after `after_plays` plays the effect halves (R06).
 * - `ceiling`: total contribution from the named cards cannot exceed `ceiling` (R08, R16).
 * - `band_goal`: output cannot pass 10 through this rule (R27).
 * - `repeat`: a card played again within `window` terms of its last play delivers `coef` (R30).
 */
export type SaturateMode = "plays" | "ceiling" | "band_goal" | "repeat";

/**
 * Threshold events (kind `threshold`):
 * - `tip_movement`: in a storm shock, each coal valley authority with unmade tips may see a tip move,
 *   chance by risk step (R12).
 * - `heartland_drop`: a heartland authority's Welsh speaker share falls below `level` (R20).
 * - `employer_leaves`: a fragile employer leaves on a trade or recession shock (R28).
 */
export type ThresholdEvent = "tip_movement" | "heartland_drop" | "employer_leaves";

/** Where an effect or rule applies. All fields are optional filters, intersected. */
export interface Where {
  regions?: RegionId[];
  las?: string[];
  /** Authority must carry at least one of these flags. */
  flags?: LaFlag[];
  /** Authority must carry none of these flags. */
  not_flags?: LaFlag[];
  /** For card effects: also restrict to the card's chosen scope (default true for cards). */
  in_scope?: boolean;
}

/** An emphasis on some authorities ("strongest in the South East valleys"): effect multiplied by `factor` there. */
export interface Emphasis extends Where {
  factor: number;
}

/**
 * One rule card. Renders as a plain sentence and an equation in the model book.
 * Kind-specific fields are optional and validated by the build script.
 */
export interface Rule {
  /** R01 to R35. */
  id: string;
  name: Text;
  /** Plain-words explanation for the model book. */
  note: Text;
  /** Theme file it lives in (people, nature, economy, places, game). */
  theme: string;
  kind: RuleKind;
  /** Component ids (or `fcm:<node>`/`clock`/card ids) read by the rule, for display and tracing. */
  inputs: string[];
  /** Component ids written by the rule. */
  outputs: string[];
  /** Terms between cause and effect. */
  lag: number;
  /** Named parameters. Most rules have `coef`; see each kind. */
  params: Record<string, Param>;
  /** Source ids (sources.yaml or sources-extra.yaml). At least one. */
  sources: string[];
  confidence: Confidence;
  evidence: EvidenceGrade;
  /** P in the design: ships, labelled low confidence, with the placeholder badge in every trace. */
  placeholder: boolean;
  /** Design rule rather than evidence (R30, R35): badged "game rule". */
  game_rule?: boolean;

  // linear / saturating
  drive?: Drive;
  /** For `change` drive: the input component(s); each moves the outputs by `coef` per point. */
  input?: string | string[];
  /** Lag of the `change` behaviour when it differs from `lag` (which then applies to card effects). */
  change_lag?: number;
  /** For `clock` drive: where it applies and where it is strongest. */
  where?: Where;
  emphasis?: Emphasis[];
  /** For `clock` drive: first and last calendar year it applies (inclusive). */
  from_year?: number;
  saturate?: SaturateMode;
  /** For `plays`: number of plays before halving. */
  after_plays?: number;
  /** For `repeat`: window in terms. */
  window?: number;
  /** For `ceiling`: the cards whose contributions share the ceiling. */
  cards?: string[];

  // stock
  stock?: StockMode;

  // threshold
  event?: ThresholdEvent;

  // io
  /** For `io`: last calendar year the medium confidence holds (2034); runs only this term and next. */
  medium_until?: number;
}

// ---------------------------------------------------------------------------
// Effects: shared by cards, standing tickets, curveballs and place options

/**
 * Conditions in a fixed vocabulary (no expression parser):
 * - `needs_partners`: half strength unless `regional-compact` is in force in that region or the
 *   card's place visit was graded well.
 * - `half_if_below`: half strength while the Wales value of `component` is below `value`.
 * - `unless_card_in_scope`: does not apply where the named card has ever been played (same region).
 * - `unless_card_in_force`: does not apply while the named card is in force (played this term or the
 *   previous two terms, or its effect still in the post).
 * - `only_where_below_middle`: applies only in authorities where `component` is below 5.
 * - `if_any_card_in_play` / `if_no_card_in_play`: for curveball branches (power-rush).
 * - `from_year`: applies only from this calendar year.
 * - `if_below`: applies only while the Wales value of `component` is below `value`.
 */
export interface Condition {
  needs_partners?: boolean;
  half_if_below?: { component: string; value: number };
  unless_card_in_scope?: string;
  unless_card_in_force?: string;
  only_where_below_middle?: string;
  if_any_card_in_play?: string[];
  if_no_card_in_play?: string[];
  from_year?: number;
  if_below?: { component: string; value: number };
  /** Half strength unless the named card has been played (any term, any scope). */
  half_without_card?: string;
}

/**
 * One effect of a card, curveball, shock or place option.
 *
 * `target` is a component id, or `fcm:<node id>` (a SoNaRR pressure or driver, moved on the FCM
 * scale where S, M, L are `GameTuning.fcm_sizes`), or one of the special targets
 * `budget` (pips this term), `trust` (points), `card_cost` (pips, while active, for cards with `tag`).
 */
export interface Effect {
  target: string;
  /** Size in points (S, M, L). Negative direction via `sign`. */
  size?: Size;
  /** Exact amount instead of a size (budget, trust, card_cost). */
  amount?: number;
  /** +1 helps the component (raises its score), -1 frays it. */
  sign: 1 | -1;
  /** The rule that parameterises and explains this effect (strongly preferred). */
  rule?: string;
  /** Main effect or side effect. Side effects feed the "Unexpected" slip. */
  side?: boolean;
  /** Terms before it lands. For cards, main effects default to the card's delay; side effects to 0. */
  delay?: number;
  /** If set, the effect is temporary: reversed after this many terms. */
  duration?: number;
  where?: Where;
  emphasis?: Emphasis[];
  condition?: Condition;
  /** For `card_cost`: the card tag it applies to. */
  tag?: string;
  /** Plain words shown on the ticket and in traces. */
  note?: Text;
}

// ---------------------------------------------------------------------------
// Cards and standing tickets (model/cards.yaml)

/**
 * Where a card may be played:
 * - `national`: all of Wales.
 * - `region`: one region chosen by the player, from `regions`.
 * - `national_or_region`: either.
 * - `two_regions`: two regions (regional-compact).
 */
export type CardScope = "national" | "region" | "national_or_region" | "two_regions";

/** Input-output sector tag for the jobs ripple (rule R25). */
export type IoSector = "construction" | "energy" | "care" | "land" | "services" | "manufacturing" | "transport";

export interface Card {
  id: string;
  name: Text;
  description: Text;
  scope: CardScope;
  /** Legal regions (default all four). */
  regions?: RegionId[];
  cost: number;
  delay: number;
  effects: Effect[];
  /** Plain words for side effects, shown on the ticket. */
  side_note?: Text;
  /** Jobs ripple sector (R25); omit for none. */
  sector?: IoSector;
  /** Shows "needs partners" on the ticket. */
  needs_partners?: boolean;
  /** Place visit offered when played. */
  visit?: "rhondda" | "bethesda";
  /** The visit uses one thread fewer (Rhondda board for slow-the-flow and connect-buses-rail). */
  visit_thread_fewer?: boolean;
  /** Confidence of effects that name no rule (sets their spread across runs). Default medium. */
  confidence?: Confidence;
  /** Tags: prevention, cooperation, energy, growth, green, housing, fragile, borrow... */
  tags: string[];
  /** Upkeep pips owed in later terms (connect-buses-rail, build-flood-walls). */
  upkeep?: Upkeep;
  /** Ddoe lesson that upgrades the card in v1.1 (stored and shown greyed). */
  upgraded_by: Text;
  /**
   * Filled by the build: strands this card helps and frays, from every effect it has (direct, one
   * chained rule on, and the jobs ripple for a card with a sector). Every strand a card can move is
   * in `helps`, `frays` or `mixed`, so slips never name a strand the ticket does not show.
   */
  helps?: StrandId[];
  frays?: StrandId[];
  /** Strands it can move either way depending on where it lands (gaps between places: `equal`). */
  mixed?: StrandId[];
  /**
   * Filled by the build: terms after play when the main effects land, first and in full (a rule's lag
   * can hold an effect back past the headline delay). Show "first effects in 1 term, the rest in 2".
   */
  arrival?: { first: number; full: number };
  /** Filled by the build: curveball ids this card is a listed good response to. */
  responds_to?: string[];
}

/** An upkeep obligation minted by a card. Unpaid upkeep applies `lapse` effects. */
export interface Upkeep {
  /** Pips per payment. */
  pips: number;
  /** Pay every `every` terms (1 = each term, 2 = every second term). */
  every: number;
  /** Number of payments (0 = forever, to 2050). */
  times: number;
  /** Effects applied when a payment is skipped. */
  lapse: Effect[];
  /** A skipped payment counts as a broken pledge on this strand. */
  breaks_pledge?: boolean;
  /** For `times` > 0 and lapse: the card's own main effects are reversed. */
  reverses_card?: boolean;
  note: Text;
}

/** A standing ticket in the ledger drawer: no card slot, at most one per term. */
export interface StandingTicket {
  id: "borrow-to-invest" | "defer-maintenance";
  name: Text;
  description: Text;
  /** Budget pips gained this term. */
  budget: number;
  effects: Effect[];
  /** Pips to clear one token (borrow) or repair (defer). */
  clear_cost: number;
  /** Maximum tokens held (borrow: 3). */
  max_tokens?: number;
  side_note: Text;
  upgraded_by: Text;
  rule: string;
}

// ---------------------------------------------------------------------------
// Curveballs (model/curveballs.yaml)

/** Special curveball behaviours that are not plain effects (fixed vocabulary). */
export type CurveballSpecial =
  | "tip_risk_up" // wet-decade: tip movement risk up one step while active
  | "tip_may_move" // storm shock: R12 tip movement check
  | "employers_leave" // recession or trade shock: R28 fragile employers check
  | "heartland_drop" // language shock: R20 threshold check
  | "debt_hurts"; // recession: each debt token adds -1 budget this term

export interface Shock {
  name: Text;
  description: Text;
  /** Effects of the hit (scaled by the response). Temporary ones carry `duration`. */
  effects: Effect[];
  /** Alternative effects chosen by condition (power-rush): first branch whose condition holds. */
  branches?: { condition?: Condition; effects: Effect[]; note: Text }[];
  special?: CurveballSpecial[];
}

export interface Curveball {
  id: string;
  name: Text;
  description: Text;
  /** Horizon-scan trend ids it stands for. */
  trends: string[];
  /** Slow effects, applied every term while active. */
  slow: Effect[];
  slow_special?: CurveballSpecial[];
  /** Where it is felt (plain words for the slip). */
  where_note: Text;
  shock?: Shock;
  /** Horizon-scan trend ids it ripples to (links_out). */
  ripples_to: string[];
  /** Card ids that are good responses (prepare for the shock; tag for hand dealing). */
  responses: string[];
  /** An opportunity rather than a threat (power-rush). */
  opportunity?: boolean;
  /** Enters the pool as a warning card with no slow effect (downturn). */
  warning_only?: boolean;
}

// ---------------------------------------------------------------------------
// Places (model/places/*.yaml): the authored place boards

/** A place board kind. Each has a fixed grading routine in the engine. */
export type BoardKind = "tips_triage" | "threads_tests";

/** A Rhondda tip as the build computes it from model/data/places/rhondda.json (place-analysis). */
export interface TipFacts {
  /** Item id from place-analysis (`tipId`). */
  id: string;
  /** 1-based number, north to south. */
  n: number;
  name: string | null;
  source: string;
  x: number;
  y: number;
  /** Buildings within 1,000 m and at least 10 m lower. */
  buildingsBelow: number;
  residentialHa: number;
  school: boolean;
  rail: boolean;
  station: boolean;
  bus: boolean;
  /** 0, 2 or 3. */
  floodZone: number;
  /** Most deprived tenth below (WIMD rank in the lowest tenth). */
  deprived: boolean;
  wimdRank: number | null;
  /** Edition and size of the index behind `wimdRank` (copied from the board). */
  wimdEdition?: string;
  wimdAreas?: number;
  /** Base movement risk step, 1 to 3 (raised one step by wet-decade, capped at 3). */
  risk: 1 | 2 | 3;
}

/** One of the ten Bethesda options. Contributions are sampled within +/- `spread` per run. */
export interface ThreadOption {
  id: string;
  n: number;
  name: Text;
  catch: Text;
  /** Flags helped, shown on the board. */
  flags: ("homes" | "work" | "iaith" | "visitors" | "river")[];
  /** Terms before it pays. */
  delay: number;
  /** Contributions to the tests' measures. */
  homes: number;
  work: number;
  iaith: number;
  /** Positive adds visitor and lorry pressure; negative relieves it. */
  pressure: number;
  river: number;
  /** Relative uncertainty (0.2 = +/- 20 per cent) for each run. */
  spread: number;
  /** Only works (contributes) if this card is in play this term. */
  requires_card?: string;
  /** Half strength unless this card has been played (any term). */
  half_without_card?: string;
  /** Pressure relief this option gives to another option (option 4 pairs with 7). */
  pairs_with?: { option: string; pressure: number };
  /** In dry-summer trends (hot-summers), the river contribution flips sign. */
  river_flips_in?: string;
  /** Item id(s) in model/data/places/bethesda.json this option is drawn at, if any. */
  data_refs?: string[];
  /** Map position in the km frame, for the board. */
  x?: number;
  y?: number;
}

/** A test on a board. */
export interface BoardTest {
  id: string;
  name: Text;
  description: Text;
}

/** A place board (section 8). */
export interface PlaceBoard {
  id: "rhondda" | "bethesda";
  name: Text;
  kind: BoardKind;
  /** Authority code the place sits in. */
  la: string;
  /** The type of place the grade applies to. */
  applies_to_flag: LaFlag;
  /** Cards that offer this visit; the first is the main trigger. */
  trigger_cards: string[];
  /** Threads to place (3), minus one for `visit_thread_fewer` cards. */
  threads: number;
  prompt: Text;
  why_hard: Text;
  tests: BoardTest[];
  /** Plain words on the data and its confidence. */
  data_note: Text;
  /** Path of the place data under public/data/ (places/rhondda.json). */
  data_file: string;
  confidence: Confidence;
  sources: string[];

  // tips_triage
  /** Filled by the build from the place data. */
  tips?: TipFacts[];
  /** Exposure test: share of risk-weighted homes below that the threads must cover (tune). */
  exposure_share?: number;
  /** WIMD rank at or below which a neighbourhood is in the most deprived tenth. */
  deprived_rank?: number;
  /**
   * The deprivation index edition behind the place data's ranks (the atlas uses a later edition):
   * label every rank with it, e.g. "rank 120 of 1,909 (WIMD 2019)".
   */
  wimd?: { edition: string; areas: number };
  /**
   * How the build sets each tip's base risk step from open proxies: a tip with a landslide record on it
   * is step 2 if it stands `steep_drop_m` above the lowest ground within 1 km with `steep_buildings`
   * below, or has `many_buildings` below; otherwise step 1. Judgement, low confidence.
   */
  risk_rule?: { steep_drop_m: number; steep_buildings: number; many_buildings: number };

  // threads_tests
  options?: ThreadOption[];
  /** Fraction of runs in which a test must hold (0.6). */
  hold_share?: number;
  /** Capacity for the Pwysau test: total pressure must stay at or below this. */
  pressure_capacity?: number;
  /** Minimum totals for Aros (homes, work) and Iaith (iaith), after trend penalties. */
  thresholds?: { homes: number; work: number; iaith: number };
  /** Trend penalties: when the curveball is active, a measure is reduced. */
  trend_penalties?: { curveball: string; measure: "homes" | "work" | "iaith" | "pressure" | "river"; amount: number; note: Text }[];
  /**
   * Other trends that change the board, in words for the board before the player chooses (playtest 4),
   * e.g. the wet decade raising every Rhondda tip a risk step. Bethesda's come from `trend_penalties`.
   */
  term_notes?: { curveball: string; note: Text }[];
  /**
   * Room to spare for a VERY WELL grade (playtest 4), on top of what each test needs to hold.
   * threads_tests: `share`, the share of runs every test must hold in (6 in 10 is enough to hold).
   * tips_triage: `exposure_margin` added to the exposure share needed (scaled like it for fewer
   * threads), `fairness_tips` deprived neighbourhoods covered, and `lifelines_all` every top-risk tip
   * above a school or the railway covered.
   */
  very_well?: { share?: number; exposure_margin?: number; fairness_tips?: number; lifelines_all?: boolean };
}

// ---------------------------------------------------------------------------
// Voices and letters (model/voices.yaml, model/letters.yaml)

/** The event a voice responds to, in priority order (place visit first). */
export type VoiceEvent = "visit" | "shock" | "arrival" | "played" | "strand" | "pledge" | "neglect" | "upkeep_unpaid" | "trend" | "opening";

/** A voice template. Always labelled "Illustrative voice, not a real quote". */
export interface VoiceTemplate {
  id: string;
  event: VoiceEvent;
  /** Filters: any present must match the event. */
  strand?: StrandId;
  direction?: "up" | "down";
  card?: string;
  curveball?: string;
  /** For visit voices. */
  place?: "rhondda" | "bethesda";
  grade?: Grade;
  /** For neglect voices. */
  region?: RegionId;
  /** For pledge voices. */
  kept?: boolean;
  /** For shock voices: the response taken. */
  response?: "ready" | "responded" | "absorbed";
  /**
   * Gates (playtest 2): a voice that names a choice is heard only if that choice was made.
   * `requires_threads`: every listed board item was placed at this place (this visit or earlier).
   * `requires_tests`: the visit's tests came out as listed (test id to held or not).
   * `requires_card`: the card has been played (or, for a shock, made you ready).
   */
  requires_threads?: string[];
  requires_tests?: Record<string, boolean>;
  requires_card?: string;
  /** Optional fixed towns; otherwise the engine picks a town in the most affected authority. */
  towns?: Text[];
  /** Slots: {place}, {year}, {thing}, {direction}, {season}, {who}. */
  text: Text;
}

/** The six letter archetypes. */
export type LetterArchetype = "feast" | "long_winter" | "gift" | "hollow" | "steady" | "uneven";

/** A letter slot: salutation, lived, left, named, signoff. */
export type LetterSlot = "salutation" | "lived" | "left" | "named" | "signoff";

/**
 * A letter archetype with three variants per slot. Slots may use {place}, {year}, {thing},
 * {worst_year}, {lost_year}. The `named` slot has variants per kind of named thing.
 */
export interface LetterTemplate {
  archetype: LetterArchetype;
  title: Text;
  salutation: Text[];
  lived: Text[];
  left: Text[];
  /** Keyed by the kind of named thing: debt, tip, arrival, pledge, lost_term, repairs, neglect, none. */
  named: Partial<Record<NamedThingKind, Text[]>>;
  signoff: Text[];
}

/** The kinds of specific thing a letter can name. */
export type NamedThingKind = "debt" | "tip" | "arrival" | "pledge" | "lost_term" | "repairs" | "neglect" | "none";

// ---------------------------------------------------------------------------
// Game tuning (model/game.yaml): every (tune) number in the design

export interface GameTuning {
  /** Term start years. */
  years: number[];
  end_year: number;
  /** Cards still in the post count in Left if they arrive by this year. */
  post_counts_until: number;
  budget: number;
  /** Unspent contingency carried to next term (pips). */
  contingency_carry: number;
  peek_cost: number;
  hand_size: number;
  first_hand_size: number;
  hold_over: number;
  sizes: Record<Size, number>;
  /** S, M, L on the FCM 0 to 1 scale. */
  fcm_sizes: Record<Size, number>;
  /** Regional cards step their in-region effects up by this many sizes (0 = off). */
  regional_size_step: number;
  /** Grade multipliers. */
  grade_multiplier: Record<Grade, number>;
  /** Uncertainty runs. */
  runs: number;
  preview_runs: number;
  /** Sharp if at least this share of runs agree on the pip. */
  sharp_share: number;
  /** Pip hysteresis: change only when the score passes the half-point by this much. */
  hysteresis: number;
  /** Spread (+/-) used for card effects with no rule, by card confidence. */
  default_spread: Record<Confidence, number>;
  /** Gap scale for `gap` components. */
  gap_scale: number;
  trust: TrustTuning;
  curveballs: {
    new_trend_chance: number;
    shock_chance: number;
    ripple_weight: number;
    ripple_shock_bonus: number;
    /** Slow trend effects apply every term at this fraction of their size. */
    slow_scale: number;
    /** Shock effects apply at this fraction of their size (before the response). */
    shock_scale: number;
    first_game_order: string[];
    first_game_shock: { term: number; curveball: string };
    first_trend: string;
  };
  response_multiplier: { absorb: number; respond1: number; respond2: number; prepared: number };
  /** Shocks hit this much harder while infrastructure_condition is below `fragile_below`. */
  fragile_infrastructure: { below: number; multiplier: number };
  debt: { interest: number; clear_cost: number; max_tokens: number; left_penalty: number; left_penalty_cap: number };
  /**
   * `return_trust_max` (playtest 4): Trust after a caretaker term is at most this, so a shadow pledge
   * cannot bring the seat back above Thin.
   */
  caretaker: { return_trust: number; return_budget_penalty: number; contingency: number; shadow_pledge_bonus: number; return_trust_max?: number };
  /** Deprecated (level-based Lived, before decision 14); kept optional for older model files. */
  lived?: { mean_weight: number; min_weight: number };
  /** The result bands. Since decision 14 the build copies `judged_change.bands` here (net strand pips). */
  result_bands: { min: number; name: Text }[];
  /** Deprecated (level-based letter bands); use `judged_change.letter_bands`. */
  letter_bands?: { low: number; high: number };
  /**
   * How the result is judged (balance decision 14): the change since 2026 in net strand pips
   * (seven times the weighted change), Lived over terms `lived_first_term` to 6 less `dip_weight`
   * times any fall below the 2026 start, Left as the change in stock level.
   */
  judged_change: JudgedChange;
}

/** The judged-change settings (model/game.yaml `judged_change`). */
export interface JudgedChange {
  /** First term counted in Lived, 1-based (2: the first term is inherited). */
  lived_first_term: number;
  /** Share of the deepest fall of a counted term below the 2026 start taken off Lived. */
  dip_weight: number;
  /** Result bands by net strand pips; the last entry whose `min` is at or below the value. */
  bands: { min: number; name: Text }[];
  /** Letter levels: below `low` is low, at or above `high` is high (net strand pips). */
  letter_bands: { low: number; high: number };
}

export interface TrustTuning {
  start: number;
  clamp: number;
  drift_to: number;
  drift: number;
  bands: { id: TrustBand; min: number; cards: number; label: Text }[];
  pip_gained: number;
  pip_gained_cap: number;
  pip_gained_strands: StrandId[];
  pip_lost: number;
  promise_kept: number;
  promise_kept_cap: number;
  pledge_kept: number;
  pledge_broken: number;
  gap_narrowed: number;
  gap_widened: number;
  /** Gap change (points) below which neither applies. */
  gap_tolerance: number;
  shock_prepared: number;
  shock_responded: number;
  shock_absorbed: number;
  visit: Record<Grade, number>;
  neglect: number;
  /** National cards count as reaching every region for the neglect test. */
  national_counts_for_neglect: boolean;
  /** The neglect rule in words, for the model book (decision 15). */
  neglect_note?: Text;
  debt_interest: number;
  /** Per deferred repair from an earlier term still not done, each term (playtest 1). */
  repairs_overdue?: number;
  /** End of the first term: Trust is not taken below this (the guided term cannot cost a card slot). */
  first_term_floor?: number;
  nothing_visible: number;
}

/**
 * Place delivery grades. `very_well` (playtest 4): every test held with room to spare (the margins are
 * the board's `very_well` block); it counts as a good visit wherever `well` does.
 */
export type Grade = "poorly" | "adequately" | "well" | "very_well";

/** Grades in order, worst first. */
export const GRADE_ORDER: readonly Grade[] = ["poorly", "adequately", "well", "very_well"];

/** A good visit: well or very well (runs itself after two, partners count as found). */
export const isGoodGrade = (g: Grade | null | undefined): boolean => g === "well" || g === "very_well";

/** Trust bands. */
export type TrustBand = "strong" | "fair" | "thin" | "collapsed";

// ---------------------------------------------------------------------------
// SoNaRR FCM and input-output data (model/data/*.json, copied into the compiled model)

export interface FcmNode {
  id: string;
  label: string;
  kind: "driver" | "pressure" | "state_ecosystem" | "state_resource" | "service";
  initial: number;
  [key: string]: unknown;
}

export interface FcmEdge {
  source: string;
  target: string;
  sign: number;
  weight: number;
  confidence: number;
  kind: string;
  [key: string]: unknown;
}

export interface FcmGraph {
  meta?: Record<string, unknown>;
  nodes: FcmNode[];
  edges: FcmEdge[];
}

/** The jobs ripple bands (R25) derived from model/data/io-multipliers.json at build. */
export interface IoSectorBand {
  sector: IoSector;
  /** Industry ids from the IO table behind this sector. */
  industries: string[];
  /** Type II employment effect (FTE per GBP 1m), mean of the industries. */
  emp_effect: number;
  /** Band 1, 2 or 3 (low, middle, high), giving 0.2, 0.4, 0.6 points per pip. */
  band: 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// The compiled model (public/model.json)

export interface ModelMeta {
  /** Schema version of model.json. */
  version: number;
  built: string;
  /** Hash of the default rule set; saves and shares carry it. */
  hash: string;
  /** Datasets that were missing when built (the engine falls back to illustrative starts). */
  missing: string[];
  warnings: string[];
  /** Welsh strings still marked cy_review, as "file:id" entries. */
  cy_review: string[];
}

/**
 * Everything the engine and UI need, in one JSON object. Built by `scripts/build-model.ts`
 * from `model/`, loaded in the browser by `src/model/load.ts`.
 */
export interface CompiledModel {
  meta: ModelMeta;
  sources: Source[];
  indicators: Indicator[];
  bands: Band[];
  regions: Region[];
  authorities: Authority[];
  /** Raw 2026 values: indicator id to authority code to value (plus W92000004 for Wales). */
  la_data: Record<string, { year: string; values: Record<string, number> }>;
  components: Component[];
  strands: Strand[];
  rules: Rule[];
  cards: Card[];
  standing: StandingTicket[];
  curveballs: Curveball[];
  places: PlaceBoard[];
  voices: VoiceTemplate[];
  letters: LetterTemplate[];
  /** Who-slot fillers for voices ("a bus driver"). */
  voice_who: Text[];
  voice_seasons: Text[];
  fcm: FcmGraph;
  io: IoSectorBand[];
  game: GameTuning;
  /**
   * Engine-rendered copy (model/i18n/{en,cy}/engine.json): visit explanations, letter ledger lines,
   * rule sentences. Keys `engine.*`; values may hold {slots} that the engine fills (with Welsh
   * mutation after the word before the slot).
   */
  engine_text?: Record<string, Text>;
}
