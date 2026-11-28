/**
 * The board model, part 3: events, futures, starts, endings, letters, and `BoardModel` itself,
 * the compiled public/board-model.json.
 */
import type {
  BoardBand, BoardGame, BoardRule, BoardSource, CouncilDef, CouncilFlag, EndingId, EventId, FutureId,
  IndicatorDef, IndicatorId, LetterId, LinkDef, MeasureDef, MeasureId, PlaceId, ProjectId, RiskKind, SourceId,
  StartId, StubDef, Text, Tier,
} from "./types-model";
import type { BranchDef, Condition, Effect, GroupDef, LawDef, PairDef, PlaceDef, ProjectDef, TrackId } from "./types-content";

// ---------------------------------------------------------------------------
// Events (events.yaml)

/** Which council an event lands on, among those where its trigger holds. Ties break by the seeded draw. */
export type EventTarget =
  | { pick: "highest_risk"; risk: RiskKind }
  | { pick: "lowest_measure"; measure: MeasureId }
  | { pick: "highest_measure"; measure: MeasureId }
  /** Any council where the trigger holds, drawn by the seed. */
  | { pick: "any" }
  /** Every council where the trigger holds (a downturn on all one-employer towns). */
  | { pick: "all" };

export interface EventResponse {
  id: string;
  name: Text;
  what: Text;
  /** Coins, 0 for free. */
  cost: number;
  effects: Effect[];
  /** Counts as a crisis handled well for the Everyone group. */
  handled_well: boolean;
}

/** model/board/events.yaml, one entry (section 7.1). */
export interface EventDef {
  id: EventId;
  name: Text;
  /** "outside": drawn from a future's track. "grown": triggered by the board. */
  origin: "outside" | "grown";
  good: boolean;
  track?: TrackId;
  /** Points toward the per game severity budget (rule E1). Outside events only; 0 for grown. */
  severity: number;
  /** All must hold for a candidate council. */
  trigger: Condition[];
  target: EventTarget;
  /** The forecast slip a turn ahead. Slots: {council}, {councils}, {river}. */
  warning: Text;
  /** The report line when it lands. Same slots. */
  landed: Text;
  effects: Effect[];
  /** Storms start upstream and pass down the river (S4). */
  travels?: "downstream";
  /** What stands there scales it: first match multiplies the effects by `factor`. */
  size: { when: Condition[]; factor: number }[];
  /** Fairness rule 3: tier 1 projects that cut it by half or more. Outside events need two. */
  prepared_by: ProjectId[];
  responses: EventResponse[];
  /** Landing here offers this place visit. */
  visit?: PlaceId;
  /** At most once a game. */
  once?: boolean;
  sources: SourceId[];
}

/** model/board/futures.yaml. Drawn from the game number, revealed a turn at a time. */
export interface FutureDef {
  id: FutureId;
  name: Text;
  note: Text;
  /** Per track, one pressure value 0 to 1 per turn (length = turns). A game rule (tune). */
  tracks: Record<TrackId, number[]>;
}

/** model/board/starts.yaml: what you were elected on. */
export interface StartDef {
  id: StartId;
  name: Text;
  pitch: Text;
  promise: { text: Text; by_year: number; kept_when: EndCondition[] };
  /** One free tier 1 project; the player places it (council chosen in the first turn). */
  free_project: ProjectId;
  /** Which councils back you first. */
  backing: { flag?: CouncilFlag; council?: string; points: number }[];
}

// ---------------------------------------------------------------------------
// Endings and letters (endings.yaml, letters.yaml)

/** A test on the whole board, usually against the 2026 board. Used by endings and promises. */
export type EndCondition =
  | { kind: "keystones"; at_least?: number; at_most?: number }
  | { kind: "keystone"; project: ProjectId }
  /** The fairness gap (section 4.1) against 2026. */
  | { kind: "gap"; vs_2026: "closed" | "wider" }
  /** The mean of the three lowest councils against their 2026 mean. */
  | { kind: "lowest_three"; vs_2026: "higher" | "lower" }
  | { kind: "young_adults"; flag?: CouncilFlag; vs_2026: "held" | "fell" }
  | { kind: "measure"; measure: MeasureId; flag?: CouncilFlag; vs_2026: "up" | "down"; by?: number }
  /** The mean of all measures over the councils in play. */
  | { kind: "wales"; vs_2026: "better" | "worse"; by?: number }
  | { kind: "projects"; tier?: Tier; at_least?: number; at_most?: number }
  | { kind: "links_upgraded"; at_least?: number; at_most?: number }
  | { kind: "risks_landed"; at_least: number };

/** How an evidence line picks its council and fact from the board. */
export type EvidenceKind = "young_adults_change" | "measure_change" | "no_event_since" | "project_standing" | "gap_change";

/** One evidence line. The board picks the council with the largest change and the line for its direction. */
export interface EvidenceDef {
  kind: EvidenceKind;
  measure?: MeasureId;
  flag?: CouncilFlag;
  /** The line when the change went up (more, better, still standing, no event). Slots: {council}, {town}, {year}, {project}, {river}. */
  up: Text;
  /** The line when it went down (fewer, worse, gone, the event landed). Same slots. */
  down: Text;
}

/** model/board/endings.yaml. The first ending by `priority` whose conditions all hold is yours. */
export interface EndingDef {
  id: EndingId;
  name: Text;
  /** The board in 2050, one line. */
  summary: Text;
  /** Typical route, for the Wales you did not build. */
  route: Text;
  priority: number;
  /** Empty for the fallback ending. */
  when: EndCondition[];
  evidence: EvidenceDef[];
  /** "With homes at the valley end of your lines, this could have been {ending}." */
  not_built: Text;
}

/** model/board/letters.yaml. A made-up voice from the council that changed most. */
export interface LetterDef {
  id: LetterId;
  ending: EndingId;
  /** Which score was lower, or either. */
  lower: "life" | "left" | "either";
  /** Slots: {council}, {town}, {project}, {year}, {place}. */
  salutation: Text;
  body: Text;
  named: Text;
  signoff: Text;
}

// ---------------------------------------------------------------------------
// The compiled model

export interface BoardMeta {
  /** Schema version of board-model.json. Bump on any breaking change. */
  version: number;
  /** ISO date of the build. */
  generated: string;
  /** Hash of the model content, for run codes and saves. */
  hash: string;
  /** Paths of Welsh strings awaiting review. */
  cy_review: string[];
  /** Rows still marked to_check. */
  to_check: string[];
  /** True for the three council fixture: never shown to players as real. */
  fixture?: boolean;
}

/** public/board-model.json, written by scripts/build-board-model.ts, read by the engine. */
export interface BoardModel {
  meta: BoardMeta;
  game: BoardGame;
  sources: BoardSource[];
  indicators: IndicatorDef[];
  measures: MeasureDef[];
  bands: Record<IndicatorId, BoardBand>;
  councils: CouncilDef[];
  stubs: StubDef[];
  links: LinkDef[];
  rules: BoardRule[];
  branches: BranchDef[];
  projects: ProjectDef[];
  pairs: PairDef[];
  laws: LawDef[];
  groups: GroupDef[];
  events: EventDef[];
  futures: FutureDef[];
  starts: StartDef[];
  endings: EndingDef[];
  letters: LetterDef[];
  places: PlaceDef[];
}
