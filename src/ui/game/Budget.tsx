// The coins (plain-wales 3.3): a row of round coins in a well, in three piles that are always
// shown: on cards, in the emergency fund, not used yet. Nothing goes in the fund until the player
// puts it there with "Save 1 coin for a crisis". Whenever anything changed it (a carried coin, a
// loan), one list says how it adds up, even when it comes back to 8 (cold playtest 5).
import { createSignal, For, Show, type JSX } from "solid-js";
import { t, tn } from "../../i18n";
import { useGame } from "./context";

type Pile = "cards" | "fund" | "unused";

export function BudgetRow(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const b = () => game.budget();
  const cap = () => game.cardCap();
  const [what, setWhat] = createSignal(false);
  const base = () => game.model.game.budget ?? 8;
  const coins = (): Pile[] => {
    const out: Pile[] = [];
    for (let i = 0; i < Math.max(0, b().total); i++) out.push(i < b().spent ? "cards" : i < b().spent + b().fund ? "fund" : "unused");
    return out;
  };
  /** Why the budget is not 8, item by item, shown without a click (cold playtest: "Why 6?"). */
  const lines = () => {
    const v = s().budget;
    const out: [string, number][] = [];
    const add = (k: string, n: number) => { if (n) out.push([k, n]); };
    add("game.plan.budget_interest", v.debtInterest);
    add("game.plan.budget_return", v.returnPenalty);
    add("game.plan.budget_curveball", v.curveball);
    add("game.plan.budget_carried_hit", v.carriedHit);
    add("game.plan.budget_carried", v.carried);
    add("game.plan.budget_upkeep", v.upkeep);
    add("game.plan.budget_peek", v.peek);
    if (game.draft.standing) add("game.plan.budget_borrowed", game.names.standingTicket(game.draft.standing)?.budget ?? 0);
    add("game.plan.budget_skipped", s().upkeepDue.filter((u) => game.draft.skipUpkeep.includes(u.id)).reduce((a, u) => a + u.pips, 0));
    return out;
  };
  const first = () => s().term === 0 && s().options.firstGame;
  const last = () => s().term >= game.model.game.years.length - 1;
  const canSave = () => b().unused > 0;
  const saveLine = () => t(first() ? "play.budget.save_line_first" : last() ? "play.budget.save_line_last" : "play.budget.save_line", { n: b().fund });
  return (
    <div class="yf-budget" data-testid="budget">
      <div class="yf-budget-head">
        {/* the card cap beside the coins from turn 1 (cold playtest 6: spare coins felt wasted) */}
        <p class="yf-cap" data-testid="coin-cap">
          <b>{tn("play3.coins", Math.max(0, b().total))}</b>{" "}
          {cap().played === 0 ? tn("play2.budget.cap", cap().limit) : cap().left > 0 ? tn("play2.budget.cap_left", cap().left) : t("play2.budget.cap_full", { n: cap().limit })}
        </p>
      </div>
      <div class="yf-coins well" role="img" aria-label={t("play.budget.aria", { total: b().total, spent: b().spent, fund: b().fund, unused: b().unused })}>
        <For each={coins()}>{(p) => <i class={`yf-coin ${p}`} />}</For>
        <For each={s().debts}>{() => <i class="yf-coin debt" title={t("game.ledger.debts")} />}</For>
      </div>
      <dl class="yf-piles" aria-live="polite">
        <div class="yf-pile cards"><dt>{t("play.budget.on_cards")}</dt><dd class="data" data-testid="pile-cards">{b().spent}</dd></div>
        <div class="yf-pile fund"><dt>{t("play.budget.fund")}</dt><dd class="data" data-testid="pile-fund">{b().fund}</dd></div>
        <div class="yf-pile unused"><dt>{t("play.budget.unused")}</dt><dd class="data" data-testid="pile-unused">{Math.max(0, b().unused)}</dd></div>
      </dl>
      <Show when={lines().length}>
        {/* one run of words rather than a list, so the hand keeps its room */}
        <p class="yf-budget-why small">
          <span class="strong">{b().total !== base() ? t("play.budget.why_not", { n: b().total }) : t("play.budget.adds_up", { n: b().total })}</span>{" "}
          <For each={lines()}>{([k, n], i) => <span class="yf-why-item">{t(k)} <span class="data">{n > 0 ? `+${n}` : n}</span>{i() < lines().length - 1 ? "; " : "."}</span>}</For>
        </p>
      </Show>
      <div class="yf-save">
        {/* saving and "What is a coin?" share a row, so the cap line has the head to itself */}
        <div class="yf-save-btns">
          <Show when={b().left > 0}>
            <button type="button" class="yf-linkbtn strong" data-testid="save-coin" disabled={!canSave()} onClick={() => game.setSaved(b().fund + 1)}>{t("play.budget.save")}</button>
            <Show when={b().fund > 0}>
              <button type="button" class="yf-linkbtn" data-testid="unsave-coin" onClick={() => game.setSaved(b().fund - 1)}>{t("play.budget.unsave")}</button>
            </Show>
          </Show>
          <button type="button" class="yf-why-link small" aria-expanded={what()} onClick={() => setWhat(!what())}>{t("play.budget.what_coin")}</button>
        </div>
        <Show when={what()}>
          <p class="small yf-coin-is">{t("play.budget.coin_is")} {t("play.budget.coin_more")}</p>
        </Show>
        <Show when={b().left > 0}>
          <Show when={b().fund > 0}>
            <p class="small">{saveLine()}</p>
          </Show>
          <Show when={b().fund > game.usefulSave()}>
            <p class="small yf-warn-line" role="status">{t("play.budget.save_lost")}</p>
          </Show>
        </Show>
      </div>
    </div>
  );
}
