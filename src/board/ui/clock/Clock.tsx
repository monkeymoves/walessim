/**
 * The clock's controls at the left end of the time line (16.2.2): play and pause, three speeds,
 * and the settings. In step by step mode (also what reduced motion starts with) there is no
 * running clock: "Next season" and "Run to the next moment". When the clock is held, it says why.
 */
import { For, Match, Show, Switch, type JSX } from "solid-js";
import { t } from "../../../i18n";
import { useGame } from "../game";

const KEY_OF: Record<string, string> = { steady: "1", brisk: "2", fast: "3" };

export function Clock(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const c = game.clock;
  const held = () => (c.playing() ? c.heldBy() : null);
  const ended = () => game.state()?.phase === "ended";
  return (
    <div class="bw-clock" data-testid="bw-clock">
      <Switch>
        <Match when={c.prefs().stepByStep}>
          <button type="button" class="bw-clock-step" onClick={() => c.step()} disabled={c.phaseHolds() || !!c.queue().length} data-testid="bw-next-season">
            {t("boardui.clock.nextSeason")}
          </button>
          <button type="button" class="bw-clock-run" onClick={() => c.runToNext()} disabled={c.phaseHolds() || !!c.queue().length} data-testid="bw-run-next">
            {t("boardui.clock.runToNext")}
          </button>
        </Match>
        <Match when={true}>
          <button
            type="button"
            class="bw-clock-play"
            classList={{ on: c.playing() }}
            aria-pressed={c.playing()}
            title={t("boardui.clock.spaceTip")}
            onClick={() => c.toggle()}
            disabled={ended()}
            data-testid="bw-play"
          >
            <Show when={c.playing()} fallback={<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 1 11 6 2 11Z" fill="currentColor" /></svg>}>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg>
            </Show>
            <span>{c.playing() ? t("boardui.clock.pause") : t("boardui.clock.play")}</span>
          </button>
          <div class="bw-clock-speeds" role="radiogroup" aria-label={t("boardui.clock.speedAria")}>
            <For each={model.game.speeds}>
              {(sp) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={c.prefs().speed === sp.id}
                  class="bw-clock-speed"
                  title={t("boardui.clock.speedTip", { key: KEY_OF[sp.id] ?? "", name: t(`boardui.clock.speed.${sp.id}`) })}
                  onClick={() => c.setSpeed(sp.id)}
                  data-testid={`bw-speed-${sp.id}`}
                >
                  {t(`boardui.clock.speed.${sp.id}`)}
                </button>
              )}
            </For>
          </div>
        </Match>
      </Switch>
      <button type="button" class="bw-clock-set" aria-label={t("boardui.settings.open")} title={t("boardui.settings.open")} onClick={() => game.setSheet(game.sheet() === "settings" ? null : "settings")} aria-expanded={game.sheet() === "settings"} data-testid="bw-settings-open">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.6" /><path d="M5 2.5v3M10 6.5v3M7 10.5v3" stroke="currentColor" stroke-width="2.4" /></svg>
      </button>
      <p class="bw-clock-held small" role="status" aria-live="polite">
        <Show when={held()}>{t(`boardui.clock.held.${held()}`)}</Show>
      </p>
    </div>
  );
}
