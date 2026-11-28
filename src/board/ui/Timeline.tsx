/**
 * The time line (docs/design/v2-board.md 16.2.6): one strip along the foot of the board, 2026 on
 * the left and 2050 on the right. The past is printed paper with a band for each term and the
 * name the game gave it; the future is tracing paper with the elections (and the result if one
 * were held now), the warned events as hatched blocks, and the dates that matter. Builds under
 * way run as bars in three lanes, filled as far as now. The red pin is now.
 *
 * `TimelineStrip` is the strip alone, driven by props, for the end screen too (package 12): it
 * takes an `at` step for the pin and, with `onScrub`, becomes a slider over the years.
 * `Timeline` is the board's own, with the clock at its left end.
 *
 * After cold playtest 9 (should fix 6): the keystone mark says what it means where it stands,
 * "Keystones: start by here", and its tip says why: a keystone takes so many years to build
 * (from projects.yaml), so one started later would not work by 2050.
 */
import { createMemo, For, Match, Show, Switch, type JSX } from "solid-js";
import { t } from "./lang";
import { Icon } from "../../ui/parts";
import type { BoardModel, BoardState, TimelineView } from "../engine/api";
import { eventNoun, timeline } from "../engine/api";
import { Clock } from "./clock/Clock";
import { useGame } from "./game";
import { eventIcon } from "./icons";
import { pickTimeline } from "./timelinePick";
import { layoutTimeline, type TimelineItem } from "./timelineLayout";
import { chapterName, councilName, projectName, say, tx, whenWords } from "./words";

export { layoutTimeline, type TimelineItem } from "./timelineLayout";

export interface TimelineStripProps {
  model: BoardModel;
  state: BoardState;
  view: TimelineView;
  /** The step the pin stands at; may be a fraction while the clock runs or the end screen plays. */
  at?: number;
  /** Controls at the left end (the clock on the board). */
  lead?: JSX.Element;
  onPick?: (item: TimelineItem) => void;
  /** Scrub mode (the end screen): a slider over the years, giving a step. */
  onScrub?: (step: number) => void;
}

const BRANCH_STOCK = ["buff", "green", "pink", "blue"];
const pct = (f: number) => `${f * 100}%`;

/**
 * True when a year on the axis would sit under the "now" tag (a share of the track either side of
 * the now line, on the side the tag hangs), so the axis never prints "20 Summer 2028".
 */
export function underNow(year: number, now: number): boolean {
  const d = year - now;
  return now > 0.86 ? d > -0.095 && d < 0.025 : d > -0.025 && d < 0.095;
}

/** Years a keystone takes to build: the longest of the keystones in projects.yaml. */
const keystoneYears = (model: BoardModel): number => Math.max(0, ...model.projects.filter((p) => p.keystone).map((p) => p.build_years));

/** The short words on a date mark. */
const markShort = (mark: string): string => (mark === "keystone_last_start" ? t("boardclock.timeline.keystoneShort") : t(`boardui.timeline.markShort.${mark}`));

/** The plain name of a piece, for its button and its tip. */
function itemWords(model: BoardModel, state: BoardState, i: TimelineItem): string {
  switch (i.kind) {
    case "term": return t("boardui.timeline.term", { name: chapterName(model, i.record), from: i.record.fromYear, to: i.record.toYear });
    case "election": return i.held
      ? t("boardui.timeline.held", { year: i.year, result: t(`boardui.election.short.${i.result}`) })
      : t("boardui.timeline.ahead", { year: i.year, result: t(`boardui.timeline.would.${i.result}`) });
    case "event": return t("boardui.timeline.landed", { name: tx(model.events.find((e) => e.id === i.event)?.name), noun: t(eventNoun(i.event)), place: councilName(model, i.council), when: whenWords(model, i.step) });
    case "moment": return say(i.moment.say) || t("boardui.timeline.moment", { when: whenWords(model, i.step) });
    case "build": return t("boardui.timeline.build", { name: projectName(model, i.project), place: councilName(model, i.site.council ?? model.links.find((l) => l.id === i.site.link)?.from), when: whenWords(model, i.readyStep + 1) });
    case "more": return t("boardui.timeline.more", { n: i.count });
    case "warning": return t("boardui.timeline.warning", { name: tx(model.events.find((e) => e.id === i.event)?.name), noun: t(eventNoun(i.event)), place: councilName(model, i.councils[0]), when: whenWords(model, i.fromStep) });
    case "mark":
      if (i.mark === "keystone_last_start") return t("boardclock.timeline.keystoneLong", { when: whenWords(model, i.step), n: keystoneYears(model) });
      return say(i.say) || t(`boardui.timeline.mark.${i.mark}`, { when: whenWords(model, i.step), council: councilName(model, i.council) });
  }
}

