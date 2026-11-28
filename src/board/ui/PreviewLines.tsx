/**
 * "If you build this": the engine's preview as plain lines, by council, with the season each
 * change is first felt and the links it travels. Always "about", always a game estimate. Given the
 * card's opening (`readyStep`, `readyYear`), a change felt when it opens carries the same season as
 * the card, and one that beds in says so (playtest 9, must-fix 11: "From Summer 2028" beside "+1.1
 * from 2032").
 */
import { For, Show, type JSX } from "solid-js";
import { t } from "./lang";
import type { BoardModel, WhyQuantity } from "../engine/api";
import { useGame } from "./game";
import { councilName, feltStep, listOf, measureName, say, signed, tx, whenWords } from "./words";

export interface PreviewLine { council: string; quantity: WhyQuantity; delta: number; year: number; via: boolean }

/**
 * One preview line in words. Given the card's opening, the season is the one the change is first
 * felt (`feltStep`): the card's own season when it opens, a later one when it beds in.
 */
export function previewLineWords(model: BoardModel, l: PreviewLine, readyStep?: number, readyYear?: number): string {
  const base = { council: councilName(model, l.council), measure: measureName(model, l.quantity), d: signed(l.delta) };
  if (readyStep === undefined || readyYear === undefined) return t(l.via ? "boardui.preview.lineVia" : "boardui.preview.line", { ...base, year: l.year });
  const when = whenWords(model, feltStep(model, readyStep, readyYear, l.year));
  return t(`boardui.preview.${l.year > readyYear ? "felt" : "opens"}${l.via ? "Via" : ""}`, { ...base, when });
}

export function PreviewLines(props: { readyStep?: number; readyYear?: number }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const p = () => game.preview();
  const lines = () => {
    const out = new Map<string, PreviewLine>();
    for (const c of p()?.changes ?? []) {
      const k = `${c.council}|${c.quantity}|${c.year}|${!!c.via}`;
      const was = out.get(k);
      out.set(k, { council: c.council, quantity: c.quantity, delta: (was?.delta ?? 0) + c.delta, year: c.year, via: !!c.via });
    }
    return [...out.values()].filter((l) => Math.abs(l.delta) >= 0.05);
  };
  const lineWords = (l: PreviewLine): string => previewLineWords(model, l, props.readyStep, props.readyYear);
  const linkNames = () => (p()?.links ?? []).map((id) => {
    const l = model.links.find((x) => x.id === id);
    if (!l) return id;
    return l.name ? tx(l.name) : t("boardui.preview.commute", { a: councilName(model, l.from), b: councilName(model, l.to) });
  });
  return (
    <div class="bw-preview">
      <p class="label">{t("boardui.preview.title")}</p>
      <Show when={lines().length} fallback={<p class="small">{t("boardui.preview.none")}</p>}>
        <ul>
          <For each={lines()}>
            {(l) => (
              <li class="small">
                {lineWords(l)}
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={linkNames().length}>
        <p class="small bw-preview-links">{t("boardui.preview.links", { list: listOf(linkNames()) })}</p>
      </Show>
      <For each={(p()?.notes ?? []).filter((n) => !n.key.endsWith("build.catch"))}>{(n) => <p class="small bw-catch">{say(n)}</p>}</For>
      <p class="small bw-honest">{t("boardui.preview.honest")}</p>
    </div>
  );
}
