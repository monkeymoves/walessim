/**
 * The count (16.5.3 item 7), folded shut until opened: the plain band sentence, Left for 2050 (the
 * result), Life in your years (how the years felt), the same game on autopilot, the places
 * visited, and how many of the endings this browser has found.
 */
import { For, Show, type JSX } from "solid-js";
import { formatNum, t } from "../../../i18n";
import type { BoardModel, Ending } from "../../engine/api";
import { tx } from "../words";
import { bandKey } from "./view";

const score = (n: number) => formatNum(Math.round(n));

export function Count(props: { model: BoardModel; ending: Ending; found: string[] }): JSX.Element {
  const s = () => props.ending.scores;
  const gap = () => Math.round(s().result) - Math.round(props.ending.autopilot.result);
  const placeName = (id: string) => tx(props.model.places.find((p) => p.id === id)?.name ?? id);
  return (
    <section class="be-count" aria-labelledby="be-count-title" data-testid="be-count">
      <details class="be-count-fold">
        <summary class="t-3" id="be-count-title" data-testid="be-count-open">{t("boardend.count.title")}</summary>
        <div class="be-count-body">
          <p class="story strong" data-testid="be-band">{t(bandKey(s().band))}</p>
          <p class="story-small">{t("boardend.count.result", { start: score(s().start), left: score(s().left) })}</p>
          <p class="small">{t("boardend.count.rule")}</p>
          <p class="story-small">{t("boardend.count.life", { life: score(s().life) })}</p>
          <p class="story-small">
            {t("boardend.count.autopilot", { n: score(props.ending.autopilot.result) })}{" "}
            {gap() > 0 ? t("boardend.count.ahead", { d: formatNum(gap()) }) : gap() < 0 ? t("boardend.count.behind", { d: formatNum(-gap()) }) : t("boardend.count.level")}
          </p>
          <p class="small">{t("boardend.count.autopilotNote")}</p>
          <Show when={props.ending.visits.length}>
            <h3 class="t-3">{t("boardend.count.visits")}</h3>
            <ul class="small">
              <For each={props.ending.visits}>{(v) => <li>{t("boardend.count.visit", { place: placeName(v.place), grade: t(`boardend.grade.${v.grade}`) })}</li>}</For>
            </ul>
          </Show>
          <p class="small" data-testid="be-found">{t("boardend.count.found", { ending: tx(props.ending.name), n: props.found.length, total: props.model.endings.length })}</p>
          <p class="small be-honest">{t("boardend.count.honest")}</p>
        </div>
      </details>
    </section>
  );
}
