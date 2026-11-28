/**
 * A place visit on the board (docs/design/v2-board.md section 9): the Rhondda's tips (T1, v1's
 * board and grading reused through the engine) or a light place with one hard choice (T3). Loaded
 * lazily by the board screen as a default export with no props, while `game.visit()` holds a place
 * id. The choice goes to the engine as `{ kind: "visit", place, picks }`; the engine grades it.
 * The clock is held while a place is open (16.2.3).
 */
import { createSignal, Match, onCleanup, onMount, Show, Switch, type JSX } from "solid-js";
import { Pair, t } from "../../../i18n";
import { StampButton, TabButton } from "../../../ui/parts";
import type { BoardModel, BoardState, Grade, PlaceDef } from "../../engine/api";
import { useGame } from "../game";
import { councilName, projectName, tx } from "../words";
import { LightPlace } from "./LightPlace";
import { RhonddaPlace } from "./Rhondda";
import "./place.css";

/** The grade the engine gave a visit to this place: on the project it scales, else on the ledger. */
export function gradeGiven(state: BoardState, place: PlaceDef): Grade | null {
  const p = state.projects.find((x) => x.project === place.scales && x.site.council === place.council && x.grade);
  if (p?.grade) return p.grade;
  for (let i = state.ledger.length - 1; i >= 0; i--) {
    const c = state.ledger[i]!.cause;
    if (c.kind === "visit" && c.place === place.id) return c.grade;
  }
  return null;
}

/** Why this place is asking now, from the pending visit: the project or event that offered it. */
export function offeredBy(model: BoardModel, state: BoardState, place: PlaceDef): string {
  const p = state.pending.find((x) => x.kind === "visit" && x.place === place.id);
  if (!p || p.kind !== "visit") return "";
  if ("project" in p.offeredBy) return t("boardend.place.offeredBuild", { project: projectName(model, p.offeredBy.project), council: councilName(model, place.council) });
  const ev = model.events.find((e) => e.id === (p.offeredBy as { event: string }).event);
  return t("boardend.place.offeredEvent", { event: tx(ev?.name), council: councilName(model, place.council) });
}

export default function PlaceVisit(): JSX.Element {
  const game = useGame();
  const model = game.model;
  const place = () => model.places.find((p) => p.id === game.visit());
  const [grade, setGrade] = createSignal<Grade | null>(null);
  const [error, setError] = createSignal("");
  let sheet!: HTMLDivElement;

  const leave = () => game.setVisit(null);
  const choose = (picks: string[]) => {
    const p = place(), s = game.state();
    if (!p || !s) return;
    if (!game.act({ kind: "visit", place: p.id, picks })) { setError(t("boardend.place.notNow")); return; }
    setGrade(gradeGiven(game.state()!, p) ?? "adequately");
  };

  onMount(() => {
    sheet.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !grade()) leave(); };
    window.addEventListener("keydown", esc);
    onCleanup(() => window.removeEventListener("keydown", esc));
  });

  return (
    <div class="bp-visit" role="dialog" aria-modal="true" aria-labelledby="bp-title" data-testid="bp-visit" ref={sheet} tabindex="-1">
      <Show when={place()} fallback={<Missing onLeave={leave} />}>
        {(p) => (
          <div class="bp-sheet sheet">
            <header class="bp-head">
              <Pair text={p().name} as="h2" class="t-1" id="bp-title" />
              <p class="small">{councilName(model, p().council)}</p>
              <Show when={game.state() && offeredBy(model, game.state()!, p())}><p class="small">{offeredBy(model, game.state()!, p())}</p></Show>
              <p class="story">{tx(p().prompt)}</p>
              <p class="story-small bp-hard">{tx(p().why_hard)}</p>
            </header>
            <Show when={!grade()} fallback={<Graded place={p()} grade={grade()!} onDone={leave} />}>
              <Switch fallback={<Missing onLeave={leave} />}>
                <Match when={p().template === "T3" && p().options?.length}>
                  <LightPlace model={model} place={p()} onChoose={(id) => choose([id])} onLeave={leave} />
                </Match>
                <Match when={p().template === "T1"}>
                  <RhonddaPlace model={model} place={p()} onChoose={choose} onLeave={leave} />
                </Match>
              </Switch>
              <Show when={error()}><p class="small bp-error" role="alert">{error()}</p></Show>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}

function Graded(props: { place: PlaceDef; grade: Grade; onDone: () => void }): JSX.Element {
  const game = useGame();
  const scaled = () => (props.place.scales ? projectName(game.model, props.place.scales) : "");
  return (
    <div class="bp-graded" role="status" data-testid="bp-graded">
      <p class={`stampmark bp-stamp grade-${props.grade}`}>{t(`boardend.grade.${props.grade}`)}</p>
      <p class="story">{t("boardend.place.result", { place: tx(props.place.name), grade: t(`boardend.grade.${props.grade}`) })}</p>
      <Show when={scaled()}><p class="small">{t("boardend.place.scales", { project: scaled() })}</p></Show>
      <p class="small">{t("boardend.place.honest")}</p>
      <StampButton onClick={() => props.onDone()} data-testid="bp-done">{t("boardend.place.done")}</StampButton>
    </div>
  );
}

function Missing(props: { onLeave: () => void }): JSX.Element {
  return (
    <div class="bp-sheet sheet">
      <p class="t-3" id="bp-title">{t("boardend.place.missing")}</p>
      <TabButton onClick={() => props.onLeave()}>{t("boardend.place.leave")}</TabButton>
    </div>
  );
}
