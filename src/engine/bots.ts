/**
 * Bot players for balance (game-design 11.2). Each bot decides through the public API only.
 * They use a cheap linear estimate of a card's value (its effects on strand scores, weighted by
 * need and by how long they will count) rather than the full preview, so 200 seeds run quickly.
 */
import type { Card, CompiledModel, RegionId, StrandId } from "../model/schema";
import { REGION_IDS, STRAND_IDS } from "../model/schema";
import * as E from "./api";
import type { GameState, Plays, VisitChoice, ShockResponse, CardPlay } from "./api";
import { makeContext, type Ctx } from "./scores";
import { caretakerPlays } from "./caretaker";
import { gradeBethesda, gradeRhondda } from "./places";
import { uniform } from "./rng";

export interface Bot {
  id: string;
  plan(m: CompiledModel, s: GameState): Plays;
  visit(m: CompiledModel, s: GameState): VisitChoice;
  respond(m: CompiledModel, s: GameState): ShockResponse;
  pledge(m: CompiledModel, s: GameState): StrandId | null;
}

// ---------------------------------------------------------------------------
// Estimating a card

const SIZE: Record<string, number> = { S: 0.5, M: 1, L: 2 };

/** Strand deltas (flow and stock) of a card play, linear estimate at the Wales level. */
function estimate(ctx: Ctx, card: Card, regions: RegionId[] | null): { flow: number[]; stock: number[]; delay: number } {
  const flow = STRAND_IDS.map(() => 0);
  const stock = STRAND_IDS.map(() => 0);
  const las = regions ? regions.flatMap((r) => ctx.regionLas[r]) : ctx.las.map((_, i) => i);
  const share = las.reduce((a, i) => a + ctx.pop[i]!, 0);
  const step = regions && card.scope !== "two_regions" ? 2 : 1;
  for (const e of card.effects) {
    if (!e.size) continue;
    let comps: string[] = [];
    let amt = SIZE[e.size]! * e.sign * (e.side ? 0.8 : 1);
    if (e.target.startsWith("fcm:")) {
      comps = ["nature_condition"];
      amt = -amt * 0.6 * (las.length / 22);
    } else comps = [e.target];
    let reach = share * step;
    if (e.where?.flags?.includes("worst5")) reach = 5 / 22;
    for (const id of comps) {
      const c = ctx.comp.get(id);
      if (c === undefined) continue;
      const unweighted = ctx.comps[c]!.aggregate !== "pop";
      const d = amt * (unweighted ? las.length / 22 : reach);
      ctx.strandFlow.forEach((ids, si) => {
        if (ids.includes(c)) flow[si]! += d / ids.length;
        for (const g of ids) if (ctx.gap.get(g)?.of === c && e.where?.flags?.includes("worst5")) flow[si]! += (SIZE[e.size ?? "S"]! * e.sign) / ids.length;
      });
      ctx.strandStock.forEach((ids, si) => {
        if (ids.includes(c)) stock[si]! += d / ids.length;
      });
    }
  }
  return { flow, stock, delay: card.delay };
}

/** Value of a play for this state: need-weighted, counting how many terms a flow gain is lived. */
function value(ctx: Ctx, s: GameState, card: Card, regions: RegionId[] | null, opts: { stockWeight?: number; flowWeight?: number } = {}): number {
  const est = estimate(ctx, card, regions);
  const termsLeft = ctx.model.game.years.length - s.term;
  const livedTerms = Math.max(0, termsLeft - est.delay);
  let v = 0;
  STRAND_IDS.forEach((_, i) => {
    const st = s.strands[i]!;
    const needF = 1 + Math.max(0, 6 - st.flow) * 0.3;
    const needS = 1 + Math.max(0, 6 - st.stock) * 0.3 + (st.stock < st.flow ? 0.5 : 0);
    v += est.flow[i]! * needF * (livedTerms / 6) * (opts.flowWeight ?? 1) * 1.5;
    v += est.stock[i]! * needS * (opts.stockWeight ?? 1) * (s.term + est.delay <= 8 ? 1 : 0);
  });
  return v;
}

function legalRegions(card: Card): RegionId[] {
  return card.regions ?? [...REGION_IDS];
}

