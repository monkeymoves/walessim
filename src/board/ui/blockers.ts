/** Why an action cannot be taken, in plain words (v2-board.md section 5.1). */
import { t } from "../../i18n";
import type { Blocker, BoardModel, Condition } from "../engine/api";
import { branchName, projectName } from "./words";

export function conditionWords(model: BoardModel, c: Condition): string {
  switch (c.kind) {
    case "project":
      if (c.branch && c.tier) return t("boardui.need.tier", { n: c.at_least ?? 1, tier: c.tier, branch: branchName(model, c.branch) });
      if (c.project) return t("boardui.need.project", { project: projectName(model, c.project) });
      if (c.tag) return t("boardui.need.tag", { tag: c.tag });
      return t("boardui.need.other");
    case "tier_open": return t("boardui.need.tierOpen", { tier: c.tier, branch: branchName(model, c.branch) });
    case "feature": return t(c.not ? "boardui.need.noFeature" : "boardui.need.feature", { feature: t(`boardui.feature.${c.feature}`) });
    case "flag": return t("boardui.need.other");
    case "link_quality": return t("boardui.need.linkQuality", { quality: t(`boardui.quality.${c.at_least}`) });
    case "year": return t("boardui.need.year", { from: c.from ?? "", to: c.to ?? "" });
    default: return t("boardui.need.other");
  }
}

export function blockerWords(model: BoardModel, b: Blocker): string {
  switch (b.kind) {
    case "coins": return t("boardui.block.coins", { need: b.need, have: b.have });
    case "needs": return conditionWords(model, b.condition);
    case "already_here": return t("boardui.block.already");
    case "one_keystone": return t("boardui.block.oneKeystone");
    case "max_level": return t("boardui.block.maxLevel");
    case "too_late": return t("boardui.block.tooLate", { year: b.lastYear });
    case "law_changes_used": return t("boardui.block.lawUsed");
    case "visit_used": return t("boardui.block.visitUsed");
    case "phase": return t("boardui.block.phase");
    default: return t("boardui.block.notOffered");
  }
}
