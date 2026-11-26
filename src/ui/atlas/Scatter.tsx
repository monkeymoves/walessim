// A scatter of any two indicators: each authority a cut ink square with its name, the Wales
// value a hollow square. Ink for the data, rules for the grid. Linked to the map both ways.
import { createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { pick, t } from "../../i18n";
import type { Authority } from "../../model/schema";
import { byStrand, fmt, type AtlasIndicator } from "./data";
import { formatTick, niceTicks } from "./format";

export interface ScatterProps {
  authorities: Authority[];
  indicators: AtlasIndicator[];
  x: string;
  y: string;
  onAxes: (x: string, y: string) => void;
  hot: string | null;
  selected: string | null;
  onHot: (code: string | null) => void;
  onSelect: (code: string) => void;
}

const M = { l: 52, r: 16, t: 24, b: 46 };

interface Mark { code: string; name: string; px: number; py: number; vx: number; vy: number; lx: number; ly: number; anchor: "start" | "end" }

export function Scatter(props: ScatterProps): JSX.Element {
  // the SVG is drawn at its real size so text stays at 11.5px
  const [size, setSize] = createSignal({ w: 580, h: 480 });
  let box!: HTMLDivElement;
  onMount(() => {
    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      const w = Math.max(320, Math.round(e.contentRect.width)), h = Math.max(300, Math.round(e.contentRect.height));
      setSize({ w, h });
    });
    ro.observe(box);
    onCleanup(() => ro.disconnect());
  });
  const W = () => size().w;
  const H = () => size().h;
  const X = () => props.indicators.find((i) => i.id === props.x)!;
  const Y = () => props.indicators.find((i) => i.id === props.y)!;
  const dom = (ind: AtlasIndicator) => {
    const v = Object.values(ind.laValues);
    const lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo) * 0.06 || 1;
    return [lo - pad, hi + pad] as const;
  };
  const sx = (v: number) => { const [a, b] = dom(X()); return M.l + ((v - a) / (b - a)) * (W() - M.l - M.r); };
  const sy = (v: number) => { const [a, b] = dom(Y()); return H() - M.b - ((v - a) / (b - a)) * (H() - M.t - M.b); };
  const marks = createMemo<Mark[]>(() => {
    const out: Mark[] = [];
    const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const pts = props.authorities
      .map((a) => ({ a, vx: X().laValues[a.code], vy: Y().laValues[a.code] }))
      .filter((p) => p.vx != null && p.vy != null)
      .map((p) => ({ ...p, px: sx(p.vx!), py: sy(p.vy!) }));
    // marks themselves are obstacles for labels
    for (const p of pts) placed.push({ x0: p.px - 5, y0: p.py - 5, x1: p.px + 5, y1: p.py + 5 });
    if (X().wales != null && Y().wales != null) {
      const wx = sx(X().wales!), wy = sy(Y().wales!);
      placed.push({ x0: wx - 6, y0: wy - 8, x1: wx + 46, y1: wy + 8 });
    }
    const hits = (b: { x0: number; y0: number; x1: number; y1: number }) =>
      b.x0 < M.l || b.x1 > W() - 2 || b.y0 < 0 || b.y1 > H() - M.b || placed.some((q) => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0);
    for (const p of pts.sort((a, b) => a.py - b.py)) {
      const name = pick(p.a.name);
      const w = name.length * 5.6 + 4, h = 13;
      const tries: [number, number, "start" | "end"][] = [[8, 4, "start"], [-8, 4, "end"], [8, -7, "start"], [-8, -7, "end"], [8, 14, "start"], [-8, 14, "end"], [8, -16, "start"], [-8, -16, "end"]];
      const boxOf = (tr: (typeof tries)[number]) => {
        const x0 = tr[2] === "start" ? p.px + tr[0] : p.px + tr[0] - w;
        return { x0, y0: p.py + tr[1] - 10, x1: x0 + w, y1: p.py + tr[1] - 10 + h };
      };
      const overlap = (b: { x0: number; y0: number; x1: number; y1: number }) =>
        placed.reduce((a, q) => a + Math.max(0, Math.min(b.x1, q.x1) - Math.max(b.x0, q.x0)) * Math.max(0, Math.min(b.y1, q.y1) - Math.max(b.y0, q.y0)), 0) +
        (b.x0 < M.l || b.x1 > W() - 2 ? 1e6 : 0);
      let chosen = tries.find((tr) => !hits(boxOf(tr)));
      if (!chosen) chosen = tries.slice().sort((a, b) => overlap(boxOf(a)) - overlap(boxOf(b)))[0]!;
      placed.push(boxOf(chosen));
      out.push({ code: p.a.code, name, px: p.px, py: p.py, vx: p.vx!, vy: p.vy!, lx: p.px + chosen[0], ly: p.py + chosen[1], anchor: chosen[2] });
    }
    return out;
  });
  const xt = () => niceTicks(...dom(X()), 6).filter((v) => v >= dom(X())[0] && v <= dom(X())[1]);
  const yt = () => niceTicks(...dom(Y()), 6).filter((v) => v >= dom(Y())[0] && v <= dom(Y())[1]);
  const Select = (p: { value: string; label: string; onChange: (v: string) => void; testid: string }): JSX.Element => (
    <label class="axispick">
      <span class="label">{p.label}</span>
      <select value={p.value} onChange={(e) => p.onChange(e.currentTarget.value)} data-testid={p.testid}>
        <For each={byStrand(props.indicators)}>
          {(g) => (
            <optgroup label={g.strand ? t(`parts.strand.${g.strand}`) : t("atlas.lens.other")}>
              <For each={g.items}>{(ind) => <option value={ind.id} selected={ind.id === p.value}>{pick(ind.name)}</option>}</For>
            </optgroup>
          )}
        </For>
      </select>
    </label>
  );
  return (
    <div class="scatter">
      <div class="scatter-axes">
        <Select value={props.y} label={t("atlas.scatter.up")} onChange={(v) => props.onAxes(props.x, v)} testid="scatter-y" />
        <Select value={props.x} label={t("atlas.scatter.across")} onChange={(v) => props.onAxes(v, props.y)} testid="scatter-x" />
      </div>
      <div class="scatter-box" ref={box}>
      <svg
        class="scatter-svg"
        width={W()}
        height={H()}
        viewBox={`0 0 ${W()} ${H()}`}
        role="group"
        aria-label={t("atlas.scatter.aria", { x: pick(X().name), y: pick(Y().name) })}
        data-testid="scatter"
        onPointerLeave={() => props.onHot(null)}
      >
        <g class="grid">
          <For each={xt()}>{(v) => <line x1={sx(v)} x2={sx(v)} y1={M.t} y2={H() - M.b} />}</For>
          <For each={yt()}>{(v) => <line x1={M.l} x2={W() - M.r} y1={sy(v)} y2={sy(v)} />}</For>
        </g>
        <g class="axis">
          <line x1={M.l} x2={W() - M.r} y1={H() - M.b} y2={H() - M.b} />
          <line x1={M.l} x2={M.l} y1={M.t} y2={H() - M.b} />
          <For each={xt()}>{(v) => <text x={sx(v)} y={H() - M.b + 16} text-anchor="middle">{formatTick(v, X().format)}</text>}</For>
          <For each={yt()}>{(v) => <text x={M.l - 7} y={sy(v) + 4} text-anchor="end">{formatTick(v, Y().format)}</text>}</For>
          <text class="axis-title" x={W() - M.r} y={H() - 6} text-anchor="end">{t(`atlas.short.${X().id}`)} ({t(`atlas.headUnit.${X().id}`)}), {X().year}</text>
          <text class="axis-title" x={M.l - 40} y={12} text-anchor="start">{t(`atlas.short.${Y().id}`)} ({t(`atlas.headUnit.${Y().id}`)}), {Y().year}</text>
        </g>
        <Show when={X().wales != null && Y().wales != null}>
          <g class="wales-mark" aria-hidden="true">
            <rect x={sx(X().wales!) - 5} y={sy(Y().wales!) - 5} width="10" height="10" />
            <text x={sx(X().wales!) + 9} y={sy(Y().wales!) + 4}>{t("atlas.wales")}</text>
          </g>
        </Show>
        <For each={marks()}>
          {(m) => (
            <g
              class="mark"
              classList={{ hot: props.hot === m.code, sel: props.selected === m.code }}
              tabindex="0"
              role="button"
              aria-pressed={props.selected === m.code}
              aria-label={`${m.name}: ${fmt(X(), m.vx)}, ${fmt(Y(), m.vy)}`}
              onPointerEnter={() => props.onHot(m.code)}
              onFocus={() => props.onHot(m.code)}
              onBlur={() => props.onHot(null)}
              onClick={() => props.onSelect(m.code)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); props.onSelect(m.code); } }}
            >
              <rect class="hit" x={m.px - 9} y={m.py - 9} width="18" height="18" />
              <rect class="sq" x={m.px - 3.5} y={m.py - 3.5} width="7" height="7" />
              <Show when={props.selected === m.code}>
                <circle class="selpin" cx={m.px} cy={m.py} r="9" />
              </Show>
              <text x={m.lx} y={m.ly} text-anchor={m.anchor}>{m.name}</text>
            </g>
          )}
        </For>
      </svg>
      </div>
      <p class="small scatter-note">{t("atlas.scatter.note")}</p>
    </div>
  );
}
