/**
 * Fixture, part 4: events (outside and grown, good and bad), four futures, three starts, the
 * eight endings of section 5.4 and one letter each. Severities and track values are game rules.
 */
import { tx } from "./fixture-geo";
import type { EndingDef, EventDef, EvidenceDef, FutureDef, LetterDef, StartDef, Text } from "./types";

const ev = (x: Omit<EventDef, "size" | "responses" | "sources" | "prepared_by"> & Partial<EventDef>): EventDef => ({
  size: [], responses: [], sources: [], prepared_by: [], ...x,
});
const accept = (name: Text, effects: EventDef["effects"] = []) => ({ id: "accept", name, what: tx("Let it run its course.", "Gadael iddo redeg ei gwrs."), cost: 0, effects, handled_well: false });

export const fixtureEvents: EventDef[] = [
  ev({ id: "storm-taff", name: tx("Storm winter on the Taff", "Gaeaf stormus ar afon Taf"), origin: "outside", good: false, track: "weather", severity: 3,
    trigger: [{ kind: "track", track: "weather", at_least: 0.5 }, { kind: "feature", feature: "river" }], target: { pick: "highest_risk", risk: "flood" }, travels: "downstream",
    warning: tx("Heavy rain is likely over the Taff. {councils} are most at risk.", "Mae glaw trwm yn debygol dros afon Taf. {councils} sydd fwyaf mewn perygl."),
    landed: tx("The Taff flooded in {council}.", "Gorlifodd afon Taf yn {council}."),
    effects: [{ kind: "measure", measure: "nature", points: -0.6 }, { kind: "measure", measure: "homes", points: -0.3 }],
    size: [{ when: [{ kind: "risk", risk: "flood", at_least: 3 }], factor: 1.5 }],
    prepared_by: ["slow-the-water", "coast-wetlands"],
    responses: [accept(tx("Clear up", "Clirio")), { id: "repair", name: tx("Repair and protect homes", "Trwsio a diogelu cartrefi"), what: tx("Fix homes and raise the defences.", "Trwsio cartrefi a chodi'r amddiffynfeydd."), cost: 2, effects: [{ kind: "measure", measure: "homes", points: 0.3 }], handled_well: true }] }),
  ev({ id: "downturn", name: tx("A downturn", "Dirwasgiad"), origin: "outside", good: false, track: "economy", severity: 3,
    trigger: [{ kind: "track", track: "economy", at_least: 0.5 }], target: { pick: "highest_risk", risk: "employer" },
    warning: tx("Trade is slowing. Towns that lean on one employer are most at risk: {councils}.", "Mae masnach yn arafu. Trefi sy'n dibynnu ar un cyflogwr sydd fwyaf mewn perygl: {councils}."),
    landed: tx("Jobs were lost in {council}.", "Collwyd swyddi yn {council}."), effects: [{ kind: "measure", measure: "work", points: -0.6 }],
    prepared_by: ["back-local-firms", "skills-college"], responses: [accept(tx("Ride it out", "Dal ati"))] }),
  ev({ id: "price-squeeze", name: tx("Prices squeeze", "Gwasgfa prisiau"), origin: "outside", good: false, track: "prices", severity: 3,
    trigger: [{ kind: "track", track: "prices", at_least: 0.5 }], target: { pick: "lowest_measure", measure: "homes" },
    warning: tx("Energy and rents are rising. {councils} will feel it first.", "Mae ynni a rhenti'n codi. {councils} fydd yn ei deimlo gyntaf."),
    landed: tx("Homes got colder and dearer in {council}.", "Aeth cartrefi'n oerach ac yn ddrutach yn {council}."), effects: [{ kind: "measure", measure: "homes", points: -0.5 }, { kind: "measure", measure: "health", points: -0.2 }],
    prepared_by: ["warm-terraces", "social-homes"], responses: [accept(tx("Hold steady", "Dal yn gyson"))] }),
  ev({ id: "tip-moves", name: tx("A tip moves", "Tomen yn symud"), origin: "grown", good: false, severity: 0, once: true, visit: "rhondda",
    trigger: [{ kind: "risk", risk: "tip", at_least: 3 }, { kind: "track", track: "weather", at_least: 0.5 }, { kind: "project", project: "coal-tips-safe", where: "here", status: "working", not: true }],
    target: { pick: "any" }, warning: tx("Wet ground above {council}. An unsafe tip could slip.", "Tir gwlyb uwchben {council}. Gallai tomen anniogel lithro."),
    landed: tx("A coal tip slipped above {council}.", "Llithrodd tomen lo uwchben {council}."), effects: [{ kind: "measure", measure: "nature", points: -0.5 }, { kind: "backing", points: -0.5 }] }),
  ev({ id: "employer-leaves", name: tx("The big employer leaves", "Y cyflogwr mawr yn gadael"), origin: "grown", good: false, severity: 0, once: true,
    trigger: [{ kind: "project", project: "big-employer", where: "here" }, { kind: "track", track: "economy", at_least: 0.5 }, { kind: "project", tag: "college", where: "within_link", not: true }],
    target: { pick: "any" }, warning: tx("The big employer in {council} is reviewing its sites.", "Mae'r cyflogwr mawr yn {council} yn adolygu ei safleoedd."),
    landed: tx("The big employer left {council}.", "Gadawodd y cyflogwr mawr {council}."), effects: [{ kind: "measure", measure: "work", points: -1, jobs: true }] }),
  ev({ id: "buying-rush", name: tx("Buying rush up the line", "Rhuthr prynu i fyny'r lein"), origin: "grown", good: false, severity: 0,
    trigger: [{ kind: "link_quality", at_least: 2 }, { kind: "flag", flag: "valley" }, { kind: "project", tag: "homes", where: "here", not: true }],
    target: { pick: "any" }, warning: tx("Buyers from the city are looking at {council}.", "Mae prynwyr o'r ddinas yn edrych ar {council}."),
    landed: tx("Homes in {council} got dearer fast.", "Aeth cartrefi yn {council} yn ddrutach yn gyflym."), effects: [{ kind: "measure", measure: "homes", points: -0.5 }, { kind: "young_adults", points: -0.2 }] }),
  ev({ id: "school-full", name: tx("The school is full", "Mae'r ysgol yn llawn"), origin: "grown", good: true, severity: 0, once: true,
    trigger: [{ kind: "project", project: "welsh-school", where: "here" }, { kind: "measure", measure: "welsh", op: "rising" }],
    target: { pick: "any" }, warning: tx("The Welsh-medium school in {council} is filling up.", "Mae'r ysgol Gymraeg yn {council} yn llenwi."),
    landed: tx("Families in {council} want more Welsh-medium places.", "Mae teuluoedd yn {council} eisiau mwy o lefydd cyfrwng Cymraeg."), effects: [],
    responses: [accept(tx("Not now", "Ddim nawr")), { id: "second-school", name: tx("Open a second school", "Agor ail ysgol"), what: tx("A cheap second Welsh-medium school.", "Ail ysgol Gymraeg rad."), cost: 1, effects: [{ kind: "measure", measure: "welsh", points: 0.4 }], handled_well: true }] }),
  ev({ id: "firm-grows", name: tx("A firm wants to grow here", "Mae cwmni eisiau tyfu yma"), origin: "grown", good: true, severity: 0, once: true,
    trigger: [{ kind: "project", project: "skills-college", where: "here" }, { kind: "link_quality", at_least: 2 }, { kind: "measure", measure: "work", op: "rising" }],
    target: { pick: "any" }, warning: tx("A firm in {council} is looking for room to grow.", "Mae cwmni yn {council} yn chwilio am le i dyfu."),
    landed: tx("A firm grew in {council}.", "Tyfodd cwmni yn {council}."), effects: [{ kind: "measure", measure: "work", points: 0.3, jobs: true }] }),
  ev({ id: "surgery-closes", name: tx("The surgery closes", "Y feddygfa'n cau"), origin: "grown", good: false, severity: 0,
    trigger: [{ kind: "measure", measure: "health", op: "below", value: 4 }, { kind: "share", share: "age65", op: "at_least", value: 20 }, { kind: "project", tag: "bus", where: "here", not: true }],
    target: { pick: "lowest_measure", measure: "health" }, warning: tx("A doctors' surgery in {council} may close.", "Gall meddygfa yn {council} gau."),
    landed: tx("A surgery closed in {council}.", "Caeodd meddygfa yn {council}."), effects: [{ kind: "measure", measure: "health", points: -0.3 }, { kind: "backing", points: -0.5, group: "older" }] }),
];

