/** Regressions from playtest 4 (docs/design/playtest-4.md). */
import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";
import { playBot, thoughtfulBot, carelessBot, averageBot, type Bot } from "./bots";
import { gradeBethesda, gradeRhondda } from "./places";
import { buildSchedule } from "./schedule";
import { makeContext } from "./scores";
import { needsPartner, paysInTime } from "./deck";
import { pickVoice } from "./voices";

const m = testModel();
const ctx = makeContext(m);
const card = (id: string) => m.cards.find((c) => c.id === id)!;

/** Walk a game with no plays to the plan step of `term`, keeping Trust Fair. */
function planAt(term: number, seed = 3, firstGame = false): E.GameState {
  let s = E.newGame(m, seed, { runs: 20, previewRuns: 20, caretakerGhost: false, firstGame });
  while (!(s.step === "plan" && s.term === term)) {
    s =
      s.step === "opening" ? E.dispatch(m, s, { type: "open" })
      : s.step === "pledge" ? E.dispatch(m, s, { type: "pledge", strand: null })
      : s.step === "plan" ? E.dispatch(m, s, { type: "commit", plays: { cards: [] } })
      : s.step === "visit" ? E.dispatch(m, s, { type: "visit", choice: null })
      : s.step === "passing" ? E.dispatch(m, s, { type: "respond", response: 0 })
      : s.step === "changed" ? E.dispatch(m, s, { type: "continue" })
      : s.step === "election" ? E.dispatch(m, { ...s, trust: 60 }, { type: "next" })
      : E.dispatch(m, s, { type: "caretaker", shadowPledge: "culture" });
  }
  return { ...s, budget: { ...s.budget, available: 10 } };
}
const withHand = (s: E.GameState, cards: string[]) => ({ ...s, hand: [...cards, ...s.hand.filter((c) => !cards.includes(c))].slice(0, 5) });

describe("the last hand offers a visible win (item 2)", () => {
  it("only cards that land in full this term and work alone count", () => {
    expect(needsPartner(card("regional-compact"))).toBe(true);
    expect(paysInTime(card("regional-compact"), 5, 5)).toBe(false);
    expect(paysInTime(card("land-a-big-employer"), 5, 5)).toBe(true);
    expect(paysInTime(card("homes-for-locals"), 5, 5)).toBe(false);
  });
  it("deals term 6 a card that lands by 2050 and does something by itself, in every game", () => {
    const bots: Bot[] = [thoughtfulBot, carelessBot, averageBot];
    for (const bot of bots)
      for (let seed = 1; seed <= 8; seed++)
        for (const firstGame of [false, true]) {
          const g = playBot(m, bot, seed, { runs: 4, firstGame });
          const last = (g.sim as { hands: string[][] }).hands[5]!;
          expect(last.some((id) => paysInTime(card(id), 5, 5)), `${bot.id} ${seed} ${last.join(",")}`).toBe(true);
        }
  });
  it("previews that card as a win this term, not a landing after 2050", () => {
    const s = withHand(planAt(5), ["land-a-big-employer"]);
    const p = E.preview(m, s, { cards: [{ card: "land-a-big-employer", region: "southeast" }] }).perCard[0]!;
    expect(p.landsAfterGame).toBe(false);
    expect(p.nothingThisTerm).toBe(false);
    expect(p.needsPartner).toBeUndefined();
    expect(p.real).toContain("prosperous");
  });
});

