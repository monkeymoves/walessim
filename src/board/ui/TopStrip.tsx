/**
 * The top strip (v2-board.md section 3): the year as the one loud thing, coins, six small Wales
 * bars and Fairness, and how many councils back you. The seven v1 bars shrink to this thin strip:
 * the map below is the board.
 */
import { For, Show, type JSX } from "solid-js";
import { formatNum, t, tn } from "../../i18n";
import { LangToggle, Tooltip } from "../../ui/parts";
import { MEASURE_IDS } from "../engine/api";
import { Bar } from "./Bar";
import { useGame } from "./game";
import { backsAtOf, walesMean } from "./mapLinks";
import { measureName, turnYears } from "./words";

export function TopStrip(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const s = () => game.state()!;
  const years = () => turnYears(model, Math.min(s().turn, model.game.turns - 1));
  const first = () => s().history[0];
  const backers = () => Object.values(s().councils).filter((c) => c.backing >= backsAtOf(model)).length;
  const fairness = () => s().history[s().history.length - 1]?.fairness ?? 0;
  const fairness0 = () => first()?.fairness ?? fairness();
  const coinsAfterPreview = () => game.preview()?.coinsAfter;
  return (
    <header class="bw-strip">
      <a class="bw-home" href="#/" title={t("boardui.home")} aria-label={t("boardui.home")}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M3 9.5 10 3l7 6.5M5 8v9h4v-5h2v5h4V8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="miter" />
        </svg>
      </a>
      <div class="bw-year">
        <span class="t-year" data-testid="bw-year">{s().phase === "ended" ? model.game.end_year : s().year}</span>
        <span class="bw-yearnote">
          <b>{t("boardui.strip.turn", { n: Math.min(s().turn + 1, model.game.turns), of: model.game.turns })}</b>
          <span>{t("boardui.strip.years", { from: years()[0], to: years()[1] })}</span>
        </span>
      </div>
      <div class="bw-coins" aria-live="polite">
        <span class="bw-coins-figure figure-big data-print">{s().coins}</span>
        <span class="bw-coins-word">
          <b>{tn("boardui.strip.coins", s().coins)}</b>
          <Show when={coinsAfterPreview() !== undefined} fallback={<span class="small">{t("boardui.strip.coinsNote")}</span>}>
            <span class="small bw-coins-after">{t("boardui.strip.coinsAfter", { n: Math.max(0, coinsAfterPreview()!) })}</span>
          </Show>
        </span>
      </div>
      <ul class="bw-walesbars" aria-label={t("boardui.strip.walesAria")}>
        <For each={MEASURE_IDS}>
          {(m) => {
            const now = () => walesMean(s(), m);
            const was = () => (first() ? Object.entries(first()!.councils).reduce((a, [code, c]) => a + c.measures[m] * (s().councils[code]?.pop ?? 0), 0) / Object.values(s().councils).reduce((a, c) => a + c.pop, 0) : now());
            return (
              <li>
                <Tooltip heading={measureName(model, m)} content={t("boardui.strip.barTip", { now: formatNum(now(), { maximumFractionDigits: 1 }), was: formatNum(was(), { maximumFractionDigits: 1 }) })}>
                  <span class="bw-wb" tabindex="0">
                    <span class="bw-wb-name">{measureName(model, m)}</span>
                    <Bar measure={m} value={now()} was={was()} small />
                  </span>
                </Tooltip>
              </li>
            );
          }}
        </For>
        <li>
          <Tooltip heading={t("boardui.strip.fairness")} content={t("boardui.strip.fairnessTip", { now: formatNum(fairness(), { maximumFractionDigits: 1 }), was: formatNum(fairness0(), { maximumFractionDigits: 1 }) })}>
            <span class="bw-wb bw-wb-fair" tabindex="0">
              <span class="bw-wb-name">{t("boardui.strip.fairness")}</span>
              <span class="bw-gap data">{t("boardui.strip.gap", { n: formatNum(fairness(), { maximumFractionDigits: 1 }) })}</span>
            </span>
          </Tooltip>
        </li>
      </ul>
      <button type="button" class="bw-backers" onClick={() => game.setColourBy("backing")} title={t("boardui.strip.backersTip")}>
        <span class="figure-big">{backers()}</span>
        <span class="bw-backers-word">{t("boardui.strip.backers", { of: model.game.councils.length })}</span>
      </button>
      <LangToggle class="bw-lang" />
    </header>
  );
}