const track = (...v: number[]) => v;
export const fixtureFutures: FutureDef[] = [
  { id: "wet-decades", name: tx("The wet decades", "Y degawdau gwlyb"), note: tx("Storms come often.", "Mae stormydd yn dod yn aml."),
    tracks: { weather: track(0.3, 0.6, 0.4, 0.7, 0.5, 0.8, 0.4, 0.7, 0.6, 0.8, 0.5, 0.7), economy: track(0.2, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 0.2), prices: track(0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3) } },
  { id: "work-rewritten", name: tx("Work rewritten", "Gwaith yn newid"), note: tx("Jobs change fast.", "Mae swyddi'n newid yn gyflym."),
    tracks: { weather: track(0.3, 0.3, 0.4, 0.3, 0.3, 0.4, 0.3, 0.3, 0.4, 0.3, 0.3, 0.4), economy: track(0.3, 0.6, 0.5, 0.7, 0.4, 0.7, 0.5, 0.6, 0.4, 0.7, 0.5, 0.6), prices: track(0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 0.2, 0.3, 0.2, 0.2, 0.3) } },
  { id: "squeeze", name: tx("The squeeze", "Y wasgfa"), note: tx("Energy and money are tight.", "Mae ynni ac arian yn brin."),
    tracks: { weather: track(0.3, 0.4, 0.3, 0.4, 0.3, 0.4, 0.3, 0.4, 0.3, 0.4, 0.3, 0.4), economy: track(0.3, 0.4, 0.3, 0.4, 0.3, 0.4, 0.3, 0.4, 0.3, 0.4, 0.3, 0.4), prices: track(0.5, 0.7, 0.6, 0.8, 0.5, 0.7, 0.6, 0.7, 0.5, 0.6, 0.5, 0.6) } },
  { id: "quiet-years", name: tx("Quiet years", "Blynyddoedd tawel"), note: tx("Trouble comes, but slowly.", "Mae trafferth yn dod, ond yn araf."),
    tracks: { weather: track(0.3, 0.5, 0.3, 0.4, 0.3, 0.5, 0.3, 0.4, 0.3, 0.5, 0.3, 0.4), economy: track(0.3, 0.4, 0.3, 0.5, 0.3, 0.4, 0.3, 0.5, 0.3, 0.4, 0.3, 0.5), prices: track(0.3, 0.4, 0.3, 0.4, 0.3, 0.5, 0.3, 0.4, 0.3, 0.4, 0.3, 0.5) } },
];

