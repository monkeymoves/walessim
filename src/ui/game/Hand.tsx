// The hand of railway tickets (plan step), as the design's stub stack: every ticket a one-row
// stub (title, cost, when it pays), the selected one opened to its full anatomy. Its controls
// (where it goes, play it, keep it) sit in a fixed tray above the pips, so they never open
// below the fold. One tab stop: arrow keys move between tickets, Enter selects, P plays.
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { t, tn, pick } from "../../i18n";
import { Ticket, type TicketCard } from "../parts/Ticket";
import { StampButton, TabButton } from "../parts/Buttons";
import { Snip } from "../parts/Notice";
import type { RegionId } from "../../engine/api";
import type { Card } from "../../model/schema";
import { useGame } from "./context";
import { cardRegions } from "./names";
import { Note } from "./Note";
import { iPlace, midEn, tw } from "./cymraeg";
import { RealWalesLine } from "./RealWales";
import { previewLines } from "./previewLines";

/** "Starts to work from 2030. Works in full from 2034.", when a card arrives in stages (years, never counts). */
export function stagedNote(card: Card, year: number): string | null {
  const a = card.arrival;
  if (!a || a.first === a.full) return null;
  return t("play.card.staged", { first: year + 4 * a.first, full: year + 4 * a.full });
}

export function ticketOf(card: Card, cost?: number): TicketCard {
  return {
    id: card.id, name: card.name, cost: cost ?? card.cost, delay: card.delay, scope: card.scope,
    tags: card.tags, needs_partners: card.needs_partners, helps: card.helps, frays: card.frays, mixed: card.mixed,
  };
}

const needsWhere = (c: Card) => c.scope === "region" || c.scope === "two_regions";

/** The card the first-turn guide points at, and the slow one it shows next (plain-wales 4). */
export const GUIDE_CARD = "build-flood-walls";
export const GUIDE_SLOW = "warm-homes";

/** Playing, re-aiming and selecting, shared by the hand and the tray. */
function usePlay() {
  const { game, ui } = useGame();
  function playNow(id: string, region?: RegionId, regions?: RegionId[]): void {
    const card = game.names.card(id);
    if (!card) return;
    if (game.isPlayed(id)) {
      if (region || regions) game.setRegion(id, region, regions);
      return;
    }
    if (needsWhere(card) && !region && !regions) { ui.setRegionPick(id); return; }
    game.play(id, region, regions);
    ui.setRegionPick(null);
    // the opened card closes once it is played (cold playtest): the map is the player's again,
    // and pressing the ticket opens it to move it or take it back
    if (game.isPlayed(id)) game.setSelected(null);
    ui.guide.done("play");
    ui.guide.done("region");
    if (id === GUIDE_CARD) ui.guide.done("card_place");
    if (id === GUIDE_SLOW) ui.guide.done("slow_card");
    ui.setAnnounce(t("game.plan.played_count", { played: game.draft.cards.length, limit: game.state()!.cardLimit }));
  }
  function select(id: string | null): void {
    const next = id && game.selected() === id ? null : id;
    game.setSelected(next);
    ui.guide.done("hand");
    ui.guide.done("ticket");
    const card = next ? game.names.card(next) : null;
    ui.setRegionPick(card && needsWhere(card) && !game.isPlayed(card.id) ? card.id : null);
    // the first time a card is out of reach, Borrowing and bills appears (plain-wales 3.1)
    if (next && game.blockOf(next) === "game.plan.cannot_budget") ui.setShortfall(true);
  }
  return { playNow, select };
}

