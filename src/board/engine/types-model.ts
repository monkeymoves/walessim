/**
 * The board model, part 1: ids, text, councils, indicators, bands, links, rule cards and the
 * game calendar. Frozen by package 0 (docs/design/v2-board.md section 14.1). Import these
 * through `./types` (engine) or `./api` (UI), never this file directly.
 *
 * Conventions:
 * - Plain data only, so the whole model and every state are JSON.
 * - Every player string is a `Text`; machine Welsh carries `cy_review: true`.
 * - Measures are scores 0 to 10, higher is better. Shares are percentages (0 to 100).
 * - Time runs in steps of `game.years_per_step` (a quarter of a year). Step 0 is May 2026 and
 *   the game ends on arriving at step `game.steps` (May 2050). Only time.ts turns years into steps.
 * - Rates are per year (`*_per_year`), durations are in years (`*_years`): never per turn.
 * - Rule numbers that change balance are rule card params (`BoardRule.params`), never code.
 */
import type { Condition } from "./types-content";

/** A bilingual string. `cy_review: true` marks a Welsh draft awaiting a fluent reviewer. */
export interface Text {
  en: string;
  cy: string;
  cy_review?: boolean;
}

export type Lang = "en" | "cy";

/** ONS code of one of the 22 councils, e.g. "W06000015" (Cardiff). */
export type CouncilCode = string;
/** An off-board place at the edge of the map: "stub:" plus a slug, e.g. "stub:powys". */
export type StubId = string;
/** Either end of a link: a council in play or a stub. */
export type NodeId = CouncilCode | StubId;
/** Id of a column in model/data/la-indicators.json, e.g. "employment". */
export type IndicatorId = string;
/** Id of a source in model/sources.yaml. */
export type SourceId = string;
/** Rule card id: "S1" to "S4" spread, "B" budget, "P" people, "G" score, "E" events, "R" growth, "need:" requires cards. */
export type RuleId = string;
export type LinkId = string;
export type ProjectId = string;
export type BranchId = string;
export type PairId = string;
export type LawId = string;
export type GroupId = string;
export type EventId = string;
export type FutureId = string;
export type StartId = string;
export type EndingId = string;
export type LetterId = string;
export type PlaceId = string;

/** The six council measures. Player names in model/i18n board.json `measure.*`. */
export type MeasureId = "work" | "homes" | "health" | "nature" | "welsh" | "climate";
/** Display order: Work and pay, Homes and community, Health, Nature and floods, Welsh and culture, Climate. */
export const MEASURE_IDS: readonly MeasureId[] = ["work", "homes", "health", "nature", "welsh", "climate"];

/** Three real kinds of link (section 4.2). Housing pressure rides commute links in reverse. */
export type LinkKind = "commute" | "rail" | "river";
export const LINK_KINDS: readonly LinkKind[] = ["commute", "rail", "river"];

/** The three council risks, each a step (section 4.1). */
export type RiskKind = "flood" | "tip" | "employer";
export const RISK_KINDS: readonly RiskKind[] = ["flood", "tip", "employer"];
/** Seeds are 1 to 3. 0 means the risk has been dealt with (for example every tip made safe). */
export type RiskStep = 0 | 1 | 2 | 3;

export type Level = 1 | 2 | 3;
export type Tier = 1 | 2 | 3;
/** Link quality: 1 as now, 2 frequent, 3 fast and frequent (rail links only). */
export type LinkQuality = 1 | 2 | 3;

/** A place visit grade, as v1. Player sees badly, OK, well, very well. */
export type Grade = "poorly" | "adequately" | "well" | "very_well";
export const GRADES: readonly Grade[] = ["poorly", "adequately", "well", "very_well"];

/**
 * The honesty label on every figure (section 10). `illustrative` is for fixture and placeholder
 * values only and must never reach a real build's player screens without the word "illustrative".
 */
export type Honesty = "real" | "game_estimate" | "game_rule" | "illustrative";

export type Confidence = "high" | "medium" | "low";
export type EvidenceGrade = "assessed" | "published" | "expert" | "placeholder";

/** Council flags, as v1 `model/authorities.yaml`. */
export type CouncilFlag = "coal_valley" | "valley" | "city" | "coast" | "port" | "rural" | "heartland" | "slate" | "off_gas";

/** What a council has that a project can need (derived at build from flags and links). */
export type CouncilFeature = "rail" | "river" | "coal_tips" | "coast" | "city" | "port" | "valley";

// ---------------------------------------------------------------------------
// Sources, indicators, measures, bands

/** One source, copied at build from model/sources.yaml for the ids the board uses. */
export interface BoardSource {
  id: SourceId;
  title: string | Text;
  publisher?: string;
  url?: string;
  licence?: string;
  year?: string | number;
  note?: string | Text;
}

