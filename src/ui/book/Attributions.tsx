// "Attributions and licences": every dataset with the exact attribution string its publisher asks
// for and its licence. The strings are legal acknowledgements and stay in their original
// language (lang="en"); only the labels around them follow the interface language.
import { For, Show, type JSX } from "solid-js";
import { t } from "../../i18n";
import type { BookPageProps } from "./BookPage";
import { BookPage, MarginNote } from "./BookPage";
import { ATTRIBUTIONS } from "./licences";

type Nav = Pick<BookPageProps, "folio" | "prev" | "next">;

export function AttributionsPage(props: Nav): JSX.Element {
  return (
    <BookPage
      title={t("book.attributions.title")}
      folio={props.folio}
      prev={props.prev}
      next={props.next}
      testid="attributions-page"
      wide
      margin={
        <>
          <MarginNote thread={false}><p class="small">{t("book.attributions.margin")}</p></MarginNote>
          <MarginNote thread={false}><p class="small">{t("book.attributions.logos")}</p></MarginNote>
        </>
      }
    >
      <p class="story">{t("book.attributions.intro")}</p>
      <ol class="attriblist">
        <For each={ATTRIBUTIONS}>
          {(a) => (
            <li id={`attr-${a.id}`} classList={{ unconfirmed: !!a.unconfirmed }}>
              <p class="strong" lang="en">{a.dataset}</p>
              <p class="small">
                <span class="label">{t("book.attributions.licence")}</span>{" "}
                <Show when={a.licenceUrl} fallback={<span lang="en">{a.licence}</span>}>
                  <a class="threadlink" lang="en" href={a.licenceUrl!} target="_blank" rel="noopener noreferrer">{a.licence}</a>
                </Show>
              </p>
              <Show when={a.unconfirmed}>
                <p class="small attrib-warn">{t("book.attributions.unconfirmed")}</p>
              </Show>
              <p class="small"><span class="label">{t("book.attributions.string")}</span></p>
              <blockquote class="attrib-string" lang="en">{a.attribution}</blockquote>
              <p class="small"><a class="threadlink" href={a.url} target="_blank" rel="noopener noreferrer">{t("book.attributions.checked")}</a></p>
            </li>
          )}
        </For>
      </ol>
      <p class="small">{t("book.attributions.checkedOn")}</p>
    </BookPage>
  );
}
