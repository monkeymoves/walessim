/**
 * Voices (game-design 9.1) and the letter from 2050 (9.2): choosing a template and filling it.
 * Templates are written by the content agent in model/voices.yaml and model/letters.yaml.
 * Selection is deterministic for a seed and a term.
 */
import type { CompiledModel, LetterArchetype, LetterSlot, NamedThingKind, RegionId, StrandId, Text, VoiceTemplate } from "../model/schema";
import type { Letter, VoiceLine } from "./api";
import { fill } from "./welsh";
import { uniform } from "./rng";
import type { Ctx } from "./scores";

/** A candidate event for this term's voice, in priority order. */
export interface VoiceEventCandidate {
  event: VoiceTemplate["event"];
  strand?: StrandId;
  direction?: "up" | "down";
  card?: string;
  curveball?: string;
  place?: "rhondda" | "bethesda";
  grade?: VoiceTemplate["grade"];
  region?: VoiceTemplate["region"];
  kept?: boolean;
  response?: VoiceTemplate["response"];
  /** Authority most affected (index), for the town when the template names none. */
  la: number;
}

const matches = (v: VoiceTemplate, e: VoiceEventCandidate) =>
  v.event === e.event &&
  (v.strand === undefined || v.strand === e.strand) &&
  (v.direction === undefined || v.direction === e.direction) &&
  (v.card === undefined || v.card === e.card) &&
  (v.curveball === undefined || v.curveball === e.curveball) &&
  (v.place === undefined || v.place === e.place) &&
  (v.grade === undefined || v.grade === e.grade) &&
  (v.region === undefined || v.region === e.region) &&
  (v.kept === undefined || v.kept === e.kept) &&
  (v.response === undefined || v.response === e.response);

/** Pick the voice for the first candidate with a matching template, avoiding voices already used. */
export function pickVoice(ctx: Ctx, seed: number, term: number, candidates: VoiceEventCandidate[], used: string[]): VoiceLine | null {
  const voices = ctx.model.voices;
  // first pass: fresh voices only, across every candidate event; only then reuse (playtest 1)
  for (const allowUsed of [false, true]) {
    for (const cand of candidates) {
      const pool = voices.filter((v) => matches(v, cand) && (allowUsed || !used.includes(v.id)));
      if (!pool.length) continue;
      const v = pool[Math.floor(uniform(seed, "voice", term, cand.event) * pool.length)]!;
      return fillVoice(ctx, seed, term, v, cand.la);
    }
  }
  return null;
}

/** The authority a town belongs to, by the towns listed in authorities.yaml. */
export function townLa(ctx: Ctx, town: Text): number | null {
  const i = ctx.las.findIndex((a) => a.towns.some((t) => t.en === town.en) || a.name.en === town.en);
  return i >= 0 ? i : null;
}

export function fillVoice(ctx: Ctx, seed: number, term: number, v: VoiceTemplate, la: number): VoiceLine {
  const towns = v.towns?.length ? v.towns : ctx.las[la]!.towns;
  const town = towns[Math.floor(uniform(seed, "town", term, v.id) * towns.length)] ?? ctx.las[la]!.name;
  const laIdx = townLa(ctx, town) ?? la;
  const year = String(ctx.model.game.years[term] ?? ctx.model.game.end_year);
  const who = ctx.model.voice_who.length ? ctx.model.voice_who[Math.floor(uniform(seed, "who", term) * ctx.model.voice_who.length)]! : { en: "", cy: "" };
  const season = ctx.model.voice_seasons.length ? ctx.model.voice_seasons[Math.floor(uniform(seed, "season", term) * ctx.model.voice_seasons.length)]! : { en: "", cy: "" };
  return {
    template: v.id,
    text: fill(v.text, { place: town, year, who, season }),
    la: ctx.las[laIdx]!.code,
    town,
    event: v.event,
  };
}

/** The opening voice that asks for a pledge on a strand, if a template exists. */
export function openingVoice(ctx: Ctx, seed: number, term: number, strand: StrandId, la: number, used: string[] = []): VoiceLine | null {
  return pickVoice(ctx, seed, term, [{ event: "opening", strand, la }], used);
}

// ---------------------------------------------------------------------------
// The letter

export type Level = "low" | "middle" | "high";

export function level(model: CompiledModel, v: number): Level {
  // net strand pips changed since 2026 (balance decision 14)
  const b = model.game.judged_change?.letter_bands ?? { low: -1, high: 1 };
  return v < b.low ? "low" : v >= b.high ? "high" : "middle";
}

