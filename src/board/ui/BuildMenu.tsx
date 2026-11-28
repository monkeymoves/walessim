/**
 * The build menu (v2-board.md sections 5 and 11.4): opens from a council, projects grouped by
 * branch and tier, locked ones shown with what they need. Hover or focus previews on the map (the
 * links its effect travels light up) and on the council's bars. Each project is a ticket on the
 * stock of its branch, so a glance says which branch it feeds.
 *
 * Playtest 9: each branch lists its own builds by step, then "After the keystone" (the legacy
 * project, which needs the keystone, so it never reads as one of the projects that open it), then
 * "Already here" (upgrades, apart from new builds). The road at the head of each branch names the
 * next gate exactly and says whether its keystone can be built in this council, and if not, why.
 */
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { lang, Pair, t, tn } from "./lang";
import { CloseButton } from "../../ui/parts";
import { keystoneLastStep, type Action, type ActionOption, type ProjectDef } from "../engine/api";
import { blockerWords } from "./blockers";
import { BranchRoad } from "./BranchRoad";
import { branchPath } from "./branchPath";
import { BuildTicket } from "./BuildTicket";
import { councilView, options } from "./engine";
import { useGame } from "./game";
import { councilName, tx, wholeCoins, whenWords } from "./words";

const key = (a: Action) => JSON.stringify(a);
const BRANCH_STOCK = ["buff", "green", "pink", "blue"];

export function BuildMenu(props: { code: string }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const [open, setOpen] = createSignal<string | null>(null);
  const opts = createMemo(() => {
    const s = game.state();
    if (!s) return [];
    try { return options(model, s, props.code).filter((o) => o.action.kind === "build" || o.action.kind === "upgrade"); } catch (e) { console.warn(e); return []; }
  });
  const def = (o: ActionOption): ProjectDef | undefined => model.projects.find((p) => p.id === o.project);
  const builds = (branch: string, tier: number) => opts().filter((o) => o.action.kind === "build" && o.branch === branch && o.tier === tier && !def(o)?.legacy_of);
  const legacy = (branch: string) => opts().filter((o) => o.action.kind === "build" && o.branch === branch && !!def(o)?.legacy_of);
  const upgrades = (branch: string) => opts().filter((o) => o.action.kind === "upgrade" && o.branch === branch && !o.blockers.some((b) => b.kind === "max_level"));
  const view = createMemo(() => {
    const s = game.state();
    try { return s ? councilView(model, s, props.code) : null; } catch { return null; }
  });
  /** Whether this branch's keystone can be built in this council, once its step is open. */
  const keystoneHere = (branch: string): string | undefined => {
    const o = builds(branch, 3).find((x) => def(x)?.keystone);
    if (!o) return undefined;
    const name = councilName(model, props.code);
    if (o.allowed) return t("boardui.path.here.ready", { council: name, when: whenWords(model, keystoneLastStep(model)), years: def(o)!.build_years });
    return t("boardui.path.here.not", { council: name, why: o.blockers.map((b) => blockerWords(model, b, game.state() ?? undefined)).join(" ") });
  };
  const build = (o: ActionOption) => {
    if (game.act(o.action)) { setOpen(null); game.setHover(null); }
  };
  const Tickets = (p: { list: ActionOption[]; label: string }) => (
    <ol class="bw-tickets" aria-label={p.label} onPointerLeave={() => !open() && game.setHover(null)}>
      <For each={p.list}>
        {(o) => {
          const id = key(o.action);
          const toggle = () => { const next = open() === id ? null : id; setOpen(next); game.setHover(next ? o.action : null); };
          return <BuildTicket o={o} def={def(o)} here={props.code} open={open() === id} onToggle={toggle} onBuild={() => build(o)} />;
        }}
      </For>
    </ol>
  );

  return (
    <aside class="bw-build sheet-held" aria-labelledby="bw-build-title" data-testid="bw-build" onPointerLeave={() => !open() && game.setHover(null)}>
      <header class="bw-build-head">
        <h2 class="t-2" id="bw-build-title">{t("boardui.build.title", { name: councilName(model, props.code) })}</h2>
        <CloseButton label={t("boardui.close")} onClick={() => { game.setSheet(null); game.setHover(null); }} />
      </header>
      <p class="small bw-build-coins">{tn("boardui.build.coins", wholeCoins(game.state()?.coins ?? 0))} {t("boardui.build.anyTime")}</p>
      <Show when={view()?.freshStart}><p class="small bw-fresh">{t("boardui.build.freshHead")}</p></Show>
      <div class="bw-build-scroll">
        <For each={model.branches}>
          {(b, bi) => (
            <section class="bw-branch" style={{ "--stock": `var(--ticket-${BRANCH_STOCK[bi() % 4]})` }}>
              <Pair single={lang() === "cy"} text={b.name} as="h3" class="t-3 bw-branch-name" />
              <p class="small bw-branch-note">{tx(b.note)}</p>
              <Show when={game.state()}>{(st) => <BranchRoad model={model} path={branchPath(model, st(), b)} state={st()} here={keystoneHere(b.id)} />}</Show>
              <For each={[1, 2, 3]}>
                {(tier) => <Show when={builds(b.id, tier).length}><Tickets list={builds(b.id, tier)} label={t(`boardui.tierHead.${tier}`)} /></Show>}
              </For>
              <Show when={legacy(b.id).length}>
                <h4 class="label bw-build-group">{t("boardui.build.afterKeystone")}</h4>
                <Tickets list={legacy(b.id)} label={t("boardui.build.afterKeystone")} />
              </Show>
              <Show when={upgrades(b.id).length}>
                <h4 class="label bw-build-group">{t("boardui.build.alreadyHere")}</h4>
                <p class="small bw-build-groupnote">{t("boardui.build.alreadyHereNote")}</p>
                <Tickets list={upgrades(b.id)} label={t("boardui.build.alreadyHere")} />
              </Show>
            </section>
          )}
        </For>
      </div>
      <Show when={game.error()}>
        <p class="warnstrip small" role="alert"><span>{game.error()}</span></p>
      </Show>
    </aside>
  );
}
