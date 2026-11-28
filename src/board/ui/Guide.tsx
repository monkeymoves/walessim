/**
 * The first-minute guide (v2-board.md 11.1 and 16.2.2): one short paper note at a time, pinned
 * beside the thing it describes, each moved on by doing the thing: click a council, open Build
 * here, place a project, press play, then the speeds and the stops. It teaches pause and speed
 * by having you use them. "Got it" and "Skip the guide" on every note.
 */
import { createEffect, Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import { TabButton } from "../../ui/parts";
import { useGame } from "./game";

const NOTES = ["map", "council", "build", "play", "speed"] as const;
const LAST = NOTES.length - 1;

export function Guide(): JSX.Element {
  const game = useGame();
  const n = () => game.guide();
  const note = () => NOTES[n()];
  const step = () => game.state()?.step ?? 0;
  const stepMode = () => game.clock.prefs().stepByStep;
  // each note moves on when the player does what it asks
  createEffect(() => { if (n() === 0 && game.selected()) game.guideNext(false, LAST); });
  createEffect(() => { if (n() === 1 && game.sheet() === "build") game.guideNext(false, LAST); });
  createEffect(() => { if (n() === 2 && (game.state()?.projects.length ?? 0) > 0) game.guideNext(false, LAST); });
  createEffect(() => { if (n() === 3 && step() > 0) game.guideNext(false, LAST); });
  // a player who presses play first goes straight to the note on speed
  createEffect(() => { if (n() >= 0 && n() < 3 && step() > 0) game.setGuide(4); });
  const text = () => (note() === "play" || note() === "speed") && stepMode() ? t(`boardui.guide.${note()}Step`) : t(`boardui.guide.${note()}`);
  return (
    <Show when={n() >= 0 && n() <= LAST && game.screen() === "board" && game.sheet() !== "settings" && !game.clock.queue().length && game.state()?.phase === "play"}>
      <aside class={`bw-note sheet bw-note-${note()}`} role="note" aria-label={t("boardui.guide.aria", { n: n() + 1 })} data-testid="bw-guide">
        <p class="small bw-note-n">{t("boardui.guide.count", { n: n() + 1, of: NOTES.length })}</p>
        <p class="story-small">{text()}</p>
        <div class="bw-note-row">
          <TabButton onClick={() => game.guideNext(false, LAST)}>{t("boardui.guide.ok")}</TabButton>
          <button type="button" class="inklink bw-note-skip small" onClick={() => game.guideNext(true)}>{t("boardui.guide.skip")}</button>
        </div>
      </aside>
    </Show>
  );
}
