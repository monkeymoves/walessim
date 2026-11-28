/**
 * One turning point (16.5.2): its caption, a Why? that lists the largest changes in its council
 * over the eight years after it, and, for the heaviest event, one honest line about the choice not
 * made. No second game is run and nothing is claimed about what would have happened.
 */
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { t } from "../lang";
import { ThreadButton } from "../../../ui/parts";
import * as api from "../../engine/api";
import type { BoardModel, BoardState, Moment, Why } from "../../engine/api";
import { MEASURE_IDS } from "../../engine/api";
import { councilName, say, tx } from "../words";

/** The caption of a moment: the engine's sentence, or a plain one by kind. */
export function captionOf(model: BoardModel, m: Moment): string {
  return say(m.say) || t(`boardend.moment.${m.kind}`, { council: councilName(model, m.council ?? null), year: m.year });
}

/** The largest reasons in the moment's council over the eight years after it. */
function reasonsFor(model: BoardModel, state: BoardState, m: Moment): Why[] {
  if (!m.council) return [];
  const toStep = Math.min(state.step, m.step + Math.round(8 / model.game.years_per_step));
  const out: Why[] = [];
  for (const measure of MEASURE_IDS) {
    try { out.push(...api.why(model, state, { council: m.council, measure, fromStep: m.step, toStep })); } catch { /* not explainable: skip */ }
  }
  return out.filter((w) => Math.abs(w.delta) >= 0.05).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);
}

/** For an event moment: the answer given and one answer not given. */
export function choiceNotMade(model: BoardModel, state: BoardState, m: Moment): { chosen: string; other: string } | null {
  if (m.kind !== "event") return null;
  const rec = state.events.find((e) => e.step === m.step && (!m.ref || e.event === m.ref) && e.response);
  const def = rec ? model.events.find((e) => e.id === rec.event) : undefined;
  const chosen = def?.responses.find((r) => r.id === rec?.response);
  const other = def?.responses.find((r) => r.id !== rec?.response);
  return chosen && other ? { chosen: tx(chosen.name), other: tx(other.name) } : null;
}

export function TurningPoint(props: { model: BoardModel; state: BoardState; moment: Moment; heaviestEvent: boolean }): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const reasons = createMemo(() => (open() ? reasonsFor(props.model, props.state, props.moment) : []));
  const choice = () => (props.heaviestEvent ? choiceNotMade(props.model, props.state, props.moment) : null);
  return (
    <div class="be-turning">
      <p class="story-small be-turning-caption">
        <span class="data be-turning-year">{props.moment.year}</span> {captionOf(props.model, props.moment)}
      </p>
      <Show when={choice()}>
        <p class="small be-turning-choice">{t("boardend.turning.chose", { chosen: choice()!.chosen, other: choice()!.other })}</p>
      </Show>
      <Show when={props.moment.council}>
        <ThreadButton onClick={() => setOpen(!open())} aria-expanded={open()}>{t("boardend.turning.why")}</ThreadButton>
      </Show>
      <Show when={open()}>
        <Show when={reasons().length} fallback={<p class="small">{t("boardend.turning.whyNone")}</p>}>
          <ul class="be-why small">
            <For each={reasons()}>{(w) => <li>{say(w.say) || t("boardend.turning.whyLine", { council: councilName(props.model, w.council), year: w.year })}</li>}</For>
          </ul>
        </Show>
        <p class="small be-honest">{t("boardend.turning.whyNote")}</p>
      </Show>
    </div>
  );
}
