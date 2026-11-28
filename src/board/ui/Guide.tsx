/**
 * The four-note first-turn guide (v2-board.md section 11.1). One short paper note at a time,
 * pinned beside the thing it describes, each moved on by doing the thing: click a council, open
 * Build here, place a project, end the turn. "Got it" and "Skip the guide" on every note.
 */
import { createEffect, Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import { TabButton } from "../../ui/parts";
import { useGame } from "./game";

const NOTES = ["boardui.guide.map", "boardui.guide.council", "boardui.guide.build", "boardui.guide.end"];
const PLACES = ["bw-note-map", "bw-note-council", "bw-note-build", "bw-note-end"];

export function Guide(): JSX.Element {
  const game = useGame();
  const n = () => game.guide();
  // each note moves on when the player does what it asks
  createEffect(() => { if (n() === 0 && game.selected()) game.guideNext(); });
  createEffect(() => { if (n() === 1 && game.sheet() === "build") game.guideNext(); });
  createEffect(() => { if (n() === 2 && (game.state()?.projects.length ?? 0) > 0) game.guideNext(); });
  createEffect(() => { if (n() === 3 && (game.state()?.turn ?? 0) > 0) game.guideNext(true); });
  return (
    <Show when={n() >= 0 && n() < NOTES.length && game.screen() === "board" && game.state()?.turn === 0}>
      <aside class={`bw-note sheet ${PLACES[n()]}`} role="note" aria-label={t("boardui.guide.aria", { n: n() + 1 })} data-testid="bw-guide">
        <p class="small bw-note-n">{t("boardui.guide.count", { n: n() + 1, of: NOTES.length })}</p>
        <p class="story-small">{t(NOTES[n()]!)}</p>
        <div class="bw-note-row">
          <TabButton onClick={() => game.guideNext()}>{t("boardui.guide.ok")}</TabButton>
          <button type="button" class="inklink bw-note-skip small" onClick={() => game.guideNext(true)}>{t("boardui.guide.skip")}</button>
        </div>
      </aside>
    </Show>
  );
}
