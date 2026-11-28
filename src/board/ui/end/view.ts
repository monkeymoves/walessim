/**
 * The end screen's working, as pure functions of the model, the frames and the ending, so it can
 * be tested without a browser (docs/design/v2-board.md sections 8 and 16.5). No player text is
 * written here: words come from model/i18n/{en,cy}/boardend.json or from the model's own Text.
 */
import type { LensSpec } from "../../../map";
import { STRAND_RAMPS } from "../../../ui/atlas/ramps";
import type {
  BoardModel, ChapterRecord, CouncilCode, Ending, Frame, FrameCouncil, MeasureId, Moment, SayVar, Text,
} from "../../engine/api";
import { MEASURE_IDS } from "../../engine/api";
import { fillCy } from "../cymraeg";
import { fillEn } from "../lang";

/** What a small map or the time-lapse is coloured by: one measure, all six together, or young adults. */
export type EndLens = MeasureId | "all" | "young";
export const END_LENSES: readonly EndLens[] = ["all", ...MEASURE_IDS, "young"];

/** Each measure keeps the colour of the v1 goal it grew from, as on the board. */
const MEASURE_RAMP: Record<MeasureId, keyof typeof STRAND_RAMPS> = {
  work: "prosperous", homes: "cohesive", health: "healthier", nature: "resilient", welsh: "culture", climate: "global",
};
/** Peat, the ramp for a quantity with no goal of its own (tokens.css section 8). */
const PEAT = ["#F1EBD8", "#E0CFA3", "#C9A968", "#A67C3C", "#6E4A1E"];

export const meanOf = (c: FrameCouncil): number => MEASURE_IDS.reduce((a, m) => a + c.measures[m], 0) / MEASURE_IDS.length;

/** One council's value in a frame for a lens. */
export function valueOf(c: FrameCouncil | undefined, by: EndLens): number | null {
  if (!c) return null;
  if (by === "all") return meanOf(c);
  if (by === "young") return c.young;
  return c.measures[by];
}

/** Every council in play, its value in a frame. */
export function valuesOf(model: BoardModel, frame: Frame, by: EndLens): Record<CouncilCode, number> {
  const out: Record<CouncilCode, number> = {};
  for (const code of model.game.councils) {
    const v = valueOf(frame.councils[code], by);
    if (v !== null) out[code] = v;
  }
  return out;
}

/** Values eased between two frames, `t` from 0 (a) to 1 (b). */
export function easeValues(model: BoardModel, a: Frame, b: Frame, by: EndLens, t: number): Record<CouncilCode, number> {
  const va = valuesOf(model, a, by), vb = valuesOf(model, b, by);
  const out: Record<CouncilCode, number> = {};
  for (const code of Object.keys(va)) out[code] = va[code]! + ((vb[code] ?? va[code]!) - va[code]!) * t;
  return out;
}

/**
 * The colour scale for a lens, shared by every frame shown together, so a change of colour is a
 * change on the board. Measures keep their 0 to 10 scale; "all" and "young" stretch to the range
 * the game reached, so the small changes of a game can be seen.
 */
export function scaleOf(model: BoardModel, frames: Frame[], by: EndLens): Omit<LensSpec, "values"> {
  if (by !== "all" && by !== "young") return { domain: [0, 10], ramp: "sequential", higherIsBetter: true, stops: [...STRAND_RAMPS[MEASURE_RAMP[by]]] };
  const all = frames.flatMap((f) => Object.values(valuesOf(model, f, by)));
  let lo = Math.min(...all), hi = Math.max(...all);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 0; hi = 10; }
  const pad = Math.max(0.1, (hi - lo) * 0.05);
  return { domain: [lo - pad, hi + pad], ramp: "sequential", higherIsBetter: true, stops: PEAT };
}

/** The frame for a year, or the nearest before it. */
export function frameAt(frames: Frame[], year: number): Frame | undefined {
  let best: Frame | undefined;
  for (const f of frames) if (f.year <= year && (!best || f.year > best.year)) best = f;
  return best ?? frames[0];
}

/** Reduced motion: the board at the end of each term (the six election years and 2050), oldest first. */
export function termStills(model: BoardModel, frames: Frame[]): Frame[] {
  const years = [...model.game.election_years, model.game.end_year];
  const out: Frame[] = [];
  for (const y of years) {
    const f = frames.find((x) => x.year === y);
    if (f && !out.includes(f)) out.push(f);
  }
  return out.slice(-6);
}

/** Councils by how much a lens changed between two frames, largest change first (either way). */
export function changes(model: BoardModel, from: Frame, to: Frame, by: EndLens): { code: CouncilCode; from: number; to: number; delta: number }[] {
  const a = valuesOf(model, from, by), b = valuesOf(model, to, by);
  return model.game.councils
    .filter((c) => a[c] !== undefined && b[c] !== undefined)
    .map((code) => ({ code, from: a[code]!, to: b[code]!, delta: b[code]! - a[code]! }))
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || x.code.localeCompare(y.code));
}

const isText = (v: unknown): v is Text => !!v && typeof v === "object" && "en" in (v as object);

/** A slot value as words in one language: a Text, a number, or a plain string. */
export function slotText(v: SayVar | undefined, lang: "en" | "cy"): string {
  if (v === undefined) return "";
  if (typeof v === "number") return String(v);
  if (isText(v)) return (lang === "cy" ? v.cy : v.en) || v.en;
  return v;
}

