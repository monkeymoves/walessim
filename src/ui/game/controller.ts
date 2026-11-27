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
import { saveCap } from "./endturn";
import { addLetter, clearHashParams, hashParams, lettersReceived, markDaily, readSave, today, writeSave } from "./save";

export interface Draft {
  cards: CardPlay[];
  standing: "borrow-to-invest" | "defer-maintenance" | null;
  repayDebt: number;
  repair: boolean;
  skipUpkeep: string[];
  holdOver: string | null;
  /**
   * Coins the player chose to put in the emergency fund (plain-wales 3.3). UI only: the engine
   * treats every unspent coin the same, but no coin is saved or lost without the player saying so.
   */
  saved: number;
}

const emptyDraft = (): Draft => ({ cards: [], standing: null, repayDebt: 0, repair: false, skipUpkeep: [], holdOver: null, saved: 0 });

export interface TraceRef { term: number; strand: StrandId; part: "flow" | "stock"; index: number; key?: string }

export interface StartOptions {
  seed?: number | string;
  daily?: boolean;
  firstGame?: boolean;
}

export type Game = ReturnType<typeof createGame>;

export { saveCap } from "./endturn";

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
  /** The region a not-yet-played regional card is previewed in (hovered or focused in the tray). */
  const [previewRegion, setPreviewRegion] = createSignal<RegionId | null>(null);
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
        // never a silent new game (cold playtest 6, item 9): start one, then say so
        console.warn("saved game unreadable", e);
        start();
        setError("game.save.load_failed");
        return;
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

  /**
   * Coins for the plan as drafted: total, spent on cards (and repayments), left over; of what is
   * left, `fund` the player has put in the emergency fund and `unused` not yet decided.
   */
  const budget = createMemo(() => {
    const s = state();
    if (!s) return { total: 0, spent: 0, left: 0, fund: 0, unused: 0 };
    const standingGain = draft.standing ? (names.standingTicket(draft.standing)?.budget ?? 0) : 0;
    const skipped = s.upkeepDue.filter((u) => draft.skipUpkeep.includes(u.id)).reduce((a, u) => a + u.pips, 0);
    const total = s.budget.available + standingGain + skipped;
    const debtCost = model.game.debt.clear_cost * draft.repayDebt;
    const repairCost = draft.repair ? (names.standingTicket("defer-maintenance")?.clear_cost ?? 3) : 0;
    const spent = draft.cards.reduce((a, c) => a + costOf(c), 0) + debtCost + repairCost;
    const left = total - spent;
    const fund = Math.max(0, Math.min(draft.saved, left));
    return { total, spent, left, fund, unused: Math.max(0, left - fund) };
  });

  /**
   * The most coins worth saving, the one cap every line about saving states (cold playtest 6, item 2:
   * "Up to 2 carry over" beside "Save 4"). A crisis can use at most 2 (the largest response), and if
   * none comes up to `contingency_carry` carry over, so a saved coin beyond the smaller of the two can
   * be lost. In turn 1 of a first game no crisis can come, so only the carry counts.
   */
  const usefulSave = createMemo(() => {
    const s = state();
    if (!s) return 0;
    return saveCap(model.game.contingency_carry ?? 2, s.term === 0 && s.options.firstGame);
  });
  /** Trust's card cap beside the coins (cold playtest 6): how many cards may be played, and how many are left. */
  const cardCap = createMemo(() => {
    const s = state();
    const limit = s?.cardLimit ?? 0;
    return { limit, played: draft.cards.length, left: Math.max(0, limit - draft.cards.length) };
  });
  function setSaved(n: number): void { setDraft("saved", Math.max(0, Math.min(n, Math.max(0, budget().left)))); }

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

  /** Coins the player put in the emergency fund at the last commit, for the results step. */
  const [savedAt, setSavedAt] = createSignal<{ term: number; n: number } | null>(null);
  function commit(): boolean {
    if (problems().length) return false;
    const s = state();
    const fund = Math.min(budget().fund, usefulSave());
    if (s) setSavedAt({ term: s.term, n: fund });
    // the engine holds exactly the coins saved: the rest are lost, as the end-of-turn sheet said
    return act({ type: "commit", plays: { ...plays(), save: fund } });
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
    if (card.scope === "region") extra.region = previewRegionFor(id);
    if (card.scope === "two_regions") extra.regions = (card.regions?.length ? card.regions : ["north", "mid"]).slice(0, 2) as RegionId[];
    return { card: id, preview: previewOf({ ...p, cards: [...p.cards, extra] }), base: planPreview() };
  });

  /**
   * The preview's region is only a stand-in: nothing pointed at and the card not played, so the card
   * must not say "If you play this in South East Wales" as if it had been chosen (cold playtest 6).
   */
  function previewRegionIsGuess(id: string): boolean {
    return !isPlayed(id) && previewRegion() == null;
  }

  /** The region a regional card is previewed in before it is played: the one pointed at, else the last used. */
  function previewRegionFor(id: string): RegionId {
    const card = names.card(id);
    const legal = (card?.regions?.length ? card.regions : ["north", "mid", "southwest", "southeast"]) as RegionId[];
    const r = previewRegion() ?? lastRegion();
    return r && legal.includes(r) ? r : legal.includes("southeast") ? "southeast" : legal[0]!;
  }

  const lastRegion = createMemo<RegionId | undefined>(() => {
    for (let i = draft.cards.length - 1; i >= 0; i--) if (draft.cards[i]!.region) return draft.cards[i]!.region;
    return undefined;
  });

  // ------------------------------------------------------------ traces

  const threads = createMemo<Thread[]>(() => {
    const s = state();
    const tr = trace();
    if (!s || !tr) return [];
    try {
      const all = pullThread(model, s, tr.term, tr.strand, tr.part);
      // a slip opens its own thread first; the rest follow
      if (tr.key) {
        const i = all.findIndex((x) => (x as { key?: string }).key === tr.key);
        if (i > 0) return [all[i]!, ...all.slice(0, i), ...all.slice(i + 1)];
      }
      return all;
    } catch (e) { console.warn("pullThread failed", e); return []; }
  });

  function pull(strand: StrandId, part: "flow" | "stock" = "flow", term?: number, key?: string): void {
    const s = state();
    if (!s) return;
    const t = term ?? (s.lastOutcome?.term ?? s.history[s.history.length - 1]?.term ?? 0);
    setTrace({ term: t, strand, part, index: 0, key });
  }

  return {
    model, names, state, draft, plays, problems, budget, planPreview, ghost, threads, trace, letters,
    selected, setSelected, hovered, setHovered, ledgerOpen, setLedgerOpen, shared, error, setError, lastSave, usefulSave, setSaved, previewRegion, setPreviewRegion, previewRegionFor, previewRegionIsGuess, savedAt, cardCap,
    start, boot, act, commit,
    isPlayed, playOf, costOf, canAfford, blockOf, play, unplay, setRegion, setStanding, setRepay, setRepair, toggleUpkeep, setHold,
    pull, setTrace,
  };
}
