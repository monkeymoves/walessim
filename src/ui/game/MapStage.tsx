// The stage: the paper map in its well, driven by the game. Stitches for what the player did,
// a pin where a place is asking for you, the four regions lit when a card needs one, and the map
// in play (plain-wales 5): a click on a council area opens what it has to do with your cards, a
// click on the sea or All of Wales shows the whole country, and a line says what is selected.
import { createEffect, createMemo, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import { lang, t } from "../../i18n";
import { PaperMap, type Marker, type Stitch, type StitchKind } from "../../map";
import { geo } from "../shell/model";
import type { RegionId } from "../../engine/api";
import type { CompiledModel } from "../../model/schema";
import { lensFor } from "../atlas/data";
import { useGame } from "./context";
import { cardRegions, regionLas } from "./names";
import { cardIndicator } from "./mapFacts";
import { inplay, noteSource, resetInplay } from "./inplay";
import {
  AreaPanel, CompareKey, focusCard, LookUpOverlay, MapControls, NotebookKeeper, openArea, pickRegion, RegionCompare, SelectionLine, showWales, stampMarkers, WalesPanel,
} from "./MapPanels";

function stitchKind(card: string): StitchKind {
  if (/tip/.test(card)) return "made-safe";
  if (/peat|woodland|flow|farms|nature/.test(card)) return "planted";
  if (/homes|walls|grid|warm|energy|buses/.test(card)) return "built";
  return "generic";
}

/** The authorities an arrival reached: the three most populous in each of its regions, or in Wales. */
export function arrivalLas(model: CompiledModel, regions: RegionId[] | null): string[] {
  const pool = model.authorities.filter((a) => !regions?.length || regions.includes(a.region));
  const byRegion = new Map<string, typeof pool>();
  for (const a of pool) byRegion.set(a.region, [...(byRegion.get(a.region) ?? []), a]);
  const per = regions?.length ? 3 : 1;
  return [...byRegion.values()].flatMap((as) => [...as].sort((x, y) => y.population - x.population).slice(0, per).map((a) => a.code));
}

export function MapStage(props: { children?: JSX.Element }): JSX.Element {
  const { game, ui } = useGame();
  let host!: HTMLDivElement;

  onMount(() => {
    const g = geo();
    if (!g) return;
    const map = new PaperMap(host, { geo: g, lang: lang(), ariaLabel: t("game.map.label"), padding: { top: 16, left: 16, right: 16, bottom: 16 } });
    ui.setMap(map);
    const offs = [
      map.on("view", (v) => ui.setMapView(v)),
      map.on("select", (code) => onSelect(map, code)),
      map.on("hover", (code) => onHover(map, code)),
    ];
    onCleanup(() => { offs.forEach((f) => f()); map.destroy(); ui.setMap(null); });
  });

  const laRegion = (code: string): RegionId | undefined => game.model.authorities.find((a) => a.code === code)?.region;

  /** Every click answers at once, at every step: a region for a waiting card, else a council area, else all of Wales. */
  function onSelect(_map: PaperMap, code: string | null): void {
    if (ui.inPlace()) return;
    const pick = ui.regionPick();
    const s = game.state();
    if (pick && s?.step === "plan") {
      const r = code ? laRegion(code) : undefined;
      if (r) pickRegion(game, ui, pick, r);
      return;
    }
    if (code) openArea(game, ui, code);
    else showWales(game, ui, true);
  }

  function onHover(map: PaperMap, code: string | null): void {
    const pick = ui.regionPick();
    if (!pick) return;
    const card = game.names.card(pick);
    if (!card) return;
    const legal = cardRegions(game.model, card);
    const r = code ? laRegion(code) : undefined;
    inplay.setRegionHover(r ?? null);
    map.setHighlight(r && legal.includes(r) ? regionLas(game.model, r) : legal.flatMap((x) => regionLas(game.model, x)));
  }

  // a selection never outlives its step or turn: no stale panel or outline later (cold playtest 1)
  createEffect(on(() => [game.state()?.term, game.state()?.step] as const, () => {
    ui.setLaPanel(null);
    ui.map()?.setSelected(null);
    ui.map()?.focusLas(null);
    resetInplay();
  }, { defer: true }));
  // a place visit folds the map: nothing of the national view stays open behind it
  createEffect(on(ui.inPlace, (inside) => { if (inside) { ui.setLaPanel(null); ui.map()?.setSelected(null); inplay.setWalesOpen(false); inplay.setCompare(false); } }, { defer: true }));
  // a "Why?" panel takes the left of the map
  createEffect(() => { if (game.trace()) { ui.setLaPanel(null); ui.map()?.setSelected(null); inplay.setWalesOpen(false); } });
  // a card waiting for a region: zoom to the regions it can go to, and close the area panel
  createEffect(on(ui.regionPick, (pick) => {
    inplay.setFlash(null);
    inplay.setRegionHover(null);
    if (!pick) return;
    const card = game.names.card(pick);
    ui.setLaPanel(null);
    ui.map()?.setSelected(null);
    inplay.setWalesOpen(false);
    const legal = card ? cardRegions(game.model, card) : [];
    ui.map()?.focusLas(legal.length < 4 ? legal.flatMap((r) => regionLas(game.model, r)) : null);
  }, { defer: true }));
  // a card given a region anywhere (the map, the comparison or the tray's "Where?" buttons): zoom there
  createEffect(on(() => game.draft.cards.map((c) => `${c.card}:${c.region ?? ""}`), (now, before) => {
    if (!before) return;
    const added = now.find((x) => !before.includes(x));
    if (!added) return;
    const [card, region] = added.split(":");
    if (!card || !region || ui.inPlace()) return;
    const fr = inplay.focusRegion();
    if (fr?.card === card && fr.region === region) return;
    ui.setLaPanel(null);
    ui.map()?.setSelected(null);
    ui.map()?.focusLas(regionLas(game.model, region as RegionId));
    inplay.setFocusRegion({ card, region });
  }));
  // the compared measure: the open card's figure colours the map, with its key
  const lensInd = createMemo(() => {
    if (!inplay.compare() || ui.inPlace()) return null;
    const id = focusCard(game, ui);
    return id ? cardIndicator(game.model, id) : null;
  });
  createEffect(() => { if (inplay.compare() && !focusCard(game, ui)) inplay.setCompare(false); });
  createEffect(() => { const m = ui.map(); const ind = lensInd(); if (m) m.setLens(ind ? lensFor(ind) : null); });
  // sources opened anywhere in play count in the notebook
  const onDocket = (e: Event) => {
    const b = (e.target as HTMLElement | null)?.closest?.(".docket");
    if (b && host?.closest(".yf")?.contains(b)) noteSource(b.textContent?.trim() ?? "");
  };
  onMount(() => document.addEventListener("click", onDocket, true));
  onCleanup(() => document.removeEventListener("click", onDocket, true));

  // language
  createEffect(() => ui.map()?.setLang(lang()));
  // the trend slip sits top left over the sea: keep Wales clear of it on the national view
  createEffect(() => {
    const m = ui.map();
    if (!m) return;
    const ended = game.state()?.step === "ended";
    const panel = !ui.inPlace() && !ended && (!!ui.laPanel() || !!ui.regionPick() || inplay.walesOpen());
    m.setPadding({ left: ui.inPlace() || ended ? 16 : panel ? 364 : Math.min(300, Math.round(host.clientWidth * 0.3)), bottom: ui.inPlace() || ended ? 16 : 40 });
  });

  // the four regions lit while a card waits for one
  createEffect(() => {
    const m = ui.map();
    if (!m) return;
    const pick = ui.regionPick();
    const card = pick ? game.names.card(pick) : null;
    m.setHighlight(card ? cardRegions(game.model, card).flatMap((r) => regionLas(game.model, r)) : []);
  });

  const [keyHidden, setKeyHidden] = createSignal(false);
  // stitches: every card played, sewn where it moved things most
  const stitches = createMemo<Stitch[]>(() => {
    const s = game.state();
    if (!s) return [];
    const codes = game.model.authorities.map((a) => a.code);
    const out: Stitch[] = [];
    for (const h of s.history) {
      const by = new Map<string, number[]>();
      for (const c of h.contributions) {
        if (c.cause.kind !== "card" && c.cause.kind !== "caretaker") continue;
        const k = c.cause.id;
        const acc = by.get(k) ?? new Array(codes.length).fill(0);
        c.perLa.forEach((v, i) => { acc[i] += Math.abs(v); });
        by.set(k, acc);
      }
      for (const [card, acc] of by) {
        let best = 0;
        acc.forEach((v, i) => { if (v > acc[best]!) best = i; });
        if (!acc[best]) continue;
        out.push({ id: `${h.term}-${card}`, at: { la: codes[best]! }, kind: stitchKind(card) });
      }
    }
    return out;
  });
  // cards arriving from the post this term: stitched on the authorities they reached
  const arrivalStitches = createMemo<Stitch[]>(() => {
    const s = game.state();
    if (!s || s.step !== "opening" || !s.opening?.arrivals.length) return [];
    return s.opening.arrivals.flatMap((a, i) =>
      arrivalLas(game.model, a.regions).map((la) => ({ id: `arrive-${i}-${la}`, at: { la }, kind: stitchKind(a.card) } as Stitch)));
  });
  createEffect(() => ui.map()?.setStitches([...stitches(), ...arrivalStitches()]));
  // and lit, while the opening shows them
  createEffect(() => {
    const m = ui.map();
    const s = game.state();
    if (!m || ui.regionPick()) return;
    m.setHighlight(s?.step === "opening" && s.opening?.arrivals.length ? s.opening.arrivals.flatMap((a) => arrivalLas(game.model, a.regions)) : []);
  });

  // markers: a pin where a place is asking for you
  const markers = createMemo<Marker[]>(() => {
    const s = game.state();
    if (!s?.visitOffer || s.step !== "visit") return [];
    const board = game.names.place(s.visitOffer.place);
    const pts = board?.tips?.length ? board.tips : board?.options?.filter((o) => o.x != null) ?? [];
    if (!pts.length) return [];
    const x = pts.reduce((a, p) => a + (p.x ?? 0), 0) / pts.length;
    const y = pts.reduce((a, p) => a + (p.y ?? 0), 0) / pts.length;
    return [{ id: "visit", kind: "pin", x, y, label: game.names.placeName(s.visitOffer.place) }];
  });
  // notebook stamps on the council areas looked at this game
  const stamps = createMemo<Marker[]>(() => (ui.map() && game.state()?.step !== "ended" ? stampMarkers(ui, inplay.notebook().las) : []));
  createEffect(() => ui.map()?.setMarkers([...stamps(), ...markers()]));

  // keyboard: arrows move between authorities, Enter picks
  let focused: string | null = null;
  const onKey = (e: KeyboardEvent) => {
    const m = ui.map();
    if (!m || m.view !== "national") return;
    const dirs: Record<string, "up" | "down" | "left" | "right"> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (dirs[e.key]) {
      e.preventDefault();
      focused = focused ? m.neighbour(focused, dirs[e.key]!) ?? focused : m.laOrder[0] ?? null;
      m.focusLa(focused);
      if (focused) ui.setAnnounce(game.names.laName(focused));
    } else if ((e.key === "Enter" || e.key === " ") && focused) {
      e.preventDefault();
      onSelect(m, focused);
    } else if (e.key === "Escape") {
      if (ui.regionPick()) ui.setRegionPick(null);
      else showWales(game, ui, false);
    }
  };

  return (
    <div class="yf-stage well" classList={{ dimmed: game.state()?.step === "passing" && !!game.state()?.shock, folding: ui.mapView() === "folding" }}>
      <div
        class="yf-map"
        ref={host}
        tabIndex={0}
        role="application"
        aria-label={`${t("game.map.label")}. ${ui.regionPick() ? t("game.region.highlight") : ""}`}
        onKeyDown={onKey}
        onBlur={() => { ui.map()?.focusLa(null); }}
      />
      <NotebookKeeper />
      <Show when={!ui.inPlace() && game.state()?.step !== "ended"}>
        <MapControls />
        <SelectionLine />
        <Show when={!game.trace()}>
          <Show when={ui.regionPick() && game.names.card(ui.regionPick()!) ? ui.regionPick() : null} keyed fallback={
            <Show when={ui.laPanel()} keyed fallback={<Show when={inplay.walesOpen()}><WalesPanel /></Show>}>
              {(code) => <AreaPanel code={code} />}
            </Show>
          }>
            {(id) => <RegionCompare card={id} />}
          </Show>
        </Show>
        <Show when={!ui.regionPick() && lensInd()} keyed>{(ind) => <CompareKey indicator={ind} />}</Show>
      </Show>
      <LookUpOverlay />
      <Show when={stitches().length && !ui.inPlace() && game.state()?.step !== "ended" && !keyHidden() && !lensInd()}>
        <aside class="yf-mapkey sheet small">
          <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true">
            <circle cx="11" cy="11" r="8" fill="none" stroke="var(--stitch)" stroke-width="2.5" stroke-dasharray="3 2" />
          </svg>
          <span>{t("game.map.rings")}</span>
          <button type="button" class="yf-linkbtn" onClick={() => setKeyHidden(true)}>{t("game.map.rings_hide")}</button>
        </aside>
      </Show>
      <Show when={!geo()}>
        <p class="yf-map-loading small">{t("game.map.loading")}</p>
      </Show>
      {props.children}
    </div>
  );
}
