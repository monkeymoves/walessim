/**
 * The twelve strategy bots of docs/design/v2-board.md sections 13.2 and 16.6, as choosers: each
 * returns its next build or upgrade at this decision, or null to let the clock run. Events,
 * visits and deals are answered in bots.ts before any build, carefully or not as the bot's
 * `careful` flag says.
 */
import { neighbours, siteCouncils } from "./conditions";
import { boardScore, leftBoard, lowestCouncils } from "./score";
import type { BotView } from "./bots-common";
import { buildOptions, draw, optionCouncils, optionsOf, optionValue, runAhead, valuesOf } from "./bots-common";
import { param } from "./rules";
import { stepsOf } from "./time";
import type { ActionOption, BoardModel, BranchId, CouncilCode } from "./types";
import { RULE_IDS } from "./types";

export interface Bot {
  id: string;
  /** Answers events with a response handled well, plays visits for the best grade, and keeps deals. */
  careful: boolean;
  /** Until this year the bot does nothing at all, and answers events as cheaply as it can (Sleeper). */
  awakeYear?: number;
  next(v: BotView): ActionOption | null;
}

/** Sleeper wakes in this year (16.6). */
export const SLEEPER_WAKES = 2034;
/** Rescue spends only in the three lowest councils until this year (16.6). */
export const RESCUE_UNTIL = 2038;

const byCost = (a: ActionOption, b: ActionOption) => a.cost - b.cost;

/** Is a keystone of this branch open and waiting only for coins? Then a branch bot saves. */
function savingFor(v: BotView, branch: BranchId): boolean {
  const all = optionsOf(v);
  return all.some((o) => o.action.kind === "build" && o.branch === branch && o.tier === 3 && !o.allowed
    && o.blockers.length > 0 && o.blockers.every((b) => b.kind === "coins"));
}

/** Is a keystone of this branch built or being built? */
export const keystoneUnderway = (v: BotView, branch: BranchId): boolean => v.state.projects.some((p) => {
  const d = v.model.projects.find((x) => x.id === p.project);
  return d?.branch === branch && d.tier === 3 && !d.legacy_of;
});

/** A keystone option that waits only on coins and on a faster line at its site. */
const waitsOnLine = (o: ActionOption): boolean => o.blockers.length > 0
  && o.blockers.every((b) => b.kind === "coins" || (b.kind === "needs" && b.condition.kind === "link_quality"))
  && o.blockers.some((b) => b.kind === "needs");

/**
 * A build that meets a branch keystone's need for a faster line (Work comes up the line needs a
 * rail link of quality 2 at its site, 5.3), as a player reading the blocker would: when the
 * keystone is open but every site waits on a line, the cheapest allowed line upgrade touching one
 * of those sites. Null when a site waits on coins alone or nothing upgrades a line there.
 */
export function keystoneUnlock(v: BotView, branch: BranchId): ActionOption | null {
  const keystones = optionsOf(v).filter((o) => o.action.kind === "build" && o.branch === branch && o.tier === 3);
  const waiting = keystones.filter((o) => !o.allowed && waitsOnLine(o));
  if (waiting.length === 0 || keystones.some((o) => o.allowed || o.blockers.every((b) => b.kind === "coins"))) return null;
  const sites = new Set(waiting.flatMap((o) => optionCouncils(v.model, o)));
  const lifts = (o: ActionOption) => !!v.model.projects.find((p) => p.id === o.project)?.effects.some((e) => e.kind === "link_quality");
  return buildOptions(v).filter((o) => o.action.kind === "build" && lifts(o) && optionCouncils(v.model, o).some((c) => sites.has(c))).sort(byCost)[0] ?? null;
}

/**
 * Autopilot builds once a turn (13.2), and a turn was two years: per turn becomes per two years
 * under the clock (16.2.4), so it builds at most once in any `AUTOPILOT_EVERY_YEARS`.
 */
export const AUTOPILOT_EVERY_YEARS = 2;

/** Autopilot: the cheapest legal build, once a turn (two years). */
export const autopilot: Bot = {
  id: "autopilot", careful: false,
  next(v) {
    const since = v.state.step - stepsOf(v.model, AUTOPILOT_EVERY_YEARS);
    const recent = v.state.log.filter((e) => e.at > since);
    if (recent.some((e) => e.action.kind === "build" || e.action.kind === "upgrade")) return null;
    return buildOptions(v).filter((o) => o.action.kind === "build").sort(byCost)[0] ?? null;
  },
};

/**
 * Spender: low effort (playtest 8, should-fix 11). Spends every coin, every year, on the cheapest
 * build it can make, with no thought for where or why. Thought should beat it.
 */
export const spender: Bot = {
  id: "spender", careful: false,
  next: (v) => buildOptions(v).sort(byCost)[0] ?? null,
};

