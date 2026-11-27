// Cold playtest 5 (docs/design/playtest-5-cold.md): every number, grade and sentence the player sees
// must agree with every other one. Engine-side root causes.
import { describe, expect, it } from "vitest";
import * as E from "./api";
import type { GameState } from "./api";
import { averageBot, carelessBot, thoughtfulBot, type Bot } from "./bots";
import { gradeBethesda, gradeRhondda } from "./places";
import { testModel } from "./test-model";
import type { CompiledModel } from "../model/schema";

const m = testModel();
const be = m.places.find((p) => p.id === "bethesda")!;
const rh = m.places.find((p) => p.id === "rhondda")!;
const copy = m.engine_text;

/** Play a bot game and hand every state it passes through to `see`. */
function walk(model: CompiledModel, bot: Bot, seed: number, see: (s: GameState) => void, options: E.NewGameOptions = {}): GameState {
  let s = E.newGame(model, seed, { caretakerGhost: false, runs: 8, previewRuns: 4, ...options });
  for (let guard = 0; s.step !== "ended" && guard < 100; guard++) {
    see(s);
    if (s.step === "opening") s = E.dispatch(model, s, { type: "open" });
    else if (s.step === "pledge") s = E.dispatch(model, s, { type: "pledge", strand: bot.pledge(model, s) });
    else if (s.step === "plan") {
      let plays = bot.plan(model, s);
      if (E.validatePlays(model, s, plays).length) plays = { cards: [] };
      s = E.dispatch(model, s, { type: "commit", plays });
    } else if (s.step === "visit") s = E.dispatch(model, s, { type: "visit", choice: bot.visit(model, s) });
    else if (s.step === "passing") s = E.dispatch(model, s, { type: "respond", response: bot.respond(model, s) });
    else if (s.step === "caretaker") s = E.dispatch(model, s, { type: "caretaker", shadowPledge: "healthier" });
    else if (s.step === "changed") s = E.dispatch(model, s, { type: "continue" });
    else if (s.step === "election") s = E.dispatch(model, s, { type: "next" });
  }
  see(s);
  return s;
}

describe("item 1: the top bar's Left for 2050 is the end screen's", () => {
  for (const [bot, seed] of [[thoughtfulBot, 21], [averageBot, 22], [carelessBot, 23], [thoughtfulBot, 24]] as const) {
    it(`the last score shown in play equals the end result (${bot.id}, seed ${seed})`, () => {
      let lastInPlay: E.Headline | null = null;
      const end = walk(m, bot, seed, (s) => {
        if (s.step === "election" && s.term >= m.game.years.length - 1) lastInPlay = E.headline(m, s);
      });
      const r = end.result!;
      expect(lastInPlay).not.toBeNull();
      // the cards still on their way count in both, so the two agree to the last decimal
      expect(lastInPlay!.left2050).toBeCloseTo(r.leftLevel * 10, 9);
      expect(lastInPlay!.start.left2050).toBeCloseTo(r.start.left * 10, 9);
      expect(E.headline(m, end).left2050).toBeCloseTo(r.leftLevel * 10, 9);
    });
  }

  it("counts a slow card in Left for 2050 as soon as it is on its way", () => {
    let s = E.newGame(m, 5, { runs: 8, previewRuns: 4, caretakerGhost: false });
    s = E.dispatch(m, s, { type: "open" });
    if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: null });
    const before = E.headline(m, s).left2050;
    const slow = s.hand.find((id) => (m.cards.find((c) => c.id === id)!.delay ?? 0) >= 2 && m.cards.find((c) => c.id === id)!.scope !== "two_regions");
    expect(slow).toBeTruthy();
    const card = m.cards.find((c) => c.id === slow)!;
    const play = card.scope === "region" ? { card: slow!, region: (card.regions?.[0] ?? "north") as never } : { card: slow! };
    s = E.resolve(m, s, { cards: [play] }, null, 0);
    expect(s.post.some((p) => p.card === slow)).toBe(true);
    const h = E.headline(m, s);
    expect(h.final).toBe(false);
    expect(Number.isFinite(h.left2050)).toBe(true);
    expect(h.left2050).not.toBeCloseTo(before, 6);
  });
});

