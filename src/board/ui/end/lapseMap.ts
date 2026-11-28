/**
 * What the paper map draws for one yearly frame of the time-lapse: projects as marks, links at
 * the quality they had that year (with a bead where something really travelled), and the events
 * that landed that year. Pure functions of the model and the frame.
 */
import type { Marker, Stitch } from "../../../map";
import type { MapLink } from "../../../map/PaperMap";
import type { BoardModel, Frame, LinkDef } from "../../engine/api";

/** Line weight 1 to 3: rail quality that year, a commuting share step, or 2 for a river. */
function weightOf(l: LinkDef, quality?: number): number {
  if (l.kind === "rail") return quality ?? l.quality ?? 1;
  if (l.kind === "river") return 2;
  if (l.share !== undefined) return l.share >= 0.15 ? 3 : l.share >= 0.07 ? 2 : 1;
  return l.strength ?? 1;
}

function endOf(model: BoardModel, node: string): MapLink["from"] | null {
  if (model.game.councils.includes(node)) return { la: node };
  const at = model.stubs.find((s) => s.id === node) ?? model.councils.find((c) => c.code === node);
  return at ? { x: at.centre[0], y: at.centre[1] } : null;
}

/** Projects standing or being built that year. */
export function stitchesOf(model: BoardModel, frame: Frame): Stitch[] {
  const out: Stitch[] = [];
  for (const p of frame.projects) {
    const def = model.projects.find((d) => d.id === p.project);
    const kind: Stitch["kind"] = p.status === "building" ? "generic" : def?.tags.includes("tips") ? "made-safe" : def?.tags.includes("nature") ? "planted" : "built";
    if (p.site.council !== undefined) { out.push({ id: p.id, at: { la: p.site.council }, kind }); continue; }
    const l = model.links.find((x) => x.id === p.site.link);
    const a = model.councils.find((c) => c.code === l?.from), b = model.councils.find((c) => c.code === l?.to);
    if (a && b) out.push({ id: p.id, at: { x: (a.centre[0] + b.centre[0]) / 2, y: (a.centre[1] + b.centre[1]) / 2 }, kind });
  }
  return out;
}

/** Rail and river links that year, plus any link something travelled along, with a bead at `pulse`. */
export function linksOf(model: BoardModel, frame: Frame, pulse: number | null): MapLink[] {
  const moved = new Set(frame.flows.filter((f) => Math.abs(f.amount) > 1e-6).map((f) => f.link));
  const out: MapLink[] = [];
  for (const l of model.links) {
    if (!model.game.councils.includes(l.from) && !model.game.councils.includes(l.to)) continue;
    if (l.kind === "commute" && !moved.has(l.id)) continue;
    const from = endOf(model, l.from), to = endOf(model, l.to);
    if (!from || !to) continue;
    const upgraded = l.kind === "rail" && (frame.linkQuality[l.id] ?? 1) > (l.quality ?? 1);
    out.push({
      id: l.id, from, to, kind: l.kind,
      weight: weightOf(l, frame.linkQuality[l.id]),
      state: upgraded ? "lit" : moved.has(l.id) ? "rest" : "dim",
      pulse: moved.has(l.id) ? pulse : null,
    });
  }
  return out;
}

/** The events that landed that year, as warning circles on their first council. */
export function markersOf(model: BoardModel, frame: Frame): Marker[] {
  return frame.events.flatMap((e, i) => {
    const c = model.councils.find((x) => x.code === e.councils[0]);
    return c ? [{ id: `ev:${frame.year}:${i}:${e.event}`, x: c.centre[0], y: c.centre[1], kind: "warning", size: 1.2 }] : [];
  });
}
