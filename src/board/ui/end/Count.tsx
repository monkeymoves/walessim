/**
 * The count (16.5.3 item 7), folded shut until opened: how the result is worked out, what doing
 * nothing means, the places visited, and how many of the endings this browser has found. The
 * result itself is at the top of the screen (Verdict.tsx, playtest 8 must-fix 1).
 */
import { For, Show, type JSX } from "solid-js";
import { t } from "../lang";
import type { BoardModel, Ending } from "../../engine/api";
import { tx } from "../words";

export function Count(props: { model: BoardModel; ending: Ending; found: string[] }): JSX.Element {
  const placeName = (id: string) => tx(props.model.places.find((p) => p.id === id)?.name ?? id);
  return (
    <section class="be-count" aria-labelledby="be-count-title" data-testid="be-count">
      <details class="be-count-fold">
        <summary class="t-3" id="be-count-title" data-testid="be-count-open">{t("boardend.count.title")}</summary>
        <div class="be-count-body">
          <p class="small">{t("boardend.count.rule")}</p>
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
