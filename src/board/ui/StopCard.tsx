/**
 * A soft stop on screen (16.2.5): one line and two buttons, "Look" (selects the council and stays
 * paused) and "Carry on". The clock is held while it shows, so nothing moves while it is read. A
 * warning is a slate slip, pinned and askew, as the forecast was; everything else is a paper slip.
 */
import { onMount, Show, type JSX } from "solid-js";
import { t } from "./lang";
import { StampButton, TabButton } from "../../ui/parts";
import { eventNoun, type BoardModel, type Stop } from "../engine/api";
import { visitBlockWords } from "./blockers";
import { useGame } from "./game";
import { councilName, projectName, say, tx, whenWords } from "./words";
import type { QueuedStop } from "./clock/stops";

/** The fallback line while the engine's sentence (`board.stop.<kind>`, package 10) is not written. */
function fallbackLine(model: BoardModel, stop: Stop): string {
  const ref = stop.ref ?? "";
  const vars = {
    council: councilName(model, stop.council),
    project: projectName(model, ref),
    event: tx(model.events.find((e) => e.id === ref)?.name ?? ""),
    noun: model.events.some((e) => e.id === ref) ? t(eventNoun(ref)) : "",
    place: tx(model.places.find((p) => p.id === ref)?.name ?? ""),
    branch: tx(model.branches.find((b) => b.id === ref.split(":")[0])?.name ?? ""),
    tier: ref.split(":")[1] ?? "",
  };
  if (stop.kind === "tier_open" && ref.startsWith("legacy:")) return t("boardui.stop.tier_open.legacy", { project: projectName(model, ref.slice(7)) });
  const to = stop.say.key.split(".").pop();
  if (stop.kind === "tipping" && (to === "rising" || to === "slipping")) return t(`boardui.stop.tipping.${to}`, vars);
  return t(`boardui.stop.${stop.kind}.line`, vars);
}

export function StopCard(props: { item: QueuedStop }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const stop = () => props.item.stop;
  /** The engine's sentence leads when it is written; until then, the kind of stop and a plain line. */
  const said = () => say(stop().say);
  const look = () => {
    const s = stop();
    game.clock.look();
    if (s.kind === "warning" && s.ref) game.setWarning(s.ref);
  };
  const visitPlace = () => (stop().kind === "visit" ? stop().ref : undefined);
  /** Why the visit cannot be made now, so "Go and visit" never leads to a refusal. */
  const visitBlock = () => {
    const place = visitPlace(), s = game.state();
    return place && s ? visitBlockWords(model, s, place) : null;
  };
  let card!: HTMLDivElement;
  // a keyboard player lands on the card's own buttons, not on whatever the clock left behind
  onMount(() => card.querySelector<HTMLButtonElement>("[data-testid=bw-stop-on], [data-testid=bw-stop-visit]")?.focus());
  return (
    <div ref={card} class={`bw-stop bw-stop-${stop().kind}`} classList={{ "on-slate": stop().kind === "warning" }} role="alertdialog" aria-labelledby="bw-stop-title" aria-describedby="bw-stop-line" data-testid="bw-stop">
      <Show when={stop().kind === "warning"}><span class="bw-slip-pin" aria-hidden="true" /></Show>
      <p class="label bw-stop-when">{whenWords(model, props.item.step + 1, true)}. {t(`boardui.stop.${stop().kind}.title`)}</p>
      <Show when={said()} fallback={<>
        <h2 class="t-2 bw-stop-title" id="bw-stop-title">{t(`boardui.stop.${stop().kind}.title`)}</h2>
        <p class="bw-stop-line" id="bw-stop-line">{fallbackLine(model, stop())}</p>
      </>}>
        <h2 class="t-2 bw-stop-title" id="bw-stop-title">{said()}</h2>
        <span id="bw-stop-line" hidden />
      </Show>
      <div class="bw-stop-row">
        <Show when={visitPlace()}>
          <StampButton onClick={() => { game.clock.look(); game.setVisit(visitPlace()!); }} why={visitBlock()} data-testid="bw-stop-visit">{t("boardui.stop.visitGo")}</StampButton>
        </Show>
        <Show when={stop().council}>
          <TabButton onClick={look} data-testid="bw-stop-look">{t("boardui.stop.lookAt", { council: councilName(model, stop().council) })}</TabButton>
        </Show>
        <Show when={visitPlace()} fallback={<StampButton onClick={() => game.clock.carryOn()} data-testid="bw-stop-on">{stop().kind === "ended" ? t("boardui.report.toEnd") : t("boardui.stop.carryOn")}</StampButton>}>
          <TabButton onClick={() => game.clock.carryOn()} data-testid="bw-stop-on">{t("boardui.stop.carryOn")}</TabButton>
        </Show>
      </div>
      <p class="small bw-stop-note">{t("boardui.stop.note")}</p>
    </div>
  );
}
