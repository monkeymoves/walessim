// The stage: the paper map in its well, driven by the game. Stitches for what the player did,
// a pin where a place is asking for you, the four regions lit when a card needs one, and the
// authority panel when a place is touched.
import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { lang, t } from "../../i18n";
import { PaperMap, type Marker, type Stitch, type StitchKind } from "../../map";
import { geo } from "../shell/model";
import type { RegionId } from "../../engine/api";
import type { CompiledModel } from "../../model/schema";
import { useGame } from "./context";
import { cardRegions, regionLas } from "./names";

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

  function onSelect(map: PaperMap, code: string | null): void {
    const pick = ui.regionPick();
    const s = game.state();
    if (pick && code && s?.step === "plan") {
      const card = game.names.card(pick);
      const r = laRegion(code);
      if (card && r && cardRegions(game.model, card).includes(r)) {
        if (game.isPlayed(pick)) game.setRegion(pick, r);
        else if (!game.blockOf(pick)) game.play(pick, r);
        ui.setRegionPick(null);
        ui.guide.done("region");
        ui.guide.done("play");
        ui.setAnnounce(game.names.regionName(r));
      }
      return;
    }
    ui.setLaPanel(code);
    map.setSelected(code);
  }

  function onHover(map: PaperMap, code: string | null): void {
    const pick = ui.regionPick();
    if (!pick) return;
    const card = game.names.card(pick);
    if (!card) return;
    const legal = cardRegions(game.model, card);
    const r = code ? laRegion(code) : undefined;
    map.setHighlight(r && legal.includes(r) ? regionLas(game.model, r) : legal.flatMap((x) => regionLas(game.model, x)));
  }

  // language
  createEffect(() => ui.map()?.setLang(lang()));
  // the trend slip sits top left over the sea: keep Wales clear of it on the national view
  createEffect(() => {
    const m = ui.map();
    if (!m) return;
    const ended = game.state()?.step === "ended";
    m.setPadding({ left: ui.inPlace() || ended ? 16 : Math.min(300, Math.round(host.clientWidth * 0.3)) });
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
  createEffect(() => ui.map()?.setMarkers(markers()));

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
      ui.setLaPanel(null);
      m.setSelected(null);
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
      <Show when={stitches().length && !ui.inPlace() && game.state()?.step !== "ended" && !keyHidden()}>
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
