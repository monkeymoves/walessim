/**
 * The road to a branch's keystone, in one or two lines: what it is, the next gate named exactly
 * and how far you are, or that it is open, being built or standing (playtest 8, should-fix 6).
 * Shown at the head of each branch in the build menu and the tree, so the top is in sight from the
 * first build. In the build menu `here` says whether the keystone can be built in this council
 * and, if not, exactly why (playtest 9, must-fix 1: "The keystone is open" with no Build button).
 */
import { Show, type JSX } from "solid-js";
import { t } from "./lang";
import type { BoardModel, BoardState } from "../engine/api";
import { gateWords } from "./blockers";
import type { BranchPath } from "./branchPath";
import { nextGate } from "./branchPath";
import { tx, whenWords } from "./words";

export function roadWords(model: BoardModel, path: BranchPath, state: BoardState, here?: string): string {
  const k = path.keystone;
  if (!k) return "";
  if (path.keystoneAt === "working") return path.legacy ? t("boardui.path.done", { legacy: tx(path.legacy.name) }) : t("boardui.path.doneAlone");
  if (path.keystoneAt === "building") return t("boardui.path.building");
  const g = nextGate(path);
  if (g) {
    const lead = t(`boardui.path.lead.${g.tier}`);
    return `${lead} ${gateWords(model, g.condition as Parameters<typeof gateWords>[1], state)}`;
  }
  if (state.step > path.lastStart) return t("boardui.path.tooLate", { when: whenWords(model, path.lastStart) });
  return here ?? t("boardui.path.ready", { when: whenWords(model, path.lastStart), years: k.build_years });
}

export function BranchRoad(props: { model: BoardModel; path: BranchPath; state: BoardState; here?: string }): JSX.Element {
  return (
    <Show when={props.path.keystone}>
      {(k) => (
        <div class="bw-road small" data-testid="bw-road">
          <p><b>{t("boardui.path.top", { keystone: tx(k().name) })}</b></p>
          <p>{roadWords(props.model, props.path, props.state, props.here)}</p>
        </div>
      )}
    </Show>
  );
}
