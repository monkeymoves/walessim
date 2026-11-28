/**
 * The route #/bwrdd: the board (docs/design/v2-board.md). Loads public/board-model.json, or the
 * three council fixture while the real model is not built (said on screen), then shows the start,
 * the board, or the end. The paper map's geography comes from the shell, loaded once for v1.
 */
import { createEffect, createResource, ErrorBoundary, lazy, Match, Show, Switch, type Component, type JSX } from "solid-js";
import { t } from "../../i18n";
import { PaperSheet, StampButton, TabButton } from "../../ui/parts";
import { geo } from "../../ui/shell/model";
import { navigate } from "../../ui/shell/router";
import { useNarrow } from "../../ui/shell/viewport";
import { boardFixture, type BoardModel } from "../engine/api";
import { loadBoardModel } from "../model";
import { BoardScreen } from "./BoardScreen";
import { FallbackEnd } from "./FallbackEnd";
import { createGame, GameContext } from "./game";
import { StartScreen } from "./StartScreen";
import { nameIdsFrom } from "./words";
import "./board.css";

const endModules = import.meta.glob<{ default: Component }>("./end/index.tsx");
const endLoader = endModules["./end/index.tsx"];
/** Package 6's end screen (time-lapse, then and now, the letter), when it exists. */
const PackageEnd = endLoader ? lazy(endLoader) : null;

async function loadModel(): Promise<{ model: BoardModel; fixture: boolean }> {
  try {
    const model = await loadBoardModel();
    return { model, fixture: !!model.meta.fixture };
  } catch (e) {
    console.info("board: using the three council fixture until public/board-model.json is built", e);
    return { model: boardFixture(), fixture: true };
  }
}

export default function BoardRoute(): JSX.Element {
  const narrow = useNarrow();
  const [loaded] = createResource(loadModel);
  createEffect(() => { document.title = t("boardui.doc.title"); });
  return (
    <div class="bw" data-testid="board">
      <Switch fallback={<p class="loading small" role="status">{t("boardui.loading")}</p>}>
        <Match when={narrow()}>
          <PaperSheet class="bw-notice" role="note">
            <p class="t-3">{t("boardui.narrow.title")}</p>
            <p class="story-small">{t("boardui.narrow.body")}</p>
            <TabButton onClick={() => navigate("#/")}>{t("boardui.narrow.back")}</TabButton>
          </PaperSheet>
        </Match>
        <Match when={loaded.error}>
          <PaperSheet class="bw-notice" role="alert">
            <p class="t-3">{t("boardui.error.title")}</p>
            <StampButton onClick={() => location.reload()}>{t("boardui.error.retry")}</StampButton>
          </PaperSheet>
        </Match>
        <Match when={loaded() && geo()}>
          <Game model={loaded()!.model} fixture={loaded()!.fixture} />
        </Match>
      </Switch>
    </div>
  );
}

function Game(props: { model: BoardModel; fixture: boolean }): JSX.Element {
  const game = createGame(props.model);
  nameIdsFrom(props.model);
  return (
    <GameContext.Provider value={game}>
      <ErrorBoundary fallback={(e, reset) => <Broken message={String(e?.message ?? e)} reset={() => { game.newGame(); reset(); }} />}>
        <Switch>
          <Match when={game.screen() === "start"}>
            <StartScreen fixture={props.fixture} />
          </Match>
          <Match when={game.screen() === "end"}>
            <Show when={PackageEnd} fallback={<FallbackEnd />}>
              {(() => { const E = PackageEnd!; return <E />; })()}
            </Show>
          </Match>
          <Match when={game.state()}>
            <BoardScreen fixture={props.fixture} />
          </Match>
        </Switch>
      </ErrorBoundary>
    </GameContext.Provider>
  );
}

function Broken(props: { message: string; reset: () => void }): JSX.Element {
  return (
    <PaperSheet class="bw-notice" role="alert">
      <p class="t-3">{t("boardui.error.broken")}</p>
      <p class="small">{props.message}</p>
      <StampButton onClick={props.reset}>{t("boardui.error.newGame")}</StampButton>
    </PaperSheet>
  );
}

export { useGame } from "./game";
