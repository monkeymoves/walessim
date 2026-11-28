/**
 * What opened a tier (cold playtest 9, should fix 5): "Bigger projects are open to you now" never
 * said which builds did it. A tier's gate is in model/board/tree.yaml (`opens`: so many projects
 * of a branch and tier working); this reads that gate against the board and names the working
 * builds that meet it, the latest first, and what the tier now offers. A legacy project names the
 * keystone that opened it. Pure, tested in opened.test.ts.
 */
import type { BoardModel, BoardState, Condition, ProjectDef, ProjectState } from "../../engine/api";

export type Opened =
  | { kind: "tier"; branch: string; tier: number; need: number; needTier: number; by: ProjectState[]; offers: ProjectDef[] }
  | { kind: "legacy"; project: string; keystone: string; at: ProjectState | null }
  | null;

const working = (state: BoardState, ids: (p: ProjectState) => boolean): ProjectState[] =>
  state.projects.filter((p) => p.status === "working" && ids(p)).sort((a, b) => b.readyStep - a.readyStep || (a.id < b.id ? -1 : 1));

/** The builds that opened the tier or legacy project of a tier_open stop's `ref`, read from the board now. */
export function openedBy(model: BoardModel, state: BoardState, ref: string): Opened {
  if (ref.startsWith("legacy:")) {
    const project = ref.slice(7);
    const keystone = model.projects.find((p) => p.id === project)?.legacy_of;
    if (!keystone) return null;
    return { kind: "legacy", project, keystone, at: working(state, (p) => p.project === keystone)[0] ?? null };
  }
  const [branch, tierText] = ref.split(":");
  const tier = Number(tierText);
  const gate = model.branches.find((b) => b.id === branch)?.tiers.find((x) => x.tier === tier);
  if (!branch || !gate) return null;
  const cond = gate.opens.find((c): c is Extract<Condition, { kind: "project" }> => c.kind === "project");
  const offers = model.projects.filter((p) => p.branch === branch && p.tier === tier && !p.legacy_of);
  if (!cond) return { kind: "tier", branch, tier, need: 0, needTier: tier - 1, by: [], offers };
  const defOf = (p: ProjectState) => model.projects.find((d) => d.id === p.project);
  const fits = (p: ProjectState) => (!cond.branch || defOf(p)?.branch === cond.branch) && (!cond.tier || defOf(p)?.tier === cond.tier) && (!cond.project || p.project === cond.project);
  const all = working(state, fits);
  const need = cond.at_least ?? 1;
  // the gate opened when the last of them did: name those, and any that opened in the same step
  const cut = all[need - 1]?.readyStep;
  const by = cut === undefined ? all : all.filter((p) => p.readyStep >= cut);
  return { kind: "tier", branch, tier, need, needTier: cond.tier ?? tier - 1, by, offers };
}
