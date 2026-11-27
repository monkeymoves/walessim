// Cold playtest 5, items 3, 5, 6, 8 and 9, and the Buses and rail line: what a slip, a crisis line, a
// card preview, the promise helper and the end-of-turn sheet say agrees with the numbers they sit by.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compileFromDisk } from "../../../scripts/model-files";
import * as E from "../../engine/api";
import { ALL_BOTS, playBot } from "../../engine/bots";
import { STRAND_IDS, type StrandId } from "../../model/schema";
import { shareOfHit, slipWording } from "./slips";
import { previewLines } from "./previewLines";
import { promiseHelpers } from "./promise";
import { fundWords, responseKey, saveCap, saveNoteKey, visitWhyLines } from "./endturn";
import { barFill } from "./bars";
import { needLines, scopeChoiceKey } from "./previewLines";
import { hardestTurn, shownScore, sideScore, verdictReason } from "../end/verdict";

const m = compileFromDisk().model!;
const root = join(__dirname, "..", "..", "..");
const keys = (lang: string) => {
  const out = new Set<string>();
  for (const f of readdirSync(join(root, "model", "i18n", lang))) {
    const data = JSON.parse(readFileSync(join(root, "model", "i18n", lang, f), "utf8")) as Record<string, unknown>;
    for (const k of Object.keys(data)) out.add(`${f.replace(/\.json$/, "")}.${k}`);
  }
  return out;
};
const EN = keys("en"), CY = keys("cy");
const hasKey = (k: string, plural = false) => {
  for (const d of [EN, CY]) {
    if (plural) expect(d.has(`${k}.one`) && d.has(`${k}.other`), k).toBe(true);
    else expect(d.has(k), k).toBe(true);
  }
};

const games = ALL_BOTS.slice(0, 8).map((bot, i) => playBot(m, bot, 50 + i, { runs: 8, previewRuns: 2 }));

describe("item 3: a slip's sentence agrees with its arrow", () => {
  it("never says 'held level' beside an arrow, nor 'went up' beside a fall", () => {
    let n = 0;
    for (const g of games)
      for (const h of g.history)
        for (const sl of h.slips) {
          const w = slipWording(sl, h.strands);
          const ch = h.strands.find((c) => c.strand === sl.strand)!;
          n++;
          if (sl.part === "stock") continue;
          expect(w.net).toBe(ch.pipsAfter - ch.pipsBefore);
          if (w.key.includes("held_")) expect(w.dir).toBe("level");
          if (w.dir !== "level") expect(w.key).not.toMatch(/held_/);
          if (w.key.endsWith(".up")) expect(w.dir).toBe("up");
          if (w.key.endsWith(".down")) expect(w.dir).toBe("down");
          // "against": the named cause pushed the other way from the bar's own change
          if (w.relation === "against") expect(Math.sign(sl.delta)).toBe(-Math.sign(w.net));
          hasKey(w.key);
        }
    expect(n).toBeGreaterThan(20);
  });

  it("puts a cause that opens a sentence at the start, so it keeps its capital", () => {
    const base = { strand: "equal" as StrandId, part: "flow" as const, cause: { kind: "curveball" as const, id: "x", term: 1, year: 2030, regions: null }, unexpected: true, rule: "R1", shock: false, thread: { term: 1, strand: "equal" as StrandId, part: "flow" as const, key: "k" } };
    const level = slipWording({ ...base, delta: -0.2, pipChange: 0 } as never, [{ strand: "equal", pipsBefore: 5, pipsAfter: 5 } as never]);
    expect(level.key).toBe("game.changed.held_down");
    expect(level.causeAt).toBe("mid");
    const against = slipWording({ ...base, delta: -0.4, pipChange: 0, shock: true } as never, [{ strand: "equal", pipsBefore: 5, pipsAfter: 6 } as never]);
    expect(against.key).toBe("game.changed.against_down");
    expect(against.dir).toBe("up");
    expect(EN.has("game.changed.against_down")).toBe(true);
    const en = JSON.parse(readFileSync(join(root, "model", "i18n", "en", "game.json"), "utf8")) as Record<string, string>;
    // English sentences that put {cause} mid-sentence never start with it, and vice versa
    expect(en["changed.held_down"]!.startsWith("{cause}")).toBe(false);
    // "against" leads with the bar's own change, so the arrow and the first words agree (cold playtest 6,
    // item 6); the cause then opens the second sentence and keeps its capital
    expect(en["changed.against_down"]!.startsWith("{strand} went up")).toBe(true);
    expect(en["changed.against_up"]!.startsWith("{strand} went down")).toBe(true);
    expect(en["changed.against_down"]!).toMatch(/\. \{cause\}/);
  });
});

