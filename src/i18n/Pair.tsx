// The bilingual pair (design-system 2.4): the active language leads in the roman of its style,
// the other language sits beneath in Besley italic at four fifths, with no badge or box.
// Where both names are the same, one line only.
import { Show, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Text } from "../model/schema";
import { lang, otherLang, pick } from "./index";

export interface PairProps {
  text: Text | null | undefined;
  /** Element to render (default span). */
  as?: string;
  class?: string;
  id?: string;
  /** Hide the other-language line (for very tight slots). Avoid: the pair is the system. */
  single?: boolean;
  /** Extra content after the lead line, before the other line. */
  children?: JSX.Element;
}

export function Pair(props: PairProps): JSX.Element {
  const lead = () => pick(props.text, lang());
  const other = () => pick(props.text, otherLang());
  const same = () => !props.text || lead().trim().toLowerCase() === other().trim().toLowerCase();
  return (
    <Dynamic component={props.as ?? "span"} class={props.class} id={props.id}>
      <span lang={lang()}>{lead()}</span>
      {props.children}
      <Show when={!props.single && !same()}>
        <OtherLine text={props.text} />
      </Show>
    </Dynamic>
  );
}

/** Only the other-language line, for when the lead is set elsewhere. */
export function OtherLine(props: { text: Text | null | undefined; class?: string }): JSX.Element {
  return (
    <span class={`other${props.class ? " " + props.class : ""}`} lang={otherLang()}>
      {pick(props.text, otherLang())}
    </span>
  );
}
