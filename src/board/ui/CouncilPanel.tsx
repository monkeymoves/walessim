/**
 * The council panel (v2-board.md sections 3 and 6): six bars with their 2026 marks, the real
 * figures behind the coloured measure, links in and out, who backs you and why, risks, projects
 * here, and Build here. A sheet on the right of the stage; the map zooms to the council.
 */
import { createMemo, For, Show, type JSX } from "solid-js";
import { formatNum, Pair, t } from "../../i18n";
import { CloseButton, SourceTag, StampButton, TabButton, ThreadButton } from "../../ui/parts";
import type { Source } from "../../model/schema";
import type { BoardModel, CouncilView, MeasureId, PreviewChange } from "../engine/api";
import { RISK_KINDS, stepsOf } from "../engine/api";
import { Bar } from "./Bar";
import * as eng from "./engine";
import { useGame } from "./game";
import { CouncilLinks } from "./CouncilLinks";
import { councilName, measureName, outOf10, projectName, signed, tx, whenWords } from "./words";

export const sourceOf = (model: BoardModel, id: string): Source | null => (model.sources.find((s) => s.id === id) as unknown as Source) ?? null;

export function CouncilPanel(props: { code: string }): JSX.Element {
  const game = useGame();
  const model = game.model;
  const view = createMemo<CouncilView | null>(() => {
    const s = game.state();
    try { return s ? eng.councilView(model, s, props.code) : null; } catch (e) { console.warn(e); return null; }
  });
  const ghost = (m: MeasureId) => (game.preview()?.changes ?? []).filter((c: PreviewChange) => c.council === props.code && c.quantity === m).reduce((a, c) => a + c.delta, 0);
  const estimate = () => (game.state()?.step ?? 0) > 0;
  const step = () => game.state()?.step ?? 0;
  /** Young adults now against 2026, in whole numbers of 100 (a game estimate). */
  const youngChange = () => {
    const was = game.state()?.history[0]?.councils[props.code]?.young;
    const v = view();
    return was && v ? Math.round(((v.people.young - was) / was) * 100) : 0;
  };
  const shownMeasure = (): MeasureId | null => {
    const by = game.colourBy();
    return by === "backing" || by === "behind" || by === "none" ? null : by;
  };
  const real = () => (view()?.real ?? []).filter((r) => (shownMeasure() ? r.measure === shownMeasure() : r.measure === view()?.asking[0]));

  return (
    <Show when={view()}>
      {(v) => (
        <aside class="bw-council sheet" aria-labelledby="bw-council-name" data-testid="bw-council">
          <header class="bw-council-head">
            <Pair text={v().name} as="h2" class="t-1" id="bw-council-name" />
            <CloseButton label={t("boardui.close")} onClick={() => game.setSelected(null)} />
          </header>
          <p class="bw-backs" classList={{ yes: v().backs }}>
            <b>{v().backs ? t("boardui.council.backs") : t("boardui.council.backsNot")}</b>{" "}
            <span class="data">{t("boardui.council.backing", { n: formatNum(v().backing, { maximumFractionDigits: 1 }) })}</span>
            <span class="small bw-honest">{t("boardui.honesty.game_estimate")}</span>
          </p>
          <Show when={v().momentum !== "steady"}>
            <p class={`bw-momentum small ${v().momentum}`}><i aria-hidden="true" /><span><b>{t(`boardui.council.momentum.${v().momentum}`)}</b> {t("boardui.council.momentumNote")}</span></p>
          </Show>
          <Show when={v().deal && v().deal!.kept === null}>
            <p class="warnstrip small"><span>{t("boardui.council.deal", { measure: measureName(model, v().deal!.measure), when: whenWords(model, v().deal!.dueStep) })}</span></p>
          </Show>
          <Show when={v().freshStart}>
            <p class="bw-fresh small">{t("boardui.council.freshStart")}</p>
          </Show>

          <div class="bw-council-scroll">
            <ul class="bw-measures">
              <For each={v().measures}>
                {(m) => (
                  <li classList={{ asked: v().asking.includes(m.id) }}>
                    <span class="bw-m-name label">{measureName(model, m.id)}</span>
                    <span class="bw-m-value data">{outOf10(m.score, estimate())}</span>
                    <Bar measure={m.id} value={m.score} was={m.seed} ghost={ghost(m.id)} label={`${measureName(model, m.id)}: ${outOf10(m.score, estimate())}`} />
                    <span class="bw-m-change small data">
                      <Show when={Math.abs(ghost(m.id)) >= 0.05} fallback={
                        <Show when={Math.abs(m.change) >= 0.05}>
                          <ThreadButton class="bw-why" onClick={() => game.setWhyAt({ council: props.code, measure: m.id, fromStep: Math.max(0, step() - stepsOf(model, 1)), toStep: step() })}>
                            {t("boardui.why.button")} {signed(m.change)}
                          </ThreadButton>
                        </Show>
                      }>
                        <span class="bw-ghostnote">{t("boardui.council.ifBuilt", { d: signed(ghost(m.id)) })}</span>
                      </Show>
                    </span>
                  </li>
                )}
              </For>
            </ul>
            <p class="small bw-asking">{t("boardui.council.asking", { a: measureName(model, v().asking[0]!), b: measureName(model, v().asking[1]!) })}</p>

            <section class="bw-sec">
              <h3 class="label">{t("boardui.council.real", { measure: measureName(model, shownMeasure() ?? v().asking[0]!) })}</h3>
              <ul class="bw-real">
                <For each={real()}>
                  {(r) => (
                    <li>
                      <span class="bw-real-name">{tx(r.name)}</span>
                      <span class="bw-real-val data">{formatNum(r.value, { maximumFractionDigits: 1 })} <span class="small">{tx(r.unit)}</span></span>
                      <SourceTag source={sourceOf(model, r.source)} year={r.year} />
                    </li>
                  )}
                </For>
              </ul>
              <p class="small">{t("boardui.council.realNote")}</p>
            </section>

            <CouncilLinks view={v()} />

            <section class="bw-sec">
              <h3 class="label">{t("boardui.council.people")}</h3>
              <ul class="bw-groups">
                <For each={v().groups}>
                  {(g) => (
                    <li>
                      <span class="bw-g-name">{tx(g.name)}</span>
                      <span class={`bw-mood mood-${g.mood}`}>{t(`boardui.mood.${g.mood}`)}</span>
                    </li>
                  )}
                </For>
              </ul>
              <p class="small">{t("boardui.council.groupsNote")}</p>
              <Show when={Math.abs(youngChange()) >= 1}>
                <p class="small bw-young">{t(youngChange() < 0 ? "boardui.council.youngGone" : "boardui.council.youngCome", { n: Math.abs(youngChange()) })} <span class="bw-honest">{t("boardui.honesty.game_estimate")}</span></p>
              </Show>
            </section>

            <section class="bw-sec">
              <h3 class="label">{t("boardui.council.risks")}</h3>
              <ul class="bw-risks">
                <For each={RISK_KINDS}>
                  {(k) => <li><span>{t(`boardui.risk.${k}`)}</span><span class="data">{t(`boardui.step.${v().risks[k]}`)}</span></li>}
                </For>
              </ul>
            </section>

            <section class="bw-sec">
              <h3 class="label">{t("boardui.council.projects")}</h3>
              <Show when={v().projects.length} fallback={<p class="small">{t("boardui.council.noProjects")}</p>}>
                <ul class="bw-here">
                  <For each={v().projects}>
                    {(p) => (
                      <li>
                        <span>{projectName(model, p.project)}</span>
                        <span class="small">
                          {p.status === "building"
                            ? t("boardui.project.building", { when: whenWords(model, p.readyStep + 1) })
                            : t(`boardui.project.${p.status}`, { level: p.level })}
                        </span>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </section>
          </div>

          <footer class="bw-council-foot">
            <Show when={game.screen() === "board" && game.state()?.phase !== "ended"}>
              <StampButton onClick={() => game.setSheet(game.sheet() === "build" ? null : "build")} aria-expanded={game.sheet() === "build"} data-testid="bw-build-here">
                {game.sheet() === "build" ? t("boardui.council.closeBuild") : t("boardui.council.build", { name: councilName(model, props.code) })}
              </StampButton>
            </Show>
            <Show when={v().visit}>
              <TabButton onClick={() => game.setVisit(v().visit)}>{t("boardui.council.visit")}</TabButton>
            </Show>
          </footer>
        </aside>
      )}
    </Show>
  );
}
