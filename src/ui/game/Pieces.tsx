// Small pieces of the board: the curveball slip, the voice sheet, the top bar.
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { lang, pick, t, tn, textOf } from "../../i18n";
import { CurveballSlip } from "../parts/CurveballSlip";
import { StrandRow } from "../parts/StrandRow";
import { TrustGauge } from "../parts/TrustGauge";
import { TopBar as ShellTopBar } from "../shell/TopBar";
import type { StrandId, VoiceLine } from "../../engine/api";
import { STRAND_IDS, type Text } from "../../model/schema";
import { useGame } from "./context";
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
  const canPeek = () => s().step === "plan" && !s().peekedThisTerm && s().term < 5 && game.budget().left >= (game.model.game.peek_cost ?? 1);
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
  /** Marginal effect per strand in score points (eventual median, with versus without). */
  const ghostDelta = createMemo(() => {
    const g = game.ghost();
    if (!g?.preview || !g.base) return null;
    const m: Partial<Record<StrandId, { d: number; sharp: boolean; pips: number }>> = {};
    for (const p of g.preview.strands) {
      const b = g.base.strands.find((x) => x.strand === p.strand);
      if (!b) continue;
      m[p.strand] = { d: p.eventual.median - b.eventual.median, sharp: p.eventual.sharp, pips: p.eventual.pips - b.eventual.pips };
    }
    return m;
  });
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
  const limitNext = () => (s().step === "changed" || s().step === "election" ? s().lastOutcome?.trust.cardLimit ?? s().cardLimit : s().cardLimit);
  const termNo = () => Math.min(6, s().term + 1);

  return (
    <ShellTopBar
      hideNav
      year={s().step === "ended" ? 2050 : s().step === "changed" || s().step === "election" ? s().year + 4 : s().year}
      yearNote={
        <>
          <b>{s().caretaker ? t("game.bar.caretaker") : t(s().step === "changed" || s().step === "election" ? "game.bar.term_done" : "game.bar.term", { n: termNo() })}</b>
          <span>{t("game.bar.generation")}</span>
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
              labels={shortLabels}
              notes={ghostNotes()}
              pullable={pullable()}
              onPull={(id) => { game.pull(id); ui.guide.done("pull"); }}
            />
            <GhostRow delta={ghostDelta()} card={game.ghost()?.card ?? null} />
            <Show when={s().step === "changed"}>
              <Note id="strands" when={ui.ticked() >= 7} class="yf-note-strands">{t("game.onboard.strands")}</Note>
            </Show>
          </div>
          <Show when={s().step !== "ended"}>
          <div class="yf-trust">
            <TrustGauge band={s().step === "changed" || s().step === "election" ? s().lastOutcome?.trust.band ?? s().trustBand : s().trustBand} cards={limitNext()} now={!(s().step === "changed" || s().step === "election")} compact />
            <Show when={s().step === "election"}>
              <Note id="trust" when={true} class="yf-note-trust" placement="left">{t("game.onboard.trust")}</Note>
            </Show>
          </div>
          </Show>
        </div>
      }
    />
  );
}

// ------------------------------------------------------------------ the ghost, in words

/**
 * The ghost preview as words under the strands it touches: "up about 1 pip", or honestly
 * "up, under a pip" when the card moves a strand by less than a whole pip. Dotted when fuzzy.
 */
function GhostRow(props: { delta: Partial<Record<StrandId, { d: number; sharp: boolean }>> | null; card: string | null }): JSX.Element {
  const { game } = useGame();
  const tag = (v: { d: number; sharp: boolean }) => {
    const n = Math.round(Math.abs(v.d));
    if (n === 0) return t(v.d > 0 ? "game.plan.ghost_small_up" : "game.plan.ghost_small_down");
    return tn(v.d > 0 ? "game.plan.ghost_up" : "game.plan.ghost_down", n);
  };
  // knock-on moves under a fifth of a pip are left off: they are noise, not what the card does
  const touched = () => STRAND_IDS.filter((id) => Math.abs(props.delta?.[id]?.d ?? 0) >= 0.3);
  const heading = () => (props.card ? t("game.plan.ghost_row", { card: game.names.cardName(props.card) }) : t("game.plan.ghost_row_plan"));
  return (
    <Show when={props.delta && touched().length}>
      <div class="yf-ghostrow" role="status" aria-label={heading()}>
        <For each={STRAND_IDS}>
          {(id) => (
            <span class="yf-ghostcell">
              <Show when={touched().includes(id)}>
                <span
                  class="yf-ghosttag"
                  classList={{ fuzzy: !props.delta![id]!.sharp, down: props.delta![id]!.d < 0 }}
                  title={props.delta![id]!.sharp ? t("game.plan.ghost_sharp") : t("game.plan.ghost_fuzzy")}
                >
                  <svg viewBox="0 0 9 8" width="9" height="8" aria-hidden="true">
                    <path fill="currentColor" d={props.delta![id]!.d > 0 ? "M0 8h9L4.5 0z" : "M0 0h9L4.5 8z"} />
                  </svg>
                  <span class="sr-only">{game.names.strandName(id)} {t(props.delta![id]!.d > 0 ? "game.plan.ghost_dir_up" : "game.plan.ghost_dir_down")}: </span>
                  {tag(props.delta![id]!)}
                  <Show when={!props.delta![id]!.sharp}><span class="sr-only">, {t("game.plan.ghost_fuzzy_tag")}</span></Show>
                </span>
              </Show>
            </span>
          )}
        </For>
      </div>
    </Show>
  );
}
