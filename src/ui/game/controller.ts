// The game controller: one GameState signal driven through the engine's step machine, the
// player's draft plan for the term, previews, traces and saving. Components read from here and
// call its methods; none of them call the engine directly.
import { batch, createMemo, createSignal, type Accessor } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import {
  cardCost, dailySeed, dispatch, loadGame, newGame, preview, pullThread, saveGame, validatePlays,
} from "./engine";
import {
  type Action, type CardPlay, type GameState, type NewGameOptions, type Plays, type Preview, type Problem,
  type RegionId, type StrandId, type Thread,
} from "../../engine/api";
import type { CompiledModel } from "../../model/schema";
import { makeNames, type Lookup } from "./names";
import { addLetter, clearHashParams, hashParams, lettersReceived, markDaily, readSave, today, writeSave } from "./save";

export interface Draft {
  cards: CardPlay[];
  standing: "borrow-to-invest" | "defer-maintenance" | null;
  repayDebt: number;
  repair: boolean;
  skipUpkeep: string[];
  holdOver: string | null;
}

const emptyDraft = (): Draft => ({ cards: [], standing: null, repayDebt: 0, repair: false, skipUpkeep: [], holdOver: null });

export interface TraceRef { term: number; strand: StrandId; part: "flow" | "stock"; index: number }

export interface StartOptions {
  seed?: number | string;
  daily?: boolean;
  firstGame?: boolean;
}

export type Game = ReturnType<typeof createGame>;

/**
 * Create the controller. `overrides` are the model book parameter changes from the shell's
 * store, passed to newGame (a modified rule set).
 */
