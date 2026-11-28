/**
 * After a lost election you govern with others (rule P6, 16.4): pick one of two deals, each from a
 * council that backs you least. A deal is that council's weakest measure and a date. No coins are
 * taken and no council refuses builds.
 */
import { createMemo, For, Show, type JSX } from "solid-js";
import { t } from "./lang";
import { TabButton } from "../../ui/parts";
import { stepsOf } from "../engine/api";
import { blockerWords } from "./blockers";
import { options } from "./engine";
import { useGame } from "./game";
import { ruleParamOf } from "./rules";
import { councilName, measureName, whenWords } from "./words";

/** True while a deal is on offer. */
export const dealPending = (game: ReturnType<typeof useGame>): boolean => !!game.state()?.pending.some((p) => p.kind === "deal");

export function DealChoice(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const deals = createMemo(() => {
    const s = game.state();
    if (!s) return [];
    try { return options(model, s).filter((o) => o.action.kind === "deal"); } catch { return []; }
  });
  const years = () => ruleParamOf(model, "P6", "deal_years", 4);
  const due = () => whenWords(model, (game.state()?.step ?? 0) + stepsOf(model, years()));
  return (
    <Show when={deals().length}>
      <section class="bw-deals" aria-labelledby="bw-deals-title" data-testid="bw-deals">
        <h3 class="t-3" id="bw-deals-title">{t("boardui.deal.title")}</h3>
        <p class="story-small">{t("boardui.deal.ask", { when: due() })}</p>
        <ul class="bw-deal-list">
          <For each={deals()}>
            {(o) => {
              const a = o.action.kind === "deal" ? o.action : null;
              return (
                <li>
                  <TabButton onClick={() => game.act(o.action)} why={o.allowed ? null : o.blockers.map((b) => blockerWords(model, b)).join(" ")} data-testid="bw-deal">
                    {t("boardui.deal.pick", { council: councilName(model, a?.council), measure: measureName(model, a?.measure ?? "work") })}
                  </TabButton>
                </li>
              );
            }}
          </For>
        </ul>
        <p class="small">{t("boardui.deal.note")}</p>
      </section>
    </Show>
  );
}