describe("item 2: a visit's grade is explained by its own tests", () => {
  const ids = be.options!.map((o) => o.id);
  const trios: string[][] = [];
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (let c = b + 1; c < ids.length; c++) trios.push([ids[a]!, ids[b]!, ids[c]!]);
  const contexts = [
    { active: [] as string[], inPlay: ["homes-for-locals"], everPlayed: ["homes-for-locals"], seed: 11, runs: 60, text: copy },
    { active: ["price-of-a-home", "wet-decade"], inPlay: [], everPlayed: ["skills-and-apprenticeships"], seed: 12, runs: 60, text: copy },
  ];

  const summaryAgrees = (grade: string, tests: { pass: boolean }[], first: string) => {
    const passed = tests.filter((t) => t.pass).length;
    if (grade === "very_well") expect(first).toMatch(/^All 3 tests passed, with room to spare/);
    else if (grade === "well") expect(first).toMatch(passed === 3 ? /^All 3 tests passed, but only just/ : new RegExp(`^${passed} of 3 tests passed. That is enough`));
    else if (grade === "adequately") expect(first).toMatch(new RegExp(`^${passed} of 3 tests passed. So it went OK`));
    else expect(first).toMatch(/^None of the 3 tests passed/);
  };

  it("opens every Bethesda result with how many tests passed and why that is the grade", () => {
    for (const c of contexts)
      for (const t of trios) {
        const r = gradeBethesda(be, t, c);
        summaryAgrees(r.grade, r.tests, r.notes[0]!.en);
        expect(r.notes[0]!.cy).not.toMatch(/\{[a-z_]+\}/);
      }
  });

  it("opens every Rhondda result the same way", () => {
    const tips = rh.tips!.map((x) => x.id);
    for (let i = 0; i + 2 < tips.length; i++) {
      for (const wet of [false, true]) {
        const r = gradeRhondda(rh, [tips[i]!, tips[i + 1]!, tips[i + 2]!], wet, { text: copy });
        summaryAgrees(r.grade, r.tests, r.notes[0]!.en);
      }
    }
  });

  it("never says a trend's demand went unmet beside a test that passed", () => {
    for (const t of trios) {
      const r = gradeBethesda(be, t, contexts[1]!);
      const aros = r.tests.find((x) => x.id === "aros")!.pass;
      const homes = r.notes.find((n) => /House prices pull away/.test(n.en))!;
      expect(homes.en.endsWith("Your picks still passed."), t.join()).toBe(aros);
    }
  });

  it("never tells the player the river needed nothing", () => {
    for (const c of contexts)
      for (const t of trios) {
        const r = gradeBethesda(be, t, c);
        for (const x of r.tests) expect(x.explanation!.en).not.toMatch(/needed: nothing|\{[a-z]+\}/);
      }
  });
});

describe("the same place is not asked for two turns running after it went well", () => {
  it("rests a place that went well last turn, and delivers its cards at that grade", () => {
    let rested = 0;
    const good = (g: { grade: string }) => g.grade === "well" || g.grade === "very_well";
    for (let seed = 1; seed <= 12; seed++) {
      walk(m, thoughtfulBot, seed, (s) => {
        if (s.step === "visit" && s.visitOffer) {
          const offered = [s.visitOffer.place, ...(s.visitOffer.alternatives ?? []).map((a) => a.place)];
          const last = s.ledger.grades.filter((g) => g.year === s.year - 4 && good(g)).map((g) => g.place);
          for (const p of last) expect(offered, `seed ${seed} ${s.year}`).not.toContain(p);
        }
        // a turn that played a card for a resting place: no visit there, and the card carries that grade
        if (s.step === "changed" && s.lastOutcome) {
          const o = s.lastOutcome;
          for (const c of o.plays.cards) {
            const place = m.cards.find((x) => x.id === c.card)?.visit;
            const last = [...s.ledger.grades].reverse().find((g) => g.place === place && g.year < o.year);
            if (!place || !last || last.year !== o.year - 4 || !good(last)) continue;
            expect(o.visit?.place === place && !o.visit.stayed).toBe(false);
            rested++;
          }
        }
      }, { firstGame: false });
    }
    expect(rested).toBeGreaterThan(0);
  });
});
