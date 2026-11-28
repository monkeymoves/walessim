// A new tier names the builds that opened it (cold playtest 9, should fix 5): for every gate in the
// model, a board where exactly that gate's builds work names them, and what the tier offers.
import { describe, expect, it } from "vitest";
import type { BoardState, Condition, ProjectState } from "../../engine/api";
import { boardFixture, newBoard } from "../../engine/api";
import { openedBy } from "./opened";

const model = boardFixture();
const start = (): BoardState => newBoard(model, 1, model.starts[0]!.id);
const council = model.game.councils[0]!;
const built = (project: string, readyStep: number, n = 0): ProjectState => ({
  id: `${project}@${council}${n}`, project, site: { council }, level: 1, status: "working", startedStep: 0, readyStep, roots: 1, joined: false,
});

describe("what opened a tier", () => {
  for (const b of model.branches) {
    for (const tier of b.tiers.filter((x) => x.tier > 1)) {
      const cond = tier.opens.find((c): c is Extract<Condition, { kind: "project" }> => c.kind === "project");
      if (!cond) continue;
      it(`${b.id} tier ${tier.tier}: names the ${cond.at_least ?? 1} builds that opened it, latest first`, () => {
        const fit = model.projects.filter((p) => p.branch === cond.branch && p.tier === cond.tier);
        expect(fit.length).toBeGreaterThan(0);
        const need = cond.at_least ?? 1;
        const s = start();
        const mine = Array.from({ length: need }, (_, i) => built(fit[i % fit.length]!.id, i + 1, i));
        const other = model.projects.find((p) => p.branch !== b.id);
        s.projects = [...s.projects.filter((p) => p.status !== "working"), ...mine, ...(other ? [built(other.id, 9, 99)] : [])];
        const o = openedBy(model, s, `${b.id}:${tier.tier}`);
        expect(o?.kind).toBe("tier");
        if (o?.kind !== "tier") return;
        expect(o.by.map((p) => p.id)).toEqual([...mine].reverse().map((p) => p.id));
        expect(o.need).toBe(need);
        expect(o.offers.every((p) => p.branch === b.id && p.tier === tier.tier && !p.legacy_of)).toBe(true);
        expect(o.offers.length).toBeGreaterThan(0);
      });
    }
  }

  it("names the keystone a legacy project waits for", () => {
    const legacy = model.projects.find((p) => p.legacy_of);
    if (!legacy) return;
    const s = start();
    s.projects = [built(legacy.legacy_of!, 5)];
    const o = openedBy(model, s, `legacy:${legacy.id}`);
    expect(o).toMatchObject({ kind: "legacy", project: legacy.id, keystone: legacy.legacy_of });
    expect(o?.kind === "legacy" && o.at?.project).toBe(legacy.legacy_of);
  });

  it("gives nothing for a ref it cannot read", () => {
    expect(openedBy(model, start(), "nowhere:9")).toBeNull();
  });
});
