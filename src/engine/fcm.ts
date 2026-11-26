/**
 * The SoNaRR Fuzzy Cognitive Map, ported from WALES/prototype/fcm.js (modified Kosko update with
 * per-target L1 normalisation and a bias that anchors the SoNaRR baseline). Sparse, pure.
 *
 * Interventions are offsets on the 0 to 1 FCM scale: drivers are exogenous and simply move;
 * a pressure offset clamps that pressure at (its value given the drivers) + offset. FCM iterations
 * are never time: rule R03 moves nature_condition towards the equilibrium a little each term.
 */
import type { FcmGraph } from "../model/schema";
import { uniform } from "./rng";

export interface CompiledFcm {
  ids: string[];
  index: Map<string, number>;
  kinds: string[];
  n: number;
  /** Incoming edges per target: source index, normalised signed weight. */
  incoming: { i: number; w: number; conf: number; sign: number }[][];
  exogenous: boolean[];
  initial: Float64Array;
  bias: Float64Array;
  lambda: number;
  /** Indices of the 11 state nodes and the 3 service nodes. */
  states: number[];
  services: number[];
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (y: number) => {
  const c = Math.min(0.98, Math.max(0.02, y));
  return Math.log(c / (1 - c));
};

export function compileFcm(graph: FcmGraph, lambda = 4): CompiledFcm {
  const ids = graph.nodes.map((n) => n.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const raw: Map<number, { w: number; conf: number; sign: number }>[] = Array.from({ length: n }, () => new Map());
  for (const e of graph.edges) {
    const i = index.get(e.source), j = index.get(e.target);
    if (i === undefined || j === undefined) continue;
    const prev = raw[j]!.get(i);
    const w = (e.sign || 1) * (e.weight || 0);
    raw[j]!.set(i, { w: (prev?.w ?? 0) + w, conf: e.confidence ?? 0.6, sign: e.sign || 1 });
  }
  const incoming = raw.map((m) => {
    let abs = 0;
    for (const v of m.values()) abs += Math.abs(v.w);
    return [...m.entries()].map(([i, v]) => ({ i, w: abs > 0 ? v.w / abs : 0, conf: v.conf, sign: v.sign }));
  });
  const exogenous = incoming.map((l) => l.length === 0);
  const initial = Float64Array.from(graph.nodes.map((nd) => nd.initial ?? 0.5));
  const bias = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    if (exogenous[j]) continue;
    let inflow = 0;
    for (const { i, w } of incoming[j]!) inflow += w * initial[i]!;
    bias[j] = logit(initial[j]!) - lambda * inflow;
  }
  const kinds = graph.nodes.map((nd) => nd.kind);
  return {
    ids,
    index,
    kinds,
    n,
    incoming,
    exogenous,
    initial,
    bias,
    lambda,
    states: kinds.flatMap((k, i) => (k === "state_ecosystem" || k === "state_resource" ? [i] : [])),
    services: kinds.flatMap((k, i) => (k === "service" ? [i] : [])),
  };
}

/** Per-edge additive noise for one uncertainty run: sign * u * (1 - confidence) * 0.06 (as the prototype). */
export function edgeNoise(c: CompiledFcm, seed: number, run: number): Float64Array[] {
  return c.incoming.map((list, j) => Float64Array.from(list.map((e, k) => (run === 0 ? 0 : e.sign * (uniform(seed, "fcm", run, j, k) * 2 - 1) * (1 - e.conf) * 0.06))));
}

function iterate(c: CompiledFcm, start: Float64Array, clamps: Map<number, number>, noise?: Float64Array[]): Float64Array {
  let A = Float64Array.from(start);
  for (const [i, v] of clamps) A[i] = v;
  for (let it = 0; it < 200; it++) {
    const next = new Float64Array(c.n);
    let maxDelta = 0;
    for (let j = 0; j < c.n; j++) {
      const cl = clamps.get(j);
      if (cl !== undefined) {
        next[j] = cl;
        continue;
      }
      if (c.exogenous[j]) {
        next[j] = A[j]!;
        continue;
      }
      let sum = 0;
      const list = c.incoming[j]!;
      const nz = noise?.[j];
      for (let k = 0; k < list.length; k++) sum += (list[k]!.w + (nz ? nz[k]! : 0)) * A[list[k]!.i]!;
      next[j] = sigmoid(c.lambda * sum + c.bias[j]!);
      maxDelta = Math.max(maxDelta, Math.abs(next[j]! - A[j]!));
    }
    A = next;
    if (maxDelta < 1e-6) break;
  }
  return A;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Equilibrium activations for offsets on drivers and pressures (FCM scale), with optional run noise.
 * Driver offsets move exogenous drivers; pressure offsets clamp the pressure at its driven value plus the offset.
 */
export function runFcm(c: CompiledFcm, offsets: Record<string, number>, noise?: Float64Array[]): Float64Array {
  const start = Float64Array.from(c.initial);
  const pressureOffsets = new Map<number, number>();
  for (const [id, v] of Object.entries(offsets)) {
    const i = c.index.get(id);
    if (i === undefined || v === 0) continue;
    if (c.exogenous[i]) start[i] = clamp01(c.initial[i]! + v);
    else pressureOffsets.set(i, v);
  }
  const first = iterate(c, start, new Map(), noise);
  if (pressureOffsets.size === 0) return first;
  const clamps = new Map<number, number>();
  for (const [i, v] of pressureOffsets) clamps.set(i, clamp01(first[i]! + v));
  return iterate(c, first, clamps, noise);
}

/** Mean activation of the 11 ecosystem and resource state nodes (0 to 1). */
export function stateMean(c: CompiledFcm, a: Float64Array): number {
  let s = 0;
  for (const i of c.states) s += a[i]!;
  return s / c.states.length;
}

/** Mean activation of the 3 service nodes (0 to 1). */
export function serviceMean(c: CompiledFcm, a: Float64Array): number {
  let s = 0;
  for (const i of c.services) s += a[i]!;
  return s / c.services.length;
}
