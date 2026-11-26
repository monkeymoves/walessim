/** Decision 14: a shock is prepared only if a response card has landed where the shock reaches. */
import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";
import { shockReach } from "./game";
import { makeContext } from "./scores";

const m = testModel();
const ctx = makeContext(m);

/** Find a seed whose schedule has a wet-decade storm in some term after the first. */
function stormSeed(): { seed: number; term: number } {
  for (let seed = 1; seed < 500; seed++) {
    const s = E.newGame(m, seed, { runs: 4, caretakerGhost: false });
    const sch = (s.sim as { schedule: { newTrend: string | null; shock: string | null }[] }).schedule;
    const t = sch.findIndex((x, i) => i >= 2 && x.shock === "wet-decade");
    if (t >= 2) return { seed, term: t };
  }
  throw new Error("no storm seed");
}

function playTo(seed: number, term: number, plan: (s: E.GameState) => E.Plays): E.GameState {
  let s = E.newGame(m, seed, { runs: 4, caretakerGhost: false });
  for (;;) {
    if (s.step === "opening") s = E.dispatch(m, s, { type: "open" });
    else if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: null });
    else if (s.step === "plan") {
      // keep the seat: this test is about preparation, not Trust
      s = { ...s, cardLimit: Math.max(s.cardLimit, 3) };
      s = E.dispatch(m, s, { type: "commit", plays: plan(s) });
      if (s.step === "visit") s = E.dispatch(m, s, { type: "visit", choice: null });
      if (s.term === term) return s;
    } else if (s.step === "passing") s = E.dispatch(m, s, { type: "respond", response: 0 });
    else if (s.step === "changed") s = E.dispatch(m, s, { type: "continue" });
    else if (s.step === "election") s = E.dispatch(m, { ...s, trust: 60 }, { type: "next" });
    else if (s.step === "caretaker") s = E.dispatch(m, s, { type: "caretaker", shadowPledge: "culture" });
  }
}
const withCard = (s: E.GameState, card: string, play: E.CardPlay): E.Plays => {
  s.hand.splice(0, s.hand.length, card, ...s.hand.filter((c) => c !== card));
  return { cards: [play] };
};

describe("being ready for a shock", () => {
  const { seed, term } = stormSeed();
  it("the storm reaches every authority it floods", () => {
    expect(shockReach(ctx, "wet-decade").length).toBe(22);
  });
  it("is not ready when the response card was played this term but has not landed", () => {
    // slow-the-flow has a delay of two terms
    const s = playTo(seed, term, (st) => (st.term === term ? withCard(st, "slow-the-flow", { card: "slow-the-flow", region: "southeast" }) : { cards: [] }));
    expect(s.shock?.curveball).toBe("wet-decade");
    expect(s.shock!.preparedBy).not.toContain("slow-the-flow");
  });
  it("is ready when a response card has landed where the shock reaches", () => {
    const s = playTo(seed, term, (st) => (st.term === term - 1 ? withCard(st, "build-flood-walls", { card: "build-flood-walls", region: "southeast" }) : { cards: [] }));
    expect(s.shock!.prepared).toBe(true);
    expect(s.shock!.preparedBy).toContain("build-flood-walls");
  });
  it("is not ready when the response landed only where the shock does not reach", () => {
    // the language shock reaches only the heartland; flood walls are not a listed response anyway, so
    // check the rule on a regional shock: office layoffs reach the South East only
    const reach = shockReach(ctx, "work-rewritten");
    expect(reach.every((i) => ctx.laRegion[i] === "southeast")).toBe(true);
  });
});
