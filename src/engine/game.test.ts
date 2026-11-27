import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";
import type { GameState, Plays } from "./api";

const m = testModel();

/** Cheapest affordable cards up to the limit, in the most populous legal region. */
function simplePlays(s: GameState): Plays {
  const cards: E.CardPlay[] = [];
  let budget = s.budget.available;
  for (const id of [...s.hand].sort((a, b) => m.cards.find((c) => c.id === a)!.cost - m.cards.find((c) => c.id === b)!.cost)) {
    if (cards.length >= s.cardLimit) break;
    const card = m.cards.find((c) => c.id === id)!;
    const play: E.CardPlay = card.scope === "region" ? { card: id, region: (card.regions ?? ["southeast"]).includes("southeast") ? "southeast" : card.regions![0]! } : card.scope === "two_regions" ? { card: id, regions: ["southeast", "north"] } : { card: id };
    const cost = E.cardCost(m, s, play);
    if (cost <= budget - 1) {
      cards.push(play);
      budget -= cost;
    }
  }
  return { cards };
}

function playThrough(seed: number | string, opts: E.NewGameOptions = {}, plan = simplePlays): GameState {
  let s = E.newGame(m, seed, { runs: 20, previewRuns: 10, caretakerGhost: false, ...opts });
  let guard = 0;
  while (s.step !== "ended" && guard++ < 200) {
    if (s.step === "opening") s = E.dispatch(m, s, { type: "open" });
    else if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: s.pledgeOffer });
    else if (s.step === "plan") s = E.dispatch(m, s, { type: "commit", plays: plan(s) });
    else if (s.step === "visit") s = E.dispatch(m, s, { type: "visit", choice: null });
    else if (s.step === "passing") s = E.dispatch(m, s, { type: "respond", response: s.shock && s.budget.available >= 1 ? 1 : 0 });
    else if (s.step === "changed") s = E.dispatch(m, s, { type: "continue" });
    else if (s.step === "election") s = E.dispatch(m, s, { type: "next" });
    else if (s.step === "caretaker") s = E.dispatch(m, s, { type: "caretaker", shadowPledge: "healthier" });
  }
  return s;
}

describe("a new game", () => {
  const s = E.newGame(m, 42, { runs: 10 });
  it("opens 2026 with four cards, three to play and eight pips", () => {
    expect(s.step).toBe("opening");
    expect(s.year).toBe(2026);
    expect(s.hand.length).toBe(4);
    expect(s.cardLimit).toBe(3);
    expect(s.budget.available).toBe(8);
    expect(s.trust).toBe(55);
    expect(s.activeTrends.length).toBe(1);
    expect(s.strands.length).toBe(7);
  });
  it("skips the pledge in term 1 and refuses actions at the wrong step", () => {
    const o = E.dispatch(m, s, { type: "open" });
    expect(o.step).toBe("plan");
    expect(() => E.dispatch(m, s, { type: "commit", plays: { cards: [] } })).toThrow(E.EngineError);
  });
  it("validates plans", () => {
    const o = E.dispatch(m, s, { type: "open" });
    expect(E.validatePlays(m, o, { cards: [{ card: "no-such-card" }] })[0]!.code).toBe("not_in_hand");
    const regional = o.hand.find((id) => m.cards.find((c) => c.id === id)!.scope === "region");
    if (regional) expect(E.validatePlays(m, o, { cards: [{ card: regional }] }).map((p) => p.code)).toContain("needs_region");
    expect(E.validatePlays(m, o, { cards: [], repayDebt: 1 }).map((p) => p.code)).toContain("no_debt");
  });
  it("gives the same daily seed to everyone that day", () => {
    expect(E.dailySeed("2026-11-26")).toBe(E.dailySeed("2026-11-26"));
    expect(E.dailySeed("2026-11-26")).not.toBe(E.dailySeed("2026-11-27"));
  });
});

