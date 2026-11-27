// 2050: the envelope opens, the letter is read line by line, then Lived and Left are woven side
// by side with the 2026 mark and the caretaker's ghost, the six terms, the ledger, what you might
// do differently, and the ways to play again.
import { createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { lang, pick, t, tn } from "../../i18n";
import { tw } from "../game/cymraeg";
import { TERM_YEARS, type EndResult, type Mattered, type StrandId } from "../../engine/api";
import { headline, recomputeResult, unusedCoins, whatMattered } from "../game/engine";
import { STRAND_IDS, type Text } from "../../model/schema";
import { StampButton, TabButton, ThreadButton } from "../parts/Buttons";
import { Icon } from "../parts/Icon";
import { Snip } from "../parts/Notice";
import { strandVars } from "../parts/strands";
import { useGame } from "../game/context";
import { shareLink } from "../game/save";
import { NotebookEndLine } from "../game/RealWales";

/** A finite number or null: the end screen never draws a value the engine could not give. */
const fin = (v: number | null | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const EMOJI: Record<StrandId, string> = { prosperous: "🟨", resilient: "🟩", healthier: "🟦", equal: "🟪", cohesive: "🟧", culture: "⬛", global: "⬜" };

export function EndScreen(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const [opened, setOpened] = createSignal(false);
  const [lines, setLines] = createSignal(0);
  const [weights, setWeights] = createSignal<Record<StrandId, number> | null>(null);
  const [copied, setCopied] = createSignal<string | null>(null);

  const result = createMemo<EndResult>(() => {
    const w = weights();
    const base = s().result!;
    if (!w) return base;
    try { return recomputeResult(game.model, s(), w); } catch { return base; }
  });
  const letter = () => s().result!.letter;

  function open(): void {
    setOpened(true);
    const n = letter().lines.length;
    if (reduced()) { setLines(n); return; }
    let i = 0;
    timer = window.setInterval(() => { i += 1; setLines(i); if (i >= n) clearInterval(timer); }, 650);
  }
  let timer = 0;
  onCleanup(() => clearInterval(timer));
  onMount(() => { if (reduced()) open(); });

  async function copy(text: string, what: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); setCopied(what); } catch { setCopied(null); }
  }
  const resultText = () => {
    const r = result();
    return [
      t("game.end.share_text", { band: pick(r.result.band.name) }),
      `${t("play.end.life_years")} ${r.squares.lived.map((x) => EMOJI[x]).join("")}`,
      `${t("game.end.left")} ${r.squares.left.map((x) => EMOJI[x]).join("")}`,
      shareLink(game.lastSave() ?? ""),
    ].join("\n");
  };

  return (
    <div class="end end-plain" data-testid="end-screen">
      <div class="end-col">
        <Verdict result={result()} />
        <Mattered />
        <section class="end-letter-col" aria-label={t("play.end.letter_title")}>
          <Show
            when={opened()}
            fallback={
              <div class="end-envelope sheet">
                <Icon name="envelope" size={72} />
                <p class="t-1">{t("play.end.letter_title")}</p>
                <StampButton class="yf-go" data-testid="open-letter" onClick={open}>{t("play.end.open_letter")}</StampButton>
              </div>
            }
          >
            <article class="end-letter sheet" lang={lang()} aria-labelledby="end-letter-head">
              <h2 id="end-letter-head" class="t-poster end-poster">2050</h2>
              <p class="t-1 end-from">{t("game.end.letter_from", { town: pick(letter().town) })}</p>
              <div class="end-lines" aria-live="polite">
                <For each={letter().lines}>
                  {(l, i) => (
                    <p class={`story end-line end-${l.slot}`} classList={{ shown: i() < lines() }}>
                      {pick(l.text)}
                    </p>
                  )}
                </For>
              </div>
              <Show when={lines() >= letter().lines.length}>
                <p class="end-sign print">{t("game.end.signed", { town: pick(letter().town) })}</p>
                <p class="small end-archetype">{t("play.end.ending_found", { name: pick(letter().title), n: game.letters().length })}</p>
              </Show>
            </article>
          </Show>
        </section>

        <details class="end-detail sheet" data-testid="end-detail">
          <summary class="t-3">{t("play.end.detail")}</summary>
          <div class="end-detail-body">
            <Bands result={result()} custom={!!weights()} />
            <Terms result={result()} />
            <GoalTable result={result()} />
            <Ledger result={result()} />
            <NotebookEndLine class="small" />
            <Weights weights={weights()} onChange={setWeights} />
            <div class="yf-actions">
              <TabButton onClick={() => copy(resultText(), "result")}>{t("game.end.copy_result")}</TabButton>
              <TabButton onClick={() => copy(shareLink(game.lastSave() ?? ""), "link")}>{t("play.end.copy_link")}</TabButton>
            </div>
            <p class="small" role="status">{copied() ? t("game.end.copied") : ""}</p>
            <p class="small data">
              {s().options.daily ? t("game.end.daily_seed", { date: s().options.daily! }) : t("play.end.game_no", { n: s().seedLabel })}
              <Show when={s().modified}> {t("game.end.modified")}</Show>
            </p>
          </div>
        </details>

        <div class="end-actions sheet">
          <p class="story-small end-next" data-testid="end-next">{nextTime(game, result())}</p>
          <div class="yf-actions">
            <StampButton class="yf-go" data-testid="play-again" onClick={() => game.start({ firstGame: false })}>{t("play.end.play_again")}</StampButton>
            <TabButton onClick={() => game.start({ daily: true })}>{t("game.end.daily")}</TabButton>
          </div>
          <p class="small">{t("play.end.new_game_note")}</p>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 1 and 2: one result, one reason

type Game = ReturnType<typeof useGame>["game"];

/** "a little worse than you found it" from the band name, for "You left Wales ...". */
const lowerFirst = (x: string) => (x ? x.charAt(0).toLowerCase() + x.slice(1) : x);

/** A cause in a few words, for "The biggest reason: ...". */
function causeWords(game: Game, m: Mattered): string {
  switch (m.kind) {
    case "card": return t("play.end.cause_card", { card: game.names.cardName(m.id), year: m.year });
    case "shock": return t("play.end.cause_shock", { year: m.year, name: game.names.shockName(m.id) });
    case "lost_turn": return t("play.end.cause_lost", { year: m.year });
    case "promise": return tw("play.end.cause_promise", { goal: game.names.strandName(m.id as StrandId) }, []);
    case "visit": return tw("play.end.cause_visit", { place: game.names.placeName(m.id as "rhondda" | "bethesda"), year: m.year });
    default: return "";
  }
}

function Verdict(props: { result: EndResult }): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const r = () => props.result;
  const h = createMemo(() => {
    try { return headline(game.model, s()); } catch { return null; }
  });
  /** The weaker side's 2026 and 2050 scores out of 100 (the engine's own levels times ten). */
  const scores = () => {
    const x = h();
    if (!x) return null;
    const lived = r().result.which === "lived";
    // with custom weights the headline is stale: read the levels off the recomputed result
    const start = (lived ? r().start.lived : r().start.left) * 10;
    const end = (lived ? r().livedLevel : r().leftLevel) * 10;
    return { start: Math.round(fin(start) ?? 0), end: Math.round(fin(end) ?? 0) };
  };
  const all = createMemo(() => {
    try { return whatMattered(game.model, s(), 8); } catch { return [] as Mattered[]; }
  });
  const coins = createMemo(() => {
    try { return unusedCoins(game.model, s()); } catch { return { coins: 0, turns: 0, firstTerm: 0, perTurn: [] }; }
  });
  /** Plain-wales 7.2: one sentence on why, from the weaker side and the largest cause. */
  const why = (): string => {
    const c = coins();
    if (c.turns >= 3) return t("play.end.why_coins", { n: c.coins, t: c.turns });
    const lived = fin(r().lived.value) ?? 0, left = fin(r().left.value) ?? 0;
    const worst = all().filter((m) => m.size < 0 && m.kind !== "coins_unused")[0];
    const best = all().filter((m) => m.size > 0)[0];
    const goalFell = () => {
      const key = r().result.which;
      const st = [...r().perStrand].sort((a, b) => a[key] - b[key])[0];
      return st ? tw("play.end.cause_goal", { goal: game.names.strandName(st.strand) }, []) : "";
    };
    const goalRose = () => {
      const key = r().result.which;
      const st = [...r().perStrand].sort((a, b) => b[key] - a[key])[0];
      return st ? tw("play.end.cause_goal_up", { goal: game.names.strandName(st.strand) }, []) : "";
    };
    const downCause = () => (worst ? causeWords(game, worst) : goalFell());
    if (lived < -0.5 && left < -0.5) return t("play.end.why_both", { cause: downCause() });
    if (r().result.which === "left" && left < lived) {
      if (left < -0.5) return t("play.end.why_left", { cause: downCause() });
    }
    if (r().result.which === "lived" && lived < left) {
      const y = TERM_YEARS[r().worstTerm];
      if (r().worstFell !== false && y != null) return t("play.end.why_lived", { year: y });
      return t("play.end.why_lived_plain");
    }
    return t("play.end.why_up", { cause: best ? causeWords(game, best) : goalRose() });
  };
  return (
    <section class="end-verdict-box sheet" aria-labelledby="end-result-title" data-testid="end-result">
      <p class="label">{t("play.end.result_title")}</p>
      <h2 id="end-result-title" class="t-1 end-result-line">{t("play.end.result", { band: lowerFirst(pick(r().result.band.name)) })}</h2>
      <Show when={scores()}>
        <p class="story end-score" data-testid="end-score">{t("play.end.score", { start: scores()!.start, end: scores()!.end })}</p>
      </Show>
      <p class="story-small end-why" data-testid="end-why">{why()}</p>
    </section>
  );
}

// ------------------------------------------------------------------ 3: what you did that mattered

function Mattered(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const r = () => s().result!;
  const items = createMemo(() => {
    try { return whatMattered(game.model, s(), 3); } catch { return [] as Mattered[]; }
  });
  const line = (m: Mattered): string => {
    switch (m.kind) {
      case "card": {
        const where = m.regions?.length ? game.names.regionsText(m.regions) : t("play.end.where_wales");
        return t(m.size >= 0 ? "play.end.m_card_up" : "play.end.m_card_down", { card: game.names.cardName(m.id), where, year: m.year, goal: m.strand ? game.names.strandName(m.strand) : "" });
      }
      case "shock": {
        const name = game.names.shockName(m.id);
        if (m.response && m.response > 0) return t("play.end.m_shock_saved", { year: m.year, name, n: m.response });
        if (m.prepared) return t("play.end.m_shock_ready", { year: m.year, name });
        return t("play.end.m_shock_none", { year: m.year, name });
      }
      case "visit": return tw(m.size >= 0 ? "play.end.m_visit_good" : "play.end.m_visit_bad", { place: game.names.placeName(m.id as "rhondda" | "bethesda"), year: m.year, grade: t(`game.grade.${m.place?.grade ?? "adequately"}`) });
      case "promise": return tw(m.kept ? "play.end.m_promise_kept" : "play.end.m_promise_broken", { goal: game.names.strandName(m.id as StrandId), year: m.year }, []);
      case "lost_turn": return t("play.end.m_lost_turn", { year: m.year });
      case "coins_unused": return t("play.end.m_coins", { n: m.coins ?? 0, t: m.turns ?? 0 });
    }
  };
  /** Autopilot: the same Wales with a stand-in, as a score out of 100 on the weaker side. */
  const autopilot = () => {
    const g = r().caretakerGhost;
    const vs = fin(r().vsCaretaker);
    if (!g || vs == null) return null;
    const n = STRAND_IDS.length;
    const level = g.lived <= g.left ? r().start.lived + g.lived / n : r().start.left + g.left / n;
    const d = Math.round(Math.abs((vs / n) * 10));
    const at = Math.round(level * 10);
    if (d === 0) return t("play.end.autopilot_level", { n: at });
    return t(vs > 0 ? "play.end.autopilot_ahead" : "play.end.autopilot_behind", { n: at, d });
  };
  const pull = (m: Mattered) => {
    const term = Math.max(0, Math.min(s().history.length - 1, m.kind === "card" ? (s().history.findIndex((h) => h.contributions.some((c) => c.cause.kind === "card" && c.cause.id === m.id && c.cause.term === m.term && h.term >= m.term)) ?? m.term) : m.term));
    game.pull(m.strand ?? worstStrand(r()), "flow", term < 0 ? m.term : term);
  };
  return (
    <section class="end-mattered sheet" aria-labelledby="end-mattered-title" data-testid="end-mattered">
      <h2 id="end-mattered-title" class="t-3">{t("play.end.mattered")}</h2>
      <ul class="yf-list story-small">
        <For each={items()}>
          {(m) => (
            <li>
              <span>{line(m)}</span>{" "}
              <Show when={m.strand && m.kind !== "promise"}>
                <ThreadButton onClick={() => pull(m)}>{t("game.end.pull")}</ThreadButton>
              </Show>
            </li>
          )}
        </For>
      </ul>
      <Show when={autopilot()}>
        <p class="story-small end-autopilot">{autopilot()}</p>
        <p class="small">{t("play.end.autopilot_note")}</p>
      </Show>
    </section>
  );
}

/** One suggestion for next time, from what happened (plain-wales 7.6). */
function nextTime(game: Game, r: EndResult): string {
  const s = game.state()!;
  let coins = { turns: 0 };
  try { coins = unusedCoins(game.model, s); } catch { /* none */ }
  if (coins.turns >= 2) return t("play.end.next_spend");
  if (s.history.some((h) => h.shock && h.shock.response === 0 && !h.shock.prepared)) return t("play.end.next_save");
  if (s.history.some((h) => h.pledge && !h.pledge.kept)) return t("play.end.next_promise");
  if (r.result.which === "left" && (fin(r.left.value) ?? 0) < 0.5) return t("play.end.next_left");
  if (r.result.which === "lived") return t("play.end.next_life");
  if (!r.ledger.grades.length) return t("play.end.next_visit");
  const firstSlow = s.history[0]?.plays.cards.some((c) => (game.names.card(c.card)?.delay ?? 0) > 0);
  return firstSlow ? t("play.end.next_left") : t("play.end.next_slow");
}

// ------------------------------------------------------------------ per goal

function GoalTable(props: { result: EndResult }): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const sim = () => s().history[0]?.strands;
  const startOf = (id: StrandId) => sim()?.find((c) => c.strand === id)?.pipsBefore ?? null;
  const n = (v: number | null) => (v == null ? "" : String(Math.round(v)));
  return (
    <div class="end-goals">
      <h3 class="t-3">{t("play.end.goals")}</h3>
      <table class="end-goal-table small">
        <thead>
          <tr><th scope="col">{t("play.end.goal_col")}</th><th scope="col">{t("play.end.col_2026")}</th><th scope="col">{t("play.end.col_life")}</th><th scope="col">{t("play.end.col_left")}</th></tr>
        </thead>
        <tbody>
          <For each={props.result.perStrand}>
            {(p) => (
              <tr>
                <th scope="row"><Snip strand={p.strand} /> {game.names.strandName(p.strand)}</th>
                <td class="data">{n(startOf(p.strand))}</td>
                <td class="data" classList={{ weaker: p.lower === "lived" }}>{n(p.livedLevel)}<Show when={p.lower === "lived"}> <span class="small">({t("play.end.weaker")})</span></Show></td>
                <td class="data" classList={{ weaker: p.lower === "left" }}>{n(p.leftLevel)}<Show when={p.lower === "left"}> <span class="small">({t("play.end.weaker")})</span></Show></td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

/** Lost terms may come as term indices or as years: show the year either way. */
const termYear = (x: number): number => (x >= 2026 ? x : TERM_YEARS[x] ?? x);

function worstStrand(r: EndResult): StrandId {
  const key = r.result.which;
  return [...r.perStrand].sort((a, b) => a[key] - b[key])[0]?.strand ?? "prosperous";
}

// ------------------------------------------------------------------ Lived and Left

/** A change in net pips, in words: "about 2 pips up", "level with 2026". Never a decimal. */
export function changeWords(v0: number | null): string {
  if (v0 == null) return "";
  // the engine judges change in net goal steps; the player reads points out of 100 (plain-wales 1.1)
  const v = (v0 * 10) / STRAND_IDS.length;
  const n = Math.round(Math.abs(v));
  if (Math.abs(v) < 0.5 || n === 0) return t("game.end.change_level");
  return tn(v > 0 ? "game.end.change_up" : "game.end.change_down", n);
}

/** The fuzzy edge as words, from p10 and p90: "Between about 1 and 3 up." Nothing if they round the same. */
function rangeWords(lo: number | null, hi: number | null): string {
  if (lo == null || hi == null) return "";
  const k = 10 / STRAND_IDS.length;
  const a = Math.round(lo * k), b = Math.round(hi * k);
  if (a === b) return "";
  if (a >= 0 && b > 0) return t("game.end.range_up", { a: Math.max(a, 0), b });
  if (a < 0 && b <= 0) return t("game.end.range_down", { a: -b, b: -a });
  return t("game.end.range_mixed", { a: -a, b });
}

function Bands(props: { result: EndResult; custom: boolean }): JSX.Element {
  const r = () => props.result;
  const vs = () => fin(r().vsCaretaker);
  const vsWords = () => {
    const v0 = vs();
    if (v0 == null) return "";
    const v = (v0 * 10) / STRAND_IDS.length;
    const n = Math.round(Math.abs(v));
    if (n === 0) return t("game.end.vs_level");
    return tn(v > 0 ? "game.end.vs_ahead" : "game.end.vs_behind", n);
  };
  return (
    <div class="end-bands sheet">
      <h3 class="t-3">{t("play.end.two_scores")}</h3>
      <p class="story-small">{t("play.score.rule")}</p>
      <p class="small">{rangeWords(fin(r().result.p10), fin(r().result.p90))}</p>
      <Show when={props.custom}><p class="label end-badge">{t("game.end.weights_badge")}</p></Show>
      <div class="end-pair">
        <Band which="lived" score={r().lived} lower={r().result.which === "lived"} result={r()} />
        <Band which="left" score={r().left} lower={r().result.which === "left"} result={r()} />
      </div>
      <Show when={fin(r().caretakerGhost?.result) != null}>
        <p class="story-small">{t("game.end.ghost_line", { change: changeWords(fin(r().caretakerGhost!.result)) })} {vsWords()}</p>
      </Show>
    </div>
  );
}

function Band(props: { which: "lived" | "left"; score: EndResult["lived"]; lower: boolean; result: EndResult }): JSX.Element {
  const r = () => props.result;
  const level = () => fin(props.which === "lived" ? r().livedLevel : r().leftLevel);
  const strandLevel = (id: StrandId) => {
    const p = r().perStrand.find((x) => x.strand === id);
    return fin(props.which === "lived" ? p?.livedLevel : p?.leftLevel) ?? 0;
  };
  const total = () => STRAND_IDS.reduce((a, id) => a + (r().weights[id] ?? 0) * strandLevel(id), 0) || 1;
  const pct = (v: number | null) => `${Math.max(0, Math.min(10, fin(v) ?? 0)) * 10}%`;
  const startV = () => (props.which === "lived" ? r().start.lived : r().start.left);
  /** The caretaker's ghost is given as change; its level is the start plus the change over the seven strands. */
  const ghostV = () => {
    const g = r().caretakerGhost;
    const c = fin(g ? (props.which === "lived" ? g.lived : g.left) : null);
    return c == null ? null : startV() + c / STRAND_IDS.length;
  };
  return (
    <figure class="end-band" classList={{ lower: props.lower }}>
      <figcaption>
        <span class="t-3">{props.which === "lived" ? t("play.end.life_years") : t("play.score.left")}<Show when={props.lower}> <span class="small">({t("play.end.weaker")})</span></Show></span>
        <span class="small">{props.which === "lived" ? t("play.end.life_years_note") : t("play.end.left_note")}</span>
        <span class="label">{t("play.score.value", { n: Math.round((level() ?? 0) * 10) })}, {t("play.score.was", { n: Math.round(startV() * 10) })}</span>
      </figcaption>
      <div class="end-weave" role="img" aria-label={`${t(`game.end.${props.which}`)}: ${changeWords(fin(props.score.value))}, ${pick(props.score.band.name)}`}>
        <div class="end-woven" style={{ width: pct(level()) }}>
          <For each={STRAND_IDS}>
            {(id) => <i style={{ ...strandVars(id), flex: `${((r().weights[id] ?? 0) * strandLevel(id)) / total()} 0 0` }} title={t(`parts.strand.${id}`)} />}
          </For>
        </div>
        <i class="end-mark end-start" style={{ left: pct(startV()) }}><span class="small">{t("play.end.mark_2026")}</span></i>
        <Show when={ghostV() != null}>
          <i class="end-mark end-ghost" style={{ left: pct(ghostV()) }}><span class="small">{t("play.end.mark_autopilot")}</span></i>
        </Show>
        <div class="end-pegs" aria-hidden="true" />
      </div>
    </figure>
  );
}

// ------------------------------------------------------------------ six terms

/**
 * The six terms against the 2026 line. Term 1 is greyed as inherited; a counted term below 2026 is
 * marked in rust. The axis is centred on 2026 so the small honest differences can be seen.
 */
function Terms(props: { result: EndResult }): JSX.Element {
  const r = () => props.result;
  const w0 = () => r().start.lived;
  const span = 1.5; // points either side of 2026 shown, about ten net strand pips
  const y = (v: number | null) => 50 - (Math.max(-span, Math.min(span, (fin(v) ?? w0()) - w0())) / span) * 50;
  return (
    <div class="end-terms sheet">
      <p class="label">{t("game.end.terms")}</p>
      <div class="end-cols-wrap">
        <i class="end-line2026" aria-hidden="true"><span class="small">{t("game.end.line_2026")}</span></i>
        <ol class="end-cols">
          <For each={r().wellbeingByTerm}>
            {(w, i) => {
              const below = () => i() > 0 && (fin(w) ?? w0()) < w0();
              const top = () => Math.min(y(w), 50);
              const h = () => Math.abs(y(w) - 50);
              return (
                <li classList={{ inherited: i() === 0, worst: i() === r().worstTerm, below: below() }}>
                  <span class="end-col-area">
                    <i style={{ top: `${top()}%`, height: `${Math.max(h(), 1.5)}%` }} classList={{ nodata: fin(w) == null }} aria-hidden="true" />
                  </span>
                  <span class="data small">{TERM_YEARS[i()]}</span>
                  <Show when={i() === 0}><span class="small end-inherited">{t("game.end.inherited")}</span></Show>
                </li>
              );
            }}
          </For>
        </ol>
      </div>
      <p class="small">{t("game.end.terms_note")}</p>
      <Show when={TERM_YEARS[r().worstTerm] != null}>
        <p class="small">
          {r().worstFell === false ? t("game.end.weakest_term", { year: TERM_YEARS[r().worstTerm]! }) : t("game.end.worst", { year: TERM_YEARS[r().worstTerm]! })}.
          <Show when={r().dippedBelowStart}> {t("game.end.dipped")}</Show>
        </p>
      </Show>
    </div>
  );
}

// ------------------------------------------------------------------ weights

function Weights(props: { weights: Record<StrandId, number> | null; onChange: (w: Record<StrandId, number> | null) => void }): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const cur = () => props.weights ?? (Object.fromEntries(STRAND_IDS.map((id) => [id, 1])) as Record<StrandId, number>);
  return (
    <div class="end-weights">
      <TabButton aria-expanded={open()} onClick={() => setOpen(!open())}>{t("game.end.weights")}</TabButton>
      <Show when={open()}>
        <div class="end-weights-box sheet">
          <p class="small">{t("game.end.weights_note")}</p>
          <For each={STRAND_IDS}>
            {(id) => (
              <label class="end-weight">
                <Snip strand={id} />
                <span class="label">{t(`parts.strand.${id}`)}</span>
                <input type="range" min="0" max="3" step="1" value={cur()[id]}
                  onInput={(e) => props.onChange({ ...cur(), [id]: Number(e.currentTarget.value) })} />
                <span class="data">{cur()[id]}</span>
              </label>
            )}
          </For>
          <Show when={props.weights}>
            <TabButton onClick={() => props.onChange(null)}>{t("game.end.weights_reset")}</TabButton>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// ------------------------------------------------------------------ ledger

function Ledger(props: { result: EndResult }): JSX.Element {
  const { game } = useGame();
  const l = () => props.result.ledger;
  return (
    <div class="end-ledger sheet">
      <h3 class="t-3">{t("game.end.ledger")}</h3>
      <dl>
        <dt class="label">{t("game.ledger.debts")}</dt>
        <dd>{l().debts.length ? `${tn("game.end.debts", l().debts.length)}: ${l().debts.map((d) => d.year).join(", ")}` : t("game.end.no_debts")}</dd>
        <Show when={l().liabilities.length}>
          <dt class="label">{t("game.end.liabilities")}</dt>
          <dd><For each={l().liabilities}>{(x) => <p>{t("game.end.liability_line", { card: game.names.cardName(x.card), year: x.mintedYear, paid: x.paid, skipped: x.skipped })}</p>}</For></dd>
        </Show>
        <Show when={l().deferrals.length}>
          <dt class="label">{t("game.end.deferrals")}</dt>
          <dd><For each={l().deferrals}>{(x) => <p>{t("game.end.deferral_line", { year: x.year, state: x.repaired ? t("game.end.repaired") : t("game.end.not_repaired") })}</p>}</For></dd>
        </Show>
        <Show when={props.result.inThePost.length}>
          <dt class="label">{t("game.end.in_post")}</dt>
          <dd><For each={props.result.inThePost}>{(p) => <p>{t("game.end.in_post_line", { card: game.names.cardName(p.card), year: p.arrivesYear })}</p>}</For></dd>
        </Show>
        <Show when={l().grades.length}>
          <dt class="label">{t("game.end.grades")}</dt>
          <dd class="end-grades">
            <For each={l().grades}>
              {(g) => (
                <p><span>{t("game.end.grade_line", { place: game.names.placeName(g.place), year: g.year })}</span> <span class={`stampmark grade-${g.grade}`}>{t(`game.grade.${g.grade}`)}</span></p>
              )}
            </For>
          </dd>
        </Show>
        <Show when={l().lostTerms.length}>
          <dt class="label">{t("game.end.lost_terms")}</dt>
          <dd>{l().lostTerms.map(termYear).join(", ")}</dd>
        </Show>
        <Show when={l().pledges.length}>
          <dt class="label">{t("game.end.pledges")}</dt>
          <dd><For each={l().pledges}>{(p) => <p>{t("game.end.pledge_line", { year: p.year, strand: game.names.strandName(p.strand), state: p.kept ? t("game.end.kept") : t("game.end.broken") })}</p>}</For></dd>
        </Show>
      </dl>
    </div>
  );
}
