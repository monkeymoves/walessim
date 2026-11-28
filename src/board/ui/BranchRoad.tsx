/**
 * The road to a branch's keystone, in one or two lines: what it is, the next gate and how far you
 * are, or that it is open, being built or standing (playtest 8, should-fix 6). Shown at the head
 * of each branch in the build menu and the tree, so the top is in sight from the first build.
 */
import { Show, type JSX } from "solid-js";
import { t } from "./lang";
import type { BranchPath } from "./branchPath";
import { nextGate } from "./branchPath";
import { tx } from "./words";

export function roadWords(path: BranchPath, year: number): string {
  const k = path.keystone;
  if (!k) return "";
  if (path.keystoneAt === "working") return path.legacy ? t("boardui.path.done", { legacy: tx(path.legacy.name) }) : t("boardui.path.doneAlone");
  if (path.keystoneAt === "building") return t("boardui.path.building");
  const g = nextGate(path);
  if (g) {
    const now = t("boardui.path.now", { working: g.working, need: g.need });
    const more = g.building ? " " + t("boardui.path.more", { n: g.building }) : "";
    return t(`boardui.path.gate.${g.tier}`, { need: g.need }) + " " + now + more;
  }
  return year > path.lastStart ? t("boardui.path.tooLate", { year: path.lastStart }) : t("boardui.path.ready", { year: path.lastStart, years: k.build_years });
}

export function BranchRoad(props: { path: BranchPath; year?: number }): JSX.Element {
  return (
    <Show when={props.path.keystone}>
      {(k) => (
        <div class="bw-road small" data-testid="bw-road">
          <p><b>{t("boardui.path.top", { keystone: tx(k().name) })}</b></p>
          <p>{roadWords(props.path, props.year ?? 0)}</p>
        </div>
      )}
    </Show>
  );
}