/** The best region for a card: most value, with a bonus for regions that have gone without. */
function bestPlay(ctx: Ctx, s: GameState, card: Card, opts: { only?: RegionId; neglectBonus?: number; stockWeight?: number; flowWeight?: number } = {}): { play: CardPlay; v: number } | null {
  const vw = { stockWeight: opts.stockWeight ?? 1, flowWeight: opts.flowWeight ?? 1 };
  if (card.scope === "national") return { play: { card: card.id }, v: value(ctx, s, card, null, vw) };
  if (card.scope === "two_regions") {
    const r = opts.only ? [opts.only, opts.only === "southeast" ? "southwest" : "southeast"] : neglectedOrder(s).slice(0, 2);
    return { play: { card: card.id, regions: r as RegionId[] }, v: 0.3 };
  }
  const regions = legalRegions(card).filter((r) => !opts.only || r === opts.only);
  if (!regions.length) return card.scope === "national_or_region" ? { play: { card: card.id }, v: value(ctx, s, card, null, vw) } : null;
  let best: { play: CardPlay; v: number } | null = card.scope === "national_or_region" ? { play: { card: card.id }, v: value(ctx, s, card, null, vw) } : null;
  const order = neglectedOrder(s);
  for (const r of regions) {
    const v = value(ctx, s, card, [r], vw) + (opts.neglectBonus ?? 0) * (order.indexOf(r) === 0 ? 1 : order.indexOf(r) === 1 ? 0.5 : 0);
    if (!best || v > best.v) best = { play: { card: card.id, region: r }, v };
  }
  return best;
}

/** Regions ordered by how long since they last received a card. */
function neglectedOrder(s: GameState): RegionId[] {
  const last: Record<RegionId, number> = { north: -1, mid: -1, southwest: -1, southeast: -1 };
  for (const h of s.history) for (const c of h.plays.cards) for (const r of [...(c.region ? [c.region] : []), ...(c.regions ?? [])]) last[r] = Math.max(last[r], h.term);
  return [...REGION_IDS].sort((a, b) => last[a] - last[b]);
}

