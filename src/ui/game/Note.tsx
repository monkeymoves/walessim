// A guide note inside play: a small slate slip pointing at one thing, one sentence, with
// "Got it" and "Skip the guide". It shows only when its trigger holds and it has not been seen.
//
// The note is drawn in a layer at the top of the page (a portal), positioned from the element it
// sits in, so no scrolling or clipped container (the tray, the slips) can hide it or eat its clicks.
//
// One note at a time (plain-wales 4): notes that want to show queue up, and only the first in the
// queue is drawn; the next one appears when it is dismissed. A note never covers the controls the
// player needs next (the play and end-turn buttons, the region buttons, the scores, Trust, the
// opened card): it tries its own side first, then the others, and takes the clearest.
import { createEffect, createSignal, onCleanup, Show, type Accessor, type JSX, type Setter } from "solid-js";
import { Portal } from "solid-js/web";
import { t } from "../../i18n";
import { StampButton, TabButton } from "../parts/Buttons";
import { useGame, type NoteId, type Ui } from "./context";

const W = 260;

type Side = "above" | "below" | "left" | "right";

/** The waiting line of notes, one per board. */
const queues = new WeakMap<object, [Accessor<NoteId[]>, Setter<NoteId[]>]>();
function queueFor(ui: Ui): [Accessor<NoteId[]>, Setter<NoteId[]>] {
  let q = queues.get(ui);
  if (!q) { q = createSignal<NoteId[]>([]); queues.set(ui, q); }
  return q;
}

/** What a note must never sit on. */
const KEEP_CLEAR = [
  '[data-testid="end-turn"]', '[data-testid="play-card"]', ".yf-tray .yf-region", ".yf-tray .btn-tab",
  '[data-testid="scoreboard"]', '[data-testid="trust"]', ".yf-rail .btn-stamp", '[data-testid="card-open"]',
  ".yf-shock .btn-stamp", ".yf-shock .btn-tab", ".yf-endsheet",
];

type Box = { left: number; top: number; right: number; bottom: number };
const overlap = (a: Box, b: Box): number =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

/** Where a note of height h goes on one side of r, kept on screen. */
function at(side: Side, r: DOMRect, h: number): Box {
  let left: number, top: number;
  // the arrow on a side note sits 25px down, so it points at the middle of a short target
  const mid = r.top + Math.min(r.height / 2, 32) - 25;
  if (side === "left") { left = r.left - W - 16; top = mid; }
  else if (side === "right") { left = r.right + 16; top = mid; }
  else if (side === "above") { left = r.left + 12; top = r.top - h - 10; }
  else { left = r.left + 12; top = r.bottom + 8; }
  left = Math.max(8, Math.min(left, innerWidth - W - 8));
  top = Math.max(8, Math.min(top, innerHeight - h - 8));
  return { left, top, right: left + W, bottom: top + h };
}

export function Note(props: { id: NoteId; when: boolean; class?: string; children: JSX.Element; placement?: Side }): JSX.Element {
  const { ui } = useGame();
  const [queue, setQueue] = queueFor(ui);
  // once a note has shown it stays until it is dismissed or its lesson is learnt, so moving the
  // pointer from the thing it points at to the note itself does not swap it away
  const [latched, setLatched] = createSignal(false);
  createEffect(() => { if (props.when && ui.guide.noteFor(props.id, true)) setLatched(true); });
  const wants = () => ui.guide.noteFor(props.id, latched());
  createEffect(() => {
    const id = props.id;
    if (wants()) setQueue((q) => (q.includes(id) ? q : [...q, id]));
    else setQueue((q) => q.filter((x) => x !== id));
  });
  onCleanup(() => setQueue((q) => q.filter((x) => x !== props.id)));
  const shown = () => wants() && queue()[0] === props.id;

  let anchor!: HTMLSpanElement;
  let note: HTMLElement | undefined;
  const [pos, setPos] = createSignal<{ left: number; top: number } | null>(null);
  const [side, setSide] = createSignal<Side>(props.placement ?? "below");
  const place = () => {
    const host = anchor?.parentElement;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const h = note?.offsetHeight ?? 90;
    const clear: Box[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(KEEP_CLEAR.join(","))) {
      if (el === host || host.contains(el) || el.contains(host)) continue;
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) clear.push(b);
    }
    // never on the thing it points at either
    const self: Box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    const want = props.placement ?? "below";
    const order: Side[] = [want, ...(["left", "below", "above", "right"] as Side[]).filter((s) => s !== want)];
    let best: { side: Side; box: Box; cost: number } | null = null;
    for (const s of order) {
      const box = at(s, r, h);
      const cost = clear.reduce((a, b) => a + overlap(box, b), 0) + overlap(box, self) * 0.5;
      if (!best || cost < best.cost - 1) best = { side: s, box, cost };
      if (cost === 0) break;
    }
    setSide(best!.side);
    setPos({ left: best!.box.left, top: best!.box.top });
  };
  createEffect(() => {
    if (!shown()) return;
    const host = anchor?.parentElement;
    host?.classList.add("yf-guided");
    let raf = requestAnimationFrame(function tick() { place(); raf = requestAnimationFrame(tick); });
    onCleanup(() => { cancelAnimationFrame(raf); host?.classList.remove("yf-guided"); });
  });

  return (
    <>
      <span ref={anchor} class="yf-note-anchor" aria-hidden="true" />
      <Show when={shown()}>
        <Portal>
          <aside
            ref={(el) => { note = el; queueMicrotask(place); }}
            class={`yf-note on-slate yf-note-${side()}${props.class ? " " + props.class : ""}`}
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

/**
 * "Show me how to play": on the first screen of a game the guide will not run in (after Play
 * again, or once it was skipped), start a new game with the guide switched back on.
 */
export function ReplayGuide(props: { primary?: boolean }): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const guided = () => s().options.firstGame && !ui.guide.skipped() && !ui.guide.hasSeen("how");
  const replay = () => {
    ui.guide.reset();
    game.start({ firstGame: true });
    game.act({ type: "open" });
  };
  return (
    <Show when={!guided()}>
      <div class="yf-replay">
        <Show when={props.primary} fallback={<TabButton data-testid="replay-guide" onClick={replay}>{t("play2.replay.how")}</TabButton>}>
          <StampButton data-testid="replay-guide" onClick={replay}>{t("play2.replay.how")}</StampButton>
        </Show>
        <p class="small">{t("play2.replay.note")}</p>
      </div>
    </Show>
  );
}
