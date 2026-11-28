/**
 * Why? (plain-wales.md section 1.2): the reasons behind one change, largest first. Each reason
 * runs from what you did, along the link it travelled, to the rule card and its sources. The red
 * thread is provenance, so this sheet is where red lives.
 */
import { createMemo, For, Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import { CloseButton, SourceTag } from "../../ui/parts";
import type { Why } from "../engine/api";
import { causeWords, viaWords } from "./causes";
import { sourceOf } from "./CouncilPanel";
import * as eng from "./engine";
import { useGame } from "./game";
import { councilName, measureName, say, signed, tx, whenWords } from "./words";
import { stepOfYear, stepsOf } from "../engine/api";

export function WhyPanel(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const target = () => game.whyAt()!;
  const reasons = createMemo<Why[]>(() => {
    const s = game.state(), w = game.whyAt();
    if (!s || !w) return [];
    try { return eng.why(model, s, w); } catch (e) { console.warn(e); return []; }
  });
  const ruleOf = (id: string) => model.rules.find((r) => r.id === id);
  const now = () => game.state()?.step ?? 0;
  /** The three spans 16.2.7 offers: the last year, this term (since the last election), since 2026. */
  const spans = (): { id: string; from: number }[] => {
    const elections = model.game.election_years.map((y) => stepOfYear(model, y)).filter((x) => x <= now());
    return [
      { id: "year", from: Math.max(0, now() - stepsOf(model, 1)) },
      { id: "term", from: elections.length ? elections[elections.length - 1]! : 0 },
      { id: "all", from: 0 },
    ];
  };
  const setSpan = (from: number) => game.setWhyAt({ ...target(), fromStep: from, toStep: now() });
  return (
    <div class="bw-why-panel sheet-held" role="dialog" aria-labelledby="bw-why-title" data-testid="bw-why">
      <header class="bw-tree-head">
        <h2 class="t-2" id="bw-why-title">{t("boardui.why.title", { measure: measureName(model, target().measure), council: councilName(model, target().council) })}</h2>
        <CloseButton label={t("boardui.close")} onClick={() => game.setWhyAt(null)} />
      </header>
      <div class="bw-why-spans" role="radiogroup" aria-label={t("boardui.why.spanAria")}>
        <For each={spans()}>
          {(sp) => (
            <button type="button" role="radio" class="bw-why-span" aria-checked={target().fromStep === sp.from && target().toStep === now()} onClick={() => setSpan(sp.from)}>
              {t(`boardui.why.span.${sp.id}`)}
            </button>
          )}
        </For>
        <span class="small bw-why-range">{t("boardui.why.range", { from: whenWords(model, target().fromStep, true), to: whenWords(model, target().toStep) })}</span>
      </div>
      <Show when={reasons().length} fallback={<p class="story-small bw-why-none">{t("boardui.why.none")}</p>}>
        <ol class="bw-why-list">
          <For each={reasons()}>
            {(w) => (
              <li class="bw-why-item">
                <p class="bw-why-delta"><b class="data">{signed(w.delta)}</b> <span class="small">{t("boardui.why.points", { when: whenWords(model, w.step) })}</span></p>
                <Show when={say(w.say)}><p class="story-small">{say(w.say)}</p></Show>
                <p class="bw-why-row"><span class="label">{t("boardui.why.you")}</span> {causeWords(model, w.cause, w.year)}</p>
                <Show when={w.via}>
                  <p class="bw-why-row"><span class="label">{t("boardui.why.along")}</span> {viaWords(model, w)}</p>
                </Show>
                <p class="bw-why-row"><span class="label">{t("boardui.why.rule")}</span> <Show when={ruleOf(w.rule)} fallback={w.rule}><b>{tx(ruleOf(w.rule)!.name)}.</b> {tx(ruleOf(w.rule)!.note)}</Show></p>
                <p class="small bw-why-foot">
                  <span class="bw-honest">{t(`boardui.honesty.${w.honesty}`)}</span>{" "}
                  <Show when={ruleOf(w.rule)}>{t(`boardui.confidence.${ruleOf(w.rule)!.confidence}`)}</Show>
                </p>
                <p class="small"><a class="threadlink" href={`#/llyfr/bwrdd/${encodeURIComponent(w.rule)}`}>{t("boardui.why.ruleLink")}</a></p>
                <Show when={w.sources.length}>
                  <p class="bw-why-sources"><For each={w.sources}>{(id) => <SourceTag source={sourceOf(model, id)} />}</For></p>
                </Show>
              </li>
            )}
          </For>
        </ol>
      </Show>
      <p class="small bw-why-end">{t("boardui.why.foot")}</p>
      <a class="threadlink" href="#/llyfr/bwrdd">{t("boardui.why.book")}</a>
    </div>
  );
}
