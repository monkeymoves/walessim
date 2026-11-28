/**
 * Frames: the board at one moment, one each time a year closes (and May 2026), for moods, "four
 * years ago", Life in your years, the time-lapse and then and now (16.2.7). Fairness (section 4.1)
 * is computed from councils by score.ts and never stored as a stock.
 */
import { round4 } from "./ctx";
import { fairnessGap } from "./score";
import { yearOfStep } from "./time";
import type { BoardModel, BoardState, Flow, Frame } from "./types";

/**
 * The board now, as the frame for `step` (0 is May 2026). Its events and flows are those of the
 * year that closed on arriving at `step`: events since the previous frame, and every ledger record
 * of that year that travelled along a link.
 */
export function makeFrame(model: BoardModel, state: BoardState, step: number): Frame {
  const prev = state.history[state.history.length - 1];
  const from = prev && prev.step < step ? prev.step : step;
  const closed = step > 0 ? yearOfStep(model, step - 1) : null;
  const flows: Flow[] = closed === null ? [] : state.ledger
    .filter((c) => c.year === closed && c.via && c.council)
    .map((c) => ({ link: c.via!.link, from: c.via!.from, to: c.council!, quantity: c.quantity, amount: c.delta, rule: c.rule }));
  return {
    step,
    year: yearOfStep(model, step),
    councils: Object.fromEntries(Object.entries(state.councils).map(([code, c]) => [code, {
      measures: { ...c.measures }, young: c.young, backing: c.backing, risks: { ...c.risks }, momentum: c.momentum,
    }])),
    projects: state.projects.map((p) => ({ id: p.id, project: p.project, site: { ...p.site }, level: p.level, status: p.status })) as Frame["projects"],
    linkQuality: { ...state.linkQuality },
    events: state.events.filter((e) => e.step >= from && e.step < step).map((e) => ({ event: e.event, councils: [...e.councils] })),
    flows: mergeFlows(flows),
    coins: state.coins,
    fairness: round4(Math.max(0, fairnessGap(model, state.councils))),
  };
}

/** The latest yearly frame at or before `year`, or the 2026 frame if the game is younger. */
export function frameAtYear(state: BoardState, year: number): Frame | undefined {
  let found = state.history[0];
  for (const f of state.history) if (f.year <= year) found = f;
  return found;
}

/** One flow per link, direction, quantity and rule, amounts summed, largest first. */
export function mergeFlows(flows: Flow[]): Flow[] {
  const out = new Map<string, Flow>();
  for (const f of flows) {
    const k = `${f.link}|${f.from}|${f.to}|${f.quantity}|${f.rule}`;
    const got = out.get(k);
    if (got) got.amount = round4(got.amount + f.amount);
    else out.set(k, { ...f });
  }
  return [...out.values()].filter((f) => f.amount !== 0).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || (a.link < b.link ? -1 : 1));
}
