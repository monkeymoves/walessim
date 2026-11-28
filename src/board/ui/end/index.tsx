/**
 * The end of a game of the board (docs/design/v2-board.md 16.5.3), in order: the time-lapse with
 * its turning points, the name of the Wales you built, your Wales in six chapters, then and now,
 * the letter, the Wales you did not build, the count (folded), and the run code with Play again.
 *
 * Loaded lazily by the board route as a default export with no props. It reads the game with
 * `useGame()`. A run opened from a code is shown in place of the player's own until they go back.
 */
import { createEffect, createMemo, createSignal, ErrorBoundary, For, Show, type JSX } from "solid-js";
import { Pair, t } from "../../../i18n";
import { LangToggle, PaperSheet, ThreadButton } from "../../../ui/parts";
import * as api from "../../engine/api";
import type { BoardState, Ending, EvidenceLine } from "../../engine/api";
import { useGame } from "../game";
import { say, tx } from "../words";
import { Chapters, chapterName } from "./Chapters";
import { Count } from "./Count";
import { foundEndings, noteEnding } from "./found";
import { Letter } from "./Letter";
import { NotBuilt } from "./NotBuilt";
import { RunCode } from "./RunCode";
import { ThenNow } from "./ThenNow";
import { TimeLapse } from "./TimeLapse";
import { termsOf, turningFrames } from "./view";
import "./end.css";

interface View { state: BoardState; ending: Ending }

export default function EndScreen(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const [opened, setOpened] = createSignal<BoardState | null>(null);
  const [found, setFound] = createSignal<string[]>(foundEndings(model));

  const view = createMemo<View | null>(() => {
    const s = opened() ?? game.state();
    if (!s || s.phase !== "ended") return null;
    try {
      return { state: s, ending: api.ending(model, s) };
    } catch (e) {
      console.warn("board: the ending could not be judged", e);
      return null;
    }
  });

  // the player's own ending counts as found; a run opened from a code does not
  createEffect(() => {
    const v = view();
    if (v && !opened()) setFound(noteEnding(model, v.ending.id));
  });

  const open = (s: BoardState) => { setOpened(s); window.scrollTo?.({ top: 0 }); };

  return (
    <div class="be" data-testid="bw-end">
      <header class="be-head">
        <a class="inklink small" href="#/">{t("boardend.home")}</a>
        <span class="t-year be-head-year">{model.game.end_year}</span>
        <LangToggle />
      </header>
      <Show when={view()} keyed fallback={<NotEnded />}>
        {(v) => <Body view={v} opened={!!opened()} found={found()} onOpen={open} onBack={() => setOpened(null)} onAgain={() => game.newGame()} />}
      </Show>
    </div>
  );
}

function NotEnded(): JSX.Element {
  const game = useGame();
  return (
    <PaperSheet class="be-notice" role="alert">
      <p class="t-3">{t("boardend.notEnded")}</p>
      <button type="button" class="btn btn-tab" onClick={() => game.newGame()}>{t("boardend.again.go")}</button>
    </PaperSheet>
  );
}

function Body(props: { view: View; opened: boolean; found: string[]; onOpen: (s: BoardState) => void; onBack: () => void; onAgain: () => void }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const { state, ending } = props.view;
  const frames = api.frames(model, state);
  const story = ending.story ?? api.story(model, state);
  const points = turningFrames(frames, story.turningPoints);
  const terms = termsOf(model, story.chapters).map((x) => ({ ...x, name: chapterName(model, x.rec, x.fromYear, x.toYear) }));
  return (
    <main class="be-main" aria-labelledby="be-name">
      <Show when={props.opened}>
        <p class="be-opened small" role="status">{t("boardend.code.viewing", { n: String(state.gameNumber) })}</p>
      </Show>
      <ErrorBoundary fallback={<p class="small">{t("boardend.lapse.failed")}</p>}>
        <TimeLapse model={model} state={state} frames={frames} points={points} terms={terms} />
      </ErrorBoundary>
      <section class="be-name" data-testid="be-name">
        <p class="label">{t("boardend.name.built")}</p>
        <h1 class="t-1" id="be-name"><Pair text={ending.name} /></h1>
        <p class="story">{tx(ending.summary)}</p>
        <ul class="be-evidence">
          <For each={ending.evidence.filter((e) => say(e.say))}>{(e) => <Evidence line={e} />}</For>
        </ul>
      </section>
      <Chapters model={model} chapters={story.chapters} />
      <ThenNow model={model} frames={frames} mostChanged={ending.mostChanged} />
      <Letter model={model} ending={ending} />
      <NotBuilt model={model} ending={ending} last={frames[frames.length - 1]!} />
      <Count model={model} ending={ending} found={props.found} />
      <RunCode model={model} state={state} ending={ending} opened={props.opened} onOpen={props.onOpen} onBack={props.onBack} onAgain={props.onAgain} />
    </main>
  );
}

function Evidence(props: { line: EvidenceLine }): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const why = () => (props.line.why ? say(props.line.why.say) : "");
  return (
    <li class="story-small">
      {say(props.line.say)}{" "}
      <Show when={why()}>
        <ThreadButton onClick={() => setOpen(!open())} aria-expanded={open()}>{t("boardend.name.why")}</ThreadButton>
        <Show when={open()}><span class="small be-why-line"> {why()}</span></Show>
      </Show>
    </li>
  );
}
