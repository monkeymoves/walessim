/**
 * Why an action cannot be taken, in plain words (v2-board.md section 5.1). Every kind of condition
 * has its own sentence, so a locked project always says what it is waiting for (playtest 8,
 * must-fix 12: a legacy project said only "Not open yet."). fixC.test.ts checks every
 * condition in the real model has a reason of its own.
 */
import { t, tn } from "./lang";
import type { Blocker, BoardModel, BoardState, Condition, Tier } from "../engine/api";
import { tierCount } from "./branchPath";
import { options } from "./engine";
import { branchName, measureName, num, projectName, tx, wholeCoins, whenWords } from "./words";

type TierGate = Extract<Condition, { kind: "project" }> & { branch: string; tier: Tier };

/**
 * A tier gate named exactly (playtest 9, must-fix 1: "2 bigger projects" read as a loop, because
 * one of the two was the legacy project, which needs the keystone). The projects that count are
 * the branch's own projects of that tier, never a legacy one; when only one can count, it is named
 * with the number of councils it must work in. With a state, how far you are: "Now 1 of 2".
 */
export function gateWords(model: BoardModel, c: TierGate, state?: BoardState): string {
  const need = c.at_least ?? 1;
  const counted = model.projects.filter((p) => p.branch === c.branch && p.tier === c.tier && !p.legacy_of);
  const one = counted.length === 1 ? counted[0]! : null;
  const head = one
    ? need === 1
      ? t("boardui.gate.oneAnywhere", { project: tx(one.name) })
      : t(one.site === "link" ? "boardui.gate.oneLines" : "boardui.gate.oneCouncils", { project: tx(one.name), n: need })
    : t("boardui.gate.many", { n: need, tier: t(`boardui.tierName.${c.tier}`), branch: branchName(model, c.branch) });
  if (!state) return head;
  const have = tierCount(model, state, c.branch, c.tier, "working");
  const building = tierCount(model, state, c.branch, c.tier, "building");
  const now = t("boardui.path.now", { working: have, need });
  return [head, now, building ? tn("boardui.gate.building", building) : ""].filter(Boolean).join(" ");
}

/** The branch a keystone heads, for "the keystone of {branch}". */
const branchOfProject = (model: BoardModel, id: string): string => branchName(model, model.projects.find((p) => p.id === id)?.branch ?? "");

export function conditionWords(model: BoardModel, c: Condition, state?: BoardState): string {
  switch (c.kind) {
    case "project": {
      if (c.branch && c.tier) return gateWords(model, c as TierGate, state);
      if (c.project) return t(`boardui.need.project.${c.where ?? "here"}`, { project: projectName(model, c.project) });
      return t("boardui.need.tag");
    }
    case "tier_open": return t("boardui.need.tierOpen", { tier: t(`boardui.tierName.${c.tier}`), branch: branchName(model, c.branch) });
    case "feature": return t(c.not ? "boardui.need.noFeature" : "boardui.need.feature", { feature: t(`boardui.feature.${c.feature}`) });
    case "flag": return t(c.not ? "boardui.need.noFeature" : "boardui.need.feature", { feature: t(`boardui.flag.${c.flag}`) });
    case "link_quality": return t("boardui.need.linkQuality", { quality: t(`boardui.quality.${c.at_least}`) });
    case "year":
      if (c.from !== undefined && c.to !== undefined) return t("boardui.need.year", { from: c.from, to: c.to });
      return c.from !== undefined ? t("boardui.need.yearFrom", { from: c.from }) : t("boardui.need.yearTo", { to: c.to ?? "" });
    case "keystone":
      return c.project
        ? t("boardui.need.keystone", { project: projectName(model, c.project), branch: branchOfProject(model, c.project) })
        : t("boardui.need.anyKeystone");
    case "risk": return t("boardui.need.risk", { risk: t(`boardui.risk.${c.risk}`), step: t(`boardui.step.${c.at_least}`) });
    case "measure": return t(`boardui.need.measure.${c.op}`, { measure: measureName(model, c.measure), n: num(c.value ?? 0) });
    case "share": return t(`boardui.need.share.${c.share}.${c.op}`, { n: num(c.value) });
    case "backing": return t(`boardui.need.backing.${c.op}`, { n: num(c.value) });
    case "track": return t("boardui.need.track", { track: t(`boardui.track.${c.track}`) });
    case "law": return t("boardui.need.law", { law: lawName(model, c.law) });
    case "momentum": return t(`boardui.need.momentum.${c.is}`);
  }
}

const lawName = (model: BoardModel, id: string): string => tx(model.laws.find((x) => x.id === id)?.name ?? id);

export function blockerWords(model: BoardModel, b: Blocker, state?: BoardState): string {
  switch (b.kind) {
    case "coins": return t("boardui.block.coins", { need: num(b.need), have: wholeCoins(b.have) });
    case "needs": return conditionWords(model, b.condition, state);
    case "already_here": return t("boardui.block.already");
    case "one_keystone": return t("boardui.block.oneKeystone");
    case "max_level": return t("boardui.block.maxLevel");
    case "still_building": return t("boardui.block.stillBuilding", { when: whenWords(model, b.readyStep + 1) });
    case "too_late": return t("boardui.block.tooLate", { when: whenWords(model, b.lastStep) });
    case "law_changes_used": return t("boardui.block.lawUsed");
    case "phase": return t("boardui.block.phase");
    default: return t("boardui.block.notOffered");
  }
}

/**
 * Why a place visit cannot be made now, or null when it can. The stop card, the council panel and
 * the place sheet all ask here, so no button leads to a refusal the player was not told about
 * (playtest 8, must-fix 11).
 */
export function visitBlockWords(model: BoardModel, state: BoardState, place: string): string | null {
  try {
    const o = options(model, state).find((x) => x.action.kind === "visit" && x.action.place === place);
    if (!o) return t("boardui.block.notOffered");
    return o.allowed ? null : o.blockers.map((b) => blockerWords(model, b, state)).join(" ");
  } catch {
    return null;
  }
}
