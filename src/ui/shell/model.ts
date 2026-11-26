// The loaded model and national geography, shared by every screen (and by UI lead B's game).
// Loaded once by the shell; read with model() and geo(), which are null until ready.
import { createRoot, createSignal } from "solid-js";
import { loadModel } from "../../model/load";
import type { CompiledModel, Source } from "../../model/schema";
import { decodeGeo, type WalesGeo } from "../../map";

type Status = "loading" | "ready" | "error";

const store = createRoot(() => {
  const [model, setModel] = createSignal<CompiledModel | null>(null);
  const [geo, setGeo] = createSignal<WalesGeo | null>(null);
  const [status, setStatus] = createSignal<Status>("loading");
  const [error, setError] = createSignal<string | null>(null);
  return { model, setModel, geo, setGeo, status, setStatus, error, setError };
});

export const model = store.model;
export const geo = store.geo;
export const modelStatus = store.status;
export const modelError = store.error;

const base = (): string => (import.meta.env?.BASE_URL ?? "/");

let started: Promise<void> | null = null;

/** Start loading the model and the map geography (idempotent). */
export function startLoading(): Promise<void> {
  if (started) return started;
  started = (async () => {
    try {
      const [m, rawGeo, rail] = await Promise.all([
        loadModel(),
        fetch(base() + "data/wales-geo.json").then((r) => {
          if (!r.ok) throw new Error(`wales-geo.json ${r.status}`);
          return r.json();
        }),
        fetch(base() + "data/wales-rail.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      store.setGeo(decodeGeo(rawGeo, rail));
      store.setModel(m);
      store.setStatus("ready");
    } catch (e) {
      console.error(e);
      store.setError(e instanceof Error ? e.message : String(e));
      store.setStatus("error");
    }
  })();
  return started;
}

/** A source card by id, or null. */
export function sourceById(id: string | null | undefined): Source | null {
  const m = model();
  if (!m || !id) return null;
  return m.sources.find((s) => s.id === id) ?? null;
}
