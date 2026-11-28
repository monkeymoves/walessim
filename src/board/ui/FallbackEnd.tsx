/**
 * The end while package 6's screen (src/board/ui/end/) is not built: the name of the Wales you
 * built if the endings module can judge it, the board in 2026 and 2050 by council, and Play again.
 */
import { createMemo, For, Show, type JSX } from "solid-js";
import { formatNum, Pair, t } from "../../i18n";
import { LangToggle, StampButton } from "../../ui/parts";
import { MEASURE_IDS } from "../engine/api";
import * as eng from "./engine";
import { useGame } from "./game";
import { councilMean } from "./mapLinks";
import { councilName, measureName, say, tx } from "./words";

export function FallbackEnd(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const s = () => game.state()!;
  const ending = createMemo(() => (game.state() ? eng.ending(model, s()) : null));
  const first = () => s().history[0]!;
  const mean0 = (code: string) => MEASURE_IDS.reduce((a, m) => a + (first().councils[code]?.measures[m] ?? 0), 0) / MEASURE_IDS.length;
  const f = (n: number) => formatNum(n, { maximumFractionDigits: 1 });
  return (
    <div class="bw-end" data-testid="bw-end">
      <div class="bw-end-sheet sheet">
        <div class="bw-start-top"><span class="t-year">{model.game.end_year}</span><LangToggle /></div>
        <Show when={ending()} fallback={<p class="story">{t("boardui.end.notJudged")}</p>}>
          <p class="label">{t("boardui.end.built")}</p>
          <Pair text={ending()!.name} as="h1" class="t-1" />
          <p class="story">{tx(ending()!.summary)}</p>
          <ul class="bw-end-evidence"><For each={ending()!.evidence.filter((e) => say(e.say))}>{(e) => <li class="story-small">{say(e.say)}</li>}</For></ul>
        </Show>
        <table class="bw-end-table">
          <thead><tr><th>{t("boardui.end.council")}</th><th>{t("boardui.end.then")}</th><th>{t("boardui.end.now")}</th></tr></thead>
          <tbody>
            <For each={[...model.game.councils].sort((a, b) => (councilMean(s(), b) - mean0(b)) - (councilMean(s(), a) - mean0(a)))}>
              {(code) => <tr><td>{councilName(model, code)}</td><td class="data">{f(mean0(code))}</td><td class="data">{f(councilMean(s(), code))}</td></tr>}
            </For>
          </tbody>
        </table>
        <p class="small">{t("boardui.end.tableNote", { list: MEASURE_IDS.map((m) => measureName(model, m)).join(t("boardui.list.comma")) })}</p>
        <StampButton onClick={() => game.newGame()} data-testid="bw-again">{t("boardui.end.again")}</StampButton>
      </div>
    </div>
  );
}
