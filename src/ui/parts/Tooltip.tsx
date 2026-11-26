// Tooltips (design-system 4.11): small slate slips with a cut notch, after 400ms of hover,
// at once on keyboard focus, closed by Escape. Never the only place a fact lives: whatever is
// here must also be in the subject's accessible name or reachable by click.
import { createSignal, onCleanup, Show, type JSX } from "solid-js";

export interface TooltipProps {
  /** Optional heading in Besley 600. */
  heading?: string;
  content: JSX.Element;
  children: JSX.Element;
  /** Below the subject (default) or above it. */
  placement?: "below" | "above";
  class?: string;
  /** Show the tip regardless of hover (for controlled use). */
  open?: boolean;
}

export function Tooltip(props: TooltipProps): JSX.Element {
  const [shown, setShown] = createSignal(false);
  let timer = 0;
  const later = () => { clearTimeout(timer); timer = window.setTimeout(() => setShown(true), 400); };
  const hide = () => { clearTimeout(timer); setShown(false); };
  onCleanup(() => clearTimeout(timer));
  return (
    <span
      class={`tip-host${props.class ? " " + props.class : ""}`}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") later(); }}
      onPointerLeave={hide}
      onFocusIn={(e) => { if ((e.target as HTMLElement).matches(":focus-visible")) setShown(true); }}
      onFocusOut={hide}
      onKeyDown={(e) => { if (e.key === "Escape") hide(); }}
    >
      {props.children}
      <Show when={shown() || props.open}>
        <TipSlip heading={props.heading} placement={props.placement}>{props.content}</TipSlip>
      </Show>
    </span>
  );
}

/** The slip itself, for tooltips positioned by their owner (the map). */
export function TipSlip(props: {
  heading?: string;
  children: JSX.Element;
  placement?: "below" | "above";
  style?: JSX.CSSProperties;
  class?: string;
}): JSX.Element {
  return (
    <span
      role="tooltip"
      class={`tip on-slate tip-${props.placement ?? "below"}${props.class ? " " + props.class : ""}`}
      style={props.style}
    >
      <Show when={props.heading}>
        <b class="tip-head">{props.heading}</b>
      </Show>
      <span class="tip-body">{props.children}</span>
    </span>
  );
}
