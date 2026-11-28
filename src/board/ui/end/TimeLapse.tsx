/**
 * The time-lapse (16.2.7 and 16.5.3 item 1): the 25 yearly frames on the paper map in about 15
 * seconds, easing between years, holding 1.5 seconds on each turning point with its council ringed
 * and a caption. The strip under it scrubs. Reduced motion shows the board at the end of each term
 * as stills, with the turning points as a list.
 */
import { createEffect, createMemo, createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import { t } from "../lang";
import type { PaperMap } from "../../../map";
import { MapView } from "../../../ui/atlas/MapView";
import "../../../ui/atlas/atlas.css";
import { TabButton } from "../../../ui/parts";
import { geo } from "../../../ui/shell/model";
import type { BoardModel, BoardState, Frame, Moment } from "../../engine/api";
import { timeline } from "../../engine/api";
import { TimelineStrip } from "../Timeline";
import { councilName, outOf10 } from "../words";
import { linksOf, markersOf, stitchesOf } from "./lapseMap";
import { MiniMap } from "./MiniMap";
import { captionOf, TurningPoint } from "./TurningPoint";
import { easeValues, lapseAt, lapseLength, lapseMsOf, scaleOf, termStills, valuesOf } from "./view";

export interface TimeLapseProps {
  model: BoardModel;
  state: BoardState;
  frames: Frame[];
  points: { moment: Moment; index: number }[];
  terms: { term: number; fromYear: number; toYear: number; name: string }[];
}

const reducedMotion = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function TimeLapse(props: TimeLapseProps): JSX.Element {
  const reduced = reducedMotion();
  return (
    <section class="be-lapse" aria-labelledby="be-lapse-title" data-testid="be-lapse">
      <h2 class="t-2" id="be-lapse-title">{t("boardend.lapse.title", { from: props.model.game.first_year, to: props.model.game.end_year })}</h2>
      <Show when={!reduced} fallback={<Stills {...props} />}>
        <Moving {...props} />
      </Show>
    </section>
  );
}

function heaviestEventOf(points: { moment: Moment }[]): Moment | null {
  return points.map((p) => p.moment).filter((m) => m.kind === "event").sort((a, b) => b.weight - a.weight)[0] ?? null;
}

function Moving(props: TimeLapseProps): JSX.Element {
  const model = props.model;
  const holds = () => props.points.map((p) => p.index);
  const total = () => lapseLength(props.frames.length, holds());
  const scale = createMemo(() => scaleOf(model, props.frames, "all"));
  const [ms, setMs] = createSignal(0);
  const [playing, setPlaying] = createSignal(true);
  const [map, setMap] = createSignal<PaperMap | null>(null);
  const pos = createMemo(() => lapseAt(props.frames.length, holds(), ms()));
  const heavy = createMemo(() => heaviestEventOf(props.points));

  let raf = 0;
  let last = 0;
  const loop = (now: number) => {
    if (last) setMs((m) => Math.min(total(), m + (now - last)));
    last = now;
    if (ms() >= total()) { setPlaying(false); last = 0; return; }
    raf = requestAnimationFrame(loop);
  };
  createEffect(() => {
    if (playing()) { last = 0; raf = requestAnimationFrame(loop); }
    else cancelAnimationFrame(raf);
  });
  onCleanup(() => cancelAnimationFrame(raf));

  const onReady = (m: PaperMap) => {
    m.setLayers({ peaks: false, sites: false });
    m.setHighlight(model.game.councils);
    m.focusLas(model.game.councils);
    setMap(m);
    // the stage takes its size after the first layout: fit the map to it, then frame the region
    requestAnimationFrame(() => { m.resize(true); m.focusLas(model.game.councils); });
  };

  // draw the frame: eased colours, the marks of the nearer year, beads on what travelled
  createEffect(() => {
    const m = map();
    const p = pos();
    if (!m || !props.frames.length) return;
    const a = props.frames[p.index]!, b = props.frames[Math.min(p.index + 1, props.frames.length - 1)]!;
    const near = p.t < 0.5 ? a : b;
    m.setLens({ ...scale(), values: easeValues(model, a, b, "all", p.t) });
    m.setStitches(stitchesOf(model, near));
    m.setLinks(linksOf(model, b, p.holding === null && !p.done ? p.t : null));
    m.setMarkers(markersOf(model, b));
    const held = p.holding !== null ? props.points.find((x) => x.index === p.holding)?.moment : undefined;
    m.setSelected(held?.council ?? null);
  });

  const year = () => {
    const p = pos();
    const f = props.frames[Math.min(p.index + (p.t >= 0.5 ? 1 : 0), props.frames.length - 1)];
    return f?.year ?? model.game.first_year;
  };
  const holding = () => {
    const p = pos();
    return p.holding !== null ? props.points.find((x) => x.index === p.holding)?.moment ?? null : null;
  };
  const restart = () => { setMs(0); setPlaying(true); };
  const view = createMemo(() => timeline(model, props.state));
  /** The step the pin stands at, eased between the yearly frames. */
  const stepAt = () => {
    const p = pos();
    const a = props.frames[p.index], b = props.frames[Math.min(p.index + 1, props.frames.length - 1)];
    return a && b ? a.step + (b.step - a.step) * p.t : 0;
  };
  /** The yearly frame nearest a step. */
  const indexOfStep = (step: number) => {
    let best = 0;
    props.frames.forEach((f, i) => { if (Math.abs(f.step - step) < Math.abs(props.frames[best]!.step - step)) best = i; });
    return best;
  };
  const jump = (index: number) => { setPlaying(false); setMs(lapseMsOf(index, holds())); };

  return (
    <div class="be-lapse-body">
      <div class="be-lapse-stage">
        <Show when={geo()}>
          <MapView geo={geo()!} ariaLabel={t("boardend.lapse.mapAria", { year: year() })} onReady={onReady} class="be-lapse-map" />
        </Show>
        <p class="t-year be-lapse-year" aria-hidden="true">{year()}</p>
        <div class="be-lapse-caption sheet" aria-live="polite">
          <Show when={holding()} fallback={<p class="small">{pos().done ? t("boardend.lapse.done") : t("boardend.lapse.colour")}</p>}>
            <TurningPoint model={model} state={props.state} moment={holding()!} heaviestEvent={holding() === heavy()} />
          </Show>
        </div>
      </div>
      <div class="be-lapse-controls">
        <Show when={!pos().done} fallback={<TabButton onClick={restart} data-testid="be-lapse-again">{t("boardend.lapse.again")}</TabButton>}>
          <TabButton onClick={() => setPlaying(!playing())} aria-pressed={!playing()} data-testid="be-lapse-pause">
            {playing() ? t("boardend.lapse.pause") : t("boardend.lapse.play")}
          </TabButton>
          <TabButton onClick={() => { setPlaying(false); setMs(total()); }} data-testid="be-lapse-skip">{t("boardend.lapse.skip")}</TabButton>
        </Show>
      </div>
      <TimelineStrip
        model={model}
        state={props.state}
        view={view()}
        at={stepAt()}
        onScrub={(step) => jump(indexOfStep(step))}
        onPick={(item) => { if (item.kind === "moment") jump(indexOfStep(item.step)); }}
      />
      <Show when={props.points.length === 0}>
        <p class="small">{t("boardend.lapse.noPoints")}</p>
      </Show>
    </div>
  );
}

function Stills(props: TimeLapseProps): JSX.Element {
  const model = props.model;
  const stills = createMemo(() => termStills(model, props.frames));
  const scale = createMemo(() => scaleOf(model, props.frames, "all"));
  const heavy = createMemo(() => heaviestEventOf(props.points));
  return (
    <div class="be-stills">
      <p class="small">{t("boardend.lapse.stillsNote")}</p>
      <ol class="be-stills-grid">
        <For each={stills()}>
          {(f) => (
            <li class="be-still">
              <MiniMap
                model={model}
                frame={f}
                values={valuesOf(model, f, "all")}
                scale={scale()}
                label={t("boardend.lapse.stillAria", { year: f.year })}
                valueText={(_c, v) => outOf10(v)}
                ringed={props.points.filter((p) => props.frames[p.index]?.year === f.year).map((p) => p.moment.council ?? "")}
                showProjects
              />
              <span class="data small">{f.year}</span>
            </li>
          )}
        </For>
      </ol>
      <h3 class="t-3">{t("boardend.lapse.points")}</h3>
      <Show when={props.points.length} fallback={<p class="small">{t("boardend.lapse.noPoints")}</p>}>
        <ol class="be-points">
          <For each={props.points}>
            {(p) => (
              <li>
                <TurningPoint model={model} state={props.state} moment={p.moment} heaviestEvent={p.moment === heavy()} />
                <Show when={p.moment.council}><span class="small">{councilName(model, p.moment.council)}</span></Show>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </div>
  );
}
