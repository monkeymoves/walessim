import { describe, expect, it } from "vitest";
import type { StepFacts } from "./ctx";
import { boardFixture, FIXTURE_COUNCILS } from "./fixture";
import { ctxOf, handState, nextYears, standing } from "./hand-state";
import { seedPeople } from "./people";
import { nameChapter, noteStep, story } from "./story";
import { townOf, ynPlace } from "./story-terms";
import { timeline } from "./timeline";
import type { BoardModel, BoardState, ChapterDef, Contribution, TermCondition } from "./types";

const { merthyr, rct, cardiff } = FIXTURE_COUNCILS;
const plain = boardFixture();
const t = (en: string) => ({ en, cy: en, cy_review: true });
const chapter = (id: string, priority: number, name: string, when: TermCondition[]): ChapterDef => ({ id, priority, name: t(name), line: t(name), when });
const model: BoardModel = {
  ...plain,
  chapters: [
    chapter("holding-on", 99, "Holding on", []),
    chapter("hung-years", 5, "The hung years", [{ kind: "election", result: "lost" }]),
    chapter("river-rose", 1, "The winter the {river} rose", [{ kind: "event_landed", track: "weather", severity_at_least: 2, prepared: false }]),
    chapter("keystone", 2, "{project}", [{ kind: "keystone", phase: "finished" }]),
  ],
};

function seeded(): BoardState {
  const s = handState(model, { start: "warm-homes" });
  seedPeople(ctxOf(model, s));
  return s;
}
const facts = (x: Partial<StepFacts>): StepFacts => ({ step: 15, finished: [], events: [], election: null, closedYears: [], opened: [], tipped: [], chapter: null, ...x });
const storm = { event: "storm-taff", step: 15, councils: [merthyr, rct], severity: 3, prepared: false };

describe("moments (16.5.2)", () => {
  it("records a tier opening, a keystone, a first tip, an election and hard trouble, not small trouble", () => {
    const s = seeded();
    s.projects.push(standing("cluster-roots", { council: rct }, 0));
    noteStep(ctxOf(model, s), facts({
      finished: ["cluster-roots@" + rct], opened: ["made_here:2"], tipped: [{ council: merthyr, from: "steady", to: "rising" }],
      election: { year: 2030, step: 16, result: "lost", backers: [], peopleShare: 0.2 },
      events: [storm, { event: "downturn", step: 15, councils: [cardiff], severity: 1.5, prepared: true }],
    }));
    expect(s.story.moments.map((m) => m.kind).sort()).toEqual(["election", "event", "keystone", "tier_open", "tipped"]);
    expect(s.story.moments.find((m) => m.kind === "event")!.say).toMatchObject({ key: "board.moment.event", vars: { event: { en: "Storm winter on the Taff" } } });
    noteStep(ctxOf(model, s), facts({ step: 20, tipped: [{ council: merthyr, from: "steady", to: "rising" }] }));
    expect(s.story.moments.filter((m) => m.kind === "tipped")).toHaveLength(1);
  });

  it("weighs a moment by the ledger that shares its cause over the years after it", () => {
    const s = seeded();
    const rec = (delta: number, event: string): Contribution => ({ step: 14, year: 2029, council: merthyr, quantity: "nature", delta, rule: "E1", cause: { kind: "event", event } });
    s.ledger.push(rec(-0.5, "storm-taff"), rec(-0.25, "storm-taff"), rec(-1, "downturn"));
    noteStep(ctxOf(model, s), facts({ events: [storm], closedYears: [2029] }));
    expect(s.story.moments[0]!.weight).toBeCloseTo(0.75, 4);
  });

  it("the turning points are the five heaviest, in order of time, and an event names the choice not made", () => {
    const s = seeded();
    for (let i = 0; i < 7; i++) {
      s.story.moments.push({ step: 40 - i * 4, year: 2036 - i, kind: "event", ref: `storm-taff@${40 - i * 4}`, say: { key: "board.moment.event" }, weight: i });
    }
    s.events.push({ ...storm, step: 16, response: "accept" });
    const st = story(model, s);
    expect(st.turningPoints.map((m) => m.weight)).toEqual([6, 5, 4, 3, 2]);
    expect(st.turningPoints[0]!.say.vars).toMatchObject({ chosen: { en: "Clear up" }, other: { en: "Repair and protect homes" } });
  });
});

