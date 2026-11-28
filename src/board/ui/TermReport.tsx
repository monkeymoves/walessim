/**
 * The term report at each election (16.2.6): the name the game gave the four years, the election
 * and what its result means, and at most three lines, each a council and a cause with Why? over
 * the term. After a lost election the deal to pick sits in the foot, above "Carry on", so it is in
 * sight without scrolling (playtest 8, must-fix 10). At the end it leads on to the Wales you built.
 *
 * Playtest 9: the report is wide, the election on the left and the term on the right, so neither
 * is cut off (must-fix 4); the deal to pick sits at the top of the right column; and each deal of
 * the term says what happened to it and what that did to backing (must-fix 9).
 *
 * When the report is taller than the screen, a "More below" sign sits at its foot until the reader
 * has scrolled to the end (fix round 2: the election's last "Why?" read as clipped).
 *
 * As a stop it holds the clock until "Carry on". From the time line it opens the same report for
 * a past term.
 */
import { createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { t } from "./lang";
import { CloseButton, StampButton, ThreadButton } from "../../ui/parts";
import type { ReportLine, TermReport as TermReportData } from "../engine/api";
import { stepOfYear } from "../engine/api";
import { whyCauseWords } from "./causes";
import { DealChoice, dealPending } from "./DealChoice";
import { dealWords } from "./dealWords";
import { Election } from "./Election";
import { useGame } from "./game";
import { chapterLine, chapterName, councilName, measureName, say, signed } from "./words";
import { AfterCard } from "./clock/AfterCard";

type TermProps = { report: TermReportData; asStop: boolean; ended?: boolean };

/**
 * The report steps aside while something else must be read first, and comes back after (playtest
 * 10, must-fix 11: a tier card over a reopened term report, the 2038 election over a fuel costs
 * card): an event waiting for its answer, or, for a past term reopened from the time line, a stop
 * card. Nothing is lost: the report is still open underneath and returns as it was.
 */
export function TermReport(props: TermProps): JSX.Element {
  const game = useGame();
  const aside = () => game.state()?.phase === "respond" || (!props.asStop && game.clock.queue().length > 0);
  return <Show when={!aside()}><TermSheet {...props} /></Show>;
}

function TermSheet(props: TermProps): JSX.Element {
  const game = useGame();
  const model = game.model;
  const r = () => props.report;
  const span = () => ({ fromStep: stepOfYear(model, r().fromYear), toStep: Math.min(game.state()?.step ?? 0, stepOfYear(model, r().toYear)) });
  const lineText = (l: ReportLine) => say(l.say) || t("boardui.report.line", { council: councilName(model, l.council), measure: measureName(model, l.quantity), d: signed(l.delta) });
  /** Deals that ran in this term: made by its end, due after its start. */
  const deals = () => {
    const st = game.state(), sp = span();
    return st ? st.deals.filter((d) => d.madeStep <= sp.toStep && d.dueStep >= sp.fromStep).map((d) => ({ d, w: dealWords(model, st, d) })) : [];
  };
  const mustDeal = () => props.asStop && !props.ended && dealPending(game);
  const close = () => (props.asStop ? game.clock.carryOn() : game.setTermOpen(null));
  /** The election just held, with the board still in its term: the card can say what to do next. */
  const latest = () => {
    const st = game.state(), last = st?.election.records[st.election.records.length - 1];
    return !props.ended && !!last && last.year === r().election.year && last.year === r().toYear;
  };
  /** Leave the report for the board, paused (to choose a law or look at a council): never runs the clock. */
  const leave = () => (props.asStop ? game.clock.look() : game.setTermOpen(null));
  let sheet!: HTMLDivElement;
  let scroller!: HTMLDivElement;
  const [more, setMore] = createSignal(false);
  const measure = () => setMore(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 8);
  onMount(() => {
    // the card takes the focus, never a deal answer (playtest 10 must-fix 10)
    sheet.focus({ preventScroll: true });
    measure();
    const watch = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    watch?.observe(scroller);
    if (scroller.firstElementChild) watch?.observe(scroller.firstElementChild);
    onCleanup(() => watch?.disconnect());
  });
  return (
    <div ref={sheet} tabindex="-1" class="bw-term bw-term-wide sheet-held" role="dialog" aria-labelledby="bw-term-name" data-testid="bw-term" data-needs-card data-needs-close={props.asStop ? undefined : "term"}>
      <header class="bw-term-head">
        <p class="label">{t("boardui.term.label", { n: r().term, from: r().fromYear, to: r().toYear })}</p>
        <h2 class="t-1 bw-term-name" id="bw-term-name" tabindex="-1">{chapterName(model, r().chapter)}</h2>
        <Show when={chapterLine(model, r().chapter)}><p class="story-small">{chapterLine(model, r().chapter)}</p></Show>
        <p class="small bw-honest">{t("boardui.term.honest")}</p>
        <Show when={!props.asStop}><CloseButton label={t("boardui.close")} onClick={close} /></Show>
      </header>
      <div ref={scroller} class="bw-term-scroll bw-term-cols" onScroll={measure}>
        <div class="bw-term-col"><Election view={r().election} latest={latest()} onLeave={mustDeal() ? undefined : leave} /></div>
        <div class="bw-term-col">
          <Show when={deals().length}>
            <ul class="bw-term-deals" data-testid="bw-term-deals">
              <For each={deals()}>
                {(x) => (
                  <li class={`bw-term-deal ${x.w.state}`}>
                    <p class="small"><b>{x.w.what}</b> {x.w.backing}</p>
                  </li>
                )}
              </For>
            </ul>
          </Show>
          <Show when={mustDeal()}><DealChoice /></Show>
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
      </div>
      <Show when={more()}>
        <button type="button" class="bw-term-more small" data-testid="bw-term-more" onClick={() => scroller.scrollBy({ top: scroller.clientHeight * 0.8, behavior: "smooth" })}>
          {t("boardui.term.more")}
        </button>
      </Show>
      <footer class="bw-term-foot">
        <Show when={props.asStop}><AfterCard /></Show>
        <Show when={props.asStop} fallback={<StampButton onClick={close}>{t("boardui.term.close")}</StampButton>}>
          <StampButton onClick={close} why={mustDeal() ? t("boardui.deal.first") : null} data-testid="bw-term-on" data-needs="carry-on">
            {props.ended ? t("boardui.report.toEnd") : t("boardui.stop.carryOn")}
          </StampButton>
        </Show>
      </footer>
    </div>
  );
}
