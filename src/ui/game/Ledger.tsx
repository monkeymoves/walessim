// The ledger drawer: a card-index drawer over the rail. Standing tickets (borrow, put off the
// repairs), debts and their clearing, repairs, upkeep owed this term, promises and place grades.
import { For, Show, type JSX } from "solid-js";
import { t, tn, pick } from "../../i18n";
import { Ticket } from "../parts/Ticket";
import { CloseButton, StampButton, TabButton } from "../parts/Buttons";
import { useGame } from "./context";

export function LedgerDrawer(): JSX.Element {
  const { game } = useGame();
  const s = () => game.state()!;
  const planning = () => s().step === "plan";
  const clear = () => game.model.game.debt.clear_cost;
  const repairCost = () => game.names.standingTicket("defer-maintenance")?.clear_cost ?? 3;
  let panel!: HTMLElement;
  const close = () => {
    game.setLedgerOpen(false);
    document.getElementById("yf-ledger-open")?.focus();
  };
  return (
    <aside
      class="yf-drawer sheet-held"
      role="dialog"
      aria-modal="false"
      aria-labelledby="yf-ledger-title"
      ref={panel}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}
    >
      <div class="yf-drawer-head">
        <h2 id="yf-ledger-title" class="t-1">{t("game.ledger.title")}</h2>
        <CloseButton label={t("game.ledger.close")} onClick={close} />
      </div>
      <div class="yf-drawer-body">
        <section>
          <h3 class="t-3">{t("game.ledger.standing")}</h3>
          <p class="small">{t("game.ledger.standing_note")}</p>
          <For each={game.model.standing}>
            {(st) => {
              const on = () => game.draft.standing === st.id;
              const blockedDebt = () => st.id === "borrow-to-invest" && s().debts.length >= (st.max_tokens ?? game.model.game.debt.max_tokens);
              return (
                <div class="yf-standing">
                  <Ticket
                    card={{ id: st.id, name: st.name, cost: 0, delay: 0, scope: "standing", tags: ["borrow"] }}
                    fare={<span class="small strong">{t("game.ledger.gives", { n: st.budget })}</span>}
                    budget={game.budget().total}
                    selected={on()}
                    class="yf-ticket yf-ticket-standing"
                  />
                  <p class="story-small">{pick(st.description)} {pick(st.side_note)}</p>
                  <Show when={planning()}>
                    <p class="yf-standing-act">
                      <Show
                        when={on()}
                        fallback={
                          <TabButton
                            onClick={() => game.setStanding(st.id)}
                            why={blockedDebt() ? t("game.plan.problem.debt_max") : null}
                          >
                            {t("game.ledger.use")} ({t("game.ledger.gives", { n: st.budget })})
                          </TabButton>
                        }
                      >
                        <span class="label">{t("game.ledger.used")}</span>
                        <TabButton onClick={() => game.setStanding(null)}>{t("game.ledger.unuse")}</TabButton>
                      </Show>
                    </p>
                  </Show>
                </div>
              );
            }}
          </For>
        </section>

        <section>
          <h3 class="t-3">{t("game.ledger.debts")}</h3>
          <Show when={s().debts.length} fallback={<p class="small">{t("game.ledger.no_debts")}</p>}>
            <ul class="yf-ledger-list data">
              <For each={s().debts}>{(d) => <li>{t("game.ledger.debt_line", { year: d.year })}</li>}</For>
            </ul>
            <Show when={planning()}>
              <p class="yf-standing-act">
                <Show when={game.draft.repayDebt > 0}>
                  <span class="label">{tn("game.ledger.repaying", game.draft.repayDebt)}</span>
                  <TabButton onClick={() => game.setRepay(game.draft.repayDebt - 1)}>{t("game.ledger.repay_cancel")}</TabButton>
                </Show>
                <Show when={game.draft.repayDebt < s().debts.length}>
                  <TabButton
                    onClick={() => game.setRepay(game.draft.repayDebt + 1)}
                    why={game.budget().left < clear() ? t("game.plan.cannot_budget") : null}
                  >
                    {t("game.ledger.repay", { n: clear() })}
                  </TabButton>
                </Show>
              </p>
            </Show>
          </Show>
        </section>

        <section>
          <h3 class="t-3">{t("game.ledger.repairs")}</h3>
          <Show when={s().deferrals > 0} fallback={<p class="small">{t("game.ledger.no_repairs")}</p>}>
            <ul class="yf-ledger-list data">
              <For each={s().ledger.deferrals.filter((d) => !d.repaired)}>{(d) => <li>{d.year}</li>}</For>
            </ul>
            <Show when={planning()}>
              <p class="yf-standing-act">
                <Show
                  when={game.draft.repair}
                  fallback={
                    <TabButton onClick={() => game.setRepair(true)} why={game.budget().left < repairCost() ? t("game.plan.cannot_budget") : null}>
                      {t("game.ledger.repair", { n: repairCost() })}
                    </TabButton>
                  }
                >
                  <span class="label">{t("game.ledger.repairing")}</span>
                  <TabButton onClick={() => game.setRepair(false)}>{t("game.ledger.repair_cancel")}</TabButton>
                </Show>
              </p>
            </Show>
          </Show>
        </section>

        <section>
          <h3 class="t-3">{t("game.ledger.upkeep")}</h3>
          <Show when={s().upkeepDue.length} fallback={<p class="small">{t("game.ledger.no_upkeep")}</p>}>
            <ul class="yf-ledger-list">
              <For each={s().upkeepDue}>
                {(u) => {
                  const skipped = () => game.draft.skipUpkeep.includes(u.id);
                  return (
                    <li class="yf-upkeep">
                      <span class="data">{t("game.ledger.upkeep_line", { card: game.names.cardName(u.card), n: u.pips })}</span>
                      <span class="small">{pick(u.note)}</span>
                      <Show when={planning()}>
                        <TabButton aria-pressed={skipped()} onClick={() => game.toggleUpkeep(u.id)}>
                          {skipped() ? t("game.ledger.upkeep_pay") : t("game.ledger.upkeep_skip")}
                        </TabButton>
                      </Show>
                      <Show when={skipped()}><span class="small">{t("game.ledger.upkeep_skipped")}</span></Show>
                    </li>
                  );
                }}
              </For>
            </ul>
          </Show>
        </section>

        <Show when={s().ledger.pledges.length}>
          <section>
            <h3 class="t-3">{t("game.ledger.pledges")}</h3>
            <ul class="yf-ledger-list data">
              <For each={s().ledger.pledges}>
                {(p) => (
                  <li>{t("game.end.pledge_line", {
                    year: p.year, strand: game.names.strandName(p.strand),
                    state: p.kept == null ? "" : p.kept ? t("game.end.kept") : t("game.end.broken"),
                  })}</li>
                )}
              </For>
            </ul>
          </section>
        </Show>

        <Show when={s().ledger.grades.length}>
          <section>
            <h3 class="t-3">{t("game.ledger.grades")}</h3>
            <ul class="yf-ledger-list">
              <For each={s().ledger.grades}>
                {(g) => (
                  <li class="yf-grade-line">
                    <span>{t("game.end.grade_line", { place: game.names.placeName(g.place), year: g.year })}</span>
                    <span class="stampmark yf-grade-stamp">{t(`game.grade.${g.grade}`)}</span>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>
      </div>
      <Show when={planning()}>
        <div class="yf-drawer-foot">
          <StampButton onClick={close}>{t("game.ledger.close")}</StampButton>
        </div>
      </Show>
    </aside>
  );
}
