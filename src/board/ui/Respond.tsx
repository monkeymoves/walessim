/**
 * An event that landed and needs an answer (v2-board.md section 7.1): two or three responses,
 * each with its cost in coins and what it does. A slate slip, pinned, as the forecast was.
 */
import { For, type JSX } from "solid-js";
import { Pair, t, tn } from "../../i18n";
import { TabButton } from "../../ui/parts";
import { useGame } from "./game";
import { fill, tx } from "./words";

export function Respond(props: { event: string; councils: string[] }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const ev = () => model.events.find((e) => e.id === props.event);
  return (
    <div class="bw-respond on-slate" data-testid="bw-respond">
      <span class="bw-slip-pin" aria-hidden="true" />
      <p class="label bw-slip-from">{t("boardui.respond.from")}</p>
      <Pair text={ev()?.name} class="t-2 bw-slip-title" />
      <p class="bw-slip-say">{fill(model, tx(ev()?.landed), props.councils)}</p>
      <ul class="bw-respond-list">
        <For each={ev()?.responses ?? []}>
          {(r) => (
            <li>
              <TabButton
                onClick={() => game.act({ kind: "respond", event: props.event, response: r.id })}
                why={r.cost > (game.state()?.coins ?? 0) ? t("boardui.block.coins", { need: r.cost, have: game.state()?.coins ?? 0 }) : null}
              >
                {tx(r.name)}: {r.cost ? tn("boardui.respond.cost", r.cost) : t("boardui.respond.free")}
              </TabButton>
              <span class="small">{tx(r.what)}</span>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
