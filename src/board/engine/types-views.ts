/**
 * What the API returns to the UI: options, previews, reports, Why?, forecasts, council and
 * election views, the ending. Read only views, recomputed from model and state.
 */
import type {
  BranchId, CouncilCode, CouncilFlag, EndingId, EventId, Grade, GroupId, Honesty, IndicatorId, LetterId, LinkId,
  LinkKind, LinkQuality, MeasureId, NodeId, PlaceId, ProjectId, RiskKind, RiskStep, RuleId, SourceId, Text, Tier,
} from "./types-model";
import type { Condition } from "./types-content";
import type { Action, Cause, Contribution, ElectionResult, Frame, ProjectState, Say, WhyQuantity } from "./types-state";
import type { Deal, Momentum, Story } from "./types-clock";

// ---------------------------------------------------------------------------
// Options and previews

/** Why an action cannot be taken now. */
export type Blocker =
  | { kind: "coins"; need: number; have: number }
  /**
   * A condition that does not hold, and the `requires` (or other) rule card that sets it. For a
   * `project` condition with `at_least`, `have` is how many match now (a gate's "1 of 2").
   */
  | { kind: "needs"; condition: Condition; rule: RuleId; have?: number }
  | { kind: "already_here" }
  /** One of each keystone a game (sections 5.3 and 16.3.5): this one stands or is being built somewhere. */
  | { kind: "one_keystone" }
  | { kind: "max_level" }
  /** A project still being built cannot be made bigger until it works (from the step after `readyStep`). */
  | { kind: "still_building"; readyStep: number }
  /** A keystone started now would not be finished by 2050. */
  | { kind: "too_late"; lastStep: number }
  | { kind: "law_changes_used" }
  | { kind: "phase"; phase: string }
  | { kind: "not_offered" };

export interface ActionOption {
  action: Action;
  allowed: boolean;
  blockers: Blocker[];
  /** Coins it costs now (0 for laws, free projects and visits). */
  cost: number;
  /** For builds and upgrades: years to build, the step at whose end it starts working, and that year. */
  buildYears?: number;
  readyStep?: number;
  readyYear?: number;
  project?: ProjectId;
  branch?: BranchId;
  tier?: Tier;
}

/** One expected change from an action, at "about" precision. */
export interface PreviewChange {
  council: CouncilCode;
  quantity: WhyQuantity;
  delta: number;
  /** The year it is expected to be felt. */
  year: number;
  rule: RuleId;
  via?: { link: LinkId; from: NodeId };
}

export interface Preview {
  action: Action;
  allowed: boolean;
  blockers: Blocker[];
  cost: number;
  coinsAfter: number;
  changes: PreviewChange[];
  /** Links that light up on the map. */
  links: LinkId[];
  /** Councils the effect reaches (including the site). */
  councils: CouncilCode[];
  /** Pairs it completes or breaks, side effects to warn about. */
  notes: Say[];
}

// ---------------------------------------------------------------------------
// Why?

/**
 * One reason behind a change: a council, a quantity, when, the size, the first cause, the link
 * it travelled, and the rule card it ends at. `why()` returns them largest first.
 */
export interface Why {
  council: CouncilCode | null;
  quantity: WhyQuantity;
  /** The first step in the span it happened in. */
  step: number;
  /** The calendar year of that step. */
  year: number;
  delta: number;
  cause: Cause;
  via?: { link: LinkId; from: NodeId; kind: LinkKind };
  rule: RuleId;
  /** The plain sentence: the rule's note, filled. */
  say: Say;
  honesty: Honesty;
  sources: SourceId[];
  /** The raw records summed into this reason. */
  parts: Contribution[];
}

/** A Why? asks about a span of steps, inclusive: the UI offers this year, this term and since 2026. */
export interface WhyTarget {
  council?: CouncilCode;
  measure: WhyQuantity;
  fromStep: number;
  toStep: number;
}

// ---------------------------------------------------------------------------
// Steps, stops, reports and the forecast

/** One line of a year or term report: a council and a cause, with its Why?. */
export interface ReportLine {
  council: CouncilCode | null;
  quantity: WhyQuantity;
  delta: number;
  say: Say;
  why: Why;
}

