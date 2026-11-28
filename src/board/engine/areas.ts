/**
 * Areas of the board in play (types-board.ts, ADR 0009): `core`, `edge` and each map group, as
 * each board defines them. Shared content names an area, never a flag that only one board means.
 */
import type { AreaId, BoardModel, CouncilCode } from "./types";

/** The councils of an area, in display order, or every council in play without one. An area the board does not define has none. */
export function inArea(model: BoardModel, area?: AreaId): CouncilCode[] {
  if (area === undefined) return [...model.game.councils];
  return [...(model.game.areas[area] ?? [])];
}

/** Is this council in the area? */
export function isInArea(model: BoardModel, code: CouncilCode, area: AreaId): boolean {
  return model.game.areas[area]?.includes(code) ?? false;
}
