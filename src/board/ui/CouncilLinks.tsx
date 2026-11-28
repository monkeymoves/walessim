/**
 * Links in and out of a council (v2-board.md section 4.2): rail lines and how good they are,
 * where people commute to and from, and which way the rivers run. Every row says whether its
 * figure is real or illustrative, and hovering a row lights that link on the map.
 */
import { For, Show, type JSX } from "solid-js";
import { formatNum, t } from "./lang";
import type { CouncilView, LinkKind } from "../engine/api";
import { LINK_KINDS } from "../engine/api";
import { useGame } from "./game";
import { councilName, tx } from "./words";

export function CouncilLinks(props: { view: CouncilView }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const rows = (kind: LinkKind) => props.view.links.filter((l) => l.kind === kind);
  const honesty = (id: string) => model.links.find((l) => l.id === id)?.honesty ?? "real";
  const line = (l: CouncilView["links"][number]): string => {
    const other = councilName(model, l.other);
    if (l.kind === "rail") return t("boardui.link.rail", { line: tx(l.name ?? ""), other, quality: t(`boardui.quality.${l.quality ?? 1}`) });
    if (l.kind === "river") return t(l.direction === "out" ? "boardui.link.riverOut" : "boardui.link.riverIn", { river: tx(l.name ?? ""), other });
    const n = l.share !== undefined ? formatNum(l.share * 100, { maximumFractionDigits: 0 }) : null;
    if (n === null) return t(l.direction === "out" ? "boardui.link.commuteOutStep" : "boardui.link.commuteInStep", { other });
    return t(l.direction === "out" ? "boardui.link.commuteOut" : "boardui.link.commuteIn", { n, other, here: councilName(model, props.view.code) });
  };
  return (
    <section class="bw-sec">
      <h3 class="label">{t("boardui.council.links")}</h3>
      <For each={LINK_KINDS}>
        {(kind) => (
          <Show when={rows(kind).length}>
            <p class={`bw-linkkind bw-linkkind-${kind} small`}><i aria-hidden="true" />{t(`boardui.linkKind.${kind}`)}</p>
            <ul class="bw-links">
              <For each={rows(kind)}>
                {(l) => (
                  <li
                    onPointerEnter={() => game.setLitLink(l.link)}
                    onPointerLeave={() => game.setLitLink(null)}
                  >
                    <span>{line(l)}</span>
                    <Show when={honesty(l.link) !== "real"}>
                      <span class="small bw-honest">{t(`boardui.honesty.${honesty(l.link)}`)}</span>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        )}
      </For>
    </section>
  );
}
