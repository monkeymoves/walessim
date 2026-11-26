// A strand named as the design asks: its yarn snippet beside the name, with the other-language line.
import type { JSX } from "solid-js";
import { Pair, hasKey, textOf } from "../../i18n";
import { Snip } from "../parts/Notice";
import type { StrandId } from "../../engine/api";

export function StrandName(props: { strand: StrandId; frays?: boolean; class?: string }): JSX.Element {
  const text = () => (hasKey(`parts.strand.${props.strand}`) ? textOf(`parts.strand.${props.strand}`) : { en: props.strand, cy: props.strand });
  return (
    <span class={`yf-strandname${props.class ? " " + props.class : ""}`}>
      <Snip strand={props.strand} frays={props.frays} />
      <Pair text={text()} class="yf-strandname-pair" />
    </span>
  );
}
