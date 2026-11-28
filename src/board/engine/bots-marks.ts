/**
 * The balance table of docs/design/v2-board.md section 16.6 (with the marks of 13.2 it keeps), as
 * pure measures over finished bot runs and a few extra measures that need games of their own.
 * Bots are named by id: `branch-<branch id>` for the branch bots.
 */
import type { RunResult } from "./bots-balance";
import { byBot, distance, mean, median, percentile, sameGame } from "./bots-balance";
import { LAW_COST_YEARS } from "./bots-probes";
import { LEVER_YEARS } from "./bots-levers";

/** No wipe-out: elections after this year, and the councils that must still back a careless player. */
export const NO_WIPE_AFTER = 2034;
export const NO_WIPE_MIN = 2;

export interface Row {
  claim: string;
  measure: string;
  value: string;
  mark: string;
  pass: boolean | null;
}

/** Measures that need their own games, or facts about the model. */
export interface Extras {
  /** Nothing slides by itself: the largest change of the result from 2026, no actions and no events. */
  idleDrift?: number;
  shuffledMedian?: number;
  /** Spreader's median: Skilled that takes a fresh start (R3) whenever one is on offer. */
  spreaderMedian?: number;
  compoundRatio?: number;
  searchKeystones?: { runs: number; four: number; three: number };
  severity?: { min: number; max: number; lo: number; hi: number };
  /** Endings and chapters in the model. */
  endingsTotal?: number;
  chaptersTotal?: number;
  /** Laws cost (bots-probes.ts `lawCost`): over the games probed, the largest Backing change a law made four years on, and the weakest law's. */
  lawCost?: { most: number; least: number };
  /** Replay of a log is byte equal; ticking every step equals advancing. */
  clock?: { replay: boolean; tickAdvance: boolean };
  /** A lever exists (bots-levers.ts): councils under 5 at an election in Skilled runs, and how many one affordable build there lifted to 5 within four years. */
  levers?: { cases: number; lifted: number };
  /** Seconds the run took, and whether it was the quick run. */
  seconds?: { taken: number; quick: boolean };
}

const fmt = (v: number, d = 2): string => (Number.isFinite(v) ? v.toFixed(d) : "n/a");
const ok = (v: number, test: (x: number) => boolean): boolean | null => (Number.isNaN(v) ? null : test(v));
const both = (a: boolean | null, b: boolean | null): boolean | null => (a === null || b === null ? null : a && b);

