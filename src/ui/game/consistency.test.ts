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
import { countsLabel, hardestTurn, shownScore, sideScore, verdictReason } from "../end/verdict";
import { endSheetWords, stayNoteKey } from "./endturn";
import { startLines } from "./slips";
import { barMoved, walesMover } from "./walesNow";
import { gradeBethesda } from "../../engine/places";

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

// ---------------------------------------------------------------------------------------------------
// Cold playtest 7: the rule that decides the result, coins the game would not let you spend, a test
// failed with no reason, size words against bars, and when a slow card's work shows.

const enOf = (f: string) => JSON.parse(readFileSync(join(root, "model", "i18n", "en", `${f}.json`), "utf8")) as Record<string, string>;
const srcOf = (f: string) => readFileSync(join(root, "src", "ui", f), "utf8");

describe("cold playtest 7, item 3: the score that counts is labelled by what it is judged on", () => {
  it("names its change since 2026 from the same rounded numbers shown beside it", () => {
    let n = 0;
    for (const g of games) {
      const r = g.result!;
      const c = countsLabel(r);
      const me = sideScore(r, c.side), other = sideScore(r, c.side === "lived" ? "left" : "lived");
      // the counting side never shows a better change than the other
      expect(me.change).toBeLessThanOrEqual(other.change);
      expect(c.n).toBe(Math.abs(me.change));
      if (c.key.endsWith("counts_up_less")) expect(other.change).toBeGreaterThan(me.change);
      if (c.key.endsWith("counts_down")) expect(me.change).toBeLessThan(0);
      hasKey(c.key, true);
      n++;
    }
    expect(n).toBeGreaterThan(4);
    // the tester's case: Life in your years 50 to 53 counted while Left for 2050 read 46 to 50
    const r = { ...games[0]!.result!, start: { lived: 5, left: 4.6 }, lived: { ...games[0]!.result!.lived, value: 2.1 }, left: { ...games[0]!.result!.left, value: 2.8 }, result: { ...games[0]!.result!.result, which: "lived" as const } };
    expect(countsLabel(r)).toEqual({ side: "lived", key: "play5.end.counts_up_less", n: 3 });
    // "weaker" alone never labels a score again: the words say what is compared
    expect(enOf("play")["end.weaker"]).toMatch(/since 2026/);
    expect(srcOf("end/EndScreen.tsx")).not.toMatch(/props\.lower}> <span class="small">\(\{t\("play\.end\.weaker"\)/);
  });
});

describe("cold playtest 7, item 4: which score wins is said in turn 1 and on the end headline", () => {
  it("states the rule in How it works, on the end headline and in the score tips, by what is compared", () => {
    expect(enOf("play")["score.rule"]).toMatch(/did worse since 2026/);
    hasKey("play5.guide.how4");
    hasKey("play5.end.rule_line");
    expect(srcOf("game/Steps.tsx")).toMatch(/function HowItWorks[\s\S]*play5\.guide\.how4/);
    expect(srcOf("end/EndScreen.tsx")).toMatch(/function Verdict[\s\S]*play5\.end\.rule_line[\s\S]*function autopilotLine/);
  });
});

/** A plan of the cheapest cards up to Trust's limit, with a region for regional cards. */
function cheapPlan(s: E.GameState): E.Plays {
  const cards = [...s.hand].map((id) => cardOf(id)!).filter((c) => c.scope !== "two_regions")
    .sort((a, b) => a.cost - b.cost).slice(0, s.cardLimit)
    .map((c) => (c.scope === "national" ? { card: c.id } : { card: c.id, region: (c.regions?.[0] ?? "southeast") as E.RegionId }));
  return { cards };
}

describe("cold playtest 7, item 5: coins the card limit stranded are explained, never blamed", () => {
  it("marks a capped turn, keeps its stranded coins out of the coins the player left unused", () => {
    let capped = 0;
    for (let seed = 1; seed < 40 && capped < 3; seed++) {
      let s = E.newGame(m, seed, { runs: 6, previewRuns: 2, caretakerGhost: false });
      s = E.dispatch(m, s, { type: "open" });
      if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: null });
      const plan = cheapPlan(s);
      if (E.validatePlays(m, s, plan).length || plan.cards.length < s.cardLimit) continue;
      const left = s.budget.available - plan.cards.reduce((a, p) => a + E.cardCost(m, s, p), 0);
      if (left < 3) continue;
      expect(E.cardsCapped(m, s, plan)).toBe("limit");
      // what the end-of-turn sheet says: saving first, no "go back and spend them", no blame
      const w = endSheetWords("limit", left, 2, false);
      expect(w.saveFirst).toBe(true);
      expect(w.back).not.toBe("play.endturn.back");
      expect(w.lost).toBe("play5.endturn.capped_lost");
      for (const k of [w.why!, w.lost]) hasKey(k, true);
      hasKey(w.back);
      s = E.dispatch(m, s, { type: "commit", plays: { ...plan, save: 2 } });
      while (s.step !== "changed") s = s.step === "visit" ? E.dispatch(m, s, { type: "visit", choice: null }) : E.dispatch(m, s, { type: "respond", response: 0 });
      const o = s.lastOutcome!;
      expect(o.cardsCapped).toBe("limit");
      expect(o.coinsNotSaved).toBe(left - 2);
      const u = E.unusedCoins(m, s);
      expect(u.perTurn[0]).toBe(0);
      expect(u.forced).toBe(left - 2);
      capped++;
    }
    expect(capped).toBeGreaterThan(0);
    // a turn with cards still playable is the player's choice and still counts
    let s = E.newGame(m, 5, { runs: 6, previewRuns: 2, caretakerGhost: false });
    s = E.dispatch(m, s, { type: "open" });
    expect(E.cardsCapped(m, s, { cards: [] })).toBeNull();
    s = E.dispatch(m, s, { type: "commit", plays: { cards: [], save: 0 } });
    while (s.step !== "changed") s = s.step === "visit" ? E.dispatch(m, s, { type: "visit", choice: null }) : E.dispatch(m, s, { type: "respond", response: 0 });
    expect(s.lastOutcome!.cardsCapped).toBeUndefined();
    expect(E.unusedCoins(m, s).perTurn[0]).toBe(s.lastOutcome!.coinsNotSaved);
    expect(endSheetWords(null, 3, 2, false)).toMatchObject({ why: null, back: "play.endturn.back", saveFirst: false });
  });
});

