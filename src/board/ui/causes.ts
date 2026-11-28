/**
 * A Why?'s first cause and its link, in plain words (v2-board.md section 4.3: one hop only). Every
 * cause ends in something concrete you can find on the board (playtest 8, should-fix 8: "People
 * moving and changing their minds" explained nothing): a project and when you built it, an event
 * and when it landed, the scores young adults compared, or what a group of people says.
 * fixC.test.ts checks every cause of a real game.
 */
import { t } from "./lang";
import { eventNoun, type BoardModel, type BoardState, type Cause, type CouncilCode, type Why } from "../engine/api";
import { councilView } from "./engine";
import { councilName, num, projectName, say, tx, whenWords } from "./words";

/** What a cause can look up: the state it happened in and the council the Why? is about. */
export interface CauseCtx {
  state: BoardState;
  council?: CouncilCode | null;
  /** The council at the other end of the link it travelled (young adults moving), if any. */
  from?: string | null;
}

const siteName = (model: BoardModel, site: { council?: string; link?: string }): string =>
  site.council ? councilName(model, site.council) : tx(model.links.find((l) => l.id === site.link)?.name ?? "");

/** The step a project was placed: the one standing at that site, or the first of them anywhere. */
function builtStep(state: BoardState | undefined, project: string, site: { council?: string; link?: string }): number | null {
  const all = state?.projects.filter((p) => p.project === project) ?? [];
  const here = all.find((p) => p.site.council === site.council && p.site.link === site.link) ?? all[0];
  return here ? here.startedStep : null;
}

/** Young adults compare work plus homes (rule S3): the two sums, here and at the other end. */
function peopleWords(model: BoardModel, c: Extract<Cause, { kind: "people" }>, ctx?: CauseCtx): string {
  const s = ctx?.state, here = ctx?.council;
  if (!s || !here) return t("boardui.cause.peopleSome");
  if (c.group === "young" || !c.group) {
    const sum = (code: string) => (s.councils[code] ? s.councils[code]!.measures.work + s.councils[code]!.measures.homes : null);
    const a = sum(here), other = ctx.from && s.councils[ctx.from] ? ctx.from : null, b = other ? sum(other) : null;
    if (a !== null && b !== null && other) return t("boardui.cause.young", { here: councilName(model, here), a: num(a), other: councilName(model, other), b: num(b) });
    if (a !== null) return t("boardui.cause.youngHere", { here: councilName(model, here), a: num(a) });
  }
  try {
    const g = councilView(model, s, here).groups.find((x) => x.group === c.group);
    const why = g ? say(g.reason) : "";
    if (g && why) return t("boardui.cause.group", { group: tx(g.name), mood: t(`boardui.mood.${g.mood}`), why });
    if (g) return t("boardui.cause.groupMood", { group: tx(g.name), mood: t(`boardui.mood.${g.mood}`) });
  } catch { /* fall through */ }
  return t("boardui.cause.peopleSome");
}

export function causeWords(model: BoardModel, c: Cause, step: number, ctx?: CauseCtx): string {
  switch (c.kind) {
    case "project": {
      const at = builtStep(ctx?.state, c.project, c.site);
      return t("boardui.cause.project", { project: projectName(model, c.project), where: siteName(model, c.site), when: whenWords(model, at ?? step) });
    }
    case "pair": return t("boardui.cause.pair", { name: tx(model.pairs.find((p) => p.id === c.pair)?.name ?? ""), where: siteName(model, c.site) });
    case "event": return t("boardui.cause.event", { name: tx(model.events.find((e) => e.id === c.event)?.name ?? ""), when: whenWords(model, step) });
    case "response": return t("boardui.cause.response", {
      name: tx(model.events.find((e) => e.id === c.event)?.responses.find((r) => r.id === c.response)?.name ?? ""),
      event: tx(model.events.find((e) => e.id === c.event)?.name ?? ""),
      noun: t(eventNoun(c.event)),
    });
    case "law": return t("boardui.cause.law", { name: tx(model.laws.find((l) => l.id === c.law)?.name ?? "") });
    case "visit": return t("boardui.cause.visit", { place: tx(model.places.find((p) => p.id === c.place)?.name ?? ""), grade: t(`boardui.grade.${c.grade}`) });
    case "start": return t("boardui.cause.start", { name: tx(model.starts.find((s) => s.id === c.start)?.name ?? "") });
    case "election": return t("boardui.cause.election", { year: c.year });
    case "people": return peopleWords(model, c, ctx);
    case "budget": return t("boardui.cause.budget");
    case "momentum": {
      const code = ctx?.council;
      const mo = code ? ctx?.state.councils[code]?.momentum : undefined;
      return code && mo && mo !== "steady"
        ? t(`boardui.cause.momentumNow.${mo}`, { council: councilName(model, code) })
        : t("boardui.cause.momentum");
    }
    case "deal": return t("boardui.cause.deal", { council: councilName(model, c.council) });
    default: return t("boardui.cause.drift");
  }
}

/** A Why?'s cause, with what it can look up from the Why? itself. */
export const whyCauseWords = (model: BoardModel, w: Why, state: BoardState): string =>
  causeWords(model, w.cause, w.step, { state, council: w.council, from: w.via?.from ?? null });

export function viaWords(model: BoardModel, w: Why): string {
  if (!w.via) return "";
  const l = model.links.find((x) => x.id === w.via!.link);
  return t(`boardui.via.${w.via.kind}`, { from: councilName(model, w.via.from), name: tx(l?.name ?? "") });
}
