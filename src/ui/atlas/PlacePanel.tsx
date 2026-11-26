// The place panel for an authority (design-system 4.5, widened for Heddiw): name and its pair,
// region, two big figures, then a ledger of headline figures with rank out of 22, the Wales
// value, and a source docket each. The lens figure leads when it is not a headline.
import { For, Show, type JSX } from "solid-js";
import { Pair, pick, t } from "../../i18n";
import type { Authority, CompiledModel } from "../../model/schema";
import { CloseButton, SourceTag } from "../parts";
import { fmt, HEADLINE, PLACE_LAS, rankLine, type AtlasIndicator } from "./data";

export interface PlacePanelProps {
  model: CompiledModel;
  la: Authority;
  indicators: AtlasIndicator[];
  lens: AtlasIndicator;
  onClose: () => void;
  ref?: (el: HTMLElement) => void;
}

export function PlacePanel(props: PlacePanelProps): JSX.Element {
  const codes = () => props.model.authorities.map((a) => a.code);
  const byId = (id: string) => props.indicators.find((i) => i.id === id);
  const region = () => props.model.regions.find((r) => r.id === props.la.region);
  const BIG = ["pop", "welsh_speakers"];
  const big = () => BIG.map(byId).filter((x): x is AtlasIndicator => !!x);
  const rows = () => {
    const rest = HEADLINE.filter((id) => !BIG.includes(id));
    const ids = HEADLINE.includes(props.lens.id) ? rest : [props.lens.id, ...rest];
    return ids.map(byId).filter((x): x is AtlasIndicator => !!x);
  };
  const rankText = (ind: AtlasIndicator) => rankLine(ind, props.la.code, codes());
  const place = () => PLACE_LAS[props.la.code];
  return (
    <section
      class="placepanel sheet"
      aria-labelledby="placepanel-name"
      data-testid="place-panel"
      ref={(el) => props.ref?.(el)}
    >
      <CloseButton label={t("atlas.panel.close")} onClick={props.onClose} class="placepanel-x" />
      <i class="placepanel-pin" aria-hidden="true" />
      <Pair text={props.la.name} as="h2" class="t-1 placepanel-name" id="placepanel-name" />
      <Show when={region()}>
        <p class="small placepanel-region">{pick(region()!.name)}</p>
      </Show>
      <div class="bigfigs">
        <For each={big()}>
          {(ind) => (
            <div classList={{ lensrow: ind.id === props.lens.id }}>
              <b class="figure-big">{fmt(ind, ind.laValues[props.la.code]) ?? t("atlas.noData")}</b>
              <span class="label">{t(`atlas.big.${ind.id}`)}</span>
              <span class="small pl-sub">{rankText(ind)} {t("atlas.panel.wales", { v: fmt(ind, ind.wales) ?? t("atlas.noData") })}</span>
              <For each={ind.sources.slice(0, 1)}>{(s) => <SourceTag source={s} year={ind.year} class="pl-docket" />}</For>
            </div>
          )}
        </For>
      </div>
      <table class="ledger placeledger">
        <caption class="sr-only">{t("atlas.panel.caption", { name: pick(props.la.name) })}</caption>
        <thead class="sr-only">
          <tr>
            <th scope="col">{t("atlas.panel.measure")}</th>
            <th scope="col">{t("atlas.panel.value")}</th>
          </tr>
        </thead>
        <tbody>
          <For each={rows()}>
            {(ind) => {
              const v = () => ind.laValues[props.la.code];
              return (
                <tr classList={{ lensrow: ind.id === props.lens.id }}>
                  <th scope="row">
                    <span class="pl-name">{t(`atlas.short.${ind.id}`)}</span>
                    <span class="pl-sub small">
                      {t(`atlas.headUnit.${ind.id}`)}, {ind.year}. {rankText(ind)} {t("atlas.panel.wales", { v: fmt(ind, ind.wales) ?? t("atlas.noData") })}
                    </span>
                  </th>
                  <td>
                    <span class="pl-value data">
                      <Show when={fmt(ind, v())} fallback={<i class="small">{t("atlas.noData")}</i>}>{fmt(ind, v())}</Show>
                    </span>
                    <For each={ind.sources.slice(0, 1)}>{(s) => <SourceTag source={s} year={ind.year} class="pl-docket" />}</For>
                  </td>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
      <Show when={place()}>
        <div class="placenote">
          <p class="label">{t("atlas.panel.visitHead")}</p>
          <p class="story-small">{t(`atlas.panel.visit.${place()}`)}</p>
        </div>
      </Show>
      <div class="placepanel-foot">
        <p class="small">{t("atlas.panel.official")}</p>
        <a class="inklink small" href="#/llyfr/indicators">{t("atlas.panel.howMeasured")}</a>
      </div>
    </section>
  );
}
