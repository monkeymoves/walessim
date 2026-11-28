/**
 * Fold one board's folder (model/board/boards/<id>/, ADR 0009) into the shared model files, so
 * the rest of the build sees one set of files for the board in play:
 *
 * - board.yaml gives the board in play (`game`), its areas from the councils' flags, and its stubs.
 * - branch.yaml puts the board's first branch before the shared branches, and its projects in.
 * - starts.yaml and events.yaml add to the shared lists; an entry with a shared id replaces it.
 * - words.yaml renames text fields of entries by section and id, after the model is assembled.
 * - Places come from the shared places/ folder: a board takes every place whose council it holds,
 *   and a project or event on it offers only those.
 */
import type { BoardCalendar, BoardFile, BoardGame, BoardId, BranchDef, CouncilCode, CouncilFlag, PlaceDef, ProjectDef, Text } from "../../src/board/engine/types";
import { WORD_SECTIONS } from "../../src/board/model";

type Raw = Record<string, unknown>;
/** A board's parsed folder files by name ("board.yaml", "branch.yaml"). */
export type BoardFolder = Record<string, unknown>;

/** Thrown for a board folder that cannot be folded in. scripts/board/assemble.ts reports it. */
export class BoardFolderError extends Error {
  override name = "BoardFolderError";
}

/** The compiled `game`: the shared calendar and the board in play, its areas worked out from flags. */
export function boardGame(calendar: BoardCalendar & { boards?: unknown; note?: unknown }, id: BoardId, board: BoardFile, flagsOf: (code: CouncilCode) => CouncilFlag[]): BoardGame {
  const { boards: _boards, note: _note, ...cal } = calendar;
  const areas: Record<string, CouncilCode[]> = {};
  for (const [area, flags] of Object.entries(board.areas)) areas[area] = board.councils.filter((c) => flagsOf(c).some((f) => flags.includes(f)));
  for (const g of board.map_groups) {
    if (areas[g.id]) throw new BoardFolderError(`boards/${id}: map group ${g.id} has the name of an area`);
    areas[g.id] = board.councils.filter((c) => g.councils.includes(c));
    const off = g.councils.filter((c) => !board.councils.includes(c));
    if (off.length > 0) throw new BoardFolderError(`boards/${id}: map group ${g.id} names councils not on the board: ${off.join(", ")}`);
  }
  return {
    ...cal,
    board: id, region: board.name, councils: [...board.councils], areas,
    map_groups: board.map_groups.map((g) => ({ id: g.id, name: g.name })),
    stops: { ...cal.stops, ...board.stops } as BoardCalendar["stops"],
    save_key: `${cal.save_key}${id}.`,
  };
}

/** The shared list with the board's entries added; an entry with a shared id takes its place. */
export function mergeById<T extends { id: string }>(shared: T[], own: T[]): T[] {
  const byId = new Map(own.map((x) => [x.id, x]));
  const out = shared.map((x) => byId.get(x.id) ?? x);
  return [...out, ...own.filter((x) => !shared.some((s) => s.id === x.id))];
}

/**
 * Projects in tree order: each branch's projects in file order, branch by branch, and the legacy
 * projects (which come after a keystone) after all the rest, again branch by branch.
 */
export function treeOrder(projects: ProjectDef[], branches: BranchDef[]): ProjectDef[] {
  const at = (p: ProjectDef) => (p.legacy_of ? branches.length : 0) + branches.findIndex((b) => b.id === p.branch);
  return projects.map((p, i) => ({ p, i })).sort((a, b) => at(a.p) - at(b.p) || a.i - b.i).map((x) => x.p);
}

const listOf = (file: unknown, key: string): Raw[] | undefined => (file ? ((file as Raw)[key] as Raw[]) : undefined);

/** The shared files with the board's folder folded in (see the header). Places are filtered in `boardPlaces`. */
export function foldBoard(files: Record<string, unknown>, folder: BoardFolder): Record<string, unknown> {
  const out = { ...files };
  const own = folder["branch.yaml"] as { branch: BranchDef; projects: ProjectDef[] } | undefined;
  const tree = files["tree.yaml"] as { branches: BranchDef[] } | undefined;
  if (tree) {
    const branches = own ? [own.branch, ...tree.branches.filter((b) => b.id !== own.branch.id)] : tree.branches;
    out["tree.yaml"] = { ...tree, branches };
    const shared = listOf(files["projects.yaml"], "projects") as ProjectDef[] | undefined;
    if (shared) out["projects.yaml"] = { ...(files["projects.yaml"] as Raw), projects: treeOrder(mergeById(shared, own?.projects ?? []), branches) };
  }
  for (const [name, key] of [["starts.yaml", "starts"], ["events.yaml", "events"]] as const) {
    const mine = listOf(folder[name], key);
    if (!mine) continue;
    out[name] = { ...((files[name] as Raw | undefined) ?? {}), [key]: mergeById((listOf(files[name], key) ?? []) as { id: string }[], mine as { id: string }[]) };
  }
  return out;
}

/** The places on this board (their council is in play), offered only by projects and events on it. */
export function boardPlaces(places: PlaceDef[], councils: CouncilCode[], projects: ProjectDef[], eventIds: string[]): PlaceDef[] {
  return places.filter((p) => councils.includes(p.council)).map((p) => ({
    ...p,
    offered_by: Object.fromEntries(Object.entries({
      projects: p.offered_by.projects?.filter((x) => projects.some((d) => d.id === x)),
      events: p.offered_by.events?.filter((x) => eventIds.includes(x)),
    }).filter(([, v]) => v !== undefined)),
  }));
}

/** Projects or events with no `visit` to a place that is not on this board. */
export function withVisitsOn<T extends { visit?: string }>(list: T[], places: Set<string>): T[] {
  return list.map((x) => {
    if (x.visit === undefined || places.has(x.visit)) return x;
    const { visit: _visit, ...rest } = x;
    return rest as T;
  });
}

/** Rename text fields from the board's words.yaml. Fails on an id or field that is not there, so a stale rename is caught. */
export function applyWords<M extends Record<string, unknown>>(model: M, words: unknown, id: BoardId): M {
  if (!words) return model;
  const out = { ...model } as Record<string, unknown>;
  for (const section of WORD_SECTIONS) {
    const renames = (words as Record<string, Record<string, Record<string, Text>>>)[section];
    if (!renames) continue;
    const list = structuredClone(out[section] as Raw[]);
    for (const [entry, fields] of Object.entries(renames)) {
      const x = list.find((e) => e.id === entry);
      if (!x) throw new BoardFolderError(`boards/${id}/words.yaml: no ${section} entry ${entry} on this board`);
      for (const [field, value] of Object.entries(fields)) {
        const was = x[field] as Raw | undefined;
        if (!was || typeof was.en !== "string") throw new BoardFolderError(`boards/${id}/words.yaml: ${section}.${entry}.${field} is not a text field`);
        x[field] = value;
      }
    }
    out[section] = list;
  }
  return out as M;
}
