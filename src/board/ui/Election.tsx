/**
 * The count at an election (v2-board.md section 6): how many councils back you, how many people
 * they hold, the result, and what it means for the next four years. No parties, no polls. Shown
 * inside the term report.
 */
import { For, type JSX } from "solid-js";
import { formatNum, t } from "../../i18n";
import type { ElectionView } from "../engine/api";
import { useGame } from "./game";
import { ruleParamOf } from "./rules";
import { councilName, say } from "./words";

export function Election(props: { view: ElectionView }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const v = () => props.view;
  return (
    <section class="bw-election" aria-labelledby="bw-election-title" data-testid="bw-election">
      <h3 class="t-3" id="bw-election-title">
        {t("boardui.election.year", { year: v().year })}: {t(`boardui.election.result.${v().result}`)}
      </h3>
      <p class="bw-election-count">
        <span class="figure-big">{v().backers}</span>{" "}
        <span>{t("boardui.election.count", { of: v().councilCount, people: formatNum(v().peopleShare * 100, { maximumFractionDigits: 0 }) })}</span>
      </p>
      <ul class="bw-election-list" aria-label={t("boardui.election.listAria")}>
        <For each={[...v().councils].sort((a, b) => b.backing - a.backing)}>
          {(c) => (
            <li classList={{ yes: c.backs }}>
              <span>{councilName(model, c.code)}</span>
              <span class="small data">{c.backs ? t("boardui.region.backs") : t("boardui.region.backsNot")}</span>
            </li>
          )}
        </For>
      </ul>
      <For each={v().says.map(say).filter(Boolean)}>{(line) => <p class="story-small">{line}</p>}</For>
      <p class="small">{t("boardui.election.rule", { n: formatNum(ruleParamOf(model, "P4", "backs_at", 5)) })} <span class="bw-honest">{t("boardui.election.honest")}</span></p>
    </section>
  );
}