export function TimelineStrip(props: TimelineStripProps): JSX.Element {
  const model = props.model;
  const g = model.game;
  const at = () => props.at ?? props.view.step;
  const items = createMemo(() => layoutTimeline(model, props.state, props.view, Math.floor(at())));
  const nowAt = () => Math.max(0, Math.min(1, at() / g.steps));
  const years = Array.from({ length: Math.floor((g.end_year - g.first_year) / 2) + 1 }, (_, i) => g.first_year + i * 2);
  const yearAt = (y: number) => (y - g.first_year) / (g.end_year - g.first_year);
  const branchOf = (project: string) => Math.max(0, model.branches.findIndex((b) => b.id === model.projects.find((p) => p.id === project)?.branch));
  const nowIndex = () => items().findIndex((i) => ("from" in i ? i.from : i.at) > nowAt());
  const pick = (i: TimelineItem) => props.onPick?.(i);

  const piece = (i: TimelineItem): JSX.Element => {
    const words = itemWords(model, props.state, i);
    // the long words are part of the name, after any short words shown, so the name holds what is seen
    const common = { type: "button" as const, title: words, onClick: () => pick(i) };
    const sr = <span class="bw-tl-sr"> {words}</span>;
    return (
      <Switch>
        <Match when={i.kind === "term" && i}>{(x) => (
          <button {...common} class="bw-tl-term" style={{ left: pct(x().from), width: pct(x().to - x().from) }}>
            <span class="bw-tl-term-name">{chapterName(model, x().record)}</span>
          {sr}</button>
        )}</Match>
        <Match when={i.kind === "election" && i}>{(x) => (
          <button {...common} class="bw-tl-election" classList={{ held: x().held, lost: x().result === "lost" }} style={{ left: pct(x().at) }}>
            <i aria-hidden="true" /><span class="small">{x().held ? t(`boardui.election.short.${x().result}`) : t(`boardui.timeline.would.${x().result}`)}</span>
          {sr}</button>
        )}</Match>
        <Match when={i.kind === "event" && i}>{(x) => (
          <button {...common} class="bw-tl-pip bw-tl-pip-event" style={{ left: pct(x().at) }}><i aria-hidden="true" />{sr}</button>
        )}</Match>
        <Match when={i.kind === "moment" && i}>{(x) => (
          <button {...common} class={`bw-tl-pip bw-tl-pip-${x().moment.kind}`} style={{ left: pct(x().at) }}><i aria-hidden="true" />{sr}</button>
        )}</Match>
        <Match when={i.kind === "build" && i}>{(x) => (
          <button {...common} class="bw-tl-bar" classList={{ keystone: x().keystone }}
            style={{ left: pct(x().from), width: pct(x().to - x().from), "--lane": x().lane, "--done": pct(x().done), "--stock": `var(--ticket-${BRANCH_STOCK[branchOf(x().project) % 4]})` }}>
            <span class="bw-tl-bar-done" aria-hidden="true" />
          {sr}</button>
        )}</Match>
        <Match when={i.kind === "more" && i}>{(x) => (
          <button {...common} class="bw-tl-more small" style={{ left: pct(x().at) }}>{t("boardui.timeline.moreShort", { n: x().count })}{sr}</button>
        )}</Match>
        <Match when={i.kind === "warning" && i}>{(x) => (
          <button {...common} class="bw-tl-warning" classList={{ good: x().good, late: x().from > 0.86 }} style={{ left: pct(x().from), width: pct(x().to - x().from) }}>
            <Icon name={eventIcon(model, x().event)} size={11} />
            <Show when={x().labelled}><span class="bw-tl-warning-where small">{councilName(model, x().councils[0])}</span></Show>
          {sr}</button>
        )}</Match>
        <Match when={i.kind === "mark" && i}>{(x) => (
          <button {...common} class={`bw-tl-mark bw-tl-mark-${x().mark}${x().at > 0.86 ? " late" : ""}`} style={{ left: pct(x().at) }}>
            <i aria-hidden="true" /><Show when={x().labelled}><span class="small">{markShort(x().mark)}</span></Show>
          {sr}</button>
        )}</Match>
      </Switch>
    );
  };

  return (
    <div class="bw-timeline strip" role="group" aria-label={t("boardui.timeline.aria")} data-testid="bw-timeline">
      <Show when={props.lead}><div class="bw-tl-lead">{props.lead}</div></Show>
      <div class="bw-tl-track" style={{ "--now": pct(nowAt()) }}>
        <span class="bw-tl-past" aria-hidden="true" />
        <ol class="bw-tl-years" aria-hidden="true">
          <For each={years}>{(y) => <li class="small data" classList={{ "under-now": underNow(yearAt(y), nowAt()) }} style={{ left: pct(yearAt(y)) }}>{y}</li>}</For>
        </ol>
        <ol class="bw-tl-items">
          <For each={items()}>
            {(i, n) => (
              <>
                <Show when={n() === nowIndex()}><li class="bw-tl-sr" aria-current="date">{t("boardui.timeline.now", { when: whenWords(model, Math.floor(at())) })}</li></Show>
                <li class={`bw-tl-li bw-tl-li-${i.kind}`}>{piece(i)}</li>
              </>
            )}
          </For>
          <Show when={nowIndex() < 0}><li class="bw-tl-sr" aria-current="date">{t("boardui.timeline.now", { when: whenWords(model, Math.floor(at())) })}</li></Show>
        </ol>
        <span class="bw-tl-now" classList={{ late: nowAt() > 0.86 }} aria-hidden="true">
          <span class="bw-tl-now-tag small data">{whenWords(model, Math.min(g.steps, Math.floor(at())), true)}</span>
        </span>
        <Show when={props.onScrub}>
          <input class="bw-tl-scrub" type="range" min="0" max={g.steps} step="0.25" value={at()} aria-label={t("boardui.timeline.scrub")}
            aria-valuetext={whenWords(model, Math.floor(at()), true)} onInput={(e) => props.onScrub!(+e.currentTarget.value)} />
        </Show>
      </div>
    </div>
  );
}

/** The board's time line: the clock at the left end, the pin sliding as the clock runs. */
export function Timeline(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const view = createMemo(() => { const s = game.state(); return s ? timeline(model, s) : null; });
  const at = () => (game.state()?.step ?? 0) + (game.clock.running() ? game.clock.progress() : 0);
  return (
    <Show when={view()}>
      {(v) => <TimelineStrip model={model} state={game.state()!} view={v()} at={at()} lead={<Clock />} onPick={(i) => pickTimeline(game, i)} />}
    </Show>
  );
}
