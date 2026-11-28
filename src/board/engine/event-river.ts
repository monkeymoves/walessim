/**
 * The river of a flood (playtest 10 must-fix 7: "The Taff flooded homes in Rhondda Cynon Taf" and
 * "The Ely burst its banks in Rhondda Cynon Taf" in one ending, for one flood). The river is chosen
 * once, when the event lands (events-land.ts), and kept on its record; `eventRiver` is the one
 * answer every sentence about it reads.
 */
import type { BoardModel, CouncilCode, EventId, EventRecord, LinkDef, Text } from "./types";

/** The river link an event names in a council: the one flowing on to `next`, else any flowing out, else any flowing in. */
export function riverLinkAt(model: BoardModel, council: CouncilCode, next?: CouncilCode): LinkDef | undefined {
  const rivers = model.links.filter((l) => l.kind === "river" && l.name);
  return rivers.find((l) => l.from === council && l.to === next) ?? rivers.find((l) => l.from === council) ?? rivers.find((l) => l.to === council);
}

/** A river flood: an event whose trigger needs a river, or that travels down one (model/board/events.yaml). */
export function isRiverEvent(model: BoardModel, id: EventId): boolean {
  const def = model.events.find((d) => d.id === id);
  return !!def && (def.travels === "downstream" || def.trigger.some((c) => c.kind === "feature" && c.feature === "river"));
}

/**
 * The river a landed event came down: the one on its record. Undefined for an event that is not a
 * river flood. A record saved before rivers were kept falls back to the river of its first two
 * councils, as it was chosen then.
 */
export function eventRiver(model: BoardModel, e: EventRecord): Text | undefined {
  if (!isRiverEvent(model, e.event)) return undefined;
  const link = e.river ? model.links.find((l) => l.id === e.river) : riverLinkAt(model, e.councils[0]!, e.councils[1]);
  return link?.name;
}
