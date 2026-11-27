// Plain Wales (docs/design/plain-wales.md section 10): the running scores (E1), the first game's
// deal and quiet first turn (E2), and what mattered (E3). Additive: no rule or number moves.
import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";
import { playBot, thoughtfulBot, carelessBot, averageBot } from "./bots";
import { buildSchedule } from "./schedule";
import { makeContext } from "./scores";
import { REGION_IDS, STRAND_IDS } from "../model/schema";

const m = testModel();
const FIRST = ["build-flood-walls", "warm-homes", "welsh-medium-childcare", "everyone-online"];

describe("E1: the two running scores out of 100", () => {
  it("starts at the 2026 levels and stays between 0 and 100", () => {
    const s = E.newGame(m, 5, { runs: 10, caretakerGhost: false });
    const h = E.headline(m, s);
    expect(h.final).toBe(false);
    expect(h.lifeNow).toBeCloseTo(h.start.lifeNow, 6);
    expect(h.left2050).toBeCloseTo(h.start.left2050, 6);
    for (const v of [h.lifeNow, h.left2050]) expect(v > 0 && v < 100).toBe(true);
  });

  for (const [bot, seed] of [[thoughtfulBot, 11], [carelessBot, 12], [averageBot, 13]] as const) {
    it(`at the end equals the result's levels times ten (${bot.id})`, () => {
      const g = playBot(m, bot, seed, { runs: 8, caretakerGhost: false });
      const r = g.result!;
      const h = E.headline(m, g);
      expect(h.final).toBe(true);
      expect(h.lifeNow).toBeCloseTo(r.livedLevel * 10, 9);
      expect(h.left2050).toBeCloseTo(r.leftLevel * 10, 9);
      expect(h.start.lifeNow).toBeCloseTo(r.start.lived * 10, 9);
      expect(h.start.left2050).toBeCloseTo(r.start.left * 10, 9);
      // the score change is the judged change over seven: the UI never has to guess
      expect(r.livedLevel - r.start.lived).toBeCloseTo(r.lived.value / STRAND_IDS.length, 9);
      expect(r.leftLevel - r.start.left).toBeCloseTo(r.left.value / STRAND_IDS.length, 9);
    });
  }
});

describe("E2: the first game's deal", () => {
  it("deals the same four cards in turn 1 of every first game, nine coins of cards for eight", () => {
    for (const seed of [1, 2, 3, 99, "wales"]) {
      const s = E.newGame(m, seed, { runs: 6, firstGame: true, caretakerGhost: false });
      expect(s.hand).toEqual(FIRST);
      expect(s.deck.some((id) => FIRST.includes(id))).toBe(false);
      expect(s.hand.reduce((a, id) => a + m.cards.find((c) => c.id === id)!.cost, 0)).toBe(9);
      expect(s.budget.available).toBe(8);
    }
  });

  it("keeps every card in the deck (twenty in all)", () => {
    const s = E.newGame(m, 4, { runs: 6, firstGame: true, caretakerGhost: false });
    expect(new Set([...s.hand, ...s.deck]).size).toBe(m.cards.length);
  });

  it("never deals Regional compact before turn 3 of a first game", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = playBot(m, thoughtfulBot, seed, { runs: 2, firstGame: true, caretakerGhost: false });
      const deals = g.history.slice(0, 2).map((h) => h.plays.cards.map((c) => c.card));
      for (const d of deals) expect(d.includes("regional-compact"), `seed ${seed}`).toBe(false);
    }
    // and from the hand itself, turn 2
    for (let seed = 1; seed <= 40; seed++) {
      let s = E.newGame(m, seed, { runs: 2, firstGame: true, caretakerGhost: false });
      s = E.dispatch(m, s, { type: "open" });
      s = E.resolve(m, s, { cards: [] }, null, 0);
      s = E.dispatch(m, s, { type: "continue" });
      s = E.dispatch(m, s, { type: "next" });
      expect(s.hand.includes("regional-compact"), `seed ${seed}`).toBe(false);
    }
  });

  it("an ordinary game still deals from the shuffled deck", () => {
    const hands = new Set([1, 2, 3, 4, 5].map((seed) => E.newGame(m, seed, { runs: 2, caretakerGhost: false }).hand.join(",")));
    expect(hands.size).toBeGreaterThan(1);
  });

  it("no crisis can land in turn 1, first game or not", () => {
    const ctx = makeContext(m);
    for (let seed = 0; seed < 300; seed++) {
      for (const first of [true, false]) expect(buildSchedule(ctx, seed, first)[0]!.shock, `seed ${seed}`).toBeNull();
    }
    const s = E.dispatch(m, E.newGame(m, 8, { runs: 6, firstGame: true, caretakerGhost: false }), { type: "open" });
    const c = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "everyone-online" }] } });
    const p = c.step === "visit" ? E.dispatch(m, c, { type: "visit", choice: null }) : c;
    expect(p.shock).toBeNull();
  });

  // Played in any region the walls lift Nature and floods; only where most homes are at risk (the
  // South East, by the real data) is the lift a whole point by 2030. The guide steers there by the
  // data and words the other regions honestly ("helped, but by less than a whole point").
  it("Build flood walls in turn 1: always helps its bar, and a whole point where most homes are at risk", () => {
    const fe = m.la_data["flood_exposure"]!.values;
    const homes: Record<string, number> = {};
    for (const a of m.authorities) homes[a.region] = (homes[a.region] ?? 0) + ((fe[a.code] ?? 0) / 100) * a.population;
    const most = REGION_IDS.reduce((b, r) => (homes[r]! > homes[b]! ? r : b), REGION_IDS[0]!);
    expect(most).toBe("southeast");
    const card = m.cards.find((c) => c.id === "build-flood-walls")!;
    const strand = "resilient";
    expect(card.helps).toContain(strand);
    for (const seed of [21, 3, 1234]) {
      for (const region of REGION_IDS) {
        let s = E.newGame(m, seed, { runs: 30, firstGame: true, caretakerGhost: false });
        s = E.dispatch(m, s, { type: "open" });
        const before = s.strands.find((v) => v.strand === strand)!.flowPips;
        const without = E.resolve(m, s, { cards: [] }, null, 0).strands.find((v) => v.strand === strand)!.flow;
        const w = E.resolve(m, s, { cards: [{ card: "build-flood-walls", region }] }, null, 0);
        expect(w.strands.find((v) => v.strand === strand)!.flow, region).toBeGreaterThan(without);
        if (region !== most) continue;
        expect(w.strands.find((v) => v.strand === strand)!.flowPips - before, `${seed} ${region}`).toBeGreaterThanOrEqual(1);
        expect(w.lastOutcome!.slips.some((sl) => sl.cause.id === "build-flood-walls" && sl.strand === strand), region).toBe(true);
      }
    }
  });
});

