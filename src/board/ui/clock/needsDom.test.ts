// Every kind of needs-you target is marked by some screen (needsDom.ts): a target kind whose
// `data-needs` value no component writes would hold the clock with no outline on screen.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { needsSelector } from "./needsDom";
import type { NeedsTarget } from "./waiting";

const UI = join(__dirname, "..");
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : f.endsWith(".tsx") ? [p] : [];
});
const markup = files(UI).map((f) => readFileSync(f, "utf8")).join("\n");

const TARGETS: NeedsTarget[] = [
  { kind: "answers", of: "event" }, { kind: "answers", of: "deal" }, { kind: "answers", of: "visit" },
  { kind: "visit" }, { kind: "carryOn" }, { kind: "close", what: "build" }, { kind: "play" }, { kind: "next" },
];

describe("needs-you targets", () => {
  it("each kind's mark is written by a screen", () => {
    for (const t of TARGETS) {
      const value = /data-needs(?:-close)?="([^"]*)"/.exec(needsSelector(t))![1]!;
      const written = t.kind === "close" ? /data-needs-close=/.test(markup) : markup.includes(`data-needs="${value}"`);
      expect(written, `${JSON.stringify(t)} -> ${needsSelector(t)}`).toBe(true);
    }
  });
  it("tells the three groups of answers apart", () => {
    const sel = new Set(TARGETS.filter((t) => t.kind === "answers").map(needsSelector));
    expect(sel.size).toBe(3);
  });
});
