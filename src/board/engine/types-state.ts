/**
 * The board state: plain data, JSON safe. `BoardState` holds the game number, the start and the
 * log of actions with the step each was taken at; replaying the log from the game number must
 * give a byte equal state (the save format, the run code and the determinism test in one,
 * section 12 and ADR 0007). Speed and pauses are never in the state.
 */
import type {
  CouncilCode, CouncilQuantity, EventId, FutureId, Grade, GroupId, LawId, Level, LinkId, LinkQuality,
  MeasureId, NodeId, PairId, PlaceId, ProjectId, RiskKind, RiskStep, RuleId, StartId, Text,
} from "./types-model";
import type { ProjectStatus } from "./types-content";
import type { Deal, Momentum, StoryState } from "./types-clock";

/**
 * A sentence for the UI: an i18n key in model/i18n/{en,cy}/board.json plus slot values.
 * The engine never writes player text itself; names come as `Text` from the model.
 */
export interface Say {
  key: string;
  vars?: Record<string, SayVar>;
}
export type SayVar = string | number | Text;

/** Where a project stands: in a council, or on a rail link. */
export type Site = { council: CouncilCode; link?: never } | { link: LinkId; council?: never };

// ---------------------------------------------------------------------------
// Actions

/** Something the player does, running or paused (section 5.1, 16.2.3). It takes effect in the current step. */
export type Action =
  /** Build a project at a site. The start's free project costs nothing the first time. */
  | { kind: "build"; project: ProjectId; site: Site }
  /** Raise a standing project one level. */
  | { kind: "upgrade"; project: ProjectId; site: Site }
  /** Pass (true) or repeal (false) a law. One change per election term. */
  | { kind: "law"; law: LawId; pass: boolean }
  /** Answer a landed event. */
  | { kind: "respond"; event: EventId; response: string }
  /** The result of a place visit: T1 tip ids picked, or the one T3 option id. The engine grades it. */
  | { kind: "visit"; place: PlaceId; picks: string[] }
  /** After a lost election (rule P6, 16.4): take one of the deals on offer (a `deal` pending). */
  | { kind: "deal"; council: CouncilCode; measure: MeasureId };

/** One entry in the log: an action and the step it was taken at. Replaces phase 1's `RunStep`. */
export interface LoggedAction {
  at: number;
  action: Action;
}

// ---------------------------------------------------------------------------
// Explanation records

/** What a Why? can be asked about. */
export type WhyQuantity = CouncilQuantity | "coins" | "fairness";

/** The first cause of a change. Spread keeps the first cause and adds `via`. */
export type Cause =
  | { kind: "project"; project: ProjectId; site: Site }
  | { kind: "pair"; pair: PairId; site: Site }
  | { kind: "event"; event: EventId }
  | { kind: "response"; event: EventId; response: string }
  | { kind: "law"; law: LawId }
  | { kind: "visit"; place: PlaceId; grade: Grade }
  | { kind: "start"; start: StartId }
  | { kind: "election"; year: number }
  /** Groups' moods and people moving (S3) with no single project behind them. */
  | { kind: "people"; group?: GroupId; expect?: true }
  /** Running costs, income and carry over. */
  | { kind: "budget" }
  /** No action: the board left alone. */
  | { kind: "drift" }
  /** A council on the rise or slipping (rule R2). */
  | { kind: "momentum" }
  /** A deal with a council, kept or broken (rule P6). */
  | { kind: "deal"; council: CouncilCode };

/**
 * One recorded contribution to a change. Every change is the sum of its contributions. When a
 * year closes the ledger folds: records of that year sharing a council, quantity, rule, cause and
 * link merge into one, keeping the first step (ADR 0007). Within the current year, records are
 * one per change.
 */