/** The 16.6 table from the runs of the twelve bots. */
export function balanceTable(runs: RunResult[], x: Extras = {}): Row[] {
  const rows: Row[] = [];
  const row = (claim: string, measure: string, value: string, mark: string, pass: boolean | null) => rows.push({ claim, measure, value, mark, pass });
  const bots = [...new Set(runs.map((r) => r.bot))];
  const branchBots = bots.filter((b) => b.startsWith("branch-"));
  const medianOf = (b: string) => median(byBot(runs, b).map((r) => r.result));
  const beats = (a: string, b: string) => {
    const pairs = sameGame(byBot(runs, a), byBot(runs, b));
    return { share: pairs.length ? pairs.filter(([p, q]) => p.result > q.result).length / pairs.length : NaN, gap: median(pairs.map(([p, q]) => p.result - q.result)) };
  };

  if (x.idleDrift !== undefined) row("Nothing slides by itself", "no actions, events off: largest change from 2026", fmt(x.idleDrift), "<= 0.5", ok(x.idleDrift, (v) => v <= 0.5));
  const drift = median(byBot(runs, "autopilot").map((r) => r.startScore - r.result));
  row("The drift is mild", "Autopilot median, points below 2026", fmt(drift, 1), "2 to 5", ok(drift, (v) => v >= 2 && v <= 5));
  const sa = beats("skilled", "autopilot");
  row("Skill beats autopilot", "Skilled beats Autopilot, same game; median gap", `${fmt(sa.share)}; ${fmt(sa.gap, 1)}`, ">= 0.95; >= 15", both(ok(sa.share, (v) => v >= 0.95), ok(sa.gap, (v) => v >= 15)));
  const sr = beats("skilled", "reactive");
  row("Thought beats reaction", "Skilled beats Reactive, same game", fmt(sr.share), ">= 0.85", ok(sr.share, (v) => v >= 0.85));
  if (bots.includes("spender")) {
    const ss = beats("skilled", "spender");
    row("Thought beats spending", "Skilled beats Spender (every coin on the cheapest build), same game", fmt(ss.share), ">= 0.85", ok(ss.share, (v) => v >= 0.85));
  }
  const earlyOf = (b: string) => median(byBot(runs, b).flatMap((r) => (r.early === undefined ? [] : [r.early])));
  const skEarly = earlyOf("skilled");
  const apEarly = earlyOf("autopilot");
  row("Things move early", "result at the 2030 election less 2026, median: Skilled; Autopilot", `${fmt(skEarly, 1)}; ${fmt(apEarly, 1)}`, ">= 3; -1 to 1",
    both(ok(skEarly, (v) => v >= 3), ok(apEarly, (v) => Math.abs(v) <= 1)));

  const medians = bots.map((b) => ({ b, m: medianOf(b) })).sort((a, b) => b.m - a.m);
  const apart = medians.length > 1 ? medians[0]!.m - medians[medians.length - 1]!.m : NaN;
  row("Strategies end far apart", `highest bot median less lowest (${medians[0]?.b ?? ""} v ${medians[medians.length - 1]?.b ?? ""})`, fmt(apart, 1), ">= 18", ok(apart, (v) => v >= 18));
  const branchMedians = branchBots.map((b) => ({ b, m: medianOf(b) })).sort((a, b) => b.m - a.m);
  const close = branchMedians.length > 1 ? branchMedians[0]!.m - branchMedians[1]!.m : NaN;
  row("Good strategies stay close", `best branch median less second (${branchMedians[0]?.b ?? ""})`, fmt(close, 1), "<= 6", ok(close, (v) => v <= 6));

  const reach = branchBots.map((b) => {
    const rs = byBot(runs, b);
    return rs.length ? rs.filter((r) => r.keystoneBranches.includes(b.slice("branch-".length))).length / rs.length : NaN;
  });
  const skilledTwo = mean(byBot(runs, "skilled").map((r) => (r.keystones.length >= 2 ? 1 : 0)));
  const worstReach = reach.length ? Math.min(...reach) : NaN;
  row("Keystones can be reached", "lowest share of a branch bot's runs with its own keystone; Skilled with two", `${fmt(worstReach)}; ${fmt(skilledTwo)}`, ">= 0.80; >= 0.60", both(ok(worstReach, (v) => v >= 0.8), ok(skilledTwo, (v) => v >= 0.6)));
  if (x.searchKeystones) {
    const k = x.searchKeystones;
    const three = k.three / Math.max(1, k.runs);
    row("You cannot have it all", `${k.runs} random runs: four keystones; three`, `${k.four}; ${fmt(three, 3)}`, "0; < 0.05", k.four === 0 && three < 0.05);
  }
  if (x.compoundRatio !== undefined) row("Early choices compound", "a free joined tier 1 project in Skilled's game: effect by 2050, 2027 over 2039 (median)", fmt(x.compoundRatio), ">= 2", ok(x.compoundRatio, (v) => v >= 2));
  const together = medianOf("skilled") - medianOf("scatter");
  row("Together beats scattered", "Skilled median less Scatter median", fmt(together, 1), ">= 6", ok(together, (v) => v >= 6));
  if (x.spreaderMedian !== undefined) {
    const depth = medianOf("skilled") - x.spreaderMedian;
    row("Depth beats spread", "Skilled median less Spreader (always takes a fresh start when one is on offer)", fmt(depth, 1), "> 0", ok(depth, (v) => v > 0));
  }
  if (x.shuffledMedian !== undefined) {
    const fall = medianOf("skilled") - x.shuffledMedian;
    row("Place matters", "Skilled median less Skilled at random sites", fmt(fall, 1), ">= 8", ok(fall, (v) => v >= 8));
  }

  // Paths part, different Waleses, the map: pairs of branch bots on the same game.
  const pairs: { a: string; b: string; d: number[]; d34: number[] }[] = [];
  for (let i = 0; i < branchBots.length; i++) {
    for (let j = i + 1; j < branchBots.length; j++) {
      const ps = sameGame(byBot(runs, branchBots[i]!), byBot(runs, branchBots[j]!));
      pairs.push({ a: branchBots[i]!, b: branchBots[j]!, d: ps.map(([p, q]) => distance(p.vector, q.vector)), d34: ps.map(([p, q]) => distance(p.vector2034, q.vector2034)) });
    }
  }
  const part = mean(pairs.flatMap((p) => p.d)) / mean(pairs.flatMap((p) => p.d34));
  row("Paths part over time", "branch bots: distance in 2050 / in 2034", fmt(part), ">= 2.0", ok(part, (v) => v >= 2));
  const within = branchBots.flatMap((b) => {
    const rs = byBot(runs, b);
    return rs.slice(1).map((r, i) => distance(r.vector, rs[i]!.vector));
  });
  const ratio = mean(pairs.flatMap((p) => p.d)) / mean(within);
  row("Strategies build different Waleses", "branch bots: distance between / within", fmt(ratio), ">= 2.0", ok(ratio, (v) => v >= 2));
  const most = [...pairs].sort((p, q) => mean(q.d) - mean(p.d))[0];
  const onMap = most ? mean(sameGame(byBot(runs, most.a), byBot(runs, most.b)).map(([p, q]) => {
    const cells = p.measures.flatMap((r, c) => r.map((v, m) => Math.abs(v - q.measures[c]![m]!)));
    return cells.filter((d) => d >= 2).length / Math.max(1, cells.length);
  })) : NaN;
  row("The difference is on the map", `measures 2+ apart, ${most?.a ?? ""} v ${most?.b ?? ""}`, fmt(onMap), ">= 0.25", ok(onMap, (v) => v >= 0.25));

  const valley = bots.map((b) => median(byBot(runs, b).map((r) => r.valleyYoung))).filter(Number.isFinite);
  const spreadYoung = valley.length ? Math.max(...valley) - Math.min(...valley) : NaN;
  row("People end up in different places", "valley young adults in 2050 (in 100): highest bot median less lowest", fmt(spreadYoung), ">= 3", ok(spreadYoung, (v) => v >= 3));
  const lo = Math.min(...runs.map((r) => r.youngRatio.min));
  const hi = Math.max(...runs.map((r) => r.youngRatio.max));
  // Shares are held to four decimal places, so a council held at its floor reads a hair under 0.6.
  row("No runaway", "young adult share against 2026, any council, any run", `${fmt(lo, 3)} to ${fmt(hi, 3)}`, "0.6 to 1.5", runs.length ? lo >= 0.6 - 1e-3 && hi <= 1.5 + 1e-3 : null);

  const tips = median(byBot(runs, "skilled").map((r) => r.tips));
  const overlaps = pairs.flatMap((p) => sameGame(byBot(runs, p.a), byBot(runs, p.b)).flatMap(([r, s]) => {
    const union = new Set([...r.risen, ...s.risen]);
    return union.size ? [r.risen.filter((c) => s.risen.includes(c)).length / union.size] : [];
  }));
  const overlap = mean(overlaps);
  row("Tipping points happen, and differ", "momentum changes, median Skilled run; risen councils in common, branch bots", `${fmt(tips, 1)}; ${fmt(overlap)}`, ">= 3; <= 0.5", both(ok(tips, (v) => v >= 3), ok(overlap, (v) => v <= 0.5)));

  // Playtest 9 should-fix 1: careless play must be able to lose, skilled play should usually win,
  // and a full purse should not be where a good player's coins go.
  const randomRuns = byBot(runs, "random");
  const careless = randomRuns.length ? randomRuns.filter((r) => r.electionsLost > 0).length / randomRuns.length : NaN;
  row("Careless loses", "Random loses at least one election: share of runs", fmt(careless), ">= 0.70", ok(careless, (v) => v >= 0.7));
  const skilledRuns = byBot(runs, "skilled");
  const skillWins = skilledRuns.length ? skilledRuns.filter((r) => r.elections - r.electionsLost >= 4).length / skilledRuns.length : NaN;
  row("Skill still wins", "Skilled wins 4 of 5 elections or more: share of runs", fmt(skillWins), ">= 0.80", ok(skillWins, (v) => v >= 0.8));
  const watched = skilledRuns.flatMap((r) => (r.coins ? [r.coins] : []));
  const lostShare = watched.length ? watched.reduce((a, c) => a + c.lost, 0) / Math.max(1e-9, watched.reduce((a, c) => a + c.income + c.lost, 0)) : NaN;
  row("Coins have a use", "Skilled: coins lost to a full purse, share of coins earned", fmt(lostShare, 3), "< 0.10", ok(lostShare, (v) => v < 0.1));
  // Playtest 10 must-fix 4: backing stuck under 5 "whatever I built", and a careless game at 0 of 10 for twelve years.
  if (x.levers) {
    const share = x.levers.cases ? x.levers.lifted / x.levers.cases : NaN;
    row("A lever exists", `Skilled: councils under 5 at an election (${x.levers.cases}) that one build there, paid from a year's coins, lifts to 5 within ${LEVER_YEARS} years`, fmt(share), ">= 0.90", ok(share, (v) => v >= 0.9));
  }
  const after = randomRuns.filter((r) => r.backersAt?.some((b) => b.year > NO_WIPE_AFTER));
  const kept = after.length ? after.filter((r) => r.backersAt!.filter((b) => b.year > NO_WIPE_AFTER).every((b) => b.backers >= NO_WIPE_MIN)).length / after.length : NaN;
  row("No wipe-out", `Random keeps ${NO_WIPE_MIN} or more councils backing at every election after ${NO_WIPE_AFTER}: share of runs`, fmt(kept), ">= 0.80", ok(kept, (v) => v >= 0.8));
  if (x.lawCost) row("Laws cost", `largest change a law makes to one council's Backing ${LAW_COST_YEARS} years on (weakest law ${fmt(x.lawCost.least)})`, fmt(x.lawCost.most), ">= 0.5", ok(x.lawCost.most, (v) => v >= 0.5));

  const pool = runs.filter((r) => branchBots.includes(r.bot) || r.bot === "skilled");
  const lost = pool.filter((r) => r.recovered !== null);
  const back = lost.length ? lost.filter((r) => r.recovered).length / lost.length : NaN;
  const lossGap = median(pool.filter((r) => r.electionsLost === 0).map((r) => r.result)) - median(pool.filter((r) => r.electionsLost > 0).map((r) => r.result));
  row("A lost election is not the end", `runs with a loss (${lost.length}): next won; median result, no loss less loss`, `${fmt(back)}; ${fmt(lossGap, 1)}`, ">= 0.70; <= 6", both(ok(back, (v) => v >= 0.7), ok(lossGap, (v) => v <= 6)));

  const sleeperGain = medianOf("sleeper") - medianOf("autopilot");
  const skilledGain = medianOf("skilled") - medianOf("autopilot");
  row("A late start recovers", "Sleeper median less Autopilot; share of Skilled's gain", `${fmt(sleeperGain, 1)}; ${fmt(sleeperGain / skilledGain)}`, ">= 8; >= 0.5", both(ok(sleeperGain, (v) => v >= 8), ok(sleeperGain / skilledGain, (v) => v >= 0.5)));
  const rescueRuns = byBot(runs, "rescue");
  const rescueUp = median(rescueRuns.map((r) => r.lowestChange));
  const rescueRose = rescueRuns.length ? rescueRuns.filter((r) => r.lowestRose).length / rescueRuns.length : NaN;
  row("The lowest can come back", "Rescue: lowest council's mean by 2050 (median change); share where it rose", `${fmt(rescueUp)}; ${fmt(rescueRose)}`, ">= 1.5; >= 0.80", both(ok(rescueUp, (v) => v >= 1.5), ok(rescueRose, (v) => v >= 0.8)));
  const cf = byBot(runs, "cardiff-first");
  const cfGap = medianOf("skilled") - medianOf("cardiff-first");
  const cfEnd = cf.length ? cf.filter((r) => r.ending === "two-countries" || r.ending === "city-bedrooms").length / cf.length : NaN;
  row("Cities first does not win", "Skilled median less Cardiff first; share in Two countries or City and bedrooms", `${fmt(cfGap, 1)}; ${fmt(cfEnd)}`, ">= 10; > 0.5", both(ok(cfGap, (v) => v >= 10), ok(cfEnd, (v) => v > 0.5)));

  const endings = [...new Set(runs.map((r) => r.ending))];
  const real = endings.filter((e) => bots.some((b) => {
    const rs = byBot(runs, b);
    return rs.filter((r) => r.ending === e).length >= 0.1 * rs.length;
  }));
  row("Many endings are real", "endings in a tenth of some bot's runs", `${real.length} (${real.join(", ")})`, `>= 8 of ${x.endingsTotal ?? 12}`, real.length >= 8);
  const top = endings.map((e) => ({ e, share: pool.filter((r) => r.ending === e).length / Math.max(1, pool.length) })).sort((a, b) => b.share - a.share)[0];
  row("No ending swallows the rest", "largest ending share, branch bots and Skilled", top ? `${fmt(top.share)} (${top.e})` : "n/a", "<= 0.40", top ? top.share <= 0.4 : null);

  const sequences = new Set(pool.map((r) => r.chapters.join(" > ")));
  const all = pool.flatMap((r) => r.chapters);
  const counts = new Map<string, number>();
  for (const c of all) counts.set(c, (counts.get(c) ?? 0) + 1);
  const biggest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const bigShare = biggest && all.length ? biggest[1] / all.length : NaN;
  const seen = counts.size;
  const storyPass = x.chaptersTotal ? sequences.size >= 40 && bigShare <= 0.5 && seen >= x.chaptersTotal : null;
  row("Stories differ", `${pool.length} Skilled and branch runs: six-chapter sequences; largest chapter share (${biggest?.[0] ?? ""}); chapters seen`,
    `${sequences.size}; ${fmt(bigShare)}; ${seen} of ${x.chaptersTotal ?? 0}`, `>= 40; <= 0.50; all ${x.chaptersTotal ?? 18}`, storyPass);

  const gaps = bots.map((b) => ({ b, s: percentile(byBot(runs, b).map((r) => r.result), 90) - percentile(byBot(runs, b).map((r) => r.result), 10) }));
  const worst = [...gaps].sort((a, b) => b.s - a.s)[0];
  row("Luck does not decide", `widest 10th to 90th spread (${worst?.b ?? ""})`, fmt(worst?.s ?? NaN, 1), `<= 12 and < ${fmt(sa.gap, 1)}`, worst ? worst.s <= 12 && worst.s < sa.gap : null);
  const setups = [...new Set(runs.map((r) => `${r.start}|${r.future}`))];
  const days = new Set(setups.map((k) => branchBots.map((b) => ({ b, m: median(byBot(runs, b).filter((r) => `${r.start}|${r.future}` === k).map((r) => r.result)) }))
    .filter((y) => Number.isFinite(y.m)).sort((a, c) => c.m - a.m)[0]?.b).filter((y): y is string => !!y));
  row("Each branch has its day", "branches top in some start and future", `${days.size} of ${branchBots.length}`, "all four", days.size === branchBots.length && branchBots.length >= 4);
  if (x.severity) {
    const s = x.severity;
    row("The fairness rule holds", "outside severity per game number, lowest to highest", `${s.min} to ${s.max}`, `${s.lo} to ${s.hi}`, s.min >= s.lo && s.max <= s.hi);
  }
  if (x.clock) {
    row("The clock is exact", "replay of a log; tick every step against advance (the two year equivalence is clock-equivalence.test.ts)",
      `${x.clock.replay ? "equal" : "DIFFERENT"}; ${x.clock.tickAdvance ? "equal" : "DIFFERENT"}`, "byte equal; byte equal", x.clock.replay && x.clock.tickAdvance);
  }
  if (x.seconds) {
    const limit = x.seconds.quick ? 180 : 900;
    row("The bots are fast enough", x.seconds.quick ? "quick run, seconds" : "full run, seconds", fmt(x.seconds.taken, 0), `< ${limit}`, x.seconds.taken < limit);
  }
  return rows;
}

/** The table as Markdown. */
export function tableMarkdown(rows: Row[]): string {
  const mark = (p: boolean | null) => (p === null ? "n/a" : p ? "pass" : "FAIL");
  return ["| Claim | Measure | Value | Pass mark | Result |", "|---|---|---|---|---|", ...rows.map((r) => `| ${r.claim} | ${r.measure} | ${r.value} | ${r.mark} | ${mark(r.pass)} |`)].join("\n");
}
