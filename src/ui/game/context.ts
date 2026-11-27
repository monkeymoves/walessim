// Shared context for the game screen: the controller, the map, and the UI-only state that is
// not part of the game (which piece is open, which card is waiting for a region, the guide).
import { createContext, createSignal, useContext, type Accessor } from "solid-js";
import type { PaperMap } from "../../map";
import type { RegionId, VisitOffer } from "../../engine/api";
import type { Game } from "./controller";
import { onboardSeen, saveOnboard } from "./save";

export type NoteId =
  | "hand" | "ticket" | "play" | "post" | "commit" | "strands" | "pull" | "trust" | "region"
  // plain-wales section 4: the first-turn script and the later one-time notes
  | "how" | "slow_change" | "card_place" | "slow_card" | "coins_left" | "why" | "handoff"
  | "promise" | "visit" | "marker" | "crisis" | "upkeep" | "borrow" | "lost" | "lookup";

/** The order the guide teaches in. One note at a time, at most one sentence each. */
const NOTE_ORDER: NoteId[] = [
  "how", "slow_change", "hand", "card_place", "slow_card", "coins_left", "why", "trust", "handoff",
  "ticket", "play", "region", "post", "commit", "strands", "pull",
  "promise", "visit", "marker", "crisis", "upkeep", "borrow", "lost", "lookup",
];

export function createUi() {
  const [map, setMap] = createSignal<PaperMap | null>(null);
  const [mapView, setMapView] = createSignal<"national" | "place" | "folding">("national");
  /** A card in the plan waiting for its region (the map lights the four). */
  const [regionPick, setRegionPick] = createSignal<string | null>(null);
  /** True while a place visit is open (the map has folded into the place). */
  const [inPlace, setInPlace] = createSignal(false);
  /** The place offer the player chose to go to (the main one, or an alternative). */
  const [visitPick, setVisitPick] = createSignal<VisitOffer | null>(null);
  /** An authority picked on the map (opening and plan): the place panel. */
  const [laPanel, setLaPanel] = createSignal<string | null>(null);
  /** Which strands have finished ticking in the "what changed" replay (count, left to right). */
  const [ticked, setTicked] = createSignal(7);
  /** Live announcements for screen readers. */
  const [announce, setAnnounce] = createSignal("");
  /** The player opened a card they could not afford this game: Borrowing and bills is shown from then on. */
  const [shortfall, setShortfall] = createSignal(false);
  /** Regions chosen so far for a card that needs two (not yet played). */
  const [twoPick, setTwoPick] = createSignal<Record<string, RegionId[]>>({});

  // ---- the guide: stitched notes inside play, skippable, never repeated
  const seen = onboardSeen();
  const [skipped, setSkipped] = createSignal(seen.has("__skip"));
  const [seenTick, setSeenTick] = createSignal(0);
  const hasSeen = (id: NoteId) => { seenTick(); return seen.has(id); };
  function done(id: NoteId): void {
    if (seen.has(id)) return;
    seen.add(id);
    saveOnboard(seen);
    setSeenTick((n) => n + 1);
  }
  function skipGuide(): void {
    seen.add("__skip");
    for (const n of NOTE_ORDER) seen.add(n);
    saveOnboard(seen);
    setSkipped(true);
    setSeenTick((n) => n + 1);
  }
  /** "Show me how to play": forget every note seen, so the guide runs again from the start. */
  function resetGuide(): void {
    seen.clear();
    saveOnboard(seen);
    setSkipped(false);
    setSeenTick((n) => n + 1);
  }
  /** Is this note the one to show now? `when` is the note's own trigger condition. */
  function noteFor(id: NoteId, when: boolean): boolean {
    seenTick();
    if (skipped() || !when || seen.has(id)) return false;
    return true;
  }

  return {
    map, setMap, mapView, setMapView, regionPick, setRegionPick, inPlace, setInPlace, visitPick, setVisitPick, laPanel, setLaPanel,
    ticked, setTicked, announce, setAnnounce, shortfall, setShortfall, twoPick, setTwoPick,
    guide: { hasSeen, done, skip: skipGuide, reset: resetGuide, noteFor, skipped },
  };
}

export type Ui = ReturnType<typeof createUi>;

export const GameContext = createContext<{ game: Game; ui: Ui }>();

export function useGame(): { game: Game; ui: Ui } {
  const c = useContext(GameContext);
  if (!c) throw new Error("useGame outside GameScreen");
  return c;
}

export type { Accessor };
