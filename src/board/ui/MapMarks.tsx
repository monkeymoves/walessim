/**
 * Marks drawn over the paper map (16.2.3 and 16.3.3), so the map carries the story: one ring for
 * each site with builds under way, filling a quarter turn for each quarter of the soonest build, a
 * count when there are more, and the season it opens beside it; an up or down mark on a council
 * on the rise or slipping; what finished or landed in the step that has just run; and the year's
 * biggest changes (the ticker's year lines) on the councils they happened in, for a year.
 * Positions come from the map's own projection and follow it when it zooms or resizes; the words
 * are laid out so none print over another (markLayout.ts). Marks change only when a step runs.
 */
import { createMemo, For, Show, type Accessor, type JSX } from "solid-js";
import { t } from "./lang";
import type { PaperMap } from "../../map";
import type { BoardModel, CouncilCode, ProjectState, Site } from "../engine/api";
import { stepsOf } from "../engine/api";
import { useGame } from "./game";
import { groupBy, layoutSlips, type Slip } from "./markLayout";
import { councilName, measureName, projectName, signed, tx, whenWords } from "./words";

const RING_R = 9;

/** Host pixels of a site: a council's label point, or the middle of its rail link. */
function siteAt(model: BoardModel, map: PaperMap, site: Site): [number, number] | null {
  if (site.council !== undefined) return map.anchorOf(site.council);
  const l = model.links.find((x) => x.id === site.link);
  const a = model.councils.find((c) => c.code === l?.from), b = model.councils.find((c) => c.code === l?.to);
  if (!a || !b) return null;
  return map.project((a.centre[0] + b.centre[0]) / 2, (a.centre[1] + b.centre[1]) / 2);
}

