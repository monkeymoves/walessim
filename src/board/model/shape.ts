/**
 * A very small runtime shape checker for the board model files. A `Shape` walks a parsed value
 * and appends an `Issue` with a path for each mismatch, so one run reports every problem.
 * Objects are closed: an unknown key is an issue, which catches typos in hand-written YAML.
 */

export interface Issue {
  /** Where, e.g. "projects[3].effects[0].measure". */
  path: string;
  message: string;
}

export type Shape = (value: unknown, path: string, out: Issue[]) => void;

const kindOf = (v: unknown): string => (v === null ? "null" : Array.isArray(v) ? "a list" : typeof v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export const str: Shape = (v, path, out) => {
  if (typeof v !== "string" || v.length === 0) out.push({ path, message: `expected text, got ${kindOf(v)}` });
};

export const num: Shape = (v, path, out) => {
  if (typeof v !== "number" || !Number.isFinite(v)) out.push({ path, message: `expected a number, got ${kindOf(v)}` });
};

export const bool: Shape = (v, path, out) => {
  if (typeof v !== "boolean") out.push({ path, message: `expected true or false, got ${kindOf(v)}` });
};

/** A whole number within [min, max]. */
export const int = (min = -Infinity, max = Infinity): Shape => (v, path, out) => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) out.push({ path, message: `expected a whole number from ${min} to ${max}, got ${JSON.stringify(v)}` });
};

/** A number within [min, max]. */
export const range = (min: number, max: number): Shape => (v, path, out) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) out.push({ path, message: `expected a number from ${min} to ${max}, got ${JSON.stringify(v)}` });
};

/** One of the given literal values. */
export const lit = (...values: (string | number | boolean)[]): Shape => (v, path, out) => {
  if (!values.includes(v as never)) out.push({ path, message: `expected one of ${values.join(", ")}, got ${JSON.stringify(v)}` });
};

export const nullable = (s: Shape): Shape => (v, path, out) => {
  if (v !== null) s(v, path, out);
};

export const arr = (item: Shape, opts: { min?: number; max?: number } = {}): Shape => (v, path, out) => {
  if (!Array.isArray(v)) return void out.push({ path, message: `expected a list, got ${kindOf(v)}` });
  if (opts.min !== undefined && v.length < opts.min) out.push({ path, message: `expected at least ${opts.min} items, got ${v.length}` });
  if (opts.max !== undefined && v.length > opts.max) out.push({ path, message: `expected at most ${opts.max} items, got ${v.length}` });
  v.forEach((x, i) => item(x, `${path}[${i}]`, out));
};

export const tuple = (...items: Shape[]): Shape => (v, path, out) => {
  if (!Array.isArray(v) || v.length !== items.length) return void out.push({ path, message: `expected a list of ${items.length}` });
  items.forEach((s, i) => s(v[i], `${path}[${i}]`, out));
};

/** Any object, contents unchecked (data copied whole from v1, checked by v1's own build). */
export const openObj: Shape = (v, path, out) => {
  if (!isObj(v)) out.push({ path, message: `expected an object, got ${kindOf(v)}` });
};

/** A map from any key to values of one shape. */
export const rec = (item: Shape): Shape => (v, path, out) => {
  if (!isObj(v)) return void out.push({ path, message: `expected a map, got ${kindOf(v)}` });
  for (const [k, x] of Object.entries(v)) item(x, `${path}.${k}`, out);
};

/** A closed object: `req` keys must be present, `opt` keys may be, nothing else. */
export const obj = (req: Record<string, Shape>, opt: Record<string, Shape> = {}): Shape => (v, path, out) => {
  if (!isObj(v)) return void out.push({ path, message: `expected an object, got ${kindOf(v)}` });
  for (const [k, s] of Object.entries(req)) {
    if (v[k] === undefined) out.push({ path: `${path}.${k}`, message: "missing" });
    else s(v[k], `${path}.${k}`, out);
  }
  for (const [k, s] of Object.entries(opt)) if (v[k] !== undefined) s(v[k], `${path}.${k}`, out);
  for (const k of Object.keys(v)) if (!(k in req) && !(k in opt)) out.push({ path: `${path}.${k}`, message: "unknown key" });
};

/**
 * A tagged union: `v[tag]` picks the case, each case is [required keys, optional keys], and
 * `common` optional keys are allowed on every case.
 */
export const variant = (tag: string, cases: Record<string, [Record<string, Shape>, Record<string, Shape>?]>, common: Record<string, Shape> = {}): Shape => (v, path, out) => {
  if (!isObj(v)) return void out.push({ path, message: `expected an object, got ${kindOf(v)}` });
  const key = v[tag];
  const c = typeof key === "string" ? cases[key] : undefined;
  if (!c) return void out.push({ path: `${path}.${tag}`, message: `expected one of ${Object.keys(cases).join(", ")}, got ${JSON.stringify(key)}` });
  obj({ ...c[0], [tag]: str }, { ...(c[1] ?? {}), ...common })(v, path, out);
};

/** Passes if any of the shapes passes; otherwise reports the issues of the closest one. */
export const anyOf = (...shapes: Shape[]): Shape => (v, path, out) => {
  let best: Issue[] | null = null;
  for (const s of shapes) {
    const tried: Issue[] = [];
    s(v, path, tried);
    if (tried.length === 0) return;
    if (!best || tried.length < best.length) best = tried;
  }
  out.push(...(best ?? []));
};

/** Run a shape and return the issues. */
export function check(shape: Shape, value: unknown, path = ""): Issue[] {
  const out: Issue[] = [];
  shape(value, path, out);
  return out;
}
