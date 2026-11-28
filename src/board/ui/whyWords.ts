/**
 * What a Why? ends at, in words a player can read (playtest 8, must-fix 14: "project:repairs-team",
 * "ONS ONS", "Various"): the rule's name and sentence, never its id; a link to the page of the
 * board's rule book that holds it; and source dockets whose labels are all different and never
 * the bare word "Various". fixC.test.ts checks every Why? of a real game.
 */
import { hasKey, t } from "./lang";
import type { Source } from "../../model/schema";
import type { BoardModel, BoardState, Text, Why, WhyTarget } from "../engine/api";
import { stepOfYear, stepsOf } from "../engine/api";
import { why } from "./engine";
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
    if (typeof v === "string") return plainNote(v);
    if (v && typeof v === "object" && "en" in v) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "string" ? plainNote(x) : x]));
    return v;
  };
  return { ...s, ...(s.note !== undefined ? { note: clean(s.note) } : {}), ...(s.notes !== undefined ? { notes: clean(s.notes) } : {}) } as Source;
}

/** The data team's marks on a source with no real evidence behind its size yet ("Placeholder strength. to check"). */
const PLACEHOLDER = /\bplaceholder\b/i;
const TO_CHECK = /[.,;]?\s*\bto check\b\.?/i;

/** Is this source's size a rough guess with its evidence still to find? */
export function isRoughSource(model: BoardModel, id: string): boolean {
  const s = model.sources.find((x) => x.id === id) as unknown as { note?: unknown; notes?: unknown } | undefined;
  const n = s?.note ?? s?.notes;
  const text = typeof n === "string" ? n : n && typeof n === "object" ? String((n as Record<string, unknown>)["en"] ?? "") : "";
  return PLACEHOLDER.test(text);
}

/**
 * A source note in words for the player (playtest 10, must-fix 9: "Placeholder strength. to check"
 * broke trust): a placeholder reads as a rough guess with its evidence still to find, and "to
 * check" as evidence still to check. Never the data team's own marks.
 */
export function plainNote(text: string): string {
  if (PLACEHOLDER.test(text)) return t("boardui.source.rough");
  if (TO_CHECK.test(text)) {
    const rest = plainIds(text.replace(TO_CHECK, "").trim());
    return rest ? `${rest}${/[.!?]$/.test(rest) ? "" : "."} ${t("boardui.source.toCheck")}` : t("boardui.source.toCheck");
  }
  return plainIds(text);
}

/** The three spans 16.2.7 offers, as steps: the last year, this term (since the last election), since 2026. */
export function whySpans(model: BoardModel, now: number): { id: "year" | "term" | "all"; from: number }[] {
  const elections = model.game.election_years.map((y) => stepOfYear(model, y)).filter((x) => x <= now);
  return [
    { id: "year", from: Math.max(0, now - stepsOf(model, 1)) },
    { id: "term", from: elections.length ? elections[elections.length - 1]! : 0 },
    { id: "all", from: 0 },
  ];
}

const shows = (d: number): boolean => Math.round(Math.abs(d) * 10) > 0;

/**
 * The reasons Why? shows: those that do not round to 0 at one decimal ("0 points" explains
 * nothing). Reasons too small to show alone that share a rule are summed into one, so five groups
 * each a little less pleased still explain a fall of 0.2 (playtest 10, must-fix 3: Why? was empty
 * on a council at 4.8). Moods summed over the groups name no one group.
 */
export function shownReasons(model: BoardModel, state: BoardState, target: WhyTarget): Why[] {
  const all = why(model, state, target);
  const out = all.filter((r) => shows(r.delta));
  const small = new Map<string, Why[]>();
  for (const r of all) if (!shows(r.delta)) small.set(r.rule, [...(small.get(r.rule) ?? []), r]);
  for (const list of small.values()) {
    const delta = Math.round(list.reduce((a, r) => a + r.delta, 0) * 1e4) / 1e4;
    if (!shows(delta) || list.length < 2) continue;
    const first = [...list].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]!;
    const groups = new Set(list.map((r) => (r.cause.kind === "people" ? r.cause.group : null)));
    const cause = first.cause.kind === "people" && groups.size > 1 ? { kind: "people" as const } : first.cause;
    out.push({ ...first, delta, cause, via: list.every((r) => r.via?.link === first.via?.link) ? first.via : undefined, parts: list.flatMap((r) => r.parts), sources: [...new Set(list.flatMap((r) => r.sources))].sort() });
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/**
 * Where a Why? opens (playtest 10, must-fix 3: six of eight opened Why? on a council that did not
 * back them and read "No change of this size was recorded"). Backing opens on the widest span with
 * a cause, since 2026, which answers "why does this council not back me?" whole. A measure opens on
 * the span asked for, or the narrowest wider one that has a cause shown.
 */
export function openWhy(model: BoardModel, state: BoardState, target: WhyTarget): WhyTarget {
  const now = state.step;
  const spans = whySpans(model, now).map((sp) => ({ ...target, fromStep: sp.from, toStep: now }));
  if (target.measure === "backing") return [...spans].reverse().find((sp) => shownReasons(model, state, sp).length) ?? spans[spans.length - 1]!;
  if (shownReasons(model, state, target).length) return target;
  return spans.find((sp) => sp.fromStep <= target.fromStep && shownReasons(model, state, sp).length) ?? target;
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
