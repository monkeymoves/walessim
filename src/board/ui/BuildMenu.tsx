/**
 * The build menu (v2-board.md sections 5 and 11.4): opens from a council, projects grouped by
 * branch and tier, locked ones shown with what they need. Hover or focus previews on the map (the
 * links its effect travels light up) and on the council's bars. Each project is a ticket on the
 * stock of its branch, so a glance says which branch it feeds.
 */
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { formatNum, Pair, t, tn } from "../../i18n";
import { CloseButton, Icon, StampButton } from "../../ui/parts";
import type { Action, ActionOption, BoardModel, ProjectDef } from "../engine/api";
import { blockerWords } from "./blockers";
import { options } from "./engine";
import { useGame } from "./game";
import { iconFor } from "./icons";
import { PreviewLines } from "./PreviewLines";
import { councilName, tx, whenWords } from "./words";

const key = (a: Action) => JSON.stringify(a);
const BRANCH_STOCK = ["buff", "green", "pink", "blue"];

/** Where a project would stand, in words: the council, or the rail link and the other end. */
function siteWords(model: BoardModel, o: ActionOption, here: string): string {
  const a = o.action;
  if ((a.kind === "build" || a.kind === "upgrade") && a.site.link) {
    const l = model.links.find((x) => x.id === a.site.link);
    if (l) return t("boardui.build.onLink", { line: tx(l.name ?? ""), other: councilName(model, l.from === here ? l.to : l.from) });
  }
  return "";
}

export function BuildMenu(props: { code: string }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const [open, setOpen] = createSignal<string | null>(null);
  const opts = createMemo(() => {
    const s = game.state();
    if (!s) return [];
    try { return options(model, s, props.code).filter((o) => o.action.kind === "build" || o.action.kind === "upgrade"); } catch (e) { console.warn(e); return []; }
  });
  const byBranch = (branch: string, tier: number) => opts().filter((o) => o.branch === branch && o.tier === tier);
  const def = (o: ActionOption): ProjectDef | undefined => model.projects.find((p) => p.id === o.project);
  const free = (o: ActionOption) => o.action.kind === "build" && game.state()?.freeProject === o.project;

  const build = (o: ActionOption) => {
    if (game.act(o.action)) { setOpen(null); game.setHover(null); }
  };

  return (
    <aside class="bw-build sheet-held" aria-labelledby="bw-build-title" data-testid="bw-build" onPointerLeave={() => !open() && game.setHover(null)}>
      <header class="bw-build-head">
        <h2 class="t-2" id="bw-build-title">{t("boardui.build.title", { name: councilName(model, props.code) })}</h2>
        <CloseButton label={t("boardui.close")} onClick={() => { game.setSheet(null); game.setHover(null); }} />
      </header>
      <p class="small bw-build-coins">{tn("boardui.build.coins", Math.floor((game.state()?.coins ?? 0) + 1e-6))} {t("boardui.build.anyTime")}</p>
      <div class="bw-build-scroll">
        <For each={model.branches}>
          {(b, bi) => (
            <section class="bw-branch" style={{ "--stock": `var(--ticket-${BRANCH_STOCK[bi() % 4]})` }}>
              <Pair text={b.name} as="h3" class="t-3 bw-branch-name" />
              <p class="small bw-branch-note">{tx(b.note)}</p>
              <For each={[1, 2, 3]}>
                {(tier) => (
                  <Show when={byBranch(b.id, tier).length}>
                    <ol class="bw-tickets" aria-label={t("boardui.build.tier", { n: tier })}>
                      <For each={byBranch(b.id, tier)}>
                        {(o) => {
                          const d = def(o);
                          const id = key(o.action);
                          return (
                            <li class="bw-ticket" classList={{ locked: !o.allowed, open: open() === id, keystone: !!d?.keystone }}>
                              <button
                                type="button"
                                class="bw-ticket-face"
                                aria-expanded={open() === id}
                                onPointerEnter={() => !open() && game.setHover(o.action)}
                                onFocus={() => !open() && game.setHover(o.action)}
                                onClick={() => { const next = open() === id ? null : id; setOpen(next); game.setHover(next ? o.action : null); }}
                                data-testid={`bw-opt-${o.project}`}
                              >
                                <span class="bw-ticket-stub"><Icon name={iconFor(model, o.project ?? "")} size={26} /><span class="furniture">{t("boardui.build.tierShort", { n: tier })}</span></span>
                                <span class="bw-ticket-body">
                                  <span class="bw-ticket-name">
                                    {o.action.kind === "upgrade" ? t("boardui.build.upgrade", { name: tx(d?.name) }) : tx(d?.name)}
                                    <Show when={d?.keystone}><span class="small bw-keystone">{t("boardui.build.keystone")}</span></Show>
                                    <Show when={d?.quick}><span class="small bw-keystone">{t("boardui.build.quick")}</span></Show>
                                  </span>
                                  <span class="small bw-ticket-site">{siteWords(model, o, props.code)}</span>
                                  <Show when={!o.allowed}>
                                    <span class="small bw-ticket-why">{o.blockers.map((x) => blockerWords(model, x)).join(" ")}</span>
                                  </Show>
                                </span>
                                <span class="bw-ticket-fare">
                                  <span class="furniture">{t("boardui.build.cost")}</span>
                                  <span class="bw-fare-n" classList={{ short: o.blockers.some((x) => x.kind === "coins") }}>{free(o) ? t("boardui.build.free") : o.cost}</span>
                                  <Show when={o.readyStep !== undefined}><span class="small">{t("boardui.build.works", { when: whenWords(model, o.readyStep! + 1) })}</span></Show>
                                </span>
                              </button>
                              <Show when={open() === id}>
                                <div class="bw-ticket-more">
                                  <p class="story-small">{tx(d?.what)}</p>
                                  <p class="small"><i>{t("boardui.build.example", { text: tx(d?.example) })}</i></p>
                                  <Show when={d?.catch}><p class="small bw-catch">{t("boardui.build.catch", { text: tx(d?.catch) })}</p></Show>
                                  <Show when={o.buildYears !== undefined}><p class="small">{t("boardui.build.takes", { n: formatNum(o.buildYears!, { maximumFractionDigits: 1 }) })}</p></Show>
                                  <Show when={d?.running}><p class="small">{t("boardui.build.running", { n: formatNum(d!.running!.coins_per_year, { maximumFractionDigits: 2 }) })}</p></Show>
                                  <PreviewLines />
                                  <Show when={o.allowed} fallback={<p class="small bw-ticket-why">{o.blockers.map((x) => blockerWords(model, x)).join(" ")}</p>}>
                                    <StampButton onClick={() => build(o)} data-testid="bw-build-it">
                                      {free(o) ? t("boardui.build.goFree") : tn("boardui.build.go", o.cost)}
                                    </StampButton>
                                  </Show>
                                </div>
                              </Show>
                            </li>
                          );
                        }}
                      </For>
                    </ol>
                  </Show>
                )}
              </For>
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
