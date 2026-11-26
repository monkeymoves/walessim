// Names for the things a player can thread at a place: Rhondda tips and Bethesda options.
import { pick, t } from "../../i18n";
import type { CompiledModel, TipFacts } from "../../model/schema";

export function tipName(tip: Pick<TipFacts, "name" | "n">): string {
  return tip.name ? `${tip.n}. ${tip.name}` : t("place.rhondda.tip_unnamed", { n: tip.n });
}

export function placeThreadName(model: CompiledModel, place: "rhondda" | "bethesda", id: string): string {
  const board = model.places.find((p) => p.id === place);
  if (!board) return id;
  if (place === "rhondda") {
    const tip = board.tips?.find((x) => x.id === id);
    return tip ? tipName(tip) : id;
  }
  const opt = board.options?.find((o) => o.id === id);
  return opt ? `${opt.n}. ${pick(opt.name)}` : id;
}