describe("item 5: what the crisis line says landed is what the rule says", () => {
  it("calls 1 coin half, 2 coins a quarter, ready and 1 coin about a third", () => {
    const g = m.game.response_multiplier;
    expect(shareOfHit(g.respond1)).toBe("half");
    expect(shareOfHit(g.respond2)).toBe("quarter");
    expect(shareOfHit(g.prepared * g.respond1)).toBe("third");
    expect(shareOfHit(g.prepared * g.absorb)).toBe("most");
    expect(shareOfHit(g.absorb)).toBe("all");
    for (const s of ["all", "most", "half", "third", "quarter", "little"]) hasKey(`game.share.${s}`);
    for (const k of ["response_one", "response_two", "response_nothing", "response_landed", "response_ready"]) hasKey(`game.changed.${k}`);
  });
});

describe("item 6: the end-of-turn sheet says what saved coins are for", () => {
  it("warns that only the carry-over survives a turn with no crisis", () => {
    expect(saveNoteKey(4, 2, false, false)).toBe("play.endturn.save_note_some");
    expect(saveNoteKey(2, 2, false, false)).toBe("play.endturn.save_note");
    expect(saveNoteKey(2, 2, false, true)).toBe("play.endturn.save_note_last");
    expect(saveNoteKey(2, 2, true, false)).toBeNull();
    for (const k of ["save_note", "save_note_some", "save_note_last"]) hasKey(`play.endturn.${k}`);
  });
});

describe("item 8: a card preview names every goal its result can move", () => {
  it("lists every goal on the ticket, downsides included, for every card", () => {
    let s = E.newGame(m, 9, { runs: 8, previewRuns: 4, caretakerGhost: false });
    s = E.dispatch(m, s, { type: "open" });
    if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: null });
    for (const card of m.cards) {
      if (card.scope === "two_regions") continue;
      for (const region of card.scope === "national" ? [undefined] : (card.regions ?? ["north", "mid"]).slice(0, 2)) {
        const play = region ? { card: card.id, region: region as never } : { card: card.id };
        const p = E.preview(m, s, { cards: [play] }).perCard[0]!;
        const lines = previewLines(p, card, s.year, (id) => id, (xs) => xs.join(", "));
        if (p.needsPartner && !p.real.length) continue;
        if (p.landsAfterGame) continue;
        const named = new Set(lines.flatMap((l) => l.goals));
        for (const id of [...(card.helps ?? []), ...(card.frays ?? []), ...(card.mixed ?? [])]) expect(named.has(id), `${card.id} ${region ?? "wales"} ${id}`).toBe(true);
        for (const l of lines) hasKey(l.key, l.n != null);
        // a card that moves goals never says only that nothing will be seen
        if (named.size) expect(lines.some((l) => l.key === "play.card.nothing_seen")).toBe(false);
      }
    }
  });

  it("says what Skills and apprenticeships can cost, not only what it gives", () => {
    const card = m.cards.find((c) => c.id === "skills-and-apprenticeships")!;
    let s = E.newGame(m, 4, { runs: 8, previewRuns: 4, caretakerGhost: false });
    s = E.dispatch(m, s, { type: "open" });
    if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: null });
    const p = E.preview(m, s, { cards: [{ card: card.id }] }).perCard[0]!;
    const lines = previewLines(p, card, s.year, (id) => id, (xs) => xs.join(", "));
    const down = lines.filter((l) => /down|hurts|mixed|less/.test(l.key)).flatMap((l) => l.goals);
    for (const id of card.frays ?? []) expect(down).toContain(id);
  });
});

