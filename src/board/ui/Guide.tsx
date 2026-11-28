/**
 * The first-minute guide (v2-board.md 11.1): one short paper note at a time, pinned beside the
 * thing it describes, moved on by doing the thing: click a council, open its build menu, build.
 * Which note shows, and when, is in ./clock/guide.ts: a note only talks about what is on screen
 * (playtest 8, should fix 4). Pause and speed are taught by the clock (./clock/Clock.tsx), so a
 * player who skips the guide still meets them. "Got it" and "Skip the guide" on every note.
 */
import { createEffect, createMemo, Show, type JSX } from "solid-js";
import { t } from "./lang";
import { TabButton } from "../../ui/parts";
import { GUIDE_DONE, GUIDE_NOTES, guideAfter, guideGotIt, guideNote, type GuideCtx } from "./clock/guide";
import { useGame } from "./game";

export function Guide(): JSX.Element {
  const game = useGame();
  const ctx = (): GuideCtx => {
    const shown = game.clock.shown();
    return {
      selected: game.selected() !== null,
      buildOpen: shown.includes("build"),
      // the clock's own lesson on pause and speed is a help note too: one at a time
      otherOpen: shown.some((o) => o !== "build") || game.clock.lessonShows(),
      built: !!game.state()?.log.some((e) => e.action.kind === "build"),
    };
  };
  // each note moves on when the player does what it asks
  createEffect(() => {
    const n = game.guide();
    const next = guideAfter(n, ctx());
    if (next !== n) game.guideTo(next);
  });
  const current = createMemo(() => (game.screen() === "board" && game.state()?.phase === "play" ? guideNote(game.guide(), ctx()) : null));
  return (
    <Show when={current()} keyed>
      {(c) => (
        <aside class={`bw-note sheet bw-note-${c.note}`} role="note" aria-label={t("boardui.guide.aria", { n: c.index + 1 })} data-testid="bw-guide">
          <p class="small bw-note-n">{t("boardui.guide.count", { n: c.index + 1, of: GUIDE_NOTES.length })}</p>
          <p class="story-small">{t(`boardclock.guide.${c.note}`)}</p>
          <div class="bw-note-row">
            <TabButton onClick={() => game.guideTo(guideGotIt(c.index))}>{t("boardui.guide.ok")}</TabButton>
            <button type="button" class="inklink bw-note-skip small" onClick={() => game.guideTo(GUIDE_DONE)}>{t("boardui.guide.skip")}</button>
          </div>
        </aside>
      )}
    </Show>
  );
}
