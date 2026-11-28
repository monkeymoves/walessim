/**
 * The board, the main screen (v2-board.md section 11.4): the top strip, the map large and central,
 * the forecast slip on the left, the council panel (or the region) on the right, the build menu
 * from a council, the timeline along the foot, and the turn's moments over the map: two years
 * passing, the report, the election, Why?, a place visit, the guide.
 */
import { lazy, Match, Show, Switch, type Component, type JSX } from "solid-js";
import { t } from "../../i18n";
import { PaperSheet, TabButton } from "../../ui/parts";
import { BuildMenu } from "./BuildMenu";
import { CouncilPanel } from "./CouncilPanel";
import { Dock } from "./Dock";
import { Election } from "./Election";
import { standIns } from "./engine";
import { ForecastSlip } from "./ForecastSlip";
import { useGame } from "./game";
import { Guide } from "./Guide";
import { LawsSheet } from "./LawsSheet";
import { MapStage } from "./MapStage";
import { Passing } from "./Passing";
import { RegionPanel } from "./RegionPanel";
import { Report } from "./Report";
import { Timeline } from "./Timeline";
import { TopStrip } from "./TopStrip";
import { TreeSheet } from "./TreeSheet";
import { WhyPanel } from "./WhyPanel";

const placeModules = import.meta.glob<{ default: Component }>("./place/index.tsx");
const placeLoader = placeModules["./place/index.tsx"];
/** Package 6's place visits (the Rhondda reused, the light places), when they exist. */
const PlaceVisit = placeLoader ? lazy(placeLoader) : null;

export function BoardScreen(props: { fixture: boolean }): JSX.Element {
  const game = useGame();
  const playing = () => game.screen() === "board";
  return (
    <div class="bw-board" classList={{ "bw-dimmed": !playing() }} onKeyDown={(e) => { if (e.key === "Escape") { game.setWhyAt(null); game.setSheet(null); game.setHover(null); } }}>
      <TopStrip />
      <div class="bw-stage">
        <MapStage />
        <Show when={playing() && game.sheet() !== "build"}>
          <ForecastSlip />
        </Show>
        <Show when={playing()}>
          <div class="bw-right">
            <Show when={game.selected()} keyed fallback={<RegionPanel />}>
              {(code) => <CouncilPanel code={code} />}
            </Show>
            <Dock />
          </div>
          <Show when={game.sheet() === "build" && game.selected()} keyed>
            {(code) => <BuildMenu code={code} />}
          </Show>
        </Show>
        <Show when={props.fixture || standIns().length}>
          <p class="bw-standin small" role="note">
            {props.fixture ? t("boardui.fixture.short") : ""} {standIns().length ? t("boardui.standin.note") : ""}
          </p>
        </Show>
        <Switch>
          <Match when={game.screen() === "passing"}><Passing /></Match>
          <Match when={game.screen() === "report"}><Report /></Match>
          <Match when={game.screen() === "election"}><Election /></Match>
        </Switch>
        <Show when={game.sheet() === "tree"}><TreeSheet /></Show>
        <Show when={game.sheet() === "laws"}><LawsSheet /></Show>
        <Show when={game.whyAt()}><WhyPanel /></Show>
        <Show when={game.visit()}>
          <Show when={PlaceVisit} fallback={<NoVisit />}>
            {(() => { const P = PlaceVisit!; return <P />; })()}
          </Show>
        </Show>
        <Guide />
      </div>
      <Timeline />
    </div>
  );
}

function NoVisit(): JSX.Element {
  const game = useGame();
  return (
    <PaperSheet class="bw-novisit" height="held" role="dialog">
      <p class="t-3">{t("boardui.visit.notYet")}</p>
      <TabButton onClick={() => game.setVisit(null)}>{t("boardui.visit.leave")}</TabButton>
    </PaperSheet>
  );
}