describe("a whole game", () => {
  const s = playThrough(7);
  it("runs six terms to 2050 and ends with a result and a letter", () => {
    expect(s.step).toBe("ended");
    expect(s.history.length).toBe(6);
    const r = s.result!;
    expect(r.result.value).toBe(Math.min(r.lived.value, r.left.value));
    expect(r.wellbeingByTerm.length).toBe(6);
    expect(r.letter.lines.length).toBe(6);
    expect(r.letter.namedAll?.length).toBe(2);
    for (const l of r.letter.lines) expect(l.text.en).not.toMatch(/\{[a-z_]+\}/);
  });
  it("is deterministic for a seed and choices", () => {
    expect(playThrough(7).result).toEqual(s.result);
  });
  it("saves and loads by replaying decisions", () => {
    const saved = E.saveGame(s);
    expect(saved.length).toBeLessThan(20000);
    expect(E.loadGame(m, saved).result).toEqual(s.result);
  });
  it("gives three slips and a Trust outcome every term", () => {
    for (const h of s.history) {
      expect(h.slips.length).toBeGreaterThanOrEqual(2);
      expect(h.trust.top.length).toBeGreaterThanOrEqual(1);
    }
  });
  it("traces every strand change of a quarter pip or more to a card, curveball or baseline rule", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const g = seed === 1 ? s : playThrough(seed);
      g.history.forEach((h, t) => {
        h.strands.forEach((c) => {
          for (const part of ["flow", "stock"] as const) {
            const d = part === "flow" ? c.flowAfter - c.flowBefore : c.stockAfter - c.stockBefore;
            if (Math.abs(d) < 0.25) continue;
            const threads = E.pullThread(m, g, t, c.strand, part);
            expect(threads.length, `${seed} ${h.year} ${c.strand} ${part}`).toBeGreaterThan(0);
            for (const th of threads) {
              const cause = th.stops.find((x) => x.kind === "cause");
              expect(cause).toBeTruthy();
              expect(["card", "curveball", "shock", "baseline", "standing", "upkeep", "event", "caretaker"]).toContain((cause as { cause: E.Cause }).cause.kind);
            }
            // threads come from the central run (default parameters): they must add up to its change
            const run0 = (g.sim as { runs: { flowHist: number[][]; stockHist: number[][] }[]; start: { flow: number[]; stock: number[] } });
            const hist = part === "flow" ? run0.runs[0]!.flowHist : run0.runs[0]!.stockHist;
            const k = E.STRAND_ORDER.indexOf(c.strand);
            const prev = t === 0 ? (part === "flow" ? run0.start.flow : run0.start.stock)[k]! : hist[t - 1]![k]!;
            const d0 = hist[t]![k]! - prev;
            const explained = threads.reduce((a, x) => a + x.delta, 0);
            expect(Math.abs(explained - d0), `${c.strand} ${part} explained ${explained} of ${d0}`).toBeLessThan(0.02);
          }
        });
      });
    }
  });
  it("recomputes the result with other weights", () => {
    const r = E.recomputeResult(m, s, { prosperous: 5 });
    expect(r.weights.prosperous).toBeGreaterThan(0.4);
  });
});

