/**
 * The clock's types (docs/design/v2-board.md section 16.2, ADR 0007): the calendar in game.yaml,
 * seasons, stops, what a step reports, the time line, momentum, deals and the story. Owned by
 * package 7. Import through `./types` (engine) or `./api` (UI).
 */
import type { CouncilCode, EventId, MeasureId, ProjectId, Text } from "./types-model";
import type { ChapterId } from "./types-story";
import type { ElectionResult, EventRecord, Flow, Say, SayVar, Site } from "./types-state";
import type { CoinsReport, ElectionView, ReportLine } from "./types-views";

/** A council's tipping state (rule R2, 16.3.3). "steady" until package 8 switches R2 on. */
export type Momentum = "rising" | "steady" | "slipping";
/** The season of a step, from May: step % 4 is summer, autumn, winter, spring. */
export type Season = "summer" | "autumn" | "winter" | "spring";

// ---------------------------------------------------------------------------
// Stops and steps

/** Why the clock may pause (16.2.5). The engine reports every stop; the UI pauses from the player's settings. */
export type StopKind = "respond" | "election" | "ended" | "warning" | "keystone" | "tier_open" | "visit"
  | "tipping" | "chapter" | "deal_due" | "purse_full" | "finished" | "year";
export const STOP_KINDS: readonly StopKind[] = [
  "respond", "election", "ended", "warning", "keystone", "tier_open", "visit", "tipping", "chapter", "deal_due", "purse_full", "finished", "year",
];

/** One stop a step raised. `hard` stops cannot be switched off (`game.stops`). Say key `board.stop.<kind>`. */
export interface Stop {
  kind: StopKind;
  hard: boolean;
  council?: CouncilCode;
  /** The event, project, place, tier (`<branch>:<tier>`) or chapter it is about. */
  ref?: string;
  say: Say;
}

/** What one step did (replaces phase 1's TurnReport). `step` is the step that ran; the state is now at `step + 1`. */
export interface StepReport {
  step: number;
  /** The calendar year and season of the step that ran. */
  year: number;
  season: Season;
  /** Projects that started working in this step (ProjectState ids). */
  finished: string[];
  /** What travelled along links in this step, for live pulses. */
  flows: Flow[];
  events: EventRecord[];
  coins: CoinsReport;
  stops: Stop[];
  /** Set when the step closed a year: at most `game.year_lines_max` lines for that year. */
  yearLines?: ReportLine[];
  /** Set on an election step. */
  term?: TermReport;
  ended: boolean;
}

/** The term report at each election: at most `game.term_report_lines_max` lines for the four years, and the chapter. */
export interface TermReport {
  /** 1 to 6. */
  term: number;
  fromYear: number;
  toYear: number;
  lines: ReportLine[];
  election: ElectionView;
  chapter: ChapterRecord;
}

// ---------------------------------------------------------------------------
// Deals and the story

/** A deal with a council after a lost election (rule P6, 16.4): lift `measure` there by `dueStep`. */
export interface Deal {
  council: CouncilCode;
  measure: MeasureId;
  madeStep: number;
  dueStep: number;
  /** null until judged. */
  kept: boolean | null;
}

export type MomentKind = "tier_open" | "keystone" | "tipped" | "region_turn" | "election" | "event" | "promise" | "deal" | "people";

/** Something that happened that may become a turning point (16.5.2). `weight` is set by story.ts. */
export interface Moment {
  step: number;
  year: number;
  kind: MomentKind;
  council?: CouncilCode;
  /** The project, event, deal or tier it is about, by id. */
  ref?: string;
  say: Say;
  weight: number;
}

/** The chapter the game gave one election term (16.5.1). */
export interface ChapterRecord {
  /** 1 to 6. */
  term: number;
  fromYear: number;
  toYear: number;
  chapter: ChapterId;
  /** Slot values for the chapter's name and line: river, council, town, project. */
  slots: Record<string, SayVar>;
}

export interface StoryState {
  chapters: ChapterRecord[];
  moments: Moment[];
}

// ---------------------------------------------------------------------------
// The time line (16.2.6)

export type TimelineMark =
  | { kind: "election"; step: number; year: number; projected: ElectionResult }
  | { kind: "warning"; fromStep: number; toStep: number; event: EventId; councils: CouncilCode[]; good: boolean; say: Say }
  | { kind: "promise" | "deal" | "keystone_last_start" | "care_bill" | "end"; step: number; council?: CouncilCode; say?: Say };

export interface TimelineView {
  step: number;
  steps: number;
  year: number;
  season: Season;
  /** Terms already named, oldest first. */
  chapters: ChapterRecord[];
  moments: Moment[];
  /** Builds under way, from the step they started to the step at whose end they open. */
  underWay: { id: string; project: ProjectId; site: Site; startedStep: number; readyStep: number; keystone: boolean }[];
  /** What is ahead, in order of time. */
  ahead: TimelineMark[];
}

/** The story of a game: the chapters, and the five heaviest moments in order of time. */
export interface Story {
  chapters: ChapterRecord[];
  turningPoints: Moment[];
}

// ---------------------------------------------------------------------------
// The calendar (model/board/game.yaml)

/** Structure and calendar only. All balance numbers are rule params. See 16.2.1 and ADR 0007. */
export interface BoardGame {
  /** The region in play, e.g. South East Wales. */
  region: Text;
  /** Councils in play, in display order. */
  councils: CouncilCode[];
  first_year: number;
  end_year: number;
  /** The length of one step in years: 0.25 in play. The equivalence test sets 2. */
  years_per_step: number;
  /** Steps in a game: (end_year - first_year) / years_per_step, checked at build. 96 in play. */
  steps: number;
  /** The season of each step in a year, from May: summer, autumn, winter, spring. */
  seasons: [Season, Season, Season, Season];
  /** Senedd election years. An election is held on the first step of the year (May). */
  election_years: number[];
  /** Years each value of a future's track covers (2), and the block that holds at most one outside event. */
  track_years: number;
  /** The last year a keystone can be started and still finish. */
  keystone_last_start_year: number;
  /** A visit offered by a build lapses after this many years, and one visit is made at most this often. */
  visit_open_years: number;
  /** Lines in the term report at each election. */
  term_report_lines_max: number;
  /** Lines in the ticker when a year closes. */
  year_lines_max: number;
  /** Clock speeds for the UI. Never part of the state or the run code. */
  speeds: { id: string; ms_per_step: number }[];
  default_speed: string;
  /** Which stops are hard (the clock must stop) and which are on by default (16.2.5). The engine reports, the UI decides. */
  stops: Record<StopKind, { hard?: boolean; on?: boolean }>;
  /** localStorage key prefix. Keys are set and removed singly, never cleared. */
  save_key: string;
}
