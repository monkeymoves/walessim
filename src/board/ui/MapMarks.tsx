/**
 * Marks drawn over the paper map (16.2.3 and 16.3.3): a ring for each build under way that fills
 * a quarter turn for each quarter of its build time, with the season it opens beside it; an up or
 * down cut mark on a council that is on the rise or slipping; and, for the step that has just
 * run, a slip by each council where something finished or landed. Positions come from the map's
 * own projection and follow it when it zooms or resizes. Marks change only when a step runs.
 */
import { createMemo, For, type Accessor, type JSX } from "solid-js";
import { t } from "../../i18n";
import type { PaperMap } from "../../map";
import type { BoardModel, CouncilCode, ProjectState, Site } from "../engine/api";
import { useGame } from "./game";
import { councilName, projectName, tx, whenWords } from "./words";

const RING_R = 9;
const RING_GAP = 24;

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

export function MapMarks(props: { map: Accessor<PaperMap | null>; view: Accessor<number> }): JSX.Element {
  const game = useGame();
  const model = game.model;

  const rings = createMemo(() => {
    props.view();
    const m = props.map(), s = game.state();
    if (!m || !s) return [];
    const seen = new Map<string, number>();
    return s.projects.filter((p) => p.status === "building").map((p: ProjectState) => {
      const at = siteAt(model, m, p.site);
      const key = p.site.council ?? p.site.link ?? "";
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      const span = Math.max(1, p.readyStep + 1 - p.startedStep);
      // whole quarters: the ring moves a quarter turn for each quarter of the build
      const share = Math.floor(((s.step - p.startedStep) / span) * 4) / 4;
      const keystone = !!model.projects.find((d) => d.id === p.project)?.keystone;
      return at ? { id: p.id, x: at[0] + n * RING_GAP, y: at[1] + 22, share: Math.max(0, share), keystone, label: whenWords(model, p.readyStep + 1, true), name: projectName(model, p.project) } : null;
    }).filter((x) => !!x);
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

  /** What finished and what landed in the step that has just run, by council. */
  const news = createMemo(() => {
    props.view();
    const m = props.map(), s = game.state(), r = game.clock.last();
    if (!m || !s || !r || r.step !== s.step - 1) return [];
    const out: { key: string; x: number; y: number; text: string; event: boolean }[] = [];
    for (const id of r.finished) {
      const p = s.projects.find((x) => x.id === id);
      const at = p ? siteAt(model, m, p.site) : null;
      if (p && at) out.push({ key: `f${id}`, x: at[0], y: at[1] - 20, text: t("boardui.map.finished", { project: projectName(model, p.project) }), event: false });
    }
    for (const e of r.events) {
      const code: CouncilCode | undefined = e.councils[0];
      const at = code ? m.anchorOf(code) : null;
      if (at) out.push({ key: `e${e.event}`, x: at[0], y: at[1] - 38, text: tx(model.events.find((x) => x.id === e.event)?.name), event: true });
    }
    return out;
  });

  return (
    <div class="bw-marks" aria-hidden="true">
      <svg class="bw-marks-svg">
        <For each={rings()}>
          {(r) => (
            <g transform={`translate(${r!.x} ${r!.y})`} class="bw-ring" classList={{ keystone: r!.keystone }}>
              <title>{t("boardui.map.ring", { name: r!.name, when: r!.label })}</title>
              <circle r={r!.keystone ? RING_R + 3 : RING_R} class="bw-ring-track" />
              <path d={arc(r!.keystone ? RING_R + 3 : RING_R, r!.share)} class="bw-ring-fill" />
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
      <For each={rings()}>
        {(r) => <span class="bw-ring-year small data" style={{ left: `${r!.x + (r!.keystone ? 15 : 12)}px`, top: `${r!.y - 8}px` }}>{r!.label}</span>}
      </For>
      <For each={news()}>
        {(n) => <span class="bw-news small" classList={{ event: n.event }} style={{ left: `${n.x}px`, top: `${n.y}px` }}>{n.text}</span>}
      </For>
    </div>
  );
}
