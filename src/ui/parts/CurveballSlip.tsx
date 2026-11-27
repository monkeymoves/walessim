// The curveball slip (design-system 4.4): slate-coloured paper pinned with a brass pin, torn
// along the bottom, set at minus 1.3 degrees. The only torn, angled thing on the board.
// It slides down 24px once when it arrives; with reduced motion it is simply there.
import { Show, type JSX } from "solid-js";
import { Pair, t } from "../../i18n";
import type { Text } from "../../model/schema";

export interface CurveballSlipProps {
  title: Text;
  /** What it does, in plain words ("Raises coal tip risk"). */
  ripple?: string;
  /** The line above the title; defaults to "From the horizon scan". */
  from?: string;
  /** Extra content under the ripple (a choice for a shock card). */
  children?: JSX.Element;
  /** Animate arrival (once). */
  arriving?: boolean;
  class?: string;
}

export function CurveballSlip(props: CurveballSlipProps): JSX.Element {
  return (
    <div class={`slipwrap${props.arriving ? " arriving" : ""}${props.class ? " " + props.class : ""}`}>
      <i class="pin" aria-hidden="true" />
      <article class="slip on-slate">
        <p class="slip-from">{props.from ?? t("parts.slip.from")}</p>
        <Pair text={props.title} as="h3" class="slip-title" />
        <Show when={props.ripple}>
          <p class="ripple">{props.ripple}</p>
        </Show>
        {props.children}
      </article>
    </div>
  );
}
