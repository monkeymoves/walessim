/**
 * Clock settings (16.2.2 and 16.2.5): which moments stop the clock, holding it while you read,
 * and step by step. The stops that can never be switched off are listed as such. Each setting is
 * saved under the board's own key, never shared with another app's storage.
 */
import { For, type JSX } from "solid-js";
import { t } from "../lang";
import { CloseButton } from "../../../ui/parts";
import type { StopKind } from "../../engine/api";
import { useGame } from "../game";
import { isHard, softStops } from "./prefs";

export function Settings(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const c = game.clock;
  const hard = (["respond", "election", "ended"] as StopKind[]).filter((k) => isHard(model, k));
  const setStop = (k: StopKind, on: boolean) => c.setPrefs({ ...c.prefs(), stops: { ...c.prefs().stops, [k]: on } });
  return (
    <div class="bw-settings sheet-held" role="dialog" aria-labelledby="bw-settings-title" data-testid="bw-settings">
      <header class="bw-tree-head">
        <h2 class="t-2" id="bw-settings-title">{t("boardui.settings.title")}</h2>
        <CloseButton label={t("boardui.close")} onClick={() => game.setSheet(null)} />
      </header>
      <div class="bw-settings-body">
        <fieldset class="bw-settings-group">
          <legend class="label">{t("boardui.settings.how")}</legend>
          <label class="bw-check">
            <input type="checkbox" checked={c.prefs().stepByStep} onChange={(e) => c.setPrefs({ ...c.prefs(), stepByStep: e.currentTarget.checked })} data-testid="bw-pref-step" />
            <span><b>{t("boardui.settings.step")}</b> <span class="small">{t("boardui.settings.stepNote")}</span></span>
          </label>
          <label class="bw-check">
            <input type="checkbox" checked={c.prefs().holdWhileReading} onChange={(e) => c.setPrefs({ ...c.prefs(), holdWhileReading: e.currentTarget.checked })} />
            <span><b>{t("boardui.settings.hold")}</b> <span class="small">{t("boardui.settings.holdNote")}</span></span>
          </label>
          <p class="small">{t("boardui.settings.hidden")}</p>
        </fieldset>
        <fieldset class="bw-settings-group">
          <legend class="label">{t("boardui.settings.stops")}</legend>
          <ul class="bw-settings-stops">
            <For each={softStops(model)}>
              {(k) => (
                <li>
                  <label class="bw-check">
                    <input type="checkbox" checked={!!c.prefs().stops[k]} onChange={(e) => setStop(k, e.currentTarget.checked)} data-testid={`bw-pref-${k}`} />
                    <span>{t(`boardui.settings.stop.${k}`)}</span>
                  </label>
                </li>
              )}
            </For>
          </ul>
          <p class="small">{t("boardui.settings.always", { list: hard.map((k) => t(`boardui.settings.stop.${k}`)).join(t("boardui.list.comma")) })}</p>
        </fieldset>
        <p class="small bw-settings-keys">{t("boardui.settings.keys")}</p>
      </div>
    </div>
  );
}
