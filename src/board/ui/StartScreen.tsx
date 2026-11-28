/**
 * The start (v2-board.md section 11.4): the South East map, one line of pitch, what you were
 * elected on as three paper cards, and Start. A saved game still running offers Carry on first;
 * one that has ended is a quiet link to its end. Each button's game number is the number it plays
 * (./startOffer.ts, playtest 8 must fix 15).
 */
import { createSignal, For, Show, type JSX } from "solid-js";
import { lang, Pair, t } from "./lang";
import { MapView } from "../../ui/atlas/MapView";
import "../../ui/atlas/atlas.css";
import { Icon, LangToggle, StampButton, TabButton } from "../../ui/parts";
import { geo } from "../../ui/shell/model";
import { navigate } from "../../ui/shell/router";
import type { PaperMap } from "../../map";
import { useGame } from "./game";
import { iconFor } from "./icons";
import { startOffer } from "./startOffer";
import { linksFor } from "./mapLinks";
import { projectName, tx, whenWords } from "./words";

/** A fresh game number: chance belongs to the UI, the engine only ever sees the number. */
const freshNumber = () => 1000 + Math.floor(Math.random() * 9000);

export function StartScreen(props: { fixture: boolean }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const [pick, setPick] = createSignal(model.starts[0]?.id ?? "");
  const [number] = createSignal(freshNumber());
  const saved = game.savedRun;

  const ready = (m: PaperMap) => {
    m.setPadding({ left: Math.min(640, window.innerWidth * 0.46), right: 32, top: 32, bottom: 32 });
    m.setLayers({ peaks: false, sites: false });
    m.setHighlight(model.game.councils);
    m.focusLas(model.game.councils);
    m.setLinks(linksFor(model, null));
  };

  const chosen = () => model.starts.find((s) => s.id === pick());
  const offer = () => startOffer(saved() ? { gameNumber: saved()!.gameNumber, phase: saved()!.phase, step: saved()!.step } : null, number());

  return (
    <div class="bw-start">
      <MapView geo={geo()!} ariaLabel={t("boardui.start.mapAria", { region: tx(model.game.region) })} onReady={ready} class="bw-start-map" />
      <main class="bw-start-sheet sheet" aria-labelledby="bw-start-title">
        <div class="bw-start-top">
          <a class="inklink small" href="#/">{t("boardui.start.home")}</a>
          <LangToggle />
        </div>
        <h1 class="t-1 bw-start-title" id="bw-start-title"><Pair single={lang() === "cy"} text={model.game.region} /></h1>
        <p class="bw-start-pitch story">{t("boardui.start.pitch")}</p>
        <p class="small bw-start-pitch2">{t("boardui.start.pitch2")}</p>
        <p class="small bw-start-result"><b>{t("boardui.start.result")}</b></p>
        <Show when={props.fixture}>
          <p class="bw-fixture small" role="note">{t("boardui.fixture.note")}</p>
        </Show>
        <Show when={offer().resume}>
          {(r) => (
            <div class="bw-start-resume">
              <StampButton onClick={() => game.resume()} data-testid="bw-resume">{t("boardui.start.resume")}</StampButton>
              <span class="small">{t("boardui.start.resumeNote", { n: r().gameNumber, when: whenWords(model, saved()!.step) })}</span>
            </div>
          )}
        </Show>
        <h2 class="t-3 bw-start-ask">{t("boardui.start.ask")}</h2>
        <div class="bw-starts" role="radiogroup" aria-label={t("boardui.start.ask")}>
          <For each={model.starts}>
            {(s) => (
              <button
                type="button"
                role="radio"
                aria-checked={pick() === s.id}
                class="bw-startcard"
                classList={{ chosen: pick() === s.id }}
                onClick={() => setPick(s.id)}
                data-testid={`bw-start-${s.id}`}
              >
                <span class="bw-startcard-icon"><Icon name={iconFor(model, s.free_project)} size={30} /></span>
                <Pair single={lang() === "cy"} text={s.name} class="t-3 bw-startcard-name" />
                <span class="story-small bw-startcard-pitch">{tx(s.pitch)}</span>
                <span class="small bw-startcard-free">{t("boardui.start.free", { project: projectName(model, s.free_project) })}</span>
              </button>
            )}
          </For>
        </div>
        <Show when={chosen()}>
          <p class="small bw-start-promise">{t("boardui.start.promise", { text: tx(chosen()!.promise.text) })}</p>
        </Show>
        <div class="bw-start-go">
          <Show
            when={!offer().fresh.main}
            fallback={<StampButton onClick={() => game.start(number(), pick())} data-testid="bw-go">{t("boardui.start.go")}</StampButton>}
          >
            <TabButton onClick={() => game.start(number(), pick())} data-testid="bw-go">{t("boardui.start.again")}</TabButton>
          </Show>
          <span class="small">{t("boardui.start.length", { years: model.game.end_year - model.game.first_year, n: offer().fresh.gameNumber })}</span>
        </div>
        <Show when={offer().seeEnd}>
          {(e) => (
            <p class="small">
              <button type="button" class="inklink bw-start-seeend" onClick={() => game.resume()} data-testid="bw-resume">{t("boardclock.start.seeEnd", { n: e().gameNumber })}</button>
            </p>
          )}
        </Show>
        <p class="small bw-start-honest">{t("boardui.start.honest")}</p>
        <p class="small"><a class="inklink" href="#/yfory" onClick={(e) => { e.preventDefault(); navigate("#/yfory"); }}>{t("boardui.start.v1")}</a></p>
      </main>
    </div>
  );
}
