// Llyfr y model: the public, readable model. A bound book on the board with divider tabs down
// its edge: contents (every rule, grouped by theme, placeholders first), one rule per page with
// its parameters, then indicators, strands, cards, curveballs and sources.
import { createMemo, For, Match, Show, Switch, type JSX } from "solid-js";
import { Pair, pick, t, textOf, tn } from "../../i18n";
import type { CompiledModel } from "../../model/schema";
import { ConfidenceMark, Snip, TabButton } from "../parts";
import { BookPage, MarginNote } from "./BookPage";
import { pageOrder, paramLabel, rulesByTheme, SECTIONS, type Section } from "./names";
import { clearOverride, isModified, overrides, paramOf, resetOverrides } from "./overrides";
import { AttributionsPage } from "./Attributions";
import { RulePage } from "./RulePage";
import { CardsPage, CurveballsPage, IndicatorsPage, SourcesPage, StrandsPage } from "./Sections";
// the board (v2): its own section, read from public/board-model.json (docs/design/v2-board.md 10)
import { BoardBook } from "./board/BoardBook";
import "./book.css";

export function Book(props: { model: CompiledModel; parts: string[] }): JSX.Element {
  const order = createMemo(() => pageOrder(props.model));
  const page = () => props.parts[0] ?? "";
  const folio = (p: string) => Math.max(0, order().indexOf(p)) + 1;
  const labelOf = (p: string): string => {
    if (p === "") return t("book.contents");
    const r = props.model.rules.find((x) => x.id === p);
    if (r) return `${r.id} ${pick(r.name)}`;
    return t(`book.${p}.title`);
  };
  const nav = (p: string) => {
    const i = order().indexOf(p);
    const prev = i > 0 ? order()[i - 1]! : null;
    const next = i >= 0 && i < order().length - 1 ? order()[i + 1]! : null;
    return {
      folio: folio(p),
      prev: prev != null ? { href: `#/llyfr/${prev}`, label: labelOf(prev) } : null,
      next: next != null ? { href: `#/llyfr/${next}`, label: labelOf(next) } : null,
    };
  };
  const rule = () => props.model.rules.find((r) => r.id === page());
  const section = () => (SECTIONS as readonly string[]).includes(page()) ? (page() as Section) : null;
  return (
    <div class="book">
      <nav class="bookindex" aria-label={t("book.index")}>
        <a class="bookindex-tab" href="#/llyfr" aria-current={page() === "" ? "page" : undefined}>{t("book.contents")}</a>
        <For each={rulesByTheme(props.model)}>
          {(g) => (
            <a class="bookindex-tab" href={`#/llyfr/${g.rules[0]!.id}`} aria-current={rule()?.theme === g.theme ? "page" : undefined}>
              {t(`book.theme.${g.theme}`)}
            </a>
          )}
        </For>
        <For each={SECTIONS}>
          {(s) => <a class="bookindex-tab" href={`#/llyfr/${s}`} aria-current={page() === s ? "page" : undefined}>{t(`book.${s}.title`)}</a>}
        </For>
        <a class="bookindex-tab" href="#/llyfr/bwrdd" aria-current={page() === "bwrdd" ? "page" : undefined} data-testid="book-board-tab">{t("boardend.book.tab")}</a>
        <Show when={isModified()}>
          <a class="bookindex-tab changed" href="#/llyfr/changed" aria-current={page() === "changed" ? "page" : undefined}>{t("book.changed.title")}</a>
        </Show>
      </nav>
      <div class="bookdesk">
        <Switch fallback={<Missing />}>
          <Match when={page() === ""}>
            <Contents model={props.model} {...nav("")} />
          </Match>
          <Match when={rule()}>
            {(r) => <RulePage model={props.model} rule={r()} {...nav(r().id)} />}
          </Match>
          <Match when={page() === "changed"}>
            <Changed model={props.model} />
          </Match>
          <Match when={section() === "indicators"}><IndicatorsPage model={props.model} {...nav("indicators")} /></Match>
          <Match when={section() === "strands"}><StrandsPage model={props.model} {...nav("strands")} /></Match>
          <Match when={section() === "cards"}><CardsPage model={props.model} {...nav("cards")} /></Match>
          <Match when={section() === "curveballs"}><CurveballsPage model={props.model} {...nav("curveballs")} /></Match>
          <Match when={section() === "sources"}><SourcesPage model={props.model} focus={props.parts[1]} {...nav("sources")} /></Match>
          <Match when={section() === "attributions"}><AttributionsPage {...nav("attributions")} /></Match>
          <Match when={page() === "bwrdd"}><BoardBook parts={props.parts.slice(1)} /></Match>
        </Switch>
      </div>
    </div>
  );
}

