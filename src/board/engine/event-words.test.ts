/**
 * Playtest 8, must-fix 7: event titles were put into sentences ("A warning: The river runs dirty
 * may hit Newport", Welsh "gall Mae cwmni eisiau tyfu yma daro"), and a storm in a river's last
 * council named no river ("The burst its banks"). Every event has a noun form for sentences in
 * both languages, every {event} slot the engine fills in a whole game carries that noun's key,
 * and every river event names a river wherever it lands.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel } from "../../../scripts/board/assemble";
import { readBoardInputs } from "../../../scripts/board/read-inputs";
import { eventNoun, forecast, riverAt } from "./events";
import { playGame } from "./test-play";
import { timeline } from "./timeline";
import type { BoardModel, Say } from "./types";

const words = (lang: "en" | "cy") => JSON.parse(readFileSync(resolve(__dirname, `../../../model/i18n/${lang}/board.json`), "utf8")) as Record<string, string>;
const en = words("en");
const cy = words("cy");
const fill = (line: string, vars: Record<string, string>) => line.replace(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all);

let model: BoardModel;
beforeAll(() => {
  model = assembleBoardModel(readBoardInputs()).model;
});

describe("events read well inside sentences", () => {
  it("every event has a noun form in English and Welsh, starting in lower case, not a clause", () => {
    for (const e of model.events) {
      const key = eventNoun(e.id).slice("board.".length);
      for (const [lang, d] of [["en", en], ["cy", cy]] as const) {
        const noun = d[key];
        expect(noun, `${lang} ${key}`).toBeTruthy();
        expect(noun![0], `${lang} ${key}`).toBe(noun![0]!.toLowerCase());
        expect(noun, `${lang} ${key}`).not.toMatch(/\{|^(mae|y mae) /i);
      }
    }
  });

  it("every sentence with an {event} slot reads with every noun: no title inside, no empty slot", () => {
    const templates = Object.entries(en).filter(([k, v]) => !k.startsWith("event.") && !k.startsWith("_") && v.includes("{event}"));
    expect(templates.length).toBeGreaterThan(3);
    for (const [k, line] of templates) {
      for (const e of model.events) {
        for (const [lang, d] of [["en", en], ["cy", cy]] as const) {
          const out = fill(d[k]!, { event: d[eventNoun(e.id).slice(6)]!, council: "Newport", year: "2030" });
          expect(out, `${lang} ${k}`).not.toMatch(/\{\w+\}/);
          expect(out, `${lang} ${k}`).not.toMatch(/\b(The|A) (The|A)\b|\s{2}/);
          if (k !== "cause.event") expect(out, `${lang} ${k}`).not.toContain(e.name[lang]);
        }
      }
    }
  });

  it("in whole games, every {event} the stops and the time line send is a noun key", () => {
    const sent: Say[] = [];
    for (const g of [3, 8]) {
      const { state, reports } = playGame(model, g, model.starts[g % model.starts.length]!.id);
      for (const r of reports) for (const st of r.stops) sent.push(st.say);
      sent.push(...timeline(model, state).ahead.flatMap((t) => ("say" in t && t.say ? [t.say] : [])));
    }
    const withEvent = sent.filter((s) => s.vars && "event" in s.vars);
    expect(withEvent.length).toBeGreaterThan(0);
    for (const s of withEvent) expect(String(s.vars!.event), s.key).toMatch(/^board\.event\.[a-z-]+$/);
  });

  it("a river event names a river in every council it can land in, the last council on a river too", () => {
    const riverEvents = model.events.filter((e) => /\{river\}/.test(`${e.warning.en} ${e.landed.en}`));
    expect(riverEvents.length).toBeGreaterThan(0);
    const onRivers = new Set(model.links.filter((l) => l.kind === "river").flatMap((l) => [l.from, l.to]));
    for (const code of onRivers) expect(riverAt(model, code), code).toBeDefined();
    const cardiff = "W06000015";
    expect(riverAt(model, cardiff)?.en).toBeTruthy();
    for (const g of [3, 8]) {
      const { state } = playGame(model, g, model.starts[g % model.starts.length]!.id);
      for (const w of forecast(model, state).warnings) {
        if (riverEvents.some((e) => e.id === w.event)) expect(w.say.vars?.river, w.event).toBeDefined();
      }
    }
  });
});
