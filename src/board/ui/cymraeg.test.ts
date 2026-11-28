/**
 * Welsh slot sentences (playtest 8, must-fix 19). The grammar is checked against forms written out
 * by hand, then every Welsh board sentence is filled with every value its slots can take (each
 * council, town and place, each season, each event and each measure) and read back for a name that
 * did not mutate after its preposition, an article that did not join ("o yr haf"), or a capital
 * article mid-sentence ("bod yn Y gambl"). Every board screen fills its Welsh through this grammar:
 * the last test checks no board screen imports `t` from src/i18n directly.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { VERB_FIRST, fillCy, firstWord, listCy, numberWords } from "./cymraeg";

const root = join(__dirname, "..", "..", "..");

/** Name: [after a soft trigger, after "yn" (a place), after "a" (and)]. Written out by hand. */
const FORMS: Record<string, [string, string, string]> = {
  "Pen-y-bont ar Ogwr": ["i Ben-y-bont ar Ogwr", "ym Mhen-y-bont ar Ogwr", "a Phen-y-bont ar Ogwr"],
  "Bro Morgannwg": ["i Fro Morgannwg", "ym Mro Morgannwg", "a Bro Morgannwg"],
  "Caerdydd": ["i Gaerdydd", "yng Nghaerdydd", "a Chaerdydd"],
  "Rhondda Cynon Taf": ["i Rondda Cynon Taf", "yn Rhondda Cynon Taf", "a Rhondda Cynon Taf"],
  "Caerffili": ["i Gaerffili", "yng Nghaerffili", "a Chaerffili"],
  "Blaenau Gwent": ["i Flaenau Gwent", "ym Mlaenau Gwent", "a Blaenau Gwent"],
  "Tor-faen": ["i Dor-faen", "yn Nhor-faen", "a Thor-faen"],
  "Sir Fynwy": ["i Sir Fynwy", "yn Sir Fynwy", "a Sir Fynwy"],
  "Casnewydd": ["i Gasnewydd", "yng Nghasnewydd", "a Chasnewydd"],
  "Merthyr Tudful": ["i Ferthyr Tudful", "ym Merthyr Tudful", "a Merthyr Tudful"],
  "Castell-nedd Port Talbot": ["i Gastell-nedd Port Talbot", "yng Nghastell-nedd Port Talbot", "a Chastell-nedd Port Talbot"],
  "Powys": ["i Bowys", "ym Mhowys", "a Phowys"],
  "Maesteg": ["i Faesteg", "ym Maesteg", "a Maesteg"],
  "Penarth": ["i Benarth", "ym Mhenarth", "a Phenarth"],
  "Treorci": ["i Dreorci", "yn Nhreorci", "a Threorci"],
  "Aberdâr": ["i Aberdâr", "yn Aberdâr", "ac Aberdâr"],
  "Pendyrus": ["i Bendyrus", "ym Mhendyrus", "a Phendyrus"],
  "Bargod": ["i Fargod", "ym Margod", "a Bargod"],
  "Glynebwy": ["i Lynebwy", "yng Nglynebwy", "a Glynebwy"],
  "Tredegar": ["i Dredegar", "yn Nhredegar", "a Thredegar"],
  "Pont-y-pŵl": ["i Bont-y-pŵl", "ym Mhont-y-pŵl", "a Phont-y-pŵl"],
  "Blaenafon": ["i Flaenafon", "ym Mlaenafon", "a Blaenafon"],
  "Trefynwy": ["i Drefynwy", "yn Nhrefynwy", "a Threfynwy"],
  "Dowlais": ["i Ddowlais", "yn Nowlais", "a Dowlais"],
  "Grangetown": ["i Grangetown", "yn Grangetown", "a Grangetown"],
  "Pill": ["i Bil", "ym Mhil", "a Phil"],
  "Sblot": ["i Sblot", "yn Sblot", "a Sblot"],
  "Gwastadeddau Gwent": ["i Wastadeddau Gwent", "yng Ngwastadeddau Gwent", "a Gwastadeddau Gwent"],
  "Y Barri": ["i'r Barri", "yn y Barri", "a'r Barri"],
  "Y Fenni": ["i'r Fenni", "yn y Fenni", "a'r Fenni"],
  "Y Rhondda": ["i'r Rhondda", "yn y Rhondda", "a'r Rhondda"],
};

