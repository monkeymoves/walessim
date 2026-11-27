/** Regressions from playtest 1 (docs/design/playtest-1.md). */
import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";
import { buildSchedule } from "./schedule";
import { makeContext } from "./scores";
import { playBot, thoughtfulBot, carelessBot, type Bot } from "./bots";
import { fill, unmutatedAfterTrigger } from "./welsh";
import type { Text } from "../model/schema";

const m = testModel();
const ctx = makeContext(m);

function drive(seed: number, plan: (s: E.GameState) => E.Plays, opts: E.NewGameOptions = {}): E.GameState {
  let s = E.newGame(m, seed, { runs: 12, caretakerGhost: false, ...opts });
  while (s.step !== "ended") {
    if (s.step === "opening") s = E.dispatch(m, s, { type: "open" });
    else if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: s.pledgeOffer });
    else if (s.step === "plan") s = E.dispatch(m, s, { type: "commit", plays: plan(s) });
    else if (s.step === "visit") s = E.dispatch(m, s, { type: "visit", choice: null });
    else if (s.step === "passing") s = E.dispatch(m, s, { type: "respond", response: 0 });
    else if (s.step === "changed") s = E.dispatch(m, s, { type: "continue" });
    else if (s.step === "election") s = E.dispatch(m, s, { type: "next" });
    else s = E.dispatch(m, s, { type: "caretaker", shadowPledge: "culture" });
  }
  return s;
}

describe("visits are offered where the card landed", () => {
  it("does not offer Bethesda for Tourism pays its way played in South West Wales", () => {
    let s = E.newGame(m, 2, { runs: 4, caretakerGhost: false });
    s = E.dispatch(m, s, { type: "open" });
    s = { ...s, hand: ["tourism-pays-its-way", ...s.hand.slice(1)] };
    const sw = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "tourism-pays-its-way", region: "southwest" }] } });
    expect(sw.visitOffer).toBeNull();
    const north = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "tourism-pays-its-way", region: "north" }] } });
    expect(north.visitOffer?.place).toBe("bethesda");
  });
});

describe("what changed", () => {
  it("gives every landed shock a slip and explains strands whose pips moved", () => {
    let shocks = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const g = playBot(m, thoughtfulBot, seed, { runs: 10 });
      for (const h of g.history) {
        if (h.shock) {
          shocks++;
          expect(h.slips.some((x) => x.shock), `${seed} ${h.year}`).toBe(true);
        }
        const moved = h.strands.filter((c) => c.pipsAfter !== c.pipsBefore).length;
        expect(h.slips.filter((x) => x.pipChange !== undefined).length, `${seed} ${h.year}`).toBe(Math.min(3, moved));
        for (const x of h.slips.filter((y) => y.unexpected)) expect(x.cause.kind === "event" || x.rule !== null).toBe(true);
      }
    }
    expect(shocks).toBeGreaterThan(0);
  });
  it("makes three debts and skipped repairs cost Trust below Fair and a felt strand by the middle terms", () => {
    const greedy = (s: E.GameState): E.Plays => {
      const borrow = s.debts.length < 3;
      const defer = !borrow && s.term <= 4;
      let budget = s.budget.available + (borrow ? 3 : defer ? 2 : 0);
      const cards: E.CardPlay[] = [];
      for (const id of s.hand) {
        if (cards.length >= s.cardLimit) break;
        const card = m.cards.find((c) => c.id === id)!;
        const play: E.CardPlay = card.scope === "region" ? { card: id, region: (card.regions ?? ["southeast"])[0]! } : card.scope === "two_regions" ? { card: id, regions: ["southeast", "southwest"] } : { card: id };
        const cost = E.cardCost(m, s, play);
        if (cost <= budget) {
          cards.push(play);
          budget -= cost;
        }
      }
      return { cards, standing: borrow ? "borrow-to-invest" : defer ? "defer-maintenance" : null };
    };
    for (const seed of [5, 6, 7]) {
      const g = drive(seed, greedy);
      // not Fair all game: Trust falls to Thin or worse at some election
      expect(g.history.some((h) => h.trust.after < 45), `${seed}: ${g.history.map((h) => h.trust.after.toFixed(0)).join(",")}`).toBe(true);
      // and the deferred repairs cost a strand people feel (getting about) as soon as they are taken
      const felt = g.history.slice(0, 4).some((h) => h.contributions.some((c) => c.cause.kind === "standing" && c.cause.id === "defer-maintenance" && c.component === "access" && c.wales < 0));
      expect(felt, `${seed}`).toBe(true);
    }
    const g = drive(5, greedy);
    expect(g.history.some((h) => h.trust.reasons.some((r) => r.code === "repairs_overdue"))).toBe(true);
    expect(g.history.some((h) => h.trust.reasons.some((r) => r.code === "debt_interest"))).toBe(true);
  });
});

