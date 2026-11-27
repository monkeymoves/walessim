// Pull the thread (game-design 2.3): a chain of stops, Strand, Card or curveball, Place choices,
// Rule and sources, drawn as a red thread down the sheet, out to the strand that moved and on to
// the map. Every trace ends with the same honest line.
import { createEffect, createMemo, createSignal, For, Match, onCleanup, onMount, Show, Switch, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { STRAND_IDS } from "../../model/schema";
import { serialOf } from "../parts/Ticket";
import { pick, t, tn } from "../../i18n";
import { tw } from "./cymraeg";
import { CloseButton, TabButton } from "../parts/Buttons";
import { SourceTag } from "../parts/SourceTag";
import { ConfidenceMark } from "../parts/ConfidenceMark";
import type { Thread, TraceStop } from "../../engine/api";
import { useGame } from "./context";
import { StrandName } from "./StrandName";
import { placeThreadName } from "./placeNames";
import { paramLabel } from "../book/names";

const STOP_LABEL: Record<TraceStop["kind"], string> = {
  strand: "game.trace.strand",
  component: "game.trace.strand",
  cause: "game.trace.cause",
  place: "game.trace.place",
  rule: "game.trace.rule",
};


export function TracePanel(): JSX.Element {
  const { game, ui } = useGame();
  // the panel can outlive its trace by a tick while it closes, so never read a null ref
  const ref = () => game.trace() ?? { term: 0, strand: "prosperous" as const, part: "flow" as const, index: 0 };
  const threads = () => game.threads();
  const th = createMemo<Thread | null>(() => threads()[ref().index] ?? threads()[0] ?? null);
  const close = () => {
    game.setTrace(null);
    ui.map()?.setThread(null);
  };
  let sheet!: HTMLElement;

  // the red thread on the map: from the most moved authority to the sheet's right edge
  createEffect(() => {
    const m = ui.map();
    const t0 = th();
    if (!m || !t0 || !t0.las[0] || !sheet) { m?.setThread(null); return; }
    const host = m.root.getBoundingClientRect();
    const r = sheet.getBoundingClientRect();
    m.setThread({ la: t0.las[0], to: [r.right - host.left, r.top - host.top + 120] });
  });
  onCleanup(() => ui.map()?.setThread(null));

  // the red thread from the strand that moved, out of the top bar, to the sheet's first pin
  const [path, setPath] = createSignal<string | null>(null);
  const draw = () => {
    const idx = STRAND_IDS.indexOf(ref().strand);
    const meter = document.querySelectorAll<HTMLElement>(".yf-strands .meter")[idx];
    const pin = sheet?.querySelector<HTMLElement>(".yf-stop.first .yf-stop-pin");
    if (!meter || !pin) { setPath(null); return; }
    const a = meter.getBoundingClientRect(), b = pin.getBoundingClientRect(), p = sheet.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.bottom - 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    // the thread runs round the sheet, never across its words (cold playtest): down from the goal
    // to just above the sheet, along its top edge, down its left edge, and in to the first pin
    const top = p.top - 7, side = p.left - 7, r = 8;
    // the first pin scrolled out of the sheet: no thread rather than one across the words
    if (y1 < p.top + r || y1 > p.bottom) { setPath(null); return; }
    if (x0 < side) { setPath(`M${x0} ${y0} L${x1} ${y1}`); return; }
    setPath(
      `M${x0} ${y0} L${x0} ${top - r} Q${x0} ${top} ${x0 - Math.sign(x0 - side) * r} ${top} ` +
      `L${side + r} ${top} Q${side} ${top} ${side} ${top + r} L${side} ${y1 - r} Q${side} ${y1} ${side + r} ${y1} L${x1} ${y1}`,
    );
  };
  createEffect(() => { ref(); th(); requestAnimationFrame(draw); });
  onMount(() => { window.addEventListener("resize", draw); sheet.addEventListener("scroll", draw); });
  onCleanup(() => window.removeEventListener("resize", draw));

  /** Sources behind a cause that carries no rule: the rules its card's effects name. */
  const causeSources = () => {
    const c = th()?.stops.find((x) => x.kind === "cause") as Extract<TraceStop, { kind: "cause" }> | undefined;
    if (!c) return [] as string[];
    const card = game.names.card(c.cause.id);
    const curve = game.names.curveball(c.cause.id);
    const rules = [...(card?.effects ?? []), ...(curve?.slow ?? [])].map((e) => e.rule).filter((r): r is string => !!r);
    return [...new Set(rules.flatMap((r) => game.names.rule(r)?.sources ?? []))].slice(0, 4);
  };
  const strandStop = () => th()?.stops.find((s) => s.kind === "strand") as Extract<TraceStop, { kind: "strand" }> | undefined;

  return (
    <>
    <Show when={path()}>
      <Portal>
        <svg class="yf-thread-overlay" aria-hidden="true">
          <path d={path()!} class="yf-thread-path" />
          <circle cx={path()!.split(" ")[0]!.slice(1)} cy={path()!.split(" ")[1]} r="4" class="yf-thread-head" />
        </svg>
      </Portal>
    </Show>
    <aside
      class="yf-trace sheet"
      ref={sheet}
      role="dialog"
      aria-labelledby="yf-trace-title"
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}
    >
      <div class="yf-trace-head">
        <h2 id="yf-trace-title" class="t-2">{t("game.trace.title")}</h2>
        <CloseButton label={t("game.trace.close")} onClick={close} />
      </div>
      <p class="small">
        {ref().part === "stock"
          ? t("game.trace.why_stock", { strand: game.names.strandName(ref().strand) })
          : t("game.trace.why", { strand: game.names.strandName(ref().strand) })}
      </p>
      <Show when={th()} fallback={<p class="story-small yf-trace-none">{t("game.trace.none")}</p>}>
        <ol class="yf-stops" data-trace-stops>
          <For each={th()!.stops}>
            {(stop, i) => (
              <li class={`yf-stop yf-stop-${stop.kind}`} classList={{ first: i() === 0 }}>
                <i class="yf-stop-pin" aria-hidden="true" />
                <Show when={stop.kind !== "component"}>
                  <p class="label yf-stop-label">{t(STOP_LABEL[stop.kind])}</p>
                </Show>
                <Stop stop={stop} sharp={strandStop()?.sharp ?? true} />
              </li>
            )}
          </For>
        </ol>
        <Show when={!th()!.stops.some((x) => x.kind === "rule")}>
          <ol class="yf-stops yf-stops-tail">
            <li class="yf-stop yf-stop-rule">
              <i class="yf-stop-pin" aria-hidden="true" />
              <p class="label yf-stop-label">{t("game.trace.rule")}</p>
              <p class="story-small">{t("game.trace.no_rule")}</p>
              <Show when={causeSources().length}>
                <p class="yf-dockets"><For each={causeSources()}>{(id) => <SourceTag source={id} />}</For></p>
              </Show>
            </li>
          </ol>
        </Show>
        <Show when={strandStop() && th()!.las.length}>
          <p class="small yf-trace-map">{tw("game.trace.on_map", { las: game.names.list(th()!.las.slice(0, 3).map((c) => game.names.laName(c))) })}</p>
        </Show>
      </Show>
      <p class="yf-trace-end small">{t("game.trace.ending")}</p>
      <Show when={threads().length > 1}>
        <div class="yf-trace-nav">
          <TabButton onClick={() => game.setTrace({ ...ref(), index: (ref().index + 1) % threads().length })}>
            {t("game.trace.next_thread")}
          </TabButton>
          <span class="small data">{tn("game.trace.other_threads", threads().length - 1)}</span>
        </div>
      </Show>
    </aside>
    </>
  );
}