/** Fill `{slot}` gaps in a model Text from slot values. Unknown slots are left for the caller to judge. */
export function fillText(text: Text | undefined, slots: Record<string, SayVar>, lang: "en" | "cy"): string {
  if (!text) return "";
  const s = (lang === "cy" ? text.cy : text.en) || text.en;
  if (lang === "cy" && text.cy) {
    // Welsh: each value takes the mutation the word before it asks for ("yng Nghasnewydd", "o'r Barri")
    const vals = Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, slotText(v, lang)]));
    return fillCy(s, vals);
  }
  return fillEn(s, Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, slotText(v, lang)])));
}

/** True when a filled sentence still has an empty slot, so it should not be shown. */
export const hasGap = (s: string): boolean => /\{\w+\}/.test(s);

/**
 * The letters that fit this ending, in the game's own order (the engine's choice first, then the
 * rest in the model's order, as endings.ts `letterChoices` rotates them).
 */
export function letterChoicesOf(model: BoardModel, ending: Ending): string[] {
  const fit = model.letters.filter((l) => l.ending === ending.id && (l.lower === ending.scores.lower || l.lower === "either")).map((l) => l.id);
  const k = fit.indexOf(ending.letter.letter);
  return k < 0 ? fit : [...fit.slice(k), ...fit.slice(0, k)];
}

/** The letter's four parts, filled for one language, or null when the model has no such letter. `id`: another letter that fits. */
export function letterOf(model: BoardModel, ending: Ending, lang: "en" | "cy", id = ending.letter.letter): { salutation: string; body: string; named: string; signoff: string } | null {
  const def = model.letters.find((l) => l.id === id);
  if (!def) return null;
  const slots = ending.letter.slots as Record<string, SayVar>;
  const part = (t: Text) => { const s = fillText(t, slots, lang); return hasGap(s) ? "" : s; };
  return { salutation: part(def.salutation), body: part(def.body), named: part(def.named), signoff: part(def.signoff) };
}

/** A chapter's name and line, filled from its slots, or null when the model has no such chapter. */
export function chapterOf(model: BoardModel, rec: ChapterRecord, lang: "en" | "cy"): { name: string; line: string } | null {
  const def = model.chapters.find((c) => c.id === rec.chapter);
  if (!def) return null;
  const name = fillText(def.name, rec.slots, lang), line = fillText(def.line, rec.slots, lang);
  return { name: hasGap(name) ? "" : name, line: hasGap(line) ? "" : line };
}

/** Every term of the game, named or still to come: six in all, 2026 to 2050. */
export function termsOf(model: BoardModel, chapters: ChapterRecord[]): { term: number; fromYear: number; toYear: number; rec: ChapterRecord | null }[] {
  const edges = [model.game.first_year, ...model.game.election_years, model.game.end_year];
  return edges.slice(0, -1).map((fromYear, i) => ({
    term: i + 1, fromYear, toYear: edges[i + 1]!, rec: chapters.find((c) => c.term === i + 1) ?? null,
  }));
}

/** The turning points in order of time, with the frame index each falls in (the year it closed). */
export function turningFrames(frames: Frame[], points: Moment[]): { moment: Moment; index: number }[] {
  return [...points]
    .sort((a, b) => a.step - b.step)
    .map((moment) => {
      let index = frames.findIndex((f) => f.step > moment.step);
      if (index < 0) index = frames.length - 1;
      return { moment, index };
    });
}

/** Seconds a year lasts in the time-lapse, and how long it holds on a turning point (16.2.7). */
export const LAPSE = { yearMs: 600, holdMs: 1500 } as const;

/** Where the time-lapse is after `ms`: the frame pair, the ease between them, and any hold. */
export function lapseAt(frameCount: number, holds: number[], ms: number): { index: number; t: number; holding: number | null; done: boolean } {
  let left = Math.max(0, ms);
  const held = new Set(holds);
  for (let i = 0; i < frameCount; i++) {
    if (held.has(i)) {
      if (left < LAPSE.holdMs) return { index: i, t: 0, holding: i, done: false };
      left -= LAPSE.holdMs;
    }
    if (i === frameCount - 1) break;
    if (left < LAPSE.yearMs) return { index: i, t: left / LAPSE.yearMs, holding: null, done: false };
    left -= LAPSE.yearMs;
  }
  return { index: Math.max(0, frameCount - 1), t: 0, holding: null, done: true };
}

/** The time-lapse's length in ms. */
export const lapseLength = (frameCount: number, holds: number[]): number =>
  Math.max(0, frameCount - 1) * LAPSE.yearMs + new Set(holds).size * LAPSE.holdMs;

/** The ms at which the time-lapse reaches a frame (after any hold before it). */
export function lapseMsOf(index: number, holds: number[]): number {
  const before = new Set(holds.filter((h) => h < index)).size;
  return index * LAPSE.yearMs + before * LAPSE.holdMs;
}

/** The plain band key for a result band (boardend.band.*). */
export const bandKey = (band: Ending["scores"]["band"]): string => `boardend.band.${band}`;

/** Projects standing in a frame, for drawing on a small map. */
export const standing = (frame: Frame): Frame["projects"] => frame.projects.filter((p) => p.status !== "building");
