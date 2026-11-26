// Heddiw: the atlas of the 22 authorities on the paper relief map. One lens at a time tints the
// map; hover an authority for its value; select it for the place panel; the explorer drawer
// holds a sortable ledger and a scatter, linked to the map both ways.
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { lang, pick, t } from "../../i18n";
import type { PaperMap, HoverInfo } from "../../map";
import type { CompiledModel } from "../../model/schema";
import { CloseButton, TabButton, TipSlip } from "../parts";
import { navigate } from "../shell/router";
import { useNarrow } from "../shell/viewport";
import type { WalesGeo } from "../../map";
import { atlasIndicators, DEFAULT_LENS, fmt, HEADLINE, lensFor, rankLine } from "./data";
import { ExplorerTable } from "./ExplorerTable";
import { LensKey } from "./LensKey";
import { LensPicker } from "./LensPicker";
import { MapView } from "./MapView";
import { PlacePanel } from "./PlacePanel";
import { Scatter } from "./Scatter";
import "./atlas.css";

const LENS_KEY = "etifeddiaeth.v1.atlas.lens";
const COLS_KEY = "etifeddiaeth.v1.atlas.columns";

function stored<T>(key: string, fallback: T, ok: (v: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) { const v = JSON.parse(raw) as unknown; if (ok(v)) return v as T; }
  } catch { /* storage blocked */ }
  return fallback;
}
function store(key: string, v: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked */ }
}

export interface AtlasProps {
  model: CompiledModel;
  geo: WalesGeo;
  /** Selected authority from the route (#/heddiw/<code>). */
  selected: string | null;
}