describe("item 9: the promise helper lists only cards that can help this turn", () => {
  it("never lists a slow card, and lists a card that works straight away", () => {
    const warm = m.cards.find((c) => c.id === "warm-homes")!;
    const walls = m.cards.find((c) => c.id === "build-flood-walls")!;
    const cardOf = (id: string) => m.cards.find((c) => c.id === id);
    const state = { hand: [warm.id, walls.id], post: [], term: 1 };
    expect(warm.helps).toContain("prosperous");
    expect(promiseHelpers(state, cardOf, "prosperous")).not.toContain(warm.id);
    expect(promiseHelpers(state, cardOf, "resilient")).toContain(walls.id);
    // a card on its way counts in the turn it lands, not before
    const post = [{ card: warm.id, playedTerm: 0, playedYear: 2026, arrivesTerm: 2, arrivesYear: 2034, regions: null, countsInLeft: true }];
    expect(promiseHelpers({ hand: [], post, term: 1 }, cardOf, "healthier")).toEqual([]);
    expect(promiseHelpers({ hand: [], post, term: 2 }, cardOf, "healthier")).toEqual([warm.id]);
  });
  it("agrees with the engine on every bot turn: a listed card is never a slow card in the hand", () => {
    for (const g of games)
      for (const id of STRAND_IDS) {
        const got = promiseHelpers(g, (c) => m.cards.find((x) => x.id === c), id);
        for (const c of got) {
          const card = m.cards.find((x) => x.id === c)!;
          if (g.hand.includes(c)) expect(card.arrival?.first ?? card.delay).toBe(0);
        }
      }
  });
});

// ---------------------------------------------------------------------------------------------------
// Cold playtest 6: the contradictions that came back. Each test drives the engine the way the screen
// does and checks that two things on screen built from the same game can never disagree.

/** Drive one bot game, calling `at` with every state the player would see. */
function drive(botIndex: number, seed: number, at: (s: E.GameState) => void, opts: E.NewGameOptions = {}): E.GameState {
  const bot = ALL_BOTS[botIndex]!;
  let s = E.newGame(m, seed, { runs: 8, previewRuns: 2, caretakerGhost: true, ...opts });
  for (let guard = 0; s.step !== "ended" && guard < 100; guard++) {
    at(s);
    if (s.step === "opening") s = E.dispatch(m, s, { type: "open" });
    else if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: bot.pledge(m, s) });
    else if (s.step === "plan") {
      const plays = bot.plan(m, s);
      s = E.dispatch(m, s, { type: "commit", plays: E.validatePlays(m, s, plays).length ? { cards: [] } : plays });
    } else if (s.step === "visit") s = E.dispatch(m, s, { type: "visit", choice: bot.visit(m, s) });
    else if (s.step === "passing") s = E.dispatch(m, s, { type: "respond", response: bot.respond(m, s) });
    else if (s.step === "caretaker") s = E.dispatch(m, s, { type: "caretaker", shadowPledge: [...s.strands].sort((a, b) => b.flow - a.flow)[0]!.strand });
    else if (s.step === "changed") s = E.dispatch(m, s, { type: "continue" });
    else if (s.step === "election") s = E.dispatch(m, s, { type: "next" });
  }
  at(s);
  return s;
}
const cardOf = (id: string) => m.cards.find((c) => c.id === id);