describe("Welsh slot grammar", () => {
  for (const [name, [soft, yn, and]] of Object.entries(FORMS)) {
    it(`mutates ${name}`, () => {
      expect(fillCy("Mynd i {council}.", { council: name })).toBe(`Mynd ${soft}.`);
      expect(fillCy("Byw yn {council}.", { council: name })).toBe(`Byw ${yn}.`);
      expect(fillCy("Caerdydd a {council}.", { council: name })).toBe(`Caerdydd ${and}.`);
    });
  }

  it("capitalises yn at the start of a line, and joins the article to the word before", () => {
    expect(fillCy("Yn {council}: storm.", { council: "Casnewydd" })).toBe("Yng Nghasnewydd: storm.");
    expect(fillCy("Yn {council}: storm.", { council: "Merthyr Tudful" })).toBe("Ym Merthyr Tudful: storm.");
    expect(fillCy("yn gweithio o {when}", { when: "yr haf 2031" })).toBe("yn gweithio o'r haf 2031");
    expect(fillCy("yn {when}", { when: "y gaeaf 2031" })).toBe("yn y gaeaf 2031");
    expect(fillCy("Mae {measure} yn isel.", { measure: "Y Gymraeg a diwylliant" })).toBe("Mae'r Gymraeg a diwylliant yn isel.");
    expect(fillCy("Roedd hi'n bod yn {ending}.", { ending: "Y gambl" })).toBe("Roedd hi'n bod yn y gambl.");
    expect(fillCy("{town}, 2050.", { town: "Y Barri" })).toBe("Y Barri, 2050.");
    expect(fillCy("Rhybudd: {name}", { name: "Y feddygfa'n cau" })).toBe("Rhybudd: Y feddygfa'n cau");
  });

  it("softens describing words after yn, but not Ll or Rh", () => {
    expect(fillCy("aeth yn {grade}", { grade: "da" })).toBe("aeth yn dda");
    expect(fillCy("Mae pobl yma yn {mood}.", { mood: "bodlon" })).toBe("Mae pobl yma yn fodlon.");
    expect(fillCy("lle mae'r perygl yn {step}", { step: "canolig" })).toBe("lle mae'r perygl yn ganolig");
    expect(fillCy("yn {mood}", { mood: "llawen" })).toBe("yn llawen");
  });

  it("leaves numbers, glued slots and slots after other words alone", () => {
    expect(fillCy("i {n} o {max}", { n: 3, max: 10 })).toBe("i 3 o 10");
    expect(fillCy("Gadawodd teuluoedd {council}.", { council: "Caerdydd" })).toBe("Gadawodd teuluoedd Caerdydd.");
    expect(fillCy("ger {council}", { council: "Caerdydd" })).toBe("ger Caerdydd");
    expect(fillCy("(i{x})", { x: "Caerdydd" })).toBe("(iCaerdydd)");
    expect(fillCy("Mae {unknown} yma", {})).toBe("Mae {unknown} yma");
  });

  it("fills a slot that opens the line and the slot after it", () => {
    expect(fillCy("{council}: {measure} {d} o {year}.", { council: "Caerdydd", measure: "Iechyd", d: "+0.6", year: 2027 })).toBe("Caerdydd: Iechyd +0.6 o 2027.");
    expect(fillCy("{name}, {from} i {to}.", { name: "Dal ati", from: 2026, to: 2030 })).toBe("Dal ati, 2026 i 2030.");
    expect(fillCy("{year}: {result}, gyda {n}", { year: 2030, result: "fe enilloch chi", n: 8 })).toBe("2030: fe enilloch chi, gyda 8");
  });

  it("mutates the word after a number written as a figure", () => {
    expect(numberWords("yn cymryd 1 blynedd")).toBe("yn cymryd 1 flwyddyn");
    expect(numberWords("yn cymryd 2 blynedd")).toBe("yn cymryd 2 flynedd");
    expect(numberWords("yn cymryd 3 blynedd")).toBe("yn cymryd 3 blynedd");
    expect(numberWords("yn cymryd 8 blynedd")).toBe("yn cymryd 8 mlynedd");
    expect(numberWords("yn cymryd 0.5 blynedd")).toBe("yn cymryd 0.5 o flynyddoedd");
    expect(numberWords("pan fydd 2 prosiect mwy")).toBe("pan fydd 2 brosiect mwy");
    expect(numberWords("2 cyngor, 12 cyngor, +0.2 o 2027, 2 o 10")).toBe("2 gyngor, 12 cyngor, +0.2 o 2027, 2 o 10");
  });

  it("writes a project's name that opens with a verb-noun in lower case mid-sentence (playtest 10, S10)", () => {
    expect(fillCy("Byddai {project} yno'n gyntaf wedi lleddfu'r ergyd.", { project: "Cefnogi cwmnïau lleol" })).toBe("Byddai cefnogi cwmnïau lleol yno'n gyntaf wedi lleddfu'r ergyd.");
    expect(fillCy("Angen i {project} weithio yma.", { project: "Arafu'r dŵr i fyny'r afon" })).toBe("Angen i arafu'r dŵr i fyny'r afon weithio yma.");
    // a name that opens with a noun keeps its capital, which marks it as a name
    expect(fillCy("Mae {project} yn gweithio.", { project: "Iechyd yn agos at adref" })).toBe("Mae Iechyd yn agos at adref yn gweithio.");
    expect(fillCy("Angen i {project} weithio yma.", { project: "Trenau aml ar lein y cwm" })).toBe("Angen i Drenau aml ar lein y cwm weithio yma.");
    expect(fillCy("{project}: {list}", { project: "Cefnogi cwmnïau lleol", list: "Iechyd" })).toBe("Cefnogi cwmnïau lleol: Iechyd");
    expect(fillCy("Brig y gangen: {keystone}.", { keystone: "Ardal yr orsaf" })).toBe("Brig y gangen: Ardal yr orsaf.");
    // a council or a law keeps its capital
    expect(fillCy("Mae {council} yn llithro.", { council: "Sir Fynwy" })).toBe("Mae Sir Fynwy yn llithro.");
  });

  it("knows of every project's name whether it opens with a verb-noun or a noun", () => {
    // written out by hand: a new project's first word must be put in one list or the other
    const NOUN_FIRST = new Set(["trenau", "bysiau", "ardal", "gwaith", "coleg", "ynni", "clwstwr", "gwlyptiroedd", "parc", "cartrefi",
      "ysgol", "iechyd", "gwres", "tîm", "cwmnïau"]);
    const projects = yaml.load(readFileSync(join(root, "model", "board", "projects.yaml"), "utf8")) as { projects: { name: Text }[] };
    const unknown = projects.projects.map((p) => p.name.cy).filter((n) => !VERB_FIRST.has(firstWord(n)) && !NOUN_FIRST.has(firstWord(n)));
    expect(unknown).toEqual([]);
    for (const w of NOUN_FIRST) expect(VERB_FIRST.has(w), w).toBe(false);
  });

  it("writes Pill as Pil, with its mutation, also when the slot carries its council (playtest 10, S10)", () => {
    expect(fillCy("Siopwr yn {town}", { town: "Pill, yng Nghasnewydd" })).toBe("Siopwr ym Mhil, yng Nghasnewydd");
    expect(fillCy("Roedd bywyd yn dal i wella yn {town}.", { town: "Pill" })).toBe("Roedd bywyd yn dal i wella ym Mhil.");
  });

  it("writes a group in lower case mid-sentence, and softens a mood after 'n", () => {
    expect(fillCy("Mae {group} yma'n {mood}.", { group: "Pawb", mood: "bodlon" })).toBe("Mae pawb yma'n fodlon.");
    expect(fillCy("Mae {group} yma'n {mood}.", { group: "Siaradwyr Cymraeg", mood: "anesmwyth" })).toBe("Mae siaradwyr Cymraeg yma'n anesmwyth.");
    expect(fillCy("{group}: {why}", { group: "Pobl hŷn", why: "x" })).toBe("Pobl hŷn: x");
  });

  it("joins the article after a mutated verb-noun: i godi'r Gymraeg", () => {
    expect(fillCy("bargen i godi {measure}.", { measure: "Y Gymraeg a diwylliant" })).toBe("bargen i godi'r Gymraeg a diwylliant.");
  });

  it("says one 'afon', and writes lists with the aspirate and 'ac'", () => {
    expect(fillCy("Gorlifodd afon {river}.", { river: "Afon Lwyd" })).toBe("Gorlifodd Afon Lwyd.");
    expect(fillCy("Gorlifodd afon {river}.", { river: "Taf" })).toBe("Gorlifodd afon Taf.");
    expect(listCy(["Casnewydd", "Caerffili"])).toBe("Casnewydd a Chaerffili");
    expect(listCy(["Casnewydd", "Tor-faen", "Abertawe"])).toBe("Casnewydd, Tor-faen ac Abertawe");
    expect(listCy(["Trenau aml", "Parc"], true)).toBe("Trenau aml neu Barc");
    expect(fillCy("yn {councils}", { councils: listCy(["Casnewydd", "Caerffili"]) })).toBe("yng Nghasnewydd a Chaerffili");
  });
});