/** Archetype from the Lived and Left levels (game-design 9.2), with the uneven hand first. */
export function archetypeOf(lived: Level, left: Level, uneven: boolean): LetterArchetype {
  if (uneven && (lived === "high" || left === "high")) return "uneven";
  if (lived === "high" && left === "low") return "feast";
  if (lived === "low" && left === "high") return "long_winter";
  if (lived === "high" && left === "high") return "gift";
  if (lived === "low" || left === "low") return "hollow";
  // both middle, or one middle and one high
  return "steady";
}

export interface NamedThing {
  kind: NamedThingKind;
  id: string | null;
  year: number | null;
  /** What fills {thing}. */
  thing: Text | null;
}

/** One specific thing the letter names: from an archetype template (`line` absent) or a filled ledger line. */
export interface NamedLine extends NamedThing {
  /** The ledger kind (tip_safe, visit, pledge_kept, card, debt...). */
  ledger: string;
  /** A ready, filled line (engine copy); otherwise the archetype's named template of `kind` is used. */
  line?: Text;
}

/**
 * Write the letter: salutation, lived, left, two named lines (at least two specific things the
 * player did, from the ledger), sign-off. Slots are filled with Welsh mutation (welsh.ts).
 */
export function writeLetter(
  ctx: Ctx,
  seed: number,
  archetype: LetterArchetype,
  named: NamedLine[],
  la: number,
  worstYear: number,
  lostYear: number | null,
): Letter {
  const tpl = ctx.model.letters.find((l) => l.archetype === archetype) ?? ctx.model.letters[0];
  const town = ctx.las[la]!.towns[0] ?? ctx.las[la]!.name;
  const pick = (xs: Text[] | undefined, slot: string): Text => (xs && xs.length ? xs[Math.floor(uniform(seed, "letter", slot) * xs.length)]! : { en: "", cy: "" });
  const fillWith = (t: Text, n?: NamedThing): Text =>
    fill(t, {
      place: town,
      year: n?.year ?? ctx.model.game.end_year,
      thing: n?.thing ?? "",
      worst_year: worstYear,
      lost_year: lostYear ?? "",
    });
  const first = named[0] ?? { kind: "none" as NamedThingKind, id: null, year: null, thing: null, ledger: "none" };
  if (!tpl) {
    return { archetype, title: { en: archetype, cy: archetype }, lines: [], la: ctx.las[la]!.code, town, named: { kind: first.kind, id: first.id, year: first.year }, namedAll: named.map((n) => ({ kind: n.ledger, id: n.id, year: n.year })) };
  }
  const namedLine = (n: NamedLine, k: number): Text => {
    if (n.line) return n.line;
    const list = tpl.named[n.kind]?.length ? tpl.named[n.kind] : tpl.named.none;
    return fillWith(pick(list, `named${k}`), n);
  };
  const lines: Letter["lines"] = [
    { slot: "salutation", text: fillWith(pick(tpl.salutation, "salutation")) },
    { slot: "lived", text: fillWith(pick(tpl.lived, "lived")) },
    { slot: "left", text: fillWith(pick(tpl.left, "left")) },
    ...named.slice(0, 2).map((n, k) => ({ slot: "named" as LetterSlot, text: namedLine(n, k) })),
    ...(named.length ? [] : [{ slot: "named" as LetterSlot, text: fillWith(pick(tpl.named.none, "named0")) }]),
    { slot: "signoff", text: fillWith(pick(tpl.signoff, "signoff")) },
  ];
  return {
    archetype,
    title: tpl.title,
    lines,
    la: ctx.las[la]!.code,
    town,
    named: { kind: first.kind, id: first.id, year: first.year },
    namedAll: named.slice(0, 2).map((n) => ({ kind: n.ledger, id: n.id, year: n.year })),
  };
}

/**
 * The region the uneven-hand letter names (decision 15): one that received no regional card of its
 * own in the whole game, or, when one region took more than two thirds of all regional plays, the
 * least served of the others. Ties go to the more populous region. Null when plays were spread.
 */
export function overlookedRegion(regionalPlays: Record<RegionId, number>, population: Record<RegionId, number>): RegionId | null {
  const ids = Object.keys(regionalPlays) as RegionId[];
  const total = ids.reduce((a, r) => a + regionalPlays[r], 0);
  if (total === 0) return null;
  const leastServed = (pool: RegionId[]) => [...pool].sort((a, b) => regionalPlays[a] - regionalPlays[b] || population[b] - population[a])[0] ?? null;
  const never = ids.filter((r) => regionalPlays[r] === 0);
  if (never.length) return leastServed(never);
  const dominant = ids.find((r) => regionalPlays[r] > (2 / 3) * total);
  return dominant ? leastServed(ids.filter((r) => r !== dominant)) : null;
}
