// The title screen. The paper Wales of 2026 settles onto the board; the name in Besley 800;
// the hook; three ways in; and along the foot, the generation from 2026 to a sealed letter in
// 2050. Touching any authority opens it in the atlas.
import { createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import { lang, pick, t, textOf } from "../../i18n";
import type { HoverInfo, PaperMap, WalesGeo } from "../../map";
import { MapView } from "../atlas/MapView";
import "../atlas/atlas.css";
import { Icon, LangToggle, StampButton, TabButton, TipSlip } from "../parts";
import { navigate } from "./router";
import { hasSavedGame } from "./saves";
import { useNarrow } from "./viewport";

const TICKS = [2026, 2030, 2034, 2038, 2042, 2046, 2050];

export function TitleScreen(props: { geo: WalesGeo | null }): JSX.Element {
  const narrow = useNarrow();
  const [hover, setHover] = createSignal<HoverInfo | null>(null);
  const saved = hasSavedGame();
  const ready = (m: PaperMap) => {
    m.setPadding({ left: narrow() ? 12 : Math.min(620, window.innerWidth * 0.42), right: 40, top: 24, bottom: 24 });
    const offs = [
      m.on("hover", (_c, info) => setHover(info)),
      m.on("select", (code) => { if (code) navigate(`#/heddiw/${code}`); }),
    ];
    onCleanup(() => offs.forEach((f) => f()));
  };
  return (
    <div class="title" classList={{ narrow: narrow() }}>
      <Show when={props.geo}>
        <MapView geo={props.geo!} ariaLabel={t("shell.title.mapAria")} onReady={ready} class="title-map" />
      </Show>
      <Show when={hover()}>
        <TipSlip heading={lang() === "cy" ? hover()!.cy : hover()!.en} class="maptip" style={{ left: `${hover()!.px + 14}px`, top: `${hover()!.py + 16}px` }}>
          {t("shell.title.touch")}
        </TipSlip>
      </Show>

      <main class="title-sheet sheet" aria-labelledby="title-name">
        <div class="title-lang"><LangToggle /></div>
        <h1 class="t-poster title-name" id="title-name" lang="cy">Etifeddiaeth</h1>
        {/* in Cymraeg the subtitle is Welsh only (cold playtest 6) */}
        <p class="title-sub">
          <span lang="cy">{pick(textOf("shell.subtitle"), "cy")}</span>
          <Show when={lang() === "en"}><span lang="en">{pick(textOf("shell.subtitle"), "en")}</span></Show>
        </p>
        <p class="title-hook story">{t("shell.title.hook")}</p>
        <ul class="title-ways">
          <Show when={saved}>
            <li>
              <StampButton onClick={() => navigate("#/yfory")} data-testid="resume">{t("shell.title.resume")}</StampButton>
              <span class="small">{t("shell.title.resumeNote")}</span>
            </li>
          </Show>
          <li>
            <Show when={!saved} fallback={<TabButton onClick={() => navigate("#/yfory")}>{t("shell.title.play")}</TabButton>}>
              <StampButton onClick={() => navigate("#/yfory")} data-testid="way-yfory">{t("shell.title.play")}</StampButton>
            </Show>
            <span class="small">{t("shell.title.playNote")}</span>
          </li>
          <li>
            <TabButton onClick={() => navigate("#/bwrdd")} data-testid="way-bwrdd">{t("boardui.title.try")}</TabButton>
            <span class="small">{t("boardui.title.tryNote")}</span>
          </li>
          <li>
            <TabButton onClick={() => navigate("#/heddiw")} data-testid="way-heddiw">{t("shell.title.explore")}</TabButton>
            <span class="small">{t("shell.title.exploreNote")}</span>
          </li>
          <li>
            <TabButton onClick={() => navigate("#/llyfr")} data-testid="way-llyfr">{t("shell.title.read")}</TabButton>
            <span class="small">{t("shell.title.readNote")}</span>
          </li>
        </ul>
        <p class="title-honest small">{t("shell.title.honest")}</p>
      </main>

      <div class="title-line strip" aria-label={t("shell.title.lineAria")} role="img">
        <div class="tl-heddiw"><span class="tl-era print">{t("play2.era.heddiw")}</span></div>
        <div class="tl-yfory"><span class="tl-era print">{t("play2.era.yfory")}</span></div>
        <For each={TICKS}>
          {(y, i) => (
            <span class="tl-tick small data" style={{ left: `calc(var(--tl-start) + (100% - var(--tl-start) - var(--tl-end)) * ${i() / (TICKS.length - 1)})` }}>{y}</span>
          )}
        </For>
        <span class="tl-now" aria-hidden="true" />
        <span class="tl-letter" aria-hidden="true">
          <Icon name="envelope" size={30} />
        </span>
        <span class="tl-letter-note small">{t("shell.title.letter")}</span>
      </div>
      <p class="title-foot small">{t("shell.title.attribution")} <a class="inklink" href="#/llyfr/attributions">{t("shell.title.sources")}</a></p>
    </div>
  );
}
