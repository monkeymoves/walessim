// Finds save strings for screenshot states: two invitations at once, and a caretaker term.
// Usage: npx tsx design/scripts/find-saves.ts > out.json
import * as E from "../../src/engine/api";
import { compileFromDisk } from "../../scripts/model-files";

const m = compileFromDisk().model!;
const R = new Set(m.places.find((p) => p.id === "rhondda")!.trigger_cards);
const B = new Set(m.places.find((p) => p.id === "bethesda")!.trigger_cards);
const card = (id: string) => m.cards.find((c) => c.id === id)!;
const regionFor = (id: string, place: "r" | "b" | null) => {
  const c = card(id);
  if (c.scope === "national") return {};
  if (c.scope === "two_regions") return { regions: place === "b" ? ["north", "mid"] : ["southeast", "southwest"] };
  if (c.scope === "national_or_region") return place === "b" ? { region: "north" } : place === "r" ? { region: "southeast" } : {};
  return { region: place === "b" ? "north" : place === "r" ? "southeast" : (c.regions?.[0] ?? "north") };
};
const out: Record<string, string> = {};

function step(s: E.GameState, planFn: (s: E.GameState) => E.Plays, careless = false): E.GameState {
  switch (s.step) {
    case "opening": return E.dispatch(m, s, { type: "open" });
    case "pledge": return E.dispatch(m, s, { type: "pledge", strand: careless ? s.pledgeOffer : null });
    case "plan": return E.dispatch(m, s, { type: "commit", plays: planFn(s) });
    case "visit": return E.dispatch(m, s, { type: "visit", choice: null });
    case "passing": return E.dispatch(m, s, { type: "respond", response: 0 });
    case "changed": return E.dispatch(m, s, { type: "continue" });
    case "election": return E.dispatch(m, s, { type: "next" });
    case "caretaker": return E.dispatch(m, s, { type: "caretaker", shadowPledge: "culture" });
    default: return s;
  }
}

// two invitations
for (let seed = 1; seed < 400 && !out.two; seed++) {
  let s = E.newGame(m, seed, { runs: 20, previewRuns: 10, firstGame: false });
  const both = (st: E.GameState): E.Plays => {
    const r = st.hand.find((c) => R.has(c)), b = st.hand.find((c) => B.has(c));
    if (r && b && st.cardLimit >= 2) {
      const plays = { cards: [{ card: r, ...regionFor(r, "r") }, { card: b, ...regionFor(b, "b") }] } as E.Plays;
      if (E.validatePlays(m, st, plays).length === 0) return plays;
    }
    return { cards: [] };
  };
  for (let i = 0; i < 80 && s.step !== "ended"; i++) {
    if (s.step === "visit" && s.visitOffer?.alternatives?.length) { out.two = E.saveGame(s); out.twoSeed = String(seed); out.twoTerm = String(s.term); break; }
    s = step(s, both);
  }
}

// caretaker term: spend nothing, promise and break
for (let seed = 1; seed < 200 && !out.caretaker; seed++) {
  let s = E.newGame(m, seed, { runs: 20, previewRuns: 10, firstGame: false });
  for (let i = 0; i < 80 && s.step !== "ended"; i++) {
    if (s.step === "caretaker") { out.caretaker = E.saveGame(s); out.caretakerSeed = String(seed); break; }
    s = step(s, () => ({ cards: [], standing: "defer-maintenance" }), true);
  }
}
// a plan step in term 2, and a plan step with the regional compact in hand
for (let seed = 1; seed < 400 && !(out.plan && out.partner); seed++) {
  let s = E.newGame(m, seed, { runs: 20, previewRuns: 10, firstGame: false });
  for (let i = 0; i < 80 && s.step !== "ended"; i++) {
    if (s.step === "plan" && s.term === 1 && !out.plan) out.plan = E.saveGame(s);
    if (s.step === "plan" && s.term >= 1 && !out.partner && s.hand.some((c) => c === "regional-compact")) { out.partner = E.saveGame(s); out.partnerCard = "regional-compact"; }
    if (out.plan && out.partner) break;
    s = step(s, () => ({ cards: [] }));
  }
}
// a Bethesda visit with a condition on the board, and one whose threads can grade very well
const beth = m.places.find((p) => p.id === "bethesda")!;
const opts = (beth.options ?? []).map((o) => o.id);
const combos: string[][] = [];
for (let a = 0; a < opts.length; a++) for (let b = a + 1; b < opts.length; b++) for (let c = b + 1; c < opts.length; c++) combos.push([opts[a]!, opts[b]!, opts[c]!]);
for (let seed = 1; seed < 300 && !(out.bethCond && out.veryWell); seed++) {
  let s = E.newGame(m, seed, { runs: 20, previewRuns: 10, firstGame: false });
  const playB = (st: E.GameState): E.Plays => {
    const b = st.hand.find((c) => B.has(c));
    if (b) { const plays = { cards: [{ card: b, ...regionFor(b, "b") }] } as E.Plays; if (!E.validatePlays(m, st, plays).length) return plays; }
    return { cards: [] };
  };
  for (let i = 0; i < 80 && s.step !== "ended"; i++) {
    if (s.step === "visit" && s.visitOffer?.place === "bethesda") {
      if (!out.bethCond && (s.visitOffer.termConditions ?? []).length) out.bethCond = E.saveGame(s);
      if (!out.veryWell) {
        const good = combos.find((th) => E.gradeVisit(m, s, { place: "bethesda", threads: th }).grade === "very_well");
        if (good) { out.veryWell = E.saveGame(s); out.veryWellThreads = good.join(","); out.veryWellN = good.map((id) => String(opts.indexOf(id))).join(","); }
      }
    }
    s = step(s, playB);
  }
}
console.log(JSON.stringify(out, null, 1));
