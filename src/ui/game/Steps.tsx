// The rail's content for each of the seven steps of a term (game-design 2.2), plus the
// caretaker term. Each panel has one stamp: the action that moves the term on.
import { createEffect, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { lang, pick, t, tn } from "../../i18n";
import { StampButton, TabButton, ThreadButton } from "../parts/Buttons";
import { SevereNotice, WarnStrip, Snip } from "../parts/Notice";
import { StrandName } from "./StrandName";
import { cardIcon, Icon } from "../parts/Icon";
import { iPlace, maePlace, midEn, soft, softYn, tw, ynPlace } from "./cymraeg";
import type { Slip, StrandId, TrustReason, VisitOffer } from "../../engine/api";
import { STRAND_IDS } from "../../model/schema";
import { useGame } from "./context";
import { BudgetRow } from "./Budget";
import { GUIDE_CARD, GUIDE_SLOW, Hand, TicketTray } from "./Hand";
import { ForScale } from "./RealWales";
import { Note } from "./Note";
import { VoiceSheet } from "./Pieces";

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------------ 1. opening

export function OpeningPanel(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const o = () => s().opening;
  const first = () => s().term === 0 && s().log.length === 0;
  return (
    <div class="yf-panel">
      <Show
        when={!first()}
        fallback={
          <div class="yf-hook sheet">
            <p class="yf-hook-line print">{t("play.title.line1")}</p>
            <p class="story-small">{t("play.title.line2")}</p>
            <StampButton class="yf-go" data-testid="start" onClick={() => game.act({ type: "open" })}>{t("play.title.start")}</StampButton>
            <p class="small">{t("play.title.note")}</p>
            <div class="yf-letters" role="img" aria-label={t("game.hook.letters", { n: game.letters().length })}>
              <For each={["feast", "long_winter", "gift", "hollow", "steady", "uneven"] as const}>
                {(a) => <span class="yf-letter" classList={{ got: game.letters().includes(a) }}><Icon name="envelope" size={26} /></span>}
              </For>
              <span class="small data">{t("game.hook.letters", { n: game.letters().length })}</span>
            </div>
          </div>
        }
      >
        <VoiceSheet voice={o()?.voice ?? null} year={s().year} />
        <div class="yf-step sheet">
          <h2 class="t-2">{t("game.step.opening")}</h2>
          <Show when={o()?.returning}>
            <WarnStrip>{t("game.opening.returning")}</WarnStrip>
          </Show>
          <Show when={o()?.arrivals.length}>
            <h3 class="label">{t("game.opening.arrived")}</h3>
            <ul class="yf-list">
              <For each={o()!.arrivals}>
                {(a) => <li>{t("game.opening.arrival_line", { card: game.names.cardName(a.card), year: a.playedYear })}</li>}
              </For>
            </ul>
          </Show>
          <Show when={!o()?.newTrend}>
            <p class="small">{t("game.opening.no_new_trend")}</p>
          </Show>
          <p class="data">{tn("game.opening.budget", s().budget.available)}. {tn("game.opening.limit", s().cardLimit)}.</p>
          <StampButton class="yf-go" onClick={() => game.act({ type: "open" })}>{t("game.opening.begin")}</StampButton>
        </div>
      </Show>
    </div>
  );
}

// ------------------------------------------------------------------ 2. pledge

export function PledgePanel(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const strand = () => s().pledgeOffer;
  /**
   * Cards in the hand, or on their way, that help the asked-for goal (cold playtest: a promise
   * nothing in hand could keep). The engine's offer is unchanged; the player is told before choosing.
   */
  const helpers = () => {
    const id = strand();
    if (!id) return [];
    const helps = (c: string) => (game.names.card(c)?.helps ?? []).includes(id);
    const onWay = s().post.filter((p) => p.arrivesTerm >= s().term).map((p) => p.card);
    return [...new Set([...s().hand, ...onWay])].filter(helps);
  };
  return (
    <div class="yf-panel">
      <VoiceSheet voice={s().opening?.voice ?? null} year={s().year} />
      <div class="yf-step sheet">
        <h2 class="t-2">{t("game.step.pledge")}</h2>
        <p class="story-small">{t("game.pledge.ask")}</p>
        <Show when={strand()}>
          <p class="yf-pledge-strand"><StrandName strand={strand()!} /></p>
          <p class="small">{t("game.pledge.note", { strand: game.names.strandName(strand()!), strand_i: soft(game.names.strandName(strand()!)) })}</p>
          <Show when={helpers().length} fallback={
            <p class="small yf-warn-line" data-testid="promise-warning">{tw("play.promise.no_card", { goal: game.names.strandName(strand()!) }, [])}</p>
          }>
            <p class="small">{t("play.promise.cards", { cards: game.names.list(helpers().map((id) => game.names.cardName(id))) })}</p>
          </Show>
          <Note id="promise" when={true} class="yf-note-promise" placement="left">{t("play.guide.promise")}</Note>
        </Show>
        <div class="yf-actions">
          <StampButton class="yf-go" onClick={() => game.act({ type: "pledge", strand: strand() })}>
            {t("game.pledge.make", { strand: strand() ? game.names.strandName(strand()!) : "" })}
          </StampButton>
          <TabButton onClick={() => game.act({ type: "pledge", strand: null })}>{t("game.pledge.decline")}</TabButton>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 3. plan

export function PlanPanel(): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const problems = () => game.problems();
  const [sheet, setSheet] = createSignal(false);
  const firstProblem = () => {
    const p = problems()[0];
    if (!p) return null;
    return t(`game.plan.problem.${p.code}`, { card: p.card ? game.names.cardName(p.card) : "" });
  };
  const first = () => s().term === 0 && s().options.firstGame;
  const b = () => game.budget();
  /** A card opened and half set up (two regions being chosen) but not played: never lose it silently. */
  const pending = () => {
    const id = game.selected();
    if (!id || game.isPlayed(id)) return null;
    const card = game.names.card(id);
    if (!card) return null;
    return card.scope === "two_regions" || (ui.twoPick()[id]?.length ?? 0) > 0 ? id : null;
  };
  const doCommit = () => {
    setSheet(false);
    if (game.commit()) {
      ui.guide.done("commit");
      ui.guide.done("post");
      ui.guide.done("coins_left");
      ui.setRegionPick(null);
    }
  };
  /** Ending the turn with coins not used, or a card half played, asks first (plain-wales 3.3). */
  const endTurn = () => {
    if (problems().length) return;
    if (b().unused > 0 || pending()) { setSheet(true); return; }
    doCommit();
  };
  /** The most coins that can still be useful in the fund. */
  const canSave = () => Math.max(0, Math.min(b().unused, game.usefulSave() - b().fund));
  const saveAndEnd = () => { game.setSaved(b().fund + canSave()); doCommit(); };
  /** Borrowing and bills (old ledger) appear from turn 3, or when first needed (plain-wales 3.1). */
  const showLedger = () => s().term >= 2 || s().debts.length > 0 || s().upkeepDue.length > 0 || s().deferrals > 0 || ui.shortfall() || !!game.draft.standing;
  return (
    <div class="yf-panel yf-panel-plan">
      <Show when={s().pledge}>
        <p class="yf-pledged small">{t("game.pledge.made", { strand: game.names.strandName(s().pledge!) })}</p>
      </Show>
      <Show when={first() && !ui.guide.hasSeen("how") && !ui.guide.skipped()} fallback={
        <>
          <Hand interactive />
          <TicketTray />
        </>
      }>
        <HowItWorks />
      </Show>
      <div class="yf-plan-foot sheet">
        <BudgetRow />
        <Show when={first() && b().spent === 0}>
          <p class="small yf-first-note">{t("play.budget.first_turn")}</p>
        </Show>
        <Note id="coins_left" when={first() && game.draft.cards.length > 0 && b().unused > 0 && (ui.guide.hasSeen("slow_card") || game.isPlayed(GUIDE_SLOW))} class="yf-note-coins" placement="above">
          {tn("play.guide.coins_left", b().unused)}
        </Note>
        <Note id="upkeep" when={s().upkeepDue.length > 0} class="yf-note-upkeep" placement="above">{t("play.guide.upkeep")}</Note>
        <Note id="borrow" when={showLedger() && (ui.shortfall() || s().term >= 2)} class="yf-note-borrow" placement="above">{t("play.guide.borrow")}</Note>
        <div class="yf-plan-actions">
          <Show when={showLedger()}>
            <TabButton id="yf-ledger-open" onClick={() => game.setLedgerOpen(!game.ledgerOpen())} aria-expanded={game.ledgerOpen()}>
              {t("game.plan.ledger_short")}
              <Show when={game.draft.standing || game.draft.repayDebt || game.draft.repair || game.draft.skipUpkeep.length}>
                <span class="yf-dot" aria-hidden="true">*</span>
              </Show>
            </TabButton>
          </Show>
          <StampButton class="yf-go yf-commit" data-testid="end-turn" onClick={endTurn} why={firstProblem()}>{t("play.endturn.button")}</StampButton>
        </div>
        <Show when={game.draft.cards.length === 0}>
          <p class="small yf-warn-line">{t("play.endturn.no_cards")}</p>
        </Show>
      </div>
      <Show when={sheet()}>
        <EndTurnSheet unused={b().unused} save={canSave()} pending={pending()} first={first()} onBack={() => setSheet(false)} onSave={saveAndEnd} onEnd={doCommit} />
      </Show>
    </div>
  );
}

/** The end-of-turn choice sheet: coins not used are never saved or lost without a word. */
function EndTurnSheet(props: { unused: number; save: number; pending: string | null; first: boolean; onBack: () => void; onSave: () => void; onEnd: () => void }): JSX.Element {
  const { game } = useGame();
  onMount(() => document.querySelector<HTMLElement>("[data-testid=end-back]")?.focus());
  const lost = () => props.unused - props.save;
  return (
    <div class="yf-endsheet-wrap">
      <section class="yf-endsheet sheet" role="dialog" aria-modal="true" aria-labelledby="yf-endsheet-title" data-testid="end-sheet"
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); props.onBack(); } }}>
        <h2 id="yf-endsheet-title" class="t-2">{t("play.endturn.title")}</h2>
        <Show when={props.pending}>
          <p class="story-small yf-warn-line">{t("play.endturn.card_open", { card: game.names.cardName(props.pending!) })}</p>
        </Show>
        <Show when={props.unused > 0}>
          <p class="story-small">{tn("play.endturn.unused", props.unused)}</p>
          <Show when={props.first}><p class="small">{t("play.endturn.first_turn")}</p></Show>
        </Show>
        <div class="yf-endsheet-actions">
          <StampButton class="yf-go" data-testid="end-back" onClick={props.onBack}>{t("play.endturn.back")}</StampButton>
          <Show when={props.unused > 0} fallback={
            <TabButton data-testid="end-anyway" onClick={props.onEnd}>{t("play.endturn.end_anyway")}</TabButton>
          }>
            <Show when={props.save > 0} fallback={
              <TabButton data-testid="end-lose" onClick={props.onEnd}>{tn("play.endturn.lose", props.unused)}</TabButton>
            }>
              <TabButton data-testid="end-save" onClick={props.onSave}>{tn("play.endturn.save", props.save)}</TabButton>
              <Show when={lost() > 0}><p class="small">{tn("play.endturn.lost", lost())}</p></Show>
            </Show>
          </Show>
        </div>
      </section>
    </div>
  );
}

