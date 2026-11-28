// The board's lists in the rule book: links and their sources, projects by branch and tier with
// what opens each tier, events and what triggers them, endings and chapters with their tests.
import { For, onMount, Show, type JSX } from "solid-js";
import { formatNum, pick, t } from "../../../i18n";
import { BookPage } from "../BookPage";
import { describe, nameOf, ruleHref, sourceTitle, type BCond, type BModel } from "./data";

type Nav = { folio: number; prev: { href: string; label: string } | null; next: { href: string; label: string } | null };

/** The row id of one project or event, so a Why? link opens the page at it (#/llyfr/bwrdd/projects/<id>). */
export const itemAnchor = (id: string): string => `bwb-item-${id}`;

/** Scroll the page to the item a link named, and mark it. */
function focusItem(id: string | undefined): void {
  if (!id) return;
  onMount(() => {
    const row = document.getElementById(itemAnchor(id));
    if (!row) return;
    row.classList.add("bwb-focus");
    row.scrollIntoView({ block: "center" });
  });
}

function Conds(props: { m: BModel; when: BCond[] }): JSX.Element {
  return (
    <Show when={props.when.length} fallback={<span class="small">{t("boardend.book.always")}</span>}>
      <ul class="small"><For each={props.when}>{(c) => <li>{describe(props.m, c)}</li>}</For></ul>
    </Show>
  );
}

export function LinksPage(props: { m: BModel } & Nav): JSX.Element {
  const kinds = ["commute", "rail", "river"];
  const of = (k: string) => props.m.links.filter((l) => l.kind === k);
  const src = (ids: string[]) => [...new Set(ids)].map((id) => sourceTitle(props.m.sources.find((s) => s.id === id), id)).join("; ");
  return (
    <BookPage title={t("boardend.book.links.title")} folio={props.folio} prev={props.prev} next={props.next} testid="board-links" wide>
      <p class="story">{t("boardend.book.links.intro")}</p>
      <For each={kinds}>
        {(k) => (
          <section class="ruletheme">
            <h2 class="t-3">{t(`boardend.book.links.${k}`)}</h2>
            <p class="small">{t("boardend.book.links.count", { n: of(k).length })} {t("boardend.book.source", { title: src(of(k).flatMap((l) => l.sources)) })}</p>
            <table class="ledger ruleledger">
              <thead><tr><th scope="col">{t("boardend.book.links.from")}</th><th scope="col">{t("boardend.book.links.to")}</th><th scope="col">{t("boardend.book.links.share")}</th></tr></thead>
              <tbody>
                <For each={of(k)}>
                  {(l) => (
                    <tr>
                      <th scope="row">{nameOf(props.m, l.from)}<Show when={l.name}><span class="small"> {pick(l.name)}</span></Show></th>
                      <td>{nameOf(props.m, l.to)}</td>
                      <td class="data">{l.share !== undefined ? t("boardend.book.links.inHundred", { n: formatNum(l.share * 100, { maximumFractionDigits: 1 }) }) : ""}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </section>
        )}
      </For>
    </BookPage>
  );
}

export function ProjectsPage(props: { m: BModel; item?: string } & Nav): JSX.Element {
  focusItem(props.item);
  const gate = (id: string | undefined) => (id ? props.m.rules.find((r) => r.id === id) : undefined);
  return (
    <BookPage title={t("boardend.book.projects.title")} folio={props.folio} prev={props.prev} next={props.next} testid="board-projects" wide>
      <p class="story">{t("boardend.book.projects.intro")}</p>
      <For each={props.m.branches}>
        {(b) => (
          <section class="ruletheme">
            <h2 class="t-3">{pick(b.name)}</h2>
            <p class="small">{pick(b.note)}</p>
            <For each={b.tiers}>
              {(tier) => (
                <>
                  <h3 class="label">{t("boardend.book.projects.tier", { n: tier.tier })}</h3>
                  <Show when={tier.opens.length}>
                    <Show
                      when={gate(tier.rule)}
                      fallback={<><p class="small">{t("boardend.book.projects.opens")}</p><Conds m={props.m} when={tier.opens} /></>}
                    >
                      {(r) => <p class="small">{t("boardend.book.projects.opens")} <a class="rulelink" href={ruleHref(r().id)}>{pick(r().note)}</a></p>}
                    </Show>
                  </Show>
                  <table class="ledger ruleledger">
                    <tbody>
                      <For each={props.m.projects.filter((p) => p.branch === b.id && p.tier === tier.tier)}>
                        {(p) => (
                          <tr id={itemAnchor(p.id)}>
                            <th scope="row">{pick(p.name)}<span class="small"> {pick(p.what)}</span></th>
                            <td class="data">{t("boardend.book.projects.cost", { n: p.cost })}</td>
                            <td class="data">{t("boardend.book.projects.years", { n: formatNum(p.build_years, { maximumFractionDigits: 2 }) })}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </>
              )}
            </For>
          </section>
        )}
      </For>
      <p class="small">{t("boardend.book.projects.gameRule")}</p>
    </BookPage>
  );
}

export function EventsPage(props: { m: BModel; item?: string } & Nav): JSX.Element {
  focusItem(props.item);
  return (
    <BookPage title={t("boardend.book.events.title")} folio={props.folio} prev={props.prev} next={props.next} testid="board-events" wide>
      <p class="story">{t("boardend.book.events.intro")}</p>
      <table class="ledger ruleledger">
        <thead><tr><th scope="col">{t("boardend.book.events.event")}</th><th scope="col">{t("boardend.book.events.when")}</th></tr></thead>
        <tbody>
          <For each={props.m.events}>
            {(e) => (
              <tr id={itemAnchor(e.id)}>
                <th scope="row">{pick(e.name)}<span class="small"> {t(e.origin === "outside" ? "boardend.book.events.outside" : e.good ? "boardend.book.events.good" : "boardend.book.events.grown")}</span></th>
                <td><Conds m={props.m} when={e.trigger} /></td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </BookPage>
  );
}

export function EndingsPage(props: { m: BModel } & Nav): JSX.Element {
  const sorted = () => [...props.m.endings].sort((a, b) => b.priority - a.priority);
  return (
    <BookPage title={t("boardend.book.endings.title")} folio={props.folio} prev={props.prev} next={props.next} testid="board-endings" wide>
      <p class="story">{t("boardend.book.endings.intro")}</p>
      <table class="ledger ruleledger">
        <tbody>
          <For each={sorted()}>
            {(e) => (
              <tr>
                <th scope="row">{pick(e.name)}<span class="small"> {pick(e.summary)}</span></th>
                <td><Conds m={props.m} when={e.when} /></td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </BookPage>
  );
}

export function ChaptersPage(props: { m: BModel } & Nav): JSX.Element {
  const list = () => [...(props.m.chapters ?? [])].sort((a, b) => b.priority - a.priority);
  return (
    <BookPage title={t("boardend.book.chapters.title")} folio={props.folio} prev={props.prev} next={props.next} testid="board-chapters" wide>
      <p class="story">{t("boardend.book.chapters.intro")}</p>
      <Show when={list().length} fallback={<p class="small">{t("boardend.book.chapters.none")}</p>}>
        <table class="ledger ruleledger">
          <tbody>
            <For each={list()}>
              {(c) => (
                <tr>
                  <th scope="row">{pick(c.name)}<span class="small"> {pick(c.line)}</span></th>
                  <td><Conds m={props.m} when={c.when} /></td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </BookPage>
  );
}
