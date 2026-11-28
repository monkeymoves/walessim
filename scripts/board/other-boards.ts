/**
 * Shared content may name a project that only some boards have: the South East's valleys branch
 * cuts heat and fuel events, and pairs a health hub with buses that meet the trains. On a board
 * without that project the line has nothing to name, so the build leaves it out, the way a place
 * is offered only by projects on the board (board-content.ts `boardPlaces`). This keeps one home
 * for each line: a board never copies a shared event to drop one name from it (ADR 0009).
 *
 * Only a project that lives in another board's branch.yaml is left out. Any other unknown name
 * stays in, so a typo still fails the cross check. Lines whose meaning would change without the
 * name (an ending's keystone, a start's free project) are not touched and fail the cross check.
 */
import type { BoardId, EventDef, PairDef, PlaceDef, ProjectDef } from "../../src/board/engine/types";
import type { BoardFolder } from "./board-content";

type Raw = Record<string, unknown>;

const branchProjects = (folder: BoardFolder | undefined): string[] =>
  ((folder?.["branch.yaml"] as { projects?: ProjectDef[] } | undefined)?.projects ?? []).map((p) => p.id);

/** Projects of other boards' first branches that this board does not have. */
export function otherBoardsProjects(boards: Record<BoardId, BoardFolder>, id: BoardId): Set<string> {
  const mine = new Set(branchProjects(boards[id]));
  return new Set(Object.entries(boards).filter(([b]) => b !== id).flatMap(([, f]) => branchProjects(f)).filter((p) => !mine.has(p)));
}

/** A pair with no other board's project in it. */
const pairOn = (p: PairDef, away: Set<string>) => !away.has(p.project) && p.partners.every((x) => !("project" in x) || !away.has(x.project));

/** An event without the size rules and preparations that name another board's projects. */
function eventOn(e: EventDef, away: Set<string>): EventDef {
  return {
    ...e,
    size: e.size.filter((s) => s.when.every((c) => c.kind !== "project" || c.project === undefined || !away.has(c.project))),
    prepared_by: e.prepared_by.filter((p) => !away.has(p)),
  };
}

/** A place is left off when the project it scales is another board's. */
const placeOn = (p: PlaceDef, away: Set<string>) => p.scales === undefined || !away.has(p.scales);

/** The folded files and places with every line naming another board's project left out (see the header). */
export function withoutOtherBoards(files: Record<string, unknown>, places: Record<string, unknown>, away: Set<string>): { files: Record<string, unknown>; places: Record<string, unknown> } {
  if (away.size === 0) return { files, places };
  const out = { ...files };
  const pairs = (files["pairs.yaml"] as { pairs?: PairDef[] } | undefined)?.pairs;
  if (pairs) out["pairs.yaml"] = { ...(files["pairs.yaml"] as Raw), pairs: pairs.filter((p) => pairOn(p, away)) };
  const events = (files["events.yaml"] as { events?: EventDef[] } | undefined)?.events;
  if (events) out["events.yaml"] = { ...(files["events.yaml"] as Raw), events: events.map((e) => eventOn(e, away)) };
  return { files: out, places: Object.fromEntries(Object.entries(places).filter(([, p]) => placeOn(p as PlaceDef, away))) };
}