/** A ring's filled arc, from twelve o'clock, as an SVG path. */
function arc(r: number, share: number): string {
  if (share >= 0.999) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}`;
  const a = share * 2 * Math.PI;
  const x = r * Math.sin(a), y = -r * Math.cos(a);
  return `M0 ${-r}A${r} ${r} 0 ${share > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

interface Ring { id: string; x: number; y: number; share: number; keystone: boolean; count: number; label: string; title: string }
type SlipKind = "ring" | "news" | "event" | "up" | "down";

export function MapMarks(props: { map: Accessor<PaperMap | null>; view: Accessor<number>; moving?: Accessor<boolean> }): JSX.Element {
  const game = useGame();
  const model = game.model;

  /** One ring per site: the soonest build there leads, the rest are counted. */
  const rings = createMemo<Ring[]>(() => {
    props.view();
    const m = props.map(), s = game.state();
    if (!m || !s) return [];
    const building = s.projects.filter((p) => p.status === "building").sort((a, b) => a.readyStep - b.readyStep);
    return groupBy(building, (p: ProjectState) => p.site.council ?? p.site.link ?? "").flatMap((group) => {
      const p = group[0]!;
      const at = siteAt(model, m, p.site);
      if (!at) return [];
      const span = Math.max(1, p.readyStep + 1 - p.startedStep);
      // whole quarters: the ring moves a quarter turn for each quarter of the build
      const share = Math.max(0, Math.floor(((s.step - p.startedStep) / span) * 4) / 4);
      const keystone = group.some((x) => !!model.projects.find((d) => d.id === x.project)?.keystone);
      const title = group.map((x) => t("boardui.map.ring", { name: projectName(model, x.project), when: whenWords(model, x.readyStep + 1) })).join(". ");
      return [{ id: p.id, x: at[0], y: at[1] + 22, share, keystone, count: group.length, label: whenWords(model, p.readyStep + 1, true), title }];
    });
  });

  const tips = createMemo(() => {
    props.view();
    const m = props.map(), s = game.state();
    if (!m || !s) return [];
    return model.game.councils.flatMap((code) => {
      const mo = s.councils[code]?.momentum;
      const at = m.anchorOf(code);
      return mo && mo !== "steady" && at ? [{ code, mo, x: at[0], y: at[1] - 20 }] : [];
    });
  });

  /**
   * The words on the map: what finished and landed in the step that has just run, the year's
   * biggest changes on the councils they happened in (the same lines as the ticker), and each
   * ring's season. Laid out so that none overlap.
   */
  const slips = createMemo(() => {
    props.view();
    const m = props.map(), s = game.state();
    if (!m || !s) return [];
    const out: (Slip & { kind: SlipKind })[] = [];
    const r = game.clock.last();
    if (r && r.step === s.step - 1) {
      for (const id of r.finished) {
        const p = s.projects.find((x) => x.id === id);
        const at = p ? siteAt(model, m, p.site) : null;
        if (p && at) out.push({ key: `f${id}`, x: at[0], y: at[1] - 46, centre: true, up: true, rank: 1, kind: "news", text: t("boardui.map.finished", { project: projectName(model, p.project) }) });
      }
      for (const e of r.events) {
        const code: CouncilCode | undefined = e.councils[0];
        const at = code ? m.anchorOf(code) : null;
        if (at) out.push({ key: `e${e.event}`, x: at[0], y: at[1] - 46, centre: true, up: true, rank: 0, kind: "event", text: tx(model.events.find((x) => x.id === e.event)?.name) });
      }
    }
    const year = stepsOf(model, 1);
    const lines = game.clock.ticker().filter((l) => l.kind === "year" && l.step > s.step - 1 - year);
    const latest = lines.length ? Math.max(...lines.map((l) => l.step)) : -1;
    for (const l of lines) {
      if (l.kind !== "year" || l.step !== latest || !l.line.council) continue;
      const at = m.anchorOf(l.line.council);
      if (at) out.push({ key: `y${l.id}`, x: at[0], y: at[1] - 46, centre: true, up: true, rank: 0, kind: l.line.delta >= 0 ? "up" : "down", text: `${measureName(model, l.line.quantity)} ${signed(l.line.delta)}` });
    }
    for (const g of rings()) out.push({ key: `r${g.id}`, x: g.x + (g.keystone ? 15 : 12), y: g.y - 8, rank: 2, kind: "ring", text: g.label });
    const kinds = new Map(out.map((x) => [x.key, x.kind]));
    return layoutSlips(out).map((p) => ({ ...p, kind: kinds.get(p.key)! }));
  });

  return (
    <div class="bw-marks" classList={{ moving: !!props.moving?.() }} aria-hidden="true">
      <svg class="bw-marks-svg">
        <For each={rings()}>
          {(r) => (
            <g transform={`translate(${r.x} ${r.y})`} class="bw-ring" classList={{ keystone: r.keystone }}>
              <title>{r.title}</title>
              <circle r={r.keystone ? RING_R + 3 : RING_R} class="bw-ring-track" />
              <path d={arc(r.keystone ? RING_R + 3 : RING_R, r.share)} class="bw-ring-fill" />
              <Show when={r.count > 1}><text class="bw-ring-count" text-anchor="middle" dy="0.35em">{r.count}</text></Show>
            </g>
          )}
        </For>
        <For each={tips()}>
          {(m) => (
            <g transform={`translate(${m.x} ${m.y})`} class={`bw-tip-mark ${m.mo}`}>
              <title>{t(`boardui.momentum.${m.mo}`, { council: councilName(model, m.code) })}</title>
              <path d={m.mo === "rising" ? "M-8 5 0 -8 8 5Z" : "M-8 -5 0 8 8 -5Z"} />
            </g>
          )}
        </For>
      </svg>
      <For each={slips()}>
        {(n) => (
          <span
            class={n.kind === "ring" ? "bw-ring-year small data" : `bw-news bw-news-${n.kind} small`}
            classList={{ event: n.kind === "event" }}
            style={{ left: `${n.box[0]}px`, top: `${n.box[1]}px` }}
          >{n.text}</span>
        )}
      </For>
    </div>
  );
}
