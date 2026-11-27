// Cold playtest 6, item 9: "the hand re-deals on reload". A save is the seed, the options and the
// action log; loading replays the log. The engine once halved its runs when a resolve was slow on the
// clock, so a slow live game and a fast replay drew different bars, and some replays threw and the
// screen started a new game with a new hand. Save, reload, and the game must be the same game.
import { afterEach, describe, expect, it, vi } from "vitest";
import * as E from "./api";
import { ALL_BOTS } from "./bots";
import { testModel } from "./test-model";

const m = testModel();
afterEach(() => vi.restoreAllMocks());

/** The parts of the state a player sees: the hand, the step, the bars, Trust and the budget. */
const seen = (s: E.GameState) => JSON.stringify({ term: s.term, step: s.step, hand: s.hand, strands: s.strands, trust: s.trust, cardLimit: s.cardLimit, budget: s.budget, pledgeOffer: s.pledgeOffer });

describe("save and reload", () => {
  it("restores the exact hand and state at every step, even when the live game ran slowly", () => {
    let checked = 0;
    for (const [bi, seed] of [[0, 1], [2, 2]] as const) {
      const bot = ALL_BOTS[bi]!;
      let s = E.newGame(m, seed, { firstGame: true, runs: 40, previewRuns: 4 });
      // the live game runs on a slow device: every clock reading is 400 ms later than the last
      let t = 0;
      const slow = () => vi.spyOn(performance, "now").mockImplementation(() => (t += 400));
      let guard = 0;
      while (s.step !== "ended" && guard++ < 100) {
        slow();
        if (s.step === "plan") {
          const plays = bot.plan(m, s);
          s = E.dispatch(m, s, { type: "commit", plays: E.validatePlays(m, s, plays).length ? { cards: [] } : plays });
        } else if (s.step === "opening") s = E.dispatch(m, s, { type: "open" });
        else if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: bot.pledge(m, s) });
        else if (s.step === "visit") s = E.dispatch(m, s, { type: "visit", choice: bot.visit(m, s) });
        else if (s.step === "passing") s = E.dispatch(m, s, { type: "respond", response: bot.respond(m, s) });
        else if (s.step === "caretaker") s = E.dispatch(m, s, { type: "caretaker", shadowPledge: [...s.strands].sort((a, b) => b.flow - a.flow)[0]!.strand });
        else if (s.step === "changed") s = E.dispatch(m, s, { type: "continue" });
        else if (s.step === "election") s = E.dispatch(m, s, { type: "next" });
        // the reload runs fast
        vi.restoreAllMocks();
        const again = E.loadGame(m, E.saveGame(s));
        expect(seen(again), `seed ${seed}, ${s.step} of term ${s.term}`).toBe(seen(s));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  }, 120000);
});