describe("cold playtest 7, item 6: a Bethesda test that fails says why", () => {
  const be = m.places.find((p) => p.id === "bethesda")!;
  const text = m.engine_text;
  const cardName = (id: string) => cardOf(id)!.name;
  const aros = (threads: string[], c: Partial<Parameters<typeof gradeBethesda>[2]>) =>
    gradeBethesda(be, threads, { active: [], inPlay: [], everPlayed: [], seed: 7, runs: 60, text, cardName, ...c }).tests.find((t) => t.id === "aros")!;

  it("names the slow change that took away a homes pick and a work pick that both worked", () => {
    // the tester's picks: a homes pick and a work pick, with skills played, while house prices pull away
    const t = aros(["cap-holiday-lets", "quarry-workshops"], { active: ["price-of-a-home"], everPlayed: ["skills-and-apprenticeships"] });
    expect(t.pass).toBe(false);
    expect(t.explanation!.en).toMatch(/The reason this turn: House prices pull away/);
  });

  it("names a missing pick, a pick at half strength and its card, and never leaves the reason blank", () => {
    expect(aros(["chapel-homes", "park-and-ride"], {}).explanation!.en).toMatch(/no work pick/);
    expect(aros(["chapel-homes", "quarry-workshops"], {}).explanation!.en).toMatch(/half strength until you play Skills and apprenticeships/);
    expect(aros(["chapel-homes", "levy-trust"], {}).explanation!.en).toMatch(/only counts in a turn when you play Tourism pays its way/);
    const ids = be.options!.map((o) => o.id);
    let failed = 0;
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      for (const active of [[], ["price-of-a-home"], ["language-at-the-edge"]]) {
        const r = gradeBethesda(be, [ids[a]!, ids[b]!], { active, inPlay: [], everPlayed: [], seed: 3, runs: 40, text, cardName });
        for (const t of r.tests.filter((x) => !x.pass && x.id !== "pwysau")) {
          failed++;
          expect(t.explanation!.en).not.toMatch(/\{|6\.\s+Homes|6\.\s+Help/);
          expect(t.explanation!.cy).not.toMatch(/\{/);
        }
      }
    }
    expect(failed).toBeGreaterThan(20);
  });
});

describe("cold playtest 7, item 7: size words agree with the bars", () => {
  it("never says 'a lot' about Wales beside a goal bar that has not moved a whole point", () => {
    let said = 0;
    for (let b = 0; b < 6; b++)
      drive(b, 91 + b, (s) => {
        if (s.step !== "opening" || !s.history.length) return;
        const w = walesMover(m, s);
        if (!w) return;
        said++;
        if (w.size === "lot") {
          const comp = m.components.find((c) => c.indicator === w.indicator)!;
          expect(barMoved(m, s, comp.id, w.better)).toBe(true);
        }
      });
    expect(said).toBeGreaterThan(5);
    // a council area's estimate says it is the area, not all of Wales; Trust's gap reason is this turn's change
    expect(enOf("facts")["area.since_head"]).toMatch(/council area/);
    expect(enOf("game")["trust.reason.gap_widened"]).toMatch(/this turn/);
  });
});

describe("cold playtest 7, item 8: a slow card says when its work shows, and is reported when it starts", () => {
  it("dates a card's first work the same on its ticket and on its way", () => {
    let s = E.newGame(m, 9, { runs: 6, previewRuns: 2, caretakerGhost: false });
    s = E.dispatch(m, s, { type: "open" });
    if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: null });
    for (const card of m.cards.filter((c) => c.scope === "national")) {
      const p = E.preview(m, s, { cards: [{ card: card.id }] }).perCard[0]!;
      if (p.needsPartner) continue;
      const after = E.dispatch(m, { ...s, hand: [card.id] }, { type: "commit", plays: { cards: [{ card: card.id }] } });
      const on = after.post.find((x) => x.card === card.id);
      // a card that works straight away is never on its way; any other is, from its ticket's year
      if (p.firstYear === s.year) expect(on?.firstYear ?? s.year, card.id).toBe(s.year);
      else expect(on?.firstYear ?? on?.arrivesYear, card.id).toBe(p.firstYear);
    }
  });

  it("after every turn, reports a card that started with nothing whole to show, and names the results a starting card shows in", () => {
    let quiet = 0, next = 0;
    for (let b = 0; b < 6; b++)
      drive(b, 101 + b, (s) => {
        if (s.step !== "changed" || !s.lastOutcome) return;
        const o = s.lastOutcome;
        const lines = startLines(o, s.post);
        for (const l of lines) hasKey(l.key);
        for (const p of s.post.filter((x) => (x.firstTerm ?? x.arrivesTerm) === o.term + 1 && x.playedTerm <= o.term)) {
          expect(lines.some((l) => l.key === "play5.changed.starts_next" && l.card === p.card && l.vars.from === o.year + 4 && l.vars.to === o.year + 8)).toBe(true);
          next++;
        }
        const started = [...o.arrivals, ...s.post].filter((p) => (p.firstTerm ?? p.arrivesTerm) === o.term && p.playedTerm < o.term);
        for (const p of started) {
          const moved = o.slips.some((sl) => sl.cause.kind === "card" && sl.cause.id === p.card && sl.cause.term === p.playedTerm);
          expect(lines.some((l) => l.key === "play5.changed.started_quiet" && l.card === p.card)).toBe(!moved);
          if (!moved) quiet++;
        }
      });
    expect(next).toBeGreaterThan(3);
    expect(quiet).toBeGreaterThan(0);
  });
});

