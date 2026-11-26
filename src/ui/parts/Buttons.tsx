// The four kinds of button (design-system 4.8), each with one meaning.
// Stamp: the one action that commits something on this surface (slate block, Besley).
// Tab: stepping back, opening, anything reversible (paper with an ink keyline).
// Stitch: placing the player's thread on the model. Nowhere else.
// Thread: asking where a number came from (red underline).
import { Show, splitProps, type JSX } from "solid-js";

type BtnProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Why it cannot be pressed, said beside it in Small. Setting it disables the button. */
  why?: string | null;
};

function make(kind: string) {
  return (props: BtnProps): JSX.Element => {
    const [own, rest] = splitProps(props, ["class", "why", "children", "type", "disabled"]);
    const disabled = () => own.disabled || !!own.why;
    return (
      <>
        <button
          {...rest}
          type={own.type ?? "button"}
          class={`btn btn-${kind}${own.class ? " " + own.class : ""}`}
          disabled={disabled()}
          aria-disabled={disabled() ? "true" : undefined}
        >
          {own.children}
        </button>
        <Show when={own.why}>
          <span class="btn-why small">{own.why}</span>
        </Show>
      </>
    );
  };
}

/** Primary: one per surface. */
export const StampButton = make("stamp");
/** Secondary: reversible. */
export const TabButton = make("tab");
/** The player's stitch: placing a thread on the model. */
export const StitchButton = make("stitch");

export interface ThreadButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render as a link instead of a button. */
  href?: string;
}

/** Provenance: "How is this worked out?", "Pull the thread". Red underline. */
export function ThreadButton(props: ThreadButtonProps): JSX.Element {
  const [own, rest] = splitProps(props, ["class", "href", "children", "type"]);
  return (
    <Show
      when={own.href}
      fallback={
        <button {...rest} type={own.type ?? "button"} class={`threadlink${own.class ? " " + own.class : ""}`}>
          {own.children}
        </button>
      }
    >
      <a href={own.href} class={`threadlink${own.class ? " " + own.class : ""}`}>
        {own.children}
      </a>
    </Show>
  );
}

/** The cut close mark: two straight strokes, butt ends. */
export function CloseButton(props: { label: string; onClick: () => void; class?: string }): JSX.Element {
  return (
    <button type="button" class={`btn-close${props.class ? " " + props.class : ""}`} aria-label={props.label} title={props.label} onClick={() => props.onClick()}>
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="butt" fill="none" />
      </svg>
    </button>
  );
}
