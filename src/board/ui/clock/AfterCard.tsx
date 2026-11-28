/**
 * What time does after a card, said on the card, with the other choice as a button (cold
 * playtest 10, should fix 5: 7 of 8 felt rushed when time ran on after an answer). Time does what
 * it did before the card; "Pause after this card" or "Run after this card" changes that, as Space
 * and the clock's Pause button do. For the event card (../Respond.tsx) and the term report
 * (../TermReport.tsx); the stop card (../StopCard.tsx) says the same with its Look note.
 */
import { Show, type JSX } from "solid-js";
import { t } from "../lang";
import { useGame } from "../game";

export function AfterCard(): JSX.Element {
  const c = useGame().clock;
  return (
    <Show when={!c.prefs().stepByStep}>
      <p class="small bw-after" data-testid="bw-after">
        {c.playing() ? t("boardclock.after.runs") : t("boardclock.card.paused")}{" "}
        <button type="button" class="inklink small bw-stop-flip" onClick={() => c.toggle()} data-testid="bw-after-flip">
          {c.playing() ? t("boardclock.card.stayPaused") : t("boardclock.card.runAfter")}
        </button>
      </p>
    </Show>
  );
}
