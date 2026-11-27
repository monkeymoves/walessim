// What is changing this board this term, shown on the board before the player places a thread
// (playtest 4): "In play this term: Price of a home", then each condition in words from the engine.
import { For, Show, type JSX } from "solid-js";
import { pick, t } from "../../i18n";
import type { Text } from "../../engine/api";
import { useGame } from "../game/context";

export function TermConditions(props: { place: "rhondda" | "bethesda"; activeTrends: string[]; conditions?: Text[]; class?: string }): JSX.Element {
  const { game } = useGame();
  const board = game.names.place(props.place);
  /** The trends behind the conditions, by name, for the strip's heading. */
  const trends = () => {
    const on = new Set([...(board?.trend_penalties ?? []), ...(board?.term_notes ?? [])].map((p) => p.curveball));
    return props.activeTrends.filter((c) => on.has(c));
  };
  const conditions = () => props.conditions ?? [];
  return (
    <Show when={trends().length || conditions().length}>
      <div class={`warnstrip pl-conditions${props.class ? " " + props.class : ""}`} role="note">
        <div>
          <p class="small strong">{t("place.common.in_play", { trend: game.names.list(trends().map((c) => game.names.curveballName(c))) })}</p>
          <Show when={conditions().length}>
            <ul class="pl-conditions-list small">
              <For each={conditions()}>{(c) => <li>{pick(c)}</li>}</For>
            </ul>
          </Show>
        </div>
      </div>
    </Show>
  );
}