/** Best subset of plays by value within budget and limit (exhaustive: hands are at most five). */
function bestSubset(m: CompiledModel, s: GameState, candidates: { play: CardPlay; v: number; card: Card }[], budget: number, extra?: (set: { card: Card }[]) => number): CardPlay[] {
  let best: CardPlay[] = [];
  let bestV = 0;
  const n = candidates.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const set = candidates.filter((_, i) => mask & (1 << i));
    if (set.length > s.cardLimit) continue;
    const cost = set.reduce((a, c) => a + E.cardCost(m, s, c.play), 0);
    if (cost > budget) continue;
    const v = set.reduce((a, c) => a + c.v, 0) + (extra ? extra(set) : 0);
    if (v > bestV) {
      bestV = v;
      best = set.map((c) => c.play);
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Visits

function bestVisit(m: CompiledModel, s: GameState): VisitChoice {
  const offer = s.visitOffer;
  if (!offer) return null;
  const ctx = makeContext(m);
  const board = ctx.places.get(offer.place)!;
  const order = { well: 2, adequately: 1, poorly: 0 };
  let best: { threads: string[]; g: number } | null = null;
  if (offer.place === "rhondda") {
    const ids = (board.tips ?? []).map((t) => t.id);
    const wet = offer.activeTrends.includes("wet-decade");
    for (const trio of combos(ids, offer.threads)) {
      const g = order[gradeRhondda(board, trio, wet).grade];
      if (!best || g > best.g) best = { threads: trio, g };
      if (g === 2) break;
    }
  } else {
    const ids = (board.options ?? []).map((o) => o.id);
    const played = s.history.flatMap((h) => h.plays.cards.map((c) => c.card)).concat(s.plays?.cards.map((c) => c.card) ?? []);
    for (const trio of combos(ids, offer.threads)) {
      const g = order[gradeBethesda(board, trio, { active: offer.activeTrends, inPlay: s.plays?.cards.map((c) => c.card) ?? [], everPlayed: played, seed: s.seed, runs: 40 }).grade];
      if (!best || g > best.g) best = { threads: trio, g };
      if (g === 2) break;
    }
  }
  return best ? { place: offer.place, threads: best.threads } : null;
}

function combos(ids: string[], k: number): string[][] {
  const out: string[][] = [];
  const rec = (start: number, acc: string[]) => {
    if (acc.length === k) {
      out.push(acc);
      return;
    }
    for (let i = start; i < ids.length; i++) rec(i + 1, [...acc, ids[i]!]);
  };
  rec(0, []);
  return out;
}

/** A plausible but unconsidered visit: the first options that look right. */
function naiveVisit(m: CompiledModel, s: GameState): VisitChoice {
  const offer = s.visitOffer;
  if (!offer) return null;
  const board = makeContext(m).places.get(offer.place)!;
  if (offer.place === "rhondda") {
    const ids = [...(board.tips ?? [])].sort((a, b) => b.buildingsBelow - a.buildingsBelow).map((t) => t.id);
    return { place: "rhondda", threads: ids.slice(0, offer.threads) };
  }
  return { place: "bethesda", threads: ["quarry-edge-homes", "rework-tips", "welsh-youth-centre"].slice(0, offer.threads) };
}

// ---------------------------------------------------------------------------
// The bots

const respondIf = (s: GameState, max: ShockResponse): ShockResponse => (s.shock ? (Math.min(max, Math.floor(s.budget.available)) as ShockResponse) : 0);

export const caretakerBot: Bot = {
  id: "caretaker",
  plan: (m, s) => caretakerPlays(makeContext(m), s),
  visit: () => null,
  respond: (_m, s) => respondIf(s, 2),
  pledge: () => null,
};

export const carelessBot: Bot = {
  id: "careless",
  plan: (m, s) => {
    const ctx = makeContext(m);
    const hand = [...s.hand].sort((a, b) => uniform(s.seed, "careless", s.term, a) - uniform(s.seed, "careless", s.term, b));
    const n = Math.floor(uniform(s.seed, "careless-n", s.term) * (s.cardLimit + 1));
    const cards: CardPlay[] = [];
    let budget = s.budget.available;
    for (const id of hand) {
      if (cards.length >= n) break;
      const card = ctx.cards.get(id)!;
      const regions = legalRegions(card);
      const r = regions[Math.floor(uniform(s.seed, "careless-r", s.term, id) * regions.length)]!;
      const play: CardPlay = card.scope === "national" ? { card: id } : card.scope === "two_regions" ? { card: id, regions: [r, regions.find((x) => x !== r)!] } : card.scope === "national_or_region" && uniform(s.seed, "careless-nat", s.term) < 0.5 ? { card: id } : { card: id, region: r };
      const cost = E.cardCost(m, s, play);
      if (cost <= budget) {
        cards.push(play);
        budget -= cost;
      }
    }
    const borrow = s.debts.length < 3 && uniform(s.seed, "careless-b", s.term) < 0.25;
    return { cards, standing: borrow ? "borrow-to-invest" : null };
  },
  visit: () => null,
  respond: () => 0,
  pledge: (_m, s) => s.pledgeOffer,
};

export const averageBot: Bot = {
  id: "average",
  plan: (m, s) => {
    const ctx = makeContext(m);
    const borrow = s.term === 2 && s.debts.length === 0;
    let budget = s.budget.available + (borrow ? 3 : 0);
    const weakest = [...s.strands].sort((a, b) => a.flow - b.flow).map((x) => x.strand);
    const cards: CardPlay[] = [];
    for (const target of weakest) {
      for (const id of s.hand) {
        if (cards.length >= s.cardLimit || cards.some((c) => c.card === id)) continue;
        const card = ctx.cards.get(id)!;
        if (!(card.helps ?? []).includes(target)) continue;
        const bp = bestPlay(ctx, s, card);
        if (!bp) continue;
        const cost = E.cardCost(m, s, bp.play);
        if (cost <= budget) {
          cards.push(bp.play);
          budget -= cost;
        }
      }
    }
    return { cards, standing: borrow ? "borrow-to-invest" : null };
  },
  visit: (m, s) => naiveVisit(m, s),
  respond: (_m, s) => respondIf(s, 1),
  pledge: (_m, s) => s.pledgeOffer,
};

interface ThoughtfulOpts {
  id: string;
  reserve?: number;
  only?: RegionId;
  visits?: boolean;
  dumpLast?: boolean;
  respond?: ShockResponse;
  filter?: (card: Card) => boolean;
  borrow?: (s: GameState) => boolean;
  stockWeight?: number;
  flowWeight?: number;
}

function thoughtful(o: ThoughtfulOpts): Bot {
  return {
    id: o.id,
    plan: (m, s) => {
      const ctx = makeContext(m);
      const borrow = o.borrow ? o.borrow(s) && s.debts.length < 3 : false;
      const shockable = s.activeTrends.some((t) => ctx.curveballs.get(t.curveball)!.shock);
      const reserve = o.reserve ?? (shockable ? 2 : 1);
      const last = s.term === m.game.years.length - 1;
      const cands = s.hand
        .map((id) => ctx.cards.get(id)!)
        .filter((c) => !o.filter || o.filter(c))
        .filter((c) => !(o.dumpLast && last && c.delay > 1))
        .flatMap((card) => {
          const bp = bestPlay(ctx, s, card, { ...(o.only ? { only: o.only } : {}), neglectBonus: o.only ? 0 : 0.08, stockWeight: o.stockWeight ?? 1, flowWeight: o.flowWeight ?? 1 });
          return bp ? [{ ...bp, card }] : [];
        });
      let budget = s.budget.available + (borrow ? 3 : 0) - reserve;
      // repay debt first when there is room
      let repay = 0;
      if (!borrow && s.debts.length && s.budget.available - reserve >= 3 + 2) {
        repay = 1;
        budget -= 3;
      }
      // keep Trust: value visible cards more when Trust is not strong
      const visibleBonus = s.trust < 60 ? 0.15 : 0.05;
      const cards = bestSubset(m, s, cands, Math.max(0, budget), (set) => (set.some((c) => c.card.delay <= 1) ? visibleBonus : 0) + (set.some((c) => c.card.delay >= 2) ? 0.05 : 0));
      return { cards, standing: borrow ? "borrow-to-invest" : null, repayDebt: repay };
    },
    visit: (m, s) => (o.visits === false ? null : bestVisit(m, s)),
    respond: (_m, s) => respondIf(s, o.respond ?? 2),
    pledge: (_m, s) => s.pledgeOffer,
  };
}

export const thoughtfulBot = thoughtful({ id: "thoughtful", flowWeight: 1.6, stockWeight: 0.8 });
export const flowBot = thoughtful({ id: "flow-greedy", stockWeight: 0.2, flowWeight: 3 });

/** The single-strategy bots of section 11.1. */
export const strategyBots: Bot[] = [
  thoughtful({ id: "growth-only", filter: (c) => c.tags.includes("growth"), reserve: 0, respond: 1 }),
  thoughtful({ id: "green-only", filter: (c) => c.tags.includes("green") || c.tags.includes("nature") }),
  thoughtful({ id: "borrower", borrow: () => true, reserve: 0, respond: 1 }),
  thoughtful({ id: "prevention-only", filter: (c) => c.tags.includes("prevention") }),
  thoughtful({ id: "south-east-only", only: "southeast" }),
  thoughtful({ id: "ignore-places", visits: false }),
  thoughtful({ id: "no-contingency", reserve: 0, respond: 0 }),
  thoughtful({ id: "end-game-dumper", dumpLast: true }),
];

/** A random-search bot (for the ceiling): random subsets, smart visits. */
export function randomBot(seed: number): Bot {
  return {
    id: `random-${seed}`,
    plan: (m, s) => {
      const ctx = makeContext(m);
      const cands = s.hand.flatMap((id) => {
        const card = ctx.cards.get(id)!;
        const regions = legalRegions(card);
        const r = regions[Math.floor(uniform(seed, "rr", s.term, id) * regions.length)]!;
        const play: CardPlay = card.scope === "national" ? { card: id } : card.scope === "two_regions" ? { card: id, regions: [r, regions.find((x) => x !== r)!] } : { card: id, region: r };
        return [{ play, v: uniform(seed, "rv", s.term, id), card }];
      });
      const reserve = Math.floor(uniform(seed, "res", s.term) * 3);
      const borrow = uniform(seed, "rb", s.term) < 0.15 && s.debts.length < 3;
      const cards = bestSubset(m, s, cands, Math.max(0, s.budget.available + (borrow ? 3 : 0) - reserve));
      return { cards, standing: borrow ? "borrow-to-invest" : null };
    },
    visit: (m, s) => bestVisit(m, s),
    respond: (_m, s) => respondIf(s, 2),
    pledge: (_m, s) => (uniform(seed, "rp", s.term) < 0.5 ? s.pledgeOffer : null),
  };
}

/** Play a whole game with a bot. */
export function playBot(m: CompiledModel, bot: Bot, seed: number | string, options: E.NewGameOptions = {}): GameState {
  let s = E.newGame(m, seed, { caretakerGhost: false, ...options });
  let guard = 0;
  while (s.step !== "ended" && guard++ < 100) {
    switch (s.step) {
      case "opening":
        s = E.dispatch(m, s, { type: "open" });
        break;
      case "pledge":
        s = E.dispatch(m, s, { type: "pledge", strand: bot.pledge(m, s) });
        break;
      case "plan": {
        let plays = bot.plan(m, s);
        if (E.validatePlays(m, s, plays).length) plays = { cards: [] };
        s = E.dispatch(m, s, { type: "commit", plays });
        break;
      }
      case "visit":
        s = E.dispatch(m, s, { type: "visit", choice: bot.visit(m, s) });
        break;
      case "passing":
        s = E.dispatch(m, s, { type: "respond", response: bot.respond(m, s) });
        break;
      case "caretaker":
        s = E.dispatch(m, s, { type: "caretaker", shadowPledge: [...s.strands].sort((a, b) => b.flow - a.flow)[0]!.strand });
        break;
      case "changed":
        s = E.dispatch(m, s, { type: "continue" });
        break;
      case "election":
        s = E.dispatch(m, s, { type: "next" });
        break;
    }
  }
  return s;
}

export const ALL_BOTS: Bot[] = [caretakerBot, carelessBot, averageBot, thoughtfulBot, ...strategyBots, flowBot];
