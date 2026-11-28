/**
 * Why?: every change is recorded in the ledger by `ctx.change` (ctx.ts) with its step, council,
 * quantity, size, rule and first cause, and the link it travelled. `why` reads the ledger back,
 * sums the records that share a cause, rule and link over a span of steps, and returns the
 * reasons largest first. A closed year's records are folded (ADR 0007), which changes no sum.
 *
 * A Why? ends at a rule: a rule card id (S1, B2, need:homes:2), or a content page for effects
 * that name no card: `project:<id>`, `pair:<id>`, `law:<id>`, `event:<id>`, `place:<id>`.
 *
 * Sentences are `Say` keys in model/i18n board.json (full keys, `board.<key>`): a reason is
 * `board.why.line_up` or `board.why.line_down`, whose `{cause}` slot is the key
 * `board.cause.<cause kind>` filled from the same slots; a report line is `board.report.up` or
 * `board.report.down`. Slots are listed in `sayVars`.
 */
import { causeKey } from "./held";
import type {
  BoardModel, BoardState, Contribution, CouncilCode, Honesty, NodeId, ReportLine, RuleId, Say, SayVar, SourceId, Text,
  Why, WhyTarget,
} from "./types";
import { MEASURE_IDS } from "./types";

const r2 = (v: number): number => Math.round(v * 100) / 100;

export function nodeName(model: BoardModel, id: NodeId): Text | string {
  return model.councils.find((c) => c.code === id)?.name ?? model.stubs.find((s) => s.id === id)?.name ?? id;
}

/** The plain sentence a rule ends at: its card's note, or the content page's own line. */
export function ruleNote(model: BoardModel, id: RuleId): Text | undefined {
  const card = model.rules.find((r) => r.id === id);
  if (card) return card.note;
  const [kind, ref] = id.split(":");
  if (kind === "project") return model.projects.find((p) => p.id === ref)?.what;
  if (kind === "pair") return model.pairs.find((p) => p.id === ref)?.note;
  if (kind === "law") return model.laws.find((l) => l.id === ref)?.what;
  if (kind === "event") return model.events.find((e) => e.id === ref)?.name;
  if (kind === "place") return model.places.find((p) => p.id === ref)?.prompt;
  return undefined;
}

function sources(model: BoardModel, parts: Contribution[]): SourceId[] {
  const out = new Set<SourceId>();
  for (const c of parts) {
    model.rules.find((r) => r.id === c.rule)?.sources.forEach((s) => out.add(s));
    if (c.via) model.links.find((l) => l.id === c.via!.link)?.sources.forEach((s) => out.add(s));
    if (c.cause.kind === "project") { const p = c.cause.project; model.projects.find((x) => x.id === p)?.sources.forEach((s) => out.add(s)); }
    if (c.cause.kind === "event") { const e = c.cause.event; model.events.find((x) => x.id === e)?.sources.forEach((s) => out.add(s)); }
  }
  return [...out].sort();
}

/** A quantity's player name: the measure's name, or its id for the UI to name. */
function quantityName(model: BoardModel, q: string): Text | string {
  return model.measures.find((m) => m.id === q)?.name ?? q;
}

/**
 * Slots for a Why? sentence: `n` (size, unsigned), `delta` (signed), `quantity` (name), `council`,
 * `year`, `cause` (the key `board.cause.<kind>`), `rule` (rule id) and `note` (the rule's sentence);
 * by cause `project`, `site` and `place` (where it stands), `pair`, `event`, `response`, `law`,
 * `grade` (the key `board.grade.<grade>`), `start`, `group`; by link `link` and `from`.
 */
