// The explorer ledger (design-system 4.10): all 22 authorities by any indicators, sortable by
// any column, linked to the map both ways. A real <table>; headers are buttons with aria-sort.
import { createEffect, createMemo, createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import { pick, t } from "../../i18n";
import type { Authority } from "../../model/schema";
import { Snip, TabButton } from "../parts";
import { byStrand, fmt, type AtlasIndicator } from "./data";

export interface ExplorerTableProps {
  authorities: Authority[];
  indicators: AtlasIndicator[];
  columns: string[];
  onColumns: (ids: string[]) => void;
  hot: string | null;
  selected: string | null;
  onHot: (code: string | null) => void;
  onSelect: (code: string) => void;
  /** Start sorted by this indicator, highest first (the explorer opened from a result slip in play). */
  sortBy?: string;
}

type Sort = { col: string; dir: "asc" | "desc" };

export function ExplorerTable(props: ExplorerTableProps): JSX.Element {
  const [sort, setSort] = createSignal<Sort>(props.sortBy ? { col: props.sortBy, dir: "desc" } : { col: "name", dir: "asc" });
  const [choosing, setChoosing] = createSignal(false);
  const cols = () => props.columns.map((id) => props.indicators.find((i) => i.id === id)).filter((x): x is AtlasIndicator => !!x);
  const rows = createMemo(() => {
    const s = sort();
    const list = props.authorities.slice();
    if (s.col === "name") {
      list.sort((a, b) => pick(a.name).localeCompare(pick(b.name), "en-GB"));
      if (s.dir === "desc") list.reverse();
      return list;
    }
    const ind = props.indicators.find((i) => i.id === s.col);
    const v = (c: string) => ind?.laValues[c];
    list.sort((a, b) => {
      const x = v(a.code), y = v(b.code);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return s.dir === "asc" ? x - y : y - x;
    });
    return list;
  });
  const click = (col: string) => {
    const s = sort();
    setSort(s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "name" ? "asc" : "desc" });
  };
  const ariaSort = (col: string) => (sort().col === col ? (sort().dir === "asc" ? "ascending" : "descending") : "none");
  const scale = (ind: AtlasIndicator, v: number | undefined) => {
    if (v == null) return 0;
    const vals = Object.values(ind.laValues);
    const lo = Math.min(0, ...vals), hi = Math.max(...vals);
    return hi > lo ? (v - lo) / (hi - lo) : 0;
  };
  // scroll the selected row into view when the map selects it
  let tbody!: HTMLTableSectionElement;
  createEffect(() => {
    const code = props.selected;
    if (!code) return;
    queueMicrotask(() => {
      // scroll the ledger itself, never the page
      const row = tbody?.querySelector(`[data-code="${code}"]`) as HTMLElement | null;
      const box = tbody?.closest(".ledger-scroll") as HTMLElement | null;
      if (!row || !box || box.scrollHeight <= box.clientHeight) return;
      const top = row.offsetTop - 40, bottom = row.offsetTop + row.offsetHeight;
      if (top < box.scrollTop) box.scrollTop = top;
      else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
    });
  });
  let chooser!: HTMLDivElement;
  const onDoc = (e: Event) => { if (choosing() && chooser && !chooser.contains(e.target as Node)) setChoosing(false); };
  document.addEventListener("pointerdown", onDoc);
  onCleanup(() => document.removeEventListener("pointerdown", onDoc));
  const toggleCol = (id: string, on: boolean) => {
    const next = on ? [...props.columns, id] : props.columns.filter((c) => c !== id);
    if (next.length) props.onColumns(props.indicators.map((i) => i.id).filter((i) => next.includes(i)));
  };
  return (
    <div class="explorer-table">
      <div class="explorer-tools" ref={chooser} onKeyDown={(e) => { if (e.key === "Escape" && choosing()) { e.stopPropagation(); e.preventDefault(); setChoosing(false); } }}>
        <TabButton aria-expanded={choosing()} aria-controls="column-chooser" onClick={() => setChoosing(!choosing())}>
          {t("atlas.explorer.columns")}
        </TabButton>
        <span class="small">{t("atlas.explorer.sortHint")}</span>
        <Show when={choosing()}>
          <div class="colchooser sheet-held" id="column-chooser">
            <For each={byStrand(props.indicators)}>
              {(g) => (
                <fieldset class="colgroup">
                  <legend class="label">
                    <Show when={g.strand}><Snip strand={g.strand!} /></Show>
                    {g.strand ? t(`parts.strand.${g.strand}`) : t("atlas.lens.other")}
                  </legend>
                  <For each={g.items}>
                    {(ind) => (
                      <label class="colopt">
                        <input type="checkbox" checked={props.columns.includes(ind.id)} onChange={(e) => toggleCol(ind.id, e.currentTarget.checked)} />
                        <span>{pick(ind.name)}</span>
                      </label>
                    )}
                  </For>
                </fieldset>
              )}
            </For>
          </div>
        </Show>
      </div>
      <div class="ledger-scroll">
        <table class="ledger explorer-ledger" data-testid="explorer-table">
          <caption class="sr-only">{t("atlas.explorer.caption")}</caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={ariaSort("name")} class="col-name">
                <button type="button" class="sorthead" classList={{ on: sort().col === "name" }} onClick={() => click("name")}>
                  {t("atlas.explorer.authority")}
                  <SortMark sort={sort()} col="name" />
                </button>
              </th>
              <For each={cols()}>
                {(ind) => (
                  <th scope="col" aria-sort={ariaSort(ind.id)}>
                    <button type="button" class="sorthead" classList={{ on: sort().col === ind.id }} onClick={() => click(ind.id)} data-testid={`sort-${ind.id}`}>
                      <span class="sorthead-name">{t(`atlas.short.${ind.id}`)}</span>
                      <span class="sorthead-unit">{t(`atlas.headUnit.${ind.id}`)}</span>
                      <SortMark sort={sort()} col={ind.id} />
                    </button>
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody ref={tbody} onPointerLeave={() => props.onHot(null)}>
            <For each={rows()}>
              {(la) => (
                <tr
                  data-code={la.code}
                  classList={{ hot: props.hot === la.code, sel: props.selected === la.code }}
                  onPointerEnter={() => props.onHot(la.code)}
                  onClick={() => props.onSelect(la.code)}
                >
                  <th scope="row" class="col-name">
                    <button type="button" class="rowname" onFocus={() => props.onHot(la.code)} onBlur={() => props.onHot(null)} aria-pressed={props.selected === la.code}>
                      {pick(la.name)}
                    </button>
                  </th>
                  <For each={cols()}>
                    {(ind) => {
                      const v = () => ind.laValues[la.code];
                      return (
                        <td>
                          <Show when={fmt(ind, v())} fallback={<i class="small">{t("atlas.noData")}</i>}>
                            <span class="cell data">{fmt(ind, v())}</span>
                            <i class="mag" aria-hidden="true" style={{ width: `${Math.max(2, scale(ind, v()) * 100)}%` }} />
                          </Show>
                        </td>
                      );
                    }}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" class="col-name">{t("atlas.wales")}</th>
              <For each={cols()}>{(ind) => <td><span class="cell data">{fmt(ind, ind.wales) ?? ""}</span></td>}</For>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function SortMark(props: { sort: Sort; col: string }): JSX.Element {
  return (
    <Show when={props.sort.col === props.col}>
      <svg class="sortmark" viewBox="0 0 9 8" width="9" height="8" aria-hidden="true">
        <path fill="currentColor" d={props.sort.dir === "asc" ? "M0 8h9L4.5 0z" : "M0 0h9L4.5 8z"} />
      </svg>
    </Show>
  );
}
