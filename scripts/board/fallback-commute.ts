/**
 * The labelled fallback for commuting links (docs/design/v2-board.md section 4.2), used only when
 * the Census 2021 table is missing or its licence is not confirmed open.
 *
 * Commuting links exist only where two councils are joined by a rail link or share a border. They
 * run from the council with less work to the one with more (`jobs_density`), and carry a strength
 * step of 1 to 3 set by which third of the councils in play the work end falls in by `jobs_density`.
 * All of it is a GAME ESTIMATE, not a count of anyone, and says so (honesty: game_estimate).
 * The engine reads the same file shape either way: `strength` stands where `share` would.
 */
import type { LinkDef } from "../../src/board/engine/types";

export interface FallbackCouncil {
  code: string;
  slug: string;
  jobsDensity: number;
}

export interface FallbackInput {
  councils: FallbackCouncil[];
  /** Pairs of council codes joined by a rail link, either order. */
  rail: [string, string][];
  /** Pairs of council codes that share a border, either order. */
  borders: [string, string][];
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** 1 for the lowest third of the councils by jobs density, 3 for the highest third. */
export function strengthSteps(councils: FallbackCouncil[]): Map<string, 1 | 2 | 3> {
  const ranked = [...councils].sort((a, b) => a.jobsDensity - b.jobsDensity || a.code.localeCompare(b.code));
  const out = new Map<string, 1 | 2 | 3>();
  ranked.forEach((c, i) => out.set(c.code, (Math.floor((i * 3) / ranked.length) + 1) as 1 | 2 | 3));
  return out;
}

export function fallbackCommuteLinks(input: FallbackInput): LinkDef[] {
  const { councils } = input;
  const by = new Map(councils.map((c) => [c.code, c]));
  const steps = strengthSteps(councils);
  const how = new Map<string, Set<string>>();
  const note = (pairs: [string, string][], source: string) => {
    for (const [a, b] of pairs) {
      if (!by.has(a) || !by.has(b)) continue;
      (how.get(key(a, b)) ?? how.set(key(a, b), new Set()).get(key(a, b))!).add(source);
    }
  };
  note(input.rail, "osm_rail_wales");
  note(input.borders, "ons_lad_boundaries");

  const links: LinkDef[] = [];
  for (const [k, sources] of how) {
    const [x, y] = k.split("|") as [string, string];
    const a = by.get(x)!, b = by.get(y)!;
    if (a.jobsDensity === b.jobsDensity) continue;
    const [home, work] = a.jobsDensity < b.jobsDensity ? [a, b] : [b, a];
    links.push({
      id: `commute:${home.slug}-${work.slug}`, kind: "commute", from: home.code, to: work.code,
      strength: steps.get(work.code)!, honesty: "game_estimate",
      sources: [...sources, "nomis_jobs_density"].sort(),
    });
  }
  const order = (code: string) => councils.findIndex((c) => c.code === code);
  return links.sort((p, q) => order(p.from) - order(q.from) || order(p.to) - order(q.to));
}
