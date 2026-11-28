import { describe, expect, it } from "vitest";
import { withArticles } from "./english";

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
