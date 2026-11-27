// UI state for the map in play and the notebook (plain-wales 5 and 6). Kept out of the game state
// so saves are unchanged: which panel is open, whether the map compares the regions on a card's
// measure, what is opened over the game, and the notebook of places, sources and rules looked at.
// The notebook is stored under one key of the app's own prefix; nothing else is cleared.
import { createRoot, createSignal } from "solid-js";
import { SAVE_PREFIX } from "../../engine/api";

const NOTEBOOK_KEY = `${SAVE_PREFIX}yfory.notebook`;

export interface Notebook {
  /** The game the notebook belongs to (its seed): a new game starts a clean notebook. */
  game: string;
  las: string[];
  sources: string[];
  rules: string[];
}

/** What is open over the game: the atlas (at an area, on a measure) or a rule book page. */
export type Overlay = { kind: "atlas"; code: string | null; lens: string | null; explorer?: boolean } | { kind: "book"; page: string };

function readNotebook(): Notebook {
  try {
    const v = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) ?? "null") as Notebook | null;
    if (v && typeof v.game === "string" && Array.isArray(v.las) && Array.isArray(v.sources) && Array.isArray(v.rules)) return v;
  } catch { /* storage blocked or unreadable: start empty */ }
  return { game: "", las: [], sources: [], rules: [] };
}

function writeNotebook(n: Notebook): void {
  try { localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(n)); } catch { /* storage blocked: the notebook lasts the session */ }
}

const store = createRoot(() => {
  const [walesOpen, setWalesOpen] = createSignal(false);
  const [compare, setCompare] = createSignal(false);
  const [overlay, setOverlay] = createSignal<Overlay | null>(null);
  /** A short line for the selection strip after a click that did nothing ("not a region this card can go"). */
  const [flash, setFlash] = createSignal<string | null>(null);
  /** The region under the pointer or keyboard while a card asks "Where?". */
  const [regionHover, setRegionHover] = createSignal<string | null>(null);
  /** The region the map zoomed to after a card was given one: { card, region }. */
  const [focusRegion, setFocusRegion] = createSignal<{ card: string; region: string } | null>(null);
  const [notebook, setNotebookSignal] = createSignal<Notebook>(readNotebook());
  return { walesOpen, setWalesOpen, compare, setCompare, overlay, setOverlay, flash, setFlash, regionHover, setRegionHover, focusRegion, setFocusRegion, notebook, setNotebookSignal };
});

export const inplay = store;

/** Start or continue the notebook for this game. */
export function useNotebookFor(game: string): void {
  if (store.notebook().game === game) return;
  const n = { game, las: [], sources: [], rules: [] };
  store.setNotebookSignal(n);
  writeNotebook(n);
}

function note(field: "las" | "sources" | "rules", id: string): void {
  const n = store.notebook();
  if (!id || n[field].includes(id)) return;
  const next = { ...n, [field]: [...n[field], id] };
  store.setNotebookSignal(next);
  writeNotebook(next);
}

/** A council area was opened (in the in-play panel or the atlas). */
export const noteArea = (code: string): void => note("las", code);
/** A source card was opened. */
export const noteSource = (id: string): void => note("sources", id);
/** A rule page was read. */
export const noteRule = (id: string): void => note("rules", id);

/** Open the atlas over the game, at an area and on a measure; with `explorer`, the table of the 22 sorted by it. */
export function openAtlas(code: string | null, lens: string | null, explorer = false): void {
  store.setOverlay({ kind: "atlas", code, lens, explorer });
}

/** Open a rule book page over the game ("R08", or a section such as "indicators"). */
export function openBook(page: string): void {
  if (/^R\d\d$/.test(page)) noteRule(page);
  store.setOverlay({ kind: "book", page });
}

/** Everything back to the plain national view (a new turn, a new game). */
export function resetInplay(): void {
  store.setWalesOpen(false);
  store.setCompare(false);
  store.setFlash(null);
  store.setRegionHover(null);
  store.setFocusRegion(null);
}
