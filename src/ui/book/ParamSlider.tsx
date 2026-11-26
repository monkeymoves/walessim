// "Change this parameter": a slate knob on a ruled paper scale with tick marks and tabular
// figures. A changed value carries the player's cobalt stitch beneath and a "Put back" tab.
// Every change is stored as an override and the whole app shows the modified rule set badge.
import { createUniqueId, For, Show, type JSX } from "solid-js";
import { formatNum, pick, t, hasKey } from "../../i18n";
import type { Param } from "../../model/schema";
import { TabButton } from "../parts";
import { decimalsFor, stepFor } from "./names";
import { clearOverride, overrides, setOverride } from "./overrides";

export function ParamSlider(props: { ruleId: string; name: string; param: Param }): JSX.Element {
  const id = createUniqueId();
  const key = () => `${props.ruleId}.${props.name}`;
  const p = () => props.param;
  const lo = () => Math.min(p().min, p().max);
  const hi = () => Math.max(p().min, p().max);
  const dp = () => decimalsFor(lo(), hi());
  const value = () => overrides()[key()] ?? p().default;
  const changed = () => key() in overrides();
  const f = (v: number) => formatNum(v, { minimumFractionDigits: dp(), maximumFractionDigits: dp() });
  const pos = (v: number) => (hi() > lo() ? ((v - lo()) / (hi() - lo())) * 100 : 50);
  const label = () => (hasKey(`book.param.${props.name}`) ? t(`book.param.${props.name}`) : props.name);
  return (
    <div class="param" classList={{ changed: changed(), fixed: !p().adjustable }} data-testid={`param-${key()}`}>
      <div class="param-head">
        <label class="label" for={id}>{label()}</label>
        <span class="small">{pick(p().unit)}</span>
        <span class="param-value data" aria-hidden="true">{f(value())}</span>
      </div>
      <Show
        when={p().adjustable}
        fallback={<p class="small param-fixed">{t("book.slider.fixed", { v: f(p().default) })}</p>}
      >
        <div class="scale" style={{ "--d": `${pos(p().default)}%` }}>
          <input
            id={id}
            type="range"
            min={lo()}
            max={hi()}
            step={stepFor(lo(), hi())}
            value={value()}
            aria-valuetext={t("book.slider.valuetext", { v: f(value()), unit: pick(p().unit), d: f(p().default) })}
            onInput={(e) => setOverride(key(), Number(e.currentTarget.value), p().default)}
          />
          <i class="scale-default" aria-hidden="true" />
        </div>
        <div class="scale-figures small data" aria-hidden="true">
          <span>{f(lo())}</span>
          <span class="scale-def">{t("book.slider.default", { v: f(p().default) })}</span>
          <span>{f(hi())}</span>
        </div>
        <Show when={changed()}>
          <div class="param-changed">
            <span class="stitchline" aria-hidden="true" />
            <span class="small">{t("book.slider.changed", { v: f(p().default) })}</span>
            <TabButton onClick={() => clearOverride(key())}>{t("book.slider.putBack")}</TabButton>
          </div>
        </Show>
        <Show when={p().placeholder}>
          <p class="small param-note">{t("book.slider.placeholder")}</p>
        </Show>
      </Show>
    </div>
  );
}

/** Small read-only list of a rule's parameters for tables. */
export function ParamList(props: { params: Record<string, Param> }): JSX.Element {
  return (
    <For each={Object.entries(props.params)}>
      {([n, p]) => (
        <span class="paramchip small data">
          {hasKey(`book.param.${n}`) ? t(`book.param.${n}`) : n} {formatNum(p.default, { maximumFractionDigits: 3 })}
        </span>
      )}
    </For>
  );
}
