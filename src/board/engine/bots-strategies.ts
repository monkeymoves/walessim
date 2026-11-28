/**
 * The nine strategy bots of docs/design/v2-board.md section 13.2, as choosers: each returns its
 * next build or upgrade for this turn, or null to end the turn. Events and visits are answered in
 * bots.ts before any build, carefully or not as the bot's `careful` flag says.
 */
import { boardScore, leftBoard } from "./score";
import type { BotView } from "./bots-common";
import { buildOptions, draw, optionCouncils, optionValue } from "./bots-common";
import type { ActionOption, BoardModel, BranchId } from "./types";

export interface Bot {
  id: string;
  /** Answers events with a response handled well, and plays visits for the best grade. */
  careful: boolean;
  next(v: BotView): ActionOption | null;
}

const byCost = (a: ActionOption, b: ActionOption) => a.cost - b.cost;

/** Is a keystone of this branch open and waiting only for coins? Then a branch bot saves. */
function savingFor(v: BotView, branch: BranchId): boolean {
  const all = v.engine.options(v.model, v.state);
  return all.some((o) => o.action.kind === "build" && o.branch === branch && o.tier === 3 && !o.allowed
    && o.blockers.length > 0 && o.blockers.every((b) => b.kind === "coins"));
}

/** Autopilot: the cheapest legal build, once a turn. */
export const autopilot: Bot = {
  id: "autopilot", careful: false,
  next(v) {
    const sinceTurn = v.state.steps.slice(v.state.steps.map((s) => s.kind).lastIndexOf("end_turn") + 1);
    if (sinceTurn.some((s) => s.kind === "build" || s.kind === "upgrade")) return null;
    return buildOptions(v).filter((o) => o.action.kind === "build").sort(byCost)[0] ?? null;
  },
};

/** Random: any allowed build or upgrade, stopping at random. */
export const random: Bot = {
  id: "random", careful: false,
  next(v) {
    const opts = buildOptions(v);
    if (opts.length === 0 || draw(v, "stop", v.tried.size, v.state.steps.length) < 0.25) return null;
    return opts[Math.floor(draw(v, "pick", v.state.steps.length) * opts.length)] ?? null;
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
        if (savingFor(v, branch)) return null;
        const opts = buildOptions(v).filter((o) => o.branch === branch);
        if (opts.length === 0) continue;
        const best = opts.sort((a, b) => (b.tier ?? 1) - (a.tier ?? 1) || optionValue(v.model, v.state, b) - optionValue(v.model, v.state, a) || byCost(a, b))[0]!;
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
    return opts.sort((a, b) => optionValue(v.model, v.state, b, false) / Math.max(1, b.cost) - optionValue(v.model, v.state, a, false) / Math.max(1, a.cost))[0] ?? null;
  },
};

/**
 * The two branches that fit the 2026 board best: the most plain value in their tier 1 projects
 * across the councils, judged on the 2026 board so the choice holds all game.
 */
export function focusBranches(v: BotView): BranchId[] {
  const first = v.state.history[0];
  const board = first ? { ...v.state, councils: Object.fromEntries(Object.entries(v.state.councils).map(([k, c]) => [k, { ...c, measures: first.councils[k]?.measures ?? c.measures }])) } : v.state;
  const value = (b: BranchId) => v.engine.options(v.model, v.state)
    .filter((o) => o.action.kind === "build" && o.branch === b && o.tier === 1)
    .reduce((a, o) => a + optionValue(v.model, board, o) / Math.max(1, o.cost), 0);
  return v.model.branches.map((b) => ({ id: b.id, v: value(b.id) })).sort((a, b) => b.v - a.v || a.id.localeCompare(b.id)).slice(0, 2).map((x) => x.id);
}

/**
 * Skilled: holds the two branches that fit the board best (`focusBranches`) and drives them to
 * their keystones, highest tier first, saving for an open keystone. Among the few best options
 * by plain value it looks ahead two turns, with nothing else built, and keeps the one that leaves
 * the best board carried to 2050 (so a keystone being built counts), which weights the lowest
 * councils (rule G1). Builds outside its branches only when they offer nothing.
 */
export function skilled(opts: { lookAhead?: number; shortlist?: number; shuffleSites?: boolean } = {}): Bot {
  const ahead = opts.lookAhead ?? 2;
  const shortlist = opts.shortlist ?? 4;
  return {
    id: opts.shuffleSites ? "skilled-shuffled" : "skilled", careful: true,
    next(v) {
      const all = buildOptions(v);
      if (all.length === 0) return null;
      const focus = focusBranches(v);
      if (v.state.year <= v.model.game.keystone_last_start_year && focus.some((b) => savingFor(v, b))) return null;
      const inFocus = all.filter((o) => o.branch && focus.includes(o.branch));
      const pool0 = inFocus.length > 0 ? inFocus : all;
      const topTier = Math.max(...pool0.map((o) => o.tier ?? 1));
      const pool = pool0.filter((o) => (o.tier ?? 1) === topTier);
      const short = [...pool].sort((a, b) => optionValue(v.model, v.state, b) / Math.max(1, b.cost) - optionValue(v.model, v.state, a) / Math.max(1, a.cost)).slice(0, shortlist);
      let best: { o: ActionOption; score: number } | null = null;
      for (const o of short) {
        let s;
        try {
          s = v.engine.act(v.model, v.state, o.action);
          for (let i = 0; i < ahead && s.phase !== "ended"; i++) s = v.engine.endTurn(v.model, s).state;
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
      return same[Math.floor(draw(v, "site", v.state.steps.length) * same.length)] ?? best.o;
    },
  };
}