export const fixtureStarts: StartDef[] = [
  { id: "work-valleys", name: tx("Work in the valleys", "Gwaith yn y cymoedd"), pitch: tx("You promised jobs people can reach.", "Fe wnaethoch addo swyddi y gall pobl eu cyrraedd."),
    promise: { text: tx("Work and pay up in the valleys by 2034.", "Gwaith a chyflog i fyny yn y cymoedd erbyn 2034."), by_year: 2034, kept_when: [{ kind: "measure", measure: "work", area: "edge", vs_2026: "up" }] },
    free_project: "skills-college", backing: [{ area: "edge", points: 1 }] },
  { id: "warm-homes", name: tx("Warm, safe homes", "Cartrefi cynnes, diogel"), pitch: tx("You promised warm homes people can afford.", "Fe wnaethoch addo cartrefi cynnes y gall pobl eu fforddio."),
    promise: { text: tx("Homes and community up by 2034.", "Cartrefi a chymuned i fyny erbyn 2034."), by_year: 2034, kept_when: [{ kind: "measure", measure: "homes", vs_2026: "up" }] },
    free_project: "warm-terraces", backing: [{ area: "core", points: 1 }] },
  { id: "ready-weather", name: tx("Ready for the weather", "Yn barod am y tywydd"), pitch: tx("You promised to keep homes safe from floods.", "Fe wnaethoch addo cadw cartrefi'n ddiogel rhag llifogydd."),
    promise: { text: tx("Nature and floods up by 2034.", "Natur a llifogydd i fyny erbyn 2034."), by_year: 2034, kept_when: [{ kind: "measure", measure: "nature", vs_2026: "up" }] },
    free_project: "slow-the-water", backing: [{ flag: "coal_valley", points: 0.5 }, { flag: "coast", points: 0.5 }] },
];

