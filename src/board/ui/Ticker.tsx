/**
 * The quiet ticker by the time line (16.2.6): when a year closes, at most `year_lines_max` lines,
 * each with Why?, and the latest thing that happened. It changes only when a step runs, so it is
 * still while the clock is paused. Before the first season it says the clock waits for you.
 */
import { createMemo, For, Show, type JSX } from "solid-js";
import { t } from "./lang";
import { ThreadButton } from "../../ui/parts";
import { stepsOf } from "../engine/api";
import type { TickerLine } from "./clock/stops";
import { useGame } from "./game";
import { councilName, measureName, say, signed, whenWords } from "./words";

const NEWS_SHOWN = 1;

export function Ticker(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const c = game.clock;
  const lines = createMemo<TickerLine[]>(() => {
    const all = c.ticker();
    const lastYear = [...all].reverse().find((l) => l.kind === "year");
    const yearLines = lastYear ? all.filter((l) => l.kind === "year" && l.step === lastYear.step).slice(0, model.game.year_lines_max) : [];
    const news = all.filter((l) => l.kind === "news" && say(l.say)).slice(-NEWS_SHOWN);
    return [...news, ...yearLines];
  });
  const fresh = () => (game.state()?.step ?? 0) === 0 && !c.playing();
  const text = (l: TickerLine) => (l.kind === "news" ? say(l.say) : say(l.line.say) || t("boardui.report.line", { council: councilName(model, l.line.council), measure: measureName(model, l.line.quantity), d: signed(l.line.delta) }));
  const whyOf = (l: TickerLine) => {
    if (l.kind !== "year") return;
    const to = l.step;
    game.setWhyAt({ council: l.line.council ?? undefined, measure: l.line.quantity, fromStep: Math.max(0, to + 1 - stepsOf(model, 1)), toStep: to + 1 });
  };
  return (
    <div class="bw-ticker" role="log" aria-live="polite" aria-label={t("boardui.ticker.aria")} data-testid="bw-ticker">
      <Show when={!fresh()} fallback={<p class="bw-ticker-line bw-ticker-first">{t(c.prefs().stepByStep ? "boardui.ticker.firstStep" : "boardui.ticker.first")}</p>}>
        <Show when={lines().length} fallback={<p class="bw-ticker-line small">{game.selected() ? t("boardui.map.statusSelected", { name: councilName(model, game.selected()) }) : t("boardui.map.status")}</p>}>
          <ul>
            <For each={lines()}>
              {(l) => (
                <li class="bw-ticker-line" classList={{ news: l.kind === "news" }}>
                  <span class="bw-ticker-when small data">{l.kind === "year" ? t("boardui.ticker.year", { year: l.year, next: l.year + 1 }) : whenWords(model, l.step + 1, true)}</span>
                  <span class="bw-ticker-text">{text(l)}</span>
                  <Show when={l.kind === "year"}><ThreadButton class="bw-why" onClick={() => whyOf(l)}>{t("boardui.why.button")}</ThreadButton></Show>
                  <Show when={l.kind === "news" && l.council}>
                    <button type="button" class="inklink small" onClick={() => l.kind === "news" && game.setSelected(l.council)} data-testid="bw-ticker-look">{t("boardui.stop.lookAt", { council: councilName(model, l.kind === "news" ? l.council : null) })}</button>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}
