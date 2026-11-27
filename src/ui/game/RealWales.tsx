// The real Wales beside each decision (plain-wales 6.1 and 6.2). Drop-in pieces for the play
// screens:
//   <RealWalesLine card={id} />   the sourced figure on an opened card ("Real Wales: ...  ONS, 2025")
//   <CardQuestion card={id} />    "Did you know? Before you choose: where is it highest?" + Compare
//   <CompareButton card={id} />   colours the map by the card's measure (the atlas lens, in play)
//   <ForScale card={id} />        the Wales figure for scale, on a result slip
//   <TrendFact curveball={id} />  a sourced line with a new slow change
// Every figure comes from the card's `fact`, resolved at build time from la-indicators.json.
import { Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import { SourceTag } from "../parts";
import { useGame } from "./context";
import { cardIndicator, indicatorsOf } from "./mapFacts";
import type { StrandId } from "../../model/schema";
import { forScaleText, measureName, realWalesText } from "./figures";
import { inplay, openAtlas, openBook } from "./inplay";

/** The rule that explains a card best: the first main effect that names one. */
function cardRule(model: ReturnType<typeof useGame>["game"]["model"], cardId: string): string | null {
  const card = model.cards.find((c) => c.id === cardId);
  return card?.effects.find((e) => !e.side && e.rule)?.rule ?? card?.effects.find((e) => e.rule)?.rule ?? null;
}

/** "Real Wales: Homes at flood risk: highest in Conwy, 54.2 for every 100 homes. Wales: 21.8." and its source tag. */
export function RealWalesLine(props: { card: string; class?: string; label?: string; atlas?: boolean }): JSX.Element {
  const { game } = useGame();
  const fact = () => realWalesText(game.model, props.card);
  /** The measure behind the figure, so "See the 22 council areas" opens the atlas on it. */
  const ind = () => (props.atlas ? cardIndicator(game.model, props.card)?.id ?? null : null);
  const rule = () => cardRule(game.model, props.card);
  return (
    <p class={`rw-line${props.class ? " " + props.class : ""}`} data-testid="real-wales">
      <span class="rw-label label">{props.label ?? t("facts.real.label")}</span>{" "}
      <Show
        when={fact()}
        fallback={
          <>
            <span>{t("facts.real.rule")}</span>{" "}
            <Show when={rule()}>
              <button type="button" class="yf-linkbtn rw-rule" onClick={() => openBook(rule()!)}>{t("facts.real.rule_link")}</button>
            </Show>
          </>
        }
      >
        <span class="rw-text">{fact()!.text}</span> <SourceTag source={fact()!.source} year={fact()!.year} class="rw-source" />
        <Show when={ind()}>
          {" "}<button type="button" class="yf-linkbtn rw-atlas" data-testid="card-atlas" onClick={() => openAtlas(null, ind(), true)}>{t("facts.scale.all")}</button>
        </Show>
      </Show>
    </p>
  );
}

/** Colours the map by the card's measure, with its key and source, or turns it back off. */
export function CompareButton(props: { card: string; class?: string }): JSX.Element {
  const { game } = useGame();
  const has = () => !!cardIndicator(game.model, props.card);
  return (
    <Show when={has()}>
      <button
        type="button"
        class={`yf-linkbtn rw-compare${props.class ? " " + props.class : ""}`}
        aria-pressed={inplay.compare()}
        data-testid="compare-regions"
        onClick={() => {
          if (game.selected() !== props.card && !game.isPlayed(props.card)) game.setSelected(props.card);
          inplay.setCompare(!inplay.compare());
        }}
      >
        {inplay.compare() ? t("facts.cmp.compare_off") : t("facts.cmp.compare")}
      </button>
    </Show>
  );
}

/** The question before the answer, on an opened card: where does this card's measure bite hardest? */
export function CardQuestion(props: { card: string; class?: string }): JSX.Element {
  const { game } = useGame();
  const ind = () => cardIndicator(game.model, props.card);
  return (
    <Show when={ind()}>
      <p class={`rw-question${props.class ? " " + props.class : ""}`}>
        <span class="rw-label label">{t("facts.dyk.label")}</span> {t("facts.dyk.question", { measure: measureName(ind()!) })}{" "}
        <CompareButton card={props.card} />
      </p>
    </Show>
  );
}

/** "For scale: Homes at flood risk in Wales: 21.8 for every 100 homes (2025)." and "See the 22 council areas". */
/**
 * The Wales figure that fits each goal best, for a result slip whose card's own figure is about
 * something else (cold playtest: "People in work" under Climate). First one with a Wales value wins.
 */
const GOAL_FIGURES: Record<StrandId, string[]> = {
  prosperous: ["employment", "earnings", "gva_head"],
  resilient: ["flood_exposure", "greenspace_access"],
  healthier: ["life_exp"],
  equal: ["poor_housing", "deprivation_10"],
  cohesive: ["affordability", "gp_travel_public"],
  culture: ["welsh_speakers"],
  global: ["emissions_head", "renewables"],
};

/** The figure to show for scale on a slip about `strand`: the card's own if it is about that goal, else the goal's own, else none. */
export function scaleIndicator(model: ReturnType<typeof useGame>["game"]["model"], card: string | undefined, strand: StrandId | undefined): string | null {
  const own = card ? cardIndicator(model, card) : null;
  if (!strand) return own?.id ?? null;
  if (own && own.strand === strand) return own.id;
  const all = indicatorsOf(model);
  return GOAL_FIGURES[strand]?.find((id) => all.get(id)?.wales != null) ?? null;
}

export function ForScale(props: { card?: string; indicator?: string; strand?: StrandId; class?: string }): JSX.Element {
  const { game } = useGame();
  const ind = () => props.indicator ?? scaleIndicator(game.model, props.card, props.strand);
  const line = () => (ind() ? forScaleText(game.model, ind()!) : null);
  return (
    <Show when={line()}>
      <p class={`rw-scale${props.class ? " " + props.class : ""}`}>
        <span class="rw-label label">{t("facts.scale.label")}</span> {line()!.text}{" "}
        <SourceTag source={line()!.source} year={line()!.year} class="rw-source" />{" "}
        <button type="button" class="yf-linkbtn" onClick={() => openAtlas(null, ind(), true)}>{t("facts.scale.all")}</button>
      </p>
    </Show>
  );
}

/** A sourced "Did you know" line for a slow change, from the first response card with a figure. */
export function TrendFact(props: { curveball: string; class?: string }): JSX.Element {
  const { game } = useGame();
  const card = () => game.model.curveballs.find((c) => c.id === props.curveball)?.responses.find((id) => game.model.cards.find((c) => c.id === id)?.fact);
  return (
    <Show when={card()}>
      <RealWalesLine card={card()!} label={t("facts.dyk.label")} class={props.class} />
    </Show>
  );
}

/** "Read this rule in the rule book": opens the rule's page over the game (for the Why panel). */
export function RuleLink(props: { rule: string; class?: string }): JSX.Element {
  return (
    <button type="button" class={`yf-linkbtn${props.class ? " " + props.class : ""}`} onClick={() => openBook(props.rule)} data-testid="rule-link">
      {t("facts.rule.read")}
    </button>
  );
}

/**
 * The notebook line for the end screen's detail fold: "You looked at 6 of 22 council areas. You never
 * looked at Powys, where your Warm homes card did the most." The second sentence comes from the
 * engine's per-area contributions of the player's cards.
 */
export function NotebookEndLine(props: { class?: string }): JSX.Element {
  const { game } = useGame();
  const las = () => inplay.notebook().las;
  const never = () => {
    const s = game.state();
    if (!s) return null;
    const codes = game.model.authorities.map((a) => a.code);
    let best: { card: string; code: string; v: number } | null = null;
    const sums = new Map<string, number[]>();
    for (const h of s.history) for (const c of h.contributions) {
      if (c.cause.kind !== "card") continue;
      const acc = sums.get(c.cause.id) ?? codes.map(() => 0);
      c.perLa.forEach((v, i) => { acc[i] = (acc[i] ?? 0) + Math.abs(v); });
      sums.set(c.cause.id, acc);
    }
    for (const [card, acc] of sums) acc.forEach((v, i) => { if (v > 0 && !las().includes(codes[i]!) && (!best || v > best.v)) best = { card, code: codes[i]!, v }; });
    const b = best as { card: string; code: string; v: number } | null;
    return b ? t("facts.nb.end_never", { area: game.names.laName(b.code), card: game.names.cardName(b.card) }) : null;
  };
  return (
    <p class={props.class} data-testid="notebook-end">
      {t("facts.nb.end", { n: las().length })}
      <Show when={never()}> {never()}</Show>
    </p>
  );
}
