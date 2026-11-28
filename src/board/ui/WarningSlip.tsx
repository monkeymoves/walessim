/**
 * A warned event, opened from the time line or a warning stop (16.2.6): what is coming, the window
 * it will land in, where, and the projects that would cut it. A slate slip, pinned and askew, as
 * the forecast slip of phase 1 was; its content now lives on the time line.
 *
 * After cold playtest 9: it sits in the lane between the build menu and the council panel
 * (clock.css `.bw-lane`), so a warning read while building never covers the menu, and it says its
 * window is game time, which moves only while the clock runs.
 */
import { createMemo, Show, type JSX } from "solid-js";
import { lang, Pair, t } from "./lang";
import { CloseButton } from "../../ui/parts";
import { useGame } from "./game";
import { councilName, fill, listOf, orOf, projectName, say, tx, whenWords } from "./words";

export function WarningSlip(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const w = createMemo(() => game.forecast()?.warnings.find((x) => x.event === game.warning()) ?? null);
  return (
    <Show when={w()}>
      {(x) => (
        <aside class="bw-slip bw-lane bw-warn on-slate" role="dialog" aria-labelledby="bw-warn-title" data-testid="bw-warning">
          <span class="bw-slip-pin" aria-hidden="true" />
          <CloseButton class="bw-slip-close" label={t("boardui.close")} onClick={() => game.setWarning(null)} />
          <p class="label bw-slip-from">{t("boardui.forecast.window", { from: whenWords(model, x().fromStep), to: whenWords(model, x().toStep) })}</p>
          <p class="small bw-slip-game" data-testid="bw-warning-time">{t("boardclock.warn.gameTime")}</p>
          <Pair single={lang() === "cy"} text={x().name} class="t-2 bw-slip-title" id="bw-warn-title" />
          <p class="bw-slip-say">{say(x().say) || fill(model, tx(model.events.find((e) => e.id === x().event)?.warning), x().councils)}</p>
          <p class="small bw-slip-where">{t("boardui.forecast.where", { list: listOf(x().councils.map((c) => councilName(model, c))) })}</p>
          <Show when={!x().good && x().preparedBy.length}>
            <p class="small bw-slip-ready">{t("boardui.forecast.ready", { list: orOf(x().preparedBy.map((p) => projectName(model, p))) })}</p>
          </Show>
          <Show when={x().cutBy.length}>
            <p class="small bw-slip-ready">{t("boardui.forecast.cut")}</p>
          </Show>
          <Show when={game.forecast()?.future}>
            <p class="small bw-slip-future">{say(game.forecast()!.future)}</p>
          </Show>
        </aside>
      )}
    </Show>
  );
}
