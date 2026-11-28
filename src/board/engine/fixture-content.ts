/**
 * Fixture, part 3: the four branches and their projects (section 5.3, trimmed), pairs, laws,
 * groups and two places. Costs and effect sizes are starting values (tune), game rules.
 */
import { MERTHYR, RCT, tx } from "./fixture-geo";
import type { BranchDef, Condition, Effect, EffectBase, GroupDef, LawDef, PairDef, MeasureId, PlaceDef, ProjectDef, Text, Tier } from "./types";

const gate = (branch: string, tier: Tier): Condition[] =>
  tier === 1 ? [] : [{ kind: "project", branch, tier: (tier - 1) as Tier, where: "anywhere", at_least: tier === 2 ? 3 : 2 }];
const branch = (id: string, name: Text, note: Text): BranchDef => ({
  id, name, note,
  tiers: [{ tier: 1, opens: gate(id, 1) }, { tier: 2, opens: gate(id, 2) }, { tier: 3, opens: gate(id, 3) }],
});

export const fixtureBranches: BranchDef[] = [
  branch("valleys", tx("Joined-up valleys", "Cymoedd cysylltiedig"), tx("Rail, towns and reach.", "Rheilffyrdd, trefi a chyrraedd.")),
  branch("made_here", tx("Made here", "Wedi'i wneud yma"), tx("Skills and firms that stay.", "Sgiliau a chwmnïau sy'n aros.")),
  branch("landscape", tx("Living landscape", "Tirwedd fyw"), tx("Tips, water and woods.", "Tomenni, dŵr a choed.")),
  branch("homes", tx("Good homes, strong communities", "Cartrefi da, cymunedau cryf"), tx("Homes, health and Welsh.", "Cartrefi, iechyd a'r Gymraeg.")),
];

const m = (measure: MeasureId, points: number, more: EffectBase & { jobs?: boolean } = {}): Effect => ({ kind: "measure", measure, points, ...more });

interface P {
  id: string; branch: string; tier: Tier; name: Text; what: Text; example: Text; cost: number; build: number;
  effects: Effect[]; tags: string[]; site?: "council" | "link"; needs?: Condition[]; running?: { coins: number; every_turns: number };
  catch?: Text; visit?: string;
}
const project = (x: P): ProjectDef => ({
  id: x.id, branch: x.branch, tier: x.tier, keystone: x.tier === 3, name: x.name, what: x.what, example: x.example,
  catch: x.catch, site: x.site ?? "council", cost: x.cost, build_turns: x.build, running: x.running, needs: x.needs ?? [],
  effects: x.effects, upgrade_costs: x.tier === 3 ? undefined : [x.cost, x.cost + 1], level_factor: [1, 2.2, 3.5],
  tags: x.tags, visit: x.visit, sources: [],
});

