/** Which hand-cut icon stands for a project, from its tags (the first match wins). */
import type { IconName } from "../../ui/parts";
import type { BoardModel } from "../engine/api";

const BY_TAG: [string, IconName][] = [
  ["rail", "railway"], ["bus", "bus"], ["tips", "tip"], ["flood", "river"], ["school", "school"], ["welsh", "language"],
  ["health", "surgery"], ["warmth", "terrace"], ["homes", "house"], ["energy", "wind"], ["college", "book"],
  ["big_employer", "works"], ["jobs", "works"], ["nature", "woodland"],
];

export function iconFor(model: BoardModel, projectId: string): IconName {
  const tags = model.projects.find((p) => p.id === projectId)?.tags ?? [];
  return BY_TAG.find(([tag]) => tags.includes(tag))?.[1] ?? "signal";
}

/** The icon for a branch: its first tier 1 project's icon. */
export function branchIcon(model: BoardModel, branch: string): IconName {
  const first = model.projects.find((p) => p.branch === branch && p.tier === 1);
  return first ? iconFor(model, first.id) : "signal";
}

/** The icon for an event: by its track (weather, economy, prices), or a signal for one the board grew. */
export function eventIcon(model: BoardModel, eventId: string): IconName {
  const track = model.events.find((e) => e.id === eventId)?.track;
  return track === "weather" ? "river" : track === "economy" ? "works" : track === "prices" ? "house" : "signal";
}
