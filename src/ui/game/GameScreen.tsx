// Yfory: the game screen. One board whose states are the seven steps of a term, per Papur v2:
// strands and Trust across the top, the map in its well, the hand and the step on the rail,
// the timeline (and post rail) beneath.
import { createEffect, createSignal, ErrorBoundary, on, For, Match, onCleanup, onMount, Show, Switch, type JSX } from "solid-js";
import { formatNum, lang, Pair, t } from "../../i18n";
import { geo, model, modelError, modelStatus, startLoading } from "../shell/model";
import { CloseButton, SourceTag, StampButton } from "../parts";
import { paramOverrides } from "../book/overrides";
import type { CompiledModel } from "../../model/schema";
import { createGame } from "./controller";
import { createUi, GameContext, useGame } from "./context";
import { MapStage } from "./MapStage";
import { TopBar, TrendSlip } from "./Pieces";
import { Timeline } from "./Timeline";
import { LedgerDrawer } from "./Ledger";
import { TracePanel } from "./Trace";
import {
  ArrivalStrip, CaretakerPanel, ChangedPanel, StageVoice, ElectionPanel, OpeningPanel, PassingPanel, PlanPanel, PledgePanel, ShockSlip, VisitOfferPanel,
} from "./Steps";
import { PlaceVisit } from "../place/PlaceVisit";
import { EndScreen } from "../end/EndScreen";
import { TicketNotes } from "./Hand";
import "./game.css";
import "../place/place.css";
import "../end/end.css";

export function GameScreen(): JSX.Element {
  onMount(() => void startLoading());
  return (
    <Switch fallback={<div class="yf-loading"><p class="story">{t("game.map.loading")}</p></div>}>
      <Match when={modelStatus() === "error"}>
        <div class="yf-loading">
          <p class="story">{t("game.error.model")}</p>
          <p class="small">{modelError()}</p>
        </div>
      </Match>
      <Match when={model() && geo()}>
        <ErrorBoundary fallback={(err, reset) => (
          <div class="yf-loading">
            <p class="story">{t("game.error.engine")}</p>
            <p class="small">{String(err?.message ?? err)}</p>
            <StampButton onClick={reset}>{t("game.error.retry")}</StampButton>
          </div>
        )}>
          <Board model={model()!} />
        </ErrorBoundary>
      </Match>
    </Switch>
  );
}

function Board(props: { model: CompiledModel }): JSX.Element {
  const game = createGame(props.model, { overrides: paramOverrides });
  const ui = createUi();
  game.boot();
  // expose a small handle for the end-to-end tests and the screenshot script
  if (typeof window !== "undefined") (window as unknown as { __yfory: unknown }).__yfory = { game, ui };

  return (
    <GameContext.Provider value={{ game, ui }}>
      <Show when={game.state()} fallback={<div class="yf-loading"><p class="story">{t(game.error() ?? "game.map.loading")}</p></div>}>
        <BoardBody />
      </Show>
    </GameContext.Provider>
  );
}

