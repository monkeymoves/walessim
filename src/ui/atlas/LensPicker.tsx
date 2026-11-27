// The lens picker: what the map is tinted by, with its year, unit and source, and a fold-out
// list of every indicator grouped by goal. With 10 to 15 measures a goal, each goal is a fold
// that opens on demand; the current measure's goal starts open. Arrow keys change the lens live
// among the measures on show (native radios).
import { createEffect, createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import { pick, t } from "../../i18n";
import { SourceTag, Snip, TabButton } from "../parts";
import { byStrand, type AtlasIndicator } from "./data";

export interface LensPickerProps {
  indicators: AtlasIndicator[];
  current: AtlasIndicator;
  onChange: (id: string) => void;
}

const groupKey = (s: string | null) => s ?? "other";

export function LensPicker(props: LensPickerProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [folds, setFolds] = createSignal<Set<string>>(new Set());
  let host!: HTMLDivElement;
  let toggle!: HTMLButtonElement;
  const onDoc = (e: Event) => { if (open() && !host.contains(e.target as Node)) setOpen(false); };
  document.addEventListener("pointerdown", onDoc);
  onCleanup(() => document.removeEventListener("pointerdown", onDoc));
  const close = () => { setOpen(false); toggle?.focus(); };
  // the list never runs past the bottom of the map's well, however tall the card above it is
  let list: HTMLDivElement | undefined;
  const fit = () => {
    if (!list) return;
    const well = host.closest(".stage");
    const bottom = well && getComputedStyle(well).overflow !== "visible" ? well.getBoundingClientRect().bottom : innerHeight;
    list.style.maxHeight = `${Math.max(200, Math.min(640, Math.floor(bottom - list.getBoundingClientRect().top - 12)))}px`;
  };
  createEffect(() => { void props.current.id; if (open()) requestAnimationFrame(fit); });
  window.addEventListener("resize", fit);
  onCleanup(() => window.removeEventListener("resize", fit));
  const show = () => {
    if (!open()) setFolds(new Set([groupKey(props.current.strand)]));
    setOpen(!open());
  };
  const flip = (key: string) => {
    const next = new Set(folds());
    if (next.has(key)) next.delete(key); else next.add(key);
    setFolds(next);
  };
  const groupName = (s: string | null) => (s ? t(`parts.strand.${s}`) : t("atlas.lens.other"));
  return (
    <div class="lenspicker sheet" ref={host} onKeyDown={(e) => { if (e.key === "Escape" && open()) { e.stopPropagation(); e.preventDefault(); close(); } }}>
      <p class="small lenspicker-lead">{t("atlas.lens.tinted")}</p>
      <h2 class="t-3 lenspicker-name" data-testid="lens-name">{pick(props.current.name)}</h2>
      <p class="small lenspicker-meta">
        {t(`atlas.unit.${props.current.id}`)}, {props.current.year}
      </p>
      <div class="lenspicker-foot">
        <For each={props.current.sources.slice(0, 1)}>{(s) => <SourceTag source={s} year={props.current.year} />}</For>
        <TabButton ref={toggle} aria-expanded={open()} aria-controls="lens-list" onClick={show}>
          {t("atlas.lens.change")}
        </TabButton>
      </div>
      <Show when={open()}>
        <div class="lenslist sheet-held" id="lens-list" ref={(el) => { list = el; requestAnimationFrame(fit); }} role="radiogroup" aria-label={t("atlas.lens.choose")}>
          <p class="small lenslist-hint">{t("atlas.lens.hint")}</p>
          <For each={byStrand(props.indicators)}>
            {(g) => {
              const key = groupKey(g.strand);
              const isOpen = () => folds().has(key);
              const here = () => g.items.some((i) => i.id === props.current.id);
              return (
                <div class="lensgroup" classList={{ open: isOpen() }}>
                  <button
                    type="button"
                    class="lensgroup-head"
                    aria-expanded={isOpen()}
                    aria-controls={`lensgroup-${key}`}
                    onClick={() => flip(key)}
                    data-testid={`lensgroup-${key}`}
                  >
                    <Show when={g.strand}>
                      <Snip strand={g.strand!} />
                    </Show>
                    <span class="lensgroup-name label">{groupName(g.strand)}</span>
                    <span class="lensgroup-count small">
                      <Show when={!isOpen() && here()}><span class="lensgroup-here">{t("atlas.lens.here")}</span> </Show>
                      {t("atlas.lens.count", { n: g.items.length })}
                    </span>
                    <svg class="lensgroup-mark" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
                      <path fill="currentColor" d={isOpen() ? "M0 3h10L5 8z" : "M3 0v10l5-5z"} />
                    </svg>
                  </button>
                  <Show when={isOpen()}>
                    <div class="lensgroup-items" id={`lensgroup-${key}`} role="group" aria-label={groupName(g.strand)}>
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
                  </Show>
                </div>
              );
            }}
          </For>
          <div class="lenslist-foot">
            <TabButton onClick={close}>{t("atlas.lens.done")}</TabButton>
          </div>
        </div>
      </Show>
    </div>
  );
}
