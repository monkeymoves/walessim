/**
 * What happened (v2-board.md section 3, step 4): three lines at most, each a council and a cause,
 * each with Why?. Then any event that needs an answer, any place asking for a visit, and the coins
 * for the next turn. Paper slips stacked to the south-east (design-system 4.12a).
 */
import { For, Show, type JSX } from "solid-js";
import { Pair, t, tn } from "../../i18n";
import { StampButton, TabButton, ThreadButton } from "../../ui/parts";
import { useGame } from "./game";
import { Respond } from "./Respond";
import { causeWords } from "./causes";
import { councilName, measureName, say, signed, tx } from "./words";

export function Report(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const r = () => game.report()!;
  const s = () => game.state()!;
  // once 2050 is reached nothing more can be answered, so a last event never blocks the end
  const responds = () => (s().phase === "ended" ? [] : s().pending.filter((p) => p.kind === "respond"));
  const visits = () => (s().phase === "ended" ? [] : s().pending.filter((p) => p.kind === "visit"));
  const lineText = (l: ReturnType<typeof r>["lines"][number]) => say(l.say) || t("boardui.report.line", { council: councilName(model, l.council), measure: measureName(model, l.quantity), d: signed(l.delta) });
  const placeName = (id: string) => tx(model.places.find((p) => p.id === id)?.name ?? id);
  return (
    <div class="bw-report" role="dialog" aria-labelledby="bw-report-title" data-testid="bw-report">
      <div class="bw-report-head sheet">
        <h2 class="t-2" id="bw-report-title">{t("boardui.report.title", { from: r().fromYear, to: r().toYear })}</h2>
        <p class="small">{t("boardui.report.coins", { n: r().coins.after, carried: r().coins.carried })}</p>
        <Show when={r().coins.charges > 0}><p class="small">{tn("boardui.report.charges", r().coins.charges)}</p></Show>
      </div>
      <ol class="bw-slips">
        <For each={r().lines} fallback={<li class="bw-slip-line sheet"><p class="story-small">{t("boardui.report.none")}</p></li>}>
          {(l) => (
            <li class="bw-slip-line sheet">
              <p class="t-3">{councilName(model, l.council)}: {measureName(model, l.quantity)} <span class="data">{signed(l.delta)}</span></p>
              <p class="story-small">{lineText(l)}</p>
              <p class="small">{causeWords(model, l.why.cause, model.game.first_year + l.why.turn * model.game.turn_years)}</p>
              <ThreadButton onClick={() => game.setWhyAt({ council: l.council ?? undefined, measure: l.quantity, turn: r().turn })}>{t("boardui.why.button")}</ThreadButton>
            </li>
          )}
        </For>
      </ol>
      <For each={responds()}>{(p) => (p.kind === "respond" ? <Respond event={p.event} councils={p.councils} /> : null)}</For>
      <For each={visits()}>
        {(p) => (p.kind === "visit" ? (
          <div class="bw-slip-line sheet">
            <p class="t-3"><Pair text={model.places.find((x) => x.id === p.place)?.name} /></p>
            <p class="story-small">{t("boardui.report.visit", { place: placeName(p.place), council: councilName(model, p.council) })}</p>
            <TabButton onClick={() => game.setVisit(p.place)} data-testid="bw-visit">{t("boardui.report.visitGo", { place: placeName(p.place) })}</TabButton>
          </div>
        ) : null)}
      </For>
      <div class="bw-report-foot">
        <StampButton onClick={() => game.nextScreen()} why={responds().length ? t("boardui.dock.answerFirst") : null} data-testid="bw-report-next">
          {r().election ? t("boardui.report.toElection") : r().ended ? t("boardui.report.toEnd") : t("boardui.report.toBoard", { year: r().toYear })}
        </StampButton>
      </div>
    </div>
  );
}
