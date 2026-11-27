// The rail's content for each of the seven steps of a term (game-design 2.2), plus the
// caretaker term. Each panel has one stamp: the action that moves the term on.
import { createEffect, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { pick, t, tn } from "../../i18n";
import { StampButton, TabButton, ThreadButton } from "../parts/Buttons";
import { SevereNotice, WarnStrip, Snip } from "../parts/Notice";
import { StrandName } from "./StrandName";
import { cardIcon, Icon } from "../parts/Icon";
import type { Slip, StrandId, TrustReason } from "../../engine/api";
import { STRAND_IDS } from "../../model/schema";
import { useGame } from "./context";
import { BudgetRow } from "./Budget";
import { Hand } from "./Hand";
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
            <p class="yf-hook-line print">{t("game.hook.line")}</p>
            <p class="small">{t("game.hook.touch")}</p>
            <StampButton class="yf-go" onClick={() => game.act({ type: "open" })}>{t("game.hook.take")}</StampButton>
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
          <p class="data">{t("game.opening.budget", { n: s().budget.available })}. {tn("game.opening.limit", s().cardLimit)}.</p>
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
  return (
    <div class="yf-panel">
      <VoiceSheet voice={s().opening?.voice ?? null} year={s().year} />
      <div class="yf-step sheet">
        <h2 class="t-2">{t("game.step.pledge")}</h2>
        <p class="story-small">{t("game.pledge.ask")}</p>
        <Show when={strand()}>
          <p class="yf-pledge-strand"><StrandName strand={strand()!} /></p>
          <p class="small">{t("game.pledge.note", { strand: game.names.strandName(strand()!) })}</p>
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
  const firstProblem = () => {
    const p = problems()[0];
    if (!p) return null;
    return t(`game.plan.problem.${p.code}`, { card: p.card ? game.names.cardName(p.card) : "" });
  };
  const commit = () => {
    if (game.commit()) {
      ui.guide.done("commit");
      ui.guide.done("post");
      ui.setRegionPick(null);
    }
  };
  return (
    <div class="yf-panel yf-panel-plan">
      <Show when={s().pledge}>
        <p class="yf-pledged small">{t("game.pledge.made", { strand: game.names.strandName(s().pledge!) })}</p>
      </Show>
      <Hand interactive />
      <div class="yf-plan-foot sheet">
        <BudgetRow />
        <div class="yf-plan-actions">
          <TabButton id="yf-ledger-open" onClick={() => game.setLedgerOpen(!game.ledgerOpen())} aria-expanded={game.ledgerOpen()}>
            {t("game.plan.ledger_short")}
            <Show when={game.draft.standing || game.draft.repayDebt || game.draft.repair || game.draft.skipUpkeep.length}>
              <span class="yf-dot" aria-hidden="true">*</span>
            </Show>
          </TabButton>
          <StampButton class="yf-go yf-commit" onClick={commit} why={firstProblem()}>{t("game.plan.commit")}</StampButton>
        </div>
        <Show when={game.draft.cards.length === 0}>
          <p class="small yf-warn-line">{t("game.plan.nothing_played")}</p>
        </Show>
        <Note id="commit" when={game.draft.cards.length > 0 && ui.guide.hasSeen("post")} class="yf-note-commit" placement="above">
          {t("game.onboard.commit")}
        </Note>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 4. visit offer

export function VisitOfferPanel(): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const v = () => s().visitOffer!;
  const place = () => game.names.placeName(v().place);
  const by = () => game.names.list(v().triggeredBy.filter((c) => c !== "curveball").map((c) => game.names.cardName(c)));
  return (
    <div class="yf-panel">
      <div class="yf-step sheet yf-visit-offer">
        <h2 class="t-1">{t("game.visit.asking", { place: place() })}</h2>
        <Show when={by()}>
          <p class="story-small">{t("game.visit.why", { card: by() })}</p>
        </Show>
        <div class="yf-actions">
          <StampButton class="yf-go" onClick={() => ui.setInPlace(true)}>{t("game.visit.go", { place: place() })}</StampButton>
          <TabButton onClick={() => game.act({ type: "visit", choice: null })}>{t("game.visit.stay")}</TabButton>
        </div>
        <p class="small">{t("game.visit.stay_note")}</p>
      </div>
      <Hand interactive={false} />
    </div>
  );
}

// ------------------------------------------------------------------ 5. passing (no shock: the term runs)

export function PassingPanel(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const [done, setDone] = createSignal(false);
  const run = () => { if (!done()) { setDone(true); game.act({ type: "respond", response: 0 }); } };
  onMount(() => {
    if (s().shock) return;
    const timer = window.setTimeout(run, reduced() ? 200 : 1100);
    onCleanup(() => clearTimeout(timer));
  });
  return (
    <div class="yf-panel">
      <div class="yf-step sheet">
        <h2 class="t-2">{t("game.passing.title", { from: s().year, to: s().year + 4 })}</h2>
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
          <Show when={sh().prepared}>
            <p class="stampmark yf-ready" aria-live="polite">{t("game.shock.ready")}</p>
            <p class="small yf-on-slate-2">{t("game.shock.ready_by", { cards: game.names.list(sh().preparedBy.map((id) => game.names.cardName(id))) })}</p>
          </Show>
          <p class="yf-on-slate-2">{t("game.shock.explain")}</p>
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
  const cause = game.names.cause(sl.cause);
  const up = sl.delta >= 0;
  const key = sl.part === "stock" ? (up ? "game.changed.stock_up" : "game.changed.stock_down") : up ? "game.changed.up" : "game.changed.down";
  return t(key, { cause, strand });
}

export function reasonText(game: ReturnType<typeof useGame>["game"], r: TrustReason): string {
  let detail = r.detail ?? "";
  if (r.code === "pledge_kept" || r.code === "pledge_broken") detail = game.names.strandName(detail as StrandId);
  else if (r.code === "neglect") detail = game.names.regionName(detail as never);
  else if (r.code === "visit") detail = t(`game.grade.${detail}`);
  else if (r.code === "card") detail = game.names.cardName(detail);
  return t(`game.trust.reason.${r.code}`, { detail });
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

  return (
    <div class="yf-panel yf-panel-changed">
      <div class="yf-step sheet">
        <h2 class="t-2">{t("game.changed.title", { from: o().year, to: o().year + 4 })}</h2>
        <Show when={o().shock?.prepared}>
          <p class="stampmark yf-ready-paper">{t("game.shock.ready")}</p>
        </Show>
        <Show when={o().visit && !o().visit!.stayed}>
          <p class="yf-visit-result">
            <span>{t("place.common.result", { place: game.names.placeName(o().visit!.place), grade: "" })}</span>
            <span class="stampmark">{t(`game.grade.${o().visit!.grade}`)}</span>
          </p>
        </Show>
      </div>
      <ol class="yf-slips" aria-label={t("game.step.changed")}>
        <Show when={o().slips.length} fallback={<li class="yf-slip-paper sheet"><p class="story-small">{t("game.changed.no_slips")}</p></li>}>
          <For each={o().slips}>
            {(sl, i) => (
              <li class="yf-slip-paper sheet" classList={{ unexpected: sl.unexpected }} style={{ "--i": i() }}>
                <Show when={sl.unexpected}>
                  <p class="yf-unexpected label">{t("game.changed.unexpected")}</p>
                </Show>
                <h3 class="t-3 yf-slip-head">
                  <Snip strand={sl.strand} frays={sl.delta < 0} />
                  <span>{game.names.strandName(sl.strand)}</span>
                  <span class="yf-dir" aria-label={sl.delta >= 0 ? t("game.dir.up") : t("game.dir.down")}>
                    <svg viewBox="0 0 9 8" width="9" height="8" aria-hidden="true"><path fill="currentColor" d={sl.delta >= 0 ? "M0 8h9L4.5 0z" : "M0 0h9L4.5 8z"} /></svg>
                  </span>
                </h3>
                <p class="story-small">{slipText(game, sl)}</p>
                <ThreadButton onClick={() => { game.pull(sl.strand, sl.part, o().term); ui.guide.done("pull"); }}>
                  {t("game.changed.pull")}
                </ThreadButton>
                <Show when={i() === 0}>
                  <Note id="pull" when={ui.ticked() >= 7} class="yf-note-pull" placement="left">{t("game.onboard.pull")}</Note>
                </Show>
              </li>
            )}
          </For>
        </Show>
      </ol>
      <div class="yf-trustwhy sheet">
        <h3 class="t-3">{t(`game.trust.${trustDir()}`)}</h3>
        <ul class="yf-list">
          <For each={o().trust.top}>{(r) => <li>{reasonText(game, r)}</li>}</For>
        </ul>
      </div>
      <VoiceSheet voice={o().voice} year={o().year + 4} compact />
      <div class="yf-panel-foot">
        <StampButton class="yf-go" onClick={() => game.act({ type: "continue" })}>{t("game.changed.continue")}</StampButton>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 7. election

export function ElectionPanel(): JSX.Element {
  const { game } = useGame();
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
        <p class="story-small">{t("game.election.band", { band: t(`parts.trust.${tr().band}`) })}</p>
        <ul class="yf-list">
          <For each={tr().top}>{(r) => <li>{reasonText(game, r)}</li>}</For>
        </ul>
        <Show when={!last()}>
          <Show when={tr().lostSeat} fallback={
            <p class="stampmark yf-limit-stamp" ref={stamp}>{tn("game.election.stamp", tr().cardLimit)}</p>
          }>
            <SevereNotice>{t("game.election.lost")}</SevereNotice>
          </Show>
        </Show>
        <StampButton class="yf-go" onClick={() => game.act({ type: "next" })}>
          {last() ? t("game.election.last") : t("game.election.next", { year: nextYear() })}
        </StampButton>
      </div>
      <Hand interactive={false} />
    </div>
  );
}

// ------------------------------------------------------------------ caretaker

export function CaretakerPanel(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const [pick_, setPick] = createSignal<StrandId | null>(null);
  return (
    <div class="yf-panel">
      <div class="yf-step yf-caretaker severe-sheet">
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
  return (
    <Show when={s().step === "opening" && items().length}>
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
                </span>
              </li>
            )}
          </For>
        </ul>
      </aside>
    </Show>
  );
}
