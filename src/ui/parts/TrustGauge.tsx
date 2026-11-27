// The Trust gauge (design-system 4.7): slate, a half-dial of four cut segments sized to the
// bands, a tapered paper needle and a brass pivot. Reads by needle position and a word.
// The points are never shown. Collapsed is a severe notice.
import { For, Show, type JSX } from "solid-js";
import { t, tn } from "../../i18n";
import type { TrustBand } from "../../model/schema";
import { SevereNotice } from "./Notice";

const BANDS: { id: TrustBand; from: number; to: number }[] = [
  { id: "collapsed", from: 0, to: 0.2 },
  { id: "thin", from: 0.2, to: 0.45 },
  { id: "fair", from: 0.45, to: 0.7 },
  { id: "strong", from: 0.7, to: 1 },
];
const ORDINAL: Record<TrustBand, number> = { collapsed: 1, thin: 2, fair: 3, strong: 4 };

const C = 85, R = 68;
const pt = (f: number) => {
  const a = Math.PI * (1 - f);
  return [C + R * Math.cos(a), C - R * Math.sin(a)] as const;
};
const arc = (f0: number, f1: number) => {
  const [x0, y0] = pt(f0), [x1, y1] = pt(f1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

export interface TrustGaugeProps {
  band: TrustBand;
  /** Cards Trust allows next term (or this term, with `now`). */
  cards: number;
  /** Say "this term" rather than "next term". */
  now?: boolean;
  /** In place of the card count: a caretaker term, when the player plays no cards (playtest 4). */
  allowText?: string;
  /** Small form for the top bar: dial and word side by side. */
  compact?: boolean;
  class?: string;
}

export function TrustGauge(props: TrustGaugeProps): JSX.Element {
  const idx = () => BANDS.findIndex((b) => b.id === props.band);
  const needle = () => {
    const b = BANDS[Math.max(0, idx())]!;
    return ((b.from + b.to) / 2) * 180 - 90; // degrees from upright
  };
  const word = () => t("parts.trust.word", { band: t(`parts.trust.${props.band}`) });
  const allow = () => props.allowText ?? tn(props.now ? "parts.trust.cardsNow" : "parts.trust.cardsNext", props.cards);
  const aria = () => t("parts.trust.aria", { band: t(`parts.trust.${props.band}`), pos: t(`parts.trust.pos${ORDINAL[props.band]}`), allow: allow() });
  return (
    <div class={`trust slate on-slate${props.compact ? " compact" : ""}${props.class ? " " + props.class : ""}`} role="img" aria-label={aria()}>
      <svg viewBox="0 0 170 92" class="trust-dial" aria-hidden="true">
        <g fill="none" stroke-width="15" stroke-linecap="butt">
          <For each={BANDS}>
            {(b, i) => (
              <path d={arc(b.from + (i() ? 0.006 : 0), b.to - (i() < 3 ? 0.006 : 0))} stroke={i() <= idx() ? "var(--trust-band-on)" : "var(--trust-band-off)"} />
            )}
          </For>
        </g>
        <path class="trust-needle" fill="var(--trust-needle)" d="M81.5 85 85 31l3.5 54z" style={{ transform: `rotate(${needle()}deg)` }} />
        <circle cx="85" cy="85" r="6.5" fill="var(--trust-pivot)" />
        <circle cx="85" cy="85" r="2" fill="var(--slate-deep)" />
      </svg>
      <div class="trust-words">
        <p class="trust-word">{word()}</p>
        <p class="trust-allow">{allow()}</p>
      </div>
      <Show when={props.band === "collapsed" && !props.compact}>
        <SevereNotice class="trust-lost">{t("parts.trust.lost")}</SevereNotice>
      </Show>
    </div>
  );
}

const SLOTS = 4;

export interface TrustSlotsProps {
  band: TrustBand;
  /** Cards Trust allows (this turn with `now`, else next turn). */
  cards: number;
  now?: boolean;
  /** Out of office this turn: a stand-in plays the cards. */
  out?: boolean;
  /** The last turn is over: there is no next turn to promise cards for. */
  final?: boolean;
  class?: string;
}

/**
 * Trust as card slots (plain-wales 3.1): four ticket-shaped slots, as many filled as the cards Trust
 * allows, with the plain line "Trust: OK. You can play 3 cards." The points are never shown.
 */
export function TrustSlots(props: TrustSlotsProps): JSX.Element {
  const band = () => t(`parts.trust.${props.band}`);
  const line = () => {
    if (props.final) return t("play.trust.line_final", { band: band() });
    if (props.out) return t("play.trust.line_out");
    if (props.band === "collapsed" || props.cards <= 0) return t("play.trust.line_lost", { band: band() });
    return tn(props.now ? "play.trust.line_now" : "play.trust.line_next", props.cards, { band: band() });
  };
  return (
    <div class={`trustslots slate on-slate${props.class ? " " + props.class : ""}`} data-band={props.band} data-testid="trust" title={t("play.trust.tip")}>
      <div class="trustslots-row" role="img" aria-label={line()}>
        <For each={Array.from({ length: SLOTS }, (_, i) => i < (props.out ? 0 : props.cards))}>
          {(on) => <i class="trustslot" classList={{ on }} aria-hidden="true" />}
        </For>
      </div>
      <p class="trustslots-line">{line()}</p>
    </div>
  );
}