const young: EvidenceDef = { kind: "young_adults_change", area: "edge",
  up: tx("{council} has more young adults than in 2026.", "Mae gan {council} fwy o oedolion ifanc nag yn 2026."),
  down: tx("{council} has fewer young adults than in 2026.", "Mae gan {council} lai o oedolion ifanc nag yn 2026.") };
const homes: EvidenceDef = { kind: "measure_change", measure: "homes",
  up: tx("Homes in {council} are easier to find than in 2026.", "Mae'n haws dod o hyd i gartrefi yn {council} nag yn 2026."),
  down: tx("Homes in {council} are harder to find than in 2026.", "Mae'n anoddach dod o hyd i gartrefi yn {council} nag yn 2026.") };
const gap: EvidenceDef = { kind: "gap_change",
  up: tx("The gap between places has closed a little.", "Mae'r bwlch rhwng llefydd wedi cau ychydig."),
  down: tx("The gap between places has grown.", "Mae'r bwlch rhwng llefydd wedi tyfu.") };
const ending = (id: string, priority: number, en: string, cy: string, summary: Text, when: EndingDef["when"]): EndingDef => ({
  id, priority, name: tx(en, cy), summary, route: summary, when, evidence: [young, homes, gap],
  not_built: tx(`This could have been ${en}.`, `Gallai hyn fod wedi bod yn ${cy}.`),
});
export const fixtureEndings: EndingDef[] = [
  ending("two-countries", 1, "Two countries", "Dwy wlad", tx("The lowest places fell behind.", "Syrthiodd y llefydd isaf ar ôl."), [{ kind: "keystones", at_least: 1 }, { kind: "lowest_three", vs_2026: "lower" }]),
  ending("joined-up-valleys", 2, "The joined-up valleys", "Y cymoedd cysylltiedig", tx("Work came up the line.", "Daeth gwaith i fyny'r lein."), [{ kind: "keystone", project: "work-up-the-line" }, { kind: "gap", vs_2026: "closed" }]),
  ending("workshop", 3, "The workshop", "Y gweithdy", tx("A cluster rooted. Nature fell behind.", "Gwreiddiodd clwstwr. Syrthiodd natur ar ôl."), [{ kind: "keystone", project: "cluster-roots" }]),
  ending("green-valleys", 4, "The green valleys", "Y cymoedd gwyrdd", tx("Rivers got room. Storms passed.", "Cafodd afonydd le. Pasiodd stormydd."), [{ kind: "keystone", project: "rivers-room" }]),
  ending("warm-country", 5, "The warm country", "Y wlad gynnes", tx("Every home warm. The gap smallest.", "Pob cartref yn gynnes. Y bwlch lleiaf."), [{ kind: "keystone", project: "heat-and-homes" }]),
  ending("city-bedrooms", 6, "The city and its bedrooms", "Y ddinas a'i hystafelloedd gwely", tx("Lines upgraded, valleys emptied.", "Llinellau wedi'u gwella, cymoedd wedi gwagio."), [{ kind: "keystones", at_most: 0 }, { kind: "links_upgraded", at_least: 1 }, { kind: "young_adults", area: "edge", vs_2026: "fell" }]),
  ending("patchwork", 7, "The patchwork", "Y clytwaith", tx("A little better everywhere.", "Ychydig yn well ym mhobman."), [{ kind: "keystones", at_most: 0 }, { kind: "projects", tier: 1, at_least: 4 }, { kind: "wales", vs_2026: "better" }]),
  ending("drift", 8, "The drift", "Y drifft", tx("Little built. Risks landed.", "Ychydig wedi'i adeiladu. Daeth y peryglon."), []),
];

export const fixtureLetters: LetterDef[] = fixtureEndings.map((e) => ({
  id: `letter-${e.id}`, ending: e.id, lower: "either",
  salutation: tx("To whoever ran Wales from 2026,", "At bwy bynnag oedd yn rhedeg Cymru o 2026,"),
  body: tx(`I live in {town}, in {council}. This is ${e.name.en}.`, `Rwy'n byw yn {town}, yn {council}. Dyma ${e.name.cy}.`),
  named: tx("I still think about {project}, in {year}.", "Rwy'n dal i feddwl am {project}, yn {year}."),
  signoff: tx("From someone in {town} (a made-up voice)", "Gan rywun yn {town} (llais dychmygol)"),
}));
