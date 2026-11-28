/**
 * A light place (template T3, docs/design/v2-board.md section 9): one hard choice of two or three
 * options, each with a named gain and a named loss, beside the council drawn close with its towns.
 * No bespoke map data: the outline and towns are the national geography's. The grade is never
 * previewed; the engine judges the choice against the board when it is made.
 */
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";
import { lang, t } from "../../../i18n";
import { StampButton, TabButton } from "../../../ui/parts";
import { geo } from "../../../ui/shell/model";
import type { BoardModel, PlaceDef } from "../../engine/api";
import { branchName, councilName, tx } from "../words";

/** The council outline and the towns inside its box, in the km frame, for a close map. */
export function CouncilClose(props: { model: BoardModel; code: string; children?: JSX.Element; label: string }): JSX.Element {
  const la = createMemo(() => geo()?.las.find((x) => x.code === props.code));
  const box = createMemo(() => {
    const pts = la()?.rings.flat() ?? [];
    if (!pts.length) return { x: 0, y: 0, w: 100, h: 100 };
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x = Math.min(...xs) - 1.5, y = Math.min(...ys) - 1.5;
    return { x, y, w: Math.max(...xs) - x + 1.5, h: Math.max(...ys) - y + 1.5 };
  });
  const d = () => (la()?.rings ?? []).map((r) => r.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join("") + "Z").join("");
  const towns = createMemo(() => {
    const b = box();
    return (geo()?.towns ?? []).filter((tw) => tw.x >= b.x && tw.x <= b.x + b.w && tw.y >= b.y && tw.y <= b.y + b.h);
  });
  const fs = () => Math.max(1.2, box().w / 26);
  return (
    <svg class="bp-close" viewBox={`${box().x} ${box().y} ${box().w} ${box().h}`} role="img" aria-label={props.label} preserveAspectRatio="xMidYMid meet">
      <path d={d()} class="bp-close-la" fill-rule="evenodd" />
      <For each={towns()}>
        {(tw) => (
          <g class="bp-close-town" aria-hidden="true">
            <rect x={tw.x - fs() * 0.2} y={tw.y - fs() * 0.2} width={fs() * 0.4} height={fs() * 0.4} />
            <text x={tw.x + fs() * 0.4} y={tw.y + fs() * 0.35} font-size={String(fs())}>{lang() === "cy" ? tw.cy : tw.en}</text>
          </g>
        )}
      </For>
      {props.children}
    </svg>
  );
}

export function LightPlace(props: { model: BoardModel; place: PlaceDef; onChoose: (id: string) => void; onLeave: () => void }): JSX.Element {
  const [picked, setPicked] = createSignal<string | null>(null);
  const options = () => props.place.options ?? [];
  const chosen = () => options().find((o) => o.id === picked());
  return (
    <div class="bp-light" data-testid="bp-light">
      <CouncilClose model={props.model} code={props.place.council} label={t("boardend.place.mapAria", { council: councilName(props.model, props.place.council) })} />
      <div class="bp-light-side">
        <h3 class="t-3" id="bp-options">{t("boardend.place.pickOne")}</h3>
        <div class="bp-options" role="radiogroup" aria-labelledby="bp-options">
          <For each={options()}>
            {(o) => (
              <button
                type="button"
                role="radio"
                aria-checked={picked() === o.id}
                class="bp-option ticket"
                classList={{ chosen: picked() === o.id }}
                onClick={() => setPicked(o.id)}
                data-testid={`bp-opt-${o.id}`}
              >
                <span class="t-3 bp-option-name">{tx(o.name)}</span>
                <span class="story-small bp-gain"><span class="bp-mark" aria-hidden="true">+</span> <span class="sr-only">{t("boardend.place.gain")}</span>{tx(o.gain)}</span>
                <span class="story-small bp-loss"><span class="bp-mark" aria-hidden="true">−</span> <span class="sr-only">{t("boardend.place.loss")}</span>{tx(o.loss)}</span>
                <Show when={o.branch}><span class="small bp-branch">{t("boardend.place.branch", { branch: branchName(props.model, o.branch!) })}</span></Show>
              </button>
            )}
          </For>
        </div>
        <p class="small">{t("boardend.place.judged")}</p>
        <div class="bp-actions">
          <StampButton onClick={() => picked() && props.onChoose(picked()!)} why={picked() ? null : t("boardend.place.pickFirst")} data-testid="bp-choose">
            {chosen() ? t("boardend.place.choose", { option: tx(chosen()!.name) }) : t("boardend.place.chooseBlank")}
          </StampButton>
          <TabButton onClick={() => props.onLeave()} data-testid="bp-leave">{t("boardend.place.leave")}</TabButton>
        </div>
        <p class="small">{t("boardend.place.leaveNote")}</p>
      </div>
    </div>
  );
}
