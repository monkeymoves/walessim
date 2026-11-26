// Notices: a warning is a hatched tab and plain words on warn paper; the worst news is a
// black-edged notice in Besley. Neither is red.
import type { JSX } from "solid-js";

export function WarnStrip(props: { children: JSX.Element; class?: string; role?: "status" | "alert" | "note" }): JSX.Element {
  return (
    <div class={`warnstrip${props.class ? " " + props.class : ""}`} role={props.role}>
      <span>{props.children}</span>
    </div>
  );
}

export function SevereNotice(props: { children: JSX.Element; class?: string }): JSX.Element {
  return <div class={`severe${props.class ? " " + props.class : ""}`} role="status">{props.children}</div>;
}

/** A yarn snippet, the mini strand form (20 by 7px), for tickets and tables. */
export function Snip(props: { strand: string; frays?: boolean }): JSX.Element {
  return (
    <i
      class={`snip${props.frays ? " frays" : ""}`}
      aria-hidden="true"
      style={{ "--c": `var(--yarn-${props.strand})`, "--cd": `var(--yarn-${props.strand}-deep)`, "--tw": `var(--twist-${props.strand})` }}
    />
  );
}
