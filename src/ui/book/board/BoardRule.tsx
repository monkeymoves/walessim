// One board rule on its own page: the plain sentence, whether it is a game rule, each parameter
// with its starting value and range, how long it waits, how sure it is, and its sources. Board
// rules are read here, not changed: there are no sliders for the board yet (section 11.1).
import { For, Show, type JSX } from "solid-js";
import { formatNum, pick, t } from "../../../i18n";
import { ConfidenceMark } from "../../parts";
import { BookPage, MarginNote } from "../BookPage";
import { sourceTitle, type BModel, type BRule } from "./data";

type Nav = { folio: number; prev: { href: string; label: string } | null; next: { href: string; label: string } | null };

const num = (n: number | undefined) => (n === undefined ? "" : formatNum(n, { maximumFractionDigits: 4 }));

export function BoardRulePage(props: { m: BModel; rule: BRule } & Nav): JSX.Element {
  const r = () => props.rule;
  const params = () => Object.entries(r().params ?? {});
  const sources = () => r().sources.map((id) => ({ id, s: props.m.sources.find((x) => x.id === id) }));
  return (
    <BookPage
      testid="board-rule-page"
      title={<><span class="data ruleid">{r().id}</span> {pick(r().name)}</>}
      sub={<span class="small">{t("boardend.book.rule.sub", { kind: t(`boardend.book.kind.${r().kind}`), theme: t(`boardend.book.theme.${r().theme}`) })}</span>}
      folio={props.folio} prev={props.prev} next={props.next}
      margin={
        <>
          <MarginNote><p class="small"><ConfidenceMark level={r().confidence as never} /></p></MarginNote>
          <Show when={r().evidence}><MarginNote thread={false}><p class="small">{t(`boardend.book.evidence.${r().evidence}`)}</p></MarginNote></Show>
        </>
      }
    >
      <p class="story">{pick(r().note)}</p>
      <Show when={r().game_rule}><p class="story-small strong">{t("boardend.book.rule.gameRule")}</p></Show>
      <Show when={(r().lag_years ?? 0) > 0}><p class="small">{t("boardend.book.rule.lag", { n: num(r().lag_years) })}</p></Show>
      <Show when={params().length}>
        <h2 class="t-3">{t("boardend.book.rule.params")}</h2>
        <p class="small" data-testid="board-rule-fixed">{t("boardend.book.rule.paramsFixed")}</p>
        <table class="ledger ruleledger">
          <thead>
            <tr>
              <th scope="col">{t("boardend.book.rule.param")}</th>
              <th scope="col">{t("boardend.book.rule.value")}</th>
              <th scope="col">{t("boardend.book.rule.range")}</th>
            </tr>
          </thead>
          <tbody>
            <For each={params()}>
              {([name, p]) => (
                <tr>
                  <th scope="row">{name.replace(/_/g, " ")}<Show when={p.unit}><span class="small"> {pick(p.unit as never)}</span></Show></th>
                  <td class="data">{num(p.default)}</td>
                  <td class="data">{p.min !== undefined && p.max !== undefined ? t("boardend.book.rule.between", { min: num(p.min), max: num(p.max) }) : ""}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <p class="small">{t("boardend.book.rule.tune")}</p>
      </Show>
      <h2 class="t-3">{t("boardend.book.rule.sources")}</h2>
      <Show when={sources().length} fallback={<p class="small">{t("boardend.book.rule.noSources")}</p>}>
        <ul class="small">
          <For each={sources()}>
            {(x) => (
              <li>
                <Show when={x.s?.url} fallback={sourceTitle(x.s, x.id)}>
                  <a class="inklink" href={x.s!.url} rel="noopener noreferrer" target="_blank">{sourceTitle(x.s, x.id)}</a>
                </Show>
                <Show when={x.s?.publisher}>{`. ${x.s!.publisher}`}</Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <p><a class="inklink small" href="#/llyfr/bwrdd">{t("boardend.book.back")}</a></p>
    </BookPage>
  );
}
