/**
 * The top strip (16.2.6): the date as the one loud thing, coins with a ring that fills towards the
 * next one, income a year, the two scores as they stand, and how many councils back you. The map
 * below is the board.
 *
 * After playtest 8: the purse is named on the coin counter and warned before it fills
 * (./clock/coins.ts); "left if you build it" shows only while the build menu points at a project
 * that can be built; the headline shows one decimal, how it has moved since 2026, how much of it is
 * still being built and when that opens, and what it would be if you built the project pointed at
 * (./clock/headway.ts).
 *
 * After cold playtest 9 (should fix 8): the income a year is what comes in before the purse cuts
 * it (a full purse is said on its own line, never as "About +0 a year"), and when it has moved by a
 * quarter coin or more in the last year a line under it says why, from the engine's Why? for coins
 * (./clock/coins.ts `incomeParts`, `incomeChange`). The tip lists every part.
 */
import { createEffect, createMemo, createSignal, Match, onCleanup, Show, Switch, type JSX } from "solid-js";
import { formatNum, t, tn } from "./lang";
import { LangToggle, Tooltip } from "../../ui/parts";
import type { CoinsReport } from "../engine/api";
import { RULE_IDS, seasonOf, shownYear, stepOfYear, stepsOf, tick, why, yearOfStep } from "../engine/api";
import { scores } from "./engine";
import { coinNote, incomeChange, incomeParts, wholeCoins, type CoinNote, type IncomePart } from "./clock/coins";
import { direction, headlineIf, headway, tenths, type Headway } from "./clock/headway";
import { useGame } from "./game";
import { backersNow, p4 } from "./electionTargets";
import { ruleParamOf } from "./rules";
import { capFirst, incomeWords, listOf, projectName } from "./words";

const INCOME_RULES = { coins: RULE_IDS.coins, careBill: RULE_IDS.careBill, momentum: RULE_IDS.momentum, weak: "B3" };