describe("cold playtest 7, item 12: the smaller contradictions", () => {
  it("names the card a visit is for when you stay away, and says so when no card asked", () => {
    expect(stayNoteKey(["curveball"])).toEqual({ key: "play5.visit.stay_none", cards: [] });
    expect(stayNoteKey(["tourism-pays-its-way"])).toEqual({ key: "play5.visit.stay_card", cards: ["tourism-pays-its-way"] });
    expect(stayNoteKey(["a", "b"]).key).toBe("play5.visit.stay_cards");
    for (const k of ["stay_none", "stay_card", "stay_cards"]) hasKey(`play5.visit.${k}`);
    // a visit no card asked for says so first
    expect(enOf("play2")["visit.why_trend_bethesda"]).toMatch(/^No card of yours/);
    expect(enOf("play2")["visit.why_plain"]).toMatch(/^No card of yours/);
    expect(enOf("game")["visit.why_trend"]).toMatch(/^No card of yours/);
  });

  it("names the slow change a crisis grew from, which is always one under way", () => {
    let shocks = 0;
    for (let b = 0; b < 6; b++)
      drive(b, 111 + b, (s) => {
        if (s.step !== "passing" || !s.shock) return;
        shocks++;
        expect(s.activeTrends.map((a) => a.curveball)).toContain(s.shock.curveball);
      }, { firstGame: b % 2 === 0 });
    expect(shocks).toBeGreaterThan(0);
    hasKey("play5.crisis.from");
  });

  it("keeps the grammar, the step label and the plain words", () => {
    expect(enOf("play2")["needs.below_cards"]).not.toMatch(/\{cards\} trains/);
    expect(enOf("game")["bar.term_done"]).not.toMatch(/done/);
    const all = readdirSync(join(root, "model", "i18n", "en")).flatMap((f) => Object.entries(enOf(f.replace(/\.json$/, ""))));
    for (const [k, v] of all) {
      if (typeof v !== "string") continue;
      expect(v, k).not.toMatch(/Borrowing and bills|Running costs? (due|not paid|you started)|\bBGS\b/);
      // "spoil" is explained where it is first met, and a bare "WIMD" is never shown
      if (/\bspoil\b/.test(v)) expect(v, k).toMatch(/coal waste, called spoil/);
      if (/WIMD/.test(v)) expect(v, k).toMatch(/deprivation index \(WIMD\)/);
    }
  });
});