export function sayVars(model: BoardModel, c: Contribution, delta: number, year: number): Record<string, SayVar> {
  const v: Record<string, SayVar> = {
    n: r2(Math.abs(delta)), delta: r2(delta), quantity: quantityName(model, c.quantity), year,
    council: c.council ? nodeName(model, c.council) : "", cause: `board.cause.${c.cause.kind}`, rule: c.rule,
  };
  const note = ruleNote(model, c.rule);
  if (note) v.note = note;
  const cause = c.cause;
  const siteName = (site: { council?: CouncilCode; link?: string }) =>
    site.council ? nodeName(model, site.council) : model.links.find((l) => l.id === site.link)?.name ?? site.link ?? "";
  if (cause.kind === "project") { v.project = model.projects.find((p) => p.id === cause.project)?.name ?? cause.project; v.site = v.place = siteName(cause.site); }
  if (cause.kind === "pair") { v.pair = model.pairs.find((p) => p.id === cause.pair)?.name ?? cause.pair; v.site = v.place = siteName(cause.site); }
  if (cause.kind === "event" || cause.kind === "response") v.event = model.events.find((e) => e.id === cause.event)?.name ?? cause.event;
  if (cause.kind === "response") v.response = model.events.find((e) => e.id === cause.event)?.responses.find((r) => r.id === cause.response)?.name ?? cause.response;
  if (cause.kind === "law") v.law = model.laws.find((l) => l.id === cause.law)?.name ?? cause.law;
  if (cause.kind === "visit") { v.place = model.places.find((p) => p.id === cause.place)?.name ?? cause.place; v.grade = `board.grade.${cause.grade}`; }
  if (cause.kind === "start") v.start = model.starts.find((s) => s.id === cause.start)?.name ?? cause.start;
  if (cause.kind === "people" && cause.group) v.group = model.groups.find((g) => g.id === cause.group)?.name ?? cause.group;
  if (cause.kind === "election") v.year = cause.year;
  if (c.via) {
    const link = model.links.find((l) => l.id === c.via!.link);
    v.link = link?.name ?? link?.kind ?? c.via.link;
    v.from = nodeName(model, c.via.from);
  }
  return v;
}

export function sayFor(model: BoardModel, c: Contribution, delta: number, year: number): Say {
  return { key: delta >= 0 ? "board.why.line_up" : "board.why.line_down", vars: sayVars(model, c, delta, year) };
}

const groupKey = (c: Contribution, byLink: boolean): string =>
  `${c.council}|${c.quantity}|${causeKey(c.cause)}|${c.rule}${byLink ? `|${c.via?.link ?? ""}|${c.via?.from ?? ""}` : ""}`;

/** One Why? from records that share a council, quantity, cause and rule (and a link, unless they came along several). */
export function whyOf(model: BoardModel, parts: Contribution[]): Why {
  const oneLink = parts.every((c) => c.via?.link === parts[0]!.via?.link && c.via?.from === parts[0]!.via?.from);
  const first: Contribution = oneLink ? parts[0]! : { ...parts[0]!, via: undefined };
  const delta = Math.round(parts.reduce((a, c) => a + c.delta, 0) * 1e4) / 1e4;
  const year = first.year;
  const link = first.via ? model.links.find((l) => l.id === first.via!.link) : undefined;
  const honesty: Honesty = first.quantity === "coins" ? "game_rule" : "game_estimate";
  return {
    council: first.council, quantity: first.quantity, step: first.step, year, delta, cause: first.cause, rule: first.rule,
    ...(first.via && link ? { via: { link: first.via.link, from: first.via.from, kind: link.kind } } : {}),
    say: sayFor(model, first, delta, year), honesty, sources: sources(model, parts), parts,
  };
}

/**
 * Group records into reasons, largest first (ties by key, so the order is stable). `byLink` keeps
 * what came along each link apart; report lines put them together, one line per cause.
 */
export function reasons(model: BoardModel, records: readonly Contribution[], byLink = true): Why[] {
  const groups = new Map<string, Contribution[]>();
  for (const c of records) {
    const k = groupKey(c, byLink);
    const g = groups.get(k);
    if (g) g.push(c);
    else groups.set(k, [c]);
  }
  return [...groups.entries()]
    .map(([k, parts]) => ({ k, w: whyOf(model, parts) }))
    .filter(({ w }) => w.delta !== 0)
    .sort((a, b) => Math.abs(b.w.delta) - Math.abs(a.w.delta) || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
    .map(({ w }) => w);
}

/** Why did this quantity change over this span of steps (in this council, or Wales wide for coins)? */
export function why(model: BoardModel, state: BoardState, target: WhyTarget): Why[] {
  return reasons(model, state.ledger.filter((c) =>
    c.step >= target.fromStep && c.step <= target.toStep && c.quantity === target.measure && (target.council === undefined || c.council === target.council)));
}

const REPORTED = new Set<string>([...MEASURE_IDS, "young_adults"]);

/** The biggest reasons over a span of steps (inclusive) for council measures and young adults: year and term report lines. */
export function reportLines(model: BoardModel, state: BoardState, fromStep: number, toStep: number, max: number): ReportLine[] {
  const records = state.ledger.filter((c) => c.step >= fromStep && c.step <= toStep && c.council !== null && REPORTED.has(c.quantity));
  return reasons(model, records, false).slice(0, max).map((w) => ({
    council: w.council, quantity: w.quantity, delta: w.delta, why: w,
    say: { key: w.delta >= 0 ? "board.report.up" : "board.report.down", vars: { measure: quantityName(model, w.quantity), council: w.say.vars?.council ?? "", n: r2(Math.abs(w.delta)) } },
  }));
}