export function Hand(props: { interactive: boolean }): JSX.Element {
  const { game, ui } = useGame();
  const { playNow, select } = usePlay();
  const s = () => game.state()!;
  /** In play the hand; once sealed, the cards played this term (the engine empties the hand). */
  const hand = createMemo(() => {
    const st = s();
    const ids = props.interactive
      ? st.hand
      : (st.plays?.cards ?? (st.step === "changed" || st.step === "election" ? st.lastOutcome?.plays.cards : null) ?? []).map((c) => c.card);
    return ids.filter((id) => game.names.card(id));
  });
  const [active, setActive] = createSignal(0);
  const [below, setBelow] = createSignal(0);
  /** Turn 1 of the guided first game. */
  const guided = () => s().term === 0 && s().options.firstGame && s().step === "plan";
  /** Full tickets when they all fit; the stub stack only when the hand is short of room. */
  const [roomy, setRoomy] = createSignal(true);
  /** Room for the selected ticket in full beside the other stubs. */
  const [oneFull, setOneFull] = createSignal(false);
  let list!: HTMLDivElement;
  /** The tallest full ticket seen so far (a played ticket with many lines is taller than the token). */
  let fullSeen = 0;
  /** Tickets with any part below the fold of the hand (the scroll cue counts only real ones). */
  const measure = () => {
    if (!list) return;
    const full0 = parseFloat(getComputedStyle(list).getPropertyValue("--ticket-h")) || 138;
    const stub = parseFloat(getComputedStyle(list).getPropertyValue("--ticket-compact-h")) || 50;
    if (roomy()) for (const el of list.querySelectorAll<HTMLElement>(".yf-ticket-slot")) fullSeen = Math.max(fullSeen, el.offsetHeight);
    const full = Math.max(full0, fullSeen);
    setRoomy(hand().length * (full + 8) <= list.clientHeight);
    setOneFull((hand().length - 1) * (stub + 6) + full + 8 <= list.clientHeight);
    // when everything fits, nothing should sit scrolled out of view above the top
    if (list.scrollHeight <= list.clientHeight + 1 && list.scrollTop) list.scrollTop = 0;
    const bottom = list.getBoundingClientRect().bottom;
    const slots = [...list.querySelectorAll<HTMLElement>(".yf-ticket-slot")];
    setBelow(slots.filter((el) => el.getBoundingClientRect().bottom > bottom + 2).length);
  };
  onMount(() => {
    if (!props.interactive && list) list.scrollTop = 0;
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (list) ro?.observe(list);
    onCleanup(() => ro?.disconnect());
  });
  // keep the opened ticket in view; a hand that is only shown (after the plan) reads from the top
  createEffect(() => {
    const id = props.interactive ? game.selected() : null;
    hand();
    requestAnimationFrame(() => {
      if (id) list?.querySelector<HTMLElement>(`[data-card="${id}"]`)?.scrollIntoView({ block: "nearest" });
      else if (!props.interactive && list) list.scrollTop = 0;
      measure();
    });
  });

  const focusAt = (i: number) => {
    const n = hand().length;
    if (!n) return;
    const k = ((i % n) + n) % n;
    setActive(k);
    (list.querySelectorAll<HTMLElement>(".yf-ticket-press")[k])?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    if (!props.interactive) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); focusAt(active() + 1); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); focusAt(active() - 1); }
    else if (e.key === "Home") { e.preventDefault(); focusAt(0); }
    else if (e.key === "End") { e.preventDefault(); focusAt(hand().length - 1); }
    else if ((e.key === "p" || e.key === "P") && !e.metaKey && !e.ctrlKey) {
      const id = hand()[active()];
      if (!id) return;
      e.preventDefault();
      game.setSelected(id);
      const card = game.names.card(id)!;
      if (game.isPlayed(id)) return;
      if (game.blockOf(id)) { ui.setAnnounce(t(game.blockOf(id)!)); return; }
      if (needsWhere(card)) { ui.setRegionPick(id); return; }
      playNow(id);
    }
  };

  return (
    <Show when={props.interactive || hand().length > 0}>
    <div class="yf-hand-wrap" style={{ "--hand-n": hand().length }}>
      <div class="yf-hand-head">
        <h2 class="yf-hand-title print">{t("game.plan.hand")}</h2>
        {/* after the last turn there is no "this turn" to play cards in */}
        <Show when={!(s().term >= 5 && (s().step === "changed" || s().step === "election" || s().step === "ended"))}>
          <p class="small data">{tn("game.plan.limit", s().cardLimit)}</p>
        </Show>
      </div>
      <div
        class="yf-hand"
        ref={list}
        style={{ "--hand-n": hand().length }}
        role="group"
        aria-label={`${t("game.plan.hand")}. ${t("game.plan.keys")}`}
        onKeyDown={onKey}
        onScroll={measure}
        onMouseLeave={() => game.setHovered(null)}
      >
        <For each={hand()}>
          {(id, i) => {
            const card = () => game.names.card(id)!;
            const played = () => game.isPlayed(id);
            const pl = () => game.playOf(id);
            const block = () => game.blockOf(id);
            const where = () => {
              const p = pl();
              if (!p) return null;
              if (p.regions?.length) return { en: game.names.regionsText(p.regions), cy: game.names.regionsText(p.regions) };
              if (p.region) return game.names.region(p.region)?.name ?? null;
              return null;
            };
            const sel = () => props.interactive && game.selected() === id;
            const held = () => s().step === "plan" && game.draft.holdOver === id;
            const cost = () => game.costOf(pl() ?? { card: id, region: card().regions?.[0] });
            const budgetLabel = () =>
              played() || !props.interactive
                ? tn("game.plan.pips_word", cost())
                : t("game.plan.of_left", { n: Math.max(0, game.budget().left) });
            return (
              <div
                class="yf-ticket-slot"
                data-card={id}
                classList={{ sel: sel(), played: played() }}
                onMouseEnter={() => { if (props.interactive) game.setHovered(id); }}
              >
                <div
                  class="yf-ticket-press"
                  role={props.interactive ? "button" : undefined}
                  tabIndex={props.interactive ? (active() === i() ? 0 : -1) : undefined}
                  aria-pressed={props.interactive ? sel() : undefined}
                  aria-expanded={props.interactive ? sel() : undefined}
                  onClick={() => { if (props.interactive) { setActive(i()); select(id); } }}
                  onKeyDown={(e) => { if (props.interactive && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setActive(i()); select(id); } }}
                >
                  <Ticket
                    id={`ticket-${id}`}
                    card={{ ...ticketOf(card(), cost()), needs_partners: card().needs_partners && !sel() }}
                    budget={game.budget().total || s().budget.available}
                    budgetLabel={budgetLabel()}
                    scope={pl()?.region && card().scope === "national_or_region" ? "region" : undefined}
                    where={where()}
                    played={played() || !props.interactive ? s().year : null}
                    blocked={props.interactive && block() ? { on: block() === "game.plan.cannot_limit" ? "trust" : "cost", reason: t(block()!) } : null}
                    selected={sel()}
                    compact={!roomy()}
                    lifted={game.hovered() === id || sel()}
                    note={stagedNote(card(), s().year) ?? undefined}
                    year={pl() || props.interactive ? s().year : (s().plays ? s().year : s().lastOutcome?.year ?? s().year)}
                    class="yf-ticket"
                  />
                </div>
                <Show when={held()}>
                  <span class="yf-held small">{t("game.plan.held")}</span>
                </Show>
                <Show when={props.interactive && guided() && id === GUIDE_CARD}>
                  <Note id="hand" when={ui.guide.hasSeen("slow_change") && !game.isPlayed(id) && game.selected() !== id} class="yf-note-hand" placement="left">{t("play.guide.hand")}</Note>
                </Show>
                <Show when={props.interactive && guided() && id === GUIDE_SLOW}>
                  <Note id="slow_card" when={game.isPlayed(GUIDE_CARD) && !game.isPlayed(id)} class="yf-note-slow" placement="left">{t("play.guide.slow")}</Note>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
      <Show when={below() > 0}>
        <button type="button" class="yf-more" onClick={() => list.scrollBy({ top: list.clientHeight * 0.8, behavior: "smooth" })}>
          <svg viewBox="0 0 9 8" width="9" height="8" aria-hidden="true"><path fill="currentColor" d="M0 0h9L4.5 8z" /></svg>
          {tn("game.plan.more_below", below())}
        </button>
      </Show>
    </div>
    </Show>
  );
}

/**
 * The fixed tray above the coins: the selected card's controls (where it goes, play it, take it
 * back, keep it). Always in view, so choosing a region or playing never needs a scroll.
 */
export function TicketTray(): JSX.Element {
  const { game } = useGame();
  const { playNow } = usePlay();
  const card = () => (game.selected() ? game.names.card(game.selected()!) ?? null : null);
  return (
    <div class="yf-tray sheet" aria-live="polite" data-testid="tray">
      <Show when={card()} keyed fallback={<p class="small yf-tray-hint">{t("game.plan.tray_hint")}</p>}>
        {(c) => <WherePicker card={c} onPlay={playNow} />}
      </Show>
    </div>
  );
}

/** Where the selected card goes, play it or take it back, and keep it for next turn. */
function WherePicker(props: { card: Card; onPlay: (id: string, region?: RegionId, regions?: RegionId[]) => void }): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const regions = () => cardRegions(game.model, props.card);
  const played = () => game.isPlayed(props.card.id);
  const pl = () => game.playOf(props.card.id);
  const two = () => (played() ? pl()?.regions ?? [] : ui.twoPick()[props.card.id] ?? []);
  const setTwo = (rs: RegionId[]) => ui.setTwoPick({ ...ui.twoPick(), [props.card.id]: rs });
  const scope = () => props.card.scope;
  const block = () => game.blockOf(props.card.id);
  const cost = () => game.costOf(pl() ?? { card: props.card.id, region: game.previewRegionFor(props.card.id) });
  // keeping a card for next turn comes in from turn 2 (plain-wales 3.1); nothing carries past the last turn
  const canHold = () => !played() && (game.model.game.hold_over ?? 1) > 0 && s().term >= 1 && s().term < 5;
  const guided = () => s().term === 0 && s().options.firstGame && props.card.id === GUIDE_CARD;
  const toggleTwo = (r: RegionId) => {
    const cur = two();
    const next = cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r].slice(-2);
    setTwo(next);
    if (played() && next.length === 2) game.setRegion(props.card.id, undefined, next);
  };
  const isOn = (r: RegionId | null) => {
    const p = pl();
    if (!p) return false;
    if (r == null) return !p.region && !p.regions;
    return p.region === r;
  };
  const point = (r: RegionId | null) => { game.setPreviewRegion(r); ui.setRegionPick(props.card.id); };
  /** The region the guide steers to: where most homes are at flood risk, from the real data. */
  const mostAtRisk = () => mostFloodRegion(game.model);
  return (
    <div class="yf-where" role="group" aria-label={scope() === "two_regions" ? t("game.plan.where_two") : scope() === "national" ? pick(props.card.name) : t("game.plan.where")}>
      <div class="yf-tray-head">
        <p class="yf-tray-title t-3">{pick(props.card.name)}</p>
        <Show when={canHold()}>
          <button
            type="button"
            class="yf-linkbtn yf-keep"
            aria-pressed={game.draft.holdOver === props.card.id}
            onClick={() => game.setHold(game.draft.holdOver === props.card.id ? null : props.card.id)}
          >
            {game.draft.holdOver === props.card.id ? t("game.plan.held") : t("game.plan.hold")}
          </button>
        </Show>
      </div>
      <Show when={(scope() === "region" || scope() === "national_or_region") && !played()}>
        <p class="small yf-where-hint">{t("play.card.choose_where")}</p>
      </Show>
      <Show when={scope() === "region" || scope() === "national_or_region"}>
        <div class="yf-where-row" onMouseLeave={() => game.setPreviewRegion(null)}>
          <span class="label">{t("game.plan.where")}</span>
          <Show when={scope() === "national_or_region"}>
            <button type="button" class="yf-region" aria-pressed={isOn(null)} disabled={!played() && !!block()} onClick={() => props.onPlay(props.card.id)}>
              {t("game.plan.all_wales")}
            </button>
          </Show>
          <For each={regions()}>
            {(r) => (
              <button
                type="button"
                class="yf-region"
                classList={{ steer: guided() && r === mostAtRisk() && !played() }}
                aria-pressed={isOn(r)}
                disabled={!played() && !!block()}
                data-region={r}
                onClick={() => props.onPlay(props.card.id, r)}
                onMouseEnter={() => point(r)}
                onFocus={() => point(r)}
                aria-label={game.names.regionName(r)}
              >
                {t(`game.region_short.${r}`)}
              </button>
            )}
          </For>
        </div>
        <Show when={guided() && !played()}>
          <Note id="card_place" when={game.selected() === GUIDE_CARD} class="yf-note-region" placement="above">
            {t("play.guide.card")} {mostAtRisk() ? tw("play.guide.card_most", { region: game.names.regionName(mostAtRisk()!) }, ["region"]) : ""}
          </Note>
        </Show>
      </Show>
      <Show when={scope() === "two_regions"}>
        <p class="small yf-where-hint strong" role="status">{two().length === 2 && !played() ? t("play.card.choose_two_done") : t("play.card.choose_two", { n: two().length })}</p>
        <div class="yf-where-row">
          <span class="label">{t("game.plan.where_two")}</span>
          <For each={regions()}>
            {(r) => (
              <button type="button" class="yf-region" aria-pressed={two().includes(r)} onClick={() => toggleTwo(r)} aria-label={game.names.regionName(r)}>
                {t(`game.region_short.${r}`)}
              </button>
            )}
          </For>
        </div>
      </Show>
      <div class="yf-tray-actions">
        <Show when={!played()}>
          <Show when={scope() === "national"}>
            <StampButton data-testid="play-card" onClick={() => props.onPlay(props.card.id)} disabled={!!block()}>{tn("play.card.play", cost())}</StampButton>
          </Show>
          <Show when={scope() === "two_regions"}>
            <StampButton data-testid="play-card" disabled={two().length !== 2 || !!block()} onClick={() => { props.onPlay(props.card.id, undefined, two()); }}>
              {tn("play.card.play", cost())}
            </StampButton>
          </Show>
        </Show>
        <Show when={played()}>
          <TabButton onClick={() => { game.unplay(props.card.id); ui.setRegionPick(null); }}>{t("game.plan.unplay")}</TabButton>
        </Show>
      </div>
      <Show when={block() && !played()}>
        <p class="small yf-why">{t(block()!)}</p>
      </Show>
    </div>
  );
}

