/**
 * The letter (16.5.3 item 5): from the council that changed most, naming a project, a year and a
 * place. A made-up voice, and it says so.
 */
import { Show, type JSX } from "solid-js";
import { lang, t } from "../../../i18n";
import type { BoardModel, Ending } from "../../engine/api";
import { councilName } from "../words";
import { letterOf } from "./view";

export function Letter(props: { model: BoardModel; ending: Ending }): JSX.Element {
  const letter = () => letterOf(props.model, props.ending, lang());
  const from = () => councilName(props.model, props.ending.letter.from);
  return (
    <section class="be-letter-wrap" aria-labelledby="be-letter-title" data-testid="be-letter">
      <h2 class="t-2" id="be-letter-title">{t("boardend.letter.title", { council: from() })}</h2>
      <Show when={letter()} fallback={<p class="small">{t("boardend.letter.none")}</p>}>
        <article class="be-letter sheet">
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
