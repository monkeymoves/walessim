/**
 * Laws (v2-board.md section 5.1): Wales wide rules. One change per election term. A law costs
 * backing somewhere, never coins, and the sheet says where before you choose.
 */
import { createMemo, For, Show, type JSX } from "solid-js";
import { lang, Pair, t } from "./lang";
import { CloseButton, TabButton } from "../../ui/parts";
import { blockerWords } from "./blockers";
import * as eng from "./engine";
import { useGame } from "./game";
import { tx } from "./words";

export function LawsSheet(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const opts = createMemo(() => {
    const s = game.state();
    if (!s) return [];
    try { return eng.options(model, s).filter((o) => o.action.kind === "law"); } catch { return []; }
  });
  const inForce = (id: string) => game.state()?.laws.includes(id) ?? false;
  return (
    <div class="bw-laws sheet-held" role="dialog" aria-labelledby="bw-laws-title">
      <header class="bw-tree-head">
        <h2 class="t-1" id="bw-laws-title">{t("boardui.laws.title")}</h2>
        <p class="small">{t("boardui.laws.note", { n: game.state()?.lawChangesLeft ?? 0 })}</p>
        <CloseButton label={t("boardui.close")} onClick={() => game.setSheet(null)} />
      </header>
      <ul class="bw-laws-list">
        <For each={model.laws}>
          {(law) => {
            const o = () => opts().find((x) => x.action.kind === "law" && x.action.law === law.id);
            return (
              <li class="bw-law">
                <Pair single={lang() === "cy"} text={law.name} class="t-3" />
                <p class="story-small">{tx(law.what)}</p>
                <p class="small bw-catch">{t("boardui.build.catch", { text: tx(law.catch) })}</p>
                <p class="small">{inForce(law.id) ? t("boardui.laws.inForce") : t("boardui.laws.notInForce")}</p>
                <Show when={o()}>
                  <TabButton
                    onClick={() => game.act(o()!.action)}
                    why={o()!.allowed ? null : o()!.blockers.map((b) => blockerWords(model, b)).join(" ")}
                  >
                    {inForce(law.id) ? t("boardui.laws.repeal") : t("boardui.laws.pass")}
                  </TabButton>
                </Show>
              </li>
            );
          }}
        </For>
      </ul>
    </div>
  );
}