describe("cold playtest 6, item 1: a promise is only asked when a card can help it", () => {
  it("never offers a promise no card in the hand, or landing now, can help; never lists a played card as in the hand", () => {
    let offers = 0, none = 0;
    for (let b = 0; b < 6; b++)
      for (const seed of [61, 62]) {
        drive(b, seed, (s) => {
          if (s.step !== "pledge") return;
          if (!s.pledgeOffer) {
            none++;
            for (const id of STRAND_IDS) expect(E.promiseHelpable(s, cardOf, id), `${id} was helpable but no promise was offered`).toBe(false);
            return;
          }
          offers++;
          const h = E.promiseHelpersOf(s, cardOf, s.pledgeOffer);
          expect(h.hand.length + h.landing.length, `nothing can help ${s.pledgeOffer}`).toBeGreaterThan(0);
          for (const id of h.hand) expect(s.hand).toContain(id);
          for (const id of h.landing) {
            // a card dealt again while its earlier play is still on its way is listed once, as landing
            expect(h.hand).not.toContain(id);
            expect(s.post.some((p) => p.card === id && p.playedTerm < s.term)).toBe(true);
          }
        });
      }
    expect(offers).toBeGreaterThan(10);
    void none;
    for (const k of ["none", "none_note", "none_go", "in_hand", "landing", "decline_note"]) hasKey(`play2.promise.${k}`);
  });
});

describe("cold playtest 6, item 2: one cap on saving, and the engine holds exactly what was saved", () => {
  it("caps saving at 2 everywhere a crisis can come, and at the carry in turn 1", () => {
    const carry = m.game.contingency_carry;
    expect(saveCap(carry, false)).toBeLessThanOrEqual(2);
    expect(saveCap(carry, false)).toBeLessThanOrEqual(carry);
    expect(saveCap(carry, true)).toBe(carry);
    // what the crisis can use, the response multipliers' own range
    expect(Object.keys(m.game.response_multiplier)).toContain("respond2");
  });

  it("holds the saved coins, loses the rest at once, and the results line adds up", () => {
    let s = E.newGame(m, 5, { runs: 8, previewRuns: 2, caretakerGhost: false, firstGame: true });
    s = E.dispatch(m, s, { type: "open" });
    const left = s.budget.available - E.cardCost(m, s, { card: s.hand.find((id) => cardOf(id)!.scope === "national") ?? s.hand[0]!, region: "southeast" });
    const one = s.hand.find((id) => cardOf(id)!.scope === "national") ?? s.hand[0]!;
    const play = cardOf(one)!.scope === "national" ? { card: one } : { card: one, region: "southeast" as const };
    s = E.dispatch(m, s, { type: "commit", plays: { cards: [play], save: 1 } });
    expect(s.budget.available).toBe(Math.min(1, left));
    while (s.step !== "changed") s = s.step === "visit" ? E.dispatch(m, s, { type: "visit", choice: null }) : E.dispatch(m, s, { type: "respond", response: 0 });
    const o = s.lastOutcome!;
    expect(o.contingencyHeld).toBe(Math.min(1, left));
    expect(o.coinsNotSaved ?? 0).toBe(left - Math.min(1, left));
    const lines = fundWords(o, m.game.contingency_carry, false);
    const n = (k: string) => lines.find((l) => l.key === k)?.n ?? 0;
    expect(n("play.result.fund")).toBe(o.contingencyHeld);
    expect(n("play.result.carried") + n("play.result.lost") + (o.shock?.response ?? 0)).toBe(o.contingencyHeld + (o.coinsNotSaved ?? 0));
    s = E.dispatch(m, E.dispatch(m, s, { type: "continue" }), { type: "next" });
    // what carried over is what the results line said carried over
    expect(s.budget.carried).toBe(n("play.result.carried"));
    for (const l of lines) hasKey(l.key, l.n != null);
  });
});

