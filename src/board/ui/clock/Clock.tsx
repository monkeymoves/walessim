/**
 * The clock's controls at the left end of the time line (16.2.2): play and pause, three speeds,
 * and the settings. In step by step mode (also what reduced motion starts with) there is no
 * running clock: "Next season" and "Run to the next moment".
 *
 * After playtest 8: the game opens with time stopped and one big "Start time" button. The first
 * time time runs, a note pinned to the clock teaches pause and speed, and stays until the player
 * pauses, changes the speed or says Got it. When something holds the clock the button says so,
 * and the line under it says what holds it and how to let it go. The line always says what time
 * is doing: stopped, paused, held or running.
 *
 * After cold playtest 9 (should fix 9): held and paused read apart. Held is "Waiting" (time would
 * run, and waits for what is open: a card, a sheet); paused is "Paused by you" (only Play starts
 * it). With a card on screen the line says what time will do after it (should fix 4).
 *
 * After cold playtest 10: the lesson sits above the clock, clear of Pause and the speeds
 * (tests/e2e/board-fix3.spec.ts), and while it shows no guide note does.
 */
import { For, Match, Show, Switch, type JSX } from "solid-js";
import { formatNum, t } from "../lang";
import { TabButton } from "../../../ui/parts";
import { useGame } from "../game";
import { msPerStep } from "./prefs";

const KEY_OF: Record<string, string> = { steady: "1", brisk: "2", fast: "3" };

/** What the play button shows: start, play, pause, held, or over. */
export type ClockFace = "start" | "play" | "pause" | "held" | "over";

export function Clock(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const c = game.clock;
  const ended = () => game.state()?.phase === "ended";
  const fresh = () => !c.started() && (game.state()?.step ?? 0) === 0;
  const held = () => (c.playing() ? c.heldBy() : null);
  const face = (): ClockFace => {
    if (ended()) return "over";
    if (c.playing()) return held() ? "held" : "pause";
    return fresh() ? "start" : "play";
  };
  const secondsAYear = () => formatNum((msPerStep(model, c.speed()) * Math.round(1 / model.game.years_per_step)) / 1000, { maximumFractionDigits: 0 });
  /** A card waits on screen: a stop, or an event to answer. */
  const card = () => c.queue().length > 0 || game.state()?.phase === "respond";
  const status = (): string => {
    if (ended()) return t("boardclock.why.ended");
    if (c.prefs().stepByStep) return fresh() ? t("boardclock.status.stepFresh") : "";
    switch (face()) {
      case "held": return t(`boardclock.why.${held()}`);
      case "pause": return t("boardclock.status.running", { n: secondsAYear() });
      case "start": return t("boardclock.status.notStarted");
      default: return card() ? t("boardclock.status.pausedCard") : t("boardclock.status.paused");
    }
  };
  // the lesson on pause and speed: the first time time runs, until the player has used them
  const lesson = () => c.lessonShows();
  return (
    <div class="bw-clock" classList={{ fresh: face() === "start", held: face() === "held" }} data-testid="bw-clock">
      <Switch>
        <Match when={c.prefs().stepByStep}>
          <button type="button" class="bw-clock-step" onClick={() => c.step()} disabled={c.phaseHolds() || !!c.queue().length} data-testid="bw-next-season" data-needs="next">
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
            classList={{ on: c.playing(), held: face() === "held", first: face() === "start" }}
            aria-pressed={c.playing()}
            aria-describedby="bw-clock-status"
            title={face() === "held" ? t("boardclock.heldTip") : t("boardui.clock.spaceTip")}
            onClick={() => c.toggle()}
            disabled={ended()}
            data-testid="bw-play"
            data-needs="play"
            data-face={face()}
          >
            <Switch fallback={<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 1 11 6 2 11Z" fill="currentColor" /></svg>}>
              <Match when={face() === "pause"}>
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg>
              </Match>
              <Match when={face() === "held"}>
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.6 1.6h2.4v8.8H2.6zM7 1.6h2.4v8.8H7z" fill="none" stroke="currentColor" stroke-width="1.3" /></svg>
              </Match>
            </Switch>
            <span>{face() === "start" ? t("boardclock.start") : face() === "held" ? t("boardclock.held") : c.playing() ? t("boardui.clock.pause") : t("boardui.clock.play")}</span>
          </button>
          <div class="bw-clock-speeds" role="radiogroup" aria-label={t("boardui.clock.speedAria")}>
            <For each={model.game.speeds}>
              {(sp) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={c.speed() === sp.id}
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
      <p class="bw-clock-held small" id="bw-clock-status" role="status" aria-live="polite" data-testid="bw-clock-status">{status()}</p>
      <Show when={lesson()}>
        <aside class="bw-clock-lesson sheet" role="note" aria-label={t("boardclock.lesson.aria")} data-testid="bw-clock-lesson">
          <p class="t-3 bw-clock-lesson-title">{t("boardclock.lesson.title")}</p>
          <ul class="bw-clock-lesson-list">
            <li><b>{t("boardclock.lesson.pauseLead")}</b> {t("boardclock.lesson.pause")}</li>
            <li><b>{t("boardclock.lesson.speedLead")}</b> {t("boardclock.lesson.speed")}</li>
            <li class="small">{t("boardclock.lesson.stops")}</li>
          </ul>
          <TabButton onClick={() => c.markTaught()}>{t("boardclock.lesson.ok")}</TabButton>
        </aside>
      </Show>
    </div>
  );
}
