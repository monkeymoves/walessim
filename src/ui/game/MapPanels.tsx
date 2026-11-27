// The map in play (plain-wales 5 and 6.3 to 6.4): every click answers "what does this place have to
// do with my decision?". One paper panel at a time on the left of the map: a council area (your
// cards there, the figures that matter for your hand, the game's estimate since 2026), the regions
// compared while a card asks "Where?", or All of Wales. A line under the map says what is selected.
// The controls (All of Wales, Look it up, the notebook) sit top right; the key to a compared measure
// bottom right; the atlas and the rule book open over the game and give it back as it was.
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { Pair, pick, t } from "../../i18n";
import { CloseButton, SourceTag } from "../parts";
import { Atlas } from "../atlas/Atlas";
import { LensKey } from "../atlas/LensKey";
import { lensFor, rankLine, type AtlasIndicator } from "../atlas/data";
import { Book } from "../book/Book";
import { geo } from "../shell/model";
import { reachFlags } from "../../model/reach";
import type { RegionId } from "../../engine/api";
import { useGame } from "./context";
import { cardRegions, regionLas } from "./names";
import {
  cardIndicator, cardsReaching, indicatorsOf, placedCards, regionAtRisk, regionLastCard, regionSpread, sinceEstimate, trackedIndicator, trendHere, widestGaps,
  type PlacedCard,
} from "./mapFacts";
import { figValue, measureName, realWalesText, unitWords, valueLine } from "./figures";
import { RealWalesLine, CompareButton } from "./RealWales";
import { inplay, noteArea, openAtlas, openBook, useNotebookFor } from "./inplay";
import { Note } from "./Note";
import "./mapfacts.css";

type Game = ReturnType<typeof useGame>["game"];
type Ui = ReturnType<typeof useGame>["ui"];

/** The card whose "Where?" or figure is in front of the player: the one waiting for a region, else the one open. */
export function focusCard(game: Game, ui: Ui): string | null {
  return ui.regionPick() ?? game.selected() ?? null;
}

/** Play the waiting card in a region (from the map or the comparison), then zoom there. */
export function pickRegion(game: Game, ui: Ui, cardId: string, r: RegionId): boolean {
  const card = game.names.card(cardId);
  if (!card || !cardRegions(game.model, card).includes(r)) {
    inplay.setFlash(t("facts.sel.not_here", { card: game.names.cardName(cardId), region: game.names.regionName(r) }));
    return false;
  }
  if (game.isPlayed(cardId)) game.setRegion(cardId, r);
  else if (!game.blockOf(cardId)) game.play(cardId, r);
  else { ui.setAnnounce(t(game.blockOf(cardId)!)); return false; }
  ui.setRegionPick(null);
  // the opened card closes once it is played, as it does from the hand
  if (game.selected() === cardId) game.setSelected(null);
  ui.guide.done("region");
  ui.guide.done("play");
  ui.setAnnounce(game.names.regionName(r));
  inplay.setFlash(null);
  ui.setLaPanel(null);
  ui.map()?.setSelected(null);
  ui.map()?.focusLas(regionLas(game.model, r));
  inplay.setFocusRegion({ card: cardId, region: r });
  return true;
}

/** Open a council area: the panel, the lift on the map, the zoom, the notebook stamp. */
export function openArea(game: Game, ui: Ui, code: string): void {
  if (game.trace()) { game.setTrace(null); ui.map()?.setThread(null); }
  inplay.setWalesOpen(false);
  inplay.setFlash(null);
  inplay.setFocusRegion(null);
  ui.setLaPanel(code);
  ui.map()?.setSelected(code);
  ui.map()?.focusLas([code]);
  noteArea(code);
  ui.setAnnounce(game.names.laName(code));
}

