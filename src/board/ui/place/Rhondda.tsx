/**
 * The Rhondda on the board (template T1): v1's tip board reused through an adapter. The tips, their
 * real facts and the three tests come whole from v1's place board, which the build copies into the
 * board model; the engine grades the picks with v1's own `gradeRhondda`. This screen only lets the
 * player pick which tips first, on the council drawn close and in a list that works by keyboard.
 */
import { createSignal, For, Show, type JSX } from "solid-js";
import { formatNum, t, tn } from "../lang";
import { StampButton, TabButton } from "../../../ui/parts";
import type { BoardModel, PlaceDef, V1PlaceBoard } from "../../engine/api";
import { councilName, tx } from "../words";
import { CouncilClose } from "./LightPlace";

type Tip = NonNullable<V1PlaceBoard["tips"]>[number];

export function tipName(tip: Tip): string {
  return tip.name ?? t("boardend.rhondda.unnamed", { n: tip.n });
}

/** What sits below a tip, in plain words, from the real facts. */
export function tipFacts(tip: Tip): string[] {
  const out = [tn("boardend.rhondda.buildings", tip.buildingsBelow, { n: formatNum(tip.buildingsBelow) })];
  if (tip.school) out.push(t("boardend.rhondda.school"));
  if (tip.rail) out.push(t("boardend.rhondda.rail"));
  if (tip.deprived) out.push(t("boardend.rhondda.poorest"));
  return out;
}

export function RhonddaPlace(props: { model: BoardModel; place: PlaceDef; onChoose: (picks: string[]) => void; onLeave: () => void }): JSX.Element {
  const board = () => props.place.board;
  const tips = () => board()?.tips ?? [];
  const max = () => Math.max(1, board()?.threads ?? 3);
  const [picks, setPicks] = createSignal<string[]>([]);
  const toggle = (id: string) => {
    const cur = picks();
    setPicks(cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < max() ? [...cur, id] : cur);
  };
  return (
    <div class="bp-rhondda" data-testid="bp-rhondda">
      <Show when={tips().length} fallback={<NoBoard onChoose={() => props.onChoose([])} onLeave={props.onLeave} />}>
        <CouncilClose model={props.model} code={props.place.council} label={t("boardend.rhondda.mapAria", { council: councilName(props.model, props.place.council) })}>
          <For each={tips()}>
            {(tip) => (
              <g class="bp-tip" classList={{ picked: picks().includes(tip.id), [`risk-${tip.risk}`]: true }} onClick={() => toggle(tip.id)} aria-hidden="true">
                <circle cx={tip.x} cy={tip.y} r={0.55 + tip.risk * 0.2} />
                <text x={tip.x + 0.9} y={tip.y + 0.35} font-size="1.1">{tip.n}</text>
              </g>
            )}
          </For>
        </CouncilClose>
        <div class="bp-light-side">
          <p class="small" role="status">{t("boardend.rhondda.picked", { n: picks().length, max: max() })}</p>
          <ol class="bp-tips" aria-label={t("boardend.rhondda.list")}>
            <For each={tips()}>
              {(tip) => (
                <li>
                  <label class="bp-tiprow" classList={{ picked: picks().includes(tip.id) }}>
                    <input
                      type="checkbox"
                      checked={picks().includes(tip.id)}
                      disabled={!picks().includes(tip.id) && picks().length >= max()}
                      onChange={() => toggle(tip.id)}
                      data-testid="bp-tip"
                    />
                    <span class="data bp-tip-n">{tip.n}</span>
                    <span class="bp-tip-text">
                      <span class="strong">{tipName(tip)}</span>{" "}
                      <span class="small">{t(`boardend.rhondda.risk${tip.risk}`)}</span>
                      <span class="small bp-tip-facts">{tipFacts(tip).join(t("boardend.list.sep"))}</span>
                    </span>
                  </label>
                </li>
              )}
            </For>
          </ol>
          <h3 class="t-3">{t("boardend.rhondda.tests")}</h3>
          <ul class="bp-tests">
            <For each={board()?.tests ?? []}>{(x) => <li><span class="strong">{tx(x.name)}</span> <span class="small">{tx(x.description)}</span></li>}</For>
          </ul>
          <Show when={board()?.data_note}><p class="small be-honest">{tx(board()!.data_note)}</p></Show>
          <div class="bp-actions">
            <StampButton onClick={() => props.onChoose(picks())} why={picks().length ? null : t("boardend.rhondda.pickFirst")} data-testid="bp-choose">
              {tn("boardend.rhondda.make", picks().length)}
            </StampButton>
            <TabButton onClick={() => props.onLeave()} data-testid="bp-leave">{t("boardend.place.leave")}</TabButton>
          </div>
          <p class="small">{t("boardend.place.leaveNote")}</p>
        </div>
      </Show>
    </div>
  );
}

/** The model has no tip board copied in: the engine grades the visit "OK", and the screen says so. */
function NoBoard(props: { onChoose: () => void; onLeave: () => void }): JSX.Element {
  return (
    <div class="bp-light-side">
      <p class="story-small">{t("boardend.rhondda.noBoard")}</p>
      <div class="bp-actions">
        <StampButton onClick={() => props.onChoose()} data-testid="bp-choose">{t("boardend.rhondda.goAnyway")}</StampButton>
        <TabButton onClick={() => props.onLeave()} data-testid="bp-leave">{t("boardend.place.leave")}</TabButton>
      </div>
    </div>
  );
}
