/**
 * The tree (v2-board.md section 5.3): the four branches as one sheet, three tiers each, what is
 * standing where, and how far each tier is from opening. The keystone is the top of each column.
 */
import { For, Show, type JSX } from "solid-js";
import { formatNum, Pair, t } from "../../i18n";
import { CloseButton, Icon } from "../../ui/parts";
import type { BranchDef, Tier } from "../engine/api";
import { conditionWords } from "./blockers";
import { useGame } from "./game";
import { iconFor } from "./icons";
import { councilName, listOf, tx } from "./words";

export function TreeSheet(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const s = () => game.state()!;
  const working = (branch: string, tier: Tier) =>
    s().projects.filter((p) => p.status === "working" && model.projects.some((d) => d.id === p.project && d.branch === branch && d.tier === tier)).length;
  const gate = (b: BranchDef, tier: Tier) => {
    const opens = b.tiers[tier - 1]?.opens ?? [];
    if (!opens.length) return null;
    const c = opens[0]!;
    const need = c.kind === "project" ? c.at_least ?? 1 : 1;
    const have = working(b.id, (tier - 1) as Tier);
    return { open: have >= need, have, need, words: conditionWords(model, c) };
  };
  const standing = (project: string) => s().projects.filter((p) => p.project === project);
  return (
    <div class="bw-tree sheet-held" role="dialog" aria-labelledby="bw-tree-title" data-testid="bw-tree">
      <header class="bw-tree-head">
        <h2 class="t-1" id="bw-tree-title">{t("boardui.tree.title")}</h2>
        <p class="small">{t("boardui.tree.note")}</p>
        <CloseButton label={t("boardui.close")} onClick={() => game.setSheet(null)} />
      </header>
      <div class="bw-tree-cols">
        <For each={model.branches}>
          {(b, bi) => (
            <section class="bw-tree-col" style={{ "--stock": `var(--ticket-${["buff", "green", "pink", "blue"][bi() % 4]})` }}>
              <Pair text={b.name} as="h3" class="t-3" />
              <p class="small">{tx(b.note)}</p>
              <For each={[3, 2, 1] as Tier[]}>
                {(tier) => {
                  const g = () => gate(b, tier);
                  return (
                    <div class="bw-tree-tier" classList={{ shut: !!g() && !g()!.open }}>
                      <p class="small bw-tree-gate">
                        <b>{tier === 3 ? t("boardui.tree.keystone") : t("boardui.tree.tier", { n: tier })}</b>{" "}
                        <Show when={g()} fallback={t("boardui.tree.alwaysOpen")}>
                          {g()!.open ? t("boardui.tree.isOpen") : t("boardui.tree.shut", { words: g()!.words, have: g()!.have, need: g()!.need })}
                        </Show>
                      </p>
                      <ul>
                        <For each={model.projects.filter((p) => p.branch === b.id && p.tier === tier)}>
                          {(p) => (
                            <li class="bw-tree-node" classList={{ built: standing(p.id).length > 0 }}>
                              <Icon name={iconFor(model, p.id)} size={20} />
                              <span>
                                <span class="bw-tree-name">{tx(p.name)}</span>
                                <span class="small">
                                  {t("boardui.tree.cost", { n: p.cost, years: formatNum(p.build_years, { maximumFractionDigits: 1 }) })}
                                  <Show when={standing(p.id).length}>
                                    {" "}{t("boardui.tree.standing", { list: listOf(standing(p.id).map((x) => councilName(model, x.site.council ?? model.links.find((l) => l.id === x.site.link)?.from))) })}
                                  </Show>
                                </span>
                              </span>
                            </li>
                          )}
                        </For>
                      </ul>
                    </div>
                  );
                }}
              </For>
            </section>
          )}
        </For>
      </div>
    </div>
  );
}