// ---- every Welsh sentence, with every value its slots can take ----

type Text = { en: string; cy: string };
function texts(node: unknown): Text[] {
  if (Array.isArray(node)) return node.flatMap(texts);
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.en === "string" && typeof o.cy === "string") return [o as unknown as Text];
    return Object.values(o).flatMap(texts);
  }
  return [];
}
const yamls = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? yamls(join(d, n)) : n.endsWith(".yaml") ? [join(d, n)] : []));
const modelTexts = yamls(join(root, "model", "board")).flatMap((f) => texts(yaml.load(readFileSync(f, "utf8"))));
const words = (area: string, lang: "en" | "cy") => JSON.parse(readFileSync(join(root, "model", "i18n", lang, `${area}.json`), "utf8")) as Record<string, unknown>;
const AREAS = ["board", "boardui", "boardend", "boardclock"];
const sentences: { where: string; cy: string }[] = [
  ...AREAS.flatMap((a) => Object.entries(words(a, "cy")).filter(([k, v]) => !k.startsWith("_") && typeof v === "string").map(([k, v]) => ({ where: `${a}.${k}`, cy: v as string }))),
  ...modelTexts.map((t) => ({ where: t.en.slice(0, 40), cy: t.cy })),
].filter((s) => /\{\w+\}/.test(s.cy));

