/**
 * The forecast slip (v2-board.md section 3, step 1): the warned event with its place, always one
 * turn ahead, and what would cut it. Slate paper, pinned, torn along the foot, set a little askew:
 * the one angled thing on the board (design-system 4.4).
 */
import { For, Show, type JSX } from "solid-js";
import { Pair, t } from "../../i18n";
import { useGame } from "./game";
import { councilName, fill, projectName, say, tx } from "./words";

export function ForecastSlip(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const fc = () => game.forecast();
  const start = () => model.starts.find((s) => s.id === game.state()?.start);
  return (
    <aside class="bw-slip on-slate" aria-label={t("boardui.forecast.aria")} data-testid="bw-forecast">
      <span class="bw-slip-pin" aria-hidden="true" />
      <p class="label bw-slip-from">{t("boardui.forecast.from", { year: (game.state()?.year ?? 0) + model.game.turn_years })}</p>
      <Show when={fc()?.warnings.length} fallback={<p class="t-3 bw-slip-title">{t("boardui.forecast.none")}</p>}>
        <For each={fc()!.warnings}>
          {(w) => (
            <div class="bw-slip-warning">
              <Pair text={w.name} class="t-2 bw-slip-title" />
              <p class="bw-slip-say">{say(w.say) || fill(model, tx(model.events.find((e) => e.id === w.event)?.warning), w.councils)}</p>
              <p class="small bw-slip-where">
                {t("boardui.forecast.where", { list: w.councils.map((c) => councilName(model, c)).join(t("boardui.list.and")) })}
              </p>
              <Show when={!w.good && w.preparedBy.length}>
                <p class="small bw-slip-ready">{t("boardui.forecast.ready", { list: w.preparedBy.map((p) => projectName(model, p)).join(t("boardui.list.or")) })}</p>
              </Show>
            </div>
          )}
        </For>
      </Show>
      <Show when={fc()?.future}>
        <p class="small bw-slip-future">{say(fc()!.future)}</p>
      </Show>
      <Show when={start()}>
        <p class="small bw-slip-promise">{t("boardui.forecast.promise", { text: tx(start()!.promise.text) })}</p>
      </Show>
    </aside>
  );
}
