// The board's section of the rule book reads public/board-model.json itself. v1 never imports the
// board's code (src/board/boundaries.test.ts), so the few fields the book shows are typed here,
// loosely, and every other field is left alone.
import { createResource, createRoot, createSignal } from "solid-js";
import { hasKey, pick, t } from "../../../i18n";
import type { Text } from "../../../model/schema";

export interface BParam { default: number; min?: number; max?: number; unit?: Text | string; tune?: boolean }
export interface BRule {
  id: string; theme: string; kind: string; name: Text; note: Text;
  params: Record<string, BParam>; lag_years?: number; sources: string[];
  confidence: string; evidence?: string; game_rule?: boolean;
}
export interface BSource { id: string; title: string | Text; publisher?: string; url?: string; licence?: string; year?: string | number; note?: string | Text }
export interface BCond { kind: string; [k: string]: unknown }
export interface BModel {
  meta: { hash: string; generated: string; fixture?: boolean };
  game: {
    region: Text; councils: string[]; first_year: number; end_year: number; years_per_step: number; steps: number;
    election_years: number[]; keystone_last_start_year: number; speeds: { id: string; ms_per_step: number }[];
  };
  sources: BSource[];
  indicators: { id: string; name: Text; unit: Text; year: string; source: string }[];
  measures: { id: string; name: Text; note: Text; indicators: string[] }[];
  councils: { code: string; name: Text }[];
  stubs: { id: string; name: Text }[];
  links: { id: string; kind: string; from: string; to: string; share?: number; honesty?: string; sources: string[]; name?: Text }[];
  rules: BRule[];
  branches: { id: string; name: Text; note: Text; tiers: { tier: number; opens: BCond[]; rule?: string }[] }[];
  projects: { id: string; branch: string; tier: number; keystone: boolean; cost: number; build_years: number; name: Text; what: Text; quick?: boolean; legacy_of?: string }[];
  events: { id: string; name: Text; origin: string; good: boolean; severity: number; trigger: BCond[]; track?: string; sources: string[] }[];
  endings: { id: string; name: Text; summary: Text; priority: number; when: BCond[] }[];
  chapters?: { id: string; name: Text; line: Text; priority: number; when: BCond[] }[];
}

const base = (): string => (import.meta.env?.BASE_URL ?? "/");

/** The board model, fetched once when the board section is first opened. */
const store = createRoot(() => {
  const [started, setStarted] = createSignal(false);
  const [model] = createResource<BModel, boolean>(started, async () => {
    const r = await fetch(base() + "board-model.json");
    if (!r.ok) throw new Error(`board-model.json ${r.status}`);
    return (await r.json()) as BModel;
  });
  return { model, start: () => { if (!started()) setStarted(true); } };
});

export function boardModel(): BModel | undefined {
  store.start();
  return store.model();
}
export const boardModelError = (): unknown => store.model.error;

/** A name for any id the board uses: council, stub, measure, project, event, branch, indicator. */
export function nameOf(m: BModel, id: string): string {
  const found = m.councils.find((c) => c.code === id) ?? m.stubs.find((s) => s.id === id) ?? m.measures.find((x) => x.id === id)
    ?? m.projects.find((p) => p.id === id) ?? m.events.find((e) => e.id === id) ?? m.branches.find((b) => b.id === id)
    ?? m.indicators.find((i) => i.id === id) ?? m.endings.find((e) => e.id === id);
  return found ? pick(found.name) : id;
}

const word = (prefix: string, id: string): string => (hasKey(`boardend.book.${prefix}.${id}`) ? t(`boardend.book.${prefix}.${id}`) : id.replace(/_/g, " "));

/** A value in a condition: a number, a named id, or a plain word the book knows (below, anywhere). */
function valueWords(m: BModel, v: unknown): string {
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return word("value", String(v));
  if (typeof v === "string") { const n = nameOf(m, v); return n !== v ? n : word("value", v); }
  if (Array.isArray(v)) return v.map((x) => valueWords(m, x)).join(", ");
  return JSON.stringify(v);
}

/** A condition in words: what it tests, then each of its values with its plain label. */
export function describe(m: BModel, c: BCond): string {
  const parts = Object.entries(c).filter(([k]) => k !== "kind").map(([k, v]) => `${word("field", k)} ${valueWords(m, v)}`.trim());
  return t("boardend.book.cond.line", { kind: word("cond", c.kind), all: parts.join(", ") });
}

/** Rules grouped by theme, game rules marked, in id order. */
export function rulesByTheme(m: BModel): { theme: string; rules: BRule[] }[] {
  const themes = [...new Set(m.rules.map((r) => r.theme))];
  return themes.map((theme) => ({ theme, rules: m.rules.filter((r) => r.theme === theme).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })) }));
}

export const sourceTitle = (s: BSource | undefined, id: string): string => (s ? pick(s.title) : id);

/** The page address of a board rule (rule ids may hold colons). */
export const ruleHref = (id: string): string => `#/llyfr/bwrdd/${encodeURIComponent(id)}`;
