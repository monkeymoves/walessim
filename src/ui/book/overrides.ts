// Model book parameter overrides ("R13.coef": -1.2). Kept in localStorage under
// etifeddiaeth.v1.overrides and in the URL (?rules=R13.coef:-1.2;R06.coef:1.1) so a modified
// rule set can be shared. A link's rules win over what this browser had stored.
// UI lead B: pass paramOverrides() to newGame({ paramOverrides }). Any override marks the game
// as a modified rule set, and the shell shows the badge whenever isModified() is true.
import { createRoot, createSignal } from "solid-js";
import type { CompiledModel, Param } from "../../model/schema";

export const OVERRIDES_KEY = "etifeddiaeth.v1.overrides";
const URL_PARAM = "rules";

export type Overrides = Record<string, number>;

function parseUrl(): Overrides | null {
  if (typeof location === "undefined") return null;
  const raw = new URLSearchParams(location.search).get(URL_PARAM);
  if (!raw) return null;
  const out: Overrides = {};
  for (const pair of raw.split(";")) {
    const i = pair.lastIndexOf(":");
    if (i <= 0) continue;
    const v = Number(pair.slice(i + 1));
    if (Number.isFinite(v)) out[pair.slice(0, i)] = v;
  }
  return out;
}

function readStored(): Overrides {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return {};
    return Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([, v]) => typeof v === "number" && Number.isFinite(v))) as Overrides;
  } catch {
    return {};
  }
}

const store = createRoot(() => {
  const [overrides, setOverridesSignal] = createSignal<Overrides>(typeof window === "undefined" ? {} : (parseUrl() ?? readStored()));
  return { overrides, setOverridesSignal };
});

/** The current overrides (reactive). */
export const overrides = store.overrides;

/** True when any parameter differs from its default. */
export const isModified = (): boolean => Object.keys(store.overrides()).length > 0;

/** A copy for newGame's `paramOverrides`. */
export const paramOverrides = (): Overrides => ({ ...store.overrides() });

function persist(o: Overrides): void {
  store.setOverridesSignal(o);
  try {
    if (Object.keys(o).length) localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
    else localStorage.removeItem(OVERRIDES_KEY);
  } catch { /* storage blocked */ }
  if (typeof location !== "undefined") {
    const sp = new URLSearchParams(location.search);
    const enc = Object.entries(o).map(([k, v]) => `${k}:${v}`).join(";");
    if (enc) sp.set(URL_PARAM, enc);
    else sp.delete(URL_PARAM);
    const q = sp.toString();
    history.replaceState(history.state, "", location.pathname + (q ? `?${q.replace(/%3A/g, ":").replace(/%3B/g, ";")}` : "") + location.hash);
  }
}

/** Set a parameter. Setting it back to its default removes the override. */
export function setOverride(key: string, value: number, defaultValue: number): void {
  const next = { ...store.overrides() };
  if (Math.abs(value - defaultValue) < 1e-9) delete next[key];
  else next[key] = value;
  persist(next);
}

/** Put one parameter back to its default. */
export function clearOverride(key: string): void {
  const next = { ...store.overrides() };
  delete next[key];
  persist(next);
}

/** Put every parameter back. */
export function resetOverrides(): void {
  persist({});
}

/** The parameter an override key names, or null. */
export function paramOf(model: CompiledModel, key: string): { ruleId: string; name: string; param: Param } | null {
  const dot = key.indexOf(".");
  if (dot <= 0) return null;
  const ruleId = key.slice(0, dot), name = key.slice(dot + 1);
  const rule = model.rules.find((r) => r.id === ruleId);
  const param = rule?.params[name];
  return param ? { ruleId, name, param } : null;
}

/** Drop overrides the model does not accept (unknown, fixed, or out of range). */
export function pruneOverrides(model: CompiledModel): string[] {
  const dropped: string[] = [];
  const next: Overrides = {};
  for (const [k, v] of Object.entries(store.overrides())) {
    const p = paramOf(model, k);
    if (!p || !p.param.adjustable || v < p.param.min - 1e-9 || v > p.param.max + 1e-9) dropped.push(k);
    else if (Math.abs(v - p.param.default) > 1e-9) next[k] = v;
  }
  if (dropped.length || Object.keys(next).length !== Object.keys(store.overrides()).length) persist(next);
  return dropped;
}
