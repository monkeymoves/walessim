// Strand meters as yarn (design-system 4.6). Seven strips in a fixed order. Each: name and its
// pair, the move this term (cut triangle and figure, or "no change"), the yarn wound along ten
// pegs (flow: how people fare now), a knot when sharp or a loose fringe when fuzzy, and an ink
// cross-stitch on the pegs at the stock value (what is being handed on).
import { For, Show, type JSX } from "solid-js";
import { t, textOf, tIn, otherLang, lang, pick } from "../../i18n";
import { STRAND_IDS, type StrandId, type Text } from "../../model/schema";
import { strandVars } from "./strands";
import { Tooltip } from "./Tooltip";

export interface StrandMeterProps {
  strand: StrandId;
  /** Whole pips, 0 to 10 (StrandView.flowPips). */
  flowPips: number;
  /** Whole pips of the stock score, 0 to 10; omit to hide the cross-stitch. */
  stockPips?: number | null;
  /** At least 80 per cent of runs agree: a knot. Otherwise a loose fringe. */
  sharp?: boolean;
  /** Pips moved this term; null or undefined hides the move. */
  change?: number | null;
  /** Ghost preview of a card: pips it would add (positive) or remove (negative). */
  ghost?: number | null;
  /** A thread can be pulled from it: a red pin, and the strip becomes a button. */
  pullable?: boolean;
  onPull?: (strand: StrandId) => void;
  /** Extra tooltip line (for example "Up one place since 2026"). */
  note?: string;
  /** Whether the ghost forecast is sharp (dashed outline) or fuzzy (dotted); default sharp. */
  ghostSharp?: boolean;
  /**
   * The name to show on the strip, as a {en, cy} pair (a short form for tight bars). The full goal
   * name stays in the tooltip and the accessible name is built from it.
   */
  label?: Text;
}

/** "No change": a short level bar, cut square; the words are in the accessible name and tooltip. */
function LevelMark(): JSX.Element {
  return (
    <span class="meter-level" title={t("parts.meter.noChange")}>
      <svg viewBox="0 0 10 8" width="10" height="8" aria-hidden="true"><path fill="currentColor" d="M0 3h10v2H0z" /></svg>
      <span class="sr-only">{t("parts.meter.noChange")}</span>
    </span>
  );
}

function Triangle(props: { up: boolean }): JSX.Element {
  return (
    <svg viewBox="0 0 9 8" width="9" height="8" aria-hidden="true">
      <path fill="currentColor" d={props.up ? "M0 8h9L4.5 0z" : "M0 0h9L4.5 8z"} />
    </svg>
  );
}