export const fixtureProjects: ProjectDef[] = [
  project({ id: "frequent-trains", branch: "valleys", tier: 1, site: "link", cost: 3, build: 1, tags: ["rail"],
    name: tx("Frequent trains on a valley line", "Trenau aml ar lein y cwm"), what: tx("More trains, more often, on one stretch of line.", "Mwy o drenau, yn amlach, ar un darn o'r lein."),
    example: tx("The Merthyr line into Pontypridd and Cardiff.", "Llinell Merthyr i Bontypridd a Chaerdydd."),
    effects: [{ kind: "link_quality", steps: 1 }, m("climate", 0.2, { where: "link_ends" })] }),
  project({ id: "buses-meet-trains", branch: "valleys", tier: 1, cost: 2, build: 1, tags: ["bus", "services"], running: { coins: 1, every_turns: 2 },
    name: tx("Buses that meet the trains", "Bysiau sy'n cwrdd â'r trenau"), what: tx("Buses timed to the trains, from the top of the valley.", "Bysiau wedi'u hamseru gyda'r trenau, o ben y cwm."),
    example: tx("Maerdy to Porth.", "Maerdy i'r Porth."), effects: [m("health", 0.3), m("work", 0.2)] }),
  project({ id: "station-quarter", branch: "valleys", tier: 2, cost: 4, build: 2, tags: ["homes", "jobs"], needs: [{ kind: "feature", feature: "rail" }],
    name: tx("Station quarter", "Ardal yr orsaf"), what: tx("Homes, a health centre and workspace by the station.", "Cartrefi, canolfan iechyd a gweithle wrth yr orsaf."),
    example: tx("Pontypridd.", "Pontypridd."), effects: [m("homes", 0.5), m("work", 0.4, { jobs: true }), { kind: "block", spread: "S2", share: 0.8 }] }),
  project({ id: "work-up-the-line", branch: "valleys", tier: 3, cost: 7, build: 3, tags: ["jobs"], needs: [{ kind: "link_quality", at_least: 2 }],
    name: tx("Work comes up the line", "Gwaith yn dod i fyny'r lein"), what: tx("Public bodies and firms take offices in valley towns on fast lines.", "Cyrff cyhoeddus a chwmnïau yn cymryd swyddfeydd mewn trefi'r cymoedd."),
    example: tx("Offices in Merthyr Tydfil and Aberdare.", "Swyddfeydd ym Merthyr Tudful ac Aberdâr."), effects: [m("work", 1, { jobs: true }), { kind: "special", special: "reverse_commute" }] }),

  project({ id: "skills-college", branch: "made_here", tier: 1, cost: 3, build: 1, tags: ["college"],
    name: tx("Skills college and apprenticeships", "Coleg sgiliau a phrentisiaethau"), what: tx("Courses and apprenticeships for local work.", "Cyrsiau a phrentisiaethau ar gyfer gwaith lleol."),
    example: tx("Merthyr Tydfil or Nantgarw.", "Merthyr Tudful neu Nantgarw."), effects: [m("work", 0.4, { after_turns: 2 })] }),
  project({ id: "back-local-firms", branch: "made_here", tier: 1, cost: 2, build: 1, tags: ["jobs"],
    name: tx("Back local firms", "Cefnogi cwmnïau lleol"), what: tx("Public bodies buy from firms nearby.", "Cyrff cyhoeddus yn prynu gan gwmnïau cyfagos."),
    example: tx("Councils in the valleys buying locally.", "Cynghorau yn y cymoedd yn prynu'n lleol."), effects: [m("work", 0.2, { jobs: true }), { kind: "risk", risk: "employer", steps: -1 }] }),
  project({ id: "big-employer", branch: "made_here", tier: 1, cost: 4, build: 0, tags: ["jobs", "big_employer"],
    name: tx("Land a big employer", "Denu cyflogwr mawr"), what: tx("One large firm opens a site. It works at once.", "Mae un cwmni mawr yn agor safle. Mae'n gweithio ar unwaith."),
    catch: tx("A town that leans on one firm is at risk if it leaves.", "Mae tref sy'n dibynnu ar un cwmni mewn perygl os yw'n gadael."),
    example: tx("A distribution centre by the A470.", "Canolfan ddosbarthu wrth yr A470."), effects: [m("work", 0.8, { jobs: true }), { kind: "risk", risk: "employer", steps: 1 }] }),
  project({ id: "community-energy", branch: "made_here", tier: 2, cost: 3, build: 2, tags: ["energy"],
    name: tx("Community-owned energy", "Ynni dan berchnogaeth gymunedol"), what: tx("Hill wind and hydro, with the income kept locally.", "Gwynt a dŵr ar y bryniau, gyda'r incwm yn aros yn lleol."),
    example: tx("Above the Cynon valley.", "Uwchben Cwm Cynon."), effects: [m("climate", 0.5), m("homes", 0.2), { kind: "coins", coins: 1, every_turns: 2, only_if: [{ kind: "project", project: "community-energy", where: "here", min_level: 2 }] }] }),
  project({ id: "cluster-roots", branch: "made_here", tier: 3, cost: 7, build: 3, tags: ["jobs"],
    name: tx("A cluster that roots", "Clwstwr sy'n gwreiddio"), what: tx("Advanced manufacturing that stays if colleges feed it.", "Gweithgynhyrchu uwch sy'n aros os yw colegau'n ei fwydo."),
    example: tx("Advanced manufacturing near Cardiff.", "Gweithgynhyrchu uwch ger Caerdydd."), effects: [m("work", 1.4, { jobs: true }), { kind: "special", special: "cluster_roots" }] }),

  project({ id: "coal-tips-safe", branch: "landscape", tier: 1, cost: 4, build: 2, tags: ["nature", "tips"], needs: [{ kind: "feature", feature: "coal_tips" }], visit: "rhondda",
    name: tx("Make coal tips safe", "Gwneud tomenni glo yn ddiogel"), what: tx("Drain and reshape the tips most at risk.", "Draenio ac ail-lunio'r tomenni sydd fwyaf mewn perygl."),
    example: tx("Tylorstown and Maerdy.", "Pendyrus a Maerdy."), effects: [{ kind: "risk", risk: "tip", steps: -1 }, m("nature", 0.2)] }),
  project({ id: "slow-the-water", branch: "landscape", tier: 1, cost: 2, build: 1, tags: ["nature", "flood"], needs: [{ kind: "feature", feature: "river" }],
    name: tx("Slow the water upstream", "Arafu'r dŵr i fyny'r afon"), what: tx("Wet woodland and leaky dams in the headwaters.", "Coetir gwlyb ac argaeau sy'n gollwng ym mlaenau'r afon."),
    example: tx("The Taff headwaters above Merthyr Tydfil.", "Blaenau Taf uwchben Merthyr Tudful."), effects: [{ kind: "risk", risk: "flood", steps: -1, where: "downstream", after_turns: 1 }, m("nature", 0.3)] }),
  project({ id: "coast-wetlands", branch: "landscape", tier: 1, cost: 3, build: 1, tags: ["nature", "flood"], needs: [{ kind: "feature", feature: "coast" }],
    name: tx("Wetlands on the coast", "Gwlyptiroedd ar yr arfordir"), what: tx("Let the low coast hold water and wildlife.", "Gadael i'r arfordir isel ddal dŵr a bywyd gwyllt."),
    example: tx("The levels east of Cardiff.", "Y gwastadeddau i'r dwyrain o Gaerdydd."), effects: [m("nature", 0.5), { kind: "risk", risk: "flood", steps: -1 }, { kind: "special", special: "land_blocked" }] }),
  project({ id: "valleys-park", branch: "landscape", tier: 2, cost: 4, build: 2, tags: ["nature", "health"],
    name: tx("Valleys regional park", "Parc rhanbarthol y cymoedd"), what: tx("Linked uplands with paths from the towns.", "Ucheldiroedd cysylltiedig gyda llwybrau o'r trefi."),
    example: tx("From Merthyr Tydfil to the Rhondda.", "O Ferthyr Tudful i'r Rhondda."),
    effects: [m("health", 0.3, { where: "flagged", flag: "coal_valley", only_if: [{ kind: "project", branch: "landscape", tier: 1, where: "here" }] }), m("nature", 0.3, { where: "flagged", flag: "coal_valley" })] }),
  project({ id: "rivers-room", branch: "landscape", tier: 3, cost: 7, build: 3, tags: ["nature", "flood"], needs: [{ kind: "feature", feature: "river" }],
    name: tx("Rivers given room", "Rhoi lle i afonydd"), what: tx("Give the river space to flood where it does no harm.", "Rhoi lle i'r afon orlifo lle nad yw'n gwneud niwed."),
    example: tx("The Taff from Merthyr Tydfil to Cardiff.", "Afon Taf o Ferthyr Tudful i Gaerdydd."), effects: [{ kind: "special", special: "storm_step_down" }, m("nature", 0.8)] }),

  project({ id: "warm-terraces", branch: "homes", tier: 1, cost: 3, build: 1, tags: ["homes", "warmth"],
    name: tx("Warm the terraces", "Cynhesu'r tai teras"), what: tx("Insulate the old stone terraces.", "Inswleiddio'r hen dai teras carreg."),
    example: tx("The terraces of the Rhondda.", "Tai teras y Rhondda."), effects: [m("health", 0.3, { after_turns: 2 }), m("climate", 0.4, { after_turns: 2 }), m("work", 0.1, { jobs: true })] }),
  project({ id: "social-homes", branch: "homes", tier: 1, cost: 3, build: 2, tags: ["homes"],
    name: tx("Social homes", "Cartrefi cymdeithasol"), what: tx("Homes for rent at a fair price.", "Cartrefi i'w rhentu am bris teg."),
    example: tx("Homes in Cardiff and Aberdare.", "Cartrefi yng Nghaerdydd ac Aberdâr."), effects: [m("homes", 0.6), { kind: "block", spread: "S2", share: 0.5 }] }),
  project({ id: "welsh-school", branch: "homes", tier: 1, cost: 2, build: 3, tags: ["welsh", "school"],
    name: tx("Welsh-medium school", "Ysgol cyfrwng Cymraeg"), what: tx("A new Welsh-medium primary where few are offered.", "Ysgol gynradd Gymraeg newydd lle nad oes llawer."),
    example: tx("A new primary in Merthyr Tydfil.", "Ysgol gynradd newydd ym Merthyr Tudful."), effects: [m("welsh", 0.5), { kind: "young_adults", points: 0.1 }] }),
  project({ id: "health-hub", branch: "homes", tier: 2, cost: 4, build: 2, tags: ["health", "services"],
    name: tx("Health close to home", "Iechyd yn agos at adref"), what: tx("A health and care hub in the town.", "Canolfan iechyd a gofal yn y dref."),
    example: tx("A hub in Merthyr Tydfil.", "Canolfan ym Merthyr Tudful."), effects: [m("health", 0.6), { kind: "special", special: "care_bill_off" }] }),
  project({ id: "heat-and-homes", branch: "homes", tier: 3, cost: 7, build: 3, tags: ["homes", "warmth"],
    name: tx("Heat and homes for all", "Gwres a chartrefi i bawb"), what: tx("Heat networks, and every cold home treated.", "Rhwydweithiau gwres, a phob cartref oer yn cael ei drin."),
    example: tx("A heat network in Cardiff.", "Rhwydwaith gwres yng Nghaerdydd."), effects: [m("health", 0.8, { where: "everywhere" }), m("climate", 0.8, { where: "everywhere" })] }),
];