/** A coin with a ring round it that fills towards the next whole coin. */
function CoinRing(props: { coins: number }): JSX.Element {
  const whole = () => wholeCoins(props.coins);
  const part = () => Math.max(0, Math.min(1, props.coins - whole()));
  const C = 2 * Math.PI * 19;
  return (
    <span class="bw-coin" aria-hidden="true">
      <svg viewBox="0 0 44 44" width="44" height="44">
        <circle cx="22" cy="22" r="19" class="bw-coin-track" />
        <circle cx="22" cy="22" r="19" class="bw-coin-fill" stroke-dasharray={`${(part() * C).toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 22 22)" />
      </svg>
      <span class="bw-coin-n figure-big">{whole()}</span>
    </span>
  );
}

export function TopStrip(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const s = () => game.state()!;
  const season = () => seasonOf(model, s().step);
  const year = () => shownYear(model, s().step);
  /** Who backs you now: the one count the election card, the laws sheet and the council panel use (playtest 10 must-fix 6). */
  const backers = () => backersNow(model, s()).backers.length;
  const sc = createMemo(() => { try { return scores(model, s()); } catch (e) { console.warn(e); return null; } });
  const head = createMemo<Headway | null>(() => { try { return headway(model, s()); } catch (e) { console.warn(e); return null; } });
  /** Coins in and out over one step: the last step run, or (before the first) a step tried on a copy. */
  const step = createMemo<CoinsReport | null>(() => {
    const last = game.clock.last();
    if (last) return last.coins;
    const st = game.state();
    if (!st || st.phase !== "play") return null;
    try { return tick(model, st).report.coins; } catch { return null; }
  });
  /** A year's income after costs, before the purse cuts it: coins not paid for a full purse still count here. */
  const perYear = () => {
    const c = step();
    return c ? (c.income + (c.lost ?? 0) - c.running - c.charges) * stepsOf(model, 1) : null;
  };
  /**
   * A whole closed year's income, in parts. The engine folds a closed year's records together, so
   * parts are read a year at a time. The first year also holds the opening coins (B1 `opening`),
   * which are not income, so it is never read.
   */
  const yearParts = (year: number): IncomePart[] => {
    if (year <= model.game.first_year) return [];
    const from = stepOfYear(model, year), to = stepOfYear(model, year + 1) - 1;
    return incomeParts(why(model, s(), { measure: "coins", fromStep: from, toStep: to }), 1, INCOME_RULES);
  };
  /** True when the purse cut a year's coins (its parts are then not the whole income). */
  const purseCut = (year: number): boolean => {
    const log = game.clock.coinLog();
    for (let k = stepOfYear(model, year); k < stepOfYear(model, year + 1); k++) if ((log[k]?.lost ?? 0) > 0 || !log[k]) return true;
    return false;
  };
  /** The last year closed. */
  const closed = () => yearOfStep(model, s().step) - 1;
  /** What moved the income most from the year before to the last closed year, when the purse cut neither. */
  const incomeMoved = createMemo(() => {
    const y = closed();
    if (y - 1 <= model.game.first_year || purseCut(y) || purseCut(y - 1)) return null;
    return incomeChange(yearParts(y), yearParts(y - 1));
  });
  const f1c = (n: number) => formatNum(Math.round(Math.abs(n) * 10) / 10, { maximumFractionDigits: 1 });
  const movedWords = () => {
    const m = incomeMoved();
    if (!m) return "";
    return t(`boardclock.income.why.${m.part.kind}.${m.change > 0 ? "up" : "down"}`, { n: f1c(m.change), project: m.part.project ? projectName(model, m.part.project) : "" });
  };
  /** Every part of a year's income, for the tip: what comes in, what goes out. */
  const partsWords = createMemo(() => {
    const parts = yearParts(closed());
    if (!parts.length) return "";
    const ins: string[] = [], outs: string[] = [];
    const run = parts.filter((p) => p.kind === "running");
    for (const p of parts) {
      if (p.kind === "running") continue;
      const words = t(`boardclock.income.part.${p.kind}`, { n: f1c(p.perYear), project: p.project ? projectName(model, p.project) : "" });
      (p.perYear >= 0 ? ins : outs).push(words);
    }
    if (run.length) outs.push(tn("boardclock.income.part.running", run.length, { n: f1c(run.reduce((a, p) => a + p.perYear, 0)), count: run.length }));
    return [ins.length ? t("boardclock.income.in", { list: listOf(ins) }) : "", outs.length ? t("boardclock.income.out", { list: listOf(outs) }) : ""].filter(Boolean).join(" ");
  });
  const purse = () => ruleParamOf(model, "B1", "purse_max", 0);
  const buildOpen = () => game.clock.shown().includes("build");
  const pointed = createMemo(() => {
    const p = game.preview();
    return buildOpen() && p?.allowed ? p : null;
  });
  const note = createMemo<CoinNote>(() => coinNote({
    coins: s().coins, purse: purse(), perYear: perYear(), buildOpen: buildOpen(),
    preview: pointed() ? { allowed: true, coinsAfter: pointed()!.coinsAfter } : null,
  }));
  /** Left for 2050 if the project pointed at were built now. */
  const ifBuilt = createMemo(() => { const p = pointed(); return p ? headlineIf(model, s(), p.action) : null; });
  const f1 = (n: number) => formatNum(tenths(n), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const f0 = (n: number) => formatNum(n, { maximumFractionDigits: 0 });
  // the headline flashes when it moves, so a change of a tenth is seen
  const [moved, setMoved] = createSignal<"up" | "down" | null>(null);
  let shownTenths: number | null = null;
  let flash = 0;
  createEffect(() => {
    const h = head();
    if (!h) return;
    const now = tenths(h.now);
    if (shownTenths !== null && now !== shownTenths) {
      setMoved(now > shownTenths ? "up" : "down");
      clearTimeout(flash);
      flash = window.setTimeout(() => setMoved(null), 1600);
    }
    shownTenths = now;
  });
  onCleanup(() => clearTimeout(flash));
  return (
    <header class="bw-strip">
      <a class="bw-home" href="#/" title={t("boardui.home")} aria-label={t("boardui.home")}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M3 9.5 10 3l7 6.5M5 8v9h4v-5h2v5h4V8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="miter" />
        </svg>
      </a>
      <div class="bw-year" aria-live="off">
        <span class="t-year" data-testid="bw-year">{year()}</span>
        <span class="bw-yearnote">
          <b>{capFirst(t(`boardui.season.${season()}`))}</b>
          <span>{t("boardui.strip.left", { n: Math.max(0, model.game.end_year - year()) })}</span>
        </span>
      </div>
      <Tooltip heading={t("boardclock.purse.tipTitle")} content={[purse() > 0 ? t("boardclock.purse.tip", { n: purse() }) : t("boardui.strip.coinsNote"), partsWords()].filter(Boolean).join(" ")}>
        <div class="bw-coins" classList={{ soon: note().kind === "soon", full: note().kind === "full" }} tabindex="0" data-testid="bw-coins">
          <CoinRing coins={s().coins} />
          <span class="bw-coins-word">
            <span class="bw-coins-line">
              <Show when={purse() > 0} fallback={<b>{tn("boardui.strip.coins", wholeCoins(s().coins))}</b>}>
                <b data-testid="bw-purse">{t("boardclock.purse.count", { n: wholeCoins(s().coins), max: purse() })}</b>
              </Show>
            </span>
            <span class={`small bw-coins-note bw-coins-${note().kind}`} data-testid="bw-coins-note">
              <Switch>
                <Match when={note().kind === "after"}>{t("boardui.strip.coinsAfter", { n: (note() as { n: number }).n })}</Match>
                <Match when={note().kind === "full"}>{t("boardclock.purse.full")}</Match>
                <Match when={note().kind === "soon"}>{t("boardclock.purse.soon")}</Match>
                <Match when={note().kind === "income"}>{t("boardui.strip.income", { n: incomeWords(perYear()!) })}</Match>
                <Match when={true}>{t("boardui.strip.coinsNote")}</Match>
              </Switch>
            </span>
            <Show when={(note().kind === "income" || note().kind === "soon") && movedWords()}>
              <span class="small bw-coins-why" classList={{ down: (incomeMoved()?.change ?? 0) < 0 }} data-testid="bw-coins-why">{movedWords()}</span>
            </Show>
          </span>
        </div>
      </Tooltip>
      <Show when={sc() && head()}>
        <div class="bw-scores">
          <Tooltip heading={t("boardui.strip.left2050")} content={t("boardclock.head.tip", { now: f1(head()!.now), start: f1(head()!.start) })}>
            <span class="bw-score bw-score-main bw-head" classList={{ up: moved() === "up", down: moved() === "down" }} tabindex="0" data-testid="bw-score-left">
              <span class="bw-score-n figure-big" data-testid="bw-headline">{f1(head()!.now)}</span>
              <span class="bw-score-word">
                <b>{t("boardui.strip.left2050")}</b>
                <Show when={ifBuilt() === null} fallback={
                  <span class="bw-head-note bw-head-if">{tenths(ifBuilt()! - head()!.now) === 0
                    ? t("boardclock.head.ifBuiltTiny", { n: f1(ifBuilt()!) })
                    : t("boardclock.head.ifBuilt", { n: f1(ifBuilt()!), change: signed(ifBuilt()! - head()!.now) })}</span>
                }>
                  <span class={`bw-head-note bw-head-${direction(head()!.since)}`} data-testid="bw-head-since">
                    {t(`boardclock.head.${direction(head()!.since)}`, { n: f1(Math.abs(head()!.since)), start: f1(head()!.start) })}
                  </span>
                  <Show when={tenths(head()!.building) > 0 && head()!.buildingBy !== null}>
                    <span class="bw-head-note bw-head-building" data-testid="bw-head-building">{head()!.buildingBy! > model.game.end_year
                      ? t("boardclock.head.buildingAfter", { n: f1(head()!.building), year: model.game.end_year })
                      : t("boardclock.head.building", { n: f1(head()!.building), year: head()!.buildingBy! })}</span>
                  </Show>
                </Show>
              </span>
            </span>
          </Tooltip>
          <Tooltip heading={t("boardui.strip.life")} content={t("boardui.strip.lifeTip")}>
            <span class="bw-score" tabindex="0">
              <span class="bw-score-n figure-big">{f0(sc()!.life)}</span>
              <span class="bw-score-word"><b>{t("boardui.strip.life")}</b><span class="small">{t("boardui.strip.outOf100")}</span></span>
            </span>
          </Tooltip>
        </div>
      </Show>
      <Tooltip heading={t("boardui.strip.backersTip")} content={t("boardui.targets.why", { at: formatNum(p4(model).backsAt) })}>
        <button type="button" class="bw-backers" onClick={() => game.setColourBy("backing")} data-testid="bw-backers">
          <span class="figure-big">{backers()}</span>
          <span class="bw-backers-word">{t("boardui.strip.backers", { of: model.game.councils.length })}</span>
        </button>
      </Tooltip>
      <LangToggle class="bw-lang" />
    </header>
  );
}

/** A change with its sign, at one decimal. */
function signed(n: number): string {
  const v = tenths(n);
  return (v > 0 ? "+" : v < 0 ? "\u2212" : "") + formatNum(Math.abs(v), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
