// A guide note inside play: a small slate slip pointing at one thing, one sentence, with
// "Got it" and "Skip the guide". It shows only when its trigger holds and it has not been seen.
import { createEffect, createSignal, Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import { useGame, type NoteId } from "./context";

export function Note(props: { id: NoteId; when: boolean; class?: string; children: JSX.Element; placement?: "above" | "below" | "left" }): JSX.Element {
  const { ui } = useGame();
  // once a note has shown it stays until it is dismissed or its lesson is learnt, so moving the
  // pointer from the thing it points at to the note itself does not swap it away
  const [latched, setLatched] = createSignal(false);
  createEffect(() => { if (props.when && ui.guide.noteFor(props.id, true)) setLatched(true); });
  return (
    <Show when={ui.guide.noteFor(props.id, latched())}>
      <aside
        class={`yf-note on-slate yf-note-${props.placement ?? "below"}${props.class ? " " + props.class : ""}`}
        role="note"
        aria-live="polite"
        data-note={props.id}
      >
        <p class="yf-note-text">{props.children}</p>
        <p class="yf-note-actions">
          <button type="button" class="yf-note-btn" onClick={() => ui.guide.done(props.id)}>{t("game.onboard.next")}</button>
          <button type="button" class="yf-note-skip" onClick={() => ui.guide.skip()}>{t("game.onboard.skip")}</button>
        </p>
      </aside>
    </Show>
  );
}
