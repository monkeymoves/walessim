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
 */
import { createEffect, createMemo, createSignal, Match, onCleanup, Show, Switch, type JSX } from "solid-js";
import { formatNum, t, tn } from "./lang";
import { LangToggle, Tooltip } from "../../ui/parts";
import type { CoinsReport } from "../engine/api";
import { seasonOf, stepsOf, tick, yearOfStep } from "../engine/api";
import { scores } from "./engine";
import { coinNote, wholeCoins, type CoinNote } from "./clock/coins";
import { direction, headlineIf, headway, tenths, type Headway } from "./clock/headway";
import { useGame } from "./game";
import { backsAtOf } from "./mapLinks";
import { ruleParamOf } from "./rules";
import { capFirst } from "./words";

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
  const year = () => yearOfStep(model, s().step) + (season() === "spring" ? 1 : 0);
  const backers = () => Object.values(s().councils).filter((c) => c.backing >= backsAtOf(model)).length;
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
  const perYear = () => {
    const c = step();
    return c ? (c.income - c.running - c.charges) * stepsOf(model, 1) : null;
  };
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
      <Tooltip heading={t("boardclock.purse.tipTitle")} content={purse() > 0 ? t("boardclock.purse.tip", { n: purse() }) : t("boardui.strip.coinsNote")}>
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
                <Match when={note().kind === "income"}>{t("boardui.strip.income", { n: (perYear()! >= 0 ? "+" : "") + formatNum(perYear()!, { maximumFractionDigits: 1 }) })}</Match>
                <Match when={true}>{t("boardui.strip.coinsNote")}</Match>
              </Switch>
            </span>
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
                  <span class="bw-head-note bw-head-if">{t("boardclock.head.ifBuilt", { n: f1(ifBuilt()!), change: signed(ifBuilt()! - head()!.now) })}</span>
                }>
                  <span class={`bw-head-note bw-head-${direction(head()!.since)}`} data-testid="bw-head-since">
                    {t(`boardclock.head.${direction(head()!.since)}`, { n: f1(Math.abs(head()!.since)), start: f1(head()!.start) })}
                  </span>
                  <Show when={tenths(head()!.building) > 0 && head()!.buildingBy !== null}>
                    <span class="bw-head-note bw-head-building" data-testid="bw-head-building">{t("boardclock.head.building", { n: f1(head()!.building), year: head()!.buildingBy! })}</span>
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
      <button type="button" class="bw-backers" onClick={() => game.setColourBy("backing")} title={t("boardui.strip.backersTip")}>
        <span class="figure-big">{backers()}</span>
        <span class="bw-backers-word">{t("boardui.strip.backers", { of: model.game.councils.length })}</span>
      </button>
      <LangToggle class="bw-lang" />
    </header>
  );
}

/** A change with its sign, at one decimal. */
function signed(n: number): string {
  const v = tenths(n);
  return (v > 0 ? "+" : v < 0 ? "\u2212" : "") + formatNum(Math.abs(v), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
