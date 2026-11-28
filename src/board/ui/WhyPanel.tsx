/**
 * Why? (plain-wales.md section 1.2): the reasons behind one change, largest first. Each reason
 * runs from what you did, along the link it travelled, to the rule card and its sources. The red
 * thread is provenance, so this sheet is where red lives.
 */
import { createEffect, createMemo, For, Show, untrack, type JSX } from "solid-js";
import { t } from "./lang";
import { CloseButton, SourceTag, sourceShort } from "../../ui/parts";
import type { Why } from "../engine/api";
import { viaWords, whyCauseWords } from "./causes";
import { sourceOf } from "./CouncilPanel";
import { backingHolds, liftWords } from "./backingHolds";
import { backsAtOf } from "./mapLinks";
import { useGame } from "./game";
import { councilName, measureName, num, signed, whenWords } from "./words";
import { isRoughSource, openWhy, ruleHref, ruleLabel, shownReasons, sourceLabels, whySpans } from "./whyWords";

export function WhyPanel(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const target = () => game.whyAt()!;
  const reasons = createMemo<Why[]>(() => {
    const s = game.state(), w = game.whyAt();
    if (!s || !w) return [];
    try { return shownReasons(model, s, w); } catch (e) { console.warn(e); return []; }
  });
  // opened on a span with nothing to show: move to one that has (playtest 10, must-fix 3). Only on
  // opening, or for a new council or measure, so a tab the player picks stays picked.
  let opened = "";
  createEffect(() => {
    const s = game.state(), w = game.whyAt();
    if (!s || !w) { opened = ""; return; }
    const key = `${w.council}|${w.measure}`;
    if (key === opened) return;
    opened = key;
    const next = untrack(() => openWhy(model, s, w));
    if (next.fromStep !== w.fromStep || next.toStep !== w.toStep) game.setWhyAt(next);
  });
  const ruleOf = (id: string) => model.rules.find((r) => r.id === id);
  const now = () => game.state()?.step ?? 0;
  const spans = () => whySpans(model, now());
  const setSpan = (from: number) => game.setWhyAt({ ...target(), fromStep: from, toStep: now() });
  /** For a council's backing under the line: what holds it there, always (must-fix 3 and 4). */
  const holds = createMemo(() => {
    const s = game.state(), w = game.whyAt();
    if (!s || !w || w.measure !== "backing" || !w.council || (s.councils[w.council]?.backing ?? 10) >= backsAtOf(model) || s.step === 0) return null;
    try { return backingHolds(model, s, w.council); } catch { return null; }
  });
  const labels = (w: Why) => sourceLabels(w.sources.map((id) => sourceOf(model, id)), sourceShort)
    .map((label, i) => (isRoughSource(model, w.sources[i]!) ? `${t("boardui.source.roughLabel")}: ${label}` : label));
  return (
    <div class="bw-why-panel sheet-held" role="dialog" aria-labelledby="bw-why-title" data-testid="bw-why" data-needs-close="why">
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
      <Show when={holds() && (holds()!.lines.length || holds()!.lifts.length)}>
        <section class="bw-why-holds" data-testid="bw-why-holds">
          <p class="label">{t("boardui.why.holds", { council: councilName(model, target().council), at: num(backsAtOf(model)) })}</p>
          <ul class="small"><For each={holds()!.lines}>{(line) => <li>{line}</li>}</For></ul>
          <Show when={holds()!.lifts.length}>
            <p class="small"><b>{t("boardui.holds.lift")}</b> {holds()!.lifts.map((l) => liftWords(model, l)).join(". ")}.</p>
          </Show>
          <Show when={holds()!.rule}><p class="small bw-honest">{holds()!.rule}</p></Show>
        </section>
      </Show>
      <Show when={reasons().length} fallback={<p class="story-small bw-why-none">{t("boardui.why.none")}</p>}>
        <ol class="bw-why-list">
          <For each={reasons()}>
            {(w) => (
              <li class="bw-why-item">
                <p class="bw-why-delta"><b class="data">{signed(w.delta)}</b> <span class="small">{t("boardui.why.points", { when: whenWords(model, w.step) })}</span></p>
                <p class="bw-why-row"><span class="label">{t("boardui.why.you")}</span> {whyCauseWords(model, w, game.state()!)}</p>
                <Show when={w.via}>
                  <p class="bw-why-row"><span class="label">{t("boardui.why.along")}</span> {viaWords(model, w)}</p>
                </Show>
                <p class="bw-why-row"><span class="label">{t("boardui.why.rule")}</span> <b>{ruleLabel(model, w.rule).name}.</b> {ruleLabel(model, w.rule).note}</p>
                <p class="small bw-why-foot">
                  <span class="bw-honest">{t(`boardui.honesty.${w.honesty}`)}</span>{" "}
                  <Show when={ruleOf(w.rule)}>{t(`boardui.confidence.${ruleOf(w.rule)!.confidence}`)}</Show>
                </p>
                <p class="small"><a class="threadlink" href={ruleHref(model, w.rule)}>{t("boardui.why.ruleLink")}</a></p>
                <Show when={w.sources.length}>
                  <p class="bw-why-sources"><span class="small bw-why-sources-label">{t("boardui.why.sources")}</span> <For each={labels(w)}>{(label, i) => <SourceTag source={sourceOf(model, w.sources[i()]!)} label={label} />}</For></p>
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