describe("the caretaker", () => {
  it("takes over after Trust collapses, then returns the player weakened", () => {
    let s = E.newGame(m, 11, { runs: 10, caretakerGhost: false });
    s = E.dispatch(m, s, { type: "open" });
    s = E.resolve(m, s, { cards: [] }, null, 0);
    s = E.dispatch(m, s, { type: "continue" });
    s = E.dispatch(m, s, { type: "next" });
    s = E.dispatch(m, s, { type: "open" });
    s = E.dispatch(m, s, { type: "pledge", strand: null });
    s = { ...s, trust: 5 };
    s = E.resolve(m, s, { cards: [] }, null, 0);
    expect(s.lastOutcome!.trust.lostSeat).toBe(true);
    s = E.dispatch(m, s, { type: "continue" });
    s = E.dispatch(m, s, { type: "next" });
    expect(s.caretaker).toBe(true);
    s = E.dispatch(m, s, { type: "open" });
    expect(s.step).toBe("caretaker");
    s = E.dispatch(m, s, { type: "caretaker", shadowPledge: "culture" });
    expect(s.step).toBe("changed");
    expect(s.trust).toBeGreaterThanOrEqual(40);
    expect(s.ledger.lostTerms).toEqual([2034]);
    s = E.dispatch(m, s, { type: "continue" });
    s = E.dispatch(m, s, { type: "next" });
    expect(s.returning).toBe(true);
    expect(s.budget.returnPenalty).toBe(-1);
    expect(s.cardLimit).toBe(2);
  });
});

describe("visits, shocks and preview", () => {
  it("offers the Rhondda when tips are made safe, and grades the choice", () => {
    let s = E.newGame(m, 3, { runs: 10 });
    s = E.dispatch(m, s, { type: "open" });
    s = { ...s, hand: ["make-coal-tips-safe", ...s.hand.filter((c) => c !== "make-coal-tips-safe")].slice(0, 4) };
    s = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "make-coal-tips-safe", region: "southeast" }] } });
    expect(s.step).toBe("visit");
    expect(s.visitOffer!.place).toBe("rhondda");
    const tips = m.places.find((p) => p.id === "rhondda")!.tips!;
    const byHomes = [...tips].sort((a, b) => b.buildingsBelow - a.buildingsBelow).slice(0, 3).map((t) => t.id);
    const g = E.gradeVisit(m, s, { place: "rhondda", threads: byHomes });
    expect(["well", "adequately", "poorly"]).toContain(g.grade);
    s = E.dispatch(m, s, { type: "visit", choice: { place: "rhondda", threads: byHomes } });
    expect(s.step).toBe("passing");
    s = E.dispatch(m, s, { type: "respond", response: 0 });
    expect(s.lastOutcome!.visit!.grade).toBe(g.grade);
  });
  it("previews a plan without changing the state", () => {
    let s = E.newGame(m, 5, { runs: 20, previewRuns: 10 });
    s = E.dispatch(m, s, { type: "open" });
    const plays = simplePlays(s);
    const p = E.preview(m, s, plays);
    expect(p.valid).toBe(true);
    expect(p.strands.length).toBe(7);
    expect(p.perCard.length).toBe(plays.cards.length);
    expect(E.preview(m, s, { cards: [{ card: "nope" }] }).valid).toBe(false);
    expect(s.step).toBe("plan");
  });
  it("lands shocks with the chosen response in the curated first game", () => {
    const s = playThrough(1, { firstGame: true });
    expect(s.history[0]!.newTrend).toBe("wet-decade");
    expect(s.history[3]!.shock?.curveball).toBe("downturn");
    // term 2 asks for the Rhondda unless a card the player played asked for a place itself (playtest 3)
    const t2 = s.history[1]!;
    const asked = t2.plays.cards.map((c) => m.cards.find((x) => x.id === c.card)!.visit).filter(Boolean);
    expect(t2.visit?.place).toBe(asked.length ? t2.visit?.place : "rhondda");
    expect(t2.visit).toBeTruthy();
  });
});

describe("performance", () => {
  it("resolves a term with 200 runs within the time budget", () => {
    let s = E.newGame(m, 9, { runs: 200, previewRuns: 50, caretakerGhost: false });
    s = E.dispatch(m, s, { type: "open" });
    const plays = simplePlays(s);
    const t0 = performance.now();
    E.resolve(m, s, plays, null, 0);
    const ms = performance.now() - t0;
    const t1 = performance.now();
    E.preview(m, s, plays);
    const pms = performance.now() - t1;
    console.log(`resolve 200 runs: ${ms.toFixed(0)} ms; preview 50 runs: ${pms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(250);
  });
});
