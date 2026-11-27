// Budget and contingency: a row of cut ink squares in a well; spent ones are punched out so
// the board shows through. What is left when the plan is sealed is held back for a shock.
import { createSignal, For, Show, type JSX } from "solid-js";
import { t, tn } from "../../i18n";
import { useGame } from "./context";

export function BudgetRow(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const b = () => game.budget();
  const [why, setWhy] = createSignal(false);
  const squares = () => Array.from({ length: Math.max(b().total, 0) }, (_, i) => i < b().spent);
  const lines = () => {
    const v = s().budget;
    const out: [string, number][] = [["game.plan.budget_base", v.base]];
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
  return (
    <div class="yf-budget">
      <div class="yf-budget-head">
        <span class="label">{t("game.plan.budget_label")}</span>
        <span class="data strong" aria-live="polite">{t("game.plan.budget", { left: Math.max(0, b().left), total: b().total })}</span>
      </div>
      <div class="yf-pips well" role="img" aria-label={t("game.plan.budget", { left: Math.max(0, b().left), total: b().total })}>
        <For each={squares()}>{(spent) => <i classList={{ spent }} />}</For>
        <For each={s().debts}>{() => <i class="debt" title={t("game.ledger.debts")} />}</For>
      </div>
      <div class="yf-budget-foot">
        <span class="small">
          {b().left > 0 ? tn("game.plan.contingency", b().left) : t("game.plan.contingency_none")}
        </span>
        <button type="button" class="yf-why-link small" aria-expanded={why()} onClick={() => setWhy(!why())}>
          {t("game.plan.budget_why", { n: b().total })}
        </button>
      </div>
      <Show when={why()}>
        <dl class="yf-budget-why small data">
          <For each={lines()}>
            {([k, n]) => (
              <>
                <dt>{t(k)}</dt>
                <dd>{n > 0 && k !== "game.plan.budget_base" ? `+${n}` : n}</dd>
              </>
            )}
          </For>
        </dl>
      </Show>
    </div>
  );
}
