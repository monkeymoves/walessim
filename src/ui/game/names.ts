// Names of things in the active language, looked up from the compiled model. One place, so
// components never reach into model arrays themselves.
import { hasKey, pick, t, lang } from "../../i18n";
import { andCy, tw } from "./cymraeg";
import type { Cause, GameState, RegionId, StrandId } from "../../engine/api";
import type { Card, CompiledModel, Curveball, Text } from "../../model/schema";

/** "A, B and C"; in Welsh "a" or "ac" with the aspirate mutation on the last item. */
function joinAnd(items: string[]): string {
  const a = items.slice(0, -1).join(", ");
  const b = items[items.length - 1]!;
  return lang() === "cy" ? `${a} ${andCy(b)}` : t("game.and", { a, b });
}

export type Lookup = ReturnType<typeof makeNames>;

export function makeNames(model: CompiledModel) {
  const cards = new Map(model.cards.map((c) => [c.id, c] as const));
  const standing = new Map(model.standing.map((s) => [s.id as string, s] as const));
  const curveballs = new Map(model.curveballs.map((c) => [c.id, c] as const));
  const strands = new Map(model.strands.map((s) => [s.id, s] as const));
  const regions = new Map(model.regions.map((r) => [r.id, r] as const));
  const las = new Map(model.authorities.map((a) => [a.code, a] as const));
  const components = new Map(model.components.map((c) => [c.id, c] as const));
  const rules = new Map(model.rules.map((r) => [r.id, r] as const));
  const sources = new Map(model.sources.map((s) => [s.id, s] as const));
  const places = new Map(model.places.map((p) => [p.id, p] as const));
  // serial numbers: a stable four-figure number per card, like an Edmondson ticket
  const serials = new Map(model.cards.map((c, i) => [c.id, String(401 + i * 17).padStart(4, "0")] as const));

  const text = (x: Text | string | undefined | null) => pick(x ?? "", lang());

  return {
    model,
    card: (id: string): Card | undefined => cards.get(id),
    standingTicket: (id: string) => standing.get(id),
    curveball: (id: string): Curveball | undefined => curveballs.get(id),
    strand: (id: StrandId) => strands.get(id),
    region: (id: RegionId) => regions.get(id),
    la: (code: string) => las.get(code),
    rule: (id: string) => rules.get(id),
    source: (id: string) => sources.get(id),
    place: (id: "rhondda" | "bethesda") => places.get(id),
    component: (id: string) => components.get(id),

    cardText: (id: string): Text => cards.get(id)?.name ?? standing.get(id)?.name ?? { en: id, cy: id },
    cardName: (id: string) => text(cards.get(id)?.name ?? standing.get(id)?.name ?? id),
    serial: (id: string) => serials.get(id) ?? "0000",
    curveballName: (id: string) => text(curveballs.get(id)?.name ?? id),
    shockName: (id: string) => text(curveballs.get(id)?.shock?.name ?? curveballs.get(id)?.name ?? id),
    strandName: (id: StrandId) => (hasKey(`parts.strand.${id}`) ? t(`parts.strand.${id}`) : text(strands.get(id)?.name ?? id)),
    regionName: (id: RegionId) => text(regions.get(id)?.name ?? id),
    laName: (code: string) => text(las.get(code)?.name ?? code),
    componentName: (id: string) => text(components.get(id)?.name ?? id),
    placeName: (id: "rhondda" | "bethesda") => text(places.get(id)?.name ?? id),
    sourceTitle: (id: string) => {
      const s = sources.get(id);
      if (!s) return id;
      const title = text(s.title as Text | string);
      return s.publisher && !title.includes(s.publisher) ? `${title}, ${s.publisher}` : title;
    },
    text,

    /** A cause in words: "Make coal tips safe, played 2030". */
    cause(c: Cause): string {
      switch (c.kind) {
        case "card": return t("game.cause.card", { name: text(cards.get(c.id)?.name ?? c.id), year: c.year });
        case "caretaker": return t("game.cause.caretaker", { name: text(cards.get(c.id)?.name ?? c.id) });
        case "standing": return t("game.cause.standing", { name: text(standing.get(c.id)?.name ?? c.id), year: c.year });
        case "curveball": return t("game.cause.curveball", { name: text(curveballs.get(c.id)?.name ?? c.id), year: c.year });
        case "shock": return t("game.cause.shock", { name: text(curveballs.get(c.id)?.shock?.name ?? curveballs.get(c.id)?.name ?? c.id), year: c.year });
        case "baseline": return rules.has(c.id) ? text(rules.get(c.id)!.name) : t("game.cause.baseline");
        case "upkeep": return tw("game.cause.upkeep", { name: text(cards.get(c.id)?.name ?? c.id) });
        case "event": {
          const key = `game.event.${c.id}`;
          const s = t(key);
          return s === key ? text(rules.get(c.id)?.name ?? c.id) : s;
        }
      }
    },

    /** "North and Mid", or "All of Wales" for no regions. */
    regionsText(ids: RegionId[] | null | undefined): string {
      if (!ids || ids.length === 0) return t("game.plan.all_wales");
      const names = ids.map((r) => text(regions.get(r)?.name ?? r));
      if (names.length === 1) return names[0]!;
      return joinAnd(names);
    },

    /** A list in words: "A, B and C". */
    list(items: string[]): string {
      if (items.length <= 1) return items[0] ?? "";
      return joinAnd(items);
    },
  };
}

/** Legal regions for a card, in display order. */
export function cardRegions(model: CompiledModel, card: Card): RegionId[] {
  const all = model.regions.map((r) => r.id);
  return card.regions && card.regions.length ? all.filter((r) => card.regions!.includes(r)) : all;
}

/** Authorities of a region. */
export function regionLas(model: CompiledModel, id: RegionId): string[] {
  return model.regions.find((r) => r.id === id)?.authorities ?? [];
}

/** The decade words for the top bar are kept plain: the year is the loud thing. */
export function termYears(state: GameState): { from: number; to: number } {
  return { from: state.year, to: state.year + 4 };
}
