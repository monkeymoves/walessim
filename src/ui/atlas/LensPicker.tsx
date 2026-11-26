// The lens picker: what the map is tinted by, with its year, unit and source, and a fold-out
// list of every indicator grouped by strand. Arrow keys change the lens live (native radios).
import { createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import { pick, t } from "../../i18n";
import { SourceTag, Snip, TabButton } from "../parts";
import { byStrand, type AtlasIndicator } from "./data";

export interface LensPickerProps {
  indicators: AtlasIndicator[];
  current: AtlasIndicator;
  onChange: (id: string) => void;
}

export function LensPicker(props: LensPickerProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  let host!: HTMLDivElement;
  let toggle!: HTMLButtonElement;
  const onDoc = (e: Event) => { if (open() && !host.contains(e.target as Node)) setOpen(false); };
  document.addEventListener("pointerdown", onDoc);
  onCleanup(() => document.removeEventListener("pointerdown", onDoc));
  const close = () => { setOpen(false); toggle?.focus(); };
  return (
    <div class="lenspicker sheet" ref={host} onKeyDown={(e) => { if (e.key === "Escape" && open()) { e.stopPropagation(); e.preventDefault(); close(); } }}>
      <p class="small lenspicker-lead">{t("atlas.lens.tinted")}</p>
      <h2 class="t-3 lenspicker-name" data-testid="lens-name">{pick(props.current.name)}</h2>
      <p class="small lenspicker-meta">
        {t(`atlas.unit.${props.current.id}`)}, {props.current.year}
      </p>
      <div class="lenspicker-foot">
        <For each={props.current.sources.slice(0, 1)}>{(s) => <SourceTag source={s} year={props.current.year} />}</For>
        <TabButton ref={toggle} aria-expanded={open()} aria-controls="lens-list" onClick={() => setOpen(!open())}>
          {t("atlas.lens.change")}
        </TabButton>
      </div>
      <Show when={open()}>
        <div class="lenslist sheet-held" id="lens-list" role="radiogroup" aria-label={t("atlas.lens.choose")}>
          <For each={byStrand(props.indicators)}>
            {(g) => (
              <div class="lensgroup" role="group" aria-label={g.strand ? t(`parts.strand.${g.strand}`) : t("atlas.lens.other")}>
                <p class="lensgroup-head label" aria-hidden="true">
                  <Show when={g.strand}>
                    <Snip strand={g.strand!} />
                  </Show>
                  {g.strand ? t(`parts.strand.${g.strand}`) : t("atlas.lens.other")}
                </p>
                <For each={g.items}>
                  {(ind) => (
                    <label class="lensopt" classList={{ on: ind.id === props.current.id }}>
                      <input
                        type="radio"
                        name="lens"
                        value={ind.id}
                        checked={ind.id === props.current.id}
                        onChange={() => props.onChange(ind.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); close(); } }}
                        data-testid={`lens-${ind.id}`}
                      />
                      <span class="lensopt-name">{pick(ind.name)}</span>
                      <span class="lensopt-year small data">{ind.year}</span>
                    </label>
                  )}
                </For>
              </div>
            )}
          </For>
          <div class="lenslist-foot">
            <TabButton onClick={close}>{t("atlas.lens.done")}</TabButton>
          </div>
        </div>
      </Show>
    </div>
  );
}