/** Back to the whole of Wales; with `panel` the All of Wales panel opens. */
export function showWales(game: Game, ui: Ui, panel: boolean): void {
  if (panel && game.trace()) { game.setTrace(null); ui.map()?.setThread(null); }
  ui.setLaPanel(null);
  ui.map()?.setSelected(null);
  ui.map()?.focusLas(null);
  inplay.setFlash(null);
  inplay.setFocusRegion(null);
  inplay.setWalesOpen(panel);
}

const statusText = (p: PlacedCard): string =>
  p.status === "on_way" ? t("facts.status.on_way", { from: p.worksFrom ?? "" }) : t(`facts.status.${p.status}`);

/** "Build flood walls (2026): working." */
function cardLine(game: Game, p: PlacedCard): string {
  return p.status === "planned"
    ? t("facts.card.line_planned", { card: game.names.cardName(p.card), status: statusText(p) })
    : t("facts.card.line", { card: game.names.cardName(p.card), year: p.year, status: statusText(p) });
}

const draftPlays = (game: Game) => game.draft.cards.map((c) => ({ card: c.card, region: c.region, regions: c.regions ? [...c.regions] : undefined }));

/** The hand's cards, the open one first. */
function handOrder(game: Game, ui: Ui): string[] {
  const s = game.state();
  const open = focusCard(game, ui);
  const hand = s?.step === "plan" ? s.hand : [];
  return [...(open ? [open] : []), ...hand.filter((id) => id !== open)];
}

/**
 * A panel body that scrolls says so (cold playtest: a figure looked cut off at the foot): while there
 * is more below, its last lines fade and a small mark sits under them.
 */
