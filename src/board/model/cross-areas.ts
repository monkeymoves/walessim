/**
 * Cross checks on the board in play (ADR 0009): its areas hold only its own councils, it defines
 * the areas shared content relies on, its map groups split the board with no overlap, and every
 * area the content names exists.
 */
import type { AreaId, BoardModel } from "../engine/types";
import type { Issue } from "./shape";

/** Areas every board must define: the shared endings, starts, chapters and bot marks name them. */
export const REQUIRED_AREAS: readonly AreaId[] = ["core", "edge"];

/** Every area named in the model's content, with where it is named. */
function namedAreas(m: BoardModel): { area: AreaId; path: string }[] {
  const out: { area: AreaId; path: string }[] = [];
  const add = (area: AreaId | undefined, path: string) => { if (area !== undefined) out.push({ area, path }); };
  m.starts.forEach((s, i) => {
    s.backing.forEach((b, j) => add(b.area, `starts[${i}].backing[${j}]`));
    s.promise.kept_when.forEach((c, j) => add("area" in c ? c.area : undefined, `starts[${i}].promise.kept_when[${j}]`));
  });
  m.endings.forEach((e, i) => {
    e.when.forEach((c, j) => add("area" in c ? c.area : undefined, `endings[${i}].when[${j}]`));
    e.evidence.forEach((v, j) => add(v.area, `endings[${i}].evidence[${j}]`));
  });
  m.chapters.forEach((c, i) => c.when.forEach((w, j) => add("area" in w ? w.area : undefined, `chapters[${i}].when[${j}]`)));
  return out;
}

export function crossCheckAreas(m: BoardModel): Issue[] {
  const out: Issue[] = [];
  const bad = (path: string, message: string) => out.push({ path, message });
  const g = m.game;
  const inPlay = new Set(g.councils);
  for (const [id, codes] of Object.entries(g.areas)) {
    codes.forEach((c, i) => { if (!inPlay.has(c)) bad(`game.areas.${id}[${i}]`, `${c} is not a council in play`); });
  }
  for (const id of REQUIRED_AREAS) if (!g.areas[id]) bad("game.areas", `no area ${id} (shared content names it)`);
  const grouped = new Map<string, string>();
  g.map_groups.forEach((x, i) => {
    const codes = g.areas[x.id];
    if (!codes) return bad(`game.map_groups[${i}]`, `map group ${x.id} has no area`);
    for (const c of codes) {
      if (grouped.has(c)) bad(`game.map_groups[${i}]`, `${c} is in map groups ${grouped.get(c)} and ${x.id}`);
      grouped.set(c, x.id);
    }
  });
  if (g.map_groups.length > 0) for (const c of g.councils) if (!grouped.has(c)) bad("game.map_groups", `${c} is in no map group`);
  for (const { area, path } of namedAreas(m)) if (!g.areas[area]) bad(path, `unknown area ${area}`);
  return out;
}
