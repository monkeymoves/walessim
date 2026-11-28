/**
 * One ticket in the build menu: a build, a legacy project or an upgrade. Its face says the price
 * (priceOf, the one price everywhere), when it would start working and, if it cannot be built, why.
 * One click opens it with its button first, scrolled into view, then what it does and its preview
 * (playtest 9, must-fix 6: Build sat far below an expanded card). An upgrade says it is an upgrade
 * on its face, its stub and its button ("Make it bigger"), never "Build it".
 */
import { onMount, Show, type JSX } from "solid-js";
import { t, tn } from "./lang";
import { Icon, StampButton } from "../../ui/parts";
import type { ActionOption, BoardModel, ProjectDef } from "../engine/api";
import { blockerWords } from "./blockers";
import { dealBuildWords } from "./dealWords";
import { useGame } from "./game";
import { iconFor } from "./icons";
import { PreviewLines } from "./PreviewLines";
import { fareWords, goWords, offWords, priceOf } from "./price";
import { councilName, num, takesWords, tx, whenWords } from "./words";

/** Where a project would stand, in words: the rail link and the other end, or "" for a council. */
function siteWords(model: BoardModel, o: ActionOption, here: string): string {
  const a = o.action;
  if ((a.kind === "build" || a.kind === "upgrade") && a.site.link) {
    const l = model.links.find((x) => x.id === a.site.link);
    if (l) return t("boardui.build.onLink", { line: tx(l.name ?? ""), other: councilName(model, l.from === here ? l.to : l.from) });
  }
  return "";
}

export function BuildTicket(props: { o: ActionOption; def: ProjectDef | undefined; here: string; open: boolean; quiet?: boolean; onToggle: () => void; onBuild: () => void }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const o = () => props.o;
  const d = () => props.def;
  const upgrade = () => o().action.kind === "upgrade";
  const price = () => priceOf(model, game.state()!, o());
  const level = (): number => {
    const a = o().action;
    if (a.kind !== "upgrade") return 0;
    return game.state()?.projects.find((p) => p.project === a.project && p.site.council === a.site.council && p.site.link === a.site.link)?.level ?? 1;
  };
  // a legacy project waits on its keystone: its tier's own gate is opened by the keystone's, so it is not repeated
  const shown = () => (d()?.legacy_of ? o().blockers.filter((b) => !(b.kind === "needs" && b.condition.kind === "project" && b.condition.branch && b.condition.tier)) : o().blockers);
  const why = () => shown().map((b) => blockerWords(model, b, game.state() ?? undefined)).join(" ");
  const opens = () => (o().readyStep !== undefined ? whenWords(model, o().readyStep! + 1) : "");
  /** Whether it counts for an open deal here, as the engine will judge it (playtest 10, must-fix 1). */
  const dealLine = () => { const s = game.state(); return s ? dealBuildWords(model, s, o()) : ""; };
  return (
    <li class="bw-ticket" classList={{ locked: !o().allowed, open: props.open, keystone: !!d()?.keystone, upgrade: upgrade() }}>
      <button
        type="button"
        class="bw-ticket-face"
        aria-expanded={props.open}
        onPointerEnter={() => !props.open && !props.quiet && game.setHover(o().action)}
        onPointerMove={() => !props.open && !props.quiet && game.hover() === null && game.setHover(o().action)}
        onFocus={() => !props.open && !props.quiet && game.setHover(o().action)}
        onClick={props.onToggle}
        data-testid={`bw-opt-${o().project}`}
      >
        <span class="bw-ticket-stub">
          <Icon name={iconFor(model, o().project ?? "")} size={26} />
          <span class="furniture">{upgrade() ? t("boardui.build.upgradeStub") : t(`boardui.tierShort.${o().tier}`)}</span>
        </span>
        <span class="bw-ticket-body">
          <span class="bw-ticket-name">
            {upgrade() ? t("boardui.build.upgradeName", { name: tx(d()?.name) }) : tx(d()?.name)}
            <Show when={d()?.keystone && !upgrade()}><span class="small bw-keystone">{t("boardui.build.keystone")}</span></Show>
            <Show when={d()?.quick && !upgrade()}><span class="small bw-keystone">{t("boardui.build.quick")}</span></Show>
          </span>
          <Show when={upgrade()}><span class="small bw-ticket-up">{t("boardui.build.upgradeLine", { from: level(), to: level() + 1 })}</span></Show>
          <span class="small bw-ticket-site">{siteWords(model, o(), props.here)}</span>
          <Show when={offWords(model, price())}><span class="small bw-ticket-off">{offWords(model, price())}</span></Show>
          <Show when={dealLine()}><span class="small bw-ticket-deal" data-testid="bw-ticket-deal">{dealLine()}</span></Show>
          <Show when={!o().allowed}><span class="small bw-ticket-why">{why()}</span></Show>
        </span>
        <span class="bw-ticket-fare">
          <span class="furniture">{t("boardui.build.cost")}</span>
          {/* one figure and its unit, never two bare numbers side by side ("3 1", playtest 10 should-fix 9): the full price is in words on the face */}
          <span class="bw-fare-n" classList={{ short: o().blockers.some((x) => x.kind === "coins") }}>{fareWords(price())}</span>
          <Show when={!price().free}><span class="small bw-fare-unit">{tn("boardui.build.fareUnit", price().cost)}</span></Show>
          <Show when={opens()}><span class="small">{upgrade() ? t("boardui.build.biggerAt", { when: opens() }) : t("boardui.build.works", { when: opens() })}</span></Show>
        </span>
      </button>
      <Show when={props.open}>
        <More {...props} why={why()} price={goWords(price())} upgrade={upgrade()} opens={opens()} />
      </Show>
    </li>
  );
}

/** The opened ticket: its button (or exactly why not) first, then what it does and the preview. */
function More(props: { o: ActionOption; def: ProjectDef | undefined; onBuild: () => void; why: string; price: string; upgrade: boolean; opens: string }): JSX.Element {
  let act!: HTMLDivElement;
  // in view at once, button first: an expanded keystone at the foot of the list is never cut off
  onMount(() => requestAnimationFrame(() => act?.scrollIntoView?.({ block: "nearest" })));
  const d = () => props.def;
  return (
    <div class="bw-ticket-more">
      <div ref={act} class="bw-ticket-act">
        <Show when={props.o.allowed} fallback={<p class="small bw-ticket-why">{props.why}</p>}>
          <StampButton onClick={props.onBuild} data-testid="bw-build-it">{props.price}</StampButton>
        </Show>
        <p class="small">
          {props.upgrade
            ? t("boardui.build.biggerAt", { when: props.opens })
            : `${takesWords(props.o.buildYears ?? 0)} ${t("boardui.build.worksFull", { when: props.opens })}`}
        </p>
      </div>
      <p class="story-small">{tx(d()?.what)}</p>
      <p class="small"><i>{t("boardui.build.example", { text: tx(d()?.example) })}</i></p>
      <Show when={d()?.catch}><p class="small bw-catch">{t("boardui.build.catch", { text: tx(d()?.catch) })}</p></Show>
      <Show when={d()?.running}><p class="small">{t("boardui.build.running", { n: num(d()!.running!.coins_per_year) })}</p></Show>
      <PreviewLines readyStep={props.o.readyStep} readyYear={props.o.readyYear} />
    </div>
  );
}
