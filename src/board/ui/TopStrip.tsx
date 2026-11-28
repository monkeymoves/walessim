/**
 * The top strip (16.2.6): the date as the one loud thing, coins with a ring that fills towards the
 * next one, income a year, the two scores as they stand, and how many councils back you. The map
 * below is the board.
 */
import { createMemo, Show, type JSX } from "solid-js";
import { formatNum, t, tn } from "../../i18n";
import { LangToggle, Tooltip } from "../../ui/parts";
import type { CoinsReport } from "../engine/api";
import { seasonOf, stepsOf, tick, yearOfStep } from "../engine/api";
import { scores } from "./engine";
import { useGame } from "./game";
import { backsAtOf } from "./mapLinks";
import { ruleParamOf } from "./rules";
import { capFirst } from "./words";

/** A coin with a ring round it that fills towards the next whole coin. */
function CoinRing(props: { coins: number }): JSX.Element {
  const whole = () => Math.floor(props.coins + 1e-6);
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
  const coinsAfterPreview = () => game.preview()?.coinsAfter;
  const f1 = (n: number) => formatNum(n, { maximumFractionDigits: 1 });
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
      <div class="bw-coins">
        <CoinRing coins={s().coins} />
        <span class="bw-coins-word">
          <b>{tn("boardui.strip.coins", Math.floor(s().coins + 1e-6))}</b>
          <Show when={coinsAfterPreview() !== undefined} fallback={
            <span class="small bw-coins-note">
              <Show when={purse() > 0 && s().coins >= purse() - 1e-6} fallback={
                <Show when={perYear() !== null} fallback={t("boardui.strip.coinsNote")}>{t("boardui.strip.income", { n: (perYear()! >= 0 ? "+" : "") + f1(perYear()!) })}</Show>
              }>{t("boardui.strip.purseFull", { n: purse() })}</Show>
            </span>
          }>
            <span class="small bw-coins-after">{t("boardui.strip.coinsAfter", { n: Math.max(0, Math.floor(coinsAfterPreview()!)) })}</span>
          </Show>
        </span>
      </div>
      <Show when={sc()}>
        <div class="bw-scores">
          <Tooltip heading={t("boardui.strip.left2050")} content={t("boardui.strip.leftTip", { now: f1(sc()!.left), start: f1(sc()!.start) })}>
            <span class="bw-score bw-score-main" tabindex="0" data-testid="bw-score-left">
              <span class="bw-score-n figure-big">{formatNum(sc()!.left, { maximumFractionDigits: 0 })}</span>
              <span class="bw-score-word"><b>{t("boardui.strip.left2050")}</b><span class="small">{t("boardui.strip.from", { n: formatNum(sc()!.start, { maximumFractionDigits: 0 }) })}</span></span>
            </span>
          </Tooltip>
          <Tooltip heading={t("boardui.strip.life")} content={t("boardui.strip.lifeTip")}>
            <span class="bw-score" tabindex="0">
              <span class="bw-score-n figure-big">{formatNum(sc()!.life, { maximumFractionDigits: 0 })}</span>
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
