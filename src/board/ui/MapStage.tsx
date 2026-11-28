/**
 * The map, large and central (v2-board.md section 3): coloured by one measure at a time, every
 * project drawn on it, the links visible as lines, the warned event marked. Hovering a project in
 * the build menu lights the links its effect travels; two years passing sends beads along them.
 */
import { createEffect, createSignal, on, onCleanup, Show, type JSX } from "solid-js";
import { formatNum, lang, t } from "../../i18n";
import type { HoverInfo, Marker, PaperMap, Stitch } from "../../map";
import type { MapLink } from "../../map/PaperMap";
import { MapView } from "../../ui/atlas/MapView";
import "../../ui/atlas/atlas.css";
import { TipSlip } from "../../ui/parts";
import { geo } from "../../ui/shell/model";
import type { BoardModel, BoardState, ProjectState } from "../engine/api";
import { ColourKey } from "./ColourKey";
import { useGame } from "./game";
import { backsAtOf, lensFor, linksFor } from "./mapLinks";
import { councilName, measureName, outOf10 } from "./words";

/** Where a project sits on the map: its council, or the middle of its link. */
function stitchOf(model: BoardModel, p: Pick<ProjectState, "id" | "project" | "site" | "status">): Stitch | null {
  const def = model.projects.find((d) => d.id === p.project);
  const kind = p.status === "building" ? "generic" : def?.tags.includes("tips") ? "made-safe" : def?.branch && def.tags.includes("nature") ? "planted" : "built";
  if (p.site.council !== undefined) return { id: p.id, at: { la: p.site.council }, kind };
  const l = model.links.find((x) => x.id === p.site.link);
  const a = model.councils.find((c) => c.code === l?.from), b = model.councils.find((c) => c.code === l?.to);
  if (!a || !b) return null;
  return { id: p.id, at: { x: (a.centre[0] + b.centre[0]) / 2, y: (a.centre[1] + b.centre[1]) / 2 }, kind };
}

