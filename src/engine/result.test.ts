/** The judged result (balance decision 14): change since 2026 in net strand pips. */
import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";
import { playBot, thoughtfulBot } from "./bots";
import { level } from "./voices";

const m = testModel();
const J = m.game.judged_change!;
const n = 7;

describe("the judged result", () => {
  const g = playBot(m, thoughtfulBot, 4, { runs: 20, caretakerGhost: true });
  const r = g.result!;
  const counted = r.wellbeingByTerm.slice(J.lived_first_term - 1);

  it("judges Lived as the change over terms 2 to 6, less a share of any dip below 2026, in net strand pips", () => {
    const mean = counted.reduce((a, b) => a + b, 0) / counted.length;
    const livedLevel = mean - J.dip_weight * Math.max(0, r.start.lived - Math.min(...counted));
    expect(r.livedLevel).toBeCloseTo(livedLevel, 9);
    expect(r.lived.value).toBeCloseTo(n * (livedLevel - r.start.lived), 9);
  });
  it("judges Left as the change in the weighted stock level", () => {
    expect(r.left.value).toBeCloseTo(n * (r.leftLevel - r.start.left), 9);
  });
  it("takes the lower of the two as the result, with a band from judged_change", () => {
    expect(r.result.value).toBe(Math.min(r.lived.value, r.left.value));
    expect(r.result.which).toBe(r.lived.value <= r.left.value ? "lived" : "left");
    const bands = J.bands;
    const idx = bands.map((b) => b.min).filter((x) => x <= r.result.value).length - 1;
    expect(r.result.band.band).toBe(idx + 1);
    expect(r.result.band.name).toEqual(bands[idx]!.name);
  });
  it("reports the worst counted term and whether any counted term dipped below 2026", () => {
    expect(r.worstTerm).toBeGreaterThanOrEqual(J.lived_first_term - 1);
    expect(r.wellbeingByTerm[r.worstTerm]).toBe(Math.min(...counted));
    expect(r.dippedBelowStart).toBe(Math.min(...counted) < r.start.lived);
  });
  it("gives each strand its own change in pips (no factor of seven)", () => {
    for (const p of r.perStrand) {
      expect(Number.isFinite(p.lived) && Number.isFinite(p.left)).toBe(true);
      expect(p.lower).toBe(p.lived <= p.left ? "lived" : "left");
      expect(Math.abs(p.lived)).toBeLessThan(10);
    }
  });
  it("puts the caretaker ghost in the same units and says how far ahead the player finished", () => {
    expect(r.caretakerGhost).not.toBeNull();
    expect(r.vsCaretaker).toBeCloseTo(r.result.value - r.caretakerGhost!.result, 9);
    expect(r.caretakerGhost!.result).toBe(Math.min(r.caretakerGhost!.lived, r.caretakerGhost!.left));
  });
  it("brackets the result with the run spread", () => {
    expect(r.result.p10).toBeLessThanOrEqual(r.result.p90);
  });
  it("recomputes everything, the 2026 start included, when the weights change", () => {
    const w = E.recomputeResult(m, g, { prosperous: 6 });
    expect(w.start.lived).not.toBeCloseTo(r.start.lived, 6);
    expect(w.lived.value).toBeCloseTo(n * (w.livedLevel - w.start.lived), 9);
  });
  it("chooses the letter from the change bands", () => {
    expect(level(m, -2)).toBe("low");
    expect(level(m, 0)).toBe("middle");
    expect(level(m, 2)).toBe("high");
    expect(r.letter.lines.length).toBe(6);
    expect(r.letter.namedAll?.length).toBe(2);
  });
  it("a game with no cards is judged below a thoughtful game", () => {
    let s = E.newGame(m, 4, { runs: 20, caretakerGhost: false });
    while (s.step !== "ended") {
      s =
        s.step === "opening" ? E.dispatch(m, s, { type: "open" })
        : s.step === "pledge" ? E.dispatch(m, s, { type: "pledge", strand: null })
        : s.step === "plan" ? E.dispatch(m, s, { type: "commit", plays: { cards: [] } })
        : s.step === "visit" ? E.dispatch(m, s, { type: "visit", choice: null })
        : s.step === "passing" ? E.dispatch(m, s, { type: "respond", response: 0 })
        : s.step === "changed" ? E.dispatch(m, s, { type: "continue" })
        : s.step === "election" ? E.dispatch(m, s, { type: "next" })
        : E.dispatch(m, s, { type: "caretaker", shadowPledge: "culture" });
    }
    expect(s.result!.result.value).toBeLessThan(r.result.value);
  });
});

describe("the letter after playtest 1", () => {
  it("picks the archetype from the result band, so beating the caretaker is never hollow", async () => {
    const { archetypeFromBand } = await import("./game");
    expect(archetypeFromBand(2, -2, -2, true, false)).toBe("steady");
    expect(archetypeFromBand(2, -2, -2, false, false)).toBe("hollow");
    expect(archetypeFromBand(2, 2, -3, true, false)).toBe("feast");
    expect(archetypeFromBand(3, 0, 3.5, true, false)).toBe("long_winter");
    expect(archetypeFromBand(4, 2, 2, true, false)).toBe("gift");
    expect(archetypeFromBand(1, -6, -6, false, false)).toBe("hollow");
  });
  it("names at least two specific things the player did, with no unfilled slots, in both languages", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const r = playBot(m, thoughtfulBot, seed, { runs: 10 }).result!;
      const named = r.letter.lines.filter((l) => l.slot === "named");
      expect(named.length, `seed ${seed}`).toBe(2);
      expect(new Set(r.letter.namedAll!.map((n) => n.kind)).size, `seed ${seed}`).toBe(2);
      for (const l of r.letter.lines) {
        expect(l.text.en).not.toMatch(/\{[a-z_]+\}/);
        expect(l.text.cy).not.toMatch(/\{[a-z_]+\}/);
      }
    }
  });
});
