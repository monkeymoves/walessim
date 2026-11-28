/**
 * Two years pass (v2-board.md section 11.4): the map plays the turn while this caption says what
 * finished and what landed. About five seconds, skippable with any key or the Skip tab. With
 * reduced motion nothing travels: the caption waits for Continue.
 */
import { createEffect, For, onCleanup, Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import { StampButton, TabButton } from "../../ui/parts";
import { useGame } from "./game";
import { councilName, projectName, tx } from "./words";

export function Passing(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const r = () => game.report()!;
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finished = () => (game.state()?.projects ?? []).filter((p) => r().finished.includes(p.id));
  const where = (p: { site: { council?: string; link?: string } }) => councilName(model, p.site.council ?? model.links.find((l) => l.id === p.site.link)?.from);
  createEffect(() => {
    if (reduced) return;
    const timer = window.setTimeout(() => game.nextScreen(), 3400);
    const key = (e: KeyboardEvent) => { if (e.key !== "Tab") game.nextScreen(); };
    window.addEventListener("keydown", key);
    onCleanup(() => { clearTimeout(timer); window.removeEventListener("keydown", key); });
  });
  return (
    <div class="bw-passing sheet" role="status" aria-live="polite" data-testid="bw-passing">
      <p class="t-year bw-passing-year">{r().toYear}</p>
      <p class="t-3">{t("boardui.passing.title", { years: model.game.turn_years })}</p>
      <ul class="bw-passing-lines">
        <For each={finished()}>{(p) => <li>{t("boardui.passing.built", { project: projectName(model, p.project), place: where(p) })}</li>}</For>
        <For each={r().events}>{(e) => <li>{t("boardui.passing.landed", { name: tx(model.events.find((x) => x.id === e.event)?.name), place: councilName(model, e.councils[0]) })}</li>}</For>
        <Show when={!finished().length && !r().events.length}><li>{t("boardui.passing.quiet")}</li></Show>
      </ul>
      <Show when={reduced} fallback={<TabButton onClick={() => game.nextScreen()}>{t("boardui.passing.skip")}</TabButton>}>
        <StampButton onClick={() => game.nextScreen()}>{t("boardui.passing.continue")}</StampButton>
      </Show>
    </div>
  );
}