export function MapStage(): JSX.Element {
  const game = useGame();
  const model = game.model;
  let map: PaperMap | null = null;
  const [hover, setHover] = createSignal<HoverInfo | null>(null);
  const [ready, setReady] = createSignal(false);
  const [beads, setBeads] = createSignal<{ ids: string[]; t: number } | null>(null);

  const onReady = (m: PaperMap) => {
    map = m;
    m.setLayers({ peaks: false, sites: false });
    m.setPadding({ left: 40, right: window.innerWidth <= 1360 ? 356 : 392, top: 4, bottom: 4 });
    m.focusLas(model.game.councils);
    const offs = [
      m.on("hover", (_c, info) => setHover(info && model.game.councils.includes(info.code) ? info : null)),
      m.on("select", (code) => {
        if (game.screen() !== "board") return;
        game.setSelected(code && model.game.councils.includes(code) ? code : null);
      }),
    ];
    onCleanup(() => offs.forEach((f) => f()));
    setReady(true);
  };

  // the colouring, the highlight of the councils in play, and the selection
  createEffect(() => {
    const s = game.state();
    if (!ready() || !map || !s) return;
    const by = game.screen() === "election" ? "backing" : game.colourBy();
    map.setLens(lensFor(model, s, by, backsAtOf(model)));
    map.setHighlight(model.game.councils);
  });
  createEffect(() => { if (ready() && map) map.setSelected(game.selected()); });
  // keep the region clear of the build menu while it is open
  createEffect(on(() => game.sheet() === "build", (open) => { if (ready() && map) map.setPadding({ left: open ? 470 : 40 }); }, { defer: true }));

  // projects as stitches; the warned event as a dashed circle
  createEffect(() => {
    const s = game.state();
    if (!ready() || !map || !s) return;
    map.setStitches(s.projects.map((p) => stitchOf(model, p)).filter((x): x is Stitch => !!x));
    const warn = game.forecast()?.warnings ?? [];
    const markers: Marker[] = warn.flatMap((w) => w.councils.slice(0, 1).flatMap((code) => {
      const c = model.councils.find((x) => x.code === code);
      return c ? [{ id: `warn:${w.event}`, x: c.centre[0], y: c.centre[1], kind: "warning", size: 1.4 }] : [];
    }));
    map.setMarkers(markers);
  });

  // links: at rest, dimmed away from the selection, lit by a preview, with beads while time passes
  createEffect(() => {
    const s = game.state();
    if (!ready() || !map || !s) return;
    const lit = [...(game.preview()?.links ?? []), ...(game.litLink() ? [game.litLink()!] : [])];
    const b = beads();
    const links: MapLink[] = linksFor(model, s, game.selected(), lit).map((l) => (b && b.ids.includes(l.id) ? { ...l, pulse: b.t, state: "rest" } : l));
    map.setLinks(links);
  });

  // two years pass: beads run along the links the effects travelled
  createEffect(on(() => game.screen(), (sc) => {
    if (sc !== "passing") { setBeads(null); return; }
    const r = game.report();
    const s = game.state();
    if (!r || !s) return;
    const ids = travelled(model, s, r.flows.map((f) => f.link), r.finished);
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !ids.length) return;
    let raf = 0;
    const t0 = performance.now(), D = 1300, WAVES = 2;
    const step = (now: number) => {
      const e = (now - t0) / D;
      if (e >= WAVES) { setBeads(null); return; }
      setBeads({ ids, t: e % 1 });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    onCleanup(() => cancelAnimationFrame(raf));
  }));

  // keep the selection in view: zoom to it, back out to the region when cleared
  createEffect(on(() => game.selected(), (code) => {
    if (!ready() || !map) return;
    map.focusLas(code ? [code, ...neighbours(model, code)] : model.game.councils);
  }, { defer: true }));

  const hoverValue = () => {
    const h = hover(), s = game.state();
    if (!h || !s) return "";
    const by = game.colourBy();
    const c = s.councils[h.code];
    if (!c || by === "none" || by === "behind") return t("boardui.map.click");
    if (by === "backing") return t("boardui.map.backing", { n: formatNum(c.backing, { maximumFractionDigits: 1 }) });
    return `${measureName(model, by)}: ${outOf10(c.measures[by], s.turn > 0)}`;
  };

  return (
    <div class="bw-mapstage">
      <MapView geo={geo()!} ariaLabel={t("boardui.map.aria")} onReady={onReady} class="bw-map" />
      <Show when={hover()}>
        <TipSlip heading={lang() === "cy" ? hover()!.cy : hover()!.en} class="maptip bw-maptip" style={{ left: `${hover()!.px + 14}px`, top: `${hover()!.py + 16}px` }}>
          {hoverValue()}
        </TipSlip>
      </Show>
      <ColourKey />
      <p class="bw-status small" role="status">
        {game.selected() ? t("boardui.map.statusSelected", { name: councilName(model, game.selected()) }) : t("boardui.map.status")}
      </p>
    </div>
  );
}

/** Councils one link away, for framing a selection. */
function neighbours(model: BoardModel, code: string): string[] {
  return [...new Set(model.links.filter((l) => l.from === code || l.to === code).map((l) => (l.from === code ? l.to : l.from)))].filter((c) => model.game.councils.includes(c));
}

/** Links to animate: the engine's flows, plus any rail link a finished project sits on. Nothing else is
 * drawn as travelling: a bead means something really moved along that line this turn. */
function travelled(model: BoardModel, s: BoardState, flowLinks: string[], finished: string[]): string[] {
  const linkSites = s.projects.filter((p) => finished.includes(p.id) && p.site.link).map((p) => p.site.link!);
  return [...new Set([...flowLinks, ...linkSites])].filter((id) => model.links.some((l) => l.id === id));
}
