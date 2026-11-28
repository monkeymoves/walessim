/**
 * The next election, council by council (the games critic's one change, playtest 10): held now
 * you would win or lose, which councils to bring round to win (or win well), and which to keep.
 * Each council is a button that opens it on the map. Read from `electionTargets` (pure, tested).
 */
import { For, Show, type JSX } from "solid-js";
import { formatNum, t } from "./lang";
import type { ElectionTargets, TargetCouncil } from "./electionTargets";
import { p4 } from "./electionTargets";
import { useGame } from "./game";
import { backingShown, councilName, num } from "./words";

const pct = (share: number): string => formatNum(share * 100, { maximumFractionDigits: 0 });

/**
 * A gap to the line at one decimal, so it adds up with the backing shown beside it (`backingShown`
 * cuts down): short of the line rounds up and is never "0"; above the line cuts down.
 */
export const gapShown = (gap: number, keep = false): number =>
  keep ? Math.floor(gap * 10 + 1e-6) / 10 : Math.max(0.1, Math.ceil(gap * 10 - 1e-6) / 10);

export function TargetsCard(props: { targets: ElectionTargets; onLook?: () => void }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const tg = () => props.targets;
  const look = (code: string) => { props.onLook?.(); game.setSelected(code); };
  const Row = (p: { c: TargetCouncil; keep?: boolean }) => (
    <li>
      <button type="button" class="bw-target-look" onClick={() => look(p.c.code)} data-testid="bw-target">
        {t(p.keep ? (gapShown(p.c.gap, true) > 0 ? "boardui.targets.keep" : "boardui.targets.keepOn") : "boardui.targets.need", {
          council: councilName(model, p.c.code), n: num(backingShown(p.c.backing)), gap: num(gapShown(p.c.gap, p.keep)), people: pct(p.c.share),
        })}
      </button>
    </li>
  );
  const hold = () => tg().hold.slice(0, 2);
  /** Councils for a strong win beyond those named to win, while the win itself is close (two councils or fewer). */
  const wellMore = () => ((tg().win?.length ?? 3) <= 2 ? (tg().well ?? []).filter((c) => !tg().win?.some((w) => w.code === c.code)).slice(0, 3) : []);
  return (
    <section class="bw-targets" aria-labelledby="bw-targets-title" data-testid="bw-targets">
      <h4 class="label" id="bw-targets-title">{t("boardui.targets.title", { year: tg().year })}</h4>
      <p class="small">{t(`boardui.targets.now.${tg().result}`, { people: pct(tg().peopleShare) })}</p>
      <Show when={tg().win === null}><p class="small">{t("boardui.targets.none")}</p></Show>
      <Show when={tg().win?.length}>
        <p class="small bw-targets-head">{t("boardui.targets.winHead")}</p>
        <ul class="bw-targets-list"><For each={tg().win!}>{(c) => <Row c={c} />}</For></ul>
      </Show>
      <Show when={hold().length}>
        <p class="small bw-targets-head">{t(`boardui.targets.holdHead.${tg().result === "strong_win" ? "strong_win" : "win"}`)}</p>
        <ul class="bw-targets-list"><For each={hold()}>{(c) => <Row c={c} keep />}</For></ul>
      </Show>
      <Show when={wellMore().length}>
        <p class="small bw-targets-head">{t(tg().win?.length ? "boardui.targets.wellTooHead" : "boardui.targets.wellHead")}</p>
        <ul class="bw-targets-list"><For each={wellMore()}>{(c) => <Row c={c} />}</For></ul>
      </Show>
      <p class="small bw-honest">{t("boardui.targets.why", { at: num(p4(model).backsAt) })}</p>
    </section>
  );
}
