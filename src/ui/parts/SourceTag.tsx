// The source docket (design-system 4.5): a luggage label in thread tint with a punched hole,
// the red thread to where a number came from. Pressing it opens the source card (title,
// publisher, licence, notes, link), or calls onPull if the caller wires "Pull the thread".
import { createSignal, createUniqueId, onCleanup, Show, type JSX } from "solid-js";
import { lang, pick, t } from "../../i18n";
import { periodIn } from "../../model/period";
import type { Source } from "../../model/schema";
import { sourceById } from "../shell/model";
import { CloseButton } from "./Buttons";

/** A short name for a source's publisher, in the active language. */
export function sourceShort(s: Source | null): string {
  if (!s) return t("parts.source.unknown");
  const p = `${s.publisher ?? ""} ${pick(s.title as never)}`;
  if (/^(Welsh Government|StatsWales|DataMapWales)/i.test(s.publisher ?? "")) return t("parts.publisher.wg");
  if (/Office for National Statistics|\bONS\b|Nomis/i.test(p)) return t("parts.publisher.ons");
  if (/Department for Energy Security/i.test(p)) return t("parts.publisher.desnz");
  if (/Natural Resources Wales/i.test(p)) return t("parts.publisher.nrw");
  if (/Welsh Government|StatsWales|DataMapWales/i.test(p)) return t("parts.publisher.wg");
  if (/British Geological Survey|\bBGS\b/i.test(p)) return "BGS";
  if (/OpenStreetMap/i.test(p)) return "OpenStreetMap";
  if (s.publisher && s.publisher.length <= 32) return s.publisher;
  return (typeof s.title === "string" ? s.title : pick(s.title)).split(/[(:,]/)[0]!.trim().split(/\s+/).slice(0, 4).join(" ");
}

export interface SourceTagProps {
  /** A source id from sources.yaml, or the source itself. */
  source: string | Source | null | undefined;
  /** The data year, shown on the docket ("ONS, 2025"). */
  year?: string | number;
  /** Override the docket text. */
  label?: string;
  /** Wire "Pull the thread" instead of the source card. */
  onPull?: (source: Source | null) => void;
  class?: string;
}

export function SourceTag(props: SourceTagProps): JSX.Element {
  const src = () => (typeof props.source === "string" ? sourceById(props.source) : props.source ?? null);
  const [open, setOpen] = createSignal(false);
  const id = createUniqueId();
  let host!: HTMLSpanElement;
  const text = () => props.label ?? (props.year != null && props.year !== "" ? `${sourceShort(src())}, ${periodIn(lang(), String(props.year))}` : sourceShort(src()));
  const onDoc = (e: Event) => { if (!host.contains(e.target as Node)) setOpen(false); };
  document.addEventListener("pointerdown", onDoc);
  onCleanup(() => document.removeEventListener("pointerdown", onDoc));
  return (
    <span class={`docket-host${props.class ? " " + props.class : ""}`} ref={host} onKeyDown={(e) => { if (e.key === "Escape" && open()) { e.stopPropagation(); e.preventDefault(); setOpen(false); } }}>
      <button
        type="button"
        class="docket"
        aria-expanded={props.onPull ? undefined : open()}
        aria-controls={props.onPull ? undefined : id}
        aria-label={t("parts.source.aria", { name: text() })}
        onClick={() => (props.onPull ? props.onPull(src()) : setOpen(!open()))}
      >
        {text()}
      </button>
      <Show when={open() && !props.onPull}>
        <SourceCard id={id} source={src()} onClose={() => setOpen(false)} />
      </Show>
    </span>
  );
}

/** The source card: a sheet with the full citation. */
export function SourceCard(props: { source: Source | null; id?: string; onClose?: () => void; class?: string }): JSX.Element {
  const s = () => props.source;
  const title = () => (s() ? pick(s()!.title as never) : t("parts.source.unknown"));
  const notes = () => {
    const n = s()?.note ?? (s()?.["notes"] as string | undefined);
    return n ? pick(n as never) : "";
  };
  return (
    <div class={`sourcecard sheet${props.class ? " " + props.class : ""}`} id={props.id} role="dialog" aria-label={title()}>
      <Show when={props.onClose}>
        <CloseButton label={t("parts.close")} onClick={() => props.onClose!()} class="sourcecard-x" />
      </Show>
      <p class="t-3 sourcecard-title" lang={typeof s()?.title === "string" ? "en" : undefined}>{title()}</p>
      <Show when={s()?.publisher}>
        <p class="small">{s()!.publisher}</p>
      </Show>
      <Show when={notes()}>
        <p class="story-small sourcecard-notes" lang={typeof (s()?.note ?? s()?.["notes"]) === "string" ? "en" : undefined}>{notes()}</p>
      </Show>
      <dl class="sourcecard-meta small">
        <Show when={s()?.licence}>
          <dt>{t("parts.source.licence")}</dt>
          <dd>{s()!.licence}</dd>
        </Show>
        <Show when={s()?.["accessed"]}>
          <dt>{t("parts.source.accessed")}</dt>
          <dd>{String(s()!["accessed"])}</dd>
        </Show>
      </dl>
      <p class="sourcecard-links">
        <Show when={s()?.url}>
          <a class="threadlink" href={s()!.url} target="_blank" rel="noopener noreferrer">{t("parts.source.open")}</a>
        </Show>
        <Show when={s()}>
          <a class="inklink" href={`#/llyfr/sources/${s()!.id}`}>{t("parts.source.inbook")}</a>
        </Show>
      </p>
    </div>
  );
}
