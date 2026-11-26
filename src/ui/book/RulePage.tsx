// One rule per page: the plain sentence, what kind of rule it is, what it reads and writes,
// the lag, each parameter with its range and a slider, confidence, evidence grade and sources.
import { createMemo, createResource, For, Show, type JSX } from "solid-js";
import { pick, t, tn } from "../../i18n";
import type { CompiledModel, Rule } from "../../model/schema";
import { ConfidenceMark, SourceTag, WarnStrip } from "../parts";
import { sourceShort } from "../parts/SourceTag";
import { sourceById } from "../shell/model";
import { BookPage, MarginNote } from "./BookPage";
import { thingName } from "./names";
import { overrides } from "./overrides";
import { ParamSlider } from "./ParamSlider";

export function RulePage(props: { model: CompiledModel; rule: Rule; folio: number; prev: { href: string; label: string } | null; next: { href: string; label: string } | null }): JSX.Element {
  // the engine renders the sentence and equation; it loads lazily, and until it does (or if it
  // cannot describe the rule) the rule's own note serves
  const [engine] = createResource(() => import("../../engine/api").catch(() => null));
  const described = createMemo(() => {
    const api = engine();
    if (!api) return null;
    try {
      return api.describeRule(props.model, props.rule.id, overrides());
    } catch {
      return null;
    }
  });
  const sentence = () => pick(described()?.sentence ?? props.rule.note);
  const lag = () => (props.rule.lag > 0 ? tn("book.rule.lagTerms", props.rule.lag) : t("book.rule.lagNone"));
  const params = () => Object.entries(props.rule.params);
  return (
    <BookPage
      testid="rule-page"
      title={<span data-testid="rule-title">{pick(props.rule.name)}</span>}
      sub={<p class="small bookpage-ruleid">{t("book.rule.idLine", { id: props.rule.id, theme: t(`book.theme.${props.rule.theme}`) })}</p>}
      folio={props.folio}
      prev={props.prev}
      next={props.next}
      margin={
        <>
          <MarginNote thread={false}>
            <p class="label">{t("book.rule.confidence")}</p>
            <ConfidenceMark level={props.rule.confidence} bare />
          </MarginNote>
          <MarginNote thread={false}>
            <p class="label">{t("book.rule.evidence")}</p>
            <p class="small">{t(`book.evidence.${props.rule.evidence}`)}</p>
          </MarginNote>
          <For each={props.rule.sources}>
            {(id) => (
              <MarginNote>
                <SourceTag source={id} label={sourceShort(sourceById(id))} />
                <p class="small marginnote-title" lang={typeof sourceById(id)?.title === "string" ? "en" : undefined}>{(() => { const s = sourceById(id); return s ? pick(s.title as never) : id; })()}</p>
                <Show when={sourceById(id)?.licence}>
                  <p class="small">{sourceById(id)!.licence}</p>
                </Show>
              </MarginNote>
            )}
          </For>
        </>
      }
    >
      <Show when={props.rule.placeholder}>
        <WarnStrip class="rule-flag">{t("book.rule.placeholder")}</WarnStrip>
      </Show>
      <Show when={props.rule.game_rule}>
        <WarnStrip class="rule-flag">{t("book.rule.gameRule")}</WarnStrip>
      </Show>
      <p class="story rule-sentence" data-testid="rule-sentence">{sentence()}</p>
      <Show when={described()?.equation}>
        <p class="rule-equation print">{described()!.equation}</p>
      </Show>

      <dl class="facts">
        <dt>{t("book.rule.kind")}</dt>
        <dd>{t(`book.kind.${props.rule.kind}`)}</dd>
        <dt>{t("book.rule.reads")}</dt>
        <dd>{props.rule.inputs.map((i) => thingName(props.model, i)).join(", ")}</dd>
        <dt>{t("book.rule.writes")}</dt>
        <dd>{props.rule.outputs.map((i) => thingName(props.model, i)).join(", ")}</dd>
        <dt>{t("book.rule.lag")}</dt>
        <dd>{lag()}</dd>
      </dl>

      <section class="params" aria-labelledby="params-h">
        <h2 class="t-3" id="params-h">{t("book.rule.params")}</h2>
        <p class="small params-intro">{t("book.rule.paramsIntro")}</p>
        <For each={params()}>{([name, p]) => <ParamSlider ruleId={props.rule.id} name={name} param={p} />}</For>
      </section>
    </BookPage>
  );
}