/** Turn 1 of a first game: three lines on how it works, before the hand (plain-wales 4, screen 1). */
function HowItWorks(): JSX.Element {
  const { ui } = useGame();
  return (
    <div class="yf-how sheet" data-testid="how-it-works">
      <h2 class="t-1">{t("play.guide.how_title")}</h2>
      <ol class="yf-how-list">
        <li><span class="yf-how-art" aria-hidden="true"><i class="yf-coin unused" /><i class="yf-coin unused" /><i class="yf-coin unused" /></span><p class="story-small">{t("play.guide.how1")}</p></li>
        <li><span class="yf-how-art" aria-hidden="true"><i class="yf-how-ticket" /><i class="yf-how-ticket" /></span><p class="story-small">{t("play.guide.how2")}</p></li>
        <li><span class="yf-how-art yf-how-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span><p class="story-small">{t("play.guide.how3")}</p></li>
      </ol>
      <div class="yf-actions">
        <StampButton class="yf-go" data-testid="show-cards" onClick={() => ui.guide.done("how")}>{t("play.guide.how_go")}</StampButton>
        <button type="button" class="yf-note-skip" onClick={() => ui.guide.skip()}>{t("game.onboard.skip")}</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 4. visit offer

export function VisitOfferPanel(): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const offers = () => [s().visitOffer!, ...(s().visitOffer!.alternatives ?? [])] as VisitOffer[];
  /** Two places asking: each shrinks to a heading, one reason line and its button, all in view (playtest 4). */
  const many = () => offers().length > 1;
  const go = (o: VisitOffer) => { ui.setVisitPick(o); ui.setInPlace(true); };
  return (
    <div class="yf-panel" classList={{ "yf-panel-offers": many() }}>
      <div class="yf-scroll">
        <Note id="visit" when={true} class="yf-note-visit" placement="left">
          {t(offers()[0]!.place === "rhondda" ? "play.guide.visit_rhondda" : "play.guide.visit_bethesda")}
        </Note>
        <Show when={many()}>
          <div class="yf-choose">
            <p class="story-small">{t("game.visit.choose")}</p>
            <p class="small">{t("game.visit.choose_note")}</p>
          </div>
        </Show>
        <For each={offers()}>
          {(o, i) => {
            const place = () => game.names.placeName(o.place);
            return (
              <div class="yf-step sheet yf-visit-offer" data-place={o.place}>
                <h2 classList={{ "t-1": !many(), "t-3": many() }}>{t("game.visit.asking", { place: place(), mae_place: maePlace(place()) })}</h2>
                <p class="story-small">{many() ? visitWhyShort(game, o) : visitWhy(game, o)}</p>
                <div class="yf-actions">
                  <Show when={i() === 0} fallback={
                    <TabButton onClick={() => go(o)}>{t("game.visit.go", { place: midEn(place()), i_place: iPlace(place()) })}</TabButton>
                  }>
                    <StampButton class="yf-go" onClick={() => go(o)}>{t("game.visit.go", { place: midEn(place()), i_place: iPlace(place()) })}</StampButton>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
        <div class="yf-step sheet yf-visit-stay">
          <div class="yf-actions">
            <TabButton onClick={() => game.act({ type: "visit", choice: null })}>{t("game.visit.stay")}</TabButton>
          </div>
          <p class="small">{t("game.visit.stay_note")}</p>
        </div>
      </div>
      <Hand interactive={false} />
    </div>
  );
}

/** One short line for why a place asks, when two are asking at once. */
export function visitWhyShort(game: ReturnType<typeof useGame>["game"], o: VisitOffer): string {
  const cards = o.triggeredBy.filter((c) => c !== "curveball");
  if (cards.length) return t("game.visit.why_short", { card: game.names.list(cards.map((c) => game.names.cardName(c))) });
  const trend = game.state()!.activeTrends[0]?.curveball;
  return t("game.visit.why_trend_short", { trend: trend ? game.names.curveballName(trend) : "" });
}

/** Why a place is asking: the cards played there, or (in the guided first game) the trend. */
export function visitWhy(game: ReturnType<typeof useGame>["game"], o: VisitOffer): string {
  const cards = o.triggeredBy.filter((c) => c !== "curveball");
  if (cards.length) return t(cards.length > 1 ? "game.visit.why_many" : "game.visit.why_one", { card: game.names.list(cards.map((c) => game.names.cardName(c))) });
  const trend = game.state()!.activeTrends[0]?.curveball;
  return t("game.visit.why_trend", { trend: trend ? game.names.curveballName(trend) : "" });
}

// ------------------------------------------------------------------ 5. passing (no shock: the term runs)

export function PassingPanel(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const [done, setDone] = createSignal(false);
  const run = () => { if (!done()) { setDone(true); game.act({ type: "respond", response: 0 }); } };
  /** Turn 1 of a first game: "2030. Build flood walls is built in the South East." (plain-wales 4, screen 9). */
  const guideCaption = () => {
    if (s().term !== 0 || !s().options.firstGame) return null;
    const p = s().plays?.cards.find((c) => c.card === GUIDE_CARD) ?? s().plays?.cards.find((c) => (game.names.card(c.card)?.delay ?? 1) === 0);
    if (!p) return null;
    const card = game.names.cardName(p.card);
    if (p.region) return tw("play.guide.passing", { year: s().year + 4, card, place: game.names.regionName(p.region) });
    return t("play.guide.passing_wales", { year: s().year + 4, card });
  };
  onMount(() => {
    if (s().shock) return;
    const timer = window.setTimeout(run, reduced() ? 200 : guideCaption() ? 2600 : 1100);
    onCleanup(() => clearTimeout(timer));
  });
  return (
    <div class="yf-panel">
      <div class="yf-step sheet">
        <h2 class="t-2">{t("game.passing.title", { from: s().year, to: s().year + 4 })}</h2>
        <Show when={guideCaption()}><p class="story yf-passing-caption" data-testid="passing-caption">{guideCaption()}</p></Show>
        <Show when={!s().shock} fallback={<p class="story-small">{t("game.shock.label")}</p>}>
          <p class="story-small">{t("game.passing.quiet")}</p>
          <StampButton class="yf-go" onClick={run}>{t("game.passing.run")}</StampButton>
        </Show>
      </div>
      <Hand interactive={false} />
    </div>
  );
}

/** The shock: a slate slip over the dimmed map. */
export function ShockSlip(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const sh = () => s().shock!;
  const cb = () => game.names.curveball(sh().curveball);
  const c = () => sh().contingency;
  return (
    <div class="yf-shock" role="dialog" aria-modal="false" aria-labelledby="yf-shock-title">
      <div class="slipwrap arriving">
        <i class="pin" aria-hidden="true" />
        <article class="slip on-slate yf-shock-slip">
          <p class="slip-from">{t("game.shock.label")}</p>
          <h3 id="yf-shock-title" class="slip-title">{pick(cb()?.shock?.name ?? cb()?.name)}</h3>
          <p class="yf-slip-desc">{pick(cb()?.shock?.description ?? cb()?.description)}</p>
          <Show when={sh().prepared && sh().hit.absorb < 0.95}>
            <p class="stampmark yf-ready" aria-live="polite">{t("game.shock.ready")}</p>
            <p class="small yf-on-slate-2">{t("game.shock.ready_by", { cards: game.names.list(sh().preparedBy.map((id) => game.names.cardName(id))) })}</p>
          </Show>
          <p class="yf-on-slate-2">{t("game.shock.explain")}</p>
          <Note id="crisis" when={true} class="yf-note-crisis" placement="left">
            {c() > 0 ? tn("play.guide.crisis", c()) : t("play.guide.crisis_none")}
          </Note>
          <p class="yf-on-slate-2 data">{c() > 0 ? tn("game.shock.contingency", c()) : t("game.shock.contingency_none")}</p>
          <div class="yf-actions yf-shock-actions">
            <TabButton onClick={() => game.act({ type: "respond", response: 0 })}>{t("game.shock.absorb")}</TabButton>
            <StampButton disabled={c() < 1} onClick={() => game.act({ type: "respond", response: 1 })}>{t("game.shock.respond1")}</StampButton>
            <Show when={c() >= 2}>
              <TabButton onClick={() => game.act({ type: "respond", response: 2 })}>{t("game.shock.respond2")}</TabButton>
            </Show>
          </div>
        </article>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 6. what changed

export function slipText(game: ReturnType<typeof useGame>["game"], sl: Slip): string {
  const strand = game.names.strandName(sl.strand);
  const named = game.names.cause(sl.cause);
  // trend and event names are title case in the model; mid-sentence in English they read lower case
  const mid = lang() === "en" && (sl.cause.kind === "curveball" || sl.cause.kind === "shock" || sl.cause.kind === "event")
    ? named.charAt(0).toLowerCase() + named.slice(1) : named;
  const cause = named;
  const up = sl.delta >= 0;
  if (sl.pipChange === 0 && !sl.shock && !sl.recovery) return t(up ? "game.changed.held_up" : "game.changed.held_down", { strand, cause: mid });
  let sentence: string;
  if (sl.recovery) sentence = sl.cause.kind === "card" ? t("game.changed.recovery_card", { strand, cause }) : t("game.changed.recovery", { strand, cause: mid });
  else if (sl.rule === "R25" && sl.cause.kind === "card") sentence = t("game.changed.ripple", { strand, cause: game.names.cardName(sl.cause.id) });
  else if (sl.sideEffect) sentence = t("game.changed.side", { strand, cause, dir: t(up ? "game.dir.up_word" : "game.dir.down_word") });
  else {
    const key = sl.part === "stock" ? (up ? "game.changed.stock_up" : "game.changed.stock_down") : up ? "game.changed.up" : "game.changed.down";
    sentence = t(key, { cause, strand });
  }
  return sentence;
}

/** The shock slip's account of what the player spent and what landed. */
export function responseText(r: NonNullable<Slip["response"]>): string {
  const share = r.hit >= 0.95 ? t("game.share.all") : r.hit >= 0.6 ? t("game.share.most") : r.hit >= 0.4 ? t("game.share.half") : t("game.share.quarter");
  const spent = r.pips > 0 ? tn("game.changed.response_spent", r.pips, { share }) : t("game.changed.response_none");
  return r.prepared ? `${t("game.changed.response_ready")} ${spent}` : spent;
}

export function reasonText(game: ReturnType<typeof useGame>["game"], r: TrustReason): string {
  // the engine's own copy for a reason wins when it has one
  const eng = game.model.engine_text?.[`engine.trust.reason.${r.code}`];
  if (eng) {
    const region = r.detail ? game.names.regionName(r.detail as never) : "";
    let s = pick(eng);
    if (lang() === "cy") s = s.replace("yn {region}", ynPlace(region));
    return s.replace(/\{region\}/g, region).replace(/\{detail\}/g, r.detail ?? "");
  }
  let detail = r.detail ?? "";
  if (r.code === "pledge_kept" || r.code === "pledge_broken") detail = game.names.strandName(detail as StrandId);
  else if (r.code === "neglect") detail = game.names.regionName(detail as never);
  else if (r.code === "visit") detail = t(`game.grade.${detail}`);
  else if (r.code === "card") detail = game.names.cardName(detail);
  // "ar {detail}": the strand name takes the soft mutation in Welsh ("ar Lewyrchus")
  return tw(`game.trust.reason.${r.code}`, { detail }, []);
}

export function ChangedPanel(): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const o = () => s().lastOutcome!;

  // the replay: strands tick one at a time, left to right; any key skips
  onMount(() => {
    if (reduced()) { ui.setTicked(7); return; }
    ui.setTicked(0);
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      ui.setTicked(i);
      if (i >= 7) clearInterval(timer);
    }, 260);
    const skip = () => { clearInterval(timer); ui.setTicked(7); };
    window.addEventListener("keydown", skip, { once: true });
    onCleanup(() => { clearInterval(timer); window.removeEventListener("keydown", skip); ui.setTicked(7); });
  });

  const trustDir = () => (o().trust.after > o().trust.before + 0.5 ? "up" : o().trust.after < o().trust.before - 0.5 ? "down" : "same");
  /** The ready stamp only when the player really softened the hit (cold playtest). */
  const ready = () => {
    const sh = o().shock;
    return !!sh && sh.prepared && sh.hit < 0.95;
  };
  /** What happened to the coins not spent (plain-wales 3.3, point 5). */
  const fundLines = (): string[] => {
    const held = o().contingencyHeld;
    if (o().caretaker) return [];
    if (held <= 0) return [t("play.result.all_spent")];
    const used = o().shock?.response ?? 0;
    const carry = s().term >= game.model.game.years.length - 1 && s().step === "ended" ? 0 : Math.min(game.model.game.contingency_carry ?? 2, Math.max(0, held - used));
    const lost = Math.max(0, held - used - carry);
    // the coins the player put in the fund this turn (the draft is kept until the next plan step)
    const at = game.savedAt();
    const saved = at && at.term === o().term ? Math.min(at.n, held) : held;
    const out = saved > 0 ? [tn("play.result.fund", saved)] : [];
    out.push(o().shock ? tn("play.result.fund_used", used) : t("play.result.no_crisis"));
    if (carry > 0) out.push(tn("play.result.carried", carry));
    if (lost > 0) out.push(tn("play.result.lost", lost));
    return out;
  };
  /** Turn 1 of a first game: the one cause and effect the guide promised (plain-wales 4, screen 10). */
  const guided = () => o().term === 0 && s().options.firstGame && !ui.guide.skipped();
  const guideCard = () => o().plays.cards.find((c) => c.card === GUIDE_CARD) ?? null;
  const guideSlip = () => {
    const p = guideCard();
    if (!p) return null;
    const ch = o().strands.find((c) => c.strand === "resilient");
    if (!ch) return null;
    const goal = game.names.strandName("resilient");
    const card = game.names.cardName(p.card);
    if (ch.pipsAfter > ch.pipsBefore) return { head: t("play.guide.result", { goal, m: ch.pipsBefore, n: ch.pipsAfter }), body: t("play.guide.result_because", { card, year: o().year }) };
    return { head: t("play.guide.result_small", { goal, n: ch.pipsAfter, card }), body: null };
  };
  /** The engine's own slip for the guide card, shown inside the guide slip rather than twice. */
  const guideEngineSlip = () => (guided() && guideSlip() ? o().slips.find((sl) => sl.cause.id === GUIDE_CARD && sl.strand === "resilient") ?? null : null);
  const slips = () => o().slips.filter((sl) => sl !== guideEngineSlip());
  const pullSlip = (sl: Slip) => { game.pull(sl.thread?.strand ?? sl.strand, sl.thread?.part ?? sl.part, sl.thread?.term ?? o().term, sl.thread?.key); ui.guide.done("pull"); ui.guide.done("why"); };
  const slowOnWay = () => {
    const p = o().plays.cards.find((c) => c.card === GUIDE_SLOW);
    if (!p) return null;
    const item = s().post.find((x) => x.card === GUIDE_SLOW && x.playedTerm === o().term);
    return t("play.guide.on_way", { card: game.names.cardName(GUIDE_SLOW), year: item?.firstYear ?? item?.arrivesYear ?? o().year + 8 });
  };

  return (
    <div class="yf-panel yf-panel-changed">
      <div class="yf-scroll">
      <div class="yf-step sheet">
        <h2 class="t-2">{t("game.changed.title", { from: o().year, to: o().year + 4 })}</h2>
        <Show when={ready()}>
          <p class="stampmark yf-ready-paper">{t("game.shock.ready")}</p>
        </Show>
        <Show when={o().visit?.mastered && !s().history.slice(0, -1).some((h) => h.visit?.place === o().visit!.place && h.visit.mastered)}>
          <p class="story-small yf-mastered">{t("game.changed.mastered", { place: game.names.placeName(o().visit!.place) })}</p>
        </Show>
        <Show when={o().visit && !o().visit!.stayed}>
          <p class="yf-visit-result">
            <span>{t("place.common.result", { place: game.names.placeName(o().visit!.place), grade: "" })}</span>
            <span class={`stampmark grade-${o().visit!.grade}`}>{t(`game.grade.${o().visit!.grade}`)}</span>
          </p>
        </Show>
        <p class="small yf-fund-result" data-testid="fund-result">{fundLines().join(" ")}</p>
      </div>
      <Show when={guided() && (guideSlip() || slowOnWay())}>
        <ol class="yf-slips yf-guide-slips">
          <Show when={guideSlip()}>
            <li class="yf-slip-paper sheet guide" data-testid="guide-result">
              <h3 class="t-3 yf-slip-head"><Snip strand="resilient" /><span>{guideSlip()!.head}</span></h3>
              <p class="story-small">
                <Show when={guideSlip()!.body}>{guideSlip()!.body}{" "}</Show>
                <Show when={guideEngineSlip()}>
                  <ThreadButton onClick={() => pullSlip(guideEngineSlip()!)}>{t("game.changed.pull")}</ThreadButton>
                </Show>
              </p>
              <ForScale card={GUIDE_CARD} class="yf-slip-scale" />
              <Show when={guideEngineSlip()}>
                <Note id="why" when={ui.ticked() >= 7} class="yf-note-pull" placement="left">{t("play.guide.why")}</Note>
              </Show>
            </li>
          </Show>
          <Show when={slowOnWay()}>
            <li class="yf-slip-paper sheet guide held"><p class="story-small">{slowOnWay()}</p></li>
          </Show>
        </ol>
      </Show>
      <ol class="yf-slips" aria-label={t("game.step.changed")}>
        <Show when={slips().length || guideEngineSlip()} fallback={<li class="yf-slip-paper sheet"><p class="story-small">{t("game.changed.no_slips")}</p></li>}>
          <For each={slips()}>
            {(sl, i) => (
              <li class="yf-slip-paper sheet" classList={{ unexpected: sl.unexpected, shock: !!sl.shock, held: sl.pipChange === 0 }} style={{ "--i": i() }}>
                <Show when={sl.shock}>
                  <p class="yf-shocklabel label">{t("game.changed.shock_label", { name: game.names.shockName(sl.cause.id) })}</p>
                </Show>
                <Show when={sl.unexpected && !sl.shock}>
                  <p class="yf-unexpected label">{t("game.changed.unexpected")}</p>
                </Show>
                <h3 class="t-3 yf-slip-head">
                  <Snip strand={sl.strand} frays={sl.delta < 0} />
                  <span>{game.names.strandName(sl.strand)}</span>
                  <span class="yf-dir" aria-label={sl.delta >= 0 ? t("game.dir.up") : t("game.dir.down")}>
                    <svg viewBox="0 0 9 8" width="9" height="8" aria-hidden="true"><path fill="currentColor" d={sl.delta >= 0 ? "M0 8h9L4.5 0z" : "M0 0h9L4.5 8z"} /></svg>
                    <Show when={sl.pipChange}><span class="data yf-pipchange">{tn("play.result.points", Math.abs(sl.pipChange!))}</span></Show>
                  </span>
                </h3>
                <p class="story-small yf-slip-text">
                  {slipText(game, sl)}{" "}
                  <Show when={sl.shock && sl.response}>{responseText(sl.response!)}{" "}</Show>
                  <ThreadButton onClick={() => pullSlip(sl)}>
                    {t("game.changed.pull")}
                  </ThreadButton>
                </p>
                <Show when={sl.cause.kind === "card" && !sl.shock}>
                  <ForScale card={sl.cause.id} class="yf-slip-scale" />
                </Show>
                <Show when={i() === 0 && !guideEngineSlip()}>
                  <Note id="why" when={ui.ticked() >= 7} class="yf-note-pull" placement="left">{t("play.guide.why")}</Note>
                </Show>
              </li>
            )}
          </For>
        </Show>
      </ol>
      <div class="yf-trustwhy sheet">
        <h3 class="t-3">{t(`game.trust.${trustDir()}`)}</h3>
        <TrustReasons reasons={o().trust.top} />
      </div>
      </div>
      <div class="yf-panel-foot">
        <StampButton class="yf-go" onClick={() => game.act({ type: "continue" })}>{t("game.changed.continue")}</StampButton>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 7. election

export function ElectionPanel(): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const tr = () => s().lastOutcome!.trust;
  const last = () => s().term >= 5;
  const nextYear = () => s().year + 4;
  let stamp!: HTMLParagraphElement;
  createEffect(() => { s().step; stamp?.classList.add("landed"); });
  return (
    <div class="yf-panel">
      <div class="yf-step sheet yf-election">
        <h2 class="t-2">{t("game.election.title", { year: nextYear() })}</h2>
        <p class="story-small">{t("game.election.band", { band: t(`parts.trust.${tr().band}`), band_yn: softYn(t(`parts.trust.${tr().band}`)) })}</p>
        <TrustReasons reasons={tr().top} />
        <Show when={!last()}>
          <Show when={tr().lostSeat} fallback={
            <p class="stampmark yf-limit-stamp" ref={stamp}>{tn("game.election.stamp", tr().cardLimit)}</p>
          }>
            <SevereNotice>{t("game.election.lost")}</SevereNotice>
          </Show>
        </Show>
        <StampButton class="yf-go" onClick={() => { ui.guide.done("handoff"); game.act({ type: "next" }); }}>
          {last() ? t("game.election.last") : t("game.election.next", { year: nextYear() })}
        </StampButton>
        <Show when={s().term === 0}>
          <Note id="handoff" when={ui.guide.hasSeen("trust")} class="yf-note-handoff" placement="left">{t("play.guide.handoff")}</Note>
        </Show>
      </div>
      <Hand interactive={false} />
    </div>
  );
}

// ------------------------------------------------------------------ caretaker

export function CaretakerPanel(): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const [pick_, setPick] = createSignal<StrandId | null>(null);
  return (
    <div class="yf-panel">
      <div class="yf-step yf-caretaker severe-sheet">
        <Note id="lost" when={true} class="yf-note-lost" placement="left">{t("play.guide.lost")}</Note>
        <h2 class="t-1">{t("game.caretaker.title")}</h2>
        <p class="story-small">{t("game.caretaker.body")}</p>
        <div class="yf-shadow" role="radiogroup" aria-label={t("game.caretaker.shadow_note")}>
          <For each={STRAND_IDS}>
            {(id) => (
              <button type="button" role="radio" class="yf-region" aria-checked={pick_() === id} onClick={() => setPick(id)}>
                <Snip strand={id} /> {game.names.strandName(id)}
              </button>
            )}
          </For>
        </div>
        <p class="small">{t("game.caretaker.shadow_note")}</p>
        <StampButton class="yf-go" disabled={!pick_()} onClick={() => game.act({ type: "caretaker", shadowPledge: pick_()! })}>
          {pick_() ? t("game.caretaker.shadow", { strand: game.names.strandName(pick_()!) }) : t("game.caretaker.go")}
        </StampButton>
        <p class="small">{t("game.passing.title", { from: s().year, to: s().year + 4 })}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ arrivals land

/** On the stage at the opening: what arrived from the post, and where. */
export function ArrivalStrip(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const items = () => s().opening?.arrivals ?? [];
  /** Cards whose first effects land this term while the rest stays in the post. */
  const firsts = () => s().post.filter((p) => p.firstTerm === s().term && p.arrivesTerm > s().term);
  return (
    <Show when={s().step === "opening" && (items().length || firsts().length)}>
      <aside class="yf-arrivals" aria-label={t("game.opening.arrivals_label")}>
        <p class="label yf-arrivals-head">{t("game.opening.arrivals_label")}</p>
        <ul>
          <For each={items()}>
            {(a, i) => (
              <li class="yf-arrival" style={{ "--i": i() }}>
                <span class="yf-arrival-stub"><Icon name={cardIcon(game.names.card(a.card) ?? { id: a.card })} size={20} /></span>
                <span>
                  {a.regions?.length
                    ? t("game.opening.arrives", { card: game.names.cardName(a.card), where: game.names.regionsText(a.regions) })
                    : t("game.opening.arrives_wales", { card: game.names.cardName(a.card) })}
                  <Show when={a.firstYear != null && a.firstYear < a.arrivesYear}>
                    <span class="yf-arrival-on small">{" "}({t("game.opening.in_full", { year: a.firstYear! })})</span>
                  </Show>
                  <Show when={game.names.card(a.card)?.helps?.length}>
                    <span class="yf-arrival-on small">
                      {" "}{tw("game.opening.lands_on", { strands: game.names.list((game.names.card(a.card)!.helps ?? []).map((x) => game.names.strandName(x))) })}
                    </span>
                  </Show>
                </span>
              </li>
            )}
          </For>
          <For each={firsts()}>
            {(a) => (
              <li class="yf-arrival">
                <span class="yf-arrival-stub"><Icon name={cardIcon(game.names.card(a.card) ?? { id: a.card })} size={20} /></span>
                <span>{t("game.opening.first_effects", { card: game.names.cardName(a.card), year: a.arrivesYear })}</span>
              </li>
            )}
          </For>
        </ul>
      </aside>
    </Show>
  );
}

/** Trust's reasons, each marked for or against, so "Trust rose" never sits over only bad news unexplained. */
export function TrustReasons(props: { reasons: TrustReason[] }): JSX.Element {
  const { game } = useGame();
  return (
    <ul class="yf-reasons">
      <For each={props.reasons}>
        {(r) => (
          <li classList={{ against: r.points < 0 }}>
            <svg viewBox="0 0 9 8" width="9" height="8" aria-hidden="true"><path fill="currentColor" d={r.points >= 0 ? "M0 8h9L4.5 0z" : "M0 0h9L4.5 8z"} /></svg>
            <span class="sr-only">{r.points >= 0 ? t("game.trust.for") : t("game.trust.against")}: </span>
            <span>{reasonText(game, r)}</span>
          </li>
        )}
      </For>
    </ul>
  );
}

/** On the "What changed" step the term's voice sits on the stage, always in view. */
export function StageVoice(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  return (
    <Show when={s().step === "changed" && s().lastOutcome?.voice && !game.trace()}>
      <div class="yf-stagevoice">
        <VoiceSheet voice={s().lastOutcome!.voice} year={s().lastOutcome!.year + 4} />
      </div>
    </Show>
  );
}
