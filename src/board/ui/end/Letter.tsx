/**
 * The letter (16.5.3 item 5): from the place the ending is about, naming a project, a year and a
 * place. A made-up voice, and it says so. Of the letters that fit, this device shows one it has
 * not read yet (found.ts), so a second game with the same ending reads a new voice. A run opened
 * from a code shows the game's own first letter and is not remembered.
 */
import { Show, type JSX } from "solid-js";
import { lang, t } from "../lang";
import type { BoardModel, BoardState, Ending } from "../../engine/api";
import { councilName } from "../words";
import { letterForGame } from "./found";
import { letterChoicesOf, letterOf } from "./view";

/** One game, as the letter memory knows it. */
export const gameKey = (s: BoardState): string => `${String(s.gameNumber)}|${s.start}|${s.log.length}`;

export function Letter(props: { model: BoardModel; ending: Ending; state: BoardState; opened: boolean }): JSX.Element {
  // chosen once, when the screen opens: reading it must not change it
  const choices = letterChoicesOf(props.model, props.ending);
  const id = (props.opened ? choices[0] : letterForGame(props.model, choices, gameKey(props.state))) ?? props.ending.letter.letter;
  const letter = () => letterOf(props.model, props.ending, lang(), id);
  const from = () => councilName(props.model, props.ending.letter.from);
  return (
    <section class="be-letter-wrap" aria-labelledby="be-letter-title" data-testid="be-letter">
      <h2 class="t-2" id="be-letter-title">{t("boardend.letter.title", { council: from() })}</h2>
      <Show when={letter()} fallback={<p class="small">{t("boardend.letter.none")}</p>}>
        <article class="be-letter sheet" data-letter={id}>
          <p class="be-letter-salutation">{letter()!.salutation}</p>
          <p class="be-letter-body">{letter()!.body}</p>
          <Show when={letter()!.named}><p class="be-letter-body">{letter()!.named}</p></Show>
          <p class="be-letter-signoff">{letter()!.signoff}</p>
          <p class="be-letter-from label">{from()}, {props.model.game.end_year}</p>
        </article>
        <p class="small be-honest">{t("boardend.letter.voice")}</p>
      </Show>
    </section>
  );
}
