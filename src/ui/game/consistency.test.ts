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
import { saveNoteKey } from "./endturn";

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
    expect(en["changed.against_down"]!.startsWith("{cause}")).toBe(true);
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