/** Slots that take a council, town or place in some sentence. */
const PLACE_SLOTS = ["council", "town", "place", "site", "other", "here", "where", "name", "a", "b", "from", "region", "council_name"];
const cyWords = words("board", "cy");
const eventNouns = Object.entries(cyWords).filter(([k]) => k.startsWith("event.")).map(([, v]) => v as string);
const seasons = ["yr haf", "yr hydref", "y gaeaf", "y gwanwyn"].map((s) => `${s} 2031`);
const measures = texts(yaml.load(readFileSync(join(root, "model", "board", "measures.yaml"), "utf8"))).map((t) => t.cy);

/** What the grammar should never produce, for a sentence filled with `raw`. */
function faults(out: string, raw: string): string[] {
  const bad: string[] = [];
  const f = FORMS[raw];
  const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // the trigger word in either case, the name exactly as written (an article name is checked below)
  const after = (words: string) => new RegExp(`(^|[\\s(])(${words}) ${esc}(?![\\wâêîôûŵŷ])`, "i");
  if (f && !/^Yr? /.test(raw)) {
    if (f[0] !== `i ${raw}` && after("i|o|am|ar|at|dan|dros|drwy|gan|heb|wrth|hyd|neu").test(out)) bad.push("no soft mutation");
    if (f[1] !== `yn ${raw}` && after("yn").test(out)) bad.push("no nasal mutation after yn");
    if (f[2].startsWith("ac ") ? after("a|â").test(out) : f[2] !== `a ${raw}` && after("a|â|gyda|tua|na").test(out)) bad.push("no aspirate mutation");
  }
  if (/(^|[\s(])(i|o|a|â|gyda|tua|na|mae) (y|yr) /i.test(out)) bad.push("article not joined");
  if (/[a-zâêîôûŵŷ] (Y|Yr) [a-zâêîôûŵŷ]/.test(out)) bad.push("capital article mid-sentence");
  if (/\b(yn|i|o|a) \1 /i.test(out)) bad.push("word twice");
  if (/\bafon afon\b/i.test(out)) bad.push("afon twice");
  return bad;
}

describe("every Welsh board sentence, filled with every value", () => {
  it("the check catches the playtest's faults", () => {
    expect(faults("Mae storm yn Casnewydd.", "Casnewydd")).toEqual(["no nasal mutation after yn"]);
    expect(faults("Mae storm yn Blaenau Gwent.", "Blaenau Gwent")).toEqual(["no nasal mutation after yn"]);
    expect(faults("Daeth trafferth i Caerffili.", "Caerffili")).toEqual(["no soft mutation"]);
    expect(faults("yn gweithio o yr haf 2031", "yr haf 2031")).toEqual(["article not joined"]);
    expect(faults("Gallai fod yn Y gambl.", "Y gambl")).toEqual(["capital article mid-sentence"]);
    expect(faults("Y fargen gyda Caerdydd", "Caerdydd")).toEqual(["no aspirate mutation"]);
  });

  it("finds the sentences", () => {
    expect(sentences.length).toBeGreaterThan(300);
  });

  it("mutates every council, town and place after the word before it", () => {
    const wrong: string[] = [];
    for (const s of sentences) {
      for (const raw of Object.keys(FORMS)) {
        const vars = Object.fromEntries(PLACE_SLOTS.map((k) => [k, raw]));
        vars.councils = listCy([raw, "Casnewydd"]);
        vars.list = listCy([raw, "Casnewydd"]);
        const out = fillCy(s.cy, vars);
        for (const b of faults(out, raw)) wrong.push(`${s.where}: ${b}: ${out}`);
      }
    }
    expect([...new Set(wrong)]).toEqual([]);
  });

  it("joins the article of a season, an event and a measure", () => {
    const wrong: string[] = [];
    for (const s of sentences) {
      for (const v of [...seasons, ...eventNouns, ...measures]) {
        const out = fillCy(s.cy, { when: v, season: v, event: v, measure: v, quantity: v, from: v, to: v });
        for (const b of faults(out, v)) wrong.push(`${s.where}: ${b}: ${out}`);
      }
    }
    expect([...new Set(wrong)]).toEqual([]);
  });

  it("mutates the word after every number a slot can hold", () => {
    const wrong: string[] = [];
    const NUM = ["n", "years", "need", "have", "working", "max", "total", "of", "level", "tier", "backers", "councils", "coins", "rings", "steps", "min"];
    for (const s of sentences) {
      for (const k of [1, 2, 5, 8]) {
        const out = fillCy(s.cy, Object.fromEntries(NUM.map((x) => [x, k])));
        if (/(?<![\d.])(1|2|5|8) blynedd\b/.test(out)) wrong.push(`${s.where}: years: ${out}`);
        if (/(?<![\d.])2 (p(?!h)|t(?!h)|c(?!h)|m|ll|rh)/.test(out)) wrong.push(`${s.where}: after two: ${out}`);
      }
    }
    expect([...new Set(wrong)]).toEqual([]);
  });

  it("never asks 'yn' to carry a grade that already says 'yn'", () => {
    const grades = Object.entries(words("boardend", "cy")).filter(([k]) => k.startsWith("grade.")).map(([, v]) => v as string);
    for (const s of sentences.filter((x) => x.cy.includes("{grade}"))) {
      for (const g of grades) expect(fillCy(s.cy, { grade: g, place: "Glynebwy" }), s.where).not.toMatch(/\byn yn\b/);
    }
  });
});

describe("every board screen fills its Welsh through the grammar", () => {
  it("imports t and tn from the board's lang.ts, never from src/i18n", () => {
    const dir = __dirname;
    const files = (readdirSync(dir, { recursive: true }) as string[]).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && f !== "lang.ts");
    const direct = files.filter((f) => /from\s+"(\.\.\/)+i18n"/.test(readFileSync(join(dir, f), "utf8")));
    expect(direct.map((f) => relative(root, join(dir, f)))).toEqual([]);
  });
});