function BoardBody(): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const step = () => s().step;
  const ended = () => step() === "ended";
  const [confirmNew, setConfirmNew] = createSignal(false);
  // a status line never outlives its step (screen readers would hear it for the rest of the game)
  createEffect(on(step, () => ui.setAnnounce(""), { defer: true }));

  // Escape closes the outermost floating piece
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (game.trace()) { game.setTrace(null); ui.map()?.setThread(null); }
    else if (game.ledgerOpen()) game.setLedgerOpen(false);
    else if (ui.laPanel()) { ui.setLaPanel(null); ui.map()?.setSelected(null); }
  };
  onMount(() => window.addEventListener("keydown", onKey));
  onCleanup(() => window.removeEventListener("keydown", onKey));

  return (
    <div class="yf" data-era="yfory" data-step={step()} lang={lang()}>
      <TopBar />
      <main class="yf-main" classList={{ ended: ended() }}>
        <MapStage>
          <Show when={!ended() && !ui.inPlace()}>
            <TrendSlip />
          </Show>
          <Show when={ui.laPanel() && !ui.inPlace() && !game.trace() && (step() === "opening" || step() === "plan" || step() === "pledge")}>
            <LaPanel code={ui.laPanel()!} />
          </Show>
          <ArrivalStrip />
          <TicketNotes />
          <StageVoice />
          <Show when={game.trace()}>
            <TracePanel />
          </Show>
          <Show when={step() === "passing" && s().shock}>
            <ShockSlip />
          </Show>
          <Show when={ended()}>
            <EndScreen />
          </Show>
        </MapStage>
        <Show when={!ended()}>
          <aside class="yf-rail" aria-label={t(`game.step.${step()}`)}>
            <Show when={!ui.inPlace()} fallback={<PlaceVisit />}>
              <Switch>
                <Match when={step() === "opening"}><OpeningPanel /></Match>
                <Match when={step() === "pledge"}><PledgePanel /></Match>
                <Match when={step() === "plan"}><PlanPanel /></Match>
                <Match when={step() === "visit"}><VisitOfferPanel /></Match>
                <Match when={step() === "passing"}><PassingPanel /></Match>
                <Match when={step() === "changed"}><ChangedPanel /></Match>
                <Match when={step() === "election"}><ElectionPanel /></Match>
                <Match when={step() === "caretaker"}><CaretakerPanel /></Match>
              </Switch>
            </Show>
            <Show when={game.ledgerOpen()}>
              <LedgerDrawer />
            </Show>
          </aside>
        </Show>
      </main>
      <Timeline passing={step() === "passing"} />
      <footer class="yf-foot small">
        <span class="yf-foot-status" role="status">
          {t(`game.step.${step()}`)}
          <Show when={game.error()}> {t(game.error()!)}</Show>
          <Show when={game.shared()}> {t("game.save.shared")}</Show>
        </span>
        <span class="yf-foot-links">
          <a class="inklink" href="#/heddiw">{t("game.bar.atlas")}</a>
          <Show when={confirmNew()} fallback={<button type="button" class="yf-linkbtn" onClick={() => setConfirmNew(true)}>{t("game.bar.new_game")}</button>}>
            <button type="button" class="yf-linkbtn strong" onClick={() => { setConfirmNew(false); game.start(); }}>{t("game.bar.new_confirm")}</button>
            <button type="button" class="yf-linkbtn" onClick={() => setConfirmNew(false)}>{t("game.bar.new_cancel")}</button>
          </Show>
          <span>{t("game.foot.honesty")}</span>
          <span>{t("game.foot.attrib")}</span>
          <a class="inklink" href="#/llyfr/attributions">{t("game.foot.sources")}</a>
        </span>
      </footer>
      <p class="sr-only" aria-live="polite">{ui.announce()}</p>
    </div>
  );
}

// ------------------------------------------------------------------ touch the real thing

/** Three real figures for an authority, each with its source: "This is real, and it is mine to look after." */
function LaPanel(props: { code: string }): JSX.Element {
  const { game, ui } = useGame();
  const la = () => game.names.la(props.code);
  const fig = (ind: string) => game.model.la_data[ind]?.values[props.code] ?? null;
  const srcOf = (ind: string) => {
    const i = game.model.indicators.find((x) => x.id === ind);
    const s = i?.sources?.[0] ?? (Array.isArray(i?.source) ? i?.source[0] : i?.source);
    return s ?? null;
  };
  const yearOf = (ind: string) => game.model.la_data[ind]?.year ?? "";
  const items = () => [
    { ind: "pop", v: fig("pop"), fmt: (v: number) => (v >= 100000 ? `${formatNum(Math.round(v / 1000))}k` : formatNum(Math.round(v))), label: t("game.place_panel.people") },
    { ind: "welsh_speakers", v: fig("welsh_speakers"), fmt: (v: number) => `${formatNum(v, { maximumFractionDigits: 1 })}%`, label: t("game.place_panel.welsh") },
    { ind: "employment", v: fig("employment"), fmt: (v: number) => `${formatNum(v, { maximumFractionDigits: 1 })}%`, label: t("game.place_panel.employment") },
  ].filter((x) => x.v != null);
  return (
    <aside class="yf-lapanel sheet" aria-labelledby="yf-la-title">
      <div class="yf-lapanel-head">
        <Pair text={la()?.name} as="h2" id="yf-la-title" class="t-1" />
        <CloseButton label={t("game.place_panel.close")} onClick={() => { ui.setLaPanel(null); ui.map()?.setSelected(null); }} />
      </div>
      <div class="yf-figs">
        <For each={items()}>
          {(x) => (
            <div class="yf-fig">
              <b class="figure-big">{x.fmt(x.v!)}</b>
              <span class="label">{x.label}</span>
              <SourceTag source={srcOf(x.ind)} year={yearOf(x.ind)} />
            </div>
          )}
        </For>
      </div>
    </aside>
  );
}
