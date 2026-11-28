/**
 * The election (v2-board.md section 6): the map coloured council by council by who backs you,
 * the count, the result and what it means for the next four years. No parties, no polls.
 */
import { createMemo, For, Show, type JSX } from "solid-js";
import { formatNum, t } from "../../i18n";
import { StampButton } from "../../ui/parts";
import type { ElectionView } from "../engine/api";
import * as eng from "./engine";
import { useGame } from "./game";
import { councilName, say } from "./words";

export function Election(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const view = createMemo<ElectionView | null>(() => game.report()?.election ?? (game.state() ? eng.election(model, game.state()!) : null));
  return (
    <Show when={view()}>
      {(v) => (
        <div class="bw-election sheet-held" role="dialog" aria-labelledby="bw-election-title" data-testid="bw-election">
          <p class="label">{t("boardui.election.year", { year: v().year })}</p>
          <h2 class="t-1" id="bw-election-title">{t(`boardui.election.result.${v().result}`)}</h2>
          <p class="bw-election-count">
            <span class="figure-big">{v().backers}</span>{" "}
            <span>{t("boardui.election.count", { of: v().councilCount, people: formatNum(v().peopleShare * 100, { maximumFractionDigits: 0 }) })}</span>
          </p>
          <ul class="bw-election-list">
            <For each={[...v().councils].sort((a, b) => b.backing - a.backing)}>
              {(c) => (
                <li classList={{ yes: c.backs }}>
                  <span>{councilName(model, c.code)}</span>
                  <span class="small data">{c.backs ? t("boardui.region.backs") : t("boardui.region.backsNot")}</span>
                </li>
              )}
            </For>
          </ul>
          <For each={v().says}>{(s) => <p class="story-small">{say(s)}</p>}</For>
          <p class="small">{t("boardui.election.rule", { n: formatNum(model.rules.find((r) => r.id === "P4")?.params["backs_at"]?.default ?? 5) })}</p>
          <p class="small bw-honest">{t("boardui.election.honest")}</p>
          <StampButton onClick={() => game.nextScreen()} data-testid="bw-election-next">
            {game.report()?.ended ? t("boardui.report.toEnd") : t("boardui.election.next")}
          </StampButton>
        </div>
      )}
    </Show>
  );
}
