/**
 * The count at an election (v2-board.md section 6): how many councils back you, how many people
 * they hold, the result, and, in plain words, what each result means for the next four years, with
 * yours marked (playtest 8, should-fix 2: "elections change nothing visible"). No parties, no
 * polls. Shown inside the term report, first, before the term's lines.
 */
import { For, Show, type JSX } from "solid-js";
import { formatNum, t, tn } from "./lang";
import { TabButton } from "../../ui/parts";
import type { ElectionResult, ElectionView } from "../engine/api";
import { electionCounts, electionTargets } from "./electionTargets";
import { useGame } from "./game";
import { ruleParamOf } from "./rules";
import { TargetsCard } from "./TargetsCard";
import { councilName, num } from "./words";

const RESULTS: ElectionResult[] = ["strong_win", "win", "lost"];

/**
 * `latest`: this is the election just held and the board is still on its step's term, so the card
 * also says what to do next: the law change a win gives (playtest 10, should-fix 3), who backs you
 * now if that has moved since the count (must-fix 6), and the councils that would tip the next
 * election (the critic's one change).
 */
export function Election(props: { view: ElectionView; latest?: boolean; onLeave?: () => void }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const v = () => props.view;
  const counts = () => { const s = game.state(); return s && props.latest ? electionCounts(model, s, v()) : null; };
  const targets = () => { const s = game.state(); return s && props.latest ? electionTargets(model, s) : null; };
  const won = () => v().result !== "lost";
  const lawsLeft = () => game.state()?.lawChangesLeft ?? 0;
  const chooseLaw = () => { props.onLeave?.(); game.setSheet("laws"); };
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
      <Show when={counts()?.differs}>
        <p class="small" data-testid="bw-election-now">{t("boardui.election.nowCount", { n: counts()!.now, of: v().councilCount })}</p>
      </Show>
      <Show when={props.latest && won()}>
        <div class="bw-election-law" data-testid="bw-election-law">
          <Show when={lawsLeft() > 0} fallback={<p class="small">{t("boardui.election.law.used")}</p>}>
            <p class="small"><b>{tn("boardui.election.law.left", lawsLeft())}</b> {t("boardui.election.law.note")}</p>
            <TabButton onClick={chooseLaw} data-testid="bw-election-choose-law">{t("boardui.election.law.choose")}</TabButton>
          </Show>
        </div>
      </Show>
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
      <Show when={targets()}>{(tg) => <TargetsCard targets={tg()} onLook={props.onLeave} />}</Show>
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