/** One real indicator used to seed a measure or a quantity. */
export interface IndicatorDef {
  id: IndicatorId;
  name: Text;
  unit: Text;
  /** The period of the figure, as in la-indicators.json, e.g. "2025" or "Jul 2025 to Jun 2026". */
  year: string;
  source: SourceId;
  /** null for indicators with no direction (population). */
  higher_is_better: boolean | null;
}

/** model/board/measures.yaml: what seeds each measure. */
export interface MeasureDef {
  id: MeasureId;
  name: Text;
  /** One plain line for the council panel tooltip. */
  note: Text;
  /** Indicators whose 0 to 10 scores are averaged (plain mean) to seed the 2026 score. */
  indicators: IndicatorId[];
}

/**
 * A reference band: score = 10 * (value - floor) / (goal - floor), clamped 0 to 10.
 * `origin: "v1"` copies model/bands.yaml. `origin: "board"` is the board rule: lowest and highest
 * of the 22 councils pushed out by a tenth, player label "compared with the rest of Wales".
 */
export interface BoardBand {
  floor: number;
  goal: number;
  higher_is_better: boolean;
  origin: "v1" | "board";
  source: SourceId;
}

// ---------------------------------------------------------------------------
// Councils, stubs, links

export interface CouncilDef {
  code: CouncilCode;
  name: Text;
  flags: CouncilFlag[];
  features: CouncilFeature[];
  /** One or two towns for letters and evidence lines. */
  towns: Text[];
  /** Real 2026 era values by indicator id (all of MeasureDef.indicators plus pop, young_adults, age65). */
  real: Record<IndicatorId, number>;
  /** Centre in the km frame of CLAUDE.md, for labels and pulses. */
  centre: [number, number];
}

/** A place off the board (another council, Bristol, England) shown as a stub at the map edge. */
export interface StubDef {
  id: StubId;
  name: Text;
  centre: [number, number];
}

/**
 * One link. Direction matters:
 * - commute: `from` is where workers live, `to` is where they work; `share` is the real share of
 *   `from`'s resident workers who work in `to` (0 to 1), or a fallback `strength` step.
 * - rail: `from` and `to` are neighbours along `line`, in line order; quality is undirected.
 * - river: `from` is upstream of `to` on `river`.
 */
export interface LinkDef {
  id: LinkId;
  kind: LinkKind;
  from: NodeId;
  to: NodeId;
  share?: number;
  /** Commute fallback (section 4.2): 1 to 3 from jobs_density, a game estimate. */
  strength?: 1 | 2 | 3;
  /** Rail line or river name. */
  name?: Text;
  /** Rail only: quality in 2026 (default 1). */
  quality?: LinkQuality;
  /** True when one end is a stub: fixed outside flow, cannot be built on. */
  outside?: boolean;
  honesty: Honesty;
  sources: SourceId[];
  /** True until the data agent has checked the row against its source. */
  to_check?: boolean;
}

// ---------------------------------------------------------------------------
// Rule cards (ADR 0002 plus ADR 0005)

/** ADR 0002 kinds the board uses, plus `spread` and `requires` from ADR 0005. */
export type BoardRuleKind = "linear" | "saturating" | "stock" | "threshold" | "spread" | "requires";
export type RuleTheme = "spread" | "budget" | "people" | "projects" | "events" | "score" | "growth";

export interface BoardParam {
  default: number;
  min: number;
  max: number;
  unit: Text;
  adjustable: boolean;
  /** Marked (tune) in the design: set by the balance bots. */
  tune?: boolean;
  placeholder?: boolean;
}

/** What a quantity on a council can be, as a rule input or output. */
export type CouncilQuantity = MeasureId | "young_adults" | "backing" | "risk_flood" | "risk_tip" | "risk_employer";

/**
 * A `spread` rule (ADR 0005): a change at one end of a link moves a quantity at the other end,
 * one hop only, `lag_years` later.
 * - `travel`: "to_home" runs from the work end to the home end of a commute link (S1, S2);
 *   "towards_better" moves people from the lower to the higher end (S3); "downstream" (S4).
 * - `weight`: what each link contributes: the commute share, the fallback strength step, or 1.
 * - `blocked_by_tags`: project tags at the receiving council that block the rule there (S2 by homes).
 * - `only_from_projects`: only changes caused by projects count as input (S1: new jobs).
 */
export interface SpreadSpec {
  links: LinkKind[];
  travel: "to_home" | "to_work" | "towards_better" | "downstream" | "both_ways";
  input: CouncilQuantity;
  output: CouncilQuantity;
  sign: 1 | -1;
  weight: "share" | "strength" | "one";
  quality_multiplies: boolean;
  /** Years between the change and its echo (S4: 2). Informational: S4 lands through effects' `after_years`. */
  lag_years: number;
  blocked_by_tags?: string[];
  only_from_projects?: boolean;
}

