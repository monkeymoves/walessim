// The hand of railway tickets (plan step). One tab stop: arrow keys move between tickets,
// Enter selects, P plays. Hovering or selecting a ticket shows the ghost on the strand row.
// Region cards ask where: the map lights the four regions and the same choice sits here.
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { t, tn, pick } from "../../i18n";
import { Ticket, type TicketCard } from "../parts/Ticket";
import { StampButton, TabButton } from "../parts/Buttons";
import type { RegionId } from "../../engine/api";
import type { Card } from "../../model/schema";
import { useGame } from "./context";
import { cardRegions } from "./names";
import { Note } from "./Note";

export function ticketOf(card: Card, cost?: number): TicketCard {
  return {
    id: card.id, name: card.name, cost: cost ?? card.cost, delay: card.delay, scope: card.scope,
    tags: card.tags, needs_partners: card.needs_partners, helps: card.helps, frays: card.frays,
  };
}

export function Hand(props: { interactive: boolean; stampLimit?: JSX.Element }): JSX.Element {
  const { game, ui } = useGame();
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
  let list!: HTMLDivElement;

  const focusAt = (i: number) => {
    const n = hand().length;
    if (!n) return;
    const k = ((i % n) + n) % n;
    setActive(k);
    (list.querySelectorAll<HTMLElement>(".yf-ticket-press")[k])?.focus();
  };

  function select(id: string): void {
    if (!props.interactive) return;
    const next = game.selected() === id ? null : id;
    game.setSelected(next);
    ui.guide.done("hand");
    ui.guide.done("ticket");
    const card = next ? game.names.card(next) : null;
    if (card && needsWhere(card) && !game.isPlayed(card.id)) ui.setRegionPick(card.id);
    else ui.setRegionPick(null);
  }

  const needsWhere = (c: Card) => c.scope === "region" || c.scope === "two_regions";

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
    ui.setAnnounce(t("game.plan.played_count", { played: game.draft.cards.length, limit: s().cardLimit }));
  }

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
      if (card.scope === "region" || card.scope === "two_regions") { ui.setRegionPick(id); return; }
      playNow(id);
    }
  };

  return (
    <div class="yf-hand-wrap">
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
        <Note id="play" when={ui.guide.hasSeen("ticket") && !!game.selected() && game.draft.cards.length === 0} class="yf-note-play" placement="left">
          {t("game.onboard.play")}
        </Note>
      </Show>
      <div
        class="yf-hand"
        ref={list}
        role="group"
        aria-label={`${t("game.plan.hand")}. ${t("game.plan.keys")}`}
        onKeyDown={onKey}
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
            const sel = () => game.selected() === id;
            const held = () => s().step === "plan" && game.draft.holdOver === id;
            return (
              <div
                class="yf-ticket-slot"
                classList={{ sel: sel(), played: played() }}
                onMouseEnter={() => { if (props.interactive) { game.setHovered(id); ui.guide.done("hand"); } }}
              >
                <div
                  class="yf-ticket-press"
                  role={props.interactive ? "button" : undefined}
                  tabIndex={props.interactive ? (active() === i() ? 0 : -1) : undefined}
                  aria-pressed={props.interactive ? sel() : undefined}
                  onClick={() => { if (props.interactive) { setActive(i()); select(id); } }}
                  onKeyDown={(e) => { if (props.interactive && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setActive(i()); select(id); } }}
                >
                  <Ticket
                    id={`ticket-${id}`}
                    card={ticketOf(card(), game.costOf(pl() ?? { card: id, region: card().regions?.[0] }))}
                    serial={game.names.serial(id)}
                    budget={game.budget().total || s().budget.available}
                    scope={pl()?.region && card().scope === "national_or_region" ? "region" : undefined}
                    where={where()}
                    played={played() || !props.interactive ? s().year : null}
                    blocked={props.interactive && block() ? { on: block() === "game.plan.cannot_limit" ? "trust" : "cost", reason: t(block()!) } : null}
                    selected={sel()}
                    lifted={game.hovered() === id || sel()}
                    class="yf-ticket"
                  />
                </div>
                <Show when={held()}>
                  <span class="yf-held small">{t("game.plan.held")}</span>
                </Show>
                <Show when={props.interactive && sel()}>
                  <WherePicker card={card()} onPlay={playNow} />
                </Show>
              </div>
            );
          }}
        </For>
      </div>
      {props.stampLimit}
    </div>
  );
}

/** Under the selected ticket: where it goes (region cards), keep it for next term. */
function WherePicker(props: { card: Card; onPlay: (id: string, region?: RegionId, regions?: RegionId[]) => void }): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const regions = () => cardRegions(game.model, props.card);
  const played = () => game.isPlayed(props.card.id);
  const pl = () => game.playOf(props.card.id);
  const [two, setTwo] = createSignal<RegionId[]>(pl()?.regions ?? []);
  const scope = props.card.scope;
  const block = () => game.blockOf(props.card.id);
  const canHold = () => !played() && (game.model.game.hold_over ?? 1) > 0;
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
  const { ui: ui2 } = useGame();
  return (
    <div class="yf-where sheet" role="group" aria-label={scope === "two_regions" ? t("game.plan.where_two") : scope === "national" ? pick(props.card.name) : t("game.plan.where")}>
      <Show when={scope === "national" && !played()}>
        <StampButton onClick={() => props.onPlay(props.card.id)} disabled={!!block()}>{t("game.plan.play")}</StampButton>
      </Show>
      <Show when={scope === "region" || scope === "national_or_region"}>
        <p class="label">{t("game.plan.where")}</p>
        <div class="yf-where-row">
          <Show when={scope === "national_or_region"}>
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
              >
                {game.names.regionName(r)}
              </button>
            )}
          </For>
        </div>
        <Show when={scope === "region" && !played()}>
          <Note id="region" when={true} class="yf-note-region">{t("game.onboard.region")}</Note>
          <p class="small">{t("game.plan.choose_region")}</p>
        </Show>
      </Show>
      <Show when={scope === "two_regions"}>
        <p class="label">{t("game.plan.where_two")}</p>
        <div class="yf-where-row">
          <For each={regions()}>
            {(r) => (
              <button type="button" class="yf-region" aria-pressed={two().includes(r)} onClick={() => toggleTwo(r)}>
                {game.names.regionName(r)}
              </button>
            )}
          </For>
        </div>
        <Show when={!played()}>
          <StampButton disabled={two().length !== 2 || !!block()} onClick={() => props.onPlay(props.card.id, undefined, two())}>
            {t("game.plan.play")}
          </StampButton>
        </Show>
      </Show>
      <Show when={block() && !played()}>
        <p class="small yf-why">{t(block()!)}</p>
      </Show>
      <Show when={played()}>
        <TabButton class="yf-hold" onClick={() => { game.unplay(props.card.id); ui2.setRegionPick(null); }}>{t("game.plan.unplay")}</TabButton>
      </Show>
      <Show when={canHold()}>
        <TabButton
          class="yf-hold"
          aria-pressed={game.draft.holdOver === props.card.id}
          onClick={() => game.setHold(game.draft.holdOver === props.card.id ? null : props.card.id)}
        >
          {game.draft.holdOver === props.card.id ? t("game.plan.held") : t("game.plan.hold")}
        </TabButton>
      </Show>
      <Show when={props.card.upgraded_by}>
        <p class="small yf-upgrade">{t("game.plan.upgraded_by", { lesson: pick(props.card.upgraded_by) })}</p>
      </Show>
    </div>
  );
}
