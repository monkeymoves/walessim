/**
 * The map, large and central (v2-board.md section 3, 16.2.3): coloured by one measure at a time,
 * every working project stitched on it, builds under way as filling rings, councils on the rise
 * or slipping marked, the links as lines. While the clock runs, what travelled along a link in
 * the last step runs along it as a bead; paused, nothing moves. Hovering a project in the build
 * menu lights the links its effect would travel.
 */
import { createEffect, createSignal, on, onCleanup, Show, type JSX } from "solid-js";
import { lang, t } from "./lang";
import type { HoverInfo, Marker, PaperMap, Stitch } from "../../map";
import type { MapLink } from "../../map/PaperMap";
import { MapView } from "../../ui/atlas/MapView";
import "../../ui/atlas/atlas.css";
import { TipSlip } from "../../ui/parts";
import { geo } from "../../ui/shell/model";
import type { BoardModel, ProjectState } from "../engine/api";
import { ColourKey } from "./ColourKey";
import { useGame } from "./game";
import { MapMarks } from "./MapMarks";
import { backsAtOf, lensFor, linksFor } from "./mapLinks";
import { backingShown, measureName, num, outOf10 } from "./words";

/** Where a working project sits on the map: its council, or the middle of its link. */
function stitchOf(model: BoardModel, p: Pick<ProjectState, "id" | "project" | "site" | "status">): Stitch | null {
  const def = model.projects.find((d) => d.id === p.project);
  const kind = def?.tags.includes("tips") ? "made-safe" : def?.tags.includes("nature") ? "planted" : "built";
  if (p.site.council !== undefined) return { id: p.id, at: { la: p.site.council }, kind };
  const l = model.links.find((x) => x.id === p.site.link);
  const a = model.councils.find((c) => c.code === l?.from), b = model.councils.find((c) => c.code === l?.to);
  if (!a || !b) return null;
  return { id: p.id, at: { x: (a.centre[0] + b.centre[0]) / 2, y: (a.centre[1] + b.centre[1]) / 2 }, kind };
}

/** Councils one link away, for framing a selection. */
function neighbours(model: BoardModel, code: string): string[] {
  return [...new Set(model.links.filter((l) => l.from === code || l.to === code).map((l) => (l.from === code ? l.to : l.from)))].filter((c) => model.game.councils.includes(c));
}

export function MapStage(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const [map, setMap] = createSignal<PaperMap | null>(null);
  const [hover, setHover] = createSignal<HoverInfo | null>(null);
  /** Bumped when the map's view changes (zoom, resize), so the marks follow it. */
  const [view, setView] = createSignal(0);
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** True while the map eases to a new view: the marks hide, so none shows at a stale place. */
  const [moving, setMoving] = createSignal(false);
  let viewTimer = 0;
  const bumpLater = (ms = 470) => {
    clearTimeout(viewTimer);
    if (ms >= 200) setMoving(true);
    viewTimer = window.setTimeout(() => { setView((n) => n + 1); setMoving(false); }, ms);
  };
  onCleanup(() => clearTimeout(viewTimer));
  const rightPad = () => (window.innerWidth <= 1360 ? 356 : 392);

  const onReady = (m: PaperMap) => {
    m.setLayers({ peaks: false, sites: false });
    m.setPadding({ left: 40, right: rightPad(), top: 4, bottom: 4 });
    m.focusLas(model.game.councils);
    const offs = [
      m.on("hover", (_c, info) => setHover(info && model.game.councils.includes(info.code) ? info : null)),
      m.on("select", (code) => {
        if (game.screen() !== "board") return;
        game.setSelected(code && model.game.councils.includes(code) ? code : null);
      }),
    ];
    const ro = new ResizeObserver(() => bumpLater(60));
    ro.observe(m.root);
    onCleanup(() => { offs.forEach((f) => f()); ro.disconnect(); });
    setMap(m);
    bumpLater(60);
  };

  // the colouring and the highlight of the councils in play
  createEffect(() => {
    const s = game.state(), m = map();
    if (!m || !s) return;
    m.setLens(lensFor(model, s, game.colourBy(), backsAtOf(model)));
    m.setHighlight(model.game.councils);
  });
  createEffect(() => map()?.setSelected(game.selected()));
  // keep the region clear of the build menu while it is open
  createEffect(on(() => game.sheet() === "build", (open) => { map()?.setPadding({ left: open ? 470 : 40 }); bumpLater(); }, { defer: true }));

  // working projects as stitches (builds under way are rings, in MapMarks); warned events as dashed circles
  createEffect(() => {
    const s = game.state(), m = map();
    if (!m || !s) return;
    m.setStitches(s.projects.filter((p) => p.status !== "building").map((p) => stitchOf(model, p)).filter((x): x is Stitch => !!x));
    const warn = game.forecast()?.warnings ?? [];
    const markers: Marker[] = warn.flatMap((w) => w.councils.slice(0, 1).flatMap((code) => {
      const c = model.councils.find((x) => x.code === code);
      return c ? [{ id: `warn:${w.event}`, x: c.centre[0], y: c.centre[1], kind: "warning", size: 1.4 }] : [];
    }));
    m.setMarkers(markers);
  });

  // links: at rest, dimmed away from the selection, lit by a preview; beads only while the clock runs
  const pulsed = () => {
    if (reduced || !game.clock.running()) return null;
    const r = game.clock.last();
    if (!r || !r.flows.length) return null;
    return new Map(r.flows.map((f) => [f.link, f.from]));
  };
  createEffect(() => {
    const s = game.state(), m = map();
    if (!m || !s) return;
    const lit = [...(game.preview()?.links ?? []), ...(game.litLink() ? [game.litLink()!] : [])];
    const beads = pulsed();
    const p = beads ? game.clock.progress() : null;
    const links: MapLink[] = linksFor(model, s, game.selected(), lit).map((l) => {
      const from = beads?.get(l.id);
      if (from === undefined || p === null) return l;
      const def = model.links.find((x) => x.id === l.id);
      return { ...l, state: l.state === "dim" ? "rest" : l.state, pulse: p, reverse: def?.from !== from };
    });
    m.setLinks(links);
  });

  // keep the selection in view: zoom to it, back out to the region when cleared
  createEffect(on(() => game.selected(), (code) => {
    map()?.focusLas(code ? [code, ...neighbours(model, code)] : model.game.councils);
    bumpLater();
  }, { defer: true }));

  const hoverValue = () => {
    const h = hover(), s = game.state();
    if (!h || !s) return "";
    const by = game.colourBy();
    const c = s.councils[h.code];
    if (!c || by === "none" || by === "behind") return t("boardui.map.click");
    if (by === "backing") return t("boardui.map.backing", { n: num(backingShown(c.backing)), at: num(backsAtOf(model)) });
    return `${measureName(model, by)}: ${outOf10(c.measures[by], s.step > 0)}`;
  };

  return (
    <div class="bw-mapstage">
      <MapView geo={geo()!} ariaLabel={t("boardui.map.aria")} onReady={onReady} class="bw-map">
        <MapMarks map={map} view={view} moving={moving} />
      </MapView>
      <Show when={hover()}>
        <TipSlip heading={lang() === "cy" ? hover()!.cy : hover()!.en} class="maptip bw-maptip" style={{ left: `${hover()!.px + 14}px`, top: `${hover()!.py + 16}px` }}>
          {hoverValue()}
        </TipSlip>
      </Show>
      <ColourKey />
    </div>
  );
}
