/**
 * Then and now (16.5.3 item 4): two small maps side by side, 2026 from real figures and 2050 as a
 * game estimate, on one colour scale, with a picker for what they are coloured by. The three
 * councils that changed most are named beside them, with the change in words.
 */
import { createMemo, createSignal, For, type JSX } from "solid-js";
import { formatNum, t } from "../../../i18n";
import type { BoardModel, CouncilCode, Frame } from "../../engine/api";
import { councilName, measureName, outOf10, signed } from "../words";
import { MiniMap } from "./MiniMap";
import { changes, END_LENSES, scaleOf, valuesOf, type EndLens } from "./view";

export function lensName(model: BoardModel, by: EndLens): string {
  if (by === "all") return t("boardend.lens.all");
  if (by === "young") return t("boardend.lens.young");
  return measureName(model, by);
}

export function lensValue(by: EndLens, v: number, about: boolean): string {
  if (by === "young") return t("boardend.lens.youngValue", { n: formatNum(v, { maximumFractionDigits: 1 }) });
  return outOf10(v, about);
}

export function ThenNow(props: { model: BoardModel; frames: Frame[]; mostChanged: CouncilCode[] }): JSX.Element {
  const model = props.model;
  const [by, setBy] = createSignal<EndLens>("all");
  const first = () => props.frames[0]!;
  const last = () => props.frames[props.frames.length - 1]!;
  const scale = createMemo(() => scaleOf(model, [first(), last()], by()));
  const rows = createMemo(() => {
    const all = changes(model, first(), last(), by());
    // the engine's three most changed (over all six measures) lead when the picker is on "all"
    if (by() === "all" && props.mostChanged.length) {
      return props.mostChanged.map((c) => all.find((r) => r.code === c)).filter((r): r is (typeof all)[number] => !!r).slice(0, 3);
    }
    return all.slice(0, 3);
  });
  return (
    <section class="be-thennow" aria-labelledby="be-thennow-title" data-testid="be-thennow">
      <h2 class="t-2" id="be-thennow-title">{t("boardend.thenNow.title")}</h2>
      <div class="be-lenses" role="radiogroup" aria-label={t("boardend.thenNow.by")}>
        <For each={END_LENSES}>
          {(l) => (
            <button type="button" role="radio" class="be-lens" aria-checked={by() === l} onClick={() => setBy(l)}>
              {lensName(model, l)}
            </button>
          )}
        </For>
      </div>
      <div class="be-pair">
        <figure class="be-pair-map">
          <MiniMap
            model={model} frame={first()} values={valuesOf(model, first(), by())} scale={scale()} ringed={rows().map((r) => r.code)}
            label={t("boardend.thenNow.thenAria", { by: lensName(model, by()) })} valueText={(_c, v) => lensValue(by(), v, false)}
          />
          <figcaption class="small"><span class="strong">{model.game.first_year}</span> {t("boardend.thenNow.real")}</figcaption>
        </figure>
        <figure class="be-pair-map">
          <MiniMap
            model={model} frame={last()} values={valuesOf(model, last(), by())} scale={scale()} ringed={rows().map((r) => r.code)} showProjects
            label={t("boardend.thenNow.nowAria", { by: lensName(model, by()) })} valueText={(_c, v) => lensValue(by(), v, true)}
          />
          <figcaption class="small"><span class="strong">{model.game.end_year}</span> {t("boardend.thenNow.estimate")}</figcaption>
        </figure>
      </div>
      <h3 class="t-3">{t("boardend.thenNow.most")}</h3>
      <ol class="be-most">
        <For each={rows()}>
          {(r) => (
            <li>
              <span class="strong">{councilName(model, r.code)}</span>{" "}
              <span class="small">{t("boardend.thenNow.change", { from: lensValue(by(), r.from, false), to: lensValue(by(), r.to, true), d: signed(r.delta) })}</span>
            </li>
          )}
        </For>
      </ol>
      <p class="small be-honest">{t("boardend.thenNow.note")}</p>
    </section>
  );
}