/** How big a push, in words: the workings are in the model book, not here. */
function pushWords(delta: number): string {
  const a = Math.abs(delta);
  if (a >= 0.5) return t("game.trace.push_strong");
  if (a >= 0.15) return t("game.trace.push");
  return t("game.trace.push_small");
}

function Stop(props: { stop: TraceStop; sharp: boolean }): JSX.Element {
  const { game } = useGame();
  return (
    <Switch>
      <Match when={props.stop.kind === "strand" && (props.stop as Extract<TraceStop, { kind: "strand" }>)}>
        {(s) => (
          <>
            <p class="yf-stop-title"><StrandName strand={s().strand} frays={s().delta < 0} /></p>
            <p class="story-small">
              {s().pipsBefore === s().pipsAfter
                ? tn("game.trace.strand_same", s().pipsAfter, { strand: game.names.strandName(s().strand), to: s().pipsAfter })
                : t("game.trace.strand_line", { strand: game.names.strandName(s().strand), from: s().pipsBefore, to: s().pipsAfter })}
            </p>
            <Show when={!s().sharp}><p class="small">{t("parts.meter.fuzzy")}</p></Show>
          </>
        )}
      </Match>
      <Match when={props.stop.kind === "component" && (props.stop as Extract<TraceStop, { kind: "component" }>)}>
        {(s) => <p class="small yf-via">{t("game.trace.via", { component: game.names.componentName(s().component) })}</p>}
      </Match>
      <Match when={props.stop.kind === "cause" && (props.stop as Extract<TraceStop, { kind: "cause" }>)}>
        {(s) => (
          <>
            <p class="yf-stop-title strong">{game.names.cause(s().cause)}</p>
            <Show when={s().cause.kind === "card" || s().cause.kind === "caretaker"}>
              <p class="serial">{t("parts.ticket.no")} {serialOf(s().cause.id)}</p>
            </Show>
            <p class="story-small">
              {t("game.trace.push_line", {
                direction: s().delta >= 0 ? t("game.trace.direction_up") : t("game.trace.direction_down"),
                push: pushWords(s().delta),
                sharp: props.sharp ? t("game.trace.sharp_word") : t("game.trace.fuzzy_word"),
              })}
              <Show when={s().cause.regions?.length}>{` ${game.names.regionsText(s().cause.regions)}.`}</Show>
            </p>
          </>
        )}
      </Match>
      <Match when={props.stop.kind === "place" && (props.stop as Extract<TraceStop, { kind: "place" }>)}>
        {(s) => (
          <>
            <p class="story-small">{t("game.trace.place_line", { place: game.names.placeName(s().place), grade: t(`game.grade.${s().grade}`) })}</p>
            <Show when={s().threads.length}>
              <p class="label">{t("game.trace.place_threads")}</p>
              <ul class="yf-list">
                <For each={s().threads}>{(id) => <li>{placeThreadName(game.model, s().place, id)}</li>}</For>
              </ul>
            </Show>
          </>
        )}
      </Match>
      <Match when={props.stop.kind === "rule" && (props.stop as Extract<TraceStop, { kind: "rule" }>)}>
        {(s) => {
          const rule = () => game.names.rule(s().rule);
          return (
            <>
              <p class="yf-stop-title strong">{rule() ? pick(rule()!.name) : s().rule}</p>
              <Show when={rule()}><p class="story-small">{pick(rule()!.note)}</p></Show>
              <Show when={s().sources.length}>
                <p class="yf-dockets">
                  <For each={s().sources}>{(id) => <SourceTag source={id} />}</For>
                </p>
              </Show>
              <p><a class="threadlink" href={`#/llyfr/${s().rule}`}>{t("play.why.book")}</a></p>
              <details class="yf-maths">
                <summary class="small">{t("play.why.maths")}</summary>
                <p class="yf-rule-marks">
                  <ConfidenceMark level={s().confidence} />
                  <span class="small">{t("game.trace.evidence", { e: t(`game.evidence.${s().evidence}`) })}</span>
                </p>
                <Show when={s().params.length}>
                  <ul class="small data yf-params">
                    <For each={s().params}>{(p) => <li>{pick(p.unit) ? `${paramLabel(p.name)}: ${p.value} ${pick(p.unit)} (${p.min} to ${p.max})` : `${paramLabel(p.name)}: ${p.value} (${p.min} to ${p.max})`}</li>}</For>
                  </ul>
                </Show>
                <Show when={s().placeholder}><p class="warnstrip small"><span>{t("game.trace.placeholder")}</span></p></Show>
                <Show when={s().gameRule}><p class="small yf-gamerule">{t("game.trace.game_rule")}</p></Show>
              </details>
            </>
          );
        }}
      </Match>
    </Switch>
  );
}

/** Kept for callers that want the stop label key. */
export const traceStopLabel = (k: TraceStop["kind"]) => STOP_LABEL[k];