describe("chapters (16.5.1)", () => {
  it("names each term by the first chapter that fits, not twice unless nothing else fits", () => {
    const s = seeded();
    s.events.push({ ...storm, step: 10 });
    nextYears(model, s, 4);
    const first = nameChapter(ctxOf(model, s), 1, 2026, 2030);
    expect(first.chapter).toBe("river-rose");
    expect(first.slots.river).toMatchObject({ en: "Taff" });
    s.story.chapters.push(first);

    s.events.push({ ...storm, step: 20 });
    s.election.records.push({ year: 2030, step: 16, result: "lost", backers: [], peopleShare: 0.2 });
    nextYears(model, s, 4);
    const second = nameChapter(ctxOf(model, s), 2, 2030, 2034);
    expect(second.chapter).toBe("hung-years");
    s.story.chapters.push(second);

    nextYears(model, s, 4);
    expect(nameChapter(ctxOf(model, s), 3, 2034, 2038).chapter).toBe("holding-on");
  });

  it("a finished keystone gives its own name; a model with no chapters says Holding on", () => {
    const s = seeded();
    nextYears(model, s, 4);
    s.projects.push({ ...standing("rivers-room", { council: merthyr }, 2), readyStep: 12 });
    const c = nameChapter(ctxOf(model, s), 1, 2026, 2030);
    expect(c.chapter).toBe("keystone");
    expect(c.slots.project).toMatchObject({ en: plain.projects.find((p) => p.id === "rivers-room")!.name.en });
    expect(nameChapter(ctxOf(plain, s), 1, 2026, 2030).chapter).toBe("holding-on");
  });
});

describe("the time line", () => {
  it("every mark ahead has a sentence, and they come in order of time", () => {
    const s = seeded();
    s.deals.push({ council: merthyr, measure: "homes", madeStep: 0, dueStep: 16, kept: null });
    const v = timeline(model, s);
    const at = (m: (typeof v.ahead)[number]) => ("fromStep" in m ? m.fromStep : m.step);
    for (const m of v.ahead) if (m.kind !== "election") expect(m.say?.key, m.kind).toMatch(/^board\.timeline\./);
    expect(v.ahead.map(at)).toEqual([...v.ahead.map(at)].sort((a, b) => a - b));
    expect(v.ahead.some((m) => m.kind === "deal" && m.council === merthyr)).toBe(true);
  });
});

describe("a town is always named with its council (playtest 9, should-fix 2)", () => {
  it("names the council's first town not named like the council, with the council, in both languages", () => {
    for (const c of plain.councils.filter((x) => plain.game.councils.includes(x.code))) {
      const said = townOf(plain, c.code);
      const town = c.towns.find((t) => t.en !== c.name.en);
      if (!town) expect(said.en).toBe(c.name.en);
      else {
        expect(said.en).toBe(`${town.en}, in ${c.name.en}`);
        expect(said.cy.startsWith(`${town.cy || town.en}, y`)).toBe(true);
      }
    }
  });

  it("takes the nasal mutation after yn, as the screens do", () => {
    expect(["Caerffili", "Pen-y-bont ar Ogwr", "Tor-faen", "Blaenau Gwent", "Merthyr Tudful", "Rhondda Cynon Taf", "Casnewydd", "Sir Fynwy"].map(ynPlace)).toEqual([
      "yng Nghaerffili", "ym Mhen-y-bont ar Ogwr", "yn Nhor-faen", "ym Mlaenau Gwent", "ym Merthyr Tudful", "yn Rhondda Cynon Taf", "yng Nghasnewydd", "yn Sir Fynwy",
    ]);
  });
});
