/**
 * Frames: the board at one moment, one per turn, for the time-lapse and then and now. Fairness
 * (section 4.1) is computed from councils by score.ts and never stored as a stock.
 */
import { round4 } from "./ctx";
import { fairnessGap } from "./score";
import type { BoardModel, BoardState, Flow, Frame } from "./types";

/** The board now, as a frame. `turn` is the number of turns played (0 is 2026). */
export function makeFrame(model: BoardModel, state: BoardState, turn: number, flows: Flow[]): Frame {
  return {
    turn,
    year: model.game.first_year + turn * model.game.turn_years,
    councils: Object.fromEntries(Object.entries(state.councils).map(([code, c]) => [code, {
      measures: { ...c.measures }, young: c.young, backing: c.backing, risks: { ...c.risks },
    }])),
    projects: state.projects.map((p) => ({ id: p.id, project: p.project, site: { ...p.site }, level: p.level, status: p.status })) as Frame["projects"],
    linkQuality: { ...state.linkQuality },
    events: state.events.filter((e) => e.turn === turn - 1).map((e) => ({ event: e.event, councils: [...e.councils] })),
    flows: mergeFlows(flows),
    coins: state.coins,
    fairness: round4(Math.max(0, fairnessGap(model, state.councils))),
  };
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