/** Coins in one step. `income` includes coin effects; `charges` the care bill and other charges. */
export interface CoinsReport {
  before: number;
  income: number;
  running: number;
  charges: number;
  after: number;
  /** Coins not paid this step because the purse was full (B1 `purse_max`). Always set by the engine. */
  lost?: number;
}

export interface ForecastWarning {
  event: EventId;
  name: Text;
  say: Say;
  /** The warned window, inclusive. */
  fromStep: number;
  toStep: number;
  /** Target first, then the others most at risk. */
  councils: CouncilCode[];
  good: boolean;
  /** Tier 1 projects that would cut it by half or more, for "get ready" hints. */
  preparedBy: ProjectId[];
  /** Standing projects that already cut it. */
  cutBy: string[];
}

export interface Forecast {
  step: number;
  year: number;
  /** Every event warned and not yet landed, soonest first. */
  warnings: ForecastWarning[];
  /** A hint at the future, sharper as the game goes, or null at the start. */
  future: Say | null;
}

// ---------------------------------------------------------------------------
// Council and election views

export type Mood = "unhappy" | "uneasy" | "content" | "pleased";

export interface CouncilView {
  code: CouncilCode;
  name: Text;
  flags: CouncilFlag[];
  measures: {
    id: MeasureId;
    score: number;
    /** The 2026 seed score (real data turned to 0 to 10). */
    seed: number;
    /** Change since the last yearly frame. */
    change: number;
    honesty: Honesty;
  }[];
  /** The real 2026 figures, unchanged all game. */
  real: { indicator: IndicatorId; name: Text; value: number; unit: Text; year: string; source: SourceId; measure: MeasureId | null }[];
  people: { pop: number; young: number; age65: number; honesty: Honesty };
  backing: number;
  backs: boolean;
  groups: { group: GroupId; name: Text; share: number; mood: Mood; reason?: Say }[];
  risks: Record<RiskKind, RiskStep>;
  links: { link: LinkId; kind: LinkKind; other: NodeId; direction: "in" | "out" | "both"; share?: number; quality?: LinkQuality; name?: Text }[];
  projects: ProjectState[];
  /** The two weakest measures, as "what it is asking for". */
  asking: MeasureId[];
  /** Rising, steady or slipping (rule R2). */
  momentum: Momentum;
  /** The first project placed here now gets the fresh start (rule R3). */
  freshStart: boolean;
  /** The open deal with this council, if any (rule P6). */
  deal: Deal | null;
  /** A place visit offered here now, if any. */
  visit: PlaceId | null;
}

export interface ElectionView {
  year: number;
  /** True when this view is a result (held); false for a projection mid term. */
  held: boolean;
  councils: { code: CouncilCode; backing: number; backs: boolean; peopleShare: number }[];
  backers: number;
  councilCount: number;
  /** Share of people in backing councils, 0 to 1. */
  peopleShare: number;
  result: ElectionResult;
  /** What the result means for the next four years. */
  says: Say[];
  /** The next election year, or null after 2046. */
  nextYear: number | null;
}

// ---------------------------------------------------------------------------
// The end

export type ResultBand = "much_worse" | "little_worse" | "same" | "little_better" | "much_better";

export interface Scores {
  /** Life in your years, 0 to 100: the mean over the yearly frames played. */
  life: number;
  /** Left for 2050, 0 to 100. */
  left: number;
  lower: "life" | "left";
  /** The result. 16.3.6: the result is Left for 2050 (score.ts, package 9, switches it from the lower of the two). */
  result: number;
  /** The 2026 board on the same scale, for "than you found it". */
  start: number;
  band: ResultBand;
}

export interface EvidenceLine {
  say: Say;
  council: CouncilCode | null;
  why?: Why;
}

export interface Ending {
  id: EndingId;
  name: Text;
  summary: Text;
  evidence: EvidenceLine[];
  scores: Scores;
  /** The same game number played on autopilot. */
  autopilot: Scores;
  /** The three councils that changed most, most first. */
  mostChanged: CouncilCode[];
  letter: { from: CouncilCode; letter: LetterId; slots: Record<string, Text | string | number> };
  /** The nearest ending the player's branches could have reached. */
  notBuilt: { id: EndingId; name: Text; say: Say; frame: Frame | null };
  /** Place visits made, for the end screen. */
  visits: { place: PlaceId; grade: Grade }[];
  /** The chapters and turning points (16.5). */
  story: Story;
}
