// Small pieces of the board: the curveball slip, the voice sheet, the top bar.
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { lang, pick, t, tn, textOf } from "../../i18n";
import { CurveballSlip } from "../parts/CurveballSlip";
import { StrandRow } from "../parts/StrandRow";
import { TrustSlots } from "../parts/TrustGauge";
import { Tooltip } from "../parts/Tooltip";
import { headline } from "./engine";
import { TrendFact } from "./RealWales";
import { TopBar as ShellTopBar } from "../shell/TopBar";
import type { StrandId, VoiceLine } from "../../engine/api";
import { STRAND_IDS, type Text } from "../../model/schema";
import { useGame } from "./context";
import { tw } from "./cymraeg";
import { Note } from "./Note";

// ------------------------------------------------------------------ curveball slip

export function TrendSlip(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const [all, setAll] = createSignal(false);
  const newest = createMemo(() => {
    const st = s();
    const id = st.opening?.newTrend ?? st.activeTrends[st.activeTrends.length - 1]?.curveball ?? null;
    return id ? game.names.curveball(id) ?? null : null;
  });
  const others = () => s().activeTrends.filter((a) => a.curveball !== newest()?.id);
  // looking ahead comes in from turn 2 (plain-wales 3.1)
  const canPeek = () => s().step === "plan" && !s().peekedThisTerm && s().term >= 1 && s().term < 5 && game.budget().left >= (game.model.game.peek_cost ?? 1);
  const { ui } = useGame();
  /** The guide's note on the first slow change: which goal it pushes down. */
  const pushes = () => {
    const c = newest();
    if (!c) return null;
    // the first goal whose bar a slow effect pushes down
    for (const e of c.slow) {
      if (e.sign >= 0) continue;
      const st = game.model.strands.find((x) => x.flow.includes(e.target) || x.stock.includes(e.target));
      if (st) return st.id as StrandId;
    }
    return null;
  };
  const peekCurve = () => {
    const p = s().peekedNext;
    return p && p !== "none" ? game.names.curveball(p) ?? null : null;
  };
  const peekAnswers = () => {
    const c = peekCurve();
    return c ? s().hand.filter((id) => c.responses.includes(id)).map((id) => game.names.cardName(id)) : [];
  };
  const peekLine = () => {
    const p = s().peekedNext;
    if (p == null) return null;
    if (p === "none") return t("game.slip.peeked_none");
    return t("game.slip.peeked", { name: game.names.curveballName(p) });
  };
  return (
    <Show when={newest()}>
      <div class="yf-slip">
        <CurveballSlip title={newest()!.name} ripple={pick(newest()!.where_note)} arriving={s().step === "opening"}>
          <p class="yf-slip-desc">{pick(newest()!.description)}</p>
          <Show when={newest()!.shock}>
            <p class="yf-slip-shock small">{t("game.slip.shock_form", { name: pick(newest()!.shock!.name) })}</p>
          </Show>
          <Show when={s().opening?.newTrend === newest()!.id || s().term === 0}>
            <TrendFact curveball={newest()!.id} class="yf-slip-fact" />
          </Show>
          <Show when={s().term === 0 && s().options.firstGame && pushes()}>
            <Note id="slow_change" when={s().step === "plan" && ui.guide.hasSeen("how")} class="yf-note-slow-change" placement="below">
              {tw("play.guide.slow_note", { goal: game.names.strandName(pushes()!) }, [])}
            </Note>
          </Show>
          <Show when={others().length}>
            <button type="button" class="yf-slip-more" aria-expanded={all()} onClick={() => setAll(!all())}>
              {all() ? t("game.slip.hide_all") : `${tn("game.slip.active", s().activeTrends.length)}. ${t("game.slip.show_all")}`}
            </button>
            <Show when={all()}>
              <ul class="yf-slip-list">
                <For each={others()}>
                  {(a) => (
                    <li>
                      <span class="yf-slip-name">{game.names.curveballName(a.curveball)}</span>
                      <span class="small">{t("game.slip.since", { year: a.sinceYear })}</span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
          <Show when={peekLine()}>
            <p class="yf-slip-peeked">{peekLine()}</p>
            <Show when={peekCurve()}>
              <p class="yf-slip-desc">{pick(peekCurve()!.where_note)}</p>
              <p class="yf-slip-desc">{peekAnswers().length ? t("game.slip.peek_answers", { cards: game.names.list(peekAnswers()) }) : t("game.slip.peek_none_in_hand")}</p>
            </Show>
          </Show>
          <Show when={canPeek()}>
            <button type="button" class="yf-slip-peek" title={t("game.slip.peek_note")} onClick={() => game.act({ type: "peek" })}>
              {t("game.slip.peek")}
            </button>
          </Show>
        </CurveballSlip>
      </div>
    </Show>
  );
}

// ------------------------------------------------------------------ voice

export function VoiceSheet(props: { voice: VoiceLine | null; year: number; children?: JSX.Element; compact?: boolean }): JSX.Element {
  return (
    <Show when={props.voice} fallback={props.children ? <div class="yf-voice sheet">{props.children}</div> : null}>
      <figure class="yf-voice sheet" classList={{ compact: !!props.compact }}>
        <blockquote class="yf-voice-quote" lang={lang()}>“{pick(props.voice!.text)}”</blockquote>
        <figcaption class="yf-voice-cap">
          <span class="label">{t("game.voice.where", { town: pick(props.voice!.town), year: props.year })}</span>
          <span class="small">{t("game.voice.label")}</span>
        </figcaption>
        {props.children}
      </figure>
    </Show>
  );
}

// ------------------------------------------------------------------ top bar

export function TopBar(props: { ticking?: boolean }): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;
  const out = () => (s().step === "changed" || s().step === "election" ? s().lastOutcome : null);

  /** During the "what changed" replay, strands left of the cursor show their new pips. */
  const views = createMemo(() => {
    const o = out();
    return s().strands.map((v, i) => {
      if (!o || i < ui.ticked()) return v;
      const c = o.strands.find((x) => x.strand === v.strand);
      return c ? { ...v, flowPips: c.pipsBefore, stockPips: c.stockPipsBefore } : v;
    });
  });
  /** The previewed card's own marginals (paired with and without it, at its landing), from the engine. */
  const cardPreview = createMemo(() => {
    const g = game.ghost();
    if (!g?.card || !g.preview || game.isPlayed(g.card)) return null;
    return g.preview.perCard.find((c) => c.card === g.card) ?? null;
  });
  /**
   * Change per strand in score points. For a card: only the strands the engine marks as real, never
   * the term's drift. For the plan as a whole: what it adds over the no-plays baseline.
   */
  const ghostDelta = createMemo(() => {
    const g = game.ghost();
    if (!g?.preview || game.ledgerOpen()) return null;
    if (g.card && game.isPlayed(g.card)) return null;
    const m: Partial<Record<StrandId, { d: number; sharp: boolean; pips: number; stock: number }>> = {};
    const cp = cardPreview();
    if (g.card) {
      if (!cp) return null;
      for (const id of cp.real) {
        const f = cp.strands[id], st = cp.stock[id];
        m[id] = { d: f?.delta ?? 0, sharp: f?.sharp ?? true, pips: f?.pips ?? 0, stock: st?.delta ?? 0 };
      }
      return m;
    }
    for (const p of g.preview.strands) {
      const d = p.eventual.median - p.baseline.median;
      if (Math.abs(d) >= 0.05) m[p.strand] = { d, sharp: p.eventual.sharp, pips: Math.round(d), stock: 0 };
    }
    return m;
  });
  /** The forecast in words inside each strand tile: flow first, else what is left to 2050. */
  const ghostLabels = createMemo(() => {
    const gd = ghostDelta();
    if (!gd) return undefined;
    const m: Partial<Record<StrandId, { text: string; down: boolean } | null>> = {};
    for (const [id, v] of Object.entries(gd) as [StrandId, { d: number; stock: number }][]) {
      if (Math.abs(v.d) >= 0.15) {
        const n = Math.round(Math.abs(v.d));
        m[id] = { text: n === 0 ? t(v.d > 0 ? "game.plan.ghost_small_up" : "game.plan.ghost_small_down") : tn(v.d > 0 ? "game.plan.ghost_up" : "game.plan.ghost_down", n), down: v.d < 0 };
      } else if (Math.abs(v.stock) >= 0.05) {
        m[id] = { text: t(v.stock > 0 ? "game.plan.ghost_handed_up" : "game.plan.ghost_handed_down"), down: v.stock < 0 };
      } else m[id] = null;
    }
    return m;
  });
  const ghostHeading = () => {
    const g = game.ghost();
    if (!g || !ghostDelta()) return null;
    const cp = cardPreview();
    // a card that only works through others says so, never a label with nothing after it (playtest 4)
    if (cp?.needsPartner && !cp.real.length) return t("game.plan.ghost_partner");
    if (cp?.landsAfterGame) return t("game.plan.ghost_after");
    const shown = Object.values(ghostLabels() ?? {}).some(Boolean);
    if (!shown) return g.card ? t("game.plan.ghost_none") : null;
    if (cp?.nothingThisTerm) return t("game.plan.ghost_nothing", { year: cp.landsYear });
    return g.card ? t("game.plan.ghost_if", { card: game.names.cardName(g.card) }) : t("game.plan.ghost_if_plan");
  };
  /** The ghost outline: fractional pips, so a card worth less than a pip still shows. */
  const ghosts = createMemo(() => {
    const gd = ghostDelta();
    if (!gd) return undefined;
    const m: Partial<Record<StrandId, number | null>> = {};
    for (const [id, v] of Object.entries(gd)) m[id as StrandId] = Math.abs(v!.d) >= 0.05 ? Math.max(-10, Math.min(10, v!.d)) : null;
    return m;
  });
  const changes = createMemo(() => {
    const o = out();
    if (!o) return undefined;
    const m: Partial<Record<StrandId, number | null>> = {};
    o.strands.forEach((c) => {
      const i = STRAND_IDS.indexOf(c.strand);
      // a strand that did not move shows nothing: "no change" crowds the name out at 1440 (NEEDS.md)
      m[c.strand] = i < ui.ticked() && c.pipsAfter !== c.pipsBefore ? c.pipsAfter - c.pipsBefore : null;
    });
    return m;
  });
  const ghostNotes = createMemo(() => {
    const gd = ghostDelta();
    if (!gd) return undefined;
    const m: Partial<Record<StrandId, string>> = {};
    for (const [id, v] of Object.entries(gd)) {
      if (Math.abs(v!.d) < 0.05) continue;
      m[id as StrandId] = `${v!.d > 0 ? t("game.plan.ghost_up") : t("game.plan.ghost_down")}, ${v!.sharp ? t("game.plan.ghost_sharp") : t("game.plan.ghost_fuzzy")}`;
    }
    return m;
  });
  const ghostSharp = createMemo(() => {
    const gd = ghostDelta();
    if (!gd) return undefined;
    const m: Partial<Record<StrandId, boolean>> = {};
    for (const [id, v] of Object.entries(gd)) m[id as StrandId] = v!.sharp;
    return m;
  });
  const shortLabels = Object.fromEntries(STRAND_IDS.map((id) => [id, textOf(`game.strand_short.${id}`)])) as Partial<Record<StrandId, Text>>;
  const pullable = () => (out() ? STRAND_IDS.filter((_, i) => i < ui.ticked()) : []);
  /** The 2050 marker is explained at the start of turn 3, or when the first slow card arrives (plain-wales 3.1). */
  const markerTime = () => s().term >= 2 || !!s().opening?.arrivals.some((a) => a.arrivesTerm > a.playedTerm) || s().history.some((h) => h.arrivals.length > 0);
  const markerKnown = () => ui.guide.hasSeen("marker") || ui.guide.skipped() || s().step === "ended";
  const limitNext = () => (s().step === "changed" || s().step === "election" ? s().lastOutcome?.trust.cardLimit ?? s().cardLimit : s().cardLimit);
  const termNo = () => Math.min(6, s().term + 1);

  return (
    <ShellTopBar
      hideNav
      year={s().step === "ended" ? 2050 : s().step === "changed" || s().step === "election" ? s().year + 4 : s().year}
      yearNote={
        <>
          <b>{s().caretaker ? t("game.bar.caretaker") : t(s().step === "changed" || s().step === "election" ? "game.bar.term_done" : "game.bar.term", { n: termNo() })}</b>
          <Show when={ghostHeading()} fallback={<span>{t("game.bar.generation")}</span>}>
            <span class="yf-ghosthead">{ghostHeading()}</span>
          </Show>
        </>
      }
      middle={
        <div class="yf-bar-middle">
          <div class="yf-strands" classList={{ ghosting: !out() && !!game.ghost()?.preview }}>
            <StrandRow
              views={views()}
              changes={changes()}
              ghosts={ghosts()}
              ghostSharp={ghostSharp()}
              ghostLabels={ghostLabels()}
              labels={shortLabels}
              notes={ghostNotes()}
              pullable={pullable()}
              onPull={(id) => { game.pull(id); ui.guide.done("pull"); ui.guide.done("why"); }}
              stockFaint={!markerKnown() && !markerTime()}
              plainCount
            />
            <p class="sr-only" aria-live="polite">
              {ghostHeading() ? `${ghostHeading()} ${STRAND_IDS.filter((id) => ghostLabels()?.[id]).map((id) => `${game.names.strandName(id)} ${ghostLabels()![id]!.down ? t("game.plan.ghost_dir_down") : t("game.plan.ghost_dir_up")}, ${ghostLabels()![id]!.text}`).join("; ")}` : ""}
            </p>
            <Show when={s().step === "opening" || s().step === "plan" || s().step === "pledge"}>
              <Note id="marker" when={markerTime() && ui.guide.hasSeen("handoff")} class="yf-note-strands">{t("play.guide.marker")}</Note>
            </Show>
          </div>
          <Show when={s().step !== "ended"}>
          <Scoreboard showLeft={markerTime() || markerKnown()} />
          <div class="yf-trust">
            <TrustSlots band={s().step === "changed" || s().step === "election" ? s().lastOutcome?.trust.band ?? s().trustBand : s().trustBand} cards={limitNext()} now={!(s().step === "changed" || s().step === "election")} out={s().step === "caretaker" || (s().caretaker && s().step !== "changed" && s().step !== "election")} />
            <Show when={s().step === "election"}>
              <Note id="trust" when={true} class="yf-note-trust" placement="left">{t("play.guide.trust")}</Note>
            </Show>
          </div>
          </Show>
        </div>
      }
    />
  );
}


// ------------------------------------------------------------------ the two running scores

/**
 * The scoreboard on the top bar (plain-wales 3.2): "Life now: about 52 out of 100" and, from turn 3,
 * "Left for 2050". The same weighted sums the end screen uses (engine `headline`), each with its
 * 2026 value under it, so a player can see what moves the score.
 */
export function Scoreboard(props: { showLeft: boolean }): JSX.Element {
  const { game } = useGame();
  const h = createMemo(() => {
    const st = game.state();
    if (!st) return null;
    try { return headline(game.model, st); } catch { return null; }
  });
  const r = (v: number) => Math.round(v);
  return (
    <Show when={h()}>
      <div class="yf-score" role="group" aria-label={t("play.score.label")} data-testid="scoreboard">
        <Tooltip heading={t("play.score.life")} content={<>{t("play.score.tip_life")} {t("play.score.rule")}</>}>
          <div class="yf-score-item" data-testid="score-life" tabIndex={0}>
            <span class="label">{t("play.score.life")}</span>
            <b class="data">{t("play.score.value", { n: r(h()!.lifeNow) })}</b><span class="small">{t("play.score.was", { n: r(h()!.start.lifeNow) })}</span>
          </div>
        </Tooltip>
        <Show when={props.showLeft}>
          <Tooltip heading={t("play.score.left")} content={<>{t("play.score.tip_left")} {t("play.score.rule")}</>}>
            <div class="yf-score-item" data-testid="score-left" tabIndex={0}>
              <span class="label">{t("play.score.left")}</span>
              <b class="data">{t("play.score.value", { n: r(h()!.left2050) })}</b><span class="small">{t("play.score.was", { n: r(h()!.start.left2050) })}</span>
            </div>
          </Tooltip>
        </Show>
      </div>
    </Show>
  );
}

// ------------------------------------------------------------------ the four-step strip

const STEP_OF: Record<string, 1 | 2 | 3 | 4> = { opening: 1, pledge: 1, plan: 1, visit: 2, passing: 3, caretaker: 3, changed: 4, election: 4 };
const STEP_KEYS = ["play.steps.choose", "play.steps.visit", "play.steps.pass", "play.steps.happened"] as const;

/** Under the top bar: 1 Choose your cards, 2 Visit a place, 3 Four years pass, 4 What happened. */
export function StepStrip(): JSX.Element {
  const { game } = useGame();
  const cur = () => STEP_OF[game.state()?.step ?? ""] ?? 0;
  // always in the grid (a row of its own), empty at the end
  return (
    <nav class="yf-stepstrip" classList={{ off: !cur() }} aria-label={t("play.steps.label")} aria-hidden={!cur() ? "true" : undefined} data-testid="step-strip">
      <ol>
        <For each={cur() ? STEP_KEYS : []}>
          {(k, i) => (
            <li classList={{ now: cur() === i() + 1, done: cur() > i() + 1 }} aria-current={cur() === i() + 1 ? "step" : undefined}>
              <span class="yf-stepno data" aria-hidden="true">{i() + 1}</span>
              <span>{t(k)}</span>
              <Show when={cur() === i() + 1}><span class="sr-only"> ({t("play.steps.now")})</span></Show>
            </li>
          )}
        </For>
      </ol>
    </nav>
  );
}
