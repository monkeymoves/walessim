// Figures for the atlas: each indicator is formatted by its `format` in indicators.yaml with
// sensible rounding (no false precision). Pure functions, tested in format.test.ts.

export type Format = "integer" | "percent" | "gbp" | "ratio" | "years" | "decimal1" | "decimal2";

const group = (v: number, dp = 0) =>
  new Intl.NumberFormat("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(v);

/** Round to three significant figures (for large counts and money). */
export function sig3(v: number): number {
  if (v === 0) return 0;
  const mag = Math.floor(Math.log10(Math.abs(v)));
  const step = Math.pow(10, mag - 2);
  return Math.round(v / step) * step;
}

export interface FormatOptions {
  /** Show a + on positive values (changes over time). */
  signed?: boolean;
}

/** A value as it appears in a panel or table cell. Missing values return null. */
export function formatValue(v: number | null | undefined, format: string | undefined, opts: FormatOptions = {}): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  const sign = opts.signed && v > 0 ? "+" : v < 0 ? "-" : "";
  const a = Math.abs(v);
  let body: string;
  switch (format as Format) {
    case "integer":
      body = a >= 10000 ? group(sig3(a)) : group(Math.round(a));
      break;
    case "percent":
      body = `${group(a, a >= 100 ? 0 : 1)}%`;
      break;
    case "gbp":
      body = `£${a >= 1000 ? group(sig3(a)) : group(Math.round(a))}`;
      break;
    case "ratio":
    case "years":
    case "decimal1":
      body = group(a, 1);
      break;
    case "decimal2":
      body = group(a, 2);
      break;
    default:
      body = a >= 100 ? group(Math.round(a)) : group(a, 1);
  }
  return sign + body;
}

/** Shorter form for scatter axis ticks. */
export function formatTick(v: number, format: string | undefined): string {
  if (format === "gbp") return `£${v >= 1000 ? `${group(v / 1000, v >= 10000 ? 0 : 1)}k` : group(Math.round(v))}`;
  if (format === "integer" && Math.abs(v) >= 1000) return `${group(v / 1000, Math.abs(v) >= 10000 ? 0 : 1)}k`;
  if (format === "percent") return `${group(v, Math.abs(v) >= 10 ? 0 : 1)}%`;
  if (format === "decimal2") return group(v, 2);
  return group(v, Math.abs(v) >= 10 ? 0 : 1);
}

/**
 * Rank of `code` among the given values, 1 = highest. Ties share the best rank.
 * Returns null when the value is missing.
 */
export function rankOf(values: Record<string, number>, code: string, codes: string[]): number | null {
  const v = values[code];
  if (v == null || !Number.isFinite(v)) return null;
  let above = 0;
  for (const c of codes) {
    const w = values[c];
    if (w != null && Number.isFinite(w) && w > v) above++;
  }
  return above + 1;
}

/** Evenly spaced "nice" ticks across a domain. */
export function niceTicks(lo: number, hi: number, n = 5): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let x = Math.ceil(lo / step) * step; x <= hi + 1e-9; x += step) out.push(Math.round(x / step) * step);
  return out;
}
