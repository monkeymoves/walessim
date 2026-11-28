/**
 * The right panel when no council is selected: the region's councils from furthest behind to
 * furthest ahead, who backs you, and what is on its way. Every row opens that council.
 */
import { For, Show, type JSX } from "solid-js";
import { formatNum, Pair, t } from "../../i18n";
import { TabButton } from "../../ui/parts";
import type { ProjectState } from "../engine/api";
import { useGame } from "./game";
import { backsAtOf, councilMean } from "./mapLinks";
import { councilName, projectName, whenWords } from "./words";

export function RegionPanel(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const s = () => game.state()!;
  const rows = () => [...model.game.councils].sort((a, b) => councilMean(s(), a) - councilMean(s(), b));
  const coming = () => s().projects.filter((p) => p.status === "building");
  const site = (p: ProjectState) => councilName(model, p.site.council ?? model.links.find((l) => l.id === p.site.link)?.from);
  return (
    <aside class="bw-council bw-region sheet" aria-labelledby="bw-region-name" data-testid="bw-region">
      <header class="bw-council-head">
        <Pair text={model.game.region} as="h2" class="t-1" id="bw-region-name" />
      </header>
      <p class="story-small bw-region-ask">{t("boardui.region.ask")}</p>
      <div class="bw-council-scroll">
        <ol class="bw-league" aria-label={t("boardui.region.leagueAria")}>
          <For each={rows()}>
            {(code, i) => (
              <li>
                <button type="button" class="bw-league-row" onClick={() => game.setSelected(code)}>
                  <span class="bw-league-n data small">{i() + 1}</span>
                  <span class="bw-league-name">{councilName(model, code)}</span>
                  <span class="bw-league-mean data small">{t("boardui.region.mean", { n: formatNum(councilMean(s(), code), { maximumFractionDigits: 1 }) })}</span>
                  <span class="bw-league-backs small" classList={{ yes: (s().councils[code]?.backing ?? 0) >= backsAtOf(model) }}>
                    {(s().councils[code]?.backing ?? 0) >= backsAtOf(model) ? t("boardui.region.backs") : t("boardui.region.backsNot")}
                  </span>
                </button>
              </li>
            )}
          </For>
        </ol>
        <p class="small">{t("boardui.region.leagueNote")}</p>
        <section class="bw-sec">
          <h3 class="label">{t("boardui.region.coming")}</h3>
          <Show when={coming().length} fallback={<p class="small">{t("boardui.region.nothingComing")}</p>}>
            <ul class="bw-here">
              <For each={coming()}>
                {(p) => (
                  <li>
                    <span>{projectName(model, p.project)}</span>
                    <span class="small">{t("boardui.region.where", { place: site(p), when: whenWords(model, p.readyStep + 1) })}</span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </section>
      </div>
      <footer class="bw-council-foot">
        <TabButton onClick={() => game.setSheet("tree")} data-testid="bw-tree-open">{t("boardui.tree.open")}</TabButton>
        <TabButton onClick={() => game.setSheet("laws")}>{t("boardui.laws.open")}</TabButton>
      </footer>
    </aside>
  );
}
