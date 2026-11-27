// Save strings for the fix-8 layout pass (fix8-shots.mjs): turn 2 and turn 4 plans with a full
// hand, a place inviting you (any place, and Bethesda), a "what happened" step and an ended game.
// Usage: npx tsx design/scripts/fix8-saves.ts > out.json
import * as E from "../../src/engine/api";
import { compileFromDisk } from "../../scripts/model-files";

const m = compileFromDisk().model!;
const out: Record<string, string> = {};
const regionFor = (id: string) => {
  const c = m.cards.find((x) => x.id === id)!;
  if (c.scope === "national") return {};
  if (c.scope === "two_regions") return { regions: ["north", "mid"] };
  return { region: c.regions?.includes("north") || !c.regions ? "north" : c.regions[0] };
};
const playSome = (st: E.GameState): E.Plays => {
  const cards: E.Plays["cards"] = [];
  let left = st.budget.available;
  for (const id of st.hand) {
    const c = m.cards.find((x) => x.id === id)!;
    if (cards.length >= st.cardLimit || c.cost > left - 1) continue;
    const next = { cards: [...cards, { card: id, ...regionFor(id) } as E.Plays["cards"][number]] };
    if (E.validatePlays(m, st, next).length) continue;
    cards.push(next.cards[cards.length]!); left -= c.cost;
  }
  return { cards, contingency: Math.max(0, Math.min(2, left)) } as E.Plays;
};
const want = ["plan2", "plan4", "visit", "beth", "changed", "ended", "arrive", "crisis"];
for (let seed = 1; seed < 300 && !want.every((k) => out[k]); seed++) {
  let s = E.newGame(m, seed, { runs: 20, previewRuns: 10, firstGame: false });
  for (let i = 0; i < 80; i++) {
    if (s.step === "ended") { if (!out.ended) out.ended = E.saveGame(s); break; }
    if (s.step === "plan" && s.term === 1 && !out.plan2 && s.hand.length >= 5) out.plan2 = E.saveGame(s);
    if (s.step === "plan" && s.term === 3 && !out.plan4 && s.hand.length >= 5) out.plan4 = E.saveGame(s);
    if (s.step === "visit" && s.visitOffer && s.visitOffer.place !== "bethesda" && !out.visit) out.visit = E.saveGame(s);
    if (s.step === "visit" && s.visitOffer?.place === "bethesda" && !out.beth) out.beth = E.saveGame(s);
    if (s.step === "changed" && s.term === 2 && !out.changed) out.changed = E.saveGame(s);
    if (s.step === "opening" && s.opening?.arrivals.length && !out.arrive) out.arrive = E.saveGame(s);
    if (s.step === "passing" && s.shock && !out.crisis) out.crisis = E.saveGame(s);
    switch (s.step) {
      case "opening": s = E.dispatch(m, s, { type: "open" }); break;
      case "pledge": s = E.dispatch(m, s, { type: "pledge", strand: null }); break;
      case "plan": {
        const p = playSome(s);
        s = E.dispatch(m, s, { type: "commit", plays: E.validatePlays(m, s, p).length ? { cards: [] } : p });
        break;
      }
      case "visit": s = E.dispatch(m, s, { type: "visit", choice: null }); break;
      case "passing": s = E.dispatch(m, s, { type: "respond", response: 1 }); break;
      case "changed": s = E.dispatch(m, s, { type: "continue" }); break;
      case "election": s = E.dispatch(m, s, { type: "next" }); break;
      default: s = E.dispatch(m, s, { type: "caretaker", shadowPledge: "culture" });
    }
  }
}
console.log(JSON.stringify(out));
