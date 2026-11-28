/**
 * What a Why? ends at, in words a player can read (playtest 8, must-fix 14: "project:repairs-team",
 * "ONS ONS", "Various"): the rule's name and sentence, never its id; a link to the page of the
 * board's rule book that holds it; and source dockets whose labels are all different and never
 * the bare word "Various". fixC.test.ts checks every Why? of a real game.
 */
import { hasKey, t } from "./lang";
import type { Source } from "../../model/schema";
import type { BoardModel, Text } from "../engine/api";
import { tx } from "./words";

export interface RuleLabel { name: string; note: string }

/** A rule card, or the content page a project, pair, law, event or place effect ends at. */
export function ruleLabel(model: BoardModel, id: string): RuleLabel {
  const card = model.rules.find((r) => r.id === id);
  if (card) return { name: tx(card.name), note: tx(card.note) };
  const [kind, ref] = id.split(":") as [string, string | undefined];
  const named = (name: Text | undefined, note: Text | undefined, head: string): RuleLabel =>
    ({ name: t(`boardui.why.ruleOf.${head}`, { name: tx(name ?? "") }), note: tx(note ?? "") });
  if (kind === "project") { const p = model.projects.find((x) => x.id === ref); return named(p?.name, p?.what, "project"); }
  if (kind === "pair") { const p = model.pairs.find((x) => x.id === ref); return named(p?.name, p?.note, "pair"); }
  if (kind === "law") { const l = model.laws.find((x) => x.id === ref); return named(l?.name, l?.what, "law"); }
  if (kind === "event") { const e = model.events.find((x) => x.id === ref); return named(e?.name, e?.landed, "event"); }
  if (kind === "place") { const p = model.places.find((x) => x.id === ref); return named(p?.name, p?.prompt, "place"); }
  return { name: t("boardui.why.ruleOf.other"), note: "" };
}

/**
 * The rule book page for a Why?: the card's own page, or the board's list that holds that content,
 * with the item's id after it ("#/llyfr/bwrdd/projects/back-local-firms") so the book can open at
 * it (playtest 9, must-fix 12: the link opened the top of the projects page).
 */
export function ruleHref(model: BoardModel, id: string): string {
  if (model.rules.some((r) => r.id === id)) return `#/llyfr/bwrdd/${encodeURIComponent(id)}`;
  const [kind, ref] = id.split(":") as [string, string | undefined];
  const at = (page: string, item?: string) => `#/llyfr/bwrdd/${page}${item ? `/${encodeURIComponent(item)}` : ""}`;
  if (kind === "project") return at("projects", ref);
  if (kind === "pair") return at("projects", model.pairs.find((x) => x.id === ref)?.project);
  if (kind === "event") return at("events", ref);
  return "#/llyfr/bwrdd";
}

/** A data id written into a source's notes ("low_pay_hourly"), as the measure's plain name. */
const ID_IN_TEXT = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
export function plainIds(text: string): string {
  return text.replace(ID_IN_TEXT, (id) => {
    for (const k of [`facts.measure.${id}`, `atlas.short.${id}`]) if (hasKey(k)) return t(k);
    return id.replace(/_/g, " ");
  });
}

/**
 * A source as the board shows it: its notes with no raw data ids (playtest 9, must-fix 12:
 * "low_pay_hourly is the 20th percentile" in a source card). The notes are shared with the atlas
 * and written for the data team; the board says them in words.
 */
export function boardSource(model: BoardModel, id: string): Source | null {
  const s = model.sources.find((x) => x.id === id) as unknown as (Source & { note?: unknown; notes?: unknown }) | undefined;
  if (!s) return null;
  const clean = (v: unknown): unknown => {
    if (typeof v === "string") return plainIds(v);
    if (v && typeof v === "object" && "en" in v) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "string" ? plainIds(x) : x]));
    return v;
  };
  return { ...s, ...(s.note !== undefined ? { note: clean(s.note) } : {}), ...(s.notes !== undefined ? { notes: clean(s.notes) } : {}) } as Source;
}

const titleOf = (s: Source): string => (typeof s.title === "string" ? s.title : tx(s.title as unknown as Text));

/** The opening words of a source's title: its first clause, at most seven words. */
const shortTitle = (s: Source): string => titleOf(s).split(/[(:,]/)[0]!.trim().split(/\s+/).slice(0, 7).join(" ");

/**
 * Docket labels for a list of sources: the publisher's short name ("ONS", from `short`, the
 * dockets' own sourceShort), or, when that is
 * "Various" or another docket in the list has the same label, the source's own title.
 */
export function sourceLabels(sources: (Source | null)[], short: (s: Source) => string): string[] {
  const first = sources.map((s) => (s ? short(s) : ""));
  const count = (l: string) => first.filter((x) => x === l).length;
  const labels = sources.map((s, i) => (s && (/^various\b/i.test(first[i]!) || count(first[i]!) > 1) ? shortTitle(s) : first[i]!));
  // two sources that share a title too: number them, so no two dockets read the same
  const seen = new Map<string, number>();
  return labels.map((l) => {
    const n = (seen.get(l) ?? 0) + 1;
    seen.set(l, n);
    return n > 1 ? `${l} (${n})` : l;
  });
}