/** The region with the most homes at flood risk (flood measure per 100 homes times people), from the data. */
export function mostFloodRegion(model: ReturnType<typeof useGame>["game"]["model"]): RegionId | null {
  const fe = model.la_data["flood_exposure"]?.values;
  if (!fe) return null;
  const by = new Map<RegionId, number>();
  for (const a of model.authorities) by.set(a.region, (by.get(a.region) ?? 0) + ((fe[a.code] ?? 0) / 100) * a.population);
  let best: RegionId | null = null;
  for (const [r, v] of by) if (best == null || v > by.get(best)!) best = r;
  return best;
}

/**
 * The opened card, on the stage beside the hand, in the fixed pattern of plain-wales 2.1:
 * name; cost and when it works; what it is; if you play this (from the engine's preview, so no
 * number is invented); the catch; picture it (an example); real Wales (a sourced figure).
 */
export function TicketNotes(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const card = () => (s().step === "plan" && game.selected() ? game.names.card(game.selected()!) ?? null : null);
  return (
    <Show when={card() && !game.trace() && !game.ledgerOpen()}>
      <CardOpen card={card()!} />
    </Show>
  );
}

function CardOpen(props: { card: Card }): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const c = () => props.card;
  const pl = () => game.playOf(c().id);
  const cost = () => game.costOf(pl() ?? { card: c().id, region: game.previewRegionFor(c().id) });
  const works = () => {
    const d = c().arrival?.first ?? c().delay;
    if (d <= 0) return t("play.card.works_now");
    const y = s().year + 4 * d;
    return y > 2050 || s().term + d > 5 ? t("play.card.works_after") : t("play.card.works_from", { year: y });
  };
  /** Where the preview assumes the card is played. */
  const where = (): string | null => {
    const p = pl();
    if (p?.regions?.length) return game.names.regionsText(p.regions);
    if (p?.region) return game.names.regionName(p.region);
    if (p) return null;
    if (c().scope === "region") return game.names.regionName(game.previewRegionFor(c().id));
    if (c().scope === "two_regions") return null;
    return null;
  };
  /** The region the card is (or would be) played in, so the card can sit clear of it on the map. */
  const whereId = (): string | null => {
    const p = pl();
    if (p?.region) return p.region;
    if (p?.regions?.length) return p.regions.includes("southeast") || p.regions.includes("southwest") ? "southeast" : "north";
    if (!p && c().scope === "region") return game.previewRegionFor(c().id);
    return null;
  };
  /** This card's own effect, paired with and without it, from the engine (never the term's drift). */
  const cp = createMemo(() => {
    const id = c().id;
    if (game.isPlayed(id)) return game.planPreview()?.perCard.find((x) => x.card === id) ?? null;
    const g = game.ghost();
    return g?.card === id ? g.preview?.perCard.find((x) => x.card === id) ?? null : null;
  });
  /** Every goal on the ticket gets a line, downsides included (previewLines.ts). */
  const lines = createMemo<string[]>(() => {
    const p = cp();
    if (!p) return [];
    return previewLines(p, c(), s().year, (id) => game.names.strandName(id), (xs) => game.names.list(xs)).map((l) => (l.n != null ? tn(l.key, l.n, l.vars) : t(l.key, l.vars)));
  });
  /** The catch: the authored line, else what the card's upkeep, partners and side note say. */
  const catches = (): string[] => {
    if (c().catch) return [pick(c().catch)];
    const out: string[] = [];
    const u = c().upkeep;
    if (u) out.push(u.every > 1 ? t("play.card.upkeep", { coins: tn("play.card.coins", u.pips), years: 4 * u.every }) : t("game.plan.upkeep_note_each", { pips: tn("play.card.coins", u.pips) }));
    if (c().needs_partners) out.push(t("game.plan.partners_note"));
    if (c().side_note) out.push(pick(c().side_note));
    return out;
  };
  return (
    <aside class="yf-cardnotes yf-cardopen sheet" aria-label={pick(c().name)} data-testid="card-open" data-where={whereId() ?? "wales"}>
      <h2 class="t-2 yf-co-name">{pick(c().name)}</h2>
      <p class="yf-co-cost data">{tn("play.card.costs", cost())} {works()}</p>
      <dl class="yf-co">
        <dt class="label">{t("play.card.what")}</dt>
        <dd class="story-small">{pick(c().what ?? c().description)}</dd>
        <dt class="label">{where() ? tw("play.card.if_in", { place: where()! }) : t("play.card.if")}</dt>
        <dd class="story-small" aria-live="polite">
          <Show when={cp()} fallback={<span class="small">{t("play.card.working")}</span>}>
            <For each={lines()}>{(l) => <span class="yf-co-line">{l}</span>}</For>
          </Show>
        </dd>
        <Show when={catches().length}>
          <dt class="label">{t("play.card.catch")}</dt>
          <dd class="story-small"><For each={catches()}>{(l) => <span class="yf-co-line">{l}</span>}</For></dd>
        </Show>
        <Show when={c().picture}>
          <dt class="label">{t("play.card.picture")}</dt>
          <dd class="story-small"><i>{pick(c().picture)}</i> <span class="small yf-co-tag">({t("play.card.example")})</span></dd>
        </Show>
        <Show when={c().visit}>
          <dd class="small">{t("game.plan.visit_card", { place: midEn(game.names.placeName(c().visit!)), i_place: iPlace(game.names.placeName(c().visit!)) })}</dd>
        </Show>
      </dl>
      <RealWalesLine card={c().id} label={t("play.card.real")} atlas />
    </aside>
  );
}
