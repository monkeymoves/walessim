/**
 * The count at an election (v2-board.md section 6): how many councils back you, how many people
 * they hold, the result, and, in plain words, what each result means for the next four years, with
 * yours marked (playtest 8, should-fix 2: "elections change nothing visible"). No parties, no
 * polls. Shown inside the term report, first, before the term's lines.
 */
import { For, type JSX } from "solid-js";
import { formatNum, t } from "./lang";
import type { ElectionResult, ElectionView } from "../engine/api";
import { useGame } from "./game";
import { ruleParamOf } from "./rules";
import { councilName, num } from "./words";

const RESULTS: ElectionResult[] = ["strong_win", "win", "lost"];

export function Election(props: { view: ElectionView }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const v = () => props.view;
  const meansVars = () => ({
    years: num(ruleParamOf(model, "P6", "deal_years", 4)),
    kept: num(ruleParamOf(model, "P6", "kept_here", 1.5)),
    broken: num(ruleParamOf(model, "P6", "broken_here", 1.5)),
    fade: num(ruleParamOf(model, "P6", "broken_years", 4)),
  });
  return (
    <section class="bw-election" aria-labelledby="bw-election-title" data-testid="bw-election">
      <h3 class="t-3" id="bw-election-title">
        {t("boardui.election.year", { year: v().year })}: {t(`boardui.election.result.${v().result}`)}
      </h3>
      <p class="bw-election-count">
        <span class="figure-big">{v().backers}</span>{" "}
        <span>{t("boardui.election.count", { of: v().councilCount, people: formatNum(v().peopleShare * 100, { maximumFractionDigits: 0 }) })}</span>
      </p>
      <div class="bw-election-means" data-testid="bw-election-means">
        <p class="label">{t("boardui.election.means.title", { years: meansVars().years })}</p>
        <ul>
          <For each={RESULTS}>
            {(r) => (
              <li classList={{ yours: r === v().result }}>
                <span>{t(`boardui.election.means.${r}`, meansVars())}</span>
                {r === v().result ? <b class="small bw-election-you">{t("boardui.election.means.you")}</b> : null}
              </li>
            )}
          </For>
        </ul>
        <p class="small">{t("boardui.election.means.note")}</p>
      </div>
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
      <p class="small">{t("boardui.election.rule", { n: num(ruleParamOf(model, "P4", "backs_at", 5)) })} <span class="bw-honest">{t("boardui.election.honest")}</span></p>
    </section>
  );
}
