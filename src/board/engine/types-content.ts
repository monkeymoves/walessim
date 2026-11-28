/**
 * The board model, part 2: conditions, effects, projects, the tree, pairs, laws, groups and
 * places. Each `...Def` is exactly the shape of one entry in its model/board YAML file.
 */
import type { gradeRhondda } from "../../engine/places";
import type {
  BranchId, CouncilCode, CouncilFeature, CouncilFlag, Confidence, EventId, Grade, GroupId, IndicatorId,
  LawId, Level, LinkKind, LinkQuality, MeasureId, PairId, PlaceId, ProjectId, RiskKind, RiskStep, RuleId,
  SourceId, Text, Tier,
} from "./types-model";

/** The outside pressure tracks a future sets (section 7.2). */
export type TrackId = "weather" | "economy" | "prices";

/** Project state on the board. */
export type ProjectStatus = "building" | "working" | "run_down";

/**
 * A test on the board, evaluated for one council (the one being built in, or an event's candidate).
 * Kinds marked "board" ignore the council. `not: true` inverts any condition.
 */
export type Condition = { not?: boolean } & (
  | { kind: "feature"; feature: CouncilFeature }
  | { kind: "flag"; flag: CouncilFlag }
  /** board: that tier of that branch is open. */
  | { kind: "tier_open"; branch: BranchId; tier: Tier }
  /**
   * Projects matching every given filter, counted `where`: in this council; in this council or one
   * link away (any of `links`, default all kinds; a link project counts at both ends); or anywhere. Holds when the count is `at_least` (default 1).
   * `status` defaults to "working". Tier gates are `{ kind: "project", branch, tier: 1, where: "anywhere", at_least: 3 }`.
   */
  | {
      kind: "project";
      project?: ProjectId;
      tag?: string;
      branch?: BranchId;
      tier?: Tier;
      min_level?: Level;
      status?: ProjectStatus;
      where: "here" | "within_link" | "anywhere";
      links?: LinkKind[];
      at_least?: number;
    }
  /** A rail link touching this council has at least this quality. */
  | { kind: "link_quality"; at_least: LinkQuality }
  | { kind: "risk"; risk: RiskKind; at_least: RiskStep }
  /** "rising" and "falling" compare with `over_turns` turns ago (default 2, four years). */
  | { kind: "measure"; measure: MeasureId; op: "below" | "at_least" | "rising" | "falling"; value?: number; over_turns?: number }
  /** A people share in percent: young adults (20 to 34) or aged 65 and over. */
  | { kind: "share"; share: "young_adults" | "age65"; op: "below" | "at_least"; value: number }
  | { kind: "backing"; op: "below" | "at_least"; value: number }
  /** board: the future's track this turn is at least `value` (0 to 1). */
  | { kind: "track"; track: TrackId; at_least: number }
  /** board: the year the current turn starts is within [from, to]. */
  | { kind: "year"; from?: number; to?: number }
  /** board: the law is in force. */
  | { kind: "law"; law: LawId }
);

/** Where an effect lands, relative to the council it belongs to. */
export type EffectWhere =
  | "here"
  /** Both ends of the link a link project sits on. */
  | "link_ends"
  /** Councils downstream on a river link (S4). */
  | "downstream"
  /** Councils one link away, of any kind. */
  | "linked"
  /** Every council in play with `flag`. */
  | "flagged"
  | "everywhere";

/** Fixed special mechanics, each named by one keystone or project. No free text, no formulas. */
export type EffectSpecial =
  /** Work comes up the line: S1 pays the valley end of upgraded links first; jobs_density rises there. */
  | "reverse_commute"
  /** Rivers given room: storm events on this river lose one severity step for good. */
  | "storm_step_down"
  /** A cluster that roots: will not leave in a downturn if two colleges feed it. */
  | "cluster_roots"
  /** Health close to home: removes the care bill (rule B2) when enough councils have one. */
  | "care_bill_off"
  /** Wetlands on the coast: blocks some building land here. */
  | "land_blocked";

/**
 * One effect of a project, pair, law, event, response or place option. Size scales with project
 * level through `ProjectDef.level_factor`. `after_turns` delays it after the project starts working
 * (bedding in); `ramp_turns` spreads the lift over that many turns.
 */
export interface EffectBase {
  where?: EffectWhere;
  flag?: CouncilFlag;
  only_if?: Condition[];
  after_turns?: number;
  ramp_turns?: number;
  /** The rule card that names this effect's size and evidence, shown at the end of Why?. */
  rule?: RuleId;
}

export type Effect = EffectBase & (
  /** A lift held while the cause stands (projects), or a one-off push (events, responses). `jobs`: counts as new work for S1. */
  | { kind: "measure"; measure: MeasureId; points: number; jobs?: boolean }
  /** Negative steps lower the risk. */
  | { kind: "risk"; risk: RiskKind; steps: number }
  | { kind: "link_quality"; steps: number }
  /** Coins added (or taken, negative) every `every_turns` turns while it stands. */
  | { kind: "coins"; coins: number; every_turns: number }
  /** Percentage points of the young adult share. */
  | { kind: "young_adults"; points: number }
  | { kind: "backing"; points: number; group?: GroupId }
  /** Blocks `share` (0 to 1) of a spread rule's effect arriving at this council. */
  | { kind: "block"; spread: RuleId; share: number }
  /** Multiplies a spread rule's effect on links touching this council. */
  | { kind: "boost"; spread: RuleId; factor: number }
  | { kind: "special"; special: EffectSpecial }
);

