/**
 * The timeline of twelve turns (v2-board.md section 11.4): the years, the five elections, builds
 * on their way at the year they start working, events that landed, and the red pin at now.
 */
import { For, Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import { Icon } from "../../ui/parts";
import { useGame } from "./game";
import { iconFor } from "./icons";
import { projectName, tx } from "./words";

export function Timeline(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const g = model.game;
  const span = g.end_year - g.first_year;
  const at = (year: number) => `${((year - g.first_year) / span) * 100}%`;
  const s = () => game.state()!;
  const turns = Array.from({ length: g.turns }, (_, i) => g.first_year + i * g.turn_years);
  const building = () => s().projects.filter((p) => p.status === "building");
  const readyYear = (readyTurn: number) => g.first_year + (readyTurn + 1) * g.turn_years;
  const won = (year: number) => s().election.records.find((r) => r.year === year)?.result;
  return (
    <div class="bw-timeline strip" aria-label={t("boardui.timeline.aria")} role="group">
      <div class="bw-tl-track">
        <For each={turns}>
          {(y, i) => (
            <span class="bw-tl-turn" classList={{ past: i() < s().turn, now: i() === s().turn }} style={{ left: at(y), width: at(g.first_year + g.turn_years) }}>
              <span class="bw-tl-year small data">{y}</span>
            </span>
          )}
        </For>
        <For each={g.election_years}>
          {(y) => (
            <span class="bw-tl-election" style={{ left: at(y) }} title={t("boardui.timeline.election", { year: y })}>
              <i aria-hidden="true" />
              <span class="small">{won(y) ? t(`boardui.election.short.${won(y)}`) : t("boardui.timeline.electionShort")}</span>
            </span>
          )}
        </For>
        <For each={s().events}>
          {(e) => (
            <span class="bw-tl-event" style={{ left: at(g.first_year + (e.turn + 1) * g.turn_years) }} title={tx(model.events.find((x) => x.id === e.event)?.name)}>
              <Icon name="river" size={14} />
            </span>
          )}
        </For>
        <For each={building()}>
          {(p, i) => (
            <span class="bw-tl-stub" style={{ left: at(readyYear(p.readyTurn)), "--i": i() % 3 }} title={t("boardui.timeline.stub", { name: projectName(model, p.project), year: readyYear(p.readyTurn) })}>
              <Icon name={iconFor(model, p.project)} size={15} />
            </span>
          )}
        </For>
        <Show when={s().phase !== "ended"}>
          <span class="bw-tl-now" style={{ left: at(s().year) }} aria-hidden="true" />
        </Show>
        <span class="bw-tl-end small data" style={{ left: "100%" }}>{g.end_year}</span>
      </div>
    </div>
  );
}
