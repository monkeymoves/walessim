/**
 * "Colour the map by" (plain-wales.md section 1.2: never "lens"): the six measures, Backing and
 * "who is behind", and the key as a little stack of offcuts in the map's own colours.
 */
import { For, Show, type JSX } from "solid-js";
import { formatNum, t } from "./lang";
import { DEFAULT_PALETTE, lensLegend } from "../../map";
import { rgbCss } from "../../map/palette";
import { MAP_PALETTE } from "../../ui/atlas/MapView";
import { MEASURE_IDS } from "../engine/api";
import { useGame, type ColourBy } from "./game";
import { backsAtOf, lensFor } from "./mapLinks";
import { measureName } from "./words";

export function ColourKey(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const choices = (): { id: ColourBy; name: string }[] => [
    ...MEASURE_IDS.map((m) => ({ id: m as ColourBy, name: measureName(model, m) })),
    { id: "backing", name: t("boardui.colour.backing") },
    { id: "behind", name: t("boardui.colour.behind") },
    { id: "none", name: t("boardui.colour.none") },
  ];
  const lens = () => {
    const s = game.state();
    return s ? lensFor(model, s, game.colourBy(), backsAtOf(model)) : null;
  };
  const steps = () => {
    const l = lens();
    if (!l) return [];
    const [lo, hi] = l.domain;
    const mids = lensLegend(l, { ...DEFAULT_PALETTE, ...MAP_PALETTE }, 11).filter((_, i) => i % 2 === 1);
    return mids.map((m, i) => ({ colour: rgbCss(m.colour), from: lo + ((hi - lo) * i) / 5, to: lo + ((hi - lo) * (i + 1)) / 5 })).reverse();
  };
  const note = () => {
    const by = game.colourBy();
    if (by === "backing") return t("boardui.colour.backingNote", { n: backsAtOf(model) });
    if (by === "behind") return t("boardui.colour.behindNote");
    if (by === "none") return "";
    return (game.state()?.step ?? 0) > 0 ? t("boardui.colour.estimate") : t("boardui.colour.real");
  };
  const f = (n: number) => formatNum(n, { maximumFractionDigits: 1 });
  return (
    <div class="bw-colour sheet">
      <label class="label bw-colour-label" for="bw-colour-by">{t("boardui.colour.label")}</label>
      <select id="bw-colour-by" class="bw-select" value={game.colourBy()} onChange={(e) => game.setColourBy(e.currentTarget.value as ColourBy)} data-testid="bw-colour">
        <For each={choices()}>{(c) => <option value={c.id}>{c.name}</option>}</For>
      </select>
      <Show when={lens()}>
        <ol class="offcuts bw-offcuts" aria-label={t("boardui.colour.keyAria")}>
          <For each={steps()}>
            {(s, i) => (
              <li style={{ "--sw": s.colour, "--k": 4 - i() }}>
                <i aria-hidden="true" />
                <span class="data small">{game.colourBy() === "behind" ? (i() === 0 ? t("boardui.colour.ahead") : i() === 4 ? t("boardui.colour.behindMost") : "") : t("boardui.colour.range", { a: f(s.from), b: f(s.to) })}</span>
              </li>
            )}
          </For>
          <li class="nodata" style={{ "--k": -1 }}>
            <i aria-hidden="true" />
            <span class="small">{t("boardui.colour.outside")}</span>
          </li>
        </ol>
        <p class="small bw-colour-note">{note()}</p>
      </Show>
    </div>
  );
}