describe("E3: what mattered", () => {
  it("returns up to three things, largest first, each with a year", () => {
    for (const [bot, seed] of [[thoughtfulBot, 31], [carelessBot, 32], [averageBot, 33]] as const) {
      const g = playBot(m, bot, seed, { runs: 6, caretakerGhost: false });
      const w = E.whatMattered(m, g);
      expect(w.length).toBeGreaterThan(0);
      expect(w.length).toBeLessThanOrEqual(3);
      for (let i = 1; i < w.length; i++) expect(Math.abs(w[i - 1]!.size)).toBeGreaterThanOrEqual(Math.abs(w[i]!.size));
      for (const x of w) {
        expect(E.TERM_YEARS).toContain(x.year);
        if (x.kind === "card") expect(m.cards.some((c) => c.id === x.id)).toBe(true);
      }
    }
  });

  it("names coins left unused in three or more turns", () => {
    let s = E.newGame(m, 41, { runs: 4, caretakerGhost: false });
    // play one cheap card a turn and leave the rest: coins are lost every turn
    while (s.step !== "ended") {
      if (s.step === "opening") s = E.dispatch(m, s, { type: "open" });
      else if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: null });
      else if (s.step === "plan") s = E.dispatch(m, s, { type: "commit", plays: { cards: [] } });
      else if (s.step === "visit") s = E.dispatch(m, s, { type: "visit", choice: null });
      else if (s.step === "passing") s = E.dispatch(m, s, { type: "respond", response: 0 });
      else if (s.step === "changed") s = E.dispatch(m, s, { type: "continue" });
      else if (s.step === "election") s = E.dispatch(m, s, { type: "next" });
      else if (s.step === "caretaker") s = E.dispatch(m, s, { type: "caretaker", shadowPledge: "healthier" });
    }
    const u = E.unusedCoins(m, s);
    expect(u.turns).toBeGreaterThanOrEqual(3);
    expect(u.coins).toBeGreaterThan(10);
    expect(E.whatMattered(m, s, 6).some((x) => x.kind === "coins_unused" && x.coins === u.coins)).toBe(true);
  });

  it("counts no coins lost when everything is spent or carried", () => {
    const g = playBot(m, thoughtfulBot, 7, { runs: 4, caretakerGhost: false });
    const u = E.unusedCoins(m, g);
    expect(u.perTurn.length).toBe(g.history.length);
    expect(u.perTurn.every((n) => n >= 0)).toBe(true);
  });
});
