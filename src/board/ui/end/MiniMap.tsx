/**
 * A small flat map of the councils in play, cut from the same outlines as the paper map, coloured
 * by one lens. Used for then and now, the reduced motion stills and the Wales you did not build.
 * Light enough to draw several side by side. Each council names itself and its value for screen
 * readers; the colour is never the only carrier (the lists beside the maps say the same).
 */
import { createMemo, For, Show, type JSX } from "solid-js";
import { DEFAULT_PALETTE, lensColour, type LensSpec } from "../../../map";
import { geo } from "../../../ui/shell/model";
import type { BoardModel, CouncilCode, Frame } from "../../engine/api";
import { councilName } from "../words";
import { standing } from "./view";

const path = (rings: [number, number][][]): string =>
  rings.map((r) => r.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z").join("");

export interface MiniMapProps {
  model: BoardModel;
  frame: Frame;
  values: Record<CouncilCode, number>;
  scale: Omit<LensSpec, "values">;
  label: string;
  /** Words for one council's value, for its title. */
  valueText: (code: CouncilCode, v: number) => string;
  ringed?: CouncilCode[];
  /** Drawn as a ghost: a Wales that was not built. */
  ghost?: boolean;
  showProjects?: boolean;
  class?: string;
}

export function MiniMap(props: MiniMapProps): JSX.Element {
  const shapes = createMemo(() => {
    const g = geo();
    if (!g) return [];
    return g.las.filter((la) => props.model.game.councils.includes(la.code)).map((la) => ({ code: la.code, d: path(la.rings as [number, number][][]), rings: la.rings }));
  });
  const box = createMemo(() => {
    const pts = shapes().flatMap((s) => s.rings.flat());
    if (!pts.length) return "0 0 100 100";
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), pad = 2;
    return `${(x0 - pad).toFixed(1)} ${(y0 - pad).toFixed(1)} ${(Math.max(...xs) - x0 + pad * 2).toFixed(1)} ${(Math.max(...ys) - y0 + pad * 2).toFixed(1)}`;
  });
  const fill = (code: CouncilCode): string => {
    const c = lensColour({ ...props.scale, values: props.values }, props.values[code], DEFAULT_PALETTE);
    return c ? `rgb(${c[0]} ${c[1]} ${c[2]})` : "var(--paper-2)";
  };
  const marks = createMemo(() => {
    if (!props.showProjects) return [];
    const by = new Map<string, number>();
    const out: { x: number; y: number; key: string }[] = [];
    for (const p of standing(props.frame)) {
      const code = p.site.council;
      const c = code ? props.model.councils.find((x) => x.code === code) : undefined;
      if (!c) continue;
      const n = by.get(c.code) ?? 0;
      by.set(c.code, n + 1);
      out.push({ x: c.centre[0] - 3 + (n % 4) * 2.2, y: c.centre[1] + 1.5 + Math.floor(n / 4) * 2.2, key: p.id });
    }
    return out;
  });
  return (
    <svg
      class={`be-mini${props.ghost ? " ghost" : ""}${props.class ? " " + props.class : ""}`}
      viewBox={box()}
      role="img"
      aria-label={props.label}
      preserveAspectRatio="xMidYMid meet"
    >
      <Show when={props.ghost}>
        <defs>
          <pattern id="be-ghost-hatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="2.4" class="be-hatch" />
          </pattern>
        </defs>
      </Show>
      <For each={shapes()}>
        {(s) => (
          <path d={s.d} fill={fill(s.code)} class="be-council" classList={{ ringed: !!props.ringed?.includes(s.code) }} fill-rule="evenodd">
            <title>{`${councilName(props.model, s.code)}: ${props.valueText(s.code, props.values[s.code] ?? 0)}`}</title>
          </path>
        )}
      </For>
      <Show when={props.ghost}>
        <For each={shapes()}>{(s) => <path d={s.d} fill="url(#be-ghost-hatch)" fill-rule="evenodd" class="be-ghost-over" aria-hidden="true" />}</For>
      </Show>
      <For each={shapes().filter((s) => props.ringed?.includes(s.code))}>
        {(s) => <path d={s.d} class="be-ring" fill="none" fill-rule="evenodd" aria-hidden="true" />}
      </For>
      <For each={marks()}>{(m) => <rect x={m.x} y={m.y} width="1.6" height="1.6" class="be-project" aria-hidden="true" />}</For>
    </svg>
  );
}
