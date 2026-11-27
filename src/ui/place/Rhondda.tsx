// The Rhondda: which tips first. Seventeen mapped tips, three threads. Per tip, what sits below
// it (the model rule, with its distance on a slider), and three tests the valley will judge.
// Honest sources: BGS landslide records and OpenStreetMap; the official register is not open.
import { createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { formatNum, hasKey, pick, t, tn } from "../../i18n";
import { analyseBelow, placeItems, type BelowResult, type PlaceData } from "../../engine/place-analysis";
import { CloseButton, StitchButton, TabButton, ThreadButton } from "../parts/Buttons";
import { SourceTag } from "../parts/SourceTag";
import { ConfidenceMark } from "../parts/ConfidenceMark";
import { WarnStrip } from "../parts/Notice";
import type { TipFacts } from "../../model/schema";
import { useGame } from "../game/context";
import type { BoardApi } from "./PlaceVisit";
import { TestQuestions } from "./TestQuestions";
import { TermConditions } from "./TermConditions";

const DROP_M = 10;

interface TipRow {
  id: string;
  n: number;
  name: string | null;
  source: string;
  x: number;
  y: number;
  risk: 1 | 2 | 3;
  baseRisk: 1 | 2 | 3;
  facts: TipFacts | null;
}

export function RhonddaBoard(props: { data: PlaceData; api: BoardApi }): JSX.Element {
  const { game, ui } = useGame();
  const board = game.names.place("rhondda")!;
  const offer = () => ui.visitPick() ?? game.state()!.visitOffer!;
  const items = placeItems(props.data);
  const rows: TipRow[] = items.map((it) => {
    const f = board.tips?.find((x) => x.id === it.id) ?? null;
    const base = (f?.risk ?? 1) as 1 | 2 | 3;
    return { id: it.id, n: it.n, name: it.name ?? f?.name ?? null, source: it.source, x: it.x, y: it.y, risk: (offer().tipRisk?.[it.id] ?? base) as 1 | 2 | 3, baseRisk: base, facts: f };
  });
  const [distance, setDistance] = createSignal(1000);
  const [sel, setSel] = createSignal<string | null>(null);
  const [rule, setRule] = createSignal(false);

  const below = createMemo(() => {
    const d = distance();
    const out = new Map<string, BelowResult>();
    for (const r of rows) {
      try { out.set(r.id, analyseBelow(props.data, r.id, { distanceM: d, minDropM: DROP_M })); } catch { /* tip outside the grid */ }
    }
    return out;
  });
  const maxHa = createMemo(() => Math.max(1, ...[...below().values()].map((b) => b.residentialHa)));
  const tipName = (r: TipRow) => (r.name ? r.name : t("place.rhondda.tip_unnamed", { n: r.n }));

  onMount(() => {
    const m = ui.map();
    if (!m) return;
    m.place.setSelectable(rows.map((r) => ({ id: r.id, x: r.x, y: r.y, rings: items.find((i) => i.id === r.id)?.rings, tag: String(r.n), name: tipName(r), kind: "tip" })));
    m.place.setTokens([...props.api.earlier().keys(), ...props.api.threads()]);
    const off = m.on("placeItem", (id) => select(id));
    // Escape closes the open card wherever focus is on the board
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && sel()) select(null); };
    window.addEventListener("keydown", esc);
    onCleanup(() => { off(); window.removeEventListener("keydown", esc); });
  });

  function select(id: string | null): void {
    setSel(id);
    const m = ui.map();
    m?.place.setSelected(id ? [id] : []);
    m?.place.setBelowZone(id ? below().get(id)?.belowMask ?? null : null);
    if (id) {
      const r = rows.find((x) => x.id === id);
      if (r) ui.setAnnounce(tipName(r));
    }
  }
  // the below zone follows the slider
  const refreshZone = () => { const id = sel(); if (id) ui.map()?.place.setBelowZone(below().get(id)?.belowMask ?? null); };

  const selRow = () => rows.find((r) => r.id === sel()) ?? null;
  const stitched = (id: string) => props.api.threads().includes(id);
  const wet = () => offer().activeTrends.includes("wet-decade");

  return (
    <div class="pl-rhondda">
      <p class="pl-prompt print">{tn("place.rhondda.prompt", props.api.max)}</p>
      <div class="pl-table-wrap">
        <table class="pl-ledger" aria-label={tn("place.rhondda.prompt", props.api.max)}>
          <thead>
            <tr>
              <th scope="col">{t("place.rhondda.table_tip")}</th>
              <th scope="col" class="num">{t("place.rhondda.table_homes")}</th>
              <th scope="col">{t("place.rhondda.table_risk")}</th>
              <th scope="col" class="flag">{t("place.rhondda.table_school")}</th>
              <th scope="col" class="flag">{t("place.rhondda.table_rail")}</th>
              <th scope="col" class="flag">{t("place.rhondda.table_bus")}</th>
              <th scope="col" class="flag">{t("place.rhondda.table_flood")}</th>
              <th scope="col" class="flag">{t("place.rhondda.table_deprived")}</th>
            </tr>
          </thead>
          <tbody>
            <For each={rows}>
              {(r) => {
                const b = () => below().get(r.id);
                const deprived = () => (b()?.wimdRank ?? 9999) <= (board.deprived_rank ?? 191);
                return (
                  <tr classList={{ sel: sel() === r.id, stitched: stitched(r.id) }}>
                    <th scope="row">
                      <button type="button" class="pl-rowbtn" aria-pressed={sel() === r.id} onClick={() => select(sel() === r.id ? null : r.id)}>
                        <span class="pl-tag data" classList={{ stitched: stitched(r.id), earlier: props.api.earlier().has(r.id) }}>{r.n}</span>
                        <span class="pl-name">{tipName(r)}</span>
                        <Show when={props.api.earlier().has(r.id)}>
                          <span class="pl-earlier small">{props.api.earlier().get(r.id) ? t("place.common.earlier", { year: props.api.earlier().get(r.id)! }) : t("place.common.earlier_plain")}</span>
                        </Show>
                      </button>
                    </th>
                    <td class="num data">
                      {t("place.rhondda.ha", { n: Math.round(b()?.residentialHa ?? r.facts?.residentialHa ?? 0) })}
                      <i class="pl-bar" style={{ width: `${((b()?.residentialHa ?? 0) / maxHa()) * 100}%` }} aria-hidden="true" />
                    </td>
                    <td class="pl-risk" data-risk={r.risk}>
                      <span class="pl-riskmark" aria-hidden="true"><i /><i /><i /></span>
                      <span class="sr-only">{t(`place.rhondda.risk.${r.risk}`)}</span>
                    </td>
                    <td class="flag">{(b()?.schools.length ?? (r.facts?.school ? 1 : 0)) > 0 ? <i class="cut" role="img" aria-label={t("place.rhondda.table_school")} /> : null}</td>
                    <td class="flag">{(b() ? b()!.rail.lines.length + b()!.rail.stations.length > 0 : r.facts?.rail || r.facts?.station) ? <i class="cut" role="img" aria-label={t("place.rhondda.table_rail")} /> : null}</td>
                    <td class="flag">{(b() ? b()!.busRoutes.length > 0 : r.facts?.bus) ? <i class="cut" role="img" aria-label={t("place.rhondda.table_bus")} /> : null}</td>
                    <td class="flag">{(b()?.floodZone ?? r.facts?.floodZone ?? 0) > 0 ? <i class="cut" role="img" aria-label={t("place.rhondda.table_flood")} /> : null}</td>
                    <td class="flag">{deprived() ? <i class="cut" role="img" aria-label={t("place.rhondda.table_deprived")} /> : null}</td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
      <TermConditions place="rhondda" activeTrends={offer().activeTrends} conditions={offer().termConditions} class="pl-wet" />
      <TestQuestions place="rhondda" />
      <ThreadButton onClick={() => setRule(!rule())} aria-expanded={rule()}>{t("place.common.how")}</ThreadButton>
      <p class="story-small pl-history">{t("place.rhondda.history")}</p>

      <Portal mount={document.querySelector(".yf-stage") ?? document.body}>
        <Show when={selRow() && !props.api.closed()}>
          <BelowCard row={selRow()!} result={below().get(selRow()!.id) ?? null} stitched={stitched(selRow()!.id)} full={props.api.threads().length >= props.api.max}
            name={tipName(selRow()!)} distance={distance()} wet={wet()}
            onStitch={() => props.api.toggle(selRow()!.id)} onClose={() => select(null)} onRule={() => setRule(true)} />
        </Show>
        <Show when={rule() && !props.api.closed()}>
          <RuleCard distance={distance()} onDistance={(d) => { setDistance(d); refreshZone(); }} onClose={() => setRule(false)} sources={board.sources} />
        </Show>
      </Portal>
    </div>
  );
}

function BelowCard(props: {
  row: TipRow; result: BelowResult | null; stitched: boolean; full: boolean; name: string; distance: number; wet: boolean;
  onStitch: () => void; onClose: () => void; onRule: () => void;
}): JSX.Element {
  const { game } = useGame();
  const b = () => props.result;
  const none = () => t("place.rhondda.none");
  const otherBelow = () => {
    const f = b()?.facilities ?? [];
    const kinds = new Map<string, number>();
    f.forEach((x) => kinds.set(x.kind, (kinds.get(x.kind) ?? 0) + 1));
    return [...kinds].map(([k, n]) => t("place.rhondda.kind_count", { n, kind: hasKey(`place.kind.${k}`) ? t(`place.kind.${k}`) : k.replace(/_/g, " ") })).join(", ");
  };
  return (
    <aside class="pl-below sheet" role="dialog" aria-labelledby="pl-below-title" onKeyDown={(e) => { if (e.key === "Escape") props.onClose(); }}>
      <div class="pl-below-head">
        <span class="pl-tag data" classList={{ stitched: props.stitched }}>{props.row.n}</span>
        <h3 id="pl-below-title" class="t-2">{props.name}</h3>
        <CloseButton label={t("place.common.close")} onClick={props.onClose} />
      </div>
      <p class="small">{/bgs/i.test(props.row.source) ? t("place.rhondda.tip_source_bgs") : t("place.rhondda.tip_source_osm")}</p>
      <p class="pl-riskline label" data-risk={props.row.risk}>
        <span class="pl-riskmark" aria-hidden="true"><i /><i /><i /></span>
        {t(`place.rhondda.risk.${props.row.risk}`)}
      </p>
      <Show when={props.wet && props.row.risk > props.row.baseRisk}>
        <WarnStrip>{t("place.rhondda.risk_raised", { trend: game.names.curveballName("wet-decade") })}</WarnStrip>
      </Show>
      <dl class="pl-facts">
        <dt>{t("place.rhondda.below_homes")}</dt>
        <dd><b class="print pl-fig">{t("place.rhondda.ha", { n: Math.round(b()?.residentialHa ?? 0) })}</b></dd>
        <dt>{t("place.rhondda.below_buildings")}</dt>
        <dd class="data">{b()?.buildings ?? 0} <span class="small">{t("place.rhondda.buildings_note")}</span></dd>
        <dt>{t("place.rhondda.below_schools")}</dt>
        <dd>{b()?.schools.length ? b()!.schools.map((s) => s.name ?? "").filter(Boolean).join(", ") || String(b()!.schools.length) : none()}</dd>
        <Show when={otherBelow()}>
          <dt>{t("place.rhondda.below_other")}</dt>
          <dd>{otherBelow()}</dd>
        </Show>
        <dt>{t("place.rhondda.below_rail")}</dt>
        <dd>{b()?.rail.lines.length ? b()!.rail.lines.join(", ") : none()}</dd>
        <Show when={b()?.rail.stations.length}>
          <dt>{t("place.rhondda.below_stations")}</dt>
          <dd>{b()!.rail.stations.map((s) => s.name ?? "").filter(Boolean).join(", ")}</dd>
        </Show>
        <dt>{t("place.rhondda.below_bus")}</dt>
        <dd>{b()?.busRoutes.length ? b()!.busRoutes.join(", ") : t("place.rhondda.none_mapped")}</dd>
        <dt>{t("place.rhondda.below_river")}</dt>
        <dd>{b()?.nearestRiver ? t("place.rhondda.river", { name: b()!.nearestRiver!, m: Math.round((b()!.nearestRiverM ?? 0) / 10) * 10 }) : none()}</dd>
        <dt>{t("place.rhondda.below_flood")}</dt>
        <dd>{t(`place.rhondda.flood.${b()?.floodZone ?? 0}`)}</dd>
        <dt>{t("place.rhondda.below_wimd")}</dt>
        <dd>
          {b()?.wimdLsoa ? t("place.rhondda.wimd", { name: pick({ en: b()!.wimdLsoa!.en, cy: b()!.wimdLsoa!.cy ?? b()!.wimdLsoa!.en }), rank: b()!.wimdRank ?? "", edition: game.names.place("rhondda")?.wimd?.edition ?? "WIMD 2019", areas: formatNum(game.names.place("rhondda")?.wimd?.areas ?? 1909) }) : none()}
        </dd>
      </dl>
      <p class="pl-below-foot">
        <ThreadButton onClick={props.onRule}>{t("place.common.how")}</ThreadButton>
        <Show when={props.stitched} fallback={
          <StitchButton onClick={props.onStitch} disabled={props.full}>{t("place.rhondda.stitch")}</StitchButton>
        }>
          <TabButton onClick={props.onStitch}>{t("place.common.unstitch")}</TabButton>
        </Show>
      </p>
    </aside>
  );
}

function RuleCard(props: { distance: number; onDistance: (d: number) => void; onClose: () => void; sources: string[] }): JSX.Element {
  return (
    <aside class="pl-rule sheet" role="dialog" aria-labelledby="pl-rule-title" onKeyDown={(e) => { if (e.key === "Escape") props.onClose(); }}>
      <div class="pl-below-head">
        <h3 id="pl-rule-title" class="t-2">{t("place.rhondda.rule_title")}</h3>
        <CloseButton label={t("place.common.close")} onClick={props.onClose} />
      </div>
      <p class="story-small">{t("place.rhondda.rule_sentence", { d: props.distance, h: DROP_M })}</p>
      <label class="pl-slider">
        <span class="label">{t("place.rhondda.rule_distance")} <b class="data">{props.distance} m</b></span>
        <input type="range" min="250" max="1500" step="50" value={props.distance} aria-label={t("place.rhondda.rule_slider")}
          onInput={(e) => props.onDistance(Number(e.currentTarget.value))} />
        <span class="pl-scale small data" aria-hidden="true"><span>250</span><span>1000</span><span>1500</span></span>
      </label>
      <p class="small">{t("place.rhondda.rule_note")}</p>
      <ConfidenceMark level="low" />
      <p class="small">{t("place.rhondda.rule_register")}</p>
      <p class="yf-dockets"><For each={props.sources}>{(s) => <SourceTag source={s} />}</For></p>
    </aside>
  );
}
