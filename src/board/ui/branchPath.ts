/**
 * The road to the top of a branch (playtest 8, should-fix 6: the keystone was not signposted until
 * too late): its keystone, its legacy project, and for each gate on the way what it needs, how many
 * are working and how many are being built. The gates are the branch's own `opens` conditions from
 * tree.yaml (counted as the engine counts them: working projects of that branch and tier, anywhere).
 */
import type { BoardModel, BoardState, BranchDef, ProjectDef, Tier } from "../engine/api";

export interface Gate {
  /** The tier this gate opens (2 or 3). */
  tier: Tier;
  /** The tier counted towards it. */
  from: Tier;
  need: number;
  working: number;
  building: number;
  open: boolean;
}

export interface BranchPath {
  branch: BranchDef;
  keystone: ProjectDef | null;
  legacy: ProjectDef | null;
  gates: Gate[];
  /** "none", "building" or "working": where the keystone stands, anywhere on the board. */
  keystoneAt: "none" | "building" | "working";
  /** The last calendar year a keystone can be started (game rule). */
  lastStart: number;
}

const countOf = (model: BoardModel, state: BoardState, branch: string, tier: Tier, status: "working" | "building"): number =>
  state.projects.filter((p) => p.status === status && model.projects.some((d) => d.id === p.project && d.branch === branch && d.tier === tier)).length;

export function branchPath(model: BoardModel, state: BoardState, branch: BranchDef): BranchPath {
  const keystone = model.projects.find((p) => p.branch === branch.id && p.keystone) ?? null;
  const legacy = keystone ? model.projects.find((p) => p.legacy_of === keystone.id) ?? null : null;
  const gates: Gate[] = branch.tiers.filter((t) => t.tier > 1 && t.opens.length).map((t) => {
    const c = t.opens[0]!;
    const from = (c.kind === "project" && c.tier ? c.tier : t.tier - 1) as Tier;
    const need = c.kind === "project" ? c.at_least ?? 1 : 1;
    const working = countOf(model, state, branch.id, from, "working");
    return { tier: t.tier, from, need, working, building: countOf(model, state, branch.id, from, "building"), open: working >= need };
  });
  const standing = keystone ? state.projects.filter((p) => p.project === keystone.id) : [];
  const keystoneAt = standing.some((p) => p.status !== "building") ? "working" : standing.length ? "building" : "none";
  return { branch, keystone, legacy, gates, keystoneAt, lastStart: model.game.keystone_last_start_year };
}

/** The first gate still shut, or null when the keystone's tier is open. */
export const nextGate = (path: BranchPath): Gate | null => path.gates.find((g) => !g.open) ?? null;
