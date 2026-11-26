// One page of the bound book: a sheet with a story column and an outer margin for notes,
// Title 1 at the head over a 3px ink rule, the folio and short title at the foot, and
// previous and next as tabs.
import { Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import { TabButton } from "../parts";
import { navigate } from "../shell/router";

export interface BookPageProps {
  title: JSX.Element;
  /** A line under the title (the other language, or a subtitle). */
  sub?: JSX.Element;
  margin?: JSX.Element;
  children: JSX.Element;
  folio: number;
  prev?: { href: string; label: string } | null;
  next?: { href: string; label: string } | null;
  wide?: boolean;
  testid?: string;
}

export function BookPage(props: BookPageProps): JSX.Element {
  return (
    <article class="bookpage sheet" classList={{ wide: !!props.wide }} data-testid={props.testid}>
      <header class="bookpage-head">
        <h1 class="t-1 bookpage-title">{props.title}</h1>
        <Show when={props.sub}>
          <div class="bookpage-sub">{props.sub}</div>
        </Show>
      </header>
      <div class="bookpage-body">
        <div class="bookpage-text">{props.children}</div>
        <aside class="bookpage-margin" aria-label={t("book.margin")}>{props.margin}</aside>
      </div>
      <footer class="bookpage-foot">
        <span class="small folio data">{t("book.folio", { n: props.folio })}</span>
        <span class="small bookpage-short" lang="cy">Llyfr y model</span>
        <span class="bookpage-turn">
          <Show when={props.prev}>
            <TabButton onClick={() => navigate(props.prev!.href)} aria-label={t("book.prevAria", { name: props.prev!.label })}>{t("book.prev")}</TabButton>
          </Show>
          <Show when={props.next}>
            <TabButton onClick={() => navigate(props.next!.href)} aria-label={t("book.nextAria", { name: props.next!.label })}>{t("book.next")}</TabButton>
          </Show>
        </span>
      </footer>
    </article>
  );
}

/** A margin note tied to the text by a short red thread. */
export function MarginNote(props: { children: JSX.Element; thread?: boolean }): JSX.Element {
  return <div class="marginnote" classList={{ threaded: props.thread !== false }}>{props.children}</div>;
}
