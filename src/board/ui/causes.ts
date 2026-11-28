/**
 * A Why?'s first cause and its link, in plain words (v2-board.md section 4.3: one hop only). Every
 * cause ends in something concrete you can find on the board (playtest 8, should-fix 8: "People
 * moving and changing their minds" explained nothing): a project and when you built it, an event
 * and when it landed, the scores young adults compared, or what a group of people says.
 * fixC.test.ts checks every cause of a real game.
 */
import { t } from "./lang";
import { eventNoun, expectedGain, type BoardModel, type BoardState, type Cause, type CouncilCode, type Why } from "../engine/api";
import { councilView } from "./engine";
import { councilName, num, projectName, say, tx, whenWords } from "./words";
import { ruleParamOf } from "./rules";

/** What a cause can look up: the state it happened in and the council the Why? is about. */
export interface CauseCtx {
  state: BoardState;
  council?: CouncilCode | null;
  /** The council at the other end of the link it travelled (young adults moving), if any. */
  from?: string | null;
  /** The size of the change this cause explains, signed: a cause is never worded against it. */
  delta?: number;
  /** The rule the change ends at. */
  rule?: string;
}

/**
 * Which way a group's mood reason points (board.json `mood.*` keys): a reason that says things got
 * better cannot explain a fall, and one that says worse cannot explain a rise (playtest 10, must-fix
 * 3: "-0.1 points ... Everyone here are content. You kept the promise").
 */
const UP_REASONS = /\.(measure\.up|promises\.kept|crises\.handled|services\.close|young_adults\.stay|fell_most\.none|crises\.none|promises\.waiting)$/;
const DOWN_REASONS = /\.(measure\.down|measure\.slow|fell_most\.down|promises\.broken|crises\.left|services\.none|young_adults\.leave|passed_over)$/;
export function reasonWay(key: string | undefined): "up" | "down" | "none" {
  if (!key) return "none";
  return UP_REASONS.test(key) ? "up" : DOWN_REASONS.test(key) ? "down" : "none";
}

/** A group named as one ("Everyone") takes a singular verb in English. */
const ONE_GROUPS = new Set(["everyone"]);

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
  // the part of a mood move that is people expecting more each term (rule P1 `expect_rise`), never worded as content
  if (c.expect) {
    return t("boardui.cause.expect", { e: num(expectedGain(model, s)) });
  }
  // moods of every group here at once (rule P1), summed in Why? because each was small
  if (!c.group && ctx.rule === "P1") {
    const e = expectedGain(model, s);
    return t((ctx.delta ?? 0) < 0 && e > 0 ? "boardui.cause.peopleAllExpect" : "boardui.cause.peopleAll", { e: num(e) });
  }
  if (c.group === "young" || !c.group) {
    const sum = (code: string) => (s.councils[code] ? s.councils[code]!.measures.work + s.councils[code]!.measures.homes : null);
    const a = sum(here), other = ctx.from && s.councils[ctx.from] ? ctx.from : null, b = other ? sum(other) : null;
    if (a !== null && b !== null && other) return t("boardui.cause.young", { here: councilName(model, here), a: num(a), other: councilName(model, other), b: num(b) });
    if (a !== null) return t("boardui.cause.youngHere", { here: councilName(model, here), a: num(a) });
  }
  try {
    const g = councilView(model, s, here).groups.find((x) => x.group === c.group);
    if (g) {
      const one = ONE_GROUPS.has(g.group) ? "One" : "";
      const vars = { group: tx(g.name), mood: t(`boardui.mood.${g.mood}`) };
      const way = reasonWay(g.reason?.key), d = ctx.delta ?? 0;
      // a fall the reason cannot explain: people expect more each term (rule P1), or moods settle back
      if (d < 0 && way !== "down") {
        const e = expectedGain(model, s);
        return e > 0 ? t(`boardui.cause.groupExpect${one}`, { ...vars, e: num(e) }) : t(`boardui.cause.groupSettle${one}`, vars);
      }
      if (d > 0 && way === "down") return t(`boardui.cause.groupSettle${one}`, vars);
      const why = say(g.reason);
      return why ? t(`boardui.cause.group${one}`, { ...vars, why }) : t(`boardui.cause.groupMood${one}`, vars);
    }
  } catch { /* fall through */ }
  return t("boardui.cause.peopleSome");
}

export function causeWords(model: BoardModel, c: Cause, step: number, ctx?: CauseCtx): string {
  switch (c.kind) {
    case "project": {
      // rule P7: a council that asked for something, and a project that answered it; then the thanks fading
      if (ctx?.rule === "P7") return t((ctx.delta ?? 0) < 0 ? "boardui.cause.answeredFading" : "boardui.cause.answered", { project: projectName(model, c.project) });
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
    case "deal": {
      const broken = ctx?.state.deals.some((d) => d.council === c.council && d.kept === false);
      const vars = { council: councilName(model, c.council), fade: num(ruleParamOf(model, "P6", "broken_years", 4)) };
      // a broken deal's backing coming back is its anger fading, never a plus for breaking it
      if (broken && (ctx?.delta ?? 0) > 0) return t("boardui.cause.dealFading", vars);
      return t(broken ? "boardui.cause.dealBroken" : "boardui.cause.deal", vars);
    }
    default: return t("boardui.cause.drift");
  }
}

/** A Why?'s cause, with what it can look up from the Why? itself. */
export const whyCauseWords = (model: BoardModel, w: Why, state: BoardState): string =>
  causeWords(model, w.cause, w.step, { state, council: w.council, from: w.via?.from ?? null, delta: w.delta, rule: w.rule });

export function viaWords(model: BoardModel, w: Why): string {
  if (!w.via) return "";
  const l = model.links.find((x) => x.id === w.via!.link);
  return t(`boardui.via.${w.via.kind}`, { from: councilName(model, w.via.from), name: tx(l?.name ?? "") });
}
