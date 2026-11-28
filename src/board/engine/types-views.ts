/**
 * What the API returns to the UI: options, previews, reports, Why?, forecasts, council and
 * election views, the ending. Read only views, recomputed from model and state.
 */
import type {
  BranchId, CouncilCode, CouncilFlag, EndingId, EventId, Grade, GroupId, Honesty, IndicatorId, LetterId, LinkId,
  LinkKind, LinkQuality, MeasureId, NodeId, PlaceId, ProjectId, RiskKind, RiskStep, RuleId, SourceId, Text, Tier,
} from "./types-model";
import type { Condition } from "./types-content";
import type {
  Action, Cause, Contribution, ElectionResult, EventRecord, Flow, Frame, Pending, ProjectState, Say, WhyQuantity,
} from "./types-state";

// ---------------------------------------------------------------------------
// Options and previews

/** Why an action cannot be taken now. */
export type Blocker =
  | { kind: "coins"; need: number; have: number }
  /** A condition that does not hold, and the `requires` (or other) rule card that sets it. */
  | { kind: "needs"; condition: Condition; rule: RuleId }
  /** The council did not back you at the last lost election and refuses builds this dear. */
  | { kind: "refused"; council: CouncilCode; minCost: number }
  | { kind: "already_here" }
  | { kind: "max_level" }
  /** A keystone started now would not be finished by 2050. */
  | { kind: "too_late"; lastYear: number }
  | { kind: "law_changes_used" }
  | { kind: "visit_used" }
  | { kind: "phase"; phase: string }
  | { kind: "not_offered" };

export interface ActionOption {
  action: Action;
  allowed: boolean;
  blockers: Blocker[];
  /** Coins it costs now (0 for laws, free projects and visits). */
  cost: number;
  /** Turns to build, and the year it starts working, for builds and upgrades. */
  buildTurns?: number;
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
 * One reason behind a change: a council, a quantity, a turn, the size, the first cause, the link
 * it travelled, and the rule card it ends at. `why()` returns them largest first.
 */
export interface Why {
  council: CouncilCode | null;
  quantity: WhyQuantity;
  turn: number;
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

export interface WhyTarget {
  council?: CouncilCode;
  measure: WhyQuantity;
  turn: number;
}

// ---------------------------------------------------------------------------
// Turn report and forecast

/** One line of the report: a council and a cause, with its Why?. */
export interface ReportLine {
  council: CouncilCode | null;
  quantity: WhyQuantity;
  delta: number;
  say: Say;
  why: Why;
}

export interface CoinsReport {
  before: number;
  income: number;
  running: number;
  /** Coins lost to a weak hand, or other charges (care bill). */
  charges: number;
  carried: number;
  after: number;
}

export interface TurnReport {
  /** The turn that just ended (0 based) and its years. */
  turn: number;
  fromYear: number;
  toYear: number;
  /** At most `game.report_lines_max`, biggest first. */
  lines: ReportLine[];
  /** Projects that started working this turn (ProjectState ids). */
  finished: string[];
  /** For the "two years pass" animation. */
  flows: Flow[];
  events: EventRecord[];
  /** Set when an election was held at the end of this turn. */
  election?: ElectionView;
  coins: CoinsReport;
  /** Responses and visits now open. */
  pending: Pending[];
  /** True if the game is over (2050 reached). */
  ended: boolean;
}

export interface ForecastWarning {
  event: EventId;
  name: Text;
  say: Say;
  /** Target first, then the others most at risk. */
  councils: CouncilCode[];
  good: boolean;
  /** Tier 1 projects that would cut it by half or more, for "get ready" hints. */
  preparedBy: ProjectId[];
  /** Standing projects that already cut it. */
  cutBy: string[];
}

export interface Forecast {
  turn: number;
  year: number;
  warnings: ForecastWarning[];
  /** A hint at the future, revealed a turn at a time, or null. */
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
    /** Change since the last board (the turn before). */
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
  /** True while a lost election makes it refuse big builds. */
  refusesBigBuilds: boolean;
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
  /** Life in your years, 0 to 100. */
  life: number;
  /** Left for 2050, 0 to 100. */
  left: number;
  lower: "life" | "left";
  /** The lower of the two. */
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
}
