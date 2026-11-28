/**
 * A soft stop on screen (16.2.5): one line and two buttons, "Look" (selects the council and
 * pauses) and "Carry on". The clock is held while it shows, so nothing moves while it is read. A
 * warning is a slate slip, pinned and askew, as the forecast was; everything else is a paper slip.
 *
 * After cold playtest 9:
 * - It sits in the lane between the build menu and the council panel (clock.css), so it never
 *   covers the build menu or its Build button, and it scrolls inside itself rather than clip.
 * - Its note says what time will do after it: run again if it was running, stay paused if the
 *   player had paused it; Look pauses (should fix 4).
 * - With several cards waiting it says which of how many, and offers to carry on past them all
 *   (they are all in the ticker), so cards come one at a time and never pile up unseen.
 * - A new tier names the builds that opened it and what it offers (should fix 5).
 * - A warning gives its window in game time: it only comes closer while time runs.
 *
 * After cold playtest 10:
 * - The card's own button for what time does after it: "Pause after this card" while time was
 *   running, "Run after this card" while paused; Space and the clock's Pause do the same (should
 *   fix 5, must fix 10). Focus starts on the card itself, never on a button that answers it.
 * - The keystone line says "start now" only while one can still be started (./clock/opened.ts
 *   `keystoneOffer`, must fix 12).
 * - "Carry on past all" keeps every warning it passes pinned to the board as a slip to read.
 * - The run-up card, a year before each election: which councils would tip it and how far each is
 *   from backing you, as package C's TargetsCard draws it in the term report (./clock/runup.ts).
 */
import { onMount, Show, type JSX } from "solid-js";
import { t } from "./lang";
import { purseLever } from "./purseLever";
import { StampButton, TabButton } from "../../ui/parts";
import { eventNoun, keystoneLastStep, type BoardModel, type BoardState, type ProjectState, type Stop } from "../engine/api";
import { visitBlockWords } from "./blockers";
import { useGame } from "./game";
import { keystoneOffer, openedBy } from "./clock/opened";
import { electionTargets } from "./electionTargets";
import { TargetsCard } from "./TargetsCard";
import { branchName, councilName, listOf, projectName, say, tx, whenWords } from "./words";
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

/** A build and where it stands: its council, or both ends of its line. */
function builtAt(model: BoardModel, p: ProjectState): string {
  const project = projectName(model, p.project);
  if (p.site.council) return t("boardclock.tier.builtAt", { project, place: councilName(model, p.site.council) });
  const link = model.links.find((l) => l.id === p.site.link);
  return t("boardclock.tier.builtOn", { project, from: councilName(model, link?.from), to: councilName(model, link?.to) });
}

const builtWords = (model: BoardModel, ps: ProjectState[]): string => listOf(ps.map((p) => builtAt(model, p)));

/** Where a build stands, for "is working in". */
const placeOf = (model: BoardModel, p: ProjectState): string =>
  councilName(model, p.site.council ?? model.links.find((l) => l.id === p.site.link)?.from);

/** A new tier, in words: its title and lines, naming what opened it. Null when the board cannot say. */
function tierWords(model: BoardModel, state: BoardState, opened: ReturnType<typeof openedBy>): { title: string; lines: string[] } | null {
  if (!opened) return null;
  if (opened.kind === "legacy") {
    const lines = [opened.at
      ? t("boardclock.tier.legacyBy", { project: projectName(model, opened.project), keystone: projectName(model, opened.keystone), place: placeOf(model, opened.at) })
      : t("boardui.stop.tier_open.legacy", { project: projectName(model, opened.project) })];
    return { title: t("boardui.stop.tier_open.title"), lines };
  }
  const branch = branchName(model, opened.branch);
  const lines: string[] = [];
  if (opened.by.length) lines.push(t("boardclock.tier.by", { list: builtWords(model, opened.by), n: opened.need, tier: t(`boardui.tierName.${opened.needTier}`) }));
  const keystone = opened.offers.find((p) => p.keystone);
  if (keystone) {
    // the same season the engine's blocker and the time line use (time.ts keystoneLastStep)
    const last = keystoneLastStep(model);
    const offer = keystoneOffer(model, state, keystone.id);
    const vars = { project: projectName(model, keystone.id), n: keystone.build_years, when: whenWords(model, last) };
    if (offer === "now") lines.push(t("boardclock.tier.keystoneNow", vars));
    else if (offer === "late") lines.push(t("boardclock.tier.keystoneLate", vars));
    const others = opened.offers.filter((p) => !p.keystone);
    if (others.length) lines.push(t("boardclock.tier.offers", { list: listOf(others.map((p) => projectName(model, p.id))) }));
  } else if (opened.offers.length) {
    lines.push(t("boardclock.tier.offers", { list: listOf(opened.offers.map((p) => projectName(model, p.id))) }));
  }
  return { title: t(opened.tier >= 3 ? "boardclock.tier.title3" : "boardclock.tier.title2", { branch }), lines };
}

