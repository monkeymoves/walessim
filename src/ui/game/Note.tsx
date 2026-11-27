// A guide note inside play: a small slate slip pointing at one thing, one sentence, with
// "Got it" and "Skip the guide". It shows only when its trigger holds and it has not been seen.
//
// The note is drawn in a layer at the top of the page (a portal), positioned from the element it
// sits in, so no scrolling or clipped container (the tray, the slips) can hide it or eat its clicks.
import { createEffect, createSignal, onCleanup, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { t } from "../../i18n";
import { useGame, type NoteId } from "./context";

const W = 260;

export function Note(props: { id: NoteId; when: boolean; class?: string; children: JSX.Element; placement?: "above" | "below" | "left" }): JSX.Element {
  const { ui } = useGame();
  // once a note has shown it stays until it is dismissed or its lesson is learnt, so moving the
  // pointer from the thing it points at to the note itself does not swap it away
  const [latched, setLatched] = createSignal(false);
  createEffect(() => { if (props.when && ui.guide.noteFor(props.id, true)) setLatched(true); });
  const shown = () => ui.guide.noteFor(props.id, latched());

  let anchor!: HTMLSpanElement;
  let note: HTMLElement | undefined;
  const [pos, setPos] = createSignal<{ left: number; top: number } | null>(null);
  const place = () => {
    const host = anchor?.parentElement;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const h = note?.offsetHeight ?? 90;
    const placement = props.placement ?? "below";
    let left = r.left + 12, top = r.bottom + 8;
    if (placement === "left") { left = r.left - W - 16; top = r.top + 8; }
    else if (placement === "above") { top = r.top - h - 10; }
    // keep it on screen
    left = Math.max(8, Math.min(left, innerWidth - W - 8));
    top = Math.max(8, Math.min(top, innerHeight - h - 8));
    setPos({ left, top });
  };
  createEffect(() => {
    if (!shown()) return;
    let raf = requestAnimationFrame(function tick() { place(); raf = requestAnimationFrame(tick); });
    onCleanup(() => cancelAnimationFrame(raf));
  });

  return (
    <>
      <span ref={anchor} class="yf-note-anchor" aria-hidden="true" />
      <Show when={shown()}>
        <Portal>
          <aside
            ref={(el) => { note = el; queueMicrotask(place); }}
            class={`yf-note on-slate yf-note-${props.placement ?? "below"}${props.class ? " " + props.class : ""}`}
            role="note"
            aria-live="polite"
            data-note={props.id}
            style={{ position: "fixed", left: `${pos()?.left ?? -9999}px`, top: `${pos()?.top ?? -9999}px`, width: `${W}px`, right: "auto", bottom: "auto" }}
          >
            <p class="yf-note-text">{props.children}</p>
            <p class="yf-note-actions">
              <button type="button" class="yf-note-btn" onClick={() => ui.guide.done(props.id)}>{t("game.onboard.next")}</button>
              <button type="button" class="yf-note-skip" onClick={() => ui.guide.skip()}>{t("game.onboard.skip")}</button>
            </p>
          </aside>
        </Portal>
      </Show>
    </>
  );
}