// ---- the board's agreed Welsh words, and lines that must fit (playtest 9, must-fix 10, should-fix 13) ----

/** Every Welsh board string: the four copy files and every cy field under model/board. */
const allCy: { where: string; cy: string }[] = [
  ...AREAS.flatMap((a) => Object.entries(words(a, "cy")).filter(([k, v]) => !k.startsWith("_") && typeof v === "string").map(([k, v]) => ({ where: `${a}.${k}`, cy: v as string }))),
  ...modelTexts.map((t) => ({ where: t.en.slice(0, 40), cy: t.cy })),
];

/** Words the Welsh board never uses, each with the word it uses instead. */
const NOT_THESE: [RegExp, string][] = [
  [/\b(c|g|ch|ngh)arreg glo\b/i, "the keystone is maen clo (carreg glo is a lump of coal)"],
  [/onglf(aen|eini)/i, "the keystone is maen clo, plural meini clo"],
  [/\bcytundeb/i, "a deal is bargen"],
  [/\b(d|dd|nh)eddf\b/i, "a law is cyfraith, as on the laws sheet"],
  [/Wedi'i wneud yma/, "the branch is Diwydiant lleol, which reads after a preposition"],
  [/^\s*costs?\s*:?\s*$/i, "a price label is Pris"],
  [/\bCOSTS?\b/, "a price label is Pris"],
  [/\bpunnoedd\b/i, "after a figure, punt"],
  [/\bBeth bynnag y canlyniad\b/, "Beth bynnag fo'r canlyniad"],
  [/\bPa le\b/, "Ble"],
  [/\bAr ôl ar gyfer 2050\b/, "Gwaddol 2050"],
  [/\bBywyd yn eich blynyddoedd\b/, "Bywyd yn eich cyfnod"],
  [/\boddi ar y pris llawn o\b/, "Gostyngiad o {n}: y pris llawn yw {full}"],
  // playtest 10, should-fix 10
  [/\bDe Ddwyrain\b/, "De-ddwyrain Cymru, with a hyphen"],
  [/Swydd Gaerloyw'r De/, "De Swydd Gaerloyw"],
  [/\bY feddygfa'n cau\b/, "Meddygfa'n cau, as the event reads in a sentence"],
  [/\b(g|ch)wmni\b(?! (mawr|lleol|yn|sy|i|gan))|\bgyda chwmni\b/, "a project with company has cymdogion (cwmni reads as a firm)"],
  [/\byn gofyn am \{(measure|a)\}/i, "a council wants to see {measure} get better: eisiau gweld ... yn gwella"],
  [/\{ending\}, na wnaethoch/, "an ending can be plural: y Gymru na wnaethoch chi ei hadeiladu"],
  [/(^|[.!?:] )Chofnodwyd\b/, "this formal negative opens with Ni: Ni chofnodwyd"],
  [/\bdewch â'r .* draw\b/, "bring round is ennill, or 'mae angen i'r rhain eich cefnogi'"],
];

describe("the board's Welsh words", () => {
  it("the check catches the playtest's words", () => {
    const hit = (s: string) => NOT_THESE.some(([re]) => re.test(s));
    for (const s of ["Carreg glo: brig y gangen hon", "Y flwyddyn olaf i ddechrau carreg glo", "COST", "Costs", "Mae conglfaen yn sefyll", "711.2 punnoedd yr wythnos"]) expect(hit(s), s).toBe(true);
    for (const s of ["Pris", "Cost cynnal: tua 1 darn arian y flwyddyn.", "Maen clo: brig y gangen hon", "Y gost:"]) expect(hit(s), s).toBe(false);
    for (const s of ["Chwarae: arwain De Ddwyrain Cymru", "Bryste a Swydd Gaerloyw'r De", "Y feddygfa'n cau", "ac mae ganddo gwmni am flynyddoedd",
      "Yn gofyn am {a}, ac am {b}.", "{ending}, na wnaethoch ei hadeiladu", "Chofnodwyd dim newid o'r maint hwn.", "I ennill, dewch â'r cynghorau hyn draw:"]) expect(hit(s), s).toBe(true);
    for (const s of ["Chwarae: arwain De-ddwyrain Cymru", "Ni chofnodwyd dim.", "Daeth y cwmni mawr", "Mae cwmni yn {council} yn chwilio am le", "Chwaraewch ar liniadur"]) expect(hit(s), s).toBe(false);
  });

  it("never uses a word the board has replaced", () => {
    const bad = allCy.flatMap((s) => NOT_THESE.filter(([re]) => re.test(s.cy)).map(([, use]) => `${s.where}: ${use}: ${s.cy}`));
    expect(bad).toEqual([]);
  });
});

/**
 * The top strip's lines do not wrap (clock.css), so a Welsh line much longer than the English
 * pushed the strip wider than the screen and hid the language switch at 2050 (cymraeg g1-44).
 * Each strip line in Welsh stays within a quarter of its English length, plus a few letters.
 */
const STRIP: Record<string, string[]> = {
  boardclock: ["purse.count", "purse.full", "purse.soon", "head.up", "head.down", "head.same", "head.building", "head.ifBuilt",
    ...["budget", "rising", "earns", "running", "care", "weak"].flatMap((k) => [`income.why.${k}.up`, `income.why.${k}.down`])],
  boardui: ["strip.left", "strip.left2050", "strip.life", "strip.outOf100", "strip.income", "strip.coinsAfter", "strip.coinsNote", "strip.backers"],
};

describe("the top strip in Welsh", () => {
  it("keeps every line about as short as the English", () => {
    const long: string[] = [];
    for (const [area, keys] of Object.entries(STRIP)) {
      const en = words(area, "en"), cy = words(area, "cy");
      for (const k of keys) {
        const e = String(en[k] ?? ""), c = String(cy[k] ?? "");
        expect(e && c, `${area}.${k}`).toBeTruthy();
        if (c.length > e.length * 1.25 + 4) long.push(`${area}.${k}: ${c.length} letters against ${e.length}: ${c}`);
      }
    }
    expect(long).toEqual([]);
  });
});
