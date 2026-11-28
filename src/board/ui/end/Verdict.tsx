/**
 * The result, first thing on the end screen (playtest 8, must-fix 1 and should-fix 13): the plain
 * verdict, both comparisons in big figures (against 2026, and against doing nothing: the same game
 * on autopilot), how the years felt, then your record: the promise and whether you kept it, the
 * place furthest behind in 2026 and in 2050, the elections and the deals. In a hard game it ends
 * on the turns you could have taken, so a loss reads as a story with a fork in it, not a grade.
 */
import { For, Show, type JSX } from "solid-js";
import { formatNum, t } from "../lang";
import * as api from "../../engine/api";
import type { BoardModel, BoardState, Ending, Frame } from "../../engine/api";
import { councilName, fill, listOf, outOf10, projectName, tx } from "../words";
import { dealsOf, electionsOf, shownGap, hardGame, littleOf, lowestIn, promiseOf, turnsNotTaken, verdictOf, type Turn } from "./record";
import { bandKey } from "./view";

const whole = (n: number) => formatNum(Math.round(n));
/** "+6", "−3" or "0": whole points, with a true minus sign. */
const signedWhole = (n: number) => { const r = Math.round(n); return r > 0 ? `+${formatNum(r)}` : r < 0 ? `−${formatNum(-r)}` : "0"; };

/** The share of people an election needs (rule P4), from the model. */
const winShareOf = (model: BoardModel): number => model.rules.find((r) => r.id === "P4")?.params["win_share"]?.default ?? 0.5;

