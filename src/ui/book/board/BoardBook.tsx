// The board's section of the rule book (docs/design/v2-board.md section 10): the clock, the six
// measures and the real figures that seed them, the links and their sources, every rule (game
// rules marked), every project, event trigger, ending and chapter. Each Why? on the board ends at
// one of these rule pages: #/llyfr/bwrdd/<rule id>.
import { For, Match, Show, Switch, type JSX } from "solid-js";
import { formatNum, Pair, pick, t } from "../../../i18n";
import { ConfidenceMark } from "../../parts";
import { BookPage, MarginNote } from "../BookPage";
import { BoardRulePage } from "./BoardRule";
import { ChaptersPage, EndingsPage, EventsPage, LinksPage, ProjectsPage } from "./BoardLists";
import { boardModel, boardModelError, nameOf, ruleHref, rulesByTheme, sourceTitle, type BModel } from "./data";

export const BOARD_PAGES = ["links", "projects", "events", "endings", "chapters"] as const;
type Nav = { folio: number; prev: { href: string; label: string } | null; next: { href: string; label: string } | null };

/** Every page of the board section in order, for previous and next. */
function order(m: BModel): string[] {
  return ["", ...rulesByTheme(m).flatMap((g) => g.rules.map((r) => r.id)), ...BOARD_PAGES];
}

export function BoardBook(props: { parts: string[] }): JSX.Element {
  const page = () => props.parts[0] ?? "";
  return (
    <Switch fallback={<p class="small" role="status">{t("boardend.book.loading")}</p>}>
      <Match when={boardModelError()}>
        <BookPage title={t("boardend.book.title")} folio={0}><p class="story">{t("boardend.book.notBuilt")}</p></BookPage>
      </Match>
      <Match when={boardModel()}>
        {(m) => {
          const nav = (p: string): Nav => {
            const o = order(m()), i = o.indexOf(p);
            const label = (x: string) => (x === "" ? t("boardend.book.title") : m().rules.find((r) => r.id === x) ? `${x} ${pick(m().rules.find((r) => r.id === x)!.name)}` : t(`boardend.book.${x}.title`));
            const href = (x: string) => (x === "" ? "#/llyfr/bwrdd" : (BOARD_PAGES as readonly string[]).includes(x) ? `#/llyfr/bwrdd/${x}` : ruleHref(x));
            return {
              folio: Math.max(0, i) + 1,
              prev: i > 0 ? { href: href(o[i - 1]!), label: label(o[i - 1]!) } : null,
              next: i >= 0 && i < o.length - 1 ? { href: href(o[i + 1]!), label: label(o[i + 1]!) } : null,
            };
          };
          const rule = () => m().rules.find((r) => r.id === page());
          return (
            <Switch fallback={<BookPage title={t("book.missing.title")} folio={0}><p class="story">{t("book.missing.body")}</p></BookPage>}>
              <Match when={page() === ""}><Contents m={m()} {...nav("")} /></Match>
              <Match when={rule()}>{(r) => <BoardRulePage m={m()} rule={r()} {...nav(r().id)} />}</Match>
              <Match when={page() === "links"}><LinksPage m={m()} {...nav("links")} /></Match>
              <Match when={page() === "projects"}><ProjectsPage m={m()} {...nav("projects")} /></Match>
              <Match when={page() === "events"}><EventsPage m={m()} {...nav("events")} /></Match>
              <Match when={page() === "endings"}><EndingsPage m={m()} {...nav("endings")} /></Match>
              <Match when={page() === "chapters"}><ChaptersPage m={m()} {...nav("chapters")} /></Match>
            </Switch>
          );
        }}
      </Match>
    </Switch>
  );
}

