/**
 * Seeded randomness. The engine never calls Math.random: every draw is either a mulberry32
 * stream from a seed or a keyed uniform (`uniform(seed, ...keys)`) that depends only on its keys,
 * so draws do not shift when code paths change order.
 */

/** mulberry32: small, fast, good enough for games. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number seed passes through; a string is hashed (FNV-1a) to an unsigned 32-bit seed. */
export function hashSeed(seed: number | string): number {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const s = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A uniform in [0, 1) fixed by the seed and the keys. */
export function uniform(seed: number, ...keys: (string | number)[]): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (const k of keys) {
    const s = String(k);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h ^= 0x2f;
  }
  return mulberry32(h)();
}

/** Fisher-Yates shuffle with a seed; returns a new array. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const r = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