/** Random: a random council, then any allowed build or upgrade there (or in the next council drawn), stopping at random. */
export const random: Bot = {
  id: "random", careful: false,
  next(v) {
    if (draw(v, "stop", v.tried.size, v.state.log.length) < 0.25) return null;
    const order = [...v.model.game.councils].sort((a, b) => draw(v, "council", v.state.log.length, a) - draw(v, "council", v.state.log.length, b));
    for (const council of order) {
      const opts = buildOptions(v, council);
      if (opts.length > 0) return opts[Math.floor(draw(v, "pick", v.state.log.length) * opts.length)] ?? null;
    }
    return null;
  },
};

/** Reactive: answers events, and builds only for the lowest bars on the board, lowest first. */
export const reactive: Bot = {
  id: "reactive", careful: true,
  next(v) {
    const bars: { code: string; m: string; value: number }[] = [];
    for (const code of v.model.game.councils) {
      const c = v.state.councils[code];
      if (c) for (const [m, value] of Object.entries(c.measures)) bars.push({ code, m, value });
    }
    bars.sort((a, b) => a.value - b.value || a.code.localeCompare(b.code) || a.m.localeCompare(b.m));
    for (const low of bars.slice(0, 3)) {
      const lifts = (o: ActionOption) => !!v.model.projects.find((p) => p.id === o.project)?.effects.some((e) => e.kind === "measure" && e.measure === low.m && e.points > 0);
      const pick = buildOptions(v, low.code).filter(lifts).sort(byCost)[0];
      if (pick) return pick;
    }
    return null;
  },
};

/** Branch bot: drives one branch to its keystone (highest tier first, saving for it), then a second. */
export function branchBot(primary: BranchId, secondary: BranchId): Bot {
  return {
    id: `branch-${primary}`, careful: true,
    next(v) {
      for (const branch of [primary, secondary]) {
        const unlock = keystoneUnlock(v, branch);
        if (unlock) return unlock;
        if (savingFor(v, branch)) return null;
        const opts = buildOptions(v).filter((o) => o.branch === branch);
        if (opts.length === 0) continue;
        const value = valuesOf(v.model, v.state, opts);
        const best = opts.sort((a, b) => (b.tier ?? 1) - (a.tier ?? 1) || value.get(b)! - value.get(a)! || byCost(a, b))[0]!;
        return best;
      }
      return null;
    },
  };
}

/** The second branch each branch bot turns to (section 5.4 typical routes), by branch order. */
export function secondBranch(model: BoardModel, primary: BranchId): BranchId {
  const ids = model.branches.map((b) => b.id);
  const pairs: Record<number, number> = { 0: 3, 1: 0, 2: 3, 3: 2 };
  const i = ids.indexOf(primary);
  return ids[pairs[i] ?? 0] ?? ids[0]!;
}

/** Cardiff first: builds only in the cities (councils flagged "city"), the most valuable first. */
export const cardiffFirst: Bot = {
  id: "cardiff-first", careful: false,
  next(v) {
    const cities = new Set(v.model.councils.filter((c) => c.flags.includes("city")).map((c) => c.code));
    const opts = buildOptions(v).filter((o) => optionCouncils(v.model, o).some((c) => cities.has(c)));
    const value = valuesOf(v.model, v.state, opts, false);
    return opts.sort((a, b) => value.get(b)! / Math.max(1, b.cost) - value.get(a)! / Math.max(1, a.cost))[0] ?? null;
  },
};

/**
 * The two branches that fit the 2026 board best: the most plain value in their tier 1 projects
 * across the councils, judged on the 2026 board the first time it is asked, and kept all game.
 */
export function focusBranches(v: BotView): BranchId[] {
  if (v.focus) return v.focus;
  const first = v.state.history[0];
  const board = first ? { ...v.state, councils: Object.fromEntries(Object.entries(v.state.councils).map(([k, c]) => [k, { ...c, measures: first.councils[k]?.measures ?? c.measures }])) } : v.state;
  const value = (b: BranchId) => optionsOf(v)
    .filter((o) => o.action.kind === "build" && o.branch === b && o.tier === 1)
    .reduce((a, o) => a + optionValue(v.model, board, o) / Math.max(1, o.cost), 0);
  v.focus = v.model.branches.map((b) => ({ id: b.id, v: value(b.id) })).sort((a, b) => b.v - a.v || a.id.localeCompare(b.id)).slice(0, 2).map((x) => x.id);
  return v.focus;
}

export interface SkilledOptions {
  /** Years to look ahead for each shortlisted option (2). */
  lookAhead?: number;
  shortlist?: number;
  /** Place matters (13.2): the chosen project, at a random legal site. */
  shuffleSites?: boolean;
  id?: string;
  /** Only options this allows are considered (Rescue's councils, Scatter's spacing). */
  allow?: (v: BotView, o: ActionOption) => boolean;
  /** Saves for an open keystone only from this year (Rescue spends where it is needed first). */
  saveFrom?: number;
}

