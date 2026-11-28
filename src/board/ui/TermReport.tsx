/**
 * The term report at each election (16.2.6): the name the game gave the four years, the election
 * and what its result means, and at most three lines, each a council and a cause with Why? over
 * the term. After a lost election the deal to pick sits in the foot, above "Carry on", so it is in
 * sight without scrolling (playtest 8, must-fix 10). At the end it leads on to the Wales you built.
 *
 * As a stop it holds the clock until "Carry on". From the time line it opens the same report for
 * a past term.
 */
import { For, onMount, Show, type JSX } from "solid-js";
import { t } from "./lang";
import { CloseButton, StampButton, ThreadButton } from "../../ui/parts";
import type { ReportLine, TermReport as TermReportData } from "../engine/api";
import { stepOfYear } from "../engine/api";
import { whyCauseWords } from "./causes";
import { DealChoice, dealPending } from "./DealChoice";
import { Election } from "./Election";
import { useGame } from "./game";
import { chapterLine, chapterName, councilName, measureName, say, signed } from "./words";

export function TermReport(props: { report: TermReportData; asStop: boolean; ended?: boolean }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const r = () => props.report;
  const span = () => ({ fromStep: stepOfYear(model, r().fromYear), toStep: Math.min(game.state()?.step ?? 0, stepOfYear(model, r().toYear)) });
  const lineText = (l: ReportLine) => say(l.say) || t("boardui.report.line", { council: councilName(model, l.council), measure: measureName(model, l.quantity), d: signed(l.delta) });
  const mustDeal = () => props.asStop && !props.ended && dealPending(game);
  const close = () => (props.asStop ? game.clock.carryOn() : game.setTermOpen(null));
  let sheet!: HTMLDivElement;
  onMount(() => sheet.querySelector<HTMLElement>(mustDeal() ? "[data-testid=bw-deal]" : "#bw-term-name")?.focus());
  return (
    <div ref={sheet} class="bw-term sheet-held" role="dialog" aria-labelledby="bw-term-name" data-testid="bw-term">
      <header class="bw-term-head">
        <p class="label">{t("boardui.term.label", { n: r().term, from: r().fromYear, to: r().toYear })}</p>
        <h2 class="t-1 bw-term-name" id="bw-term-name" tabindex="-1">{chapterName(model, r().chapter)}</h2>
        <Show when={chapterLine(model, r().chapter)}><p class="story-small">{chapterLine(model, r().chapter)}</p></Show>
        <p class="small bw-honest">{t("boardui.term.honest")}</p>
        <Show when={!props.asStop}><CloseButton label={t("boardui.close")} onClick={close} /></Show>
      </header>
      <div class="bw-term-scroll">
        <Election view={r().election} />
        <ol class="bw-slips" aria-label={t("boardui.term.linesAria")}>
          <For each={r().lines} fallback={<li class="bw-slip-line"><p class="story-small">{t("boardui.report.none")}</p></li>}>
            {(l) => (
              <li class="bw-slip-line">
                <p class="t-3">{councilName(model, l.council)}: {measureName(model, l.quantity)} <span class="data">{signed(l.delta)}</span></p>
                <p class="story-small">{lineText(l)}</p>
                <p class="small">{whyCauseWords(model, l.why, game.state()!)}</p>
                <ThreadButton onClick={() => game.setWhyAt({ council: l.council ?? undefined, measure: l.quantity, ...span() })}>{t("boardui.why.button")}</ThreadButton>
              </li>
            )}
          </For>
        </ol>
      </div>
      <footer class="bw-term-foot">
        <Show when={mustDeal()}><DealChoice /></Show>
        <Show when={props.asStop} fallback={<StampButton onClick={close}>{t("boardui.term.close")}</StampButton>}>
          <StampButton onClick={close} why={mustDeal() ? t("boardui.deal.first") : null} data-testid="bw-term-on">
            {props.ended ? t("boardui.report.toEnd") : t("boardui.stop.carryOn")}
          </StampButton>
        </Show>
      </footer>
    </div>
  );
}