function Missing(): JSX.Element {
  return (
    <BookPage title={t("book.missing.title")} folio={0}>
      <p class="story">{t("book.missing.body")}</p>
      <p><a class="inklink" href="#/llyfr">{t("book.contents")}</a></p>
    </BookPage>
  );
}

function Contents(props: { model: CompiledModel; folio: number; prev: null | { href: string; label: string }; next: null | { href: string; label: string } }): JSX.Element {
  const placeholders = () => props.model.rules.filter((r) => r.placeholder).length;
  return (
    <BookPage
      testid="book-contents"
      title={<Pair text={textOf("book.title")} />}
      folio={props.folio}
      prev={props.prev}
      next={props.next}
      wide
      margin={
        <>
          <MarginNote thread={false}>
            <p class="small">{t("book.contentsMargin")}</p>
          </MarginNote>
          <MarginNote thread={false}>
            <p class="small">{t("book.licence")}</p>
          </MarginNote>
        </>
      }
    >
      <p class="story">{t("book.intro1")}</p>
      <p class="story">{t("book.intro2")}</p>
      <p class="story">{t("book.placeholders", { n: placeholders(), of: props.model.rules.length })}</p>
      <For each={rulesByTheme(props.model)}>
        {(g) => (
          <section class="ruletheme" aria-labelledby={`theme-${g.theme}`}>
            <h2 class="t-3" id={`theme-${g.theme}`}>{t(`book.theme.${g.theme}`)}</h2>
            <table class="ledger ruleledger">
              <thead>
                <tr>
                  <th scope="col">{t("book.col.rule")}</th>
                  <th scope="col">{t("book.col.kind")}</th>
                  <th scope="col">{t("book.col.lag")}</th>
                  <th scope="col">{t("book.col.confidence")}</th>
                </tr>
              </thead>
              <tbody>
                <For each={g.rules}>
                  {(r) => (
                    <tr>
                      <th scope="row">
                        <a class="rulelink" href={`#/llyfr/${r.id}`} data-testid={`rule-link-${r.id}`}>
                          <span class="data ruleid">{r.id}</span> {pick(r.name)}
                        </a>
                        <Show when={r.placeholder}><span class="small flag"> {t("book.flag.placeholder")}</span></Show>
                        <Show when={r.game_rule}><span class="small flag"> {t("book.flag.gameRule")}</span></Show>
                        <Show when={Object.keys(r.params).some((p) => `${r.id}.${p}` in overrides())}>
                          <span class="small flag changedflag"> {t("book.flag.changed")}</span>
                        </Show>
                      </th>
                      <td>{t(`book.kindShort.${r.kind}`)}</td>
                      <td class="data">{r.lag > 0 ? tn("book.rule.lagShort", r.lag) : t("book.rule.lagNoneShort")}</td>
                      <td><ConfidenceMark level={r.confidence} bare /></td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </section>
        )}
      </For>
      <section class="ruletheme">
        <h2 class="t-3">{t("book.alsoHere")}</h2>
        <ul class="sectionlinks">
          <For each={SECTIONS}>
            {(s) => (
              <li>
                <a class="inklink" href={`#/llyfr/${s}`}>{t(`book.${s}.title`)}</a>
                <span class="small"> {t(`book.${s}.blurb`)}</span>
              </li>
            )}
          </For>
        </ul>
        <p class="small strandkey">
          <For each={props.model.strands}>{(s) => <span><Snip strand={s.id} /> {t(`parts.strand.${s.id}`)}</span>}</For>
        </p>
      </section>
    </BookPage>
  );
}

function Changed(props: { model: CompiledModel }): JSX.Element {
  const rows = () => Object.entries(overrides()).map(([k, v]) => ({ k, v, p: paramOf(props.model, k) }));
  return (
    <BookPage title={t("book.changed.title")} folio={0} testid="changed-page">
      <Show when={rows().length} fallback={<p class="story">{t("book.changed.none")}</p>}>
        <p class="story">{t("book.changed.intro")}</p>
        <table class="ledger ruleledger">
          <tbody>
            <For each={rows()}>
              {(r) => (
                <tr>
                  <th scope="row">
                    <a class="rulelink" href={`#/llyfr/${r.p?.ruleId ?? ""}`}>
                      <span class="data ruleid">{r.p?.ruleId}</span> {paramLabel(r.p?.name ?? r.k)}
                    </a>
                  </th>
                  <td class="data">{t("book.changed.fromTo", { d: r.p?.param.default ?? "", v: r.v })}</td>
                  <td><TabButton onClick={() => clearOverride(r.k)}>{t("book.slider.putBack")}</TabButton></td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <p><TabButton onClick={() => resetOverrides()}>{t("shell.modifiedReset")}</TabButton></p>
      </Show>
    </BookPage>
  );
}
