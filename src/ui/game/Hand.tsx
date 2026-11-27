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
import { iPlace } from "./cymraeg";

/** "First effects in 1 term, the rest in 2", when a card arrives in stages. */
export function stagedNote(card: Card): string | null {
  const a = card.arrival;
  if (!a || a.first === a.full) return null;
  const words = (n: number) => (n <= 0 ? t("parts.ticket.paysNow") : tn("parts.ticket.terms", n));
  return t("game.plan.staged", { first: words(a.first), full: words(a.full) });
}

export function ticketOf(card: Card, cost?: number): TicketCard {
  return {
    id: card.id, name: card.name, cost: cost ?? card.cost, delay: card.delay, scope: card.scope,
    tags: card.tags, needs_partners: card.needs_partners, helps: card.helps, frays: card.frays, mixed: card.mixed,
  };
}

const needsWhere = (c: Card) => c.scope === "region" || c.scope === "two_regions";

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
    ui.guide.done("play");
    ui.guide.done("region");
    ui.setAnnounce(t("game.plan.played_count", { played: game.draft.cards.length, limit: game.state()!.cardLimit }));
  }
  function select(id: string | null): void {
    const next = id && game.selected() === id ? null : id;
    game.setSelected(next);
    ui.guide.done("hand");
    ui.guide.done("ticket");
    const card = next ? game.names.card(next) : null;
    ui.setRegionPick(card && needsWhere(card) && !game.isPlayed(card.id) ? card.id : null);
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
  /** Full tickets when they all fit; the stub stack only when the hand is short of room. */
  const [roomy, setRoomy] = createSignal(true);
  /** Room for the selected ticket in full beside the other stubs. */
  const [oneFull, setOneFull] = createSignal(false);
  let list!: HTMLDivElement;
  /** Tickets with any part below the fold of the hand (the scroll cue counts only real ones). */
  const measure = () => {
    if (!list) return;
    const full = parseFloat(getComputedStyle(list).getPropertyValue("--ticket-h")) || 138;
    const stub = parseFloat(getComputedStyle(list).getPropertyValue("--ticket-compact-h")) || 50;
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
    ro?.observe(list);
    onCleanup(() => ro?.disconnect());
  });
  // keep the opened ticket in view
  createEffect(() => {
    const id = game.selected();
    hand();
    requestAnimationFrame(() => {
      if (id) list?.querySelector<HTMLElement>(`[data-card="${id}"]`)?.scrollIntoView({ block: "nearest" });
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
    <div class="yf-hand-wrap" style={{ "--hand-n": hand().length }}>
      <div class="yf-hand-head">
        <h2 class="yf-hand-title print">{t("game.plan.hand")}</h2>
        <p class="small data">{tn("game.plan.limit", s().cardLimit)}</p>
      </div>
      <Show when={props.interactive}>
        <Note id="hand" when={!game.hovered() && !game.selected() && game.draft.cards.length === 0} class="yf-note-hand" placement="left">
          {t("game.onboard.hand")}
        </Note>
        <Note id="ticket" when={ui.guide.hasSeen("hand") && !!game.hovered() && game.draft.cards.length === 0} class="yf-note-ticket" placement="left">
          {t("game.onboard.ticket")}
        </Note>
      </Show>
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
                ? t("game.plan.pips_plain")
                : t("game.plan.of_left", { n: Math.max(0, game.budget().left) });
            return (
              <div
                class="yf-ticket-slot"
                data-card={id}
                classList={{ sel: sel(), played: played() }}
                onMouseEnter={() => { if (props.interactive) { game.setHovered(id); ui.guide.done("hand"); } }}
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
                    card={ticketOf(card(), cost())}
                    budget={game.budget().total || s().budget.available}
                    budgetLabel={budgetLabel()}
                    scope={pl()?.region && card().scope === "national_or_region" ? "region" : undefined}
                    where={where()}
                    played={played() || !props.interactive ? s().year : null}
                    blocked={props.interactive && block() ? { on: block() === "game.plan.cannot_limit" ? "trust" : "cost", reason: t(block()!) } : null}
                    selected={sel()}
                    compact={!roomy()}
                    lifted={game.hovered() === id || sel()}
                    note={stagedNote(card()) ?? undefined}
                    class="yf-ticket"
                  />
                </div>
                <Show when={held()}>
                  <span class="yf-held small">{t("game.plan.held")}</span>
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
  );
}

/**
 * The fixed tray above the pips: the selected ticket's plain description and its controls.
 * Always in view, so choosing a region or playing never needs a scroll.
 */
export function TicketTray(): JSX.Element {
  const { game, ui } = useGame();
  const { playNow } = usePlay();
  const s = () => game.state()!;
  const card = () => (game.selected() ? game.names.card(game.selected()!) ?? null : null);
  return (
    <div class="yf-tray sheet" aria-live="polite">
      <Show when={card()} fallback={<p class="small yf-tray-hint">{t("game.plan.tray_hint")}</p>}>
        {(c) => (
          <>
            <WherePicker card={c()} onPlay={playNow} />
            <ul class="pulls yf-tray-pulls">
              <For each={[...(c().helps ?? []), ...(c().mixed ?? []).filter((x) => !(c().helps ?? []).includes(x))]}>
                {(x) => <li><Snip strand={x} />{(c().frays ?? []).includes(x) || (c().mixed ?? []).includes(x) ? t("parts.ticket.mixed", { strand: game.names.strandName(x) }) : game.names.strandName(x)}</li>}
              </For>
              <For each={(c().frays ?? []).filter((x) => !(c().helps ?? []).includes(x) && !(c().mixed ?? []).includes(x))}>
                {(x) => <li class="strain"><Snip strand={x} frays />{t("parts.ticket.frays", { strand: game.names.strandName(x) })}</li>}
              </For>
            </ul>
          </>
        )}
      </Show>
      <Note id="play" when={ui.guide.hasSeen("ticket") && !!game.selected() && game.draft.cards.length === 0} class="yf-note-play" placement="left">
        {t("game.onboard.play")}
      </Note>
    </div>
  );
}

/** Where the selected card goes, play it or take it back, and keep it for next term. */
function WherePicker(props: { card: Card; onPlay: (id: string, region?: RegionId, regions?: RegionId[]) => void }): JSX.Element {
  const { game, ui } = useGame();
  const regions = () => cardRegions(game.model, props.card);
  const played = () => game.isPlayed(props.card.id);
  const pl = () => game.playOf(props.card.id);
  const [two, setTwo] = createSignal<RegionId[]>(pl()?.regions ?? []);
  const scope = () => props.card.scope;
  const block = () => game.blockOf(props.card.id);
  // nothing carries past the last term
  const canHold = () => !played() && (game.model.game.hold_over ?? 1) > 0 && (game.state()?.term ?? 0) < 5;
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
      <Show when={scope() === "region" || scope() === "national_or_region"}>
        <div class="yf-where-row">
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
                aria-pressed={isOn(r)}
                disabled={!played() && !!block()}
                onClick={() => props.onPlay(props.card.id, r)}
                onMouseEnter={() => ui.setRegionPick(props.card.id)}
                aria-label={game.names.regionName(r)}
              >
                {t(`game.region_short.${r}`)}
              </button>
            )}
          </For>
        </div>
        <Show when={scope() === "region" && !played()}>
          <Note id="region" when={true} class="yf-note-region" placement="left">{t("game.onboard.region")}</Note>
        </Show>
      </Show>
      <Show when={scope() === "two_regions"}>
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
            <StampButton onClick={() => props.onPlay(props.card.id)} disabled={!!block()}>{t("game.plan.play")}</StampButton>
          </Show>
          <Show when={scope() === "two_regions"}>
            <StampButton disabled={two().length !== 2 || !!block()} onClick={() => props.onPlay(props.card.id, undefined, two())}>
              {t("game.plan.play")}
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

/** On the stage, beside the hand: the selected ticket's plain words, never squeezed by the rail. */
export function TicketNotes(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const card = () => (s().step === "plan" && game.selected() ? game.names.card(game.selected()!) ?? null : null);
  return (
    <Show when={card() && !game.trace() && !game.ledgerOpen()}>
      {(() => {
        const c = () => card()!;
        return (
          <aside class="yf-cardnotes sheet" aria-label={pick(c().name)}>
            <p class="t-3">{pick(c().name)}</p>
              <p class="story-small">{pick(c().description)}</p>
              <Show when={stagedNote(c())}><p class="small strong">{stagedNote(c())}</p></Show>
              <Show when={c().needs_partners}><p class="small">{t("game.plan.partners_note")}</p></Show>
              <Show when={c().upkeep}>
                <p class="small">{c().upkeep!.every > 1 ? t("game.plan.upkeep_note", { n: c().upkeep!.pips, every: c().upkeep!.every }) : t("game.plan.upkeep_note_each", { n: c().upkeep!.pips })}</p>
              </Show>
              <Show when={c().side_note}><p class="small">{pick(c().side_note)}</p></Show>
              <Show when={c().visit}><p class="small">{t("game.plan.visit_card", { place: game.names.placeName(c().visit!), i_place: iPlace(game.names.placeName(c().visit!)) })}</p></Show>
              <Show when={s().term + c().delay > 5}><p class="small yf-after2050">{t("game.plan.after_2050")}</p></Show>
            
          </aside>
        );
      })()}
    </Show>
  );
}
