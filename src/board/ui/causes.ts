/** A Why?'s first cause and its link, in plain words (v2-board.md section 4.3: one hop only). */
import { t } from "../../i18n";
import type { BoardModel, Cause, Why } from "../engine/api";
import { councilName, projectName, tx } from "./words";

export function causeWords(model: BoardModel, c: Cause, year: number): string {
  switch (c.kind) {
    case "project": {
      const where = c.site.council ? councilName(model, c.site.council) : tx(model.links.find((l) => l.id === c.site.link)?.name ?? "");
      return t("boardui.cause.project", { project: projectName(model, c.project), where, year });
    }
    case "pair": return t("boardui.cause.pair", { name: tx(model.pairs.find((p) => p.id === c.pair)?.name ?? "") });
    case "event": return t("boardui.cause.event", { name: tx(model.events.find((e) => e.id === c.event)?.name ?? ""), year });
    case "response": return t("boardui.cause.response", { name: tx(model.events.find((e) => e.id === c.event)?.responses.find((r) => r.id === c.response)?.name ?? "") });
    case "law": return t("boardui.cause.law", { name: tx(model.laws.find((l) => l.id === c.law)?.name ?? "") });
    case "visit": return t("boardui.cause.visit", { place: tx(model.places.find((p) => p.id === c.place)?.name ?? ""), grade: t(`boardui.grade.${c.grade}`) });
    case "start": return t("boardui.cause.start", { name: tx(model.starts.find((s) => s.id === c.start)?.name ?? "") });
    case "election": return t("boardui.cause.election", { year: c.year });
    case "people": return t("boardui.cause.people");
    case "budget": return t("boardui.cause.budget");
    default: return t("boardui.cause.drift");
  }
}

export function viaWords(model: BoardModel, w: Why): string {
  if (!w.via) return "";
  const l = model.links.find((x) => x.id === w.via!.link);
  return t(`boardui.via.${w.via.kind}`, { from: councilName(model, w.via.from), name: tx(l?.name ?? "") });
}
