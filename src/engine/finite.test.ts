import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";
import { playBot, thoughtfulBot, carelessBot } from "./bots";
import type { CompiledModel } from "../model/schema";

const m = testModel();

/** Paths of every number that is not finite (NaN, Infinity) in a value. */
function nonFinite(v: unknown, path = "$", out: string[] = []): string[] {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) out.push(path);
  } else if (Array.isArray(v)) v.forEach((x, i) => nonFinite(x, `${path}[${i}]`, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) nonFinite(x, `${path}.${k}`, out);
  return out.slice(0, 20);
}

/** The exact sequence reported by the UI agent: no cards, decline every pledge, stay, absorb. */
function noCardGame(model: CompiledModel, seed: number, opts: E.NewGameOptions) {
  let s = E.newGame(model, seed, opts);
  const states: E.GameState[] = [s];
  let guard = 0;
  while (s.step !== "ended" && guard++ < 100) {
    if (s.step === "opening") s = E.dispatch(model, s, { type: "open" });
    else if (s.step === "pledge") s = E.dispatch(model, s, { type: "pledge", strand: null });
    else if (s.step === "plan") s = E.dispatch(model, s, { type: "commit", plays: { cards: [] } });
    else if (s.step === "visit") s = E.dispatch(model, s, { type: "visit", choice: null });
    else if (s.step === "passing") s = E.dispatch(model, s, { type: "respond", response: 0 });
    else if (s.step === "changed") s = E.dispatch(model, s, { type: "continue" });
    else if (s.step === "election") s = E.dispatch(model, s, { type: "next" });
    else if (s.step === "caretaker") s = E.dispatch(model, s, { type: "caretaker", shadowPledge: "culture" });
    states.push(s);
  }
  return { s, states };
}

describe("no NaN anywhere", () => {
  it("regression: first game, seed 7, 40 runs, no cards, keeps every wellbeing and strand finite", () => {
    const { s } = noCardGame(m, 7, { firstGame: true, runs: 40 });
    expect(s.step).toBe("ended");
    for (const h of s.history) {
      expect(Number.isFinite(h.wellbeing), `wellbeing ${h.year}`).toBe(true);
      for (const c of h.strands) expect(Number.isFinite(c.flowAfter), `${h.year} ${c.strand}`).toBe(true);
    }
    expect(s.result!.worstTerm).toBeGreaterThanOrEqual(0);
    expect(nonFinite(s.result)).toEqual([]);
  });

  it("regression: a stale model.json without the newer tuning fields still gives finite numbers", () => {
    const stale = structuredClone(m) as CompiledModel;
    delete (stale.game.curveballs as Partial<CompiledModel["game"]["curveballs"]>).shock_scale;
    delete (stale.game.curveballs as Partial<CompiledModel["game"]["curveballs"]>).slow_scale;
    const { s } = noCardGame(stale, 7, { firstGame: true, runs: 40 });
    expect(nonFinite(s.result)).toEqual([]);
    expect(s.history.every((h) => Number.isFinite(h.wellbeing))).toBe(true);
  });

  for (const seed of [1, 7, 23, 99]) {
    it(`every number in every GameState and the EndResult is finite: no-card game, seed ${seed}`, () => {
      const { s, states } = noCardGame(m, seed, { runs: 20 });
      for (const st of states) expect(nonFinite(st), `step ${st.step} ${st.year}`).toEqual([]);
      expect(nonFinite(s.result)).toEqual([]);
      // the state survives a JSON round trip unchanged
      expect(JSON.parse(JSON.stringify(s.result))).toEqual(s.result);
    });
    it(`every number is finite in bot games, seed ${seed}`, () => {
      for (const bot of [thoughtfulBot, carelessBot]) {
        const g = playBot(m, bot, seed, { runs: 15, caretakerGhost: seed === 1 });
        expect(nonFinite(g), bot.id).toEqual([]);
        expect(nonFinite(g.result), bot.id).toEqual([]);
      }
    });
  }
});
