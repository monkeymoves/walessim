/**
 * A warned event, opened from the time line or a warning stop (16.2.6): what is coming, the window
 * it will land in, where, and the projects that would cut it. A slate slip, pinned and askew, as
 * the forecast slip of phase 1 was; its content now lives on the time line.
 *
 * After cold playtest 9: it sits in the lane between the build menu and the council panel
 * (clock.css `.bw-lane`), so a warning read while building never covers the menu, and it says its
 * window is game time, which moves only while the clock runs.
 */
import { createMemo, For, Show, type JSX } from "solid-js";
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

/**
 * Warnings passed by unread (cold playtest 10, should fix 5: "Carry on past all 5 cards" skipped
 * a storm warning): each stays pinned at the head of the lane as a small slate tab until it is
 * opened or its event lands. Drawn only while the lane is free, so it is never under or over a card.
 */
export function UnreadSlips(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const items = createMemo(() => {
    const ws = game.forecast()?.warnings ?? [];
    return game.clock.unread().map((e) => ws.find((w) => w.event === e)).filter((w): w is NonNullable<typeof w> => !!w);
  });
  return (
    <Show when={items().length}>
      <nav class="bw-unread bw-lane-head" aria-label={t("boardclock.unread.aria")} data-testid="bw-unread">
        <p class="label bw-unread-title">{t("boardclock.unread.title")}</p>
        <ul class="bw-unread-list">
          <For each={items()}>
            {(w) => (
              <li>
                <button type="button" class="bw-unread-slip on-slate" onClick={() => { game.setSelected(w.councils[0] ?? null); game.setWarning(w.event); }} data-testid="bw-unread-slip">
                  <span class="bw-slip-pin" aria-hidden="true" />
                  {t("boardclock.unread.item", { name: tx(w.name), place: councilName(model, w.councils[0]), when: whenWords(model, w.fromStep) })}
                </button>
              </li>
            )}
          </For>
        </ul>
      </nav>
    </Show>
  );
}