function watchMore(el: HTMLElement): void {
  const check = () => el.classList.toggle("more", el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  el.addEventListener("scroll", check);
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
  ro?.observe(el);
  const mo = typeof MutationObserver !== "undefined" ? new MutationObserver(check) : null;
  mo?.observe(el, { childList: true, subtree: true, characterData: true });
  requestAnimationFrame(check);
  onCleanup(() => { ro?.disconnect(); mo?.disconnect(); el.removeEventListener("scroll", check); });
}

// ------------------------------------------------------------------ one figure

function FigureRow(props: { code: string; ind: AtlasIndicator; tag?: string; lead?: boolean }): JSX.Element {
  const { game } = useGame();
  const codes = () => game.model.authorities.map((a) => a.code);
  return (
    <li class="mf-fig" classList={{ lead: !!props.lead }}>
      <Show when={props.tag}><span class="mf-tag label">{props.tag}</span></Show>
      <span class="mf-measure">{measureName(props.ind)}</span>
      <span class="mf-value"><b class="data">{figValue(props.ind, props.ind.laValues[props.code])}</b> {unitWords(props.ind)}</span>
      <span class="mf-sub small">
        {t("facts.area.wales", { wales: figValue(props.ind, props.ind.wales) })} {rankLine(props.ind, props.code, codes())}
      </span>
      <SourceTag source={props.ind.sources[0] ?? null} year={props.ind.year} class="mf-docket" />
    </li>
  );
}

// ------------------------------------------------------------------ 5.1 a council area

export function AreaPanel(props: { code: string }): JSX.Element {
  const { game, ui } = useGame();
  const la = () => game.names.la(props.code);
  const s = () => game.state()!;
  const placed = createMemo(() => placedCards(game.model, s(), draftPlays(game)));
  const here = () => cardsReaching(game.model, placed(), props.code);
  const region = () => la()?.region;
  const neglect = () => {
    const r = region();
    if (!r) return null;
    const last = regionLastCard(game.model, s(), draftPlays(game))[r];
    if (!regionAtRisk(s(), last)) return null;
    return last < 0
      ? t("facts.area.neglect_none", { region: game.names.regionName(r) })
      : t("facts.area.neglect", { region: game.names.regionName(r), year: game.model.game.years[last] ?? "" });
  };
  const trends = () =>
    s().activeTrends.flatMap((a) => {
      const cb = game.names.curveball(a.curveball);
      const how = cb ? trendHere(game.model, cb, props.code) : null;
      return how ? [t(`facts.area.trend_${how}`, { trend: game.names.curveballName(a.curveball) })] : [];
    });

  /** Figures: the open card's measure first, then one for each other card in the hand; else where the place stands out. */
  const figs = createMemo(() => {
    const out: { ind: AtlasIndicator; card: string | null }[] = [];
    const seen = new Set<string>();
    const open = focusCard(game, ui);
    if (open) {
      for (const id of handOrder(game, ui)) {
        const ind = cardIndicator(game.model, id);
        if (ind && !seen.has(ind.id) && ind.laValues[props.code] != null) { seen.add(ind.id); out.push({ ind, card: id }); }
      }
    }
    // three figures at most, so the last is never cut off at the foot of the panel (cold playtest);
    // "Open in the atlas" below has the rest
    out.splice(3);
    if (!out.length) for (const ind of widestGaps(game.model, props.code, 3)) out.push({ ind, card: null });
    return out;
  });
  const byHand = () => figs().some((f) => f.card);

  /** The game's estimate since 2026, for the measures above that it follows place by place. */
  const since = createMemo(() => {
    const st = s();
    const inds: string[] = [];
    for (const f of figs()) {
      const card = f.card ? game.names.card(f.card) : null;
      const ind = card ? trackedIndicator(game.model, card) : sinceEstimate(game.model, st, f.ind.id, props.code) ? f.ind.id : null;
      if (ind && !inds.includes(ind)) inds.push(ind);
    }
    return inds.slice(0, 3).flatMap((id) => {
      const e = sinceEstimate(game.model, st, id, props.code);
      const ind = indicatorsOf(game.model).get(id);
      if (!e || !ind) return [];
      const lines = [t(e.dir === "same" ? "facts.since.same" : `facts.since.${e.dir}_${e.size}`, { measure: measureName(ind) })];
      if (e.dir !== "same") lines.push(t(e.better ? "facts.since.better" : "facts.since.worse"));
      if (e.dir === "same" && e.mine === "most") lines.push(t("facts.since.mine_held"));
      else if (!(e.dir === "same" && e.mine === "none")) lines.push(t(`facts.since.mine_${e.mine}`));
      return [{ id, text: lines.join(" ") }];
    });
  });
  const started = () => s().history.length > 0;
  const lens = () => cardIndicator(game.model, focusCard(game, ui) ?? "")?.id ?? null;
  const close = () => { ui.setLaPanel(null); ui.map()?.setSelected(null); ui.map()?.focusLas(null); };

  return (
    <aside class="mf-panel sheet" aria-labelledby="mf-area-title" data-testid="area-panel">
      <div class="mf-head">
        <div>
          <Pair text={la()?.name} as="h2" id="mf-area-title" class="t-1" />
          <Show when={region()}><p class="small mf-area-region">{game.names.regionName(region()!)}</p></Show>
        </div>
        <CloseButton label={t("facts.area.close_label")} onClick={close} />
      </div>
      <div class="mf-body" ref={watchMore}>
        <section class="mf-block">
          <h3 class="label">{t("facts.area.cards_head")}</h3>
          <ul class="mf-list">
            <For each={here()} fallback={<li>{t("facts.area.none", { area: game.names.laName(props.code) })}</li>}>
              {(p) => <li classList={{ planned: p.status === "planned" }}>{cardLine(game, p)}</li>}
            </For>
            <Show when={neglect()}><li class="mf-warn">{neglect()}</li></Show>
            <For each={trends()}>{(line) => <li class="mf-trend">{line}</li>}</For>
          </ul>
        </section>
        <section class="mf-block">
          <h3 class="label">{byHand() ? t("facts.area.figs_hand") : t("facts.area.figs_place", { area: game.names.laName(props.code) })}</h3>
          <ul class="mf-figs">
            <For each={figs()}>
              {(f, i) => (
                <FigureRow
                  code={props.code}
                  ind={f.ind}
                  lead={!!f.card && i() === 0}
                  tag={f.card ? (i() === 0 ? t("facts.area.open_card") + ": " : "") + t("facts.area.for_card", { card: game.names.cardName(f.card) }) : undefined}
                />
              )}
            </For>
          </ul>
        </section>
        <section class="mf-block mf-since">
          <h3 class="label">{t("facts.area.since_head")} <span class="mf-estimate">{t("facts.area.since_tag")}</span></h3>
          <Show when={started()} fallback={<p class="small">{t("facts.area.since_start")}</p>}>
            <For each={since()} fallback={<p class="small">{t("facts.area.since_untracked")}</p>}>
              {(x) => <p class="small">{x.text}</p>}
            </For>
          </Show>
        </section>
      </div>
      <i class="mf-more-cue" aria-hidden="true" />
      <div class="mf-foot">
        <button type="button" class="yf-linkbtn strong" onClick={() => openAtlas(props.code, lens())}>{t("facts.area.open_atlas", { area: game.names.laName(props.code) })}</button>
        <button type="button" class="yf-linkbtn" onClick={close}>{t("facts.area.close")}</button>
      </div>
    </aside>
  );
}

// ------------------------------------------------------------------ 5.2 the regions compared

export function RegionCompare(props: { card: string }): JSX.Element {
  const { game, ui } = useGame();
  const card = () => game.names.card(props.card);
  const ind = () => cardIndicator(game.model, props.card);
  const legal = () => (card() ? cardRegions(game.model, card()!) : []);
  const s = () => game.state()!;
  const placed = createMemo(() => placedCards(game.model, s(), draftPlays(game)));
  const last = createMemo(() => regionLastCard(game.model, s(), draftPlays(game).filter((p) => p.card !== props.card)));
  const flags = () => (card() ? reachFlags(card()!) : []);
  const special = () => {
    const fl = flags();
    if (!fl.length) return null;
    const las = game.model.authorities.filter((a) => legal().includes(a.region) && a.flags.some((f) => fl.includes(f)));
    return t("facts.cmp.special", {
      card: game.names.cardName(props.card),
      places: game.names.list(fl.map((f) => t(`facts.flag.${f}`))),
      list: game.names.list(las.map((a) => pick(a.name))),
    });
  };
  const yours = (r: RegionId) => {
    const ps = placed().filter((p) => p.card !== props.card && (!p.regions || p.regions.includes(r)));
    const names = [...new Set(ps.map((p) => game.names.cardName(p.card)))];
    return names.length ? t("facts.cmp.yours", { list: game.names.list(names) }) : t("facts.cmp.yours_none");
  };
  const hover = (r: RegionId | null) => {
    inplay.setRegionHover(r);
    const m = ui.map();
    if (m) m.setHighlight(r && legal().includes(r) ? regionLas(game.model, r) : legal().flatMap((x) => regionLas(game.model, x)));
  };
  return (
    <aside class="mf-panel sheet mf-compare" aria-labelledby="mf-cmp-title" data-testid="region-compare">
      <div class="mf-head">
        <h2 class="t-2" id="mf-cmp-title">{t("facts.cmp.title", { card: game.names.cardName(props.card) })}</h2>
        <CloseButton label={t("facts.area.close")} onClick={() => ui.setRegionPick(null)} />
      </div>
      <div class="mf-body" ref={watchMore}>
        <Show when={ind()} fallback={<p class="small">{t("facts.cmp.no_fact")}</p>}>
          <p class="mf-lead">
            {t("facts.cmp.lead", { measure: measureName(ind()!), wales: `${figValue(ind()!, ind()!.wales)} ${unitWords(ind()!)}`.trim() })}{" "}
            <SourceTag source={ind()!.sources[0] ?? null} year={ind()!.year} />
          </p>
          <Show when={inplay.compare()}><CompareKey indicator={ind()!} inline /></Show>
          <CompareButton card={props.card} />
        </Show>
        <Show when={special()}><p class="small mf-special">{special()}</p></Show>
        <ul class="mf-regions" onMouseLeave={() => hover(null)}>
          <For each={game.model.regions}>
            {(r) => {
              const ok = () => legal().includes(r.id);
              const spread = () => (ind() ? regionSpread(game.model, ind()!, r.id) : null);
              return (
                <li class="mf-region" classList={{ hot: inplay.regionHover() === r.id, off: !ok() }} onMouseEnter={() => hover(r.id)}>
                  <button
                    type="button"
                    class="mf-region-pick"
                    disabled={!ok()}
                    onFocus={() => hover(r.id)}
                    onBlur={() => hover(null)}
                    onClick={() => pickRegion(game, ui, props.card, r.id)}
                    data-region={r.id}
                  >
                    <span class="mf-region-name">{pick(r.name)}</span>
                    <span class="mf-region-go small">{ok() ? t("facts.cmp.choose", { region: pick(r.name) }) : t("facts.cmp.cannot")}</span>
                  </button>
                  <Show when={spread()}>
                    <p class="small data-line">
                      {t("facts.cmp.high", { area: game.names.laName(spread()!.high.code), value: figValue(ind()!, spread()!.high.v) })}.{" "}
                      {t("facts.cmp.low", { area: game.names.laName(spread()!.low.code), value: figValue(ind()!, spread()!.low.v) })}.
                    </p>
                  </Show>
                  <Show when={ok() && regionAtRisk(s(), last()[r.id])}><p class="small mf-warn">{t("facts.cmp.risk")}</p></Show>
                  {/* the rest on hover or focus, so the map stays in view (cold playtest 6) */}
                  <Show when={inplay.regionHover() === r.id}>
                    <Show when={ok()}><p class="small mf-yours">{yours(r.id)}</p></Show>
                    <p class="small mf-areas">{t("facts.cmp.areas", { list: game.names.list(regionLas(game.model, r.id).map((c) => game.names.laName(c))) })}</p>
                  </Show>
                </li>
              );
            }}
          </For>
        </ul>
      </div>
      <i class="mf-more-cue" aria-hidden="true" />
    </aside>
  );
}

// ------------------------------------------------------------------ 5.3 All of Wales

export function WalesPanel(): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const placed = createMemo(() => placedCards(game.model, s(), draftPlays(game)));
  const last = createMemo(() => regionLastCard(game.model, s(), draftPlays(game)));
  const hand = () => (s().step === "plan" ? s().hand : []).filter((id) => game.names.card(id));
  return (
    <aside class="mf-panel sheet" aria-labelledby="mf-wales-title" data-testid="wales-panel">
      <div class="mf-head">
        <h2 class="t-1" id="mf-wales-title">{t("facts.wales.title")}</h2>
        <CloseButton label={t("facts.wales.close_label")} onClick={() => inplay.setWalesOpen(false)} />
      </div>
      <div class="mf-body" ref={watchMore}>
        <section class="mf-block">
          <h3 class="label">{t("facts.wales.cards_head")}</h3>
          <ul class="mf-list">
            <For each={placed()} fallback={<li>{t("facts.wales.none")}</li>}>
              {(p) => (
                <li classList={{ planned: p.status === "planned" }}>
                  {t("facts.card.where", { card: game.names.cardName(p.card), where: game.names.regionsText(p.regions), year: p.year, status: statusText(p) })}
                </li>
              )}
            </For>
          </ul>
        </section>
        <section class="mf-block">
          <h3 class="label">{t("facts.wales.trends_head")}</h3>
          <ul class="mf-list">
            <For each={s().activeTrends} fallback={<li>{t("facts.wales.trends_none")}</li>}>
              {(a) => <li><b>{game.names.curveballName(a.curveball)}</b>: {game.names.text(game.names.curveball(a.curveball)?.where_note)}</li>}
            </For>
          </ul>
        </section>
        <section class="mf-block">
          <h3 class="label">{t("facts.wales.regions_head")}</h3>
          <ul class="mf-list">
            <For each={game.model.regions}>
              {(r) => (
                <li>
                  {last()[r.id] < 0
                    ? t("facts.wales.region_never", { region: pick(r.name) })
                    : t("facts.wales.region_last", { region: pick(r.name), year: game.model.game.years[last()[r.id]] ?? "" })}
                  <Show when={regionAtRisk(s(), last()[r.id])}> <span class="mf-warn">{t("facts.cmp.risk")}</span></Show>
                </li>
              )}
            </For>
          </ul>
        </section>
        <section class="mf-block">
          <h3 class="label">{t("facts.wales.hand_head")}</h3>
          <Show when={hand().length} fallback={<p class="small">{t("facts.wales.hand_none")}</p>}>
            <ul class="mf-list mf-hand">
              <For each={hand()}>
                {(id) => (
                  <li>
                    <b>{game.names.cardName(id)}</b>
                    <RealWalesLine card={id} class="small" label="" />
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </section>
      </div>
      <i class="mf-more-cue" aria-hidden="true" />
      <div class="mf-foot">
        <button type="button" class="yf-linkbtn strong" onClick={() => openAtlas(null, cardIndicator(game.model, focusCard(game, ui) ?? "")?.id ?? null)}>{t("facts.ctl.lookup")}</button>
      </div>
    </aside>
  );
}

// ------------------------------------------------------------------ 5.4 what is selected

export function SelectionLine(): JSX.Element {
  const { game, ui } = useGame();
  const text = () => {
    if (inplay.flash()) return inplay.flash()!;
    const pickCard = ui.regionPick();
    if (pickCard) return t("facts.sel.region_pick", { card: game.names.cardName(pickCard) });
    const la = ui.laPanel();
    if (la) return t("facts.sel.area", { area: game.names.laName(la) });
    const fr = inplay.focusRegion();
    if (fr) return t("facts.sel.region", { region: game.names.regionName(fr.region as RegionId), card: game.names.cardName(fr.card) });
    return inplay.walesOpen() ? t("facts.sel.wales_panel") : t("facts.sel.wales");
  };
  return <p class="mf-selline small" role="status" data-testid="selection-line">{text()}</p>;
}

// ------------------------------------------------------------------ controls and the notebook

export function MapControls(): JSX.Element {
  const { game, ui } = useGame();
  const lens = () => cardIndicator(game.model, focusCard(game, ui) ?? "")?.id ?? null;
  const lookupTime = () => {
    const s = game.state();
    return !!s && s.term === 1 && s.step === "plan" && ui.guide.hasSeen("handoff");
  };
  return (
    <div class="mf-controls" role="group" aria-label={t("facts.ctl.label")}>
      <button type="button" class="mf-ctl" title={t("facts.ctl.wales_title")} aria-pressed={inplay.walesOpen()} onClick={() => { ui.setRegionPick(null); showWales(game, ui, true); }} data-testid="all-wales">
        {t("facts.ctl.wales")}
      </button>
      <span class="mf-ctl-host">
        <button type="button" class="mf-ctl" title={t("facts.ctl.lookup_title")} onClick={() => { ui.guide.done("lookup"); openAtlas(ui.laPanel(), lens()); }} data-testid="look-it-up">
          {t("facts.ctl.lookup")}
        </button>
        {/* turn 2: nobody found the atlas or the rule book unprompted (cold playtest) */}
        <Note id="lookup" when={lookupTime()} hold={!!game.selected() || !!ui.laPanel() || inplay.walesOpen() || !!game.trace()} class="yf-note-lookup" placement="below">{t("play2.guide.lookup")}</Note>
      </span>
    </div>
  );
}

/** The key to the compared measure, with its source line. */
export function CompareKey(props: { indicator: AtlasIndicator; inline?: boolean }): JSX.Element {
  const { game } = useGame();
  return (
    <div class="mf-key" classList={{ inline: !!props.inline }}>
      <p class="small mf-key-lead">
        {t("facts.cmp.lens", { measure: measureName(props.indicator) })}{" "}
        <SourceTag source={props.indicator.sources[0] ?? null} year={props.indicator.year} />
      </p>
      <LensKey indicator={props.indicator} lens={lensFor(props.indicator)} missing={game.model.authorities.length - Object.keys(props.indicator.laValues).length} />
    </div>
  );
}

// ------------------------------------------------------------------ 6.3 over the game

/** The atlas or a rule book page over the game; "Back to your game" gives the game back as it was. */
export function LookUpOverlay(): JSX.Element {
  const { game } = useGame();
  const o = () => inplay.overlay();
  const [atlasCode, setAtlasCode] = createSignal<string | null>(null);
  createEffect(() => { const x = o(); setAtlasCode(x?.kind === "atlas" ? x.code : null); });
  const close = () => inplay.setOverlay(null);
  /** Links inside the atlas or book stay over the game instead of leaving it. */
  const keepInside = (e: MouseEvent) => {
    const a = (e.target as HTMLElement | null)?.closest?.("a[href^='#/']") as HTMLAnchorElement | null;
    if (!a) return;
    const [, route, page, id] = a.getAttribute("href")!.split("/");
    if (route === "llyfr") { e.preventDefault(); openBook(id ? `${page}/${id}` : page ?? ""); }
    else if (route === "heddiw") { e.preventDefault(); openAtlas(page ?? null, null); }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !o()) return;
    // the atlas closes its own place panel first
    if (o()!.kind === "atlas" && atlasCode()) return;
    e.stopPropagation();
    close();
  };
  onMount(() => window.addEventListener("keydown", onKey, true));
  onCleanup(() => window.removeEventListener("keydown", onKey, true));
  return (
    <Show when={o() && geo()}>
      <Portal>
        <div class="mf-overlay" role="dialog" aria-modal="true" aria-labelledby="mf-over-title" data-testid="lookup-overlay">
          <header class="mf-over-head">
            <button type="button" class="mf-back stamp" onClick={close} data-testid="back-to-game">{t("facts.over.back")}</button>
            <h2 class="t-2" id="mf-over-title">{o()!.kind === "atlas" ? t("facts.over.atlas") : t("facts.over.book")}</h2>
            <p class="small mf-quiet">{t("facts.over.note")}</p>
          </header>
          <div class="mf-over-body" classList={{ book: o()!.kind === "book" }} ref={(el) => el.addEventListener("click", keepInside, true)}>
            <Show when={o()} keyed>
              {(ov) =>
                ov.kind === "atlas" ? (
                  <Atlas model={game.model} geo={geo()!} selected={atlasCode()} onSelect={setAtlasCode} onLook={noteArea} lens={ov.lens ?? undefined} explorer={ov.explorer} />
                ) : (
                  <Book model={game.model} parts={ov.page.split("/").filter(Boolean)} />
                )
              }
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
}

/** Start or continue this game's notebook. */
export function NotebookKeeper(): JSX.Element {
  const { game } = useGame();
  createEffect(() => { const s = game.state(); if (s) useNotebookFor(`${s.seed}:${s.seedLabel}`); });
  return null as unknown as JSX.Element;
}

/** The council areas looked at this game, as stamps on the map (in km). */
export function stampMarkers(ui: Ui, las: string[]): { id: string; kind: string; x: number; y: number; size: number }[] {
  const m = ui.map();
  if (!m) return [];
  return las.flatMap((code) => {
    const e = m.index.byCode.get(code);
    return e ? [{ id: `stamp-${code}`, kind: "stamp", x: e.label[0] + 4, y: e.label[1] - 4, size: 0.9 }] : [];
  });
}

export { realWalesText, valueLine };
