// The language toggle: two tabs in a well, the active one raised. Written out in full,
// Welsh first: "Cymraeg" "English". Never codes or flags.
import { For, type JSX } from "solid-js";
import { lang, setLang, t, type Lang } from "../../i18n";

const OPTIONS: { id: Lang; name: string }[] = [
  { id: "cy", name: "Cymraeg" },
  { id: "en", name: "English" },
];

export function LangToggle(props: { class?: string }): JSX.Element {
  return (
    <div class={`langtoggle well${props.class ? " " + props.class : ""}`} role="group" aria-label={t("parts.lang.label")}>
      <For each={OPTIONS}>
        {(o) => (
          <button
            type="button"
            lang={o.id}
            class="langtoggle-tab"
            aria-pressed={lang() === o.id}
            onClick={() => setLang(o.id)}
          >
            {o.name}
          </button>
        )}
      </For>
    </div>
  );
}