describe("VERY WELL (item 3)", () => {
  const rh = m.places.find((p) => p.id === "rhondda")!;
  const be = m.places.find((p) => p.id === "bethesda")!;
  const tip = (n: number) => rh.tips!.find((t) => t.n === n)!.id;
  it("keeps its margins in the model, not in code", () => {
    expect(be.very_well?.share).toBeGreaterThan(be.hold_share!);
    expect(rh.very_well?.exposure_margin).toBeGreaterThan(0);
    expect(m.game.grade_multiplier.very_well).toBeGreaterThan(m.game.grade_multiplier.well);
    expect(m.game.trust.visit.very_well).toBeGreaterThan(m.game.trust.visit.well);
  });
  it("Rhondda: all tests held is well, with room to spare very well (earlier tips count)", () => {
    const tight = gradeRhondda(rh, [tip(2), tip(13), tip(16)], true, { text: m.engine_text });
    expect(tight.tests.every((t) => t.pass)).toBe(true);
    expect(tight.grade).toBe("well");
    expect(tight.notes.some((n) => n.en.startsWith("Every test passed. For room to spare"))).toBe(true);
    const roomy = gradeRhondda(rh, [tip(4), tip(8), tip(14)], true, { stitched: [tip(2), tip(13), tip(16)], text: m.engine_text });
    expect(roomy.grade).toBe("very_well");
    expect(roomy.notes.some((n) => n.en === "Every test passed, with room to spare.")).toBe(true);
  });
  it("Bethesda: very well only when every test holds in the share of runs the board asks", () => {
    const ids = be.options!.map((o) => o.id);
    const c = { active: [] as string[], inPlay: ["homes-for-locals"], everPlayed: ["homes-for-locals", "skills-and-apprenticeships"], seed: 11, runs: 200 };
    let seen = { very: 0, well: 0 };
    for (let a = 0; a < 10; a++)
      for (let b = a + 1; b < 10; b++)
        for (let d = b + 1; d < 10; d++) {
          const r = gradeBethesda(be, [ids[a]!, ids[b]!, ids[d]!], c);
          const roomy = r.tests.every((t) => t.share >= be.very_well!.share!);
          if (r.grade === "very_well") seen.very++;
          if (r.grade === "well" && r.tests.every((t) => t.pass)) seen.well++;
          expect(r.grade === "very_well", r.tests.map((t) => t.share).join(",")).toBe(roomy);
        }
    // both cases exist: some trios hold everything with room, some only just
    expect(seen.very).toBeGreaterThan(0);
    expect(seen.well).toBeGreaterThan(0);
  });
  it("counts very well as good: two of them and the place runs itself", () => {
    let s = planAt(3, 4);
    s = { ...s, options: { ...s.options, firstGame: false }, ledger: { ...s.ledger, grades: [{ place: "bethesda", year: 2026, grade: "very_well" }, { place: "bethesda", year: 2030, grade: "well" }] } };
    s = withHand(s, ["homes-for-locals"]);
    const after = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "homes-for-locals", region: "north" }] } });
    expect(after.visitOffer).toBeNull();
    const done = E.dispatch(m, after, { type: "respond", response: 0 });
    expect(done.lastOutcome!.visit?.mastered).toBe(true);
  });
  it("hears a very well voice, and a well one when no very well voice fits", () => {
    const v = pickVoice(ctx, 1, 1, [{ event: "visit", place: "bethesda", grade: "very_well", la: 1, threads: [], tests: {}, cards: [] }], []);
    expect(m.voices.find((x) => x.id === v!.template)!.grade).toBe("very_well");
    const used = m.voices.filter((x) => x.grade === "very_well").map((x) => x.id);
    const w = pickVoice(ctx, 1, 1, [{ event: "visit", place: "bethesda", grade: "very_well", la: 1, threads: [], tests: {}, cards: [] }], used);
    expect(["well", "very_well"]).toContain(m.voices.find((x) => x.id === w!.template)!.grade);
    // a well visit never hears a very well voice
    for (let seed = 1; seed < 30; seed++) {
      const x = pickVoice(ctx, seed, 1, [{ event: "visit", place: "rhondda", grade: "well", la: 1, threads: [], tests: {}, cards: [] }], []);
      expect(m.voices.find((y) => y.id === x!.template)!.grade).not.toBe("very_well");
    }
  });
});

describe("term conditions on the board (item 4)", () => {
  it("shows Bethesda's price-of-a-home condition before the player chooses, and nothing when no trend applies", () => {
    const s = planAt(1, 3, true);
    expect(s.activeTrends.map((a) => a.curveball)).toContain("price-of-a-home");
    const b = E.placeBoard(m, s, "bethesda");
    expect(b.termConditions.map((t) => t.en)).toContain("House prices pull away: one homes pick is not enough.");
    expect(b.options!.length).toBe(10);
    const none = { ...s, activeTrends: [] };
    expect(E.placeBoard(m, none, "bethesda").termConditions).toEqual([]);
    expect(E.placeBoard(m, none, "rhondda").termConditions).toEqual([]);
  });
  it("shows the wet decade on the Rhondda board, and the same list on the visit offer", () => {
    let s = withHand(planAt(1, 3, true), ["make-coal-tips-safe"]);
    expect(E.placeBoard(m, s, "rhondda").termConditions.length).toBe(1);
    s = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "make-coal-tips-safe", region: "southeast" }] } });
    expect(s.visitOffer!.place).toBe("rhondda");
    expect(s.visitOffer!.termConditions).toEqual(E.placeBoard(m, s, "rhondda").termConditions);
    for (const t of s.visitOffer!.termConditions) expect(t.cy.length).toBeGreaterThan(0);
  });
});

