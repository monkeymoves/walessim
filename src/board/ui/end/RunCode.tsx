/**
 * The run code and Play again (16.5.3 item 8). The code is the game number, the start and every
 * action with its step: anyone who opens it replays the same game and sees this end screen. A code
 * from the first version of the board is refused with a plain line.
 */
import { createSignal, Show, type JSX } from "solid-js";
import { t } from "../lang";
import { StampButton, TabButton } from "../../../ui/parts";
import * as api from "../../engine/api";
import type { BoardModel, BoardState, Ending } from "../../engine/api";
import { tx } from "../words";

/** Read a pasted code, or say plainly why not. */
export function openCode(model: BoardModel, raw: string): { state: BoardState } | { error: string } {
  const code = raw.trim();
  if (!code) return { error: t("boardend.code.empty") };
  if (/^b1\./i.test(code)) return { error: t("boardend.code.old") };
  try {
    const state = api.decodeRun(model, code);
    return state.phase === "ended" ? { state } : { error: t("boardend.code.unfinished") };
  } catch {
    return { error: t("boardend.code.bad") };
  }
}

export interface RunCodeProps {
  model: BoardModel;
  state: BoardState;
  ending: Ending;
  /** True while showing a run opened from a code rather than the player's own. */
  opened: boolean;
  onOpen: (s: BoardState) => void;
  onBack: () => void;
  onAgain: () => void;
}

export function RunCode(props: RunCodeProps): JSX.Element {
  const code = () => api.encodeRun(props.state);
  const [copied, setCopied] = createSignal<string>("");
  const [paste, setPaste] = createSignal("");
  const [error, setError] = createSignal("");
  const route = () => tx(props.model.endings.find((e) => e.id === props.ending.notBuilt.id)?.route);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code());
      setCopied(t("boardend.code.copied"));
    } catch {
      setCopied(t("boardend.code.copyByHand"));
    }
  };
  const open = () => {
    const out = openCode(props.model, paste());
    if ("error" in out) { setError(out.error); return; }
    setError("");
    setPaste("");
    props.onOpen(out.state);
  };

  return (
    <section class="be-run" aria-labelledby="be-run-title" data-testid="be-run">
      <h2 class="t-2" id="be-run-title">{t("boardend.code.title")}</h2>
      <p class="small">{t("boardend.code.what", { n: String(props.state.gameNumber) })}</p>
      <label class="be-code-label small" for="be-code">{t("boardend.code.yours")}</label>
      <textarea id="be-code" class="be-code data" readonly rows="3" value={code()} data-testid="be-code" onFocus={(e) => e.currentTarget.select()} />
      <div class="be-run-row">
        <TabButton onClick={copy} data-testid="be-copy">{t("boardend.code.copy")}</TabButton>
        <span class="small" role="status">{copied()}</span>
      </div>

      <h3 class="t-3">{t("boardend.code.openTitle")}</h3>
      <label class="be-code-label small" for="be-paste">{t("boardend.code.paste")}</label>
      <textarea id="be-paste" class="be-code data" rows="2" value={paste()} onInput={(e) => setPaste(e.currentTarget.value)} data-testid="be-paste" />
      <div class="be-run-row">
        <TabButton onClick={open} data-testid="be-open">{t("boardend.code.open")}</TabButton>
        <Show when={props.opened}>
          <TabButton onClick={() => props.onBack()} data-testid="be-back">{t("boardend.code.back")}</TabButton>
        </Show>
      </div>
      <Show when={error()}><p class="small be-error" role="alert" data-testid="be-code-error">{error()}</p></Show>

      <div class="be-again">
        <Show when={route()}><p class="story-small">{t("boardend.again.prompt", { route: route() })}</p></Show>
        <StampButton onClick={() => props.onAgain()} data-testid="bw-again">{t("boardend.again.go")}</StampButton>
        <p class="small">{t("boardend.again.note")}</p>
      </div>
    </section>
  );
}
