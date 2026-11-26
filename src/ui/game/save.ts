// Save, resume and share for Yfory. Everything lives under the app's own keys (SAVE_PREFIX),
// never a wholesale clear. A shared game travels in the URL hash as the save string.
import { SAVE_PREFIX } from "../../engine/api";
import { SAVE_KEY } from "../shell/saves";
import type { LetterArchetype } from "../../model/schema";

/** The one game in progress, under the shell's key so the title screen can offer "Carry on". */
const GAME_KEY = SAVE_KEY;
const LETTERS_KEY = `${SAVE_PREFIX}yfory.letters`;
const ONBOARD_KEY = `${SAVE_PREFIX}yfory.onboard`;
const DAILY_KEY = `${SAVE_PREFIX}yfory.daily`;

function get(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function set(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage blocked or full: the game still plays */ }
}

export const readSave = (): string | null => get(GAME_KEY);
export const writeSave = (s: string | null): void => set(GAME_KEY, s);

/** Letter archetypes received so far ("letters received: 2 of 6"). */
export function lettersReceived(): LetterArchetype[] {
  try {
    const v = JSON.parse(get(LETTERS_KEY) ?? "[]");
    return Array.isArray(v) ? (v as LetterArchetype[]) : [];
  } catch { return []; }
}
export function addLetter(a: LetterArchetype): LetterArchetype[] {
  const all = lettersReceived();
  if (!all.includes(a)) all.push(a);
  set(LETTERS_KEY, JSON.stringify(all));
  return all;
}

/** Onboarding notes already seen, so the guide never repeats itself. */
export function onboardSeen(): Set<string> {
  try { return new Set(JSON.parse(get(ONBOARD_KEY) ?? "[]") as string[]); } catch { return new Set(); }
}
export function saveOnboard(seen: Set<string>): void { set(ONBOARD_KEY, JSON.stringify([...seen])); }

/** The date of the last daily game recorded as "today's" (further attempts are practice). */
export const dailyPlayed = (): string | null => get(DAILY_KEY);
export const markDaily = (date: string): void => set(DAILY_KEY, date);

/** Today as YYYY-MM-DD in the player's own calendar. */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------------------------------------------------------------- URL

/** Reads `g` (a shared save) and `seed` / `daily` from the hash query, e.g. #/yfory?g=... */
export function hashParams(): URLSearchParams {
  if (typeof location === "undefined") return new URLSearchParams();
  const h = location.hash;
  const i = h.indexOf("?");
  return new URLSearchParams(i >= 0 ? h.slice(i + 1) : "");
}

/** A link that opens this finished game (the save string in the URL). */
export function shareLink(save: string): string {
  const base = typeof location !== "undefined" ? `${location.origin}${location.pathname}` : "";
  return `${base}#/yfory?g=${encodeURIComponent(save)}`;
}

/** Drop the query from the hash without adding a history entry. */
export function clearHashParams(): void {
  if (typeof location === "undefined") return;
  const h = location.hash;
  const i = h.indexOf("?");
  if (i < 0) return;
  history.replaceState(null, "", `${location.pathname}${location.search}${h.slice(0, i)}`);
}
