// The app shell: loads the model and the map, routes by hash, shows the top bar, the phone
// notice and the modified rule set badge. Yfory is UI lead B's game (src/ui/game/index.tsx,
// default export, no props), loaded lazily so the atlas and book do not wait for it.
import { createEffect, ErrorBoundary, lazy, Match, Show, Suspense, Switch, type Component, type JSX } from "solid-js";
import { t } from "../../i18n";
import { Atlas } from "../atlas/Atlas";
import { Book } from "../book/Book";
import { pruneOverrides } from "../book/overrides";
import { PaperSheet, StampButton, TabButton } from "../parts";
import { geo, model, modelError, modelStatus, startLoading } from "./model";
import { route, navigate } from "./router";
import { TitleScreen } from "./TitleScreen";
import { TopBar } from "./TopBar";
import { useNarrow } from "./viewport";
import "./shell.css";

const gameModules = import.meta.glob<{ default: Component }>("../game/index.tsx");
const gameLoader = gameModules["../game/index.tsx"];
const Game = gameLoader ? lazy(gameLoader) : null;

export function App(): JSX.Element {
  startLoading();
  const narrow = useNarrow();
  createEffect(() => {
    const m = model();
    if (m) pruneOverrides(m);
  });
  createEffect(() => {
    const r = route();
    const key = r.name === "title" ? "shell.doc.title" : `shell.doc.${r.name}`;
    document.title = t(key);
  });
  return (
    <Switch>
      <Match when={route().name === "title"}>
        <TitleScreen geo={geo()} />
      </Match>
      <Match when={route().name === "yfory" && !narrow()}>
        <Ready>
          <Show when={Game} fallback={<Framed><NotReady /></Framed>}>
            <ErrorBoundary fallback={(e) => <Framed><Failed message={String(e?.message ?? e)} /></Framed>}>
              <Suspense fallback={<Framed><Loading /></Framed>}>
                {(() => { const G = Game!; return <G />; })()}
              </Suspense>
            </ErrorBoundary>
          </Show>
        </Ready>
      </Match>
      <Match when={route().name === "yfory" && narrow()}>
        <Framed><PhoneNotice game /></Framed>
      </Match>
      <Match when={route().name === "heddiw"}>
        <Framed atlas slot={<HeddiwSlot />}>
          <Show when={narrow()}><PhoneNotice /></Show>
          <Ready>
            <Atlas model={model()!} geo={geo()!} selected={route().parts[0] ?? null} />
          </Ready>
        </Framed>
      </Match>
      <Match when={route().name === "llyfr"}>
        <Framed book>
          <Ready>
            <Book model={model()!} parts={route().parts} />
          </Ready>
        </Framed>
      </Match>
    </Switch>
  );
}

/** The year slot in Heddiw: the era name is the one loud thing. */
function HeddiwSlot(): JSX.Element {
  return (
    <>
      <span class="t-year topbar-year" lang="cy">Heddiw</span>
      <span class="topbar-yearnote">
        <b>{t("shell.heddiw.line1")}</b>
        <span>{t("shell.heddiw.line2")}</span>
      </span>
    </>
  );
}

function Framed(props: { children: JSX.Element; slot?: JSX.Element; atlas?: boolean; book?: boolean }): JSX.Element {
  return (
    <div class="frame" classList={{ "frame-atlas": !!props.atlas, "frame-book": !!props.book }}>
      <TopBar slot={props.slot} />
      <div class="frame-main" id="main">{props.children}</div>
    </div>
  );
}

function Ready(props: { children: JSX.Element }): JSX.Element {
  return (
    <Switch fallback={<Loading />}>
      <Match when={modelStatus() === "error"}>
        <Failed message={modelError() ?? ""} />
      </Match>
      <Match when={modelStatus() === "ready" && model() && geo()}>{props.children}</Match>
    </Switch>
  );
}

function Loading(): JSX.Element {
  return <p class="loading small" role="status">{t("shell.loading")}</p>;
}

function Failed(props: { message: string }): JSX.Element {
  return (
    <PaperSheet class="notice-sheet" role="alert">
      <h2 class="t-2">{t("shell.error.title")}</h2>
      <p class="story-small">{t("shell.error.body")}</p>
      <p class="small">{props.message}</p>
      <StampButton onClick={() => location.reload()}>{t("shell.error.retry")}</StampButton>
    </PaperSheet>
  );
}

function NotReady(): JSX.Element {
  return (
    <PaperSheet class="notice-sheet">
      <h2 class="t-2">{t("shell.yfory.notReadyTitle")}</h2>
      <p class="story-small">{t("shell.yfory.notReadyBody")}</p>
      <TabButton onClick={() => navigate("#/heddiw")}>{t("shell.title.explore")}</TabButton>
    </PaperSheet>
  );
}

/** Under 900 px wide: a polite notice; the atlas still works below it. */
function PhoneNotice(props: { game?: boolean }): JSX.Element {
  return (
    <PaperSheet class="phone-notice" role="note" data-testid="phone-notice">
      <p class="t-3">{t("shell.phone.title")}</p>
      <p class="story-small">{t(props.game ? "shell.phone.game" : "shell.phone.atlas")}</p>
      <Show when={props.game}>
        <TabButton onClick={() => navigate("#/heddiw")}>{t("shell.title.explore")}</TabButton>
      </Show>
    </PaperSheet>
  );
}