// ---------------------------------------------------------------------------
// Projects and the tree (projects.yaml, tree.yaml)

export interface RunningCost {
  coins: number;
  every_turns: number;
}

/** model/board/projects.yaml, one entry. */
export interface ProjectDef {
  id: ProjectId;
  branch: BranchId;
  tier: Tier;
  keystone: boolean;
  name: Text;
  /** What it is, in one or two plain sentences. */
  what: Text;
  /** Real Welsh places it could be, tagged "an example" on screen. */
  example: Text;
  /** The catch, if any. */
  catch?: Text;
  /** "council": placed in a council. "link": placed on a rail link between two councils. */
  site: "council" | "link";
  cost: number;
  build_turns: number;
  running?: RunningCost;
  /** Feature and placement needs beyond the tier gate. All must hold for the council (or both link ends). */
  needs: Condition[];
  /** Effects at level 1. */
  effects: Effect[];
  /** Upgrade costs to level 2 and 3; absent means it cannot be upgraded. */
  upgrade_costs?: [number, number];
  /** Effect multiplier at levels 1, 2 and 3 (level 2 is more than twice level 1, section 5.2). */
  level_factor: [number, number, number];
  /** Tags used by pairs, spread blocks and events, e.g. "homes", "jobs", "big_employer", "college". */
  tags: string[];
  /** Building it here offers this place visit. */
  visit?: PlaceId;
  rule?: RuleId;
  sources: SourceId[];
}

export interface TierDef {
  tier: Tier;
  /** All must hold for the tier to open (tier 1 always opens: empty). Compiled to a `requires` card. */
  opens: Condition[];
  /** The generated `requires` rule card id, filled by the build. */
  rule?: RuleId;
}

/** model/board/tree.yaml, one branch. */
export interface BranchDef {
  id: BranchId;
  name: Text;
  /** One line under the branch name on the Tree sheet. */
  note: Text;
  tiers: [TierDef, TierDef, TierDef];
}

/** A partner that a pair needs (or misses) within reach. */
export type PairPartner =
  | { project: ProjectId }
  | { tag: string }
  | { link_quality: LinkQuality };

/**
 * model/board/pairs.yaml. "together": `effects` apply when every partner is within reach.
 * "apart": `effects` apply when no partner is within reach (the college with no jobs).
 */
export interface PairDef {
  id: PairId;
  kind: "together" | "apart";
  /** The project the pair is about; effects land where it stands. */
  project: ProjectId;
  partners: PairPartner[];
  within: "here" | "within_link";
  effects: Effect[];
  name: Text;
  note: Text;
  rule?: RuleId;
}

/** model/board/laws.yaml. Laws cost backing somewhere, never coins. */
export interface LawDef {
  id: LawId;
  name: Text;
  what: Text;
  catch: Text;
  effects: Effect[];
  backing: { flag?: CouncilFlag; group?: GroupId; points: number }[];
  rule?: RuleId;
}

/** What a group compares when its mood moves (section 6). */
export type GroupCare =
  | MeasureId
  /** Whatever fell most in the last four years. */
  | "fell_most"
  | "promises"
  | "crises"
  /** Buses and services close by. */
  | "services"
  /** Young people being able to stay (the young adult share). */
  | "young_adults";

/** model/board/groups.yaml. */
export interface GroupDef {
  id: GroupId;
  name: Text;
  /** The real share per council, or null for a fixed `base_weight` (a game rule, labelled). */
  share_from: IndicatorId | null;
  base_weight?: number;
  cares: GroupCare[];
  sources: SourceId[];
}

// ---------------------------------------------------------------------------
// Places (places/*.yaml)

/** v1's Rhondda place board, as `gradeRhondda` takes it. Copied in at build from public/model.json. */
export type V1PlaceBoard = Parameters<typeof gradeRhondda>[0];

export interface PlaceOption {
  id: string;
  name: Text;
  gain: Text;
  loss: Text;
  branch?: BranchId;
  effects: Effect[];
  /** First match wins, judged on the visited council. */
  grades: { when: Condition[]; grade: Grade }[];
  default_grade: Grade;
}

/** model/board/places/<id>.yaml. T1 reuses a v1 board whole; T3 is one hard choice. */
export interface PlaceDef {
  id: PlaceId;
  council: CouncilCode;
  template: "T1" | "T2" | "T3";
  name: Text;
  prompt: Text;
  why_hard: Text;
  offered_by: { projects?: ProjectId[]; events?: EventId[] };
  /** The project here whose effect the grade scales. */
  scales?: ProjectId;
  /** T1 and T2: which v1 board, and that board copied in at build. */
  v1_place?: "rhondda" | "bethesda";
  board?: V1PlaceBoard;
  /** T3: two or three options. */
  options?: PlaceOption[];
  sources: SourceId[];
  confidence: Confidence;
}
