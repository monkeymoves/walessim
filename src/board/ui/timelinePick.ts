/**
 * What clicking (or Enter on) a piece of the board's time line does (16.2.6): a term opens its
 * term report, a pip its council and its Why?, a bar its council, a warning its council and the
 * projects that would cut it, an election ahead colours the map by who backs you.
 */
import type { BoardModel, BoardState, CouncilCode, MeasureId } from "../engine/api";
import { MEASURE_IDS, stepsOf } from "../engine/api";
import { why } from "./engine";
import type { Game } from "./game";
import type { TimelineItem } from "./timelineLayout";

/** The measure an event moved most in a council over the year after it landed, by its Why? records. */
export function measureMovedBy(model: BoardModel, state: BoardState, council: CouncilCode, event: string, step: number): MeasureId {
  let best: MeasureId = MEASURE_IDS[0]!, size = -1;
  for (const m of MEASURE_IDS) {
    const reasons = why(model, state, { council, measure: m, fromStep: step, toStep: Math.min(state.step, step + stepsOf(model, 1)) });
    const d = reasons.filter((w) => (w.cause.kind === "event" || w.cause.kind === "response") && w.cause.event === event).reduce((a, w) => a + Math.abs(w.delta), 0);
    if (d > size) { size = d; best = m; }
  }
  return best;
}

const termOfYear = (model: BoardModel, year: number): number => model.game.election_years.indexOf(year) + 1;

export function pickTimeline(game: Game, item: TimelineItem): void {
  const model = game.model;
  const s = game.state();
  if (!s) return;
  game.closeAll();
  switch (item.kind) {
    case "term": game.setTermOpen(item.record.term); break;
    case "election":
      if (item.held) game.setTermOpen(termOfYear(model, item.year));
      else { game.setSelected(null); game.setColourBy("backing"); }
      break;
    case "event":
      if (item.council) {
        game.setSelected(item.council);
        game.setWhyAt({ council: item.council, measure: measureMovedBy(model, s, item.council, item.event, item.step), fromStep: item.step, toStep: Math.min(s.step, item.step + stepsOf(model, 1)) });
      }
      break;
    case "moment": if (item.moment.council) game.setSelected(item.moment.council); break;
    case "build": game.setSelected(item.site.council ?? model.links.find((l) => l.id === item.site.link)?.from ?? null); break;
    case "more": game.setSelected(null); break;
    case "warning": game.setSelected(item.councils[0] ?? null); game.setWarning(item.event); break;
    case "mark": if (item.council) game.setSelected(item.council); break;
  }
}
