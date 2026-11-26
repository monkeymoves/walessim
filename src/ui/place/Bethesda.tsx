// Bethesda and Dyffryn Ogwen: who is the quarry for now. Ten options, three threads, three
// tests (Aros, Iaith, Pwysau). Per option the five flags it helps, its delay and its catch.
import { createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { pick, t, tn } from "../../i18n";
import type { PlaceData } from "../../engine/place-analysis";
import { CloseButton, StitchButton, TabButton } from "../parts/Buttons";
import { SourceTag } from "../parts/SourceTag";
import { ConfidenceMark } from "../parts/ConfidenceMark";
import type { ThreadOption } from "../../model/schema";
import { useGame } from "../game/context";
import type { BoardApi } from "./PlaceVisit";

const FLAGS = ["homes", "work", "iaith", "visitors", "river"] as const;

type Pt = [number, number];

/**
 * Where each option sits on the place map. The board has no positions yet, so they are anchored
 * to real features in the place data (the town, Gerlan, Llandygai by the A55, the school, the
 * Afon Caseg and the Afon Ogwen), with the quarry options set just west of the town. Authored
 * `x`, `y` on the option win when present.
 */
function anchors(data: PlaceData): Record<string, Pt> {
  const named = (en: string): Pt | null => {
    const p = data.places?.find((x) => x.en === en);
    return p ? [p.x, p.y] : null;
  };
  const town = named("Bethesda") ?? [(data.bbox.x0 + data.bbox.x1) / 2, (data.bbox.y0 + data.bbox.y1) / 2];
  const near = (pts: Pt[]): Pt | null => {
    let best: Pt | null = null, bd = Infinity;
    for (const q of pts) { const d = Math.hypot(q[0] - town[0], q[1] - town[1]); if (d < bd) { bd = d; best = q; } }
    return best;
  };
  const river = (name: string) => near((data.rivers ?? []).filter((r) => r.name?.includes(name)).flatMap((r) => r.pts as Pt[]));
  const school = data.facilities?.find((f) => f.kind === "school" && /Abercaseg/.test(f.name ?? ""));
  const off = (dx: number, dy: number): Pt => [town[0] + dx, town[1] + dy];
  return {
    "chapel-homes": off(0, 0.05),
    "levy-trust": off(0.2, -0.2),
    "quarry-edge-homes": off(-0.45, 0.4),
    "quarry-workshops": off(-0.7, 0.75),
    "rework-tips": off(-1.0, 1.1),
    "cap-holiday-lets": named("Gerlan") ?? off(0.85, 0.3),
    "welsh-youth-centre": school ? [school.x, school.y] : off(0.45, 0.3),
    "second-hydro": river("Caseg") ?? off(1.2, 0.8),
    "room-for-river": river("Ogwen") ?? off(-0.2, -0.3),
    "park-and-ride": named("Llandygai") ?? off(-2.6, -4),
  };
}

export function BethesdaBoard(props: { data: PlaceData; api: BoardApi }): JSX.Element {
  const { game, ui } = useGame();
  const board = game.names.place("bethesda")!;
  const offer = () => game.state()!.visitOffer!;
  const options = board.options ?? [];
  const [sel, setSel] = createSignal<string | null>(null);
  const stitched = (id: string) => props.api.threads().includes(id);

  onMount(() => {
    const m = ui.map();
    if (!m) return;
    const at = anchors(props.data);
    m.place.setSelectable(options.map((o) => ({
      id: o.id,
      x: o.x ?? at[o.id]?.[0] ?? props.data.bbox.x0,
      y: o.y ?? at[o.id]?.[1] ?? props.data.bbox.y0,
      tag: String(o.n),
      name: pick(o.name),
    })));
    m.place.setTokens(props.api.threads());
    const off = m.on("placeItem", (id) => select(id));
    // Escape closes the open card wherever focus is on the board
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && sel()) select(null); };
    window.addEventListener("keydown", esc);
    onCleanup(() => { off(); window.removeEventListener("keydown", esc); });
  });

  function select(id: string | null): void {
    setSel(id);
    ui.map()?.place.setSelected(id ? [id] : []);
    if (id) ui.map()?.place.focusItem(id);
  }
  const selOpt = () => options.find((o) => o.id === sel()) ?? null;
  const tests = () => board.tests.length ? board.tests.map((x) => game.names.text(x.description)) : ["aros", "iaith", "pwysau"].map((k) => t(`place.bethesda.tests.${k}`));
  const trends = () => offer().activeTrends.filter((c) => board.trend_penalties?.some((p) => p.curveball === c));

  return (
    <div class="pl-bethesda">
      <p class="story-small pl-dilemma">{t("place.bethesda.dilemma")}</p>
      <p class="small pl-history">{t("place.bethesda.history")} <span class="pl-check">{t("place.bethesda.history_check")}</span></p>
      <p class="pl-prompt print">{t("place.bethesda.prompt")}</p>
      <div class="pl-table-wrap">
        <table class="pl-ledger" aria-label={t("place.bethesda.prompt")}>
          <thead>
            <tr>
              <th scope="col">{t("place.bethesda.table_option")}</th>
              <For each={FLAGS}>{(f) => <th scope="col" class="flag">{t(`place.bethesda.flags.${f}`)}</th>}</For>
              <th scope="col" class="num">{t("place.bethesda.table_delay")}</th>
            </tr>
          </thead>
          <tbody>
            <For each={options}>
              {(o) => (
                <tr classList={{ sel: sel() === o.id, stitched: stitched(o.id) }}>
                  <th scope="row">
                    <button type="button" class="pl-rowbtn" aria-pressed={sel() === o.id} onClick={() => select(sel() === o.id ? null : o.id)}>
                      <span class="pl-tag data" classList={{ stitched: stitched(o.id) }}>{o.n}</span>
                      <span class="pl-name">{pick(o.name)}</span>
                    </button>
                  </th>
                  <For each={FLAGS}>
                    {(f) => <td class="flag">{o.flags.includes(f) ? <i class="cut" role="img" aria-label={t(`place.bethesda.flags.${f}`)} /> : null}</td>}
                  </For>
                  <td class="num data">{o.delay ? tn("place.bethesda.delay", o.delay) : t("place.bethesda.delay_now")}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={trends().length}>
        <p class="warnstrip small"><span>{t("place.bethesda.trend_note", { trend: game.names.list(trends().map((c) => game.names.curveballName(c))) })}</span></p>
      </Show>
      <details class="pl-tests-box">
        <summary class="label">{t("place.common.tests")}</summary>
        <ul class="pl-tests-list small"><For each={tests()}>{(x) => <li>{x}</li>}</For></ul>
        <p class="small">{t("place.common.tests_note")}</p>
      </details>
      <details class="pl-tests-box">
        <summary class="label">{t("place.common.sources")}</summary>
        <p class="small">{game.names.text(board.data_note)}</p>
        <ConfidenceMark level={board.confidence} />
        <p class="yf-dockets"><For each={board.sources}>{(s) => <SourceTag source={s} />}</For></p>
      </details>

      <Portal mount={document.querySelector(".yf-stage") ?? document.body}>
        <Show when={selOpt() && !props.api.closed()}>
          <OptionCard opt={selOpt()!} stitched={stitched(selOpt()!.id)} full={props.api.threads().length >= props.api.max}
            onStitch={() => props.api.toggle(selOpt()!.id)} onClose={() => select(null)} />
        </Show>
      </Portal>
    </div>
  );
}

function OptionCard(props: { opt: ThreadOption; stitched: boolean; full: boolean; onStitch: () => void; onClose: () => void }): JSX.Element {
  const { game } = useGame();
  const o = () => props.opt;
  const pairName = () => game.model.places.find((p) => p.id === "bethesda")?.options?.find((x) => x.id === o().pairs_with?.option)?.n;
  return (
    <aside class="pl-below sheet" role="dialog" aria-labelledby="pl-opt-title" onKeyDown={(e) => { if (e.key === "Escape") props.onClose(); }}>
      <div class="pl-below-head">
        <span class="pl-tag data" classList={{ stitched: props.stitched }}>{o().n}</span>
        <h3 id="pl-opt-title" class="t-2">{pick(o().name)}</h3>
        <CloseButton label={t("place.common.close")} onClick={props.onClose} />
      </div>
      <ul class="pl-flags">
        <For each={FLAGS}>
          {(f) => (
            <li classList={{ on: o().flags.includes(f) }}>
              <i class="cut" classList={{ off: !o().flags.includes(f) }} aria-hidden="true" />
              <span class="label">{t(`place.bethesda.flags.${f}`)}</span>
            </li>
          )}
        </For>
      </ul>
      <p class="data small">{t("place.bethesda.table_delay")}: {o().delay ? tn("place.bethesda.delay", o().delay) : t("place.bethesda.delay_now")}</p>
      <h4 class="label">{t("place.bethesda.catch")}</h4>
      <p class="story-small">{pick(o().catch)}</p>
      <Show when={o().requires_card}><p class="small">{t("place.bethesda.requires", { card: game.names.cardName(o().requires_card!) })}</p></Show>
      <Show when={o().half_without_card}><p class="small">{t("place.bethesda.half_without", { card: game.names.cardName(o().half_without_card!) })}</p></Show>
      <Show when={o().pairs_with && pairName()}><p class="small">{t("place.bethesda.pairs", { n: pairName()! })}</p></Show>
      <Show when={o().river_flips_in}><p class="small">{t("place.bethesda.river_flips")}</p></Show>
      <p class="pl-below-foot">
        <Show when={props.stitched} fallback={<StitchButton onClick={props.onStitch} disabled={props.full}>{t("place.common.stitch")}</StitchButton>}>
          <TabButton onClick={props.onStitch}>{t("place.common.unstitch")}</TabButton>
        </Show>
      </p>
    </aside>
  );
}
