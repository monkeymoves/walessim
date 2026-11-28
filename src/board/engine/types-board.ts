/**
 * Boards (docs/design/v3-wales.md section 1, ADR 0009): one rule set, several boards. A board is a
 * list of councils plus its regional content, as data in model/board/boards/<id>/. The engine
 * reads the board in play from the compiled model's `game`. Import through `./types` or `./api`.
 */
import type { BoardCalendar } from "./types-clock";
import type { CouncilCode, CouncilFlag, StubDef, Text } from "./types-model";

/** A board's id: its folder name under model/board/boards/, e.g. "southeast". */
export type BoardId = string;

/**
 * An area: a named set of a board's councils that shared content names (`area: edge`), so one set
 * of conditions serves every board. Every board defines `core` (the cities) and `edge` (the
 * councils the cities can leave behind); each map group is an area too.
 */
export type AreaId = string;

/** One of the groups of councils the player reads at a glance on a big board (All Wales: five). */
export interface MapGroupDef {
  id: AreaId;
  name: Text;
  councils: CouncilCode[];
}

/** model/board/boards/<id>/board.yaml, as written. */
export interface BoardFile {
  /** The board's name, e.g. South East Wales. Compiled into `game.region`. */
  name: Text;
  /** Councils in play, in display order. */
  councils: CouncilCode[];
  /** Each area as the flags (model/authorities.yaml) that put a council of the board in it: any one of them. */
  areas: Record<AreaId, CouncilFlag[]>;
  /** The map groups, in order. Empty on a board small enough to read whole. */
  map_groups: MapGroupDef[];
  /** Places off the board, shown at the map edge. */
  stubs: StubDef[];
  /** Stops this board switches on or off by default, over game.yaml's. */
  stops?: Partial<BoardCalendar["stops"]>;
}

/** What the compiled model's `game` adds to the calendar: the board in play. */
export interface BoardSetup {
  board: BoardId;
  /** The board's name (board.yaml `name`), e.g. South East Wales. */
  region: Text;
  /** Councils in play, in display order. */
  councils: CouncilCode[];
  /** Every area's councils, in display order: `core`, `edge` and each map group. */
  areas: Record<AreaId, CouncilCode[]>;
  /** The map groups in order; their councils are `areas[id]`. */
  map_groups: { id: AreaId; name: Text }[];
}

/** The compiled `game`: the calendar every board shares, and the board in play. */
export type BoardGame = BoardCalendar & BoardSetup;
