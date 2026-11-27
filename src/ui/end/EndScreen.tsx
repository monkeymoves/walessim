// 2050: the envelope opens, the letter is read line by line, then Lived and Left are woven side
// by side with the 2026 mark and the caretaker's ghost, the six terms, the ledger, what you might
// do differently, and the ways to play again.
import { createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { lang, pick, t, tn } from "../../i18n";
import { TERM_YEARS, type EndResult, type StrandId } from "../../engine/api";
import { recomputeResult } from "../game/engine";
import { STRAND_IDS, type Text } from "../../model/schema";
import { StampButton, TabButton, ThreadButton } from "../parts/Buttons";
import { Icon } from "../parts/Icon";
import { Snip } from "../parts/Notice";
import { strandVars } from "../parts/strands";
import { useGame } from "../game/context";
import { shareLink } from "../game/save";

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
      `${t("game.end.lived")} ${r.squares.lived.map((x) => EMOJI[x]).join("")}`,
      `${t("game.end.left")} ${r.squares.left.map((x) => EMOJI[x]).join("")}`,
    ].join("\n");
  };

  return (
    <div class="end">
      <section class="end-letter-col">
        <Show
          when={opened()}
          fallback={
            <div class="end-envelope sheet">
              <Icon name="envelope" size={96} />
              <p class="t-1">{t("game.end.envelope")}</p>
              <StampButton class="yf-go" onClick={open} autofocus>{t("game.end.open")}</StampButton>
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
              <p class="small end-archetype">{t("game.end.archetype", { name: pick(letter().title) })}. {t("game.end.letters", { n: game.letters().length })}</p>
            </Show>
          </article>
        </Show>
      </section>

      <Show when={opened() && lines() >= letter().lines.length}>
        <section class="end-result-col" aria-label={t("game.end.read_on")}>
          <Bands result={result()} custom={!!weights()} />
          <Terms result={result()} />
          <Weights weights={weights()} onChange={setWeights} />
          <div class="end-two">
            <Ledger result={result()} />
            <Prompts result={result()} />
          </div>
          <div class="end-actions sheet">
            <div class="yf-actions">
              <StampButton class="yf-go" onClick={() => game.start({ firstGame: false })}>{t("game.end.again")}</StampButton>
              <TabButton onClick={() => game.start({ daily: true })}>{t("game.end.daily")}</TabButton>
              <TabButton onClick={() => copy(resultText(), "result")}>{t("game.end.copy_result")}</TabButton>
              <TabButton onClick={() => copy(shareLink(game.lastSave() ?? ""), "link")}>{t("game.end.share")}</TabButton>
              <ThreadButton onClick={() => game.pull(worstStrand(result()), result().result.which === "left" ? "stock" : "flow", s().history.length - 1)}>
                {t("game.end.pull")}
              </ThreadButton>
            </div>
            <p class="small" role="status">{copied() ? t("game.end.copied") : t("game.end.again_note")}</p>
            <p class="small data">
              {s().options.daily ? t("game.end.daily_seed", { date: s().options.daily! }) : t("game.end.seed", { seed: s().seedLabel })}
              <Show when={s().modified}> {t("game.end.modified")}</Show>
            </p>
          </div>
        </section>
      </Show>
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
export function changeWords(v: number | null): string {
  if (v == null) return "";
  const n = Math.round(Math.abs(v));
  if (Math.abs(v) < 0.5 || n === 0) return t("game.end.change_level");
  return tn(v > 0 ? "game.end.change_up" : "game.end.change_down", n);
}

/** The fuzzy edge as words, from p10 and p90: "Between about 1 and 3 up." Nothing if they round the same. */
function rangeWords(lo: number | null, hi: number | null): string {
  if (lo == null || hi == null) return "";
  const a = Math.round(lo), b = Math.round(hi);
  if (a === b) return "";
  if (a >= 0 && b > 0) return t("game.end.range_up", { a: Math.max(a, 0), b });
  if (a < 0 && b <= 0) return t("game.end.range_down", { a: -b, b: -a });
  return t("game.end.range_mixed", { a: -a, b });
}

function Bands(props: { result: EndResult; custom: boolean }): JSX.Element {
  const r = () => props.result;
  const lowerName = () => (r().result.which === "lived" ? t("game.end.lived") : t("game.end.left"));
  const vs = () => fin(r().vsCaretaker);
  const vsWords = () => {
    const v = vs();
    if (v == null) return "";
    const n = Math.round(Math.abs(v));
    if (n === 0) return t("game.end.vs_level");
    return tn(v > 0 ? "game.end.vs_ahead" : "game.end.vs_behind", n);
  };
  return (
    <div class="end-bands sheet">
      <p class="t-2 end-verdict">
        {t("game.end.summary_lived", { change: changeWords(fin(r().lived.value)) })}{" "}
        {t("game.end.summary_left", { change: changeWords(fin(r().left.value)) })}{" "}
        {t("game.end.lower", { which: lowerName(), band: pick(r().result.band.name) })}
      </p>
      <p class="small">{rangeWords(fin(r().result.p10), fin(r().result.p90))} {t("game.end.unit")}</p>
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
        <span class="t-2">{t(`game.end.${props.which}`)}</span>
        <span class="small">{t(`game.end.${props.which}_note`)}</span>
        <span class="label">{changeWords(fin(props.score.value))}. {pick(props.score.band.name)}</span>
      </figcaption>
      <div class="end-weave" role="img" aria-label={`${t(`game.end.${props.which}`)}: ${changeWords(fin(props.score.value))}, ${pick(props.score.band.name)}`}>
        <div class="end-woven" style={{ width: pct(level()) }}>
          <For each={STRAND_IDS}>
            {(id) => <i style={{ ...strandVars(id), flex: `${((r().weights[id] ?? 0) * strandLevel(id)) / total()} 0 0` }} title={t(`parts.strand.${id}`)} />}
          </For>
        </div>
        <i class="end-mark end-start" style={{ left: pct(startV()) }}><span class="small">{t("game.end.start_mark")}</span></i>
        <Show when={ghostV() != null}>
          <i class="end-mark end-ghost" style={{ left: pct(ghostV()) }}><span class="small">{t("game.end.ghost_mark")}</span></i>
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
        <p class="small">{t("game.end.worst", { year: TERM_YEARS[r().worstTerm]! })}.<Show when={r().dippedBelowStart}> {t("game.end.dipped")}</Show></p>
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
                <p><span>{t("game.end.grade_line", { place: game.names.placeName(g.place), year: g.year })}</span> <span class="stampmark">{t(`game.grade.${g.grade}`)}</span></p>
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

// ------------------------------------------------------------------ what would you do differently

function Prompts(props: { result: EndResult }): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const prompts = createMemo(() => {
    const r = props.result;
    const out: string[] = [];
    out.push(t(r.result.which === "lived" ? "game.end.prompt.lived_lower" : "game.end.prompt.left_lower"));
    out.push(t("game.end.prompt.weakest", { strand: game.names.strandName(worstStrand(r)) }));
    if (r.ledger.lostTerms.length) out.push(t("game.end.prompt.lost_seat", { year: termYear(r.ledger.lostTerms[0]!) }));
    if (r.ledger.debts.length) out.push(t("game.end.prompt.debts"));
    if (!r.ledger.grades.some((g) => g.grade === "well")) {
      const place = r.ledger.grades[0]?.place ?? "rhondda";
      out.push(t("game.end.prompt.no_well", { place: game.names.placeName(place) }));
    }
    const absorbed = s().history.some((h) => h.shock && h.shock.response === 0 && !h.shock.prepared);
    if (absorbed) out.push(t("game.end.prompt.contingency"));
    const neglect = s().history.flatMap((h) => h.trust.reasons.filter((x) => x.code === "neglect").map((x) => x.detail)).find(Boolean);
    if (neglect) out.push(t("game.end.prompt.neglect", { region: game.names.regionName(neglect as never) }));
    return out.slice(0, 4);
  });
  return (
    <div class="end-prompts sheet">
      <h3 class="t-3">{t("game.end.differently")}</h3>
      <ul class="yf-list story-small"><For each={prompts()}>{(p) => <li>{p}</li>}</For></ul>
    </div>
  );
}
