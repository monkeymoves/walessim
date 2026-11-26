// The book's other pages: indicators and their bands, strands and how they are made, cards
// and curveballs (read only), and every source with its licence.
import { createEffect, For, Show, type JSX } from "solid-js";
import { lang, Pair, pick, t } from "../../i18n";
import type { CompiledModel, StrandId } from "../../model/schema";
import { atlasIndicators, fmt, indicatorSources } from "../atlas/data";
import { formatValue } from "../atlas/format";
import { CurveballSlip, SourceTag, Snip, Ticket } from "../parts";
import { strandName } from "../parts/StrandRow";
import type { BookPageProps } from "./BookPage";
import { BookPage, MarginNote } from "./BookPage";
import { thingName } from "./names";

type Nav = Pick<BookPageProps, "folio" | "prev" | "next">;

export function IndicatorsPage(props: { model: CompiledModel } & Nav): JSX.Element {
  const inds = () => atlasIndicators(props.model);
  const band = (id: string) => props.model.bands.find((b) => b.indicator === id);
  return (
    <BookPage title={t("book.indicators.title")} folio={props.folio} prev={props.prev} next={props.next} testid="indicators-page" wide
      margin={<MarginNote thread={false}><p class="small">{t("book.indicators.margin")}</p></MarginNote>}>
      <p class="story">{t("book.indicators.intro")}</p>
      <table class="ledger bookledger">
        <thead>
          <tr>
            <th scope="col">{t("book.indicators.measure")}</th>
            <th scope="col">{t("book.indicators.wales")}</th>
            <th scope="col">{t("book.indicators.zero")}</th>
            <th scope="col">{t("book.indicators.ten")}</th>
            <th scope="col">{t("book.indicators.source")}</th>
          </tr>
        </thead>
        <tbody>
          <For each={inds()}>
            {(ind) => {
              const b = () => band(ind.id);
              const raw = () => props.model.indicators.find((i) => i.id === ind.id);
              const notes = () => raw()?.["notes"] as { en?: string; cy?: string } | undefined;
              const note = () => { const n = notes(); return n ? (pick(n as never) || n.en || "") : ""; };
              // notes are written in English only for now; mark the language so readers switch voice
              const noteLang = () => (lang() === "cy" && !notes()?.cy ? "en" : undefined);
              return (
                <tr>
                  <th scope="row">
                    <span class="bl-name">{pick(ind.name)}</span>
                    <span class="small bl-sub">
                      <Show when={ind.strand}><Snip strand={ind.strand!} /> {t(`parts.strand.${ind.strand}`)}. </Show>
                      {t(`atlas.unit.${ind.id}`)}, {ind.year}.{" "}
                      {ind.higherIsBetter === true ? t("atlas.key.higherBetter") : ind.higherIsBetter === false ? t("atlas.key.lowerBetter") : t("atlas.key.noDirection")}
                    </span>
                    <Show when={note()}><span class="small bl-note" lang={noteLang()}>{note()}</span></Show>
                  </th>
                  <td class="data">{fmt(ind, ind.wales) ?? ""}</td>
                  <td class="data">{b() ? formatValue(b()!.floor, ind.format) : <i class="small">{t("book.indicators.noBand")}</i>}</td>
                  <td class="data">{b() ? formatValue(b()!.goal, ind.format) : ""}</td>
                  <td><For each={indicatorSources(raw()!)}>{(s) => <SourceTag source={s} year={ind.year} />}</For></td>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
    </BookPage>
  );
}

export function StrandsPage(props: { model: CompiledModel } & Nav): JSX.Element {
  const comp = (id: string) => props.model.components.find((c) => c.id === id);
  const Part = (p: { ids: string[] }): JSX.Element => (
    <ul class="complist">
      <For each={p.ids}>
        {(id) => (
          <li>
            <span class="strong">{thingName(props.model, id)}</span>
            <Show when={comp(id)?.illustrative}> <i class="small">{t("book.strands.illustrative")}</i></Show>
            <Show when={comp(id)}><span class="small complist-note">{pick(comp(id)!.note)}</span></Show>
          </li>
        )}
      </For>
    </ul>
  );
  return (
    <BookPage title={t("book.strands.title")} folio={props.folio} prev={props.prev} next={props.next} testid="strands-page"
      margin={<MarginNote thread={false}><p class="small">{t("book.strands.margin")}</p></MarginNote>}>
      <p class="story">{t("book.strands.intro")}</p>
      <For each={props.model.strands}>
        {(s) => (
          <section class="strandsec" style={{ "--c": `var(--yarn-${s.id})`, "--tw": `var(--twist-${s.id})` }}>
            <h2 class="t-2 strandsec-head"><Snip strand={s.id} /><Pair text={strandName(s.id as StrandId)} /></h2>
            <p class="story-small">{pick(s.description)}</p>
            <div class="strandsec-cols">
              <div>
                <h3 class="label">{t("book.strands.flow")}</h3>
                <Part ids={s.flow} />
              </div>
              <div>
                <h3 class="label">{t("book.strands.stock")}</h3>
                <Part ids={s.stock} />
              </div>
            </div>
          </section>
        )}
      </For>
    </BookPage>
  );
}

export function CardsPage(props: { model: CompiledModel } & Nav): JSX.Element {
  return (
    <BookPage title={t("book.cards.title")} folio={props.folio} prev={props.prev} next={props.next} testid="cards-page"
      margin={<MarginNote thread={false}><p class="small">{t("book.cards.margin")}</p></MarginNote>}>
      <p class="story">{t("book.cards.intro")}</p>
      <ul class="cardlist">
        <For each={props.model.cards}>
          {(c) => (
            <li>
              <Ticket card={c} budget={props.model.game.budget} />
              <p class="story-small">{pick(c.description)}</p>
              <Show when={c.side_note}><p class="small"><i>{pick(c.side_note)}</i></p></Show>
            </li>
          )}
        </For>
        <For each={props.model.standing}>
          {(s) => (
            <li>
              <Ticket card={{ id: s.id, name: s.name, cost: 0, delay: 0, scope: "standing", tags: ["borrow"] }} budget={props.model.game.budget} />
              <p class="story-small">{pick(s.description)}</p>
              <p class="small"><i>{pick(s.side_note)}</i></p>
            </li>
          )}
        </For>
      </ul>
    </BookPage>
  );
}

export function CurveballsPage(props: { model: CompiledModel } & Nav): JSX.Element {
  return (
    <BookPage title={t("book.curveballs.title")} folio={props.folio} prev={props.prev} next={props.next} testid="curveballs-page"
      margin={<MarginNote thread={false}><p class="small">{t("book.curveballs.margin")}</p></MarginNote>}>
      <p class="story">{t("book.curveballs.intro")}</p>
      <ul class="slipslist">
        <For each={props.model.curveballs}>
          {(c) => (
            <li>
              <CurveballSlip title={c.name}>
                <p class="slip-where">{pick(c.where_note)}</p>
              </CurveballSlip>
              <div>
                <p class="story-small">{pick(c.description)}</p>
                <Show when={c.shock}>
                  <p class="small"><span class="strong">{t("book.curveballs.shock")}</span> {pick(c.shock!.name)}. {pick(c.shock!.description)}</p>
                </Show>
                <Show when={c.responses.length}>
                  <p class="small">{t("book.curveballs.responses", { list: c.responses.map((r) => thingName(props.model, r)).join(", ") })}</p>
                </Show>
              </div>
            </li>
          )}
        </For>
      </ul>
    </BookPage>
  );
}

export function SourcesPage(props: { model: CompiledModel; focus?: string } & Nav): JSX.Element {
  createEffect(() => {
    const id = props.focus;
    if (id) queueMicrotask(() => document.getElementById(`src-${id}`)?.scrollIntoView({ block: "center" }));
  });
  const used = (id: string) => props.model.rules.filter((r) => r.sources.includes(id)).map((r) => r.id);
  return (
    <BookPage title={t("book.sources.title")} folio={props.folio} prev={props.prev} next={props.next} testid="sources-page"
      margin={<MarginNote thread={false}><p class="small">{t("book.sources.margin")}</p></MarginNote>}>
      <p class="story">{t("book.sources.intro")}</p>
      <ol class="sourcelist">
        <For each={props.model.sources}>
          {(s) => (
            <li id={`src-${s.id}`} classList={{ focus: props.focus === s.id }}>
              <p class="strong" lang={typeof s.title === "string" ? "en" : undefined}>{pick(s.title as never)}</p>
              <p class="small">
                {[s.publisher, s.year ? String(s.year) : "", s.licence ? t("book.sources.licence", { l: s.licence }) : t("book.sources.noLicence")].filter(Boolean).join(". ")}.
              </p>
              <Show when={s["notes"] || s.note}>
                <p class="small sourcelist-note" lang={typeof (s.note ?? s["notes"]) === "string" ? "en" : undefined}>{pick((s.note ?? s["notes"]) as never)}</p>
              </Show>
              <p class="small sourcelist-links">
                <Show when={s.url}><a class="threadlink" href={s.url} target="_blank" rel="noopener noreferrer">{t("parts.source.open")}</a></Show>
                <Show when={used(s.id).length}>
                  <span>{t("book.sources.usedBy")} <For each={used(s.id)}>{(r, i) => <>{i() ? ", " : ""}<a class="inklink" href={`#/llyfr/${r}`}>{r}</a></>}</For></span>
                </Show>
              </p>
            </li>
          )}
        </For>
      </ol>
    </BookPage>
  );
}
