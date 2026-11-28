/**
 * The board state: plain data, JSON safe. `BoardState` holds the game number, the start and the
 * list of steps, and replaying the steps from the game number must give a byte equal state
 * (the save format, the run code and the determinism test in one, section 12).
 */
import type {
  CouncilCode, CouncilQuantity, EventId, FutureId, Grade, GroupId, LawId, Level, LinkId, LinkQuality,
  MeasureId, NodeId, PairId, PlaceId, ProjectId, RiskKind, RiskStep, RuleId, StartId, Text,
} from "./types-model";
import type { ProjectStatus } from "./types-content";

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

/** Something the player does inside a turn (section 5.1). */
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
  | { kind: "visit"; place: PlaceId; picks: string[] };

/** One entry in the run: an action, or the end of a turn. */
export type RunStep = Action | { kind: "end_turn" };

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
  | { kind: "people"; group?: GroupId }
  /** Running costs, income and carry over. */
  | { kind: "budget" }
  /** No action: the board left alone. */
  | { kind: "drift" };

/** One recorded contribution to a change. Every change is the sum of its contributions. */
export interface Contribution {
  /** The turn in which it happened (0 based). */
  turn: number;
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
  /** The last turn a project was built in or within one link of here (for being passed over). */
  lastReachedTurn: number | null;
}

export interface ProjectState {
  /** `${project}@${council or link}`: one of each project per site. */
  id: string;
  project: ProjectId;
  site: Site;
  level: Level;
  status: ProjectStatus;
  startedTurn: number;
  /** The turn at whose end it starts working. */
  readyTurn: number;
  /** Set by a place visit that scales it. */
  grade?: Grade;
  /** Placed free from the start's head start. */
  free?: boolean;
}

/** An event warned on the forecast, to land at the end of `turn`. */
export interface ForecastedEvent {
  event: EventId;
  turn: number;
  /** Target first, then councils most at risk (downstream). */
  councils: CouncilCode[];
  severity: number;
}

/** An event that has landed. */
export interface EventRecord {
  event: EventId;
  turn: number;
  councils: CouncilCode[];
  /** Severity after preparation cut it. */
  severity: number;
  response?: string;
}

/** Something the player must or may settle before the next turn ends. */
export type Pending =
  | { kind: "respond"; event: EventId; councils: CouncilCode[] }
  | { kind: "visit"; place: PlaceId; council: CouncilCode; offeredBy: { project: ProjectId } | { event: EventId } };

export type ElectionResult = "strong_win" | "win" | "lost";

export interface ElectionRecord {
  year: number;
  turn: number;
  result: ElectionResult;
  /** Councils that backed you. */
  backers: CouncilCode[];
  /** Share of people (0 to 1) in backing councils, by real 2026 population. */
  peopleShare: number;
}

export interface ElectionState {
  records: ElectionRecord[];
  /** After a loss: the weak hand lasts until the end of this turn (inclusive), else null. */
  weakUntil: number | null;
  /** After a strong win: the bonus lasts until the end of this turn (inclusive), else null. */
  strongUntil: number | null;
}

export interface PromiseState {
  byYear: number;
  /** null until judged in `byYear`. */
  kept: boolean | null;
}

export type Phase = "build" | "respond" | "ended";

export interface BoardState {
  /** Version of this state shape. */
  version: 1;
  /** `BoardModel.meta.hash` it was made with. A save from another model replays or is refused. */
  modelHash: string;
  /** As the player typed it. */
  gameNumber: number | string;
  /** `hashSeed(gameNumber)` from src/engine/rng.ts. */
  seed: number;
  start: StartId;
  /** Drawn from the seed. Hidden from the player until the forecast reveals it. */
  future: FutureId;
  /** 0 based. Equal to `game.turns` when the game is over. */
  turn: number;
  /** First year of the current turn (2026, 2028, ...). */
  year: number;
  phase: Phase;
  steps: RunStep[];
  councils: Record<CouncilCode, CouncilState>;
  /** Rail link quality now, for every rail link. */
  linkQuality: Record<LinkId, LinkQuality>;
  projects: ProjectState[];
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
  /** Outside event severity points drawn so far (rule E1). */
  severityUsed: number;
  visitsThisTurn: number;
  /** One frame per board: index 0 is 2026, index n is the end of turn n - 1. */
  history: Frame[];
  ledger: Contribution[];
}

// ---------------------------------------------------------------------------
// Frames (time-lapse, then and now)

export interface FrameCouncil {
  measures: Record<MeasureId, number>;
  young: number;
  backing: number;
  risks: Record<RiskKind, RiskStep>;
}

/** Something that travelled along a link in a turn, for pulses and flowing dots. */
export interface Flow {
  link: LinkId;
  from: NodeId;
  to: NodeId;
  quantity: WhyQuantity;
  amount: number;
  rule: RuleId;
}

/** The board at one moment. */
export interface Frame {
  turn: number;
  year: number;
  councils: Record<CouncilCode, FrameCouncil>;
  projects: Pick<ProjectState, "id" | "project" | "site" | "level" | "status">[];
  linkQuality: Record<LinkId, LinkQuality>;
  /** Events that landed in the turn that ended here. */
  events: { event: EventId; councils: CouncilCode[] }[];
  /** What travelled in the turn that ended here. */
  flows: Flow[];
  coins: number;
  /** Fairness gap (section 4.1) in points out of 10. */
  fairness: number;
}