export function StrandMeter(props: StrandMeterProps): JSX.Element {
  const name = () => t(`parts.strand.${props.strand}`);
  const shown = () => (props.label ? pick(props.label, lang()) : name());
  const otherName = () => (props.label ? pick(props.label, otherLang()) : tIn(otherLang(), `parts.strand.${props.strand}`));
  const goal = () => t(`parts.goal.${props.strand}`);
  const flow = () => Math.max(0, Math.min(10, props.flowPips));
  const ghostFrom = () => (props.ghost && props.ghost < 0 ? flow() + props.ghost : flow());
  const ghostLen = () => Math.abs(props.ghost ?? 0);
  const moveText = () => {
    const c = props.change;
    if (c == null) return "";
    if (c === 0) return t("parts.meter.noChange");
    return c > 0 ? t("parts.meter.upAria", { n: c }) : t("parts.meter.downAria", { n: -c });
  };
  const aria = () =>
    [
      t("parts.meter.aria", { name: name(), n: flow() }),
      props.stockPips != null ? t("parts.meter.stockAria", { n: props.stockPips }) : "",
      moveText(),
      props.sharp === false ? t("parts.meter.fuzzy") : "",
      props.note ?? "",
    ].filter(Boolean).join(". ");
  const body = (): JSX.Element => (
    <>
      <div class="meter-head">
        <span class="meter-name">{shown()}</span>
        <Show when={props.change != null}>
          <span class="meter-move data">
            <Show when={props.change !== 0} fallback={<LevelMark />}>
              <Triangle up={(props.change ?? 0) > 0} />
              {Math.abs(props.change ?? 0)}
            </Show>
          </span>
        </Show>
      </div>
      <span class="other" lang={otherLang()}>{otherName()}</span>
      <div class="yarn" classList={{ sharp: props.sharp !== false, fuzzy: props.sharp === false }} style={{ "--n": flow() }}>
        <i />
        <Show when={ghostLen() > 0}>
          <b class="ghost" classList={{ fuzzy: props.ghostSharp === false, down: (props.ghost ?? 0) < 0 }} style={{ "--g0": ghostFrom(), "--gn": ghostLen() }} />
        </Show>
      </div>
      <div class="pegs">
        <Show when={props.stockPips != null}>
          <b style={{ "--s": Math.max(0, Math.min(10, props.stockPips!)) }} />
        </Show>
      </div>
      <Show when={props.pullable}>
        <i class="meter-pin" aria-hidden="true" />
      </Show>
    </>
  );
  const tipLines = () => (
    <>
      {t("parts.meter.tip", { name: name(), n: flow() })}
      <Show when={props.stockPips != null}> {t("parts.meter.tipStock", { n: props.stockPips! })}</Show>
      <Show when={props.sharp === false}> {t("parts.meter.fuzzy")}</Show>
      <Show when={props.note}> {props.note}</Show>
    </>
  );
  return (
    <li class="meter" data-strand={props.strand} style={strandVars(props.strand)} lang={lang()}>
      <Tooltip heading={goal()} content={tipLines()}>
        <Show
          when={props.pullable && props.onPull}
          fallback={<div class="meter-inner" role="img" aria-label={aria()}>{body()}</div>}
        >
          <button type="button" class="meter-inner meter-button" aria-label={`${aria()}. ${t("parts.meter.pull")}`} onClick={() => props.onPull!(props.strand)}>
            {body()}
          </button>
        </Show>
      </Tooltip>
    </li>
  );
}

export interface StrandRowView {
  strand: StrandId;
  flowPips: number;
  stockPips?: number | null;
  flowSharp?: boolean;
}

export interface StrandRowProps {
  /** One per strand, any order: StrandView from the engine fits. */
  views: StrandRowView[];
  changes?: Partial<Record<StrandId, number | null>>;
  ghosts?: Partial<Record<StrandId, number | null>>;
  notes?: Partial<Record<StrandId, string>>;
  /** Per strand: is the ghost forecast sharp (default) or fuzzy. */
  ghostSharp?: Partial<Record<StrandId, boolean>>;
  /** Per strand: the name to show on the strip (short forms for tight bars). */
  labels?: Partial<Record<StrandId, Text>>;
  pullable?: StrandId[];
  onPull?: (strand: StrandId) => void;
  class?: string;
}

/** The seven strands in the fixed order. */
export function StrandRow(props: StrandRowProps): JSX.Element {
  const byId = (id: StrandId) => (props.views ?? []).find((v) => v && v.strand === id);
  return (
    <ol class={`strandrow${props.class ? " " + props.class : ""}`} aria-label={t("parts.meter.row")}>
      <For each={STRAND_IDS.filter((id) => byId(id))}>
        {(id) => (
          <StrandMeter
            strand={id}
            flowPips={byId(id)?.flowPips ?? 0}
            stockPips={byId(id)?.stockPips}
            sharp={byId(id)?.flowSharp}
            change={props.changes?.[id]}
            ghost={props.ghosts?.[id]}
            ghostSharp={props.ghostSharp?.[id]}
            label={props.labels?.[id]}
            note={props.notes?.[id]}
            pullable={props.pullable?.includes(id)}
            onPull={props.onPull}
          />
        )}
      </For>
    </ol>
  );
}

/** The goal name of a strand as a {en, cy} pair. */
export const strandGoal = (id: StrandId) => textOf(`parts.goal.${id}`);
/** The short strand name as a {en, cy} pair. */
export const strandName = (id: StrandId) => textOf(`parts.strand.${id}`);
