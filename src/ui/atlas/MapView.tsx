// Mounts the framework-free PaperMap in a Solid component and keeps its language in step.
// The lens ramps are the design system's (peat sequential, woad to peat diverging), never red.
import { createEffect, onCleanup, onMount, type JSX } from "solid-js";
import { PaperMap, type Padding, type WalesGeo } from "../../map";
import { lang } from "../../i18n";

/** Lens ramps from tokens.css section 8, passed to the map as palette overrides. */
export const MAP_PALETTE = {
  lensSeq: ["#F1EBD8", "#E0CFA3", "#C9A968", "#A67C3C", "#6E4A1E"],
  lensDiv: ["#2C5778", "#7FA3BC", "#F1EEE2", "#BF8E45", "#7A4E1C"],
  lensDivNeutral: ["#2C5778", "#7FA3BC", "#F1EEE2", "#BF8E45", "#7A4E1C"],
};

export interface MapViewProps {
  geo: WalesGeo;
  ariaLabel: string;
  padding?: Partial<Padding>;
  class?: string;
  onReady: (map: PaperMap) => void;
  children?: JSX.Element;
}

export function MapView(props: MapViewProps): JSX.Element {
  let host!: HTMLDivElement;
  let map: PaperMap | null = null;
  onMount(() => {
    map = new PaperMap(host, {
      geo: props.geo,
      lang: lang(),
      ariaLabel: props.ariaLabel,
      padding: props.padding,
    });
    // the bridge stylesheet (src/styles/map-bridge.css) is in place by now; read it once more
    // after the first frame and again when the fonts have loaded, so labels use Archivo and Besley
    requestAnimationFrame(() => map?.refreshPalette());
    document.fonts?.ready.then(() => map?.refreshPalette()).catch(() => undefined);
    props.onReady(map);
  });
  createEffect(() => {
    const l = lang();
    map?.setLang(l);
  });
  createEffect(() => {
    map?.setAriaLabel(props.ariaLabel);
  });
  onCleanup(() => {
    map?.destroy();
    map = null;
  });
  return (
    <div class={`mapview${props.class ? " " + props.class : ""}`}>
      <div class="mapview-host" ref={host} />
      {props.children}
    </div>
  );
}