describe("the first term", () => {
  it("never leaves a sensible player at Thin after the guided term, and no heartland falls below half by 2030", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = playBot(m, thoughtfulBot, seed, { runs: 8, firstGame: seed % 2 === 0 });
      expect(g.history[0]!.trust.after, `seed ${seed}`).toBeGreaterThanOrEqual(45);
      expect(g.history[0]!.events.some((e) => e.kind === "heartland_drop"), `seed ${seed}`).toBe(false);
    }
  });
  it("does not let Gwynedd or Anglesey fall below half Welsh-speaking in a game with no cards", () => {
    for (const seed of [1, 2, 3]) {
      const g = drive(seed, () => ({ cards: [] }));
      expect(g.history.slice(0, 3).some((h) => h.events.some((e) => e.kind === "heartland_drop"))).toBe(false);
    }
  });
});

describe("variety", () => {
  it("lands each shock at most once a game", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const shocks = buildSchedule(ctx, seed, false).map((t) => t.shock).filter(Boolean);
      expect(new Set(shocks).size, `seed ${seed}`).toBe(shocks.length);
    }
  });
  it("never repeats a voice in a game while the pool has fresh ones, and rotates the pledge", () => {
    for (const bot of [thoughtfulBot, carelessBot] as Bot[]) {
      for (let seed = 1; seed <= 4; seed++) {
        const g = playBot(m, bot, seed, { runs: 6 });
        const voices = g.history.map((h) => h.voice?.template).filter(Boolean);
        expect(new Set(voices).size, `${bot.id} ${seed}`).toBe(voices.length);
        const offers = (g.sim as { pledgeOffers?: string[] }).pledgeOffers ?? [];
        for (let i = 1; i < offers.length; i++) expect(offers[i], `${bot.id} ${seed}`).not.toBe(offers[i - 1]);
        // an opening voice may come back only when its strand's pool is spent, and never in the next term
        const used = (g.sim as { usedVoices: string[] }).usedVoices;
        for (let i = 1; i < used.length; i++) expect(used[i], `${bot.id} ${seed}`).not.toBe(used[i - 1]);
        const repeats = used.filter((v, i) => used.indexOf(v) !== i);
        for (const r of repeats) {
          const tpl = m.voices.find((v) => v.id === r)!;
          expect(tpl.event, r).toBe("opening");
          const pool = m.voices.filter((v) => v.event === "opening" && v.strand === tpl.strand).map((v) => v.id);
          expect(pool.every((id) => used.includes(id)), r).toBe(true);
        }
      }
    }
  });
});

describe("Welsh in generated text", () => {
  const places: Text[] = [...m.authorities.flatMap((a) => [a.name, ...a.towns]), ...m.places.map((p) => p.name), ...m.regions.map((r) => r.name)];
  const things: Text[] = [...m.cards.map((c) => c.name), ...m.strands.map((s) => s.name), ...m.regions.map((r) => r.name), ...m.standing.map((s) => s.name), ...m.curveballs.map((c) => c.name)];
  it("mutates and elides every slot in voices, letters and engine copy", () => {
    const bad: string[] = [];
    const scan = (t: Text, where: string) => {
      for (const b of unmutatedAfterTrigger(t.cy)) bad.push(`${where}: ${b} in "${t.cy}"`);
    };
    const templates: [string, Text][] = [
      ...m.voices.map((v) => [`voice ${v.id}`, v.text] as [string, Text]),
      ...m.letters.flatMap((l) => [...l.salutation, ...l.lived, ...l.left, ...l.signoff, ...Object.values(l.named).flat()].map((t, i) => [`letter ${l.archetype} ${i}`, t] as [string, Text])),
      ...Object.entries(m.engine_text ?? {}).map(([k, t]) => [k, t] as [string, Text]),
    ];
    for (const [where, t] of templates) {
      if (!/\{(place|thing|tip|best|missing|region|homes|work|iaith|pressure|river|tips|note|shock)\}/.test(t.cy)) continue;
      for (const p of places) for (const th of things.slice(0, 40)) scan(fill(t, { place: p, thing: th, tip: p, best: p, missing: p, region: p, homes: th, work: th, iaith: th, pressure: th, river: th, tips: p, note: th, shock: th, year: 2038, count: 3, kept: 2, n: 4, got: 3, needed: 4, covered: 1, total: 2, need: 1, runs: 5, edition: "WIMD 2019", worst_year: 2034, lost_year: 2038 }), where);
    }
    expect([...new Set(bad)].slice(0, 15)).toEqual([]);
  });
});