export function createGame(model: CompiledModel, opts: { overrides?: Accessor<Record<string, number>>; onError?: (key: string) => void } = {}) {
  const names: Lookup = makeNames(model);
  const [state, setState] = createSignal<GameState | null>(null);
  const [draft, setDraft] = createStore<Draft>(emptyDraft());
  const [selected, setSelected] = createSignal<string | null>(null);
  const [hovered, setHovered] = createSignal<string | null>(null);
  const [trace, setTrace] = createSignal<TraceRef | null>(null);
  const [ledgerOpen, setLedgerOpen] = createSignal(false);
  const [shared, setShared] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [letters, setLetters] = createSignal(lettersReceived());
  const [lastSave, setLastSave] = createSignal<string | null>(null);

  // ------------------------------------------------------------ lifecycle

  function persist(s: GameState): void {
    let str: string | null = null;
    try { str = saveGame(model, s); } catch { str = null; }
    setLastSave(str);
    if (!shared() && str) writeSave(str);
  }

  function adopt(s: GameState, keepDraft = false): void {
    const prev = state();
    batch(() => {
      setState(s);
      if (!keepDraft && (!prev || prev.term !== s.term || prev.step !== s.step)) {
        if (s.step === "plan" && !(prev && prev.term === s.term && prev.step === "plan")) {
          setDraft(reconcile(emptyDraft()));
          setSelected(null);
          setHovered(null);
        }
      }
      if (s.step !== "changed" && s.step !== "election" && s.step !== "ended") setTrace(null);
    });
    if (s.step === "ended" && s.result) setLetters(addLetter(s.result.archetype));
    persist(s);
  }

  /** Start a fresh game. The first game a browser ever plays is the curated, guided one. */
  function start(o: StartOptions = {}): void {
    const date = today();
    const isDaily = !!o.daily;
    const seed = isDaily ? dailySeed(model, date) : (o.seed ?? Math.floor(Math.random() * 2 ** 31));
    const options: NewGameOptions = {
      firstGame: o.firstGame ?? (!isDaily && lettersReceived().length === 0),
      paramOverrides: opts.overrides?.() ?? {},
    };
    if (isDaily) {
      options.daily = date;
      markDaily(date);
    }
    if (options.paramOverrides && Object.keys(options.paramOverrides).length === 0) delete options.paramOverrides;
    setShared(false);
    try {
      adopt(newGame(model, seed, options));
      setError(null);
    } catch (e) {
      console.error(e);
      setError("game.error.engine");
    }
  }

  /** Resume the saved game, or a shared one from the URL, or start the first game. */
  function boot(): void {
    const params = hashParams();
    const g = params.get("g");
    if (g) {
      try {
        const s = loadGame(model, g);
        setShared(true);
        adopt(s);
        return;
      } catch (e) {
        console.warn("shared game unreadable", e);
      }
    }
    // a seed or daily link starts that game once; the params are then cleared, so a reload resumes it
    if (params.get("daily") != null) { start({ daily: true }); clearHashParams(); return; }
    const seed = params.get("seed");
    if (seed) { start({ seed }); clearHashParams(); return; }
    const saved = readSave();
    if (saved) {
      try {
        adopt(loadGame(model, saved));
        return;
      } catch (e) {
        console.warn("saved game unreadable", e);
        setError("game.save.load_failed");
      }
    }
    start();
  }

  /** Apply one action through the step machine, then save. */
  function act(action: Action): boolean {
    const s = state();
    if (!s) return false;
    try {
      const next = dispatch(model, s, action);
      adopt(next, action.type === "peek");
      setError(null);
      return true;
    } catch (e) {
      console.error(e);
      setError("game.error.engine");
      opts.onError?.("game.error.engine");
      return false;
    }
  }

  // ------------------------------------------------------------ the plan

  const plays = createMemo<Plays>(() => ({
    cards: draft.cards.map((c) => ({ ...c, regions: c.regions ? [...c.regions] : undefined })),
    standing: draft.standing,
    repayDebt: draft.repayDebt,
    repair: draft.repair,
    skipUpkeep: [...draft.skipUpkeep],
    holdOver: draft.holdOver,
  }));

  const problems = createMemo<Problem[]>(() => {
    const s = state();
    if (!s || s.step !== "plan") return [];
    try { return validatePlays(model, s, plays()); } catch { return []; }
  });

  const isPlayed = (id: string) => draft.cards.some((c) => c.card === id);
  const playOf = (id: string) => draft.cards.find((c) => c.card === id);

  function costOf(play: CardPlay): number {
    const s = state();
    if (!s) return names.card(play.card)?.cost ?? 0;
    try { return cardCost(model, s, play); } catch { return names.card(play.card)?.cost ?? 0; }
  }

  /** Pips for the plan as drafted: total, spent, left (contingency). */
  const budget = createMemo(() => {
    const s = state();
    if (!s) return { total: 0, spent: 0, left: 0 };
    const standingGain = draft.standing ? (names.standingTicket(draft.standing)?.budget ?? 0) : 0;
    const skipped = s.upkeepDue.filter((u) => draft.skipUpkeep.includes(u.id)).reduce((a, u) => a + u.pips, 0);
    const total = s.budget.available + standingGain + skipped;
    const debtCost = model.game.debt.clear_cost * draft.repayDebt;
    const repairCost = draft.repair ? (names.standingTicket("defer-maintenance")?.clear_cost ?? 3) : 0;
    const spent = draft.cards.reduce((a, c) => a + costOf(c), 0) + debtCost + repairCost;
    return { total, spent, left: total - spent };
  });

  function canAfford(id: string, region?: RegionId): boolean {
    return costOf({ card: id, region }) <= budget().left;
  }

  /** Why a card cannot be played now, as an i18n key, or null. */
  function blockOf(id: string): string | null {
    const s = state();
    if (!s || s.step !== "plan" || isPlayed(id)) return null;
    if (draft.cards.length >= s.cardLimit) return "game.plan.cannot_limit";
    if (!canAfford(id)) return "game.plan.cannot_budget";
    return null;
  }

  function play(id: string, region?: RegionId, regions?: RegionId[]): void {
    const s = state();
    if (!s || s.step !== "plan" || isPlayed(id)) return;
    const p: CardPlay = { card: id };
    if (region) p.region = region;
    if (regions) p.regions = regions;
    setDraft("cards", (cs) => [...cs, p]);
    if (draft.holdOver === id) setDraft("holdOver", null);
  }
  function setRegion(id: string, region: RegionId | undefined, regions?: RegionId[]): void {
    const i = draft.cards.findIndex((c) => c.card === id);
    if (i < 0) return;
    setDraft("cards", i, { region, regions });
  }
  function unplay(id: string): void {
    setDraft("cards", (cs) => cs.filter((c) => c.card !== id));
  }
  function setStanding(v: Draft["standing"]): void { setDraft("standing", v); }
  function setRepay(n: number): void { setDraft("repayDebt", Math.max(0, n)); }
  function setRepair(v: boolean): void { setDraft("repair", v); }
  function toggleUpkeep(id: string): void {
    setDraft("skipUpkeep", (xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  }
  function setHold(id: string | null): void { setDraft("holdOver", id); }

  function commit(): boolean {
    if (problems().length) return false;
    return act({ type: "commit", plays: plays() });
  }

  // ------------------------------------------------------------ previews

  const cache = new Map<string, Preview | null>();
  function previewOf(p: Plays): Preview | null {
    const s = state();
    if (!s || s.step !== "plan") return null;
    const key = `${s.term}|${s.log.length}|${JSON.stringify(p)}`;
    if (cache.has(key)) return cache.get(key)!;
    let out: Preview | null = null;
    try { out = preview(model, s, p); } catch (e) { console.warn("preview failed", e); }
    if (cache.size > 200) cache.clear();
    cache.set(key, out);
    return out;
  }

  /** The plan as it stands. */
  const planPreview = createMemo(() => previewOf(plays()));

  /** The plan with nothing played: the baseline a ghost is measured against. */
  const emptyPreview = createMemo(() => previewOf({ cards: [] }));

  /**
   * The ghost: what the hovered (or selected) card adds on top of the plan, or what the whole plan
   * adds when nothing is hovered. `base` is the preview it is measured against, so the ghost shows
   * the card's own effect, not the term's drift.
   */
  const ghost = createMemo<{ card: string | null; preview: Preview | null; base: Preview | null } | null>(() => {
    const s = state();
    if (!s || s.step !== "plan") return null;
    const id = hovered() ?? selected();
    if (!id) return draft.cards.length ? { card: null, preview: planPreview(), base: emptyPreview() } : null;
    if (isPlayed(id)) {
      const p = plays();
      return { card: id, preview: planPreview(), base: previewOf({ ...p, cards: p.cards.filter((c) => c.card !== id) }) };
    }
    const card = names.card(id);
    if (!card) return null;
    const p = plays();
    const extra: CardPlay = { card: id };
    if (card.scope === "region") extra.region = lastRegion() ?? card.regions?.[0] ?? "southeast";
    if (card.scope === "two_regions") extra.regions = (card.regions?.length ? card.regions : ["north", "mid"]).slice(0, 2) as RegionId[];
    return { card: id, preview: previewOf({ ...p, cards: [...p.cards, extra] }), base: planPreview() };
  });

  const lastRegion = createMemo<RegionId | undefined>(() => {
    for (let i = draft.cards.length - 1; i >= 0; i--) if (draft.cards[i]!.region) return draft.cards[i]!.region;
    return undefined;
  });

  // ------------------------------------------------------------ traces

  const threads = createMemo<Thread[]>(() => {
    const s = state();
    const tr = trace();
    if (!s || !tr) return [];
    try { return pullThread(model, s, tr.term, tr.strand, tr.part); } catch (e) { console.warn("pullThread failed", e); return []; }
  });

  function pull(strand: StrandId, part: "flow" | "stock" = "flow", term?: number): void {
    const s = state();
    if (!s) return;
    const t = term ?? (s.lastOutcome?.term ?? s.history[s.history.length - 1]?.term ?? 0);
    setTrace({ term: t, strand, part, index: 0 });
  }

  return {
    model, names, state, draft, plays, problems, budget, planPreview, ghost, threads, trace, letters,
    selected, setSelected, hovered, setHovered, ledgerOpen, setLedgerOpen, shared, error, setError, lastSave,
    start, boot, act, commit,
    isPlayed, playOf, costOf, canAfford, blockOf, play, unplay, setRegion, setStanding, setRepay, setRepair, toggleUpkeep, setHold,
    pull, setTrace,
  };
}
