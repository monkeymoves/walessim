/**
 * "If you build this": the engine's preview as plain lines, by council, with the year each change
 * is expected and the links it travels. Always "about", always a game estimate.
 */
import { For, Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import type { WhyQuantity } from "../engine/api";
import { useGame } from "./game";
import { councilName, measureName, say, signed, tx } from "./words";

export function PreviewLines(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const p = () => game.preview();
  const lines = () => {
    const out = new Map<string, { council: string; quantity: WhyQuantity; delta: number; year: number; via: boolean }>();
    for (const c of p()?.changes ?? []) {
      const k = `${c.council}|${c.quantity}|${c.year}|${!!c.via}`;
      const was = out.get(k);
      out.set(k, { council: c.council, quantity: c.quantity, delta: (was?.delta ?? 0) + c.delta, year: c.year, via: !!c.via });
    }
    return [...out.values()].filter((l) => Math.abs(l.delta) >= 0.05);
  };
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
                {t(l.via ? "boardui.preview.lineVia" : "boardui.preview.line", { council: councilName(model, l.council), measure: measureName(model, l.quantity), d: signed(l.delta), year: l.year })}
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={linkNames().length}>
        <p class="small bw-preview-links">{t("boardui.preview.links", { list: linkNames().join(t("boardui.list.and")) })}</p>
      </Show>
      <For each={(p()?.notes ?? []).filter((n) => !n.key.endsWith("build.catch"))}>{(n) => <p class="small bw-catch">{say(n)}</p>}</For>
      <p class="small bw-honest">{t("boardui.preview.honest")}</p>
    </div>
  );
}
