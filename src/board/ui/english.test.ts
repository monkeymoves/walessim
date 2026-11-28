import { describe, expect, it } from "vitest";
import { namesInSentence, withArticles } from "./english";

const NAMES = ["Vale of Glamorgan"];

describe("the article before a place name in English sentences", () => {
  it("adds the in a sentence and The at its start, once", () => {
    expect(withArticles("Health in Vale of Glamorgan rose.", NAMES)).toBe("Health in the Vale of Glamorgan rose.");
    expect(withArticles("Vale of Glamorgan backs you. Vale of Glamorgan is calm.", NAMES)).toBe("The Vale of Glamorgan backs you. The Vale of Glamorgan is calm.");
    expect(withArticles("Barry, in the Vale of Glamorgan", NAMES)).toBe("Barry, in the Vale of Glamorgan");
    expect(withArticles("Cardiff and Vale of Glamorgan: 2 of 2", NAMES)).toBe("Cardiff and the Vale of Glamorgan: 2 of 2");
    expect(withArticles("Nothing here.", NAMES)).toBe("Nothing here.");
    // a fragment (a list item or label) keeps the bare name at its start
    expect(withArticles("Vale of Glamorgan (by 0.1)", NAMES)).toBe("Vale of Glamorgan (by 0.1)");
    expect(withArticles("Vale of Glamorgan: Health", NAMES)).toBe("Vale of Glamorgan: Health");
  });
});

describe("a project named with an article, in English sentences", () => {
  const repairs = { project: "A repairs team for cold, damp homes" };
  it("reads lower case mid-sentence and keeps its capital at a start or after a colon", () => {
    expect(namesInSentence("Build {project} here.", repairs).project).toBe("a repairs team for cold, damp homes");
    expect(namesInSentence("{project} is working now.", repairs).project).toBe("A repairs team for cold, damp homes");
    expect(namesInSentence("It ended. {project} opened.", repairs).project).toBe("A repairs team for cold, damp homes");
    expect(namesInSentence("Working: {project}", repairs).project).toBe("A repairs team for cold, damp homes");
    expect(namesInSentence("Build {project} here.", { project: "Slow the water upstream" }).project).toBe("Slow the water upstream");
  });
});
