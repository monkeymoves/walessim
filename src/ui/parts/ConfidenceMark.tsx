// Confidence as words plus a stack of one to three offcut sheets ("Confidence: medium").
import { For, type JSX } from "solid-js";
import { t } from "../../i18n";
import type { Confidence } from "../../model/schema";

const COUNT: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };

export function ConfidenceMark(props: { level: Confidence; class?: string; bare?: boolean }): JSX.Element {
  const n = () => COUNT[props.level] ?? 1;
  return (
    <span class={`confidence${props.class ? " " + props.class : ""}`}>
      <span class="confidence-stack" aria-hidden="true">
        <For each={[0, 1, 2]}>{(i) => <i classList={{ on: i < n() }} />}</For>
      </span>
      <span class="label confidence-word">
        {props.bare ? t(`parts.confidence.${props.level}`) : t("parts.confidence.line", { level: t(`parts.confidence.${props.level}`) })}
      </span>
    </span>
  );
}