export function Verdict(props: { model: BoardModel; state: BoardState; ending: Ending; frames: Frame[] }): JSX.Element {
  const model = props.model;
  const v = verdictOf(props.ending, littleOf(model));
  const promise = promiseOf(model, props.state);
  const then = lowestIn(model, props.frames[0]!);
  const now = lowestIn(model, props.frames[props.frames.length - 1]!);
  const elections = electionsOf(model, props.state);
  const deals = dealsOf(props.state);
  const hard = hardGame(props.state, v);
  const shares = (() => {
    try { return Object.fromEntries(api.election(model, props.state).councils.map((c) => [c.code, c.peopleShare])); } catch { return {}; }
  })();
  const turns = hard ? turnsNotTaken(model, props.state, shares, winShareOf(model)) : [];
  // the big "+5" and the words beside it come from the same whole numbers the screen shows
  const gapNothing = shownGap(v.autopilot, v.left, v.vsNothing);
  const dNothing = v.vsNothing === "behind" ? -gapNothing : v.vsNothing === "ahead" ? gapNothing : Math.round(v.left) - Math.round(v.autopilot);
  return (
    <section class="be-verdict" aria-labelledby="be-verdict-title" data-testid="be-verdict">
      <p class="label" id="be-verdict-title">{t("boardend.verdict.label", { year: model.game.end_year })}</p>
      <p class="be-verdict-line" data-testid="be-band">{t(bandKey(props.ending.scores.band))}</p>
      <p class="story">{t(`boardend.verdict.nothing.${v.vsNothing}`, { d: formatNum(gapNothing) })}</p>
      <div class="be-scores">
        <div class="be-score" data-testid="be-vs-start">
          <p class="label">{t("boardend.verdict.vsStart")}</p>
          <p class="be-score-big" aria-label={t("boardend.verdict.vsStartAria", { start: whole(v.start), left: whole(v.left) })}>
            <span>{whole(v.start)}</span><span class="be-score-to" aria-hidden="true">{" → "}</span><span>{whole(v.left)}</span>
          </p>
          <p class="small">{t(`boardend.verdict.start.${v.vsStart}`, { d: formatNum(shownGap(v.start, v.left, v.vsStart)) })}</p>
        </div>
        <div class="be-score" data-testid="be-vs-nothing">
          <p class="label">{t("boardend.verdict.vsNothing")}</p>
          <p class="be-score-big" aria-label={t("boardend.verdict.vsNothingAria", { d: signedWhole(dNothing) })}>{signedWhole(dNothing)}</p>
          <p class="small">{t("boardend.verdict.nothingNote", { n: whole(v.autopilot) })}</p>
        </div>
      </div>
      <p class="small">{t("boardend.verdict.life", { life: whole(v.life) })}</p>

      <dl class="be-record" aria-label={t("boardend.record.title")} data-testid="be-record">
        <Show when={promise}>
          <div class="be-record-row">
            <dt class="label">{t("boardend.record.promise")}</dt>
            <dd class="story-small">
              {tx(promise!.text)}{" "}
              <span class="strong">{promise!.kept === true ? t("boardend.record.promiseKept", { year: promise!.byYear })
                : promise!.kept === false ? t("boardend.record.promiseBroken", { year: promise!.byYear }) : t("boardend.record.promiseOpen")}</span>
            </dd>
          </div>
        </Show>
        <Show when={then && now}>
          <div class="be-record-row">
            <dt class="label">{t("boardend.record.lowest")}</dt>
            <dd class="story-small">{t("boardend.record.lowestValue", {
              then: councilName(model, then!.code), thenScore: outOf10(then!.score, false), now: councilName(model, now!.code), nowScore: outOf10(now!.score),
            })}</dd>
          </div>
        </Show>
        <div class="be-record-row">
          <dt class="label">{t("boardend.record.elections")}</dt>
          <dd class="story-small">
            <Show when={elections.length} fallback={t("boardend.record.noElections")}>
              <ul class="be-record-list">
                <For each={elections}>{(e) => <li>{t("boardend.record.election", { year: e.year, result: t(`boardend.record.result.${e.result}`), n: e.backers, total: e.councils })}</li>}</For>
              </ul>
            </Show>
          </dd>
        </div>
        <Show when={deals.length}>
          <div class="be-record-row">
            <dt class="label">{t("boardend.record.deals")}</dt>
            <dd class="story-small">
              <ul class="be-record-list">
                <For each={deals}>{(d) => <li>{t(d.kept ? "boardend.record.dealKept" : "boardend.record.dealBroken", { council: councilName(model, d.council) })}</li>}</For>
              </ul>
            </dd>
          </div>
        </Show>
      </dl>

      <Show when={turns.length}>
        <div class="be-turns" data-testid="be-turns">
          <h2 class="t-3">{t("boardend.turns.title")}</h2>
          <p class="story-small">{t("boardend.turns.intro")}</p>
          <ul class="be-turn-list">
            <For each={turns}>{(x) => <li class="story-small">{turnWords(model, x)}</li>}</For>
          </ul>
          <p class="small be-honest">{t("boardend.turns.note")}</p>
        </div>
      </Show>
    </section>
  );
}

/** One turn not taken, in words. */
export function turnWords(model: BoardModel, x: Turn): string {
  switch (x.kind) {
    case "election": {
      const share = formatNum(Math.round(x.share * 100));
      return x.needed.length
        ? t("boardend.turns.election", { year: x.year, share, councils: listOf(x.needed.map((c) => councilName(model, c))) })
        : t("boardend.turns.electionAlone", { year: x.year, share });
    }
    case "event": {
      // the event's own landed sentence, filled for where it landed; its name when that cannot be said whole
      const def = model.events.find((e) => e.id === x.event);
      const said = def ? fill(model, tx(def.landed), x.councils, api.riverAt(model, x.councils[0] ?? x.council, x.councils[1])) : "";
      // an empty slot (no river here) leaves a gap: "{x}", two spaces, or a space before a stop
      const what = said && !/\{\w+\}|\s{2}|\s[.,]|^\s/.test(said)
        ? said : t("boardend.turns.eventNamed", { council: councilName(model, x.council), event: tx(def?.name ?? x.event) });
      return t("boardend.turns.event", { year: x.year, what, project: projectName(model, x.project) });
    }
    case "promise":
      return t("boardend.turns.promise", { year: x.year, text: tx(x.text) });
  }
}
