/**
 * The tree (v2-board.md section 5.3): the four branches as one sheet, each a climb from starter
 * projects to bigger ones to its keystone at the top. Each column leads with its keystone and how
 * far you are on the road to it (playtest 8, should-fix 6), then the projects by step, what is
 * standing where, and the legacy project the keystone opens, with its own reason when shut
 * (must-fix 12: it said "Not open yet." under a step marked open).
 */
import { For, Show, type JSX } from "solid-js";
import { lang, Pair, t } from "./lang";
import { CloseButton, Icon } from "../../ui/parts";
import type { ProjectDef, Tier } from "../engine/api";
import { conditionWords } from "./blockers";
import { BranchRoad } from "./BranchRoad";
import { branchPath } from "./branchPath";
import { useGame } from "./game";
import { iconFor } from "./icons";
import { councilName, listOf, num, tx } from "./words";

export function TreeSheet(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const s = () => game.state()!;
  const standing = (project: string) => s().projects.filter((p) => p.project === project);
  const Node = (p: { def: ProjectDef; shut?: string }) => (
    <li class="bw-tree-node" classList={{ built: standing(p.def.id).length > 0 }}>
      <Icon name={iconFor(model, p.def.id)} size={20} />
      <span>
        <span class="bw-tree-name">{tx(p.def.name)}</span>
        <span class="small">
          {p.def.build_years > 0 ? t("boardui.tree.cost", { n: num(p.def.cost), years: num(p.def.build_years) }) : t("boardui.tree.costNow", { n: num(p.def.cost) })}
          <Show when={standing(p.def.id).length}>
            {" "}{t("boardui.tree.standing", { list: listOf(standing(p.def.id).map((x) => councilName(model, x.site.council ?? model.links.find((l) => l.id === x.site.link)?.from))) })}
          </Show>
        </span>
        <Show when={p.shut}><span class="small bw-tree-shutwhy">{p.shut}</span></Show>
      </span>
    </li>
  );
  return (
    <div class="bw-tree sheet-held" role="dialog" aria-labelledby="bw-tree-title" data-testid="bw-tree">
      <header class="bw-tree-head">
        <h2 class="t-1" id="bw-tree-title">{t("boardui.tree.title")}</h2>
        <p class="small">{t("boardui.tree.note")}</p>
        <CloseButton label={t("boardui.close")} onClick={() => game.setSheet(null)} />
      </header>
      <div class="bw-tree-cols">
        <For each={model.branches}>
          {(b, bi) => {
            const path = () => branchPath(model, s(), b);
            const gateOf = (tier: Tier) => path().gates.find((g) => g.tier === tier);
            return (
              <section class="bw-tree-col" style={{ "--stock": `var(--ticket-${["buff", "green", "pink", "blue"][bi() % 4]})` }}>
                <Pair single={lang() === "cy"} text={b.name} as="h3" class="t-3" />
                <p class="small">{tx(b.note)}</p>
                <BranchRoad path={path()} year={s().year} />
                <For each={[3, 2, 1] as Tier[]}>
                  {(tier) => (
                    <div class="bw-tree-tier" classList={{ shut: !!gateOf(tier) && !gateOf(tier)!.open }}>
                      <p class="small bw-tree-gate">
                        <b>{t(`boardui.tierHead.${tier}`)}</b>{" "}
                        <Show when={gateOf(tier)} fallback={t("boardui.tree.alwaysOpen")}>
                          {(g) => (g().open ? t("boardui.tree.isOpen") : t("boardui.tree.shut", { have: g().working, need: g().need }))}
                        </Show>
                      </p>
                      <ul>
                        <For each={model.projects.filter((p) => p.branch === b.id && p.tier === tier && !p.legacy_of)}>{(p) => <Node def={p} />}</For>
                        <Show when={tier === 3 && path().legacy}>
                          {(l) => (
                            <Node def={l()} shut={path().keystoneAt === "working" ? undefined : l().needs.map((c) => conditionWords(model, c)).join(" ")} />
                          )}
                        </Show>
                      </ul>
                    </div>
                  )}
                </For>
              </section>
            );
          }}
        </For>
      </div>
    </div>
  );
}