describe("preview leftovers (item 5)", () => {
  it("Regional compact alone: needs a partner, and never 'Lands' with nothing after it", () => {
    const s = withHand(planAt(1), ["regional-compact"]);
    const p = E.preview(m, s, { cards: [{ card: "regional-compact", regions: ["north", "mid"] }] }).perCard[0]!;
    expect(p.needsPartner).toBe(true);
    expect(p.real).toEqual([]);
    expect(p.nothingThisTerm).toBe(false);
    expect(p.landsAfterGame).toBe(false);
  });
  it("Regional compact with a card it enables: shows what it adds, landing when that card lands", () => {
    const s = withHand(planAt(1), ["regional-compact", "community-owned-energy"]);
    const p = E.preview(m, s, { cards: [{ card: "regional-compact", regions: ["north", "mid"] }, { card: "community-owned-energy", region: "north" }] }).perCard[0]!;
    expect(p.needsPartner).toBe(true);
    expect(p.real.length).toBeGreaterThan(0);
    if (p.nothingThisTerm) expect(p.landsYear).toBeGreaterThan(s.year);
  });
  it("Early years never previews More equal down (the ticket helps it), at any term or seed", () => {
    const ey = card("early-years");
    expect(ey.helps).toContain("equal");
    for (const seed of [1, 3, 5, 8])
      for (const term of [0, 2, 4, 5]) {
        const s = withHand(planAt(term, seed), ["early-years"]);
        const p = E.preview(m, s, { cards: [{ card: "early-years" }] }).perCard[0]!;
        for (const part of [p.strands, p.stock, p.thisTerm]) expect(part.equal.delta, `seed ${seed} term ${term}`).toBeGreaterThanOrEqual(0);
      }
  });
  it("never previews a move under a pip against a card's own ticket", () => {
    const s = planAt(2, 6);
    for (const c of m.cards) {
      if (c.scope === "two_regions") continue;
      const play: E.CardPlay = c.scope === "national" || c.scope === "national_or_region" ? { card: c.id } : { card: c.id, region: (c.regions ?? ["southeast"])[0]! };
      const p = E.preview(m, withHand(s, [c.id]), { cards: [play] }).perCard[0]!;
      for (const id of E.STRAND_ORDER) {
        if (c.mixed!.includes(id)) continue;
        for (const part of [p.strands, p.stock, p.thisTerm]) {
          const d = part[id].delta;
          if (Math.abs(d) >= 0.5) continue;
          if (d < 0) expect(!c.helps!.includes(id) || c.frays!.includes(id), `${c.id} ${id} ${d}`).toBe(true);
          if (d > 0) expect(!c.frays!.includes(id) || c.helps!.includes(id), `${c.id} ${id} ${d}`).toBe(true);
        }
      }
    }
  });
});

describe("the opposition benches (item 6)", () => {
  it("brings Trust back no higher than Thin after a caretaker term, shadow pledge or not", () => {
    const cap = m.game.caretaker.return_trust_max!;
    expect(cap).toBeLessThan(m.game.trust.bands.find((b) => b.id === "fair")!.min);
    let seen = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const g = playBot(m, carelessBot, seed, { runs: 4 });
      for (const h of g.history.filter((x) => x.caretaker)) {
        seen++;
        expect(h.trust.after).toBeLessThanOrEqual(cap);
        expect(h.trust.band).toBe("thin");
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("shock variety (item 7)", () => {
  it("never lands the same shock twice in a game, nor in two terms running, first game or not", () => {
    for (let seed = 1; seed <= 400; seed++)
      for (const firstGame of [false, true]) {
        const sch = buildSchedule(ctx, seed, firstGame);
        const shocks = sch.map((t) => t.shock).filter((x): x is string => !!x);
        expect(new Set(shocks).size, `${seed} ${firstGame} ${shocks.join(",")}`).toBe(shocks.length);
        for (let t = 1; t < sch.length; t++) if (sch[t]!.shock) expect(sch[t]!.shock).not.toBe(sch[t - 1]!.shock);
      }
  });
  it("keeps the first game's curated shock in its own term, and stays fixed by the seed", () => {
    const g = m.game.curveballs.first_game_shock;
    for (let seed = 1; seed <= 200; seed++) {
      const sch = buildSchedule(ctx, seed, true);
      expect(sch[g.term]!.shock).toBe(g.curveball);
      expect(buildSchedule(ctx, seed, true)).toEqual(sch);
    }
  });
});

describe("copy from the engine (item 9)", () => {
  it("names every year of the loans left on the books, in both languages", () => {
    const borrower: Bot = { ...carelessBot, id: "borrow-twice", plan: (_m, s) => ({ cards: [], standing: s.term === 0 || s.term === 2 ? "borrow-to-invest" : null }), pledge: () => null };
    let found = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const g = playBot(m, borrower, seed, { runs: 4 });
      expect(g.debts.map((d) => d.year)).toEqual([2026, 2034]);
      for (const l of g.result!.letter.lines) {
        if (!/loans? from/.test(l.text.en)) continue;
        found++;
        expect(l.text.en).toContain("We are still paying back the loans from 2026 and 2034.");
        expect(l.text.cy).toContain("2026 a 2034");
      }
    }
    expect(found).toBeGreaterThan(0);
  });
  it("never credits putting off the repairs with lifting a strand", () => {
    const deferrer: Bot = { ...carelessBot, id: "defer", plan: (mm, s) => ({ ...carelessBot.plan(mm, s), standing: "defer-maintenance" }) };
    for (let seed = 1; seed <= 12; seed++) {
      const g = playBot(m, deferrer, seed, { runs: 6 });
      for (const h of g.history) for (const x of h.slips) if (x.cause.kind === "standing" && x.cause.id === "defer-maintenance") expect(x.delta, `${seed} ${h.year} ${x.strand}`).toBeLessThan(0);
    }
  });
});
