/**
 * Your Wales in six chapters (16.5.1): one line for each election term, named by the game from
 * what happened on the board, labelled once as the game's own telling.
 */
import { For, Show, type JSX } from "solid-js";
import { hasKey, lang, t } from "../lang";
import type { BoardModel, ChapterRecord } from "../../engine/api";
import { chapterOf, termsOf } from "./view";

/** A chapter's name in the active language, or the plain fallback for an unknown or unnamed one. */
export function chapterName(model: BoardModel, rec: ChapterRecord | null, from: number, to: number): string {
  if (!rec) return "";
  const c = chapterOf(model, rec, lang());
  const key = `boardend.chapter.${rec.chapter}`;
  return c?.name || (hasKey(key) ? t(key) : t("boardend.chapter.unnamed", { from, to }));
}

export function Chapters(props: { model: BoardModel; chapters: ChapterRecord[] }): JSX.Element {
  const terms = () => termsOf(props.model, props.chapters);
  return (
    <section class="be-chapters" aria-labelledby="be-chapters-title" data-testid="be-chapters">
      <h2 class="t-2" id="be-chapters-title">{t("boardend.chapters.title")}</h2>
      <p class="small be-honest">{t("boardend.chapters.note")}</p>
      <ol class="be-chapter-list">
        <For each={terms()}>
          {(x) => {
            const c = () => (x.rec ? chapterOf(props.model, x.rec, lang()) : null);
            return (
              <li class="be-chapter">
                <span class="data small be-chapter-years">{t("boardend.chapters.years", { from: x.fromYear, to: x.toYear })}</span>
                <span class="t-3 be-chapter-name">{chapterName(props.model, x.rec, x.fromYear, x.toYear) || t("boardend.chapter.unnamed", { from: x.fromYear, to: x.toYear })}</span>
                <Show when={c()?.line}><span class="story-small be-chapter-line">{c()!.line}</span></Show>
              </li>
            );
          }}
        </For>
      </ol>
    </section>
  );
}