export const fixturePairs: PairDef[] = [
  { id: "college-reach", kind: "together", project: "skills-college", partners: [{ link_quality: 2 }], within: "here", effects: [m("work", 0.3)],
    name: tx("People here can reach the work", "Gall pobl yma gyrraedd y gwaith"), note: tx("A college with a frequent line to jobs.", "Coleg gyda lein aml at swyddi.") },
  { id: "college-no-jobs", kind: "apart", project: "skills-college", partners: [{ tag: "jobs" }, { link_quality: 2 }], within: "within_link", effects: [{ kind: "young_adults", points: -0.3 }],
    name: tx("Qualify and leave", "Cymhwyso a gadael"), note: tx("Young adults qualify, then leave for work elsewhere.", "Mae oedolion ifanc yn cymhwyso, yna'n gadael am waith yn rhywle arall.") },
  { id: "quarter-and-homes", kind: "together", project: "station-quarter", partners: [{ project: "social-homes" }], within: "here", effects: [m("homes", 0.3)],
    name: tx("Homes by the line", "Cartrefi wrth y lein"), note: tx("Homes people can afford next to the trains.", "Cartrefi fforddiadwy wrth ymyl y trenau.") },
];

export const fixtureLaws: LawDef[] = [
  { id: "local-homes-rule", name: tx("A local homes rule", "Rheol cartrefi lleol"), what: tx("New homes go first to people who live or work here.", "Mae cartrefi newydd yn mynd yn gyntaf i bobl sy'n byw neu'n gweithio yma."),
    catch: tx("Builders build a little less.", "Mae adeiladwyr yn adeiladu ychydig yn llai."), effects: [{ kind: "block", spread: "S2", share: 0.3, where: "everywhere" }],
    backing: [{ flag: "city", points: -0.5 }, { group: "young", points: 0.3 }] },
  { id: "flood-plain-rule", name: tx("No building on flood plains", "Dim adeiladu ar orlifdiroedd"), what: tx("No new homes where rivers flood.", "Dim cartrefi newydd lle mae afonydd yn gorlifo."),
    catch: tx("Fewer places to build in the valleys.", "Llai o lefydd i adeiladu yn y cymoedd."), effects: [{ kind: "risk", risk: "flood", steps: -1, where: "everywhere", after_turns: 2 }],
    backing: [{ flag: "valley", points: -0.3 }] },
];

