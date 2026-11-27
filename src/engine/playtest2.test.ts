/** Regressions from playtest 2 (docs/design/playtest-2.md). */
import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";
import { playBot, thoughtfulBot, carelessBot, averageBot } from "./bots";

const m = testModel();
const games = [thoughtfulBot, carelessBot, averageBot].flatMap((b) => [1, 2, 3, 4].map((seed) => playBot(m, b, seed, { runs: 10 })));

describe("slips agree with tickets", () => {
  it("never credits a card before its first effects arrive", () => {
    for (const g of games)
      for (const h of g.history)
        for (const x of h.slips) {
          if (x.cause.kind !== "card" && x.cause.kind !== "caretaker") continue;
          const card = m.cards.find((c) => c.id === x.cause.id)!;
          // a printed side effect lands at once and may be named; nothing else before arrival
          if (x.sideEffect) continue;
          expect(h.term, `${x.cause.id} played ${x.cause.year}, slip ${h.year}`).toBeGreaterThanOrEqual(x.cause.term + card.arrival!.first);
        }
  });
  it("never names a card for a strand its ticket does not show, in that direction", () => {
    for (const g of games)
      for (const h of g.history)
        for (const x of h.slips) {
          if ((x.cause.kind !== "card" && x.cause.kind !== "caretaker") || x.recovery) continue;
          const card = m.cards.find((c) => c.id === x.cause.id)!;
          const shown = x.delta > 0 ? [...card.helps!, ...card.mixed!] : [...card.frays!, ...card.mixed!];
          expect(shown, `${card.id} ${x.delta > 0 ? "lifted" : "wore down"} ${x.strand} in ${h.year}`).toContain(x.strand);
        }
  });
  it("never has a shock lift a strand (its end is recovery)", () => {
    for (const g of games) for (const h of g.history) for (const x of h.slips) if (x.cause.kind === "shock" && x.delta > 0 && !m.curveballs.find((c) => c.id === x.cause.id)!.opportunity) expect(x.recovery, `${h.year}`).toBe(true);
  });
  it("opens each slip's own thread, whose cause is the slip's cause", () => {
    for (const g of games.slice(0, 6))
      for (const h of g.history)
        for (const x of h.slips) {
          expect(x.thread).toBeTruthy();
          const threads = E.pullThread(m, g, x.thread!.term, x.thread!.strand, x.thread!.part);
          const t = threads.find((th) => th.key === x.thread!.key);
          expect(t, `${h.year} ${x.strand} ${x.cause.id}`).toBeTruthy();
          const cause = t!.stops.find((s) => s.kind === "cause") as { cause: E.Cause };
          expect(cause.cause).toEqual(x.cause);
        }
  });
  it("says what the response bought on the shock slip", () => {
    for (const g of games) for (const h of g.history) if (h.shock) {
      const sl = h.slips.find((x) => x.shock);
      if (sl) expect(sl.response).toEqual({ pips: h.shock.response, hit: h.shock.hit, prepared: h.shock.prepared });
    }
  });
});

describe("one rule for when a card lands", () => {
  it("puts the card on the post at its full arrival and says when its first effects land", () => {
    for (const g of games)
      for (const h of g.history)
        for (const a of h.arrivals) {
          const card = m.cards.find((c) => c.id === a.card)!;
          expect(a.arrivesTerm - a.playedTerm).toBe(card.arrival!.full);
          expect(a.firstTerm! - a.playedTerm).toBe(card.arrival!.first);
        }
    const cow = m.cards.find((c) => c.id === "community-owned-energy")!;
    expect(cow.arrival).toEqual({ first: 1, full: 2 });
  });
});

describe("Bethesda remembers earlier threads", () => {
  it("counts options placed on an earlier visit and says so", async () => {
    const { gradeBethesda } = await import("./places");
    const be = m.places.find((p) => p.id === "bethesda")!;
    const ctx = { active: [], inPlay: [], everPlayed: ["skills-and-apprenticeships"], seed: 3, runs: 50, text: m.engine_text };
    const fresh = gradeBethesda(be, ["room-for-river", "park-and-ride"], ctx);
    const after = gradeBethesda(be, ["room-for-river", "park-and-ride"], { ...ctx, stitched: ["chapel-homes", "quarry-workshops", "welsh-youth-centre"] });
    expect(fresh.tests.find((t) => t.id === "aros")!.explanation!.en).toMatch(/none of your picks/);
    expect(after.tests.find((t) => t.id === "aros")!.explanation!.en).toMatch(/Empty chapel/);
    expect(after.tests.filter((t) => t.pass).length).toBeGreaterThan(fresh.tests.filter((t) => t.pass).length);
    expect(after.notes.some((n) => /Already in place from an earlier visit/.test(n.en))).toBe(true);
  });
});

describe("trust leaks", () => {
  it("gates voices that name a choice on that choice having been made", async () => {
    const { pickVoice } = await import("./voices");
    const { makeContext } = await import("./scores");
    const ctx = makeContext(m);
    const la = 1;
    for (let term = 0; term < 6; term++) {
      const v = pickVoice(ctx, term + 1, term, [{ event: "visit", place: "bethesda", grade: "adequately", la, threads: ["welsh-youth-centre"], tests: {}, cards: [] }], []);
      expect(v?.template).not.toBe("visit-deiniolen-bethesda-adequately");
      const w = pickVoice(ctx, term + 1, term, [{ event: "shock", curveball: "wet-decade", response: "ready", la, cards: ["slow-the-flow"] }], []);
      expect(w?.template).not.toBe("shock-rhyl-wet-decade-ready");
    }
    const yes = pickVoice(ctx, 1, 0, [{ event: "shock", curveball: "wet-decade", response: "ready", la, cards: ["build-flood-walls"] }], m.voices.filter((v) => v.id !== "shock-rhyl-wet-decade-ready").map((v) => v.id));
    expect(yes?.template).toBe("shock-rhyl-wet-decade-ready");
  });
  it("names every kept promise first in the letter when all of three or more were kept", () => {
    for (const g of games) {
      const made = g.ledger.pledges.filter((p) => p.kept !== null);
      if (made.length >= 3 && made.every((p) => p.kept)) expect(g.result!.letter.namedAll![0]!.kind, `${g.seed}`).toBe(g.result!.archetype === "uneven" ? "neglect" : "pledge_kept");
    }
  });
  it("only calls a term the worst if people were worse off in it", () => {
    for (const g of games) {
      const r = g.result!;
      const w = r.wellbeingByTerm;
      expect(r.worstFell).toBe(w[r.worstTerm]! < r.start.lived || (r.worstTerm > 0 && w[r.worstTerm]! < w[r.worstTerm - 1]!));
    }
  });
  it("does not offer a third visit to a place graded well twice; its cards then deliver well", () => {
    let s = E.newGame(m, 2, { runs: 4, caretakerGhost: false });
    s = E.dispatch(m, s, { type: "open" });
    s = { ...s, hand: ["tourism-pays-its-way", ...s.hand.slice(1)], ledger: { ...s.ledger, grades: [{ place: "bethesda", year: 2026, grade: "well" }, { place: "bethesda", year: 2030, grade: "well" }] } };
    const after = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "tourism-pays-its-way", region: "north" }] } });
    expect(after.visitOffer).toBeNull();
    const done = E.dispatch(m, after, { type: "respond", response: 0 });
    expect(done.lastOutcome!.visit).toMatchObject({ place: "bethesda", grade: "well", mastered: true });
  });
});
