/**
 * An event that landed and needs an answer (v2-board.md section 7.1, a hard stop in 16.2.5): two
 * or three responses, each with its cost in coins and what it does. The clock is held until you
 * answer. A slate slip, pinned and askew: the one angled thing on the board.
 */
import { createMemo, For, onMount, type JSX } from "solid-js";
import { lang, Pair, t, tn } from "./lang";
import { TabButton } from "../../ui/parts";
import { blockerWords } from "./blockers";
import { options } from "./engine";
import { useGame } from "./game";
import { fill, tx, whenWords } from "./words";
import { eventRiver, riverAt } from "../engine/api";
import { AfterCard } from "./clock/AfterCard";

export function Respond(props: { event: string; councils: string[] }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const ev = () => model.events.find((e) => e.id === props.event);
  const opts = createMemo(() => {
    const s = game.state();
    if (!s) return [];
    try { return options(model, s).filter((o) => o.action.kind === "respond" && o.action.event === props.event); } catch { return []; }
  });
  const respOf = (id: string) => ev()?.responses.find((r) => r.id === id);
  /** The river this event came down, from its own record (one river per event, playtest 10 must-fix 7). */
  const river = () => {
    const rec = [...(game.state()?.events ?? [])].reverse().find((e) => e.event === props.event);
    return (rec && eventRiver(model, rec)) ?? riverAt(model, props.councils[0]!, props.councils[1]);
  };
  let slip!: HTMLDivElement;
  // focus lands on the card, never on an answer: Enter or Space then answers nothing by chance (playtest 10 must-fix 10)
  onMount(() => slip.focus({ preventScroll: true }));
  return (
    <div ref={slip} tabindex="-1" class="bw-respond on-slate" role="alertdialog" aria-labelledby="bw-respond-title" data-testid="bw-respond">
      <span class="bw-slip-pin" aria-hidden="true" />
      <p class="label bw-slip-from">{t("boardui.respond.from", { when: whenWords(model, game.state()?.step ?? 0) })}</p>
      <Pair single={lang() === "cy"} text={ev()?.name} class="t-2 bw-slip-title" id="bw-respond-title" />
      <p class="bw-slip-say">{fill(model, tx(ev()?.landed), props.councils, river())}</p>
      <ul class="bw-respond-list">
        <For each={opts()}>
          {(o) => {
            const r = respOf(o.action.kind === "respond" ? o.action.response : "");
            return (
              <li>
                <TabButton onClick={() => game.act(o.action)} why={o.allowed ? null : o.blockers.map((b) => blockerWords(model, b)).join(" ")} data-testid="bw-respond-pick">
                  {/* the engine's price (a storm answer is free where farms hold water), as the coins it takes */}
                  {o.cost ? t("boardui.respond.pick", { name: tx(r?.name), cost: tn("boardui.respond.cost", o.cost) }) : t("boardui.respond.pickFree", { name: tx(r?.name) })}
                </TabButton>
                <span class="small">{tx(r?.what)}</span>
              </li>
            );
          }}
        </For>
      </ul>
      <p class="small bw-slip-held">{t("boardui.respond.held")}</p>
      <AfterCard />
    </div>
  );
}
