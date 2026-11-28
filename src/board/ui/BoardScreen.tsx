/**
 * The board, the main screen (v2-board.md 11.4 and 16.2): the top strip, the map large and
 * central, the council panel (or the region) on the right, the build menu from a council, the
 * ticker, and the time line with the clock along the foot. Over the map, one at a time: an event
 * to answer, a stop, the term report, a warning, Why?, a sheet, a place visit, the guide.
 *
 * After cold playtest 10: one card at a time in the lane, what the player had open there stepping
 * aside under it and coming back after (./clock/hold.ts); warnings passed by
 * unread stay pinned at the head of the lane while it is free; Escape closes one thing, the top
 * one (./clock/keys.ts `escapeTarget`); and a card that waits for an answer takes the focus
 * itself, never on one of its answers, so no key answers it by chance (must fix 10).
 *
 * v3 (v3-wales.md section 2): whenever the clock waits for the player, a red outline marks the
 * one thing to act on, and the top strip names it (./clock/NeedsYou.tsx).
 */
import { createMemo, lazy, Match, onCleanup, onMount, Show, Switch, type Component, type JSX } from "solid-js";
import { t } from "./lang";
import { PaperSheet, TabButton } from "../../ui/parts";
import { BuildMenu } from "./BuildMenu";
import type { Overlay } from "./clock/hold";
import { clockKey, clockKeyUp, escapeTarget } from "./clock/keys";
import { createNeeds, NeedsYou } from "./clock/NeedsYou";
import { Settings } from "./clock/Settings";
import { CouncilPanel } from "./CouncilPanel";
import { useGame } from "./game";
import { Guide } from "./Guide";
import { LawsSheet } from "./LawsSheet";
import { MapStage } from "./MapStage";
import { RegionPanel } from "./RegionPanel";
import { Respond } from "./Respond";
import { StopCard } from "./StopCard";
import { TermReport } from "./TermReport";
import { Ticker } from "./Ticker";
import { Timeline } from "./Timeline";
import { TopStrip } from "./TopStrip";
import { TreeSheet } from "./TreeSheet";
import { UnreadSlips, WarningSlip } from "./WarningSlip";
import { WhyPanel } from "./WhyPanel";

/** Place visits (the Rhondda reused, the light places), loaded when one opens. */
const PlaceVisit = lazy(() => import("./place/index"));

export function BoardScreen(props: { fixture: boolean }): JSX.Element {
  const game = useGame();
  const c = game.clock;
  // the one thing the game waits for, outlined, and named in the top strip (./clock/waiting.ts)
  const needs = createNeeds(game);
  // an answer is asked for only while the clock is held for it: once 2050 is reached nothing more can be answered
  const respond = createMemo(() => (game.state()?.phase === "respond" ? game.state()!.pending.find((p) => p.kind === "respond") ?? null : null));
  const head = () => c.queue()[0] ?? null;
  const pastTerm = () => { const n = game.termOpen(); return n ? c.terms()[n] ?? null : null; };
  const busy = () => !!respond() || !!head();
  // what is drawn over the map comes from the same list as the clock's hold (clock/hold.ts)
  const shows = (o: Overlay) => c.shown().includes(o);

  /** The lane is free: no card, and nothing the player opened sits in it. Pinned warnings show only then. */
  const laneFree = () => !c.shown().some((o) => o === "answer" || o === "stop" || o === "term" || o === "warning" || o === "tree" || o === "laws" || o === "visit");

  /** Escape: close the top thing only, wherever the focus is (it may have gone back to the page). */
  const escape = () => {
    const shown = c.shown();
    const target = escapeTarget({
      visit: shown.includes("visit"), why: shown.includes("why"), warning: shown.includes("warning"), term: shown.includes("term"),
      sheet: shown.includes("tree") || shown.includes("laws") || shown.includes("settings"), build: shown.includes("build"), council: game.selected() !== null,
      card: shown.includes("answer") || shown.includes("stop"),
    });
    switch (target) {
      case "why": game.setWhyAt(null); break;
      case "warning": game.setWarning(null); break;
      case "term": game.setTermOpen(null); break;
      case "sheet": game.setSheet(null); break;
      case "build": game.setSheet(null); break;
      case "council": game.setSelected(null); break;
    }
  };


  onMount(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { escape(); return; }
      clockKey(game, e);
    };
    window.addEventListener("keydown", key);
    // Space works the clock on whatever has focus; on release the focused button must not be pressed too
    window.addEventListener("keyup", clockKeyUp);
    onCleanup(() => { window.removeEventListener("keydown", key); window.removeEventListener("keyup", clockKeyUp); });
  });

  return (
    <div class="bw-board" classList={{ "bw-dimmed": busy() }}>
      <TopStrip needs={needs} />
      <div class="bw-stage">
        <MapStage />
        <div class="bw-right">
          <Show when={game.selected()} keyed fallback={<RegionPanel />}>
            {(code) => <CouncilPanel code={code} />}
          </Show>
        </div>
        <Show when={shows("build") && game.selected()} keyed>
          {(code) => <BuildMenu code={code} />}
        </Show>
        <Ticker />
        <Show when={props.fixture}>
          <p class="bw-standin small" role="note">{t("boardui.fixture.short")}</p>
        </Show>
        <Show when={shows("warning")}><WarningSlip /></Show>
        <Show when={laneFree()}><UnreadSlips /></Show>
        <Show when={shows("tree")}><TreeSheet /></Show>
        <Show when={shows("laws")}><LawsSheet /></Show>
        <Show when={shows("settings")}><Settings /></Show>
        <Show when={shows("term") && pastTerm()} keyed>{(r) => <TermReport report={r} asStop={false} />}</Show>
        {/* one card in the lane, and only while nothing the player opened sits there (./clock/hold.ts) */}
        <Switch>
          <Match when={shows("answer") && respond()} keyed>
            {(p) => (p.kind === "respond" ? <Respond event={p.event} councils={p.councils} /> : null)}
          </Match>
          <Match when={shows("stop") && head()?.term && head()} keyed>
            {(q) => <TermReport report={q.term!} asStop ended={q.stop.kind === "ended"} />}
          </Match>
          <Match when={shows("stop") && head()} keyed>
            {(q) => <StopCard item={q} />}
          </Match>
        </Switch>
        <Show when={shows("why")}><WhyPanel /></Show>
        <Show when={shows("visit")}>
          <PlaceVisit />
        </Show>
        <Show when={game.error() && game.sheet() !== "build"}>
          <p class="bw-error warnstrip small" role="alert"><span>{game.error()}</span> <button type="button" class="inklink" onClick={() => game.setError(null)}>{t("boardui.close")}</button></p>
        </Show>
        <Guide />
      </div>
      <Timeline />
      <NeedsYou needs={needs} />
    </div>
  );
}
