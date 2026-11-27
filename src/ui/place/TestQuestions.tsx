// The place's tests as plain questions, before the player chooses (plain-wales cold playtest).
import { For, type JSX } from "solid-js";
import { t } from "../../i18n";
import { useGame } from "../game/context";

/**
 * The place's tests as plain questions, each with what makes it pass, shown before the player
 * chooses (cold playtest: "Exposure", "Lifelines" were the biggest confusion). The words of each
 * test's pass line are the board's own description.
 */
export function TestQuestions(props: { place: "rhondda" | "bethesda" }): JSX.Element {
  const { game } = useGame();
  const board = game.names.place(props.place);
  const ids = () => (board?.tests.length ? board.tests.map((x) => x.id) : props.place === "rhondda" ? ["exposure", "fairness", "lifelines"] : ["aros", "iaith", "pwysau"]);
  const pass = (id: string) => {
    const x = board?.tests.find((y) => y.id === id);
    return x ? game.names.text(x.description) : t(`place.${props.place}.tests.${id}`);
  };
  return (
    <section class="pl-questions" aria-labelledby={`pl-q-${props.place}`} data-testid="visit-questions">
      <h3 id={`pl-q-${props.place}`} class="label">{t("play.visit.questions")}</h3>
      <ol class="pl-q-list">
        <For each={ids()}>
          {(id) => (
            <li>
              <p class="strong">{t(`play.visit.q.${id}`)}</p>
              <p class="small"><span class="label">{t("play.visit.to_pass")}</span> {pass(id)}</p>
            </li>
          )}
        </For>
      </ol>
      <p class="small">{t("place.common.tests_note")}</p>
    </section>
  );
}
