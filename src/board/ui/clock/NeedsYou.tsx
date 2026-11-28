/**
 * The needs-you outline (docs/design/v3-wales.md section 2). Luke: "when things need to be
 * closed, maybe draw flashing red bounding around items to alert user - i spent a while waiting
 * and didnt realise what i had to click". Whenever the clock is held for the player, one thing on
 * screen carries a 3 pixel red ring with a white keyline inside it and a tab, "Waiting for you":
 * the thing to act on, as ./waiting.ts picks it. The ring pulses for its first 5 seconds (./pulse.ts)
 * unless the player asked for less motion or switched "Flashing outline" off. A chip in the top
 * strip says the same words, and clicking it moves the focus to the target (./needsDom.ts). Each
 * new target is said once, politely, to a screen reader.
 *
 * The ring is drawn in a layer of its own over the board, following its target's box each frame,
 * so no card's overflow can clip it and no screen needs its own outline code.
 */
import { createEffect, createMemo, createSignal, on, onCleanup, Show, untrack, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { t } from "../lang";
import { councilName } from "../words";
import type { Game } from "../game";
import { findTarget, focusTarget } from "./needsDom";
import { ringMoves, ringStrength } from "./pulse";
import { IDLE_MS, targetName, waitingOn, type NeedsTarget, type WaitingSession } from "./waiting";
import "./needs.css";

/** True once the player has touched nothing (no press, key or wheel) for `ms`. */
function createIdle(ms: number): () => boolean {
  const [idle, setIdle] = createSignal(false);
  if (typeof window === "undefined") return idle;
  let timer = 0;
  const poke = () => {
    setIdle(false);
    clearTimeout(timer);
    timer = window.setTimeout(() => setIdle(true), ms);
  };
  poke();
  const events = ["pointerdown", "keydown", "wheel"] as const;
  for (const e of events) window.addEventListener(e, poke, { capture: true, passive: true });
  onCleanup(() => { clearTimeout(timer); for (const e of events) window.removeEventListener(e, poke, { capture: true }); });
  return idle;
}

/** What the board waits for, its words and how to go to it: one for the ring and the chip. */
export function createNeeds(game: Game) {
  const c = game.clock;
  const idle = createIdle(IDLE_MS);
  const [ran, setRan] = createSignal(false);
  createEffect(() => { if (c.playing()) setRan(true); });
  const session = (): WaitingSession => {
    const s = game.state();
    const head = c.queue()[0];
    return {
      ...c.screenful(),
      dealWaiting: !!head?.term && head.stop.kind !== "ended" && !!s?.pending.some((p) => p.kind === "deal"),
      visitOffer: head?.stop.kind === "visit" && !!head.stop.ref,
      stepByStep: c.prefs().stepByStep,
      playing: c.playing(),
      justOpened: !ran(),
      idle: idle(),
    };
  };
  const target = createMemo<NeedsTarget | null>(() => (game.screen() === "board" ? waitingOn(session()) : null), null, {
    equals: (a, b) => (a && targetName(a)) === (b && targetName(b)),
  });
  /** A new card is a new target, even of the same kind: the ring pulses again and is said again. */
  const name = createMemo(() => {
    const tg = target();
    if (!tg) return null;
    const s = game.state();
    const respond = s?.pending.find((p) => p.kind === "respond");
    const card = tg.kind === "carryOn" || (tg.kind === "answers" && tg.of !== "event") ? (c.queue()[0]?.id ?? "")
      : tg.kind === "answers" && respond?.kind === "respond" ? `${respond.event}@${s!.step}` : "";
    return `${targetName(tg)}:${card}`;
  });
  const fresh = () => !c.started() && (game.state()?.step ?? 0) === 0;
  /** What to do, in a few words ("choose one"): the chip's second line. */
  const action = (): string => {
    const tg = target();
    if (!tg) return "";
    switch (tg.kind) {
      case "answers": return t("boardclock.needs.do.answers");
      case "visit": return t("boardclock.needs.do.visit");
      case "carryOn": return c.queue()[0]?.stop.kind === "ended"
        ? t("boardclock.needs.do.toEnd", { year: game.model.game.end_year })
        : t("boardclock.needs.do.press", { button: t("boardui.stop.carryOn") });
      case "close": return t("boardclock.needs.do.close", { what: t(`boardclock.needs.what.${tg.what}`) });
      case "play": return t("boardclock.needs.do.press", { button: fresh() ? t("boardclock.start") : t("boardui.clock.play") });
      case "next": return t("boardclock.needs.do.press", { button: t("boardui.clock.nextSeason") });
    }
  };
  /** The whole line: "Waiting for you: choose one". */
  const line = (): string => (target() ? t("boardclock.needs.line", { lead: t("boardclock.needs.tab"), action: action() }) : "");
  /** What a screen reader is told: the same words, naming the council an event asks about, and asking for the card to be read first. */
  const said = (): string => {
    const tg = target(), s = game.state();
    const p = s?.pending.find((x) => x.kind === "respond");
    const say = (action: string) => t("boardclock.needs.line", { lead: t("boardclock.needs.tab"), action });
    if (tg?.kind === "answers" && tg.of === "event" && p?.kind === "respond" && p.councils[0]) {
      return say(t("boardclock.needs.do.answersAt", { council: councilName(game.model, p.councils[0]) }));
    }
    if (tg?.kind === "carryOn" && c.queue()[0]?.stop.kind !== "ended") return say(t("boardclock.needs.do.carryOn", { button: t("boardui.stop.carryOn") }));
    return line();
  };
  return {
    target, name, action, line, said,
    flashing: () => c.prefs().flashingOutline,
    focus: () => { const tg = target(); if (tg) focusTarget(tg); },
  };
}

export type Needs = ReturnType<typeof createNeeds>;

interface Box { x: number; y: number; w: number; h: number }
/** Space between the target and the ring's inner edge, in pixels. */
const GAP = 3;
/** A target this wide is a bar with its words at the left: the tab goes inside, at the right. */
const WIDE = 360;
const reducedMotion = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The ring and its tab over the target, and the polite announcement. */
export function NeedsYou(props: { needs: Needs }): JSX.Element {
  const [box, setBox] = createSignal<Box | null>(null, { equals: (a, b) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h) });
  const [strength, setStrength] = createSignal(1);
  const [announce, setAnnounce] = createSignal("");
  createEffect(on(props.needs.name, (name) => {
    const tg = untrack(props.needs.target);
    setBox(null);
    setStrength(1);
    setAnnounce("");
    if (!name || !tg) return;
    // said once, after a beat, so a reader hears it as new even when the words match the last ones
    const say = window.setTimeout(() => setAnnounce(untrack(props.needs.said)), 120);
    let born: number | null = null;
    let raf = 0;
    const frame = (now: number) => {
      const el = findTarget(tg);
      const r = el?.getBoundingClientRect();
      setBox(r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null);
      if (r && born === null) born = now;
      setStrength(born === null ? 1 : ringStrength(now - born, ringMoves(reducedMotion(), untrack(props.needs.flashing))));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    onCleanup(() => { cancelAnimationFrame(raf); clearTimeout(say); });
  }));
  /**
   * Where the tab sits, never over the card's words. Above the ring, in the room each card leaves
   * above its target (needs.css, .bw-stop-row), or below it at the top of the window, and inside
   * the window. On a wide bar (the term report's Carry on), whose words sit at its left, it sits
   * inside the ring at the right.
   */
  const tabInside = () => { const b = box(); return !!b && b.w >= WIDE && b.h < 70; };
  const tabBelow = () => !tabInside() && (box()?.y ?? 0) < 28;
  const tabEnd = () => { const b = box(); return !!b && (tabInside() || b.x + 200 > window.innerWidth); };
  return (
    <>
      <Portal>
        <Show when={box()}>
          {(b) => (
            <div
              class="bw-needs"
              classList={{ inside: tabInside(), below: tabBelow(), end: tabEnd() }}
              style={{ left: `${b().x - GAP}px`, top: `${b().y - GAP}px`, width: `${b().w + 2 * GAP}px`, height: `${b().h + 2 * GAP}px` }}
              aria-hidden="true"
              data-testid="bw-needs"
              data-needs-on={props.needs.target()?.kind}
            >
              <span class="bw-needs-ring" style={{ opacity: strength() }} data-testid="bw-needs-ring" />
              <span class="bw-needs-tab">{t("boardclock.needs.tab")}</span>
            </div>
          )}
        </Show>
      </Portal>
      <p class="sr-only" role="status" aria-live="polite" data-testid="bw-needs-said">{announce()}</p>
    </>
  );
}

/** The chip in the top strip: the same words, and a click takes the focus to the target. */
export function NeedsChip(props: { needs: Needs }): JSX.Element {
  return (
    <Show when={props.needs.target()}>
      <button type="button" class="bw-needs-chip" title={t("boardclock.needs.chipTip")} onClick={() => props.needs.focus()} data-testid="bw-needs-chip">
        <span class="bw-needs-dot" aria-hidden="true" />
        <span class="bw-needs-chip-words">
          <b>{t("boardclock.needs.tab")}<span class="sr-only">: </span></b>
          <span>{props.needs.action()}</span>
        </span>
      </button>
    </Show>
  );
}
