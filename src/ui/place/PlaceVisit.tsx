// A place visit: the map folds down into the place, the board takes the rail, the player
// places threads, confirms, sees the grade judged by the engine across runs, and folds back up.
// The grade is never previewed as a "right answer": the tests are named, not scored, until the
// choice is made.
import { createResource, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { Pair, t } from "../../i18n";
import { loadPlace, type PlaceData } from "../../map";
import { type VisitChoice, type VisitOutcome } from "../../engine/api";
import { gradeVisit } from "../game/engine";
import { StampButton, TabButton } from "../parts/Buttons";
import { useGame } from "../game/context";
import { RhonddaBoard } from "./Rhondda";
import { BethesdaBoard } from "./Bethesda";

const cache = new Map<string, Promise<PlaceData>>();
export function placeData(id: "rhondda" | "bethesda"): Promise<PlaceData> {
  const base = (import.meta.env?.BASE_URL ?? "/") + "data/places/";
  if (!cache.has(id)) cache.set(id, loadPlace(id, base));
  return cache.get(id)!;
}

export interface BoardApi {
  threads: () => string[];
  /** True once the choice is confirmed: floating cards close. */
  closed: () => boolean;
  max: number;
  toggle: (id: string) => void;
}

export function PlaceVisit(): JSX.Element {
  const { game, ui } = useGame();
  const offer = () => game.state()!.visitOffer!;
  const id = offer().place;
  const board = game.names.place(id);
  const [data] = createResource(() => placeData(id));
  const [threads, setThreads] = createSignal<string[]>([]);
  const [result, setResult] = createSignal<VisitOutcome | null>(null);
  const [busy, setBusy] = createSignal(false);
  /** Set when the grade is shown, so the board's floating cards close. */
  const [closed, setClosed] = createSignal(false);
  const max = offer().threads;

  onMount(async () => {
    const m = ui.map();
    const p = await placeData(id);
    if (!m) return;
    m.warmPlace(p);
    if (m.view === "national") await m.enterPlace(p, { focusLa: board?.la, ariaLabel: t("place.common.folding", { place: game.names.placeName(id) }) });
  });
  onCleanup(() => {
    const m = ui.map();
    if (m && m.view === "place") void m.exitPlace();
    m?.place.setSelectable([]);
    m?.place.setSelected([]);
    m?.place.setTokens([]);
    m?.place.setBelowZone(null);
  });

  const toggle = (tid: string) => {
    const cur = threads();
    if (result()) return;
    const next = cur.includes(tid) ? cur.filter((x) => x !== tid) : cur.length < max ? [...cur, tid] : cur;
    setThreads(next);
    ui.map()?.place.setTokens(next);
    ui.setAnnounce(t("place.common.threads_placed", { placed: next.length, total: max }));
  };

  const choice = (): VisitChoice => ({ place: id, threads: threads() });

  function confirm(): void {
    const s = game.state();
    if (!s) return;
    try {
      setResult(gradeVisit(game.model, s, choice()));
      setClosed(true);
    } catch (e) { console.warn(e); finish(choice()); }
  }

  async function finish(c: VisitChoice): Promise<void> {
    if (busy()) return;
    setBusy(true);
    const m = ui.map();
    if (m && m.view === "place") await m.exitPlace();
    ui.setInPlace(false);
    game.act({ type: "visit", choice: c });
  }

  const api: BoardApi = { threads, max, toggle, closed };

  return (
    <div class="pl-visit">
      <div class="pl-board sheet">
        <header class="pl-head">
          <Pair text={board?.name} as="h2" class="t-1" />
          <Show when={offer().triggeredBy.some((c) => c !== "curveball")}>
            <p class="small">{t("place.common.trigger", { card: game.names.list(offer().triggeredBy.filter((c) => c !== "curveball").map((c) => game.names.cardName(c))) })}</p>
          </Show>
        </header>
        <Show when={data()} fallback={<p class="small">{t("place.common.folding", { place: game.names.placeName(id) })}</p>}>
          <Show when={id === "rhondda"} fallback={<BethesdaBoard data={data()!} api={api} />}>
            <RhonddaBoard data={data()!} api={api} />
          </Show>
        </Show>
      </div>
      <Show when={!result()}>
        <div class="pl-foot sheet">
          <Spools placed={threads().length} max={max} />
          <div class="yf-actions">
            <TabButton onClick={() => finish(null)} disabled={busy()}>{t("place.common.back")}</TabButton>
            <StampButton class="yf-go" disabled={threads().length === 0 || busy()} onClick={confirm}>{t("place.common.confirm")}</StampButton>
          </div>
          <p class="small">{t("place.common.back_note")}</p>
        </div>
      </Show>
      <Show when={result()}>
        <Portal mount={document.querySelector(".yf-stage") ?? document.body}>
          <GradeSheet result={result()!} onDone={() => finish(choice())} busy={busy()} />
        </Portal>
      </Show>
    </div>
  );
}

/** The thread tokens: one spool per thread, wound when placed. */
export function Spools(props: { placed: number; max: number }): JSX.Element {
  return (
    <div class="pl-spools" role="img" aria-label={t("place.common.threads_placed", { placed: props.placed, total: props.max })}>
      <For each={Array.from({ length: props.max }, (_, i) => i < props.placed)}>
        {(used) => (
          <svg viewBox="0 0 16 24" width="16" height="24" class="pl-spool" classList={{ used }} aria-hidden="true">
            <rect x="0" y="0" width="16" height="3" />
            <rect x="0" y="21" width="16" height="3" />
            <rect x="3" y="3" width="10" height="18" class="wind" />
          </svg>
        )}
      </For>
      <span class="data label">{t("place.common.threads_placed", { placed: props.placed, total: props.max })}</span>
    </div>
  );
}

function GradeSheet(props: { result: VisitOutcome; onDone: () => void; busy: boolean }): JSX.Element {
  const { game } = useGame();
  const board = game.names.place(props.result.place);
  const testName = (id: string) => {
    const tt = board?.tests.find((x) => x.id === id);
    if (tt) return game.names.text(tt.name);
    const k = `place.${props.result.place}.tests.${id}`;
    return t(k);
  };
  return (
    <aside class="pl-grade sheet-held" role="dialog" aria-labelledby="pl-grade-title">
      <h2 id="pl-grade-title" class="t-2">{t("place.common.result", { place: game.names.placeName(props.result.place), grade: "" })}</h2>
      <p class="stampmark pl-grade-stamp">{t(`game.grade.${props.result.grade}`)}</p>
      <ul class="pl-tests">
        <For each={props.result.tests}>
          {(x) => (
            <li>
              <span class="pl-test-mark" classList={{ pass: x.pass }} aria-hidden="true" />
              <span class="strong">{testName(x.id)}</span>
              <span class="small">{x.pass ? t("place.common.held") : t("place.common.failed")}. {t("place.common.held_share", { pct: Math.round(x.share * 10) })}</span>
            </li>
          )}
        </For>
      </ul>
      <p class="small">{t("place.common.tests_note")}</p>
      <StampButton class="yf-go" disabled={props.busy} onClick={props.onDone}>{t("place.common.continue")}</StampButton>
    </aside>
  );
}
