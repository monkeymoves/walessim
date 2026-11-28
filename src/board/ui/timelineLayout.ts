/**
 * The time line laid out (docs/design/v2-board.md 16.2.6): every piece with its place along the
 * strip as a share of the game (0 is May 2026, 1 is May 2050) and, for builds, its lane. Pure, so
 * the board and the end screen (package 12) draw the same strip, and so it is tested.
 *
 * Order is time order, past to future, because the strip is one ordered list for the keyboard
 * and for screen readers.
 */
import type {
  BoardModel, BoardState, ChapterRecord, CouncilCode, ElectionResult, EventId, Moment, ProjectId, Say, Site, TimelineMark, TimelineView,
} from "../engine/api";
import { stepOfYear } from "../engine/api";

export const MAX_BARS = 9;
export const LANES = 3;
/** The share of the strip a short label takes (a council name or "Promise"): later labels that would overlap it are left off. */
export const LABEL_SHARE = 0.075;

export type TimelineItem =
  | { kind: "term"; key: string; from: number; to: number; record: ChapterRecord; result: ElectionResult | null }
  | { kind: "election"; key: string; at: number; step: number; year: number; result: ElectionResult; held: boolean }
  | { kind: "event"; key: string; at: number; step: number; event: EventId; council: CouncilCode | null }
  | { kind: "moment"; key: string; at: number; step: number; moment: Moment }
  | { kind: "build"; key: string; from: number; to: number; done: number; lane: number; id: string; project: ProjectId; site: Site; keystone: boolean; readyStep: number }
  | { kind: "more"; key: string; at: number; count: number }
  | { kind: "warning"; key: string; from: number; to: number; fromStep: number; toStep: number; event: EventId; councils: CouncilCode[]; good: boolean; say: Say; labelled: boolean }
  | { kind: "mark"; key: string; at: number; step: number; mark: "promise" | "deal" | "keystone_last_start" | "care_bill" | "end"; council?: CouncilCode; say?: Say; labelled: boolean };

/** Where an item starts along the strip. */
export const startOf = (i: TimelineItem): number => ("from" in i ? i.from : i.at);

/** Moments the strip draws from the state itself (elections and events), so they are not shown twice. */
const FROM_STATE = new Set(["election", "event"]);

/** Greedy lanes for builds: each goes in the first lane free at its start. Returns -1 when none is. */
function lane(ends: number[], from: number): number {
  for (let i = 0; i < ends.length; i++) if (ends[i]! <= from) return i;
  return -1;
}

export function layoutTimeline(model: BoardModel, state: BoardState, view: TimelineView, at: number = view.step): TimelineItem[] {
  const steps = model.game.steps;
  const f = (step: number) => Math.max(0, Math.min(1, step / steps));
  const out: TimelineItem[] = [];

  // the past: a band for each named term, and pips for what happened
  for (const rec of view.chapters) {
    const result = state.election.records.find((r) => r.year === rec.toYear)?.result ?? null;
    out.push({ kind: "term", key: `term:${rec.term}`, from: f(stepOfYear(model, rec.fromYear)), to: f(stepOfYear(model, rec.toYear)), record: rec, result });
  }
  for (const r of state.election.records) out.push({ kind: "election", key: `el:${r.year}`, at: f(r.step), step: r.step, year: r.year, result: r.result, held: true });
  for (const e of state.events) out.push({ kind: "event", key: `ev:${e.event}@${e.step}`, at: f(e.step), step: e.step, event: e.event, council: e.councils[0] ?? null });
  view.moments.forEach((m, i) => {
    if (!FROM_STATE.has(m.kind)) out.push({ kind: "moment", key: `mo:${i}`, at: f(m.step), step: m.step, moment: m });
  });

  // under way: three lanes, keystones as they come, folded past nine
  const bars = [...view.underWay].sort((a, b) => a.readyStep - b.readyStep || a.startedStep - b.startedStep);
  const ends = Array.from({ length: LANES }, () => -1);
  let shown = 0;
  for (const b of bars) {
    const from = f(b.startedStep), to = f(b.readyStep + 1);
    const l = shown < MAX_BARS ? lane(ends, from) : -1;
    if (l < 0) continue;
    ends[l] = to;
    shown++;
    const span = Math.max(1, b.readyStep + 1 - b.startedStep);
    out.push({
      kind: "build", key: `b:${b.id}`, from, to, done: Math.max(0, Math.min(1, (at - b.startedStep) / span)), lane: l,
      id: b.id, project: b.project, site: b.site, keystone: b.keystone, readyStep: b.readyStep,
    });
  }
  if (bars.length > shown) out.push({ kind: "more", key: "more", at: f(at), count: bars.length - shown });

  // ahead
  for (const m of view.ahead) out.push(aheadItem(m, f));

  const sorted = out.sort((a, b) => startOf(a) - startOf(b) || rank(a) - rank(b));
  // warnings and marks share one row: a short label is shown only where it does not run into the one before
  let free = -1;
  for (const i of sorted) {
    if (i.kind !== "warning" && i.kind !== "mark") continue;
    const start = startOf(i);
    i.labelled = start >= free;
    if (i.labelled) free = start + LABEL_SHARE;
  }
  return sorted;
}

function aheadItem(m: TimelineMark, f: (s: number) => number): TimelineItem {
  if (m.kind === "election") return { kind: "election", key: `el:${m.year}`, at: f(m.step), step: m.step, year: m.year, result: m.projected, held: false };
  if (m.kind === "warning") return { kind: "warning", key: `w:${m.event}@${m.fromStep}`, from: f(m.fromStep), to: f(m.toStep + 1), fromStep: m.fromStep, toStep: m.toStep, event: m.event, councils: m.councils, good: m.good, say: m.say, labelled: true };
  return { kind: "mark", key: `m:${m.kind}@${m.step}`, at: f(m.step), step: m.step, mark: m.kind, ...(m.council ? { council: m.council } : {}), ...(m.say ? { say: m.say } : {}), labelled: true };
}

/** Bands before what falls inside them; then pips, builds and marks. */
const RANK: Record<TimelineItem["kind"], number> = { term: 0, election: 1, event: 2, moment: 3, warning: 4, build: 5, more: 6, mark: 7 };
const rank = (i: TimelineItem): number => RANK[i.kind];
