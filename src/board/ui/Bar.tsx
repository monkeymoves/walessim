/**
 * A measure bar: yarn in the measure's dye wound along ten pegs (design-system 4.6), a small ink
 * tick where it stood in 2026, and a dashed ghost for a preview. Value and change are in the
 * accessible name; colour is never the only signal (the name sits beside it, the pegs count it).
 */
import { Show, type JSX } from "solid-js";
import type { MeasureId } from "../engine/api";
import { MEASURE_YARN } from "./mapLinks";

export interface BarProps {
  measure: MeasureId;
  /** 0 to 10. */
  value: number;
  /** The 2026 value, drawn as a small tick. */
  was?: number;
  /** A previewed change in points (dashed outline, no fill). */
  ghost?: number;
  small?: boolean;
  label?: string;
}

const pct = (v: number) => `${Math.max(0, Math.min(10, v)) * 10}%`;

export function Bar(props: BarProps): JSX.Element {
  const yarn = () => MEASURE_YARN[props.measure];
  const ghostFrom = () => Math.min(props.value, props.value + (props.ghost ?? 0));
  const ghostTo = () => Math.max(props.value, props.value + (props.ghost ?? 0));
  return (
    <span
      class="bw-bar"
      classList={{ "bw-bar-small": !!props.small }}
      role={props.label ? "img" : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : "true"}
      style={{ "--c": `var(--yarn-${yarn()})`, "--cd": `var(--yarn-${yarn()}-deep)`, "--tw": `var(--twist-${yarn()})` }}
    >
      <span class="bw-bar-track">
        <span class="bw-bar-yarn" style={{ width: pct(props.value) }} />
        <Show when={props.ghost && Math.abs(props.ghost) >= 0.05}>
          <span class="bw-bar-ghost" classList={{ down: (props.ghost ?? 0) < 0 }} style={{ left: pct(ghostFrom()), width: `calc(${pct(ghostTo())} - ${pct(ghostFrom())})` }} />
        </Show>
        <Show when={props.was !== undefined}>
          <span class="bw-bar-was" style={{ left: pct(props.was!) }} />
        </Show>
      </span>
      <Show when={!props.small}>
        <span class="bw-bar-pegs" />
      </Show>
    </span>
  );
}