export interface Contribution {
  /** The step it happened in (after a fold, the first step of its year that it happened in). */
  step: number;
  /** The calendar year of that step. */
  year: number;
  /** null for Wales level quantities (coins, fairness). */
  council: CouncilCode | null;
  quantity: WhyQuantity;
  delta: number;
  rule: RuleId;
  cause: Cause;
  /** Set when it travelled along a link (S1 to S4): which link, and from where. */
  via?: { link: LinkId; from: NodeId };
}

// ---------------------------------------------------------------------------
// Board state

/** One group's mood in one council: 0 to 10, and the reason it last moved. */
export interface GroupMood {
  mood: number;
  reason?: Say;
}

export interface CouncilState {
  code: CouncilCode;
  /** Scores 0 to 10. 2026 values are real seeds; later ones are game estimates. */
  measures: Record<MeasureId, number>;
  /** People, and young adult (20 to 34) and 65 and over shares in percent. */
  pop: number;
  young: number;
  age65: number;
  /** 0 to 10. A game estimate from the start. Backs you at the election line (rule P4). */
  backing: number;
  moods: Record<GroupId, GroupMood>;
  risks: Record<RiskKind, RiskStep>;
  /** The last step a project was started here or within one link (for being passed over). */
  lastReachedStep: number | null;
  /** Rising, steady or slipping (rule R2). Starts "steady". */
  momentum: Momentum;
  /**
   * Standing parts of Backing applied so far, by key (standing.ts): a law while it stands, a broken
   * deal while its anger fades. Not in the moods, so they do not drift back. Absent until one applies.
   */
  standing?: Record<string, number>;
}

export interface ProjectState {
  /** `${project}@${council or link}`: one of each project per site. */
  id: string;
  project: ProjectId;
  site: Site;
  level: Level;
  status: ProjectStatus;
  startedStep: number;
  /** The step at whose end it starts working (in the clock's tick of that step). */
  readyStep: number;
  /** Rule R1 (16.3.2): multiplies its measure and young adult effects. Starts at 1; grows while working. */
  roots: number;
  /** Rule R1: another working project of its branch stands here or one link away, or a pair is live. */
  joined: boolean;
  /** Set by a place visit that scales it. */
  grade?: Grade;
  /** Placed free from the start's head start. */
  free?: boolean;
  /** Rule P7: the councils that asked for what it lifts when it was started, and the measure (asked.ts). */
  answers?: { council: CouncilCode; measure: MeasureId }[];
}

/**
 * An event on the time line before it lands. The player sees the window `fromStep` to `toStep`
 * ("the winter of 2031"); it lands in the clock's tick of `step`, a seeded step inside the window.
 */
export interface ForecastedEvent {
  event: EventId;
  fromStep: number;
  toStep: number;
  /** The landing step. Not shown to the player. */
  step: number;
  /** Target first, then councils most at risk (downstream). */
  councils: CouncilCode[];
  severity: number;
}

/** An event that has landed. */
export interface EventRecord {
  event: EventId;
  /** The step it landed in. */
  step: number;
  councils: CouncilCode[];
  /** Severity after preparation cut it. */
  severity: number;
  /** True when a project that cuts it stood at its target when it landed (outside events). */
  prepared?: boolean;
  response?: string;
  /** The river link a river flood came down, chosen once when it landed, so every sentence names the same river. */
  river?: LinkId;
}

/**
 * Something the player must or may settle. A `respond` holds the clock (phase "respond") until
 * answered. A visit offered by a build lapses `game.visit_open_years` after `since`; one offered by
 * an event lapses when the next events land. A `deal` is on offer after a lost election (rule P6).
 */
export type Pending =
  | { kind: "respond"; event: EventId; councils: CouncilCode[] }
  | { kind: "visit"; place: PlaceId; council: CouncilCode; offeredBy: { project: ProjectId } | { event: EventId }; since: number }
  | { kind: "deal"; choices: { council: CouncilCode; measure: MeasureId }[]; since: number };

export type ElectionResult = "strong_win" | "win" | "lost";

