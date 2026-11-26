// The lens key: a little stack of offcuts in the same order as the map's layers (lowest at the
// bottom), break values in tabular figures, the Wales value, "No data" when anything is missing.
import { For, Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import { DEFAULT_PALETTE, lensLegend, type LensSpec } from "../../map";
import { rgbCss } from "../../map/palette";
import { fmt, type AtlasIndicator } from "./data";
import { MAP_PALETTE } from "./MapView";

export function LensKey(props: { indicator: AtlasIndicator; lens: LensSpec; missing: number }): JSX.Element {
  const steps = () => lensLegend(props.lens, { ...DEFAULT_PALETTE, ...MAP_PALETTE }, 5).slice().reverse();
  const direction = () =>
    props.indicator.higherIsBetter === true ? t("atlas.key.higherBetter") : props.indicator.higherIsBetter === false ? t("atlas.key.lowerBetter") : t("atlas.key.noDirection");
  return (
    <div class="lenskey sheet" aria-label={t("atlas.key.label")} role="group">
      <ol class="offcuts">
        <For each={steps()}>
          {(s, i) => (
            <li style={{ "--sw": rgbCss(s.colour), "--k": 4 - i() }}>
              <i aria-hidden="true" />
              <span class="data">{fmt(props.indicator, s.value)}</span>
            </li>
          )}
        </For>
        <Show when={props.missing > 0}>
          <li class="nodata" style={{ "--k": -1 }}>
            <i aria-hidden="true" />
            <span>{t("atlas.key.noData")}</span>
          </li>
        </Show>
      </ol>
      <p class="small lenskey-wales">
        <span class="strong">{t("atlas.wales")}</span> <span class="data">{fmt(props.indicator, props.indicator.wales) ?? t("atlas.noData")}</span>
      </p>
      <p class="small">{direction()}</p>
    </div>
  );
}