export function StopCard(props: { item: QueuedStop }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const c = game.clock;
  const stop = () => props.item.stop;
  /** The engine's sentence leads when it is written; until then, the kind of stop and a plain line. */
  const said = () => say(stop().say);
  const tier = () => {
    const s = stop(), st = game.state();
    return s.kind === "tier_open" && s.ref && st ? tierWords(model, st, openedBy(model, st, s.ref)) : null;
  };
  /** The run-up to an election, read from the board now (package C's electionTargets, as the term report reads it). */
  const run = () => {
    const st = game.state();
    return stop().kind === "runup" && st ? electionTargets(model, st) : null;
  };
  /** A warning's window, in game time. */
  const window = () => {
    const s = stop();
    if (s.kind !== "warning") return null;
    return game.forecast()?.warnings.find((w) => w.event === s.ref) ?? null;
  };
  const look = () => {
    const s = stop();
    c.look();
    if (s.kind === "warning" && s.ref) game.setWarning(s.ref);
  };
  const visitPlace = () => (stop().kind === "visit" ? stop().ref : undefined);
  /** Why the visit cannot be made now, so "Go and visit" never leads to a refusal. */
  const visitBlock = () => {
    const place = visitPlace(), s = game.state();
    return place && s ? visitBlockWords(model, s, place) : null;
  };
  const waiting = () => c.queue().length;
  /** Soft cards waiting, this one included: "Carry on past them" drops these (hard ones still come). */
  const soft = () => c.queue().filter((q) => !q.stop.hard).length;
  /** What time does after this card: what it did before it. Look and a visit pause it. */
  const note = () => {
    // the last card: no time is left to run, so it says where it leads, not what the clock does
    if (stop().kind === "ended") return t("boardclock.card.ended");
    if (c.prefs().stepByStep) return t("boardclock.card.step");
    if (!c.playing()) return t("boardclock.card.paused");
    return stop().council || visitPlace() ? t("boardclock.card.runsLook") : t("boardclock.card.runs");
  };
  /** The other choice for after the card: the same as Space or the clock's Pause button. */
  const canFlip = () => stop().kind !== "ended" && !c.prefs().stepByStep;
  const title = () => (stop().kind === "runup" ? t("boardclock.runup.label") : t(`boardui.stop.${stop().kind}.title`));
  let card!: HTMLDivElement;
  // focus lands on the card, never on a button that answers it (cold playtest 10, must fix 10)
  onMount(() => card.focus({ preventScroll: true }));
  return (
    <div ref={card} tabindex="-1" class={`bw-stop bw-lane bw-stop-${stop().kind}`} classList={{ "on-slate": stop().kind === "warning" }} role="alertdialog" aria-labelledby="bw-stop-title" aria-describedby="bw-stop-line" data-testid="bw-stop" data-needs-card>
      <Show when={stop().kind === "warning"}><span class="bw-slip-pin" aria-hidden="true" /></Show>
      <p class="label bw-stop-when">
        {whenWords(model, props.item.step + 1, true)}. {title()}
        <Show when={waiting() > 1}><span class="bw-stop-count" data-testid="bw-stop-count">. {t("boardclock.card.count", { n: 1, of: waiting() })}</span></Show>
      </p>
      <Show when={run()} keyed>
        {(r) => <>
          <h2 class="t-2 bw-stop-title" id="bw-stop-title">{t("boardclock.runup.title", { year: r.year })}</h2>
          <div id="bw-stop-line" class="bw-stop-lines bw-runup" data-testid="bw-runup"><TargetsCard targets={r} onLook={() => c.look()} /></div>
        </>}
      </Show>
      <Show when={stop().kind !== "runup"}>
      <Show when={tier()} keyed fallback={
        <Show when={said()} fallback={<>
          <h2 class="t-2 bw-stop-title" id="bw-stop-title">{t(`boardui.stop.${stop().kind}.title`)}</h2>
          <p class="bw-stop-line" id="bw-stop-line">{fallbackLine(model, stop() as Stop)}</p>
        </>}>
          <h2 class="t-2 bw-stop-title" id="bw-stop-title">{said()}</h2>
          <span id="bw-stop-line" hidden />
        </Show>
      }>
        {(w) => <>
          <h2 class="t-2 bw-stop-title" id="bw-stop-title">{w.title}</h2>
          <div id="bw-stop-line" class="bw-stop-lines" data-testid="bw-stop-opened">{w.lines.map((l) => <p class="bw-stop-line">{l}</p>)}</div>
        </>}
      </Show>
      </Show>
      <Show when={stop().kind === "purse_full" && game.state() ? purseLever(model, game.state()!) : ""}>
        {(line) => <p class="small bw-stop-lever" data-testid="bw-stop-lever">{line()}</p>}
      </Show>
      <Show when={window()} keyed>
        {(w) => <p class="small bw-stop-window" data-testid="bw-stop-window">{t("boardclock.warn.window", { from: whenWords(model, w.fromStep), to: whenWords(model, w.toStep) })}</p>}
      </Show>
      <div class="bw-stop-row">
        {/* a visit offer is a choice, go or carry on: the needs-you outline goes round both */}
        <Show when={visitPlace()} fallback={<>
          <Show when={stop().council}>
            <TabButton onClick={look} data-testid="bw-stop-look">{t("boardui.stop.lookAt", { council: councilName(model, stop().council) })}</TabButton>
          </Show>
          <StampButton onClick={() => c.carryOn()} data-testid="bw-stop-on" data-needs="carry-on">{stop().kind === "ended" ? t("boardui.report.toEnd") : t("boardui.stop.carryOn")}</StampButton>
        </>}>
          <div class="bw-stop-choose" data-needs="visit-offer">
            <StampButton onClick={() => { c.look(); game.setVisit(visitPlace()!); }} why={visitBlock()} data-testid="bw-stop-visit">{t("boardui.stop.visitGo")}</StampButton>
            <TabButton onClick={() => c.carryOn()} data-testid="bw-stop-on">{t("boardui.stop.carryOn")}</TabButton>
          </div>
          <Show when={stop().council}>
            <TabButton onClick={look} data-testid="bw-stop-look">{t("boardui.stop.lookAt", { council: councilName(model, stop().council) })}</TabButton>
          </Show>
        </Show>
      </div>
      <p class="small bw-stop-note" data-testid="bw-stop-note">
        {note()}
        <Show when={canFlip()}>
          {" "}<button type="button" class="inklink small bw-stop-flip" onClick={() => c.toggle()} data-testid="bw-stop-flip">{c.playing() ? t("boardclock.card.stayPaused") : t("boardclock.card.runAfter")}</button>
        </Show>
      </p>
      <Show when={soft() > 1 && !stop().hard}>
        <button type="button" class="inklink small bw-stop-all" onClick={() => c.carryOnAll()} data-testid="bw-stop-all">{t("boardclock.card.all", { n: soft() })}</button>
      </Show>
    </div>
  );
}
