/**
 * The end of the turn (plain-wales.md section 3.3): coins left and what happens to them, and the
 * one stamp on the board, "End the turn: 2 years pass". Ending with coins that would be lost asks
 * once, every time. An event that needs an answer is answered first.
 */
import { createSignal, Show, type JSX } from "solid-js";
import { t, tn } from "../../i18n";
import { StampButton, TabButton } from "../../ui/parts";
import { useGame } from "./game";
import { ruleParamOf } from "./rules";

export function Dock(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const [asking, setAsking] = createSignal(false);
  const s = () => game.state()!;
  const carry = () => ruleParamOf(model, "B1", "carry_max", 2);
  const lost = () => Math.max(0, s().coins - carry());
  const mustAnswer = () => s().phase !== "ended" && s().pending.some((p) => p.kind === "respond");
  const end = () => {
    if (lost() > 0 && !asking()) { setAsking(true); return; }
    setAsking(false);
    game.endTurn();
  };
  return (
    <div class="bw-dock sheet" data-testid="bw-dock">
      <Show
        when={!asking()}
        fallback={
          <div class="bw-dock-ask" role="alertdialog" aria-labelledby="bw-dock-q">
            <p class="t-3" id="bw-dock-q">{tn("boardui.dock.unused", s().coins)}</p>
            <p class="small">{t("boardui.dock.lost", { keep: Math.min(carry(), s().coins), lose: lost() })}</p>
            <div class="bw-dock-row">
              <StampButton onClick={() => setAsking(false)} autofocus>{t("boardui.dock.back")}</StampButton>
              <TabButton onClick={end} data-testid="bw-end-anyway">{t("boardui.dock.anyway")}</TabButton>
            </div>
          </div>
        }
      >
        <p class="small bw-dock-note">{s().coins > 0 ? t("boardui.dock.carry", { n: carry() }) : t("boardui.dock.spent")}</p>
        <StampButton onClick={end} why={mustAnswer() ? t("boardui.dock.answerFirst") : null} data-testid="bw-end-turn">
          {t("boardui.dock.end", { years: model.game.turn_years })}
        </StampButton>
      </Show>
    </div>
  );
}
