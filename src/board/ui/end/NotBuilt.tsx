/**
 * The Wales you did not build (16.5.3 item 6): the nearest ending you did not build, its name as a
 * heading and one line on what its route takes (playtest 9: "you might have had: Two countries"
 * read broken with the name inside the sentence), and its board drawn as a ghost beside your own
 * 2050. The play again hook.
 */
import { createMemo, Show, type JSX } from "solid-js";
import { t } from "../lang";
import type { BoardModel, Ending, Frame } from "../../engine/api";
import { outOf10, say, tx } from "../words";
import { MiniMap } from "./MiniMap";
import { scaleOf, valuesOf } from "./view";

export function NotBuilt(props: { model: BoardModel; ending: Ending; last: Frame }): JSX.Element {
  const nb = () => props.ending.notBuilt;
  const line = () => say(nb().say) || t("boardend.notBuilt.fallback", { ending: tx(nb().name) });
  const ghost = () => nb().frame;
  const scale = createMemo(() => scaleOf(props.model, ghost() ? [props.last, ghost()!] : [props.last], "all"));
  return (
    <section class="be-notbuilt" aria-labelledby="be-notbuilt-title" data-testid="be-notbuilt">
      <h2 class="t-2" id="be-notbuilt-title">{t("boardend.notBuilt.title")}</h2>
      <p class="label">{t("boardend.notBuilt.nearest")}</p>
      <p class="t-3 be-notbuilt-name" data-testid="be-notbuilt-name">{tx(nb().name)}</p>
      <p class="story">{line()}</p>
      <Show when={ghost()}>
        <div class="be-pair">
          <figure class="be-pair-map">
            <MiniMap model={props.model} frame={props.last} values={valuesOf(props.model, props.last, "all")} scale={scale()} showProjects
              label={t("boardend.notBuilt.yoursAria")} valueText={(_c, v) => outOf10(v)} />
            <figcaption class="small">{t("boardend.notBuilt.yours")}</figcaption>
          </figure>
          <figure class="be-pair-map">
            <MiniMap model={props.model} frame={ghost()!} values={valuesOf(props.model, ghost()!, "all")} scale={scale()} ghost showProjects
              label={t("boardend.notBuilt.ghostAria", { ending: tx(nb().name) })} valueText={(_c, v) => outOf10(v)} />
            <figcaption class="small">{t("boardend.notBuilt.ghost", { ending: tx(nb().name) })}</figcaption>
          </figure>
        </div>
        <p class="small be-honest">{t("boardend.notBuilt.note")}</p>
      </Show>
    </section>
  );
}