/**
 * Skilled: holds the two branches that fit the board best (`focusBranches`) and drives them to
 * their keystones, highest tier first, saving for an open keystone; once one keystone is under way
 * the branch still without one comes first. Among the few best options
 * by plain value it looks ahead `lookAhead` years, with nothing else built, and keeps the one that
 * leaves the best board carried to 2050 (so a keystone being built counts), which weights the
 * lowest councils (rule G1). Builds outside its branches only when they offer nothing.
 */
export function skilled(opts: SkilledOptions = {}): Bot {
  const ahead = opts.lookAhead ?? 2;
  const shortlist = opts.shortlist ?? 3;
  return {
    id: opts.id ?? (opts.shuffleSites ? "skilled-shuffled" : "skilled"), careful: true,
    next(v) {
      const all = opts.allow ? buildOptions(v).filter((o) => opts.allow!(v, o)) : buildOptions(v);
      if (all.length === 0) return null;
      const focus = focusBranches(v);
      for (const b of focus) {
        const unlock = keystoneUnlock(v, b);
        if (unlock && (!opts.allow || opts.allow(v, unlock))) return unlock;
      }
      const saving = v.state.year >= (opts.saveFrom ?? 0) && v.state.year <= v.model.game.keystone_last_start_year;
      if (saving && focus.some((b) => savingFor(v, b))) return null;
      // Drive each focus branch to its keystone: once one stands, the other comes first.
      const unbuilt = focus.filter((b) => !keystoneUnderway(v, b));
      const toKeystone = all.filter((o) => o.branch && unbuilt.includes(o.branch));
      const inFocus = all.filter((o) => o.branch && focus.includes(o.branch));
      const pool0 = toKeystone.length > 0 ? toKeystone : inFocus.length > 0 ? inFocus : all;
      const topTier = Math.max(...pool0.map((o) => o.tier ?? 1));
      const pool = pool0.filter((o) => (o.tier ?? 1) === topTier);
      const value = valuesOf(v.model, v.state, pool);
      const short = [...pool].sort((a, b) => value.get(b)! / Math.max(1, b.cost) - value.get(a)! / Math.max(1, a.cost)).slice(0, shortlist);
      let best: { o: ActionOption; score: number } | null = null;
      for (const o of short) {
        let s;
        try {
          s = v.engine.act(v.model, v.state, o.action);
          s = runAhead(v.engine, v.model, s, stepsOf(v.model, ahead), true);
        } catch {
          continue;
        }
        const score = boardScore(v.model, leftBoard(v.model, s));
        if (!best || score > best.score) best = { o, score };
      }
      if (!best) return null;
      if (!opts.shuffleSites) return best.o;
      // Place matters (13.2): the same project, at a random legal site.
      const same = all.filter((o) => o.project === best!.o.project && o.action.kind === best!.o.action.kind);
      return same[Math.floor(draw(v, "site", v.state.log.length) * same.length)] ?? best.o;
    },
  };
}

/** Sleeper (16.6): does nothing at all until 2034, then plays as Skilled. */
export function sleeper(): Bot {
  return { ...skilled({ id: "sleeper" }), awakeYear: SLEEPER_WAKES };
}

/** The three councils lowest in 2026 (by their mean of six measures), from the first frame. */
export function lowestIn2026(v: BotView): CouncilCode[] {
  const board = v.state.history[0]?.councils ?? v.state.councils;
  return lowestCouncils(v.model, board, param(v.model, RULE_IDS.score, "lowest_count"));
}

/** Rescue (16.6): spends only in the three councils lowest in 2026 until 2038, then plays as Skilled. */
export function rescue(): Bot {
  return skilled({
    id: "rescue", saveFrom: RESCUE_UNTIL,
    allow: (v, o) => v.state.year >= RESCUE_UNTIL || optionCouncils(v.model, o).some((c) => lowestIn2026(v).includes(c)),
  });
}

/** Councils where this bot already has a project of the branch, and their neighbours. */
function nearOwn(v: BotView, branch: BranchId): Set<CouncilCode> {
  const out = new Set<CouncilCode>();
  for (const p of v.state.projects) {
    if (v.model.projects.find((d) => d.id === p.project)?.branch !== branch) continue;
    for (const c of siteCouncils(v.model, p)) {
      out.add(c);
      for (const n of neighbours(v.model, c)) out.add(n);
    }
  }
  return out;
}

/** Scatter (16.6): as Skilled, but never builds within one link of its own projects of the same branch. Upgrades are allowed. */
export function scatter(): Bot {
  return skilled({
    id: "scatter",
    allow: (v, o) => o.action.kind !== "build" || !o.branch || !optionCouncils(v.model, o).some((c) => nearOwn(v, o.branch!).has(c)),
  });
}