const share = (id: string, name: Text, from: string, cares: GroupDef["cares"], src: string): GroupDef => ({ id, name, share_from: from, cares, sources: [src] });
export const fixtureGroups: GroupDef[] = [
  share("young", tx("Young adults", "Oedolion ifanc"), "young_adults", ["work", "homes"], "nomis_mye"),
  share("older", tx("Older people", "Pobl hŷn"), "age65", ["health", "services"], "nomis_mye"),
  share("low_income", tx("Families on low incomes", "Teuluoedd ar incwm isel"), "income_deprivation", ["homes", "work"], "statswales_wimd2025_la"),
  share("welsh_speakers", tx("Welsh speakers", "Siaradwyr Cymraeg"), "welsh_speakers", ["welsh", "young_adults"], "nomis_census_ts033"),
  { id: "everyone", name: tx("Everyone", "Pawb"), share_from: null, base_weight: 0.3, cares: ["fell_most", "promises", "crises"], sources: [] },
];

export const fixturePlaces: PlaceDef[] = [
  { id: "rhondda", council: RCT, template: "T1", v1_place: "rhondda", scales: "coal-tips-safe",
    name: tx("The Rhondda", "Y Rhondda"), prompt: tx("Which coal tips first?", "Pa domenni glo yn gyntaf?"),
    why_hard: tx("There are more tips than you can make safe.", "Mae mwy o domenni nag y gallwch eu gwneud yn ddiogel."),
    offered_by: { projects: ["coal-tips-safe"], events: ["tip-moves"] }, sources: [], confidence: "medium" },
  { id: "merthyr-station", council: MERTHYR, template: "T3", scales: "frequent-trains",
    name: tx("Merthyr Tydfil station", "Gorsaf Merthyr Tudful"), prompt: tx("The trains are frequent now. What is the station for?", "Mae'r trenau'n aml nawr. Beth yw pwrpas yr orsaf?"),
    why_hard: tx("Each choice helps one group and costs another.", "Mae pob dewis yn helpu un grŵp ac yn costio i un arall."),
    offered_by: { projects: ["frequent-trains"] }, sources: [], confidence: "low",
    options: [
      { id: "homes", name: tx("Homes for local rent", "Cartrefi i'w rhentu'n lleol"), gain: tx("Young families can stay.", "Gall teuluoedd ifanc aros."), loss: tx("Fewer new jobs.", "Llai o swyddi newydd."),
        branch: "homes", effects: [m("homes", 0.4)], grades: [{ when: [{ kind: "measure", measure: "homes", op: "below", value: 5 }], grade: "very_well" }], default_grade: "well" },
      { id: "workspace", name: tx("Workspace for firms", "Gweithle i gwmnïau"), gain: tx("Work comes to the town.", "Mae gwaith yn dod i'r dref."), loss: tx("Homes get dearer.", "Mae cartrefi'n mynd yn ddrutach."),
        branch: "made_here", effects: [m("work", 0.4, { jobs: true })], grades: [{ when: [{ kind: "project", tag: "college", where: "within_link" }], grade: "very_well" }], default_grade: "adequately" },
      { id: "park-ride", name: tx("Park and ride", "Parcio a theithio"), gain: tx("Easy trips to Cardiff.", "Teithiau hawdd i Gaerdydd."), loss: tx("Young adults drift to the city.", "Mae oedolion ifanc yn symud i'r ddinas."),
        branch: "valleys", effects: [m("climate", 0.2), { kind: "young_adults", points: -0.2 }], grades: [], default_grade: "adequately" },
    ] },
];