function Contents(props: { m: BModel } & Nav): JSX.Element {
  const g = () => props.m.game;
  const src = (id: string) => sourceTitle(props.m.sources.find((s) => s.id === id), id);
  return (
    <BookPage
      testid="board-book"
      title={t("boardend.book.title")}
      sub={<Pair text={g().region} class="small" />}
      folio={props.folio} prev={props.prev} next={props.next} wide
      margin={<MarginNote thread={false}><p class="small">{t("boardend.book.labels")}</p></MarginNote>}
    >
      <p class="story">{t("boardend.book.intro")}</p>
      <Show when={props.m.meta.fixture}><p class="small">{t("boardend.book.fixture")}</p></Show>

      <h2 class="t-3">{t("boardend.book.clock.title")}</h2>
      <p class="story-small">{t("boardend.book.clock.body", { from: g().first_year, to: g().end_year, steps: g().steps })}</p>
      <p class="story-small">{t("boardend.book.clock.elections", { years: g().election_years.join(", ") })}</p>
      <p class="story-small">{t("boardend.book.clock.keystone", { year: g().keystone_last_start_year })}</p>
      <p class="small">{t("boardend.book.clock.speeds", { list: g().speeds.map((s) => t("boardend.book.clock.speed", { n: formatNum(s.ms_per_step / 1000, { maximumFractionDigits: 2 }) })).join(", ") })}</p>
      <p class="small">{t("boardend.book.gameRule")}</p>

      <h2 class="t-3">{t("boardend.book.measures.title")}</h2>
      <p class="story-small">{t("boardend.book.measures.intro")}</p>
      <table class="ledger ruleledger">
        <thead><tr><th scope="col">{t("boardend.book.measures.measure")}</th><th scope="col">{t("boardend.book.measures.seeds")}</th></tr></thead>
        <tbody>
          <For each={props.m.measures}>
            {(ms) => (
              <tr>
                <th scope="row">{pick(ms.name)}<span class="small"> {pick(ms.note)}</span></th>
                <td>
                  <ul class="small">
                    <For each={ms.indicators}>
                      {(id) => {
                        const ind = props.m.indicators.find((x) => x.id === id);
                        return <li>{ind ? pick(ind.name) : id}{ind ? `, ${ind.year}. ` : ". "}{t("boardend.book.source", { title: ind ? src(ind.source) : "" })}</li>;
                      }}
                    </For>
                  </ul>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <h2 class="t-3">{t("boardend.book.rules.title")}</h2>
      <p class="story-small">{t("boardend.book.rules.intro")}</p>
      <For each={rulesByTheme(props.m)}>
        {(grp) => (
          <section class="ruletheme" aria-labelledby={`bb-theme-${grp.theme}`}>
            <h3 class="t-3" id={`bb-theme-${grp.theme}`}>{t(`boardend.book.theme.${grp.theme}`)}</h3>
            <table class="ledger ruleledger">
              <thead><tr><th scope="col">{t("boardend.book.rules.rule")}</th><th scope="col">{t("boardend.book.rules.kind")}</th><th scope="col">{t("boardend.book.rules.confidence")}</th></tr></thead>
              <tbody>
                <For each={grp.rules}>
                  {(r) => (
                    <tr>
                      <th scope="row">
                        <a class="rulelink" href={ruleHref(r.id)} data-testid={`board-rule-${r.id}`}><span class="data ruleid">{r.id}</span> {pick(r.name)}</a>
                        <Show when={r.game_rule}><span class="small flag"> {t("boardend.book.flag.gameRule")}</span></Show>
                      </th>
                      <td>{t(`boardend.book.kind.${r.kind}`)}</td>
                      <td><ConfidenceMark level={r.confidence as never} bare /></td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </section>
        )}
      </For>

      <h2 class="t-3">{t("boardend.book.more")}</h2>
      <ul class="sectionlinks">
        <For each={BOARD_PAGES}>
          {(p) => <li><a class="inklink" href={`#/llyfr/bwrdd/${p}`}>{t(`boardend.book.${p}.title`)}</a> <span class="small">{t(`boardend.book.${p}.blurb`)}</span></li>}
        </For>
      </ul>
      <p class="small">{t("boardend.book.councils", { list: props.m.game.councils.map((c) => nameOf(props.m, c)).join(", ") })}</p>
    </BookPage>
  );
}
