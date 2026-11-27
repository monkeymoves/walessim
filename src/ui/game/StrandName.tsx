// A strand named as the design asks: its yarn snippet beside the name, with the Welsh line under
// the English (in Cymraeg, the Welsh name alone).
import type { JSX } from "solid-js";
import { Pair, hasKey, lang, textOf } from "../../i18n";
import { Snip } from "../parts/Notice";
import type { StrandId } from "../../engine/api";

export function StrandName(props: { strand: StrandId; frays?: boolean; class?: string }): JSX.Element {
  const text = () => (hasKey(`parts.strand.${props.strand}`) ? textOf(`parts.strand.${props.strand}`) : { en: props.strand, cy: props.strand });
  return (
    <span class={`yf-strandname${props.class ? " " + props.class : ""}`}>
      <Snip strand={props.strand} frays={props.frays} />
      {/* in Cymraeg the Welsh name stands alone: no English gloss under it (cold playtest 6) */}
      <Pair text={text()} class="yf-strandname-pair" single={lang() === "cy"} />
    </span>
  );
}
