// Save strings for the cold playtest fixes (fix6-shots.mjs): a "what happened" step with a crisis
// slip that moved nothing, one with a card slip on a goal its own figure is not about, a turn 2 plan,
// and a Bethesda visit. Usage: npx tsx design/scripts/fix6-saves.ts > out.json
import * as E from "../../src/engine/api";
import { compileFromDisk } from "../../scripts/model-files";

const m = compileFromDisk().model!;
const B = new Set(m.places.find((p) => p.id === "bethesda")!.trigger_cards);
const factStrand = (card: string): string | null => {
  const f = m.cards.find((c) => c.id === card)?.fact;
  const ind = f ? m.indicators.find((i) => i.id === f.indicator) : null;
  return (ind?.["strand"] as string | undefined) ?? null;
};
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
for (let seed = 1; seed < 300 && !(out.shockHeld && out.offGoal && out.plan2 && out.beth); seed++) {
  let s = E.newGame(m, seed, { runs: 20, previewRuns: 10, firstGame: false });
  for (let i = 0; i < 80 && s.step !== "ended"; i++) {
    if (s.step === "plan" && s.term === 1 && !out.plan2) out.plan2 = E.saveGame(s);
    if (s.step === "visit" && s.visitOffer?.place === "bethesda" && !out.beth) out.beth = E.saveGame(s);
    if (s.step === "changed" && s.lastOutcome) {
      const sl = s.lastOutcome.slips;
      if (!out.shockHeld && sl.some((x) => x.shock && x.pipChange === 0)) out.shockHeld = E.saveGame(s);
      if (!out.offGoal && sl.some((x) => x.cause.kind === "card" && !x.shock && factStrand(x.cause.id) && factStrand(x.cause.id) !== x.strand)) out.offGoal = E.saveGame(s);
    }
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
void B;
console.log(JSON.stringify(out, null, 1));
