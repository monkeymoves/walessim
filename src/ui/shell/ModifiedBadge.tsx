// "You are playing a modified rule set": shown app-wide whenever a model book parameter has
// been changed, with a tab to put the rules back. A hatched warning tab and plain words.
import { Show, type JSX } from "solid-js";
import { t, tn } from "../../i18n";
import { isModified, overrides, resetOverrides } from "../book/overrides";

export function ModifiedBadge(props: { class?: string }): JSX.Element {
  return (
    <Show when={isModified()}>
      <div class={`modified warnstrip${props.class ? " " + props.class : ""}`} role="status" data-testid="modified-badge">
        <span class="modified-words">
          <a href="#/llyfr/changed" class="modified-link">{t("shell.modified")}</a>
          <span class="small modified-count">{tn("shell.modifiedCount", Object.keys(overrides()).length)}</span>
        </span>
        <button type="button" class="btn btn-tab modified-reset" onClick={() => resetOverrides()}>
          {t("shell.modifiedReset")}
        </button>
      </div>
    </Show>
  );
}