export function Atlas(props: AtlasProps): JSX.Element {
  const indicators = createMemo(() => atlasIndicators(props.model));
  const ids = () => indicators().map((i) => i.id);
  const codes = () => props.model.authorities.map((a) => a.code);
  const narrow = useNarrow();

  const [lensId, setLensId] = createSignal<string>(stored(LENS_KEY, DEFAULT_LENS, (v) => typeof v === "string"));
  const lens = () => indicators().find((i) => i.id === lensId()) ?? indicators().find((i) => i.id === DEFAULT_LENS) ?? indicators()[0]!;
  const lensSpec = createMemo(() => lensFor(lens()));
  const [columns, setColumns] = createSignal<string[]>(stored(COLS_KEY, [...HEADLINE], (v) => Array.isArray(v) && v.every((x) => typeof x === "string")));
  const cols = () => columns().filter((c) => ids().includes(c));
  const [axes, setAxes] = createSignal<[string, string]>(["earnings", "life_exp"]);
  const [explorer, setExplorer] = createSignal<"closed" | "table" | "scatter">("closed");
  const [hot, setHot] = createSignal<string | null>(null);
  const [hover, setHover] = createSignal<HoverInfo | null>(null);
  const [kbd, setKbd] = createSignal<string | null>(null);
  const [map, setMap] = createSignal<PaperMap | null>(null);
  let stage!: HTMLDivElement;
  let panelEl: HTMLElement | null = null;

  const selectedLa = () => props.model.authorities.find((a) => a.code === props.selected) ?? null;
  const select = (code: string | null) => navigate(code ? `#/heddiw/${code}` : "#/heddiw", true);

  // map wiring
  const ready = (m: PaperMap) => {
    setMap(m);
    const offHover = m.on("hover", (code, info) => {
      setHot(code);
      setHover(info);
    });
    const offSelect = m.on("select", (code) => select(code));
    onCleanup(() => { offHover(); offSelect(); });
  };
  createEffect(() => { const m = map(); if (m) { m.setLens(lensSpec()); } });
  createEffect(() => { const m = map(); if (m) m.setSelected(props.selected); });
  createEffect(() => {
    const m = map();
    if (!m) return;
    const right = !narrow() && explorer() !== "closed" ? 640 : 24;
    m.setPadding({ left: narrow() ? 12 : 330, right, top: 16, bottom: narrow() ? 12 : 16 });
  });
  // the red thread from the selected authority to the panel's pin
  const placeThread = () => {
    const m = map();
    if (!m) return;
    if (!props.selected || !panelEl || narrow()) { m.setThread(null); return; }
    const sr = stage.getBoundingClientRect(), pr = panelEl.getBoundingClientRect();
    m.setThread({ la: props.selected, to: [pr.right - sr.left + 2, pr.top - sr.top + 34] });
  };
  createEffect(() => { void props.selected; void lang(); void map(); void lensId(); queueMicrotask(placeThread); });
  // Escape closes the drawer first, then the place panel
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (explorer() !== "closed" && !narrow()) setExplorer("closed");
    else if (props.selected) select(null);
  };
  document.addEventListener("keydown", onKey);
  onCleanup(() => document.removeEventListener("keydown", onKey));
  onMount(() => {
    const ro = new ResizeObserver(() => placeThread());
    ro.observe(stage);
    onCleanup(() => ro.disconnect());
  });

  // links from the explorer to the map: lift the authority as if hovered
  const linkHot = (code: string | null) => {
    setHot(code);
    map()?.focusLa(code);
  };

  const changeLens = (id: string) => { setLensId(id); store(LENS_KEY, id); };
  const changeCols = (c: string[]) => { setColumns(c); store(COLS_KEY, c); };

  // keyboard: an ordered list of the authorities, arrow keys move by the map's neighbours
  const order = () => map()?.laOrder ?? codes();
  const laName = (code: string) => pick(props.model.authorities.find((a) => a.code === code)?.name);
  let kbdList!: HTMLOListElement;
  const focusCode = (code: string) => (kbdList.querySelector(`[data-code="${code}"]`) as HTMLButtonElement | null)?.focus();
  const kbdKey = (e: KeyboardEvent, code: string) => {
    const dir = ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" } as const)[e.key as "ArrowUp"];
    if (dir) {
      e.preventDefault();
      const next = map()?.neighbour(code, dir);
      if (next) focusCode(next);
    }
  };

  const hoverValue = () => {
    const h = hover();
    if (!h) return null;
    return { name: lang() === "cy" ? h.cy : h.en, v: fmt(lens(), lens().laValues[h.code]), r: rankLine(lens(), h.code, codes()) };
  };

  return (
    <div class="atlas" classList={{ narrow: narrow(), drawer: explorer() !== "closed" }} data-testid="atlas">
      <h1 class="sr-only">{t("atlas.title")}</h1>
      <div class="stage well" ref={stage}>
        <MapView geo={props.geo} ariaLabel={t("atlas.mapAria", { lens: pick(lens().name) })} onReady={ready} class="atlas-map" />

        <Show when={hover() && hoverValue()}>
          <TipSlip
            heading={hoverValue()!.name}
            class={`maptip${hover()!.source === "keyboard" && kbd() ? " kbd" : ""}`}
            style={{ left: `${Math.min(hover()!.px + 14, (stage?.clientWidth ?? 9999) - 260)}px`, top: `${hover()!.py + 16}px` }}
          >
            <span class="data">{hoverValue()!.v ?? t("atlas.noData")}</span> {t(`atlas.short.${lens().id}`)}
            <br />
            {hoverValue()!.r}
          </TipSlip>
        </Show>

        <div class="float-lens">
          <LensPicker indicators={indicators()} current={lens()} onChange={changeLens} />
        </div>
        <div class="float-key">
          <LensKey indicator={lens()} lens={lensSpec()} missing={codes().length - Object.keys(lens().laValues).length} />
          <Show when={!narrow()}>
            <TabButton class="explorer-open" aria-expanded={explorer() !== "closed"} aria-controls="explorer" onClick={() => setExplorer(explorer() === "closed" ? "table" : "closed")} data-testid="explorer-toggle">
              {explorer() === "closed" ? t("atlas.explorer.open") : t("atlas.explorer.close")}
            </TabButton>
          </Show>
        </div>

        <Show when={selectedLa()}>
          <div class="float-panel">
            <PlacePanel
              model={props.model}
              la={selectedLa()!}
              indicators={indicators()}
              lens={lens()}
              onClose={() => select(null)}
              ref={(el) => { panelEl = el; queueMicrotask(placeThread); }}
            />
          </div>
        </Show>

        <nav class="kbdlist" aria-label={t("atlas.kbd.label")}>
          <p class="sr-only">{t("atlas.kbd.help")}</p>
          <ol ref={kbdList}>
            <For each={order()}>
              {(code) => (
                <li>
                  <button
                    type="button"
                    class="sr-only kbd-la"
                    data-code={code}
                    aria-current={props.selected === code ? "true" : undefined}
                    onFocus={() => { setKbd(code); map()?.focusLa(code); }}
                    onBlur={() => { setKbd(null); map()?.focusLa(null); }}
                    onKeyDown={(e) => kbdKey(e, code)}
                    onClick={() => select(code)}
                  >
                    {laName(code)}
                    <Show when={fmt(lens(), lens().laValues[code])}>, {fmt(lens(), lens().laValues[code])} {t(`atlas.short.${lens().id}`)}</Show>
                  </button>
                </li>
              )}
            </For>
          </ol>
        </nav>

        <Show when={explorer() !== "closed" || narrow()}>
          <section class="explorer" id="explorer" classList={{ "sheet-held": !narrow(), sheet: narrow() }} aria-labelledby="explorer-title" data-testid="explorer">
            <header class="explorer-head">
              <h2 class="t-1" id="explorer-title">{t("atlas.explorer.title")}</h2>
              <div class="explorer-tabs well" role="tablist" aria-label={t("atlas.explorer.views")}>
                <button type="button" role="tab" class="langtoggle-tab" aria-selected={explorer() !== "scatter"} onClick={() => setExplorer("table")} data-testid="tab-table">
                  {t("atlas.explorer.table")}
                </button>
                <button type="button" role="tab" class="langtoggle-tab" aria-selected={explorer() === "scatter"} onClick={() => setExplorer("scatter")} data-testid="tab-scatter">
                  {t("atlas.explorer.scatter")}
                </button>
              </div>
              <Show when={!narrow()}>
                <CloseButton label={t("atlas.explorer.close")} onClick={() => setExplorer("closed")} />
              </Show>
            </header>
            <Show
              when={explorer() === "scatter"}
              fallback={
                <ExplorerTable
                  authorities={props.model.authorities}
                  indicators={indicators()}
                  columns={cols()}
                  onColumns={changeCols}
                  hot={hot()}
                  selected={props.selected}
                  onHot={linkHot}
                  onSelect={(c) => select(c)}
                />
              }
            >
              <Scatter
                authorities={props.model.authorities}
                indicators={indicators()}
                x={axes()[0]}
                y={axes()[1]}
                onAxes={(x, y) => setAxes([x, y])}
                hot={hot()}
                selected={props.selected}
                onHot={linkHot}
                onSelect={(c) => select(c)}
              />
            </Show>
          </section>
        </Show>
      </div>
      <footer class="atlas-foot small">
        <p>{t("atlas.foot.honest")}</p>
        <p>{t("atlas.foot.attribution")}</p>
      </footer>
    </div>
  );
}