describe("cold playtest 6, items 3 and 4: the crisis offers only what was saved, and names its own budget cut", () => {
  it("says 'you had no coins saved' rather than 'you spent no coins' when nothing was saved", () => {
    expect(responseKey(0, 0)).toBe("play2.crisis.response_none_saved");
    expect(responseKey(0, 2)).toBe("game.changed.response_nothing");
    expect(responseKey(1, 2)).toBe("game.changed.response_one");
    hasKey("play2.crisis.response_none_saved");
    hasKey("play2.crisis.none");
    hasKey("play2.crisis.budget_cut", true);
  });

  it("states the crisis's cut to next turn's budget on the crisis, the same coins the budget then shows", () => {
    let seen = 0;
    for (let b = 0; b < 6; b++)
      for (const seed of [71, 72]) {
        let cut: number | null = null;
        drive(b, seed, (s) => {
          if (s.step === "passing" && s.shock) cut = s.shock.budgetCut ?? 0;
          if (s.step === "opening" && cut != null) {
            expect(-s.budget.carriedHit, `seed ${seed}`).toBe(cut);
            if (cut > 0) seen++;
            cut = null;
          }
        }, { firstGame: true });
      }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("cold playtest 6, item 5: the end screen's numbers and the timeline agree", () => {
  it("gives the top bar's last Left for 2050 and the end score as the same whole number", () => {
    for (const g of games) {
      if (!g.result) continue;
      const before = E.loadGame(m, JSON.stringify({ ...JSON.parse(E.saveGame(g)), log: g.log.slice(0, -1) }));
      expect(before.step).toBe("election");
      const h = E.headline(m, before);
      expect(shownScore(h.start.left2050, h.left2050).now).toBe(sideScore(g.result, "left").end);
      const hEnd = E.headline(m, g);
      expect(shownScore(hEnd.start.left2050, hEnd.left2050).now).toBe(sideScore(g.result, "left").end);
    }
  });

  it("marks on the timeline only the turn the sentence names", () => {
    for (const g of games) {
      const r = g.result!;
      const reason = verdictReason(r, E.whatMattered(m, g, 8), E.unusedCoins(m, g).turns);
      if (reason.turn == null) continue;
      if (reason.kind === "lived") expect(reason.turn).toBe(hardestTurn(r.worstTerm));
      else {
        expect(reason.cause && (reason.cause.kind === "shock" || reason.cause.kind === "lost_turn")).toBe(true);
        expect(reason.turn).toBe(reason.cause!.term);
      }
    }
  });

  it("dates a card that worked later than it was played by both years", () => {
    let later = 0;
    for (const g of games)
      for (const x of E.whatMattered(m, g, 8)) {
        if (x.kind !== "card") continue;
        expect(x.fromYear ?? x.year).toBeGreaterThanOrEqual(x.year);
        if ((x.fromYear ?? x.year) > x.year) later++;
      }
    expect(later).toBeGreaterThan(0);
    hasKey("play2.end.cause_card_from");
  });
});

describe("cold playtest 6, item 6: a bar's fill never reads as another whole number than its label", () => {
  it("follows the level within half a point of the label", () => {
    expect(barFill(4, 4.3)).toBeCloseTo(4.3);
    expect(barFill(4, 4.7)).toBeCloseTo(4.49);
    expect(barFill(4, 3.2)).toBeCloseTo(3.51);
    expect(barFill(0, -1)).toBe(0);
    expect(barFill(10, 10.4)).toBe(10);
    for (const g of games)
      for (const h of g.history)
        for (const c of h.strands) {
          expect(Math.abs(barFill(c.pipsAfter, c.flowAfter) - c.pipsAfter)).toBeLessThan(0.5);
          expect(Math.round(barFill(c.pipsAfter, c.flowAfter))).toBe(c.pipsAfter);
        }
  });
});

describe("cold playtest 6, item 7: Trust's reasons point the way Trust moved", () => {
  it("shows a reason that pulled Trust down whenever it went down, and one that pushed it up when it rose", () => {
    let checked = 0;
    for (const g of games)
      for (const h of g.history) {
        const dir = E.trustDirection(h.trust.before, h.trust.after);
        if (dir === "down") { expect(h.trust.top.some((r) => r.points < 0), JSON.stringify(h.trust)).toBe(true); checked++; }
        if (dir === "up") { expect(h.trust.top.some((r) => r.points > 0), JSON.stringify(h.trust)).toBe(true); checked++; }
      }
    expect(checked).toBeGreaterThan(20);
    // three small losses and the drift outweighing one gain: the loss is shown
    const top = E.topReasons([{ code: "pledge_kept", points: 4, detail: "equal" }, { code: "promise_kept", points: 3 }, { code: "pips_lost", points: -2, detail: "a" }, { code: "pips_lost", points: -2, detail: "b" }, { code: "pips_lost", points: -2, detail: "c" }, { code: "drift", points: -2 }], 60, 59);
    expect(top.some((r) => r.points < 0)).toBe(true);
    hasKey("play2.trust.card_up");
    hasKey("play2.trust.curveball_up");
  });
});

describe("cold playtest 6, item 8: an invitation names the right reason", () => {
  it("gives every card that asks for a visit its own line, and never says a slow card is built now", () => {
    for (const c of m.cards.filter((x) => x.visit)) {
      expect(c.visit_why?.en, c.id).toBeTruthy();
      const lines = visitWhyLines({ year: 2030 }, [c.id], cardOf, (ids) => ids.join(", "));
      const first = c.arrival?.first ?? c.delay;
      const keys = lines.flatMap((l) => ("key" in l ? [l.key] : []));
      if (first > 0) {
        expect(keys).toContain("play2.visit.slow");
        expect(lines.find((l) => "key" in l && l.key === "play2.visit.slow")).toMatchObject({ vars: { year: 2030 + 4 * first } });
      } else expect(keys).not.toContain("play2.visit.slow");
      for (const k of keys) hasKey(k);
    }
  });

  it("names, for a visit no card asked for, only a slow change that bears on that board", () => {
    let curated = 0;
    for (let b = 0; b < 4; b++)
      drive(b, 81, (s) => {
        const o = s.step === "visit" ? s.visitOffer : null;
        if (!o || !o.triggeredBy.includes("curveball")) return;
        curated++;
        const board = m.places.find((p) => p.id === o.place)!;
        const related = [...(board.trend_penalties ?? []), ...(board.term_notes ?? [])].map((p) => p.curveball);
        if (o.trend) {
          expect(related).toContain(o.trend);
          expect(s.activeTrends.map((a) => a.curveball)).toContain(o.trend);
        }
      }, { firstGame: true });
    expect(curated).toBeGreaterThan(0);
  });
});

describe("cold playtest 6: a card's needs, and what choosing a region changes, are stated", () => {
  it("lists every condition a card's effects carry as a need", () => {
    const names = (id: string) => cardOf(id)?.name.en ?? id;
    const childcare = m.cards.find((c) => c.id === "welsh-medium-childcare")!;
    const lines = needLines(childcare, m.cards, names, (xs) => xs.join(", "));
    expect(lines.some((l) => l.key === "play2.needs.card" && l.vars.card === names("skills-and-apprenticeships"))).toBe(true);
    const warm = m.cards.find((c) => c.id === "warm-homes")!;
    expect(needLines(warm, m.cards, names, (xs) => xs.join(", ")).some((l) => l.key === "play2.needs.below_cards" && l.vars.cards!.includes(names("skills-and-apprenticeships")))).toBe(true);
    for (const c of m.cards) {
      const ls = needLines(c, m.cards, names, (xs) => xs.join(", "));
      const conds = c.effects.filter((e) => e.condition && (e.condition.half_without_card || e.condition.half_if_below || e.condition.needs_partners || e.condition.unless_card_in_scope || e.condition.unless_card_in_force));
      if (conds.length) expect(ls.length, c.id).toBeGreaterThan(0);
      for (const l of ls) hasKey(l.key);
    }
    expect(scopeChoiceKey({ scope: "national_or_region" })).toBe("play2.card.scope_choice");
    hasKey("play2.card.scope_choice");
    expect(scopeChoiceKey({ scope: "region" })).toBe("play2.card.scope_region");
    hasKey("play2.card.scope_region");
    hasKey("play2.card.if_example");
  });
});