export interface ElectionRecord {
  year: number;
  /** The step it was held on: the first step of its year. */
  step: number;
  result: ElectionResult;
  /** Councils that backed you. */
  backers: CouncilCode[];
  /** Share of people (0 to 1) in backing councils, by real 2026 population. */
  peopleShare: number;
}

export interface ElectionState {
  records: ElectionRecord[];
  /** After a loss: you govern with others until this step (inclusive, the last step of the term), else null. */
  hungUntil: number | null;
  /** After a strong win: the bonus lasts until this step (inclusive), else null. */
  strongUntil: number | null;
}

export interface PromiseState {
  byYear: number;
  /** null until judged in `byYear`. */
  kept: boolean | null;
}

/** "play": the clock can run and the player can act. "respond": an event waits for an answer and the clock is held. */
export type Phase = "play" | "respond" | "ended";

export interface BoardState {
  /** Version of this state shape: 2 since the clock. */
  version: 2;
  /** `BoardModel.meta.hash` it was made with. A save from another model replays or is refused. */
  modelHash: string;
  /** As the player typed it. */
  gameNumber: number | string;
  /** `hashSeed(gameNumber)` from src/engine/rng.ts. */
  seed: number;
  start: StartId;
  /** Drawn from the seed. Hidden from the player until the forecast reveals it. */
  future: FutureId;
  /** 0 based. Equal to `game.steps` when the game is over (May 2050). */
  step: number;
  /** The calendar year of the step (yearOfStep). */
  year: number;
  phase: Phase;
  /** Every action, with the step it was taken at, in order. */
  log: LoggedAction[];
  councils: Record<CouncilCode, CouncilState>;
  /** Rail link quality now, for every rail link. */
  linkQuality: Record<LinkId, LinkQuality>;
  projects: ProjectState[];
  /** Coins, held to four decimal places. The screen shows whole coins and a ring towards the next. */
  coins: number;
  /** The start's free tier 1 project, until placed. */
  freeProject: ProjectId | null;
  laws: LawId[];
  lawChangesLeft: number;
  election: ElectionState;
  promise: PromiseState;
  forecast: ForecastedEvent[];
  pending: Pending[];
  events: EventRecord[];
  /** Outside event severity points warned or landed so far (rule E1). */
  severityUsed: number;
  /** The step the last place visit was made, or null. Another visit waits `game.visit_open_years`. */
  openVisitSince: number | null;
  /** Yearly frames: index 0 is May 2026 (step 0), then one each time a year closes, to May 2050. */
  history: Frame[];
  ledger: Contribution[];
  /** Chapters and moments (16.5). Written by story.ts (package 9). */
  story: StoryState;
  /** Deals made after lost elections (rule P6). */
  deals: Deal[];
}

// ---------------------------------------------------------------------------
// Frames (time-lapse, then and now)

export interface FrameCouncil {
  measures: Record<MeasureId, number>;
  young: number;
  backing: number;
  risks: Record<RiskKind, RiskStep>;
  momentum: Momentum;
}

/** Something that travelled along a link, for pulses and flowing dots. */
export interface Flow {
  link: LinkId;
  from: NodeId;
  to: NodeId;
  quantity: WhyQuantity;
  amount: number;
  rule: RuleId;
}

/** The board at one moment: May of a year, when the year before it closed. */
export interface Frame {
  step: number;
  year: number;
  councils: Record<CouncilCode, FrameCouncil>;
  projects: Pick<ProjectState, "id" | "project" | "site" | "level" | "status">[];
  linkQuality: Record<LinkId, LinkQuality>;
  /** Events that landed in the year that ended here. */
  events: { event: EventId; councils: CouncilCode[] }[];
  /** What travelled along links in the year that ended here (from the ledger). */
  flows: Flow[];
  coins: number;
  /** Fairness gap (section 4.1) in points out of 10. */
  fairness: number;
}
