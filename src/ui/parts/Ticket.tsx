// The railway-ticket card (design-system 4.3), after the Edmondson ticket.
// Weave trim (strands it strengthens) | stub (icon, serial) : body (title pair, pulls, fare) | scope edge.
// Stock colour says the scope: buff national, green region, pink between regions, blue standing.
import { For, Show, type JSX } from "solid-js";
import { pick, Pair, t, tn } from "../../i18n";
import type { Card, StrandId, Text } from "../../model/schema";
import { cardIcon, Icon, type IconName } from "./Icon";
import { Snip } from "./Notice";
import { weaveUrl } from "./strands";

export type TicketScope = "national" | "national_or_region" | "region" | "two_regions" | "standing" | "lesson";

export interface TicketCard {
  id: string;
  name: Text;
  cost: number;
  delay: number;
  scope?: Card["scope"] | "standing";
  tags?: string[];
  needs_partners?: boolean;
  helps?: StrandId[];
  frays?: StrandId[];
}

export interface TicketProps {
  card: TicketCard;
  /** Serial number shown in the stub ("0440"). Defaults to a number derived from the id. */
  serial?: string | number;
  /** This term's budget, so the weight of the card is plain ("4 of 8 pips"). */
  budget?: number;
  /** Override the scope the stock and edge show (for a national_or_region card played regionally). */
  scope?: TicketScope;
  /** The chosen region's name, set under the pulls. */
  where?: Text | null;
  icon?: IconName;
  /** Played: the year stamped on it. */
  played?: number | null;
  /** Cannot be played: which fare figure blocks it and why. */
  blocked?: { on: "cost" | "trust"; reason: string } | null;
  selected?: boolean;
  /** Under the pointer or keyboard in the hand (lift). */
  lifted?: boolean;
  /** Stub only (tablet hand stack, in the post). */
  stub?: boolean;
  /**
   * The hand's stub stack (design-system 4.3, tablet): weave, icon, title and the fare figures on
   * one row. The selected ticket opens to the full anatomy.
   */
  compact?: boolean;
  /** Replaces the words after the cost figure (default "of {budget} pips"), e.g. "of 5 left". */
  budgetLabel?: string;
  /** Replaces the whole cost cell (standing tickets: "Gives 3 pips"). */
  fare?: JSX.Element;
  /** Shown at the top right of the body when selected ("Play this card" stamp). */
  action?: JSX.Element;
  onSelect?: () => void;
  tabIndex?: number;
  class?: string;
  id?: string;
}

/** Serial from a card id: stable, four figures. */
export function serialOf(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return String((Math.abs(h) % 900) + 100).padStart(4, "0");
}

export function ticketScope(card: TicketCard, override?: TicketScope): TicketScope {
  if (override) return override;
  switch (card.scope) {
    case "region": return "region";
    case "two_regions": return "two_regions";
    case "standing": return "standing";
    case "national": return "national";
    case "national_or_region": return "national_or_region";
    default: return "lesson";
  }
}

const STOCK: Record<TicketScope, string> = {
  national: "var(--ticket-buff)",
  national_or_region: "var(--ticket-buff)",
  region: "var(--ticket-green)",
  two_regions: "var(--ticket-pink)",
  standing: "var(--ticket-blue)",
  lesson: "var(--ticket-white)",
};

