// The timeline strip, 2026 to 2050, which is also the post rail: every card in the post sits on
// it as a stub at its payout year. The red pin marks now (the origin of every thread); the sealed
// envelope waits at 2050.
import { createMemo, For, Show, type JSX } from "solid-js";
import { t, pick } from "../../i18n";
import { cardIcon, Icon } from "../parts/Icon";
import { weaveUrl } from "../parts/strands";
import { Tooltip } from "../parts/Tooltip";
import { TERM_YEARS, type PostItem } from "../../engine/api";
import { useGame } from "./context";
import { Note } from "./Note";

const Y0 = 2026, Y1 = 2050;
const frac = (year: number) => (Math.min(Math.max(year, Y0), Y1) - Y0) / (Y1 - Y0);
const pos = (year: number) => `${frac(year) * 100}%`;
/** For pieces placed on the strip itself rather than in the inset track. */
const track = (year: number) => `calc(24px + (100% - 88px) * ${frac(year)})`;

export function Timeline(props: { passing?: boolean }): JSX.Element {
  const { game, ui } = useGame();
  const s = () => game.state()!;

  /** Cards in the post, plus the ones being played this term (not yet sealed). */
  const stubs = createMemo(() => {
    const st = s();
    // what has already arrived is told by the arrival strip, not piled on the strip at today's year
    const items: (PostItem & { draft?: boolean })[] = st.post.filter((p) => p.arrivesTerm > st.term).map((p) => ({ ...p }));
    if (st.step === "plan") {
      for (const c of game.draft.cards) {
        const card = game.names.card(c.card);
        if (!card) continue;
        const arrivesTerm = st.term + card.delay;
        items.push({
          card: c.card, playedTerm: st.term, playedYear: st.year, arrivesTerm,
          arrivesYear: 2026 + 4 * arrivesTerm, regions: c.region ? [c.region] : c.regions ?? null,
          countsInLeft: true, draft: true,
        });
      }
    }
    // stack stubs that land in the same year
    const seen = new Map<number, number>();
    return items.map((p) => {
      const k = Math.min(p.arrivesYear, Y1);
      const n = seen.get(k) ?? 0;
      seen.set(k, n + 1);
      return { ...p, stack: n };
    });
  });
  const nowYear = () => {
    const st = s();
    if (st.step === "ended") return Y1;
    if (props.passing || st.step === "changed" || st.step === "election") return Math.min(st.year + 4, Y1);
    return st.year;
  };
  // only a term that really fell is marked "worst" on the strip
  const worst = () => (s().result && s().result!.worstFell !== false ? s().result!.worstTerm : null);

  return (
    <section class="yf-timeline strip" aria-label={t("game.timeline.label")}>
      <ol class="yf-terms">
        <For each={TERM_YEARS}>
          {(y, i) => (
            <li
              class="yf-term"
              classList={{ past: y < s().year || s().step === "ended", now: y === s().year && s().step !== "ended", worst: worst() === i() }}
              style={{ left: pos(y), width: `calc(${pos(y + 4)} - ${pos(y)})` }}
            >
              <span class="yf-term-year data">{y}</span>
              <Show when={worst() === i()}><span class="small yf-term-worst">{t("game.timeline.worst")}</span></Show>
            </li>
          )}
        </For>
      </ol>
      <div class="yf-envelope" title={t("game.timeline.envelope")}>
        <Icon name="envelope" size={26} label={t("game.timeline.envelope")} />
        <span class="data small">2050</span>
      </div>
      <div class="yf-pin" classList={{ sliding: !!props.passing }} style={{ left: track(nowYear()) }} aria-hidden="true">
        <i />
      </div>
      <ul class="yf-stubs" aria-label={t("game.post.label")}>
        <For each={stubs()}>
          {(p) => {
            const card = () => game.names.card(p.card);
            const after = () => p.arrivesYear > Y1;
            return (
              <li
                class="yf-stub"
                classList={{ draft: !!p.draft, after: after() }}
                style={{ left: pos(p.arrivesYear), "--stack": p.stack, "--weave": weaveUrl(card()?.helps?.[0], card()?.helps?.[1]) }}
              >
                <Tooltip
                  heading={game.names.cardName(p.card)}
                  content={<>{t("game.post.stub", { card: game.names.cardName(p.card), played: p.playedYear, lands: p.arrivesYear })}{after() ? ` ${t("game.post.after")}` : ""}</>}
                  placement="above"
                >
                  <span class="yf-stub-face" tabIndex={0} role="img" aria-label={`${t("game.post.stub", { card: game.names.cardName(p.card), played: p.playedYear, lands: p.arrivesYear })}${after() ? `. ${t("game.post.after")}` : ""}`}>
                    <i class="yf-stub-weave" />
                    <Icon name={card() ? cardIcon(card()!) : "signal"} size={18} />
                  </span>
                </Tooltip>
              </li>
            );
          }}
        </For>
      </ul>
      <Show when={s().step === "plan" && game.draft.cards.length > 0}>
        <Note id="post" when={ui.guide.hasSeen("handoff")} class="yf-note-post" placement="above">{t("game.onboard.post")}</Note>
      </Show>
      <span class="sr-only" aria-live="polite">{ui.announce()}</span>
      <Show when={s().opening?.arrivals.length && s().step === "opening"}>
        <span class="sr-only">{t("game.opening.arrived")}: {s().opening!.arrivals.map((a) => pick(game.names.cardText(a.card))).join(", ")}</span>
      </Show>
    </section>
  );
}