/** A `requires` rule (ADR 0005): something must stand before a project, tier or level is open. */
export interface RequiresSpec {
  applies_to: { project?: ProjectId; branch?: BranchId; tier?: Tier; level?: Level };
  /** All must hold. Condition is defined in types-content.ts. */
  needs: Condition[];
}

/** One rule card under model/board/rules/, or generated at build from tree and project needs. */
export interface BoardRule {
  id: RuleId;
  theme: RuleTheme;
  name: Text;
  /** One plain sentence, the last line of every Why? that ends here. */
  note: Text;
  kind: BoardRuleKind;
  params: Record<string, BoardParam>;
  /** Years between cause and effect, shown in the rule book. */
  lag_years?: number;
  sources: SourceId[];
  confidence: Confidence;
  evidence: EvidenceGrade;
  /** True for a design choice with no evidence behind its size (player label "game rule"). */
  game_rule: boolean;
  spread?: SpreadSpec;
  requires?: RequiresSpec;
}

/**
 * Rule ids the engine reads by name, and their params. Content may add rules; the phase 1 ids must
 * exist. Params named here are the contract between model/board/rules/*.yaml and the engine.
 * Every rate is per year and every span is in years (ADR 0007); time.ts turns them into steps.
 *
 * The phase 2 cards (R1 to R4, E2, P6) are switched on one card at a time (docs/design/v2-board.md
 * section 16.7): a model without the card behaves as before. Read them with `optParam` or
 * `ruleParam`, never `param`, until the card is in every model.
 */
export const RULE_IDS = {
  /** spread: coef (share multiplier), quality_step (extra per quality step above 1). */
  jobsTravelHome: "S1",
  /** spread: coef. */
  pricesUpTheLine: "S2",
  /** spread: max_per_year (percentage points of young adults that can move on one link a year), pull_per_year (per point of gap). */
  youngFollowWork: "S3",
  /** spread: steps (flood steps cut downstream), storm_weaken (severity cut per project upstream). */
  waterRunsDownhill: "S4",
  /** linear: base_per_year, growth_per_year (for each per_work_points of Work and pay gained), per_work_points, carry_max. */
  coins: "B1",
  /** stock: care_bill_per_year, from_year, hubs_needed. */
  careBill: "B2",
  /** stock: memory_per_year (0 to 1, the share of a mood kept over a year), compare_years, pull. */
  moods: "P1",
  /** linear: start (backing in 2026), start_nudge. */
  backingStart: "P2",
  /** threshold: years (passed over after), loss_per_year (backing lost a year). */
  passedOver: "P3",
  /** threshold: backs_at, win_share, strong_share. */
  election: "P4",
  /** linear: base_weight (the Everyone group, a game rule). */
  everyone: "P5",
  /** linear: fairness_share (part of each score from the lowest councils), lowest_count, future_years. */
  score: "G1",
  /** threshold: min, max (outside event severity points per game), first_year, warn_years. */
  severity: "E1",
  /** Phase 2 (16.3.2), package 8: grow_alone_per_year, grow_joined_per_year, max_factor. */
  roots: "R1",
  /** Phase 2 (16.3.3), package 8: rise_at, slip_at, settle_band, pull_points, roots_bonus, backing_per_year, coins_per_year. */
  momentum: "R2",
  /** Phase 2 (16.4), package 8: discount, joined_years. */
  freshStart: "R3",
  /** Phase 2 (16.3.2), package 8: the need factor from the real 2026 seed. */
  need: "R4",
  /** Phase 2 (16.4), package 9: after an event of severity 2 or more, builds there take half the time for `years`. */
  rebuild: "E2",
  /** Phase 2 (16.4), package 9: a lost election is a deal (deal_years, deal_discount, kept_here, kept_near, broken_here, broken_years). Replaces B3. */
  hungTerm: "P6",
  /** Playtest 10 (must-fix 4): points, years (backing for a new project that lifts what a council asks for, fading), asked_count. */
  answered: "P7",
} as const;

/** The phase 2 cards: optional until they are in every model. Every other id in RULE_IDS must exist. */
export const OPTIONAL_RULE_IDS: readonly RuleId[] = [
  RULE_IDS.roots, RULE_IDS.momentum, RULE_IDS.freshStart, RULE_IDS.need, RULE_IDS.rebuild, RULE_IDS.hungTerm, RULE_IDS.answered,
];

/** Rule ids every board model must carry. */
export const REQUIRED_RULE_IDS: readonly RuleId[] = Object.values(RULE_IDS).filter((id) => !OPTIONAL_RULE_IDS.includes(id));