export function Ticket(props: TicketProps): JSX.Element {
  const scope = () => ticketScope(props.card, props.scope);
  const helps = () => props.card.helps ?? [];
  /** A strand both helped and frayed is printed once, as "mixed", never as help and fray of itself. */
  const mixed = (s: StrandId) => (props.card.frays ?? []).includes(s);
  const frays = () => (props.card.frays ?? []).filter((s) => !helps().includes(s));
  const serial = () => `${t("parts.ticket.no")} ${props.serial ?? serialOf(props.card.id)}`;
  const budget = () => props.budget ?? 8;
  const payout = () =>
    props.card.delay <= 0 ? t("parts.ticket.paysNow") : tn("parts.ticket.terms", props.card.delay);
  const ariaName = () =>
    [
      pick(props.card.name),
      t(`parts.scope.${scope()}`),
      props.fare ? "" : t("parts.ticket.costAria", { n: props.card.cost, of: budget() }),
      props.card.delay <= 0 ? t("parts.ticket.paysNowAria") : t("parts.ticket.paysAria", { when: payout() }),
      props.played ? t("parts.ticket.playedAria", { year: props.played }) : "",
      props.blocked ? props.blocked.reason : "",
    ].filter(Boolean).join(". ");
  const descId = `${props.id ?? `ticket-${props.card.id}`}-desc`;
  const keydown = (e: KeyboardEvent) => {
    if (!props.onSelect) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); props.onSelect(); }
  };
  return (
    <article
      id={props.id}
      class={`ticket${props.class ? " " + props.class : ""}`}
      classList={{ selected: !!props.selected, lifted: !!props.lifted, played: !!props.played, stubonly: !!props.stub, compact: !!props.compact, pressable: !!props.onSelect }}
      style={{ "--stock": STOCK[scope()], "--weave": weaveUrl(helps()[0], helps()[1]) }}
      tabIndex={props.onSelect ? (props.tabIndex ?? 0) : props.tabIndex}
      role={props.onSelect ? "button" : undefined}
      aria-pressed={props.onSelect ? !!props.selected : undefined}
      aria-label={props.onSelect ? undefined : ariaName()}
      aria-describedby={props.onSelect ? descId : undefined}
      onClick={() => props.onSelect?.()}
      onKeyDown={keydown}
    >
      <Show when={props.onSelect}>
        {/* a pressable ticket takes its name from what is printed on it (WCAG 2.5.3); the summary describes it */}
        <span id={descId} class="sr-only">{ariaName()}</span>
      </Show>
      <div class="ticket-weave" aria-hidden="true" />
      <div class="ticket-stub">
        <Icon name={props.icon ?? cardIcon(props.card)} size={props.compact ? 24 : 38} />
        <Show when={!props.compact}><span class="serial">{serial()}</span></Show>
      </div>
      <Show when={props.compact && !props.stub}>
        <div class="ticket-row">
          <h3 class="ticket-title" lang={undefined}>{pick(props.card.name)}</h3>
          <Show when={props.played} fallback={
            <span class="ticket-figs" classList={{ blocked: !!props.blocked }}>
              <Show when={!props.fare} fallback={props.fare}>
                <span><span class="furniture">{t("parts.ticket.cost")}</span> <b>{props.card.cost}</b></span>
              </Show>
              <span>
                <Show when={props.card.delay > 0} fallback={<span class="furniture">{t("parts.ticket.paysOutNow")}</span>}>
                  <span class="furniture">{t("parts.ticket.paysOutIn")}</span> <b>{props.card.delay}</b>
                </Show>
              </span>
            </span>
          }>
            <span class="stampmark ticket-stamp-small">{t("parts.ticket.played", { year: props.played! })}</span>
          </Show>
        </div>
        <div class="ticket-edge furniture" aria-hidden="true">
          <span>{t(`parts.scope.${scope()}`)}</span>
        </div>
      </Show>
      <Show when={!props.stub && !props.compact}>
        <div class="ticket-body">
          <Pair text={props.card.name} as="h3" class="ticket-title" />
          <ul class="pulls">
            <For each={helps()}>
              {(s) => (
                <li classList={{ mixed: mixed(s) }}>
                  <Snip strand={s} />
                  {mixed(s) ? t("parts.ticket.mixed", { strand: t(`parts.strand.${s}`) }) : t(`parts.strand.${s}`)}
                </li>
              )}
            </For>
            <For each={frays()}>
              {(s) => (
                <li class="strain">
                  <Snip strand={s} frays />
                  {t("parts.ticket.frays", { strand: t(`parts.strand.${s}`) })}
                </li>
              )}
            </For>
          </ul>
          <Show when={props.card.needs_partners || props.where}>
            <p class="ticket-note small">
              <Show when={props.where}>{pick(props.where)} </Show>
              <Show when={props.card.needs_partners}><i>{t("parts.ticket.partners")}</i></Show>
            </p>
          </Show>
          <div class="fare">
            <Show when={!props.fare} fallback={<div>{props.fare}</div>}>
              <div classList={{ blocked: props.blocked?.on === "cost" }}>
                <span class="furniture">{t("parts.ticket.cost")}</span>
                <b>{props.card.cost}</b>
                <small>{props.budgetLabel ?? t("parts.ticket.ofPips", { n: budget() })}</small>
              </div>
            </Show>
            <div>
              <Show
                when={props.card.delay > 0}
                fallback={<span class="furniture">{t("parts.ticket.paysOutNow")}</span>}
              >
                <span class="furniture">{t("parts.ticket.paysOutIn")}</span>
                <b>{props.card.delay}</b>
                <small>{tn("parts.ticket.termWord", props.card.delay)}</small>
              </Show>
            </div>
          </div>
          <Show when={props.blocked}>
            <p class="ticket-why small" classList={{ trust: props.blocked!.on === "trust" }}>{props.blocked!.reason}</p>
          </Show>
          <Show when={props.played}>
            <span class="stampmark ticket-stamp">{t("parts.ticket.played", { year: props.played! })}</span>
          </Show>
          <Show when={props.selected && props.action}>
            <div class="ticket-action" onClick={(e) => e.stopPropagation()}>{props.action}</div>
          </Show>
        </div>
        <div class="ticket-edge furniture" aria-hidden="true">
          <span>{t(`parts.scope.${scope()}`)}</span>
        </div>
      </Show>
    </article>
  );
}
