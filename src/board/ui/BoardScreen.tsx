/**
 * The board, the main screen (v2-board.md 11.4 and 16.2): the top strip, the map large and
 * central, the council panel (or the region) on the right, the build menu from a council, the
 * ticker, and the time line with the clock along the foot. Over the map, one at a time: an event
 * to answer, a stop, the term report, a warning, Why?, a sheet, a place visit, the guide.
 */
import { createMemo, lazy, Match, onCleanup, onMount, Show, Switch, type Component, type JSX } from "solid-js";
import { t } from "../../i18n";
import { PaperSheet, TabButton } from "../../ui/parts";
import { BuildMenu } from "./BuildMenu";
import { clockKey } from "./clock/keys";
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
import { WarningSlip } from "./WarningSlip";
import { WhyPanel } from "./WhyPanel";

/** Place visits (the Rhondda reused, the light places), loaded when one opens. */
const PlaceVisit = lazy(() => import("./place/index"));

export function BoardScreen(props: { fixture: boolean }): JSX.Element {
  const game = useGame();
  const c = game.clock;
  // an answer is asked for only while the clock is held for it: once 2050 is reached nothing more can be answered
  const respond = createMemo(() => (game.state()?.phase === "respond" ? game.state()!.pending.find((p) => p.kind === "respond") ?? null : null));
  const head = () => c.queue()[0] ?? null;
  const pastTerm = () => { const n = game.termOpen(); return n ? c.terms()[n] ?? null : null; };
  const busy = () => !!respond() || !!head();

  onMount(() => {
    // Escape closes what is open over the map wherever the focus is (it may have gone back to the page)
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { game.closeAll(); game.setVisit(null); return; }
      clockKey(game, e);
    };
    window.addEventListener("keydown", key);
    onCleanup(() => window.removeEventListener("keydown", key));
  });

  return (
    <div class="bw-board" classList={{ "bw-dimmed": busy() }}>
      <TopStrip />
      <div class="bw-stage">
        <MapStage />
        <div class="bw-right">
          <Show when={game.selected()} keyed fallback={<RegionPanel />}>
            {(code) => <CouncilPanel code={code} />}
          </Show>
        </div>
        <Show when={game.sheet() === "build" && game.selected()} keyed>
          {(code) => <BuildMenu code={code} />}
        </Show>
        <Ticker />
        <Show when={props.fixture}>
          <p class="bw-standin small" role="note">{t("boardui.fixture.short")}</p>
        </Show>
        <Show when={game.warning() && !busy()}><WarningSlip /></Show>
        <Show when={game.sheet() === "tree"}><TreeSheet /></Show>
        <Show when={game.sheet() === "laws"}><LawsSheet /></Show>
        <Show when={game.sheet() === "settings"}><Settings /></Show>
        <Show when={pastTerm()} keyed>{(r) => <TermReport report={r} asStop={false} />}</Show>
        <Switch>
          <Match when={respond()} keyed>
            {(p) => (p.kind === "respond" ? <Respond event={p.event} councils={p.councils} /> : null)}
          </Match>
          <Match when={head()?.term && head()} keyed>
            {(q) => <TermReport report={q.term!} asStop ended={q.stop.kind === "ended"} />}
          </Match>
          <Match when={head()} keyed>
            {(q) => <StopCard item={q} />}
          </Match>
        </Switch>
        <Show when={game.whyAt()}><WhyPanel /></Show>
        <Show when={game.visit()}>
          <PlaceVisit />
        </Show>
        <Show when={game.error() && game.sheet() !== "build"}>
          <p class="bw-error warnstrip small" role="alert"><span>{game.error()}</span> <button type="button" class="inklink" onClick={() => game.setError(null)}>{t("boardui.close")}</button></p>
        </Show>
        <Guide />
      </div>
      <Timeline />
    </div>
  );
}
