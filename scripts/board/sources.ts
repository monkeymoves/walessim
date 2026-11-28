/**
 * Which sources a board model uses, and the shape they take in board-model.json: only the ids
 * the model refers to, with the fields of `BoardSource`. The date a source was accessed and the
 * address of its download go into `note`, so nothing the honesty test needs is lost.
 */
import type { BoardSource } from "../../src/board/engine/types";

type Raw = Record<string, unknown>;

const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);

/** Every source id named anywhere in a model: `sources: [...]` lists and `source: "..."` fields. */
export function sourceIdsUsed(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((x) => sourceIdsUsed(x, into));
  else if (isObj(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (k === "sources" && Array.isArray(v) && v.every((x) => typeof x === "string")) (v as string[]).forEach((x) => into.add(x));
      else if (k === "source" && typeof v === "string") into.add(v);
      else sourceIdsUsed(v, into);
    }
  }
  return into;
}

/** Project one entry of model/sources.yaml (or sources-extra.yaml) to a `BoardSource`. */
export function toBoardSource(raw: Raw): BoardSource {
  const out: BoardSource = { id: String(raw.id), title: (raw.title as BoardSource["title"]) ?? String(raw.id) };
  const publisher = text(raw.publisher), url = text(raw.url), licence = text(raw.licence);
  if (publisher) out.publisher = publisher;
  if (url) out.url = url;
  if (licence) out.licence = licence;
  if (typeof raw.year === "string" || typeof raw.year === "number") out.year = raw.year;
  const notes = [text(raw.notes) ?? text(raw.note), raw.accessed ? `Accessed ${String(raw.accessed)}.` : undefined].filter(Boolean).join(" ");
  if (notes) out.note = notes;
  return out;
}

/** The sources a model needs, in id order, and the ids that no source file has. */
export function pickSources(ids: Set<string>, all: Raw[]): { sources: BoardSource[]; missing: string[] } {
  const byId = new Map(all.map((s) => [String(s.id), s]));
  const missing = [...ids].filter((id) => !byId.has(id)).sort();
  const sources = [...ids].filter((id) => byId.has(id)).sort().map((id) => toBoardSource(byId.get(id)!));
  return { sources, missing };
}
