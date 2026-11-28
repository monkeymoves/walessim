/**
 * Fixture, part 1: three councils on the Taff (Merthyr Tydfil, Rhondda Cynon Taf, Cardiff),
 * their real 2026 era indicator values and sources, bands, and the links between them.
 *
 * Indicator values and v1 bands are copied from model/data/la-indicators.json and
 * model/bands.yaml (27 November 2026). Board bands follow the section 4.1 rule (the 22 councils'
 * lowest and highest, pushed out by a tenth). Link shares and strengths are ILLUSTRATIVE: the real
 * commuting table is package 1's job.
 */
import type { BoardBand, BoardSource, CouncilDef, IndicatorDef, LinkDef, MeasureDef, StubDef, Text } from "./types";

export const tx = (en: string, cy: string): Text => ({ en, cy, cy_review: true });

export const MERTHYR = "W06000024";
export const RCT = "W06000016";
export const CARDIFF = "W06000015";
export const POWYS_STUB = "stub:powys";

const OGL = "Open Government Licence v3.0";
export const fixtureSources: BoardSource[] = [
  { id: "nomis_mye", title: "ONS mid-year population estimates via Nomis", licence: OGL },
  { id: "statswales_wimd2025_la", title: "WIMD 2025 indicator data for local authorities and Wales", licence: OGL },
  { id: "nomis_aps", title: "Annual Population Survey via Nomis", licence: OGL },
  { id: "nomis_ashe", title: "Annual Survey of Hours and Earnings, resident analysis via Nomis", licence: OGL },
  { id: "nomis_jobs_density", title: "Jobs density via Nomis", licence: OGL },
  { id: "sw_qualifications", title: "Qualifications of working age adults by local authority (StatsWales)", licence: OGL },
  { id: "ons_affordability", title: "House price to residence-based earnings ratio, England and Wales", licence: OGL },
  { id: "statswales_dwelling_stock", title: "Dwelling stock estimates by tenure and local authority area", licence: OGL },
  { id: "statswales_temp_accommodation", title: "Homeless individuals temporarily accommodated", licence: OGL },
  { id: "ons_hle_local", title: "Healthy life expectancy, UK", licence: OGL },
  { id: "statswales_flood", title: "Properties at risk of flooding in Wales", licence: OGL },
  { id: "nrw_wfd_rivers_2021", title: "Water Framework Directive river water bodies, Cycle 3 (2021)", licence: OGL },
  { id: "fc_nfi_gb_2024", title: "National Forest Inventory GB 2024 woodland map", licence: OGL },
  { id: "nomis_census_ts033", title: "Census 2021 TS033 Welsh language skills (speaking) via Nomis", licence: OGL },
  { id: "statswales_plasc_school_language", title: "Pupils by school language category (PLASC)", licence: OGL },
  { id: "desnz_la_ghg", title: "UK local authority greenhouse gas emissions statistics, 2005 to 2024", licence: OGL },
  { id: "nomis_census_ts061", title: "Census 2021 TS061 Method of travel to workplace via Nomis", licence: OGL },
  { id: "cymraeg_2050", title: "Cymraeg 2050: a million Welsh speakers", licence: OGL },
];

type Row = [id: string, en: string, cy: string, unitEn: string, unitCy: string, year: string, source: string, hib: boolean | null];
const rows: Row[] = [
  ["pop", "Population (mid-year estimate)", "Poblogaeth (amcangyfrif canol blwyddyn)", "people", "pobl", "2025", "nomis_mye", null],
  ["young_adults", "Share aged 20 to 34", "Cyfran 20 i 34 oed", "percent of residents", "y cant o drigolion", "2025", "nomis_mye", true],
  ["age65", "Share aged 65 and over", "Cyfran 65 oed a throsodd", "percent of residents", "y cant o drigolion", "2025", "nomis_mye", false],
  ["income_deprivation", "People on a very low income", "Pobl ar incwm isel iawn", "percent of people", "y cant o bobl", "WIMD 2025", "statswales_wimd2025_la", false],
  ["employment", "Employment rate, 16 to 64", "Cyfradd cyflogaeth, 16 i 64", "percent", "y cant", "Jul 2025 to Jun 2026", "nomis_aps", true],
  ["earnings", "Median weekly earnings, full-time", "Enillion wythnosol canolrifol, llawn amser", "pounds a week", "punnoedd yr wythnos", "2025", "nomis_ashe", true],
  ["jobs_density", "Jobs per working-age resident", "Swyddi fesul preswylydd oed gweithio", "jobs per resident aged 16 to 64", "swyddi fesul preswylydd 16 i 64", "2024", "nomis_jobs_density", true],
  ["level4", "Adults with a degree-level qualification", "Oedolion a chymhwyster lefel gradd", "percent of people aged 18 to 64", "y cant o bobl 18 i 64", "2025", "sw_qualifications", true],
  ["affordability", "House price to earnings ratio", "Cymhareb pris tŷ i enillion", "ratio", "cymhareb", "2025", "ons_affordability", false],
  ["poor_housing", "Poor quality housing", "Tai o ansawdd gwael", "percent of homes", "y cant o gartrefi", "WIMD 2025", "statswales_wimd2025_la", false],
  ["social_housing", "Council and housing association homes", "Cartrefi cyngor a chymdeithas dai", "percent of homes", "y cant o gartrefi", "Mar 2025", "statswales_dwelling_stock", true],
  ["temp_accommodation", "Homeless people in temporary accommodation", "Pobl ddigartref mewn llety dros dro", "per 10,000 residents", "fesul 10,000 o drigolion", "Oct 2025 to Sep 2026", "statswales_temp_accommodation", false],
  ["healthy_life_exp", "Healthy life expectancy at birth", "Disgwyliad oes iach adeg geni", "years", "blynyddoedd", "2022 to 2024", "ons_hle_local", true],
  ["premature_deaths", "Deaths before age 75", "Marwolaethau cyn 75 oed", "per 100,000 people", "fesul 100,000 o bobl", "WIMD 2025", "statswales_wimd2025_la", false],
  ["flood_exposure", "Homes at risk of flooding", "Cartrefi mewn perygl o lifogydd", "per 100 households", "fesul 100 o aelwydydd", "2025", "statswales_flood", false],
  ["river_good_status", "River length in good health", "Hyd afonydd mewn cyflwr da", "percent of river length", "y cant o hyd afonydd", "2021", "nrw_wfd_rivers_2021", true],
  ["woodland_cover", "Land covered by woodland", "Tir dan goetir", "percent of land", "y cant o dir", "2024", "fc_nfi_gb_2024", true],
  ["welsh_speakers", "Welsh speakers aged 3 and over", "Siaradwyr Cymraeg 3 oed a throsodd", "percent of residents aged 3 and over", "y cant o drigolion 3 oed a throsodd", "2021", "nomis_census_ts033", true],
  ["welsh_medium_pupils", "Pupils in Welsh-medium education", "Disgyblion mewn addysg cyfrwng Cymraeg", "percent of pupils", "y cant o ddisgyblion", "2025/26", "statswales_plasc_school_language", true],
  ["emissions_head", "Greenhouse gas emissions per person", "Allyriadau nwyon tŷ gwydr y pen", "tonnes a person", "tunelli y pen", "2024", "desnz_la_ghg", false],
  ["home_energy_efficiency", "How well homes keep their heat in", "Pa mor dda mae cartrefi yn cadw eu gwres", "average energy score out of 100", "sgôr ynni cyfartalog allan o 100", "WIMD 2025", "statswales_wimd2025_la", true],
  ["drive_to_work", "Commuters who drive to work", "Cymudwyr sy'n gyrru i'r gwaith", "percent of commuters", "y cant o gymudwyr", "2021", "nomis_census_ts061", false],
];
export const fixtureIndicators: IndicatorDef[] = rows.map(([id, en, cy, ue, uc, year, source, hib]) => ({
  id, name: tx(en, cy), unit: tx(ue, uc), year, source, higher_is_better: hib,
}));

export const fixtureMeasures: MeasureDef[] = [
  { id: "work", name: tx("Work and pay", "Gwaith a chyflog"), note: tx("Jobs, pay and skills.", "Swyddi, cyflog a sgiliau."), indicators: ["employment", "earnings", "jobs_density", "level4"] },
  { id: "homes", name: tx("Homes and community", "Cartrefi a chymuned"), note: tx("Homes people can afford and keep warm.", "Cartrefi y gall pobl eu fforddio."), indicators: ["affordability", "poor_housing", "social_housing", "temp_accommodation"] },
  { id: "health", name: tx("Health", "Iechyd"), note: tx("How long people live in good health.", "Pa mor hir mae pobl yn byw mewn iechyd da."), indicators: ["healthy_life_exp", "premature_deaths"] },
  { id: "nature", name: tx("Nature and floods", "Natur a llifogydd"), note: tx("Rivers, woods and flood safety.", "Afonydd, coed a diogelwch rhag llifogydd."), indicators: ["flood_exposure", "river_good_status", "woodland_cover"] },
  { id: "welsh", name: tx("Welsh and culture", "Y Gymraeg a diwylliant"), note: tx("Welsh spoken and learned.", "Y Gymraeg yn cael ei siarad a'i dysgu."), indicators: ["welsh_speakers", "welsh_medium_pupils"] },
  { id: "climate", name: tx("Climate", "Hinsawdd"), note: tx("Emissions, warm homes and how people travel.", "Allyriadau, cartrefi cynnes a theithio."), indicators: ["emissions_head", "home_energy_efficiency", "drive_to_work"] },
];

const band = (floor: number, goal: number, hib: boolean, origin: "v1" | "board", source: string): BoardBand => ({ floor, goal, higher_is_better: hib, origin, source });
export const fixtureBands: Record<string, BoardBand> = {
  employment: band(63.7, 79.1, true, "v1", "nomis_aps"),
  earnings: band(635.73, 902.7, true, "v1", "nomis_ashe"),
  jobs_density: band(0.41, 1.01, true, "board", "nomis_jobs_density"),
  level4: band(23.17, 69.13, true, "board", "sw_qualifications"),
  affordability: band(11.991, 4.94, false, "v1", "ons_affordability"),
  poor_housing: band(30.87, 9.63, false, "board", "statswales_wimd2025_la"),
  social_housing: band(7.869, 25.739, true, "board", "statswales_dwelling_stock"),
  temp_accommodation: band(85.623, -0.24, false, "board", "statswales_temp_accommodation"),
  healthy_life_exp: band(49.59, 65.31, true, "board", "ons_hle_local"),
  premature_deaths: band(522.73, 285.97, false, "board", "statswales_wimd2025_la"),
  flood_exposure: band(53.9581, 0, false, "v1", "statswales_flood"),
  river_good_status: band(-7.005, 77.053, true, "board", "nrw_wfd_rivers_2021"),
  woodland_cover: band(1.341, 42.941, true, "board", "fc_nfi_gb_2024"),
  welsh_speakers: band(3.5367, 33.1326, true, "v1", "cymraeg_2050"),
  welsh_medium_pupils: band(-4.282, 95.727, true, "board", "statswales_plasc_school_language"),
  emissions_head: band(31.8613, 0, false, "v1", "desnz_la_ghg"),
  home_energy_efficiency: band(53.67, 68.43, true, "board", "statswales_wimd2025_la"),
  drive_to_work: band(82.817, 60.885, false, "board", "nomis_census_ts061"),
};

/** Real values, ordered as `rows`: Merthyr Tydfil, Rhondda Cynon Taf, Cardiff. */
const values: Record<string, [number, number, number]> = {
  pop: [58362, 241015, 381516],
  young_adults: [17.2475, 18.6885, 27.6725],
  age65: [20.1175, 20.344, 14.9967],
  income_deprivation: [30.5, 26.9, 25.8],
  employment: [68.4, 69.7, 75],
  earnings: [685.3, 665.5, 712],
  jobs_density: [0.7, 0.59, 0.96],
  level4: [37, 37.1, 65.3],
  affordability: [3.98, 4.59, 7.2],
  poor_housing: [15.8, 17.9, 12.6],
  social_housing: [21.6606, 14.5161, 17.3886],
  temp_accommodation: [17.9769, 6.9152, 78.4677],
  healthy_life_exp: [50.9, 55.45, 59.8],
  premature_deaths: [494.2, 450.4, 395.7],
  flood_exposure: [18.9078, 24.4216, 25.9507],
  river_good_status: [0, 30.9424, 0],
  woodland_cover: [16.8514, 27.3593, 11.2561],
  welsh_speakers: [8.9173, 12.3985, 12.1732],
  welsh_medium_pupils: [7.589, 18.716, 15.202],
  emissions_head: [4.0212, 4.1436, 4.2222],
  home_energy_efficiency: [65.2, 63.8, 67.2],
  drive_to_work: [74.1357, 77.3182, 62.7125],
};
const realFor = (i: 0 | 1 | 2) => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v[i]]));

export const fixtureCouncils: CouncilDef[] = [
  { code: MERTHYR, name: tx("Merthyr Tydfil", "Merthyr Tudful"), flags: ["coal_valley", "valley"], features: ["rail", "river", "coal_tips", "valley"], towns: [tx("Merthyr Tydfil", "Merthyr Tudful"), tx("Dowlais", "Dowlais")], real: realFor(0), centre: [137.3, 194.8] },
  { code: RCT, name: tx("Rhondda Cynon Taf", "Rhondda Cynon Taf"), flags: ["coal_valley", "valley"], features: ["rail", "river", "coal_tips", "valley"], towns: [tx("Treorchy", "Treorci"), tx("Aberdare", "Aberdâr")], real: realFor(1), centre: [132.4, 205.7] },
  { code: CARDIFF, name: tx("Cardiff", "Caerdydd"), flags: ["city", "coast"], features: ["rail", "river", "coast", "city"], towns: [tx("Grangetown", "Grangetown"), tx("Splott", "Sblot")], real: realFor(2), centre: [150.8, 224.6] },
];

export const fixtureStubs: StubDef[] = [{ id: POWYS_STUB, name: tx("Powys", "Powys"), centre: [135.8, 166.8] }];

const taff = tx("Taff", "Taf");
const line = tx("Merthyr line", "Llinell Merthyr");
const ill = { honesty: "illustrative" as const, sources: [] as string[] };
export const fixtureLinks: LinkDef[] = [
  { id: "commute:merthyr-cardiff", kind: "commute", from: MERTHYR, to: CARDIFF, share: 0.08, ...ill },
  { id: "commute:rct-cardiff", kind: "commute", from: RCT, to: CARDIFF, share: 0.15, ...ill },
  { id: "commute:merthyr-rct", kind: "commute", from: MERTHYR, to: RCT, share: 0.1, ...ill },
  { id: "commute:rct-merthyr", kind: "commute", from: RCT, to: MERTHYR, share: 0.03, ...ill },
  { id: "commute:merthyr-powys", kind: "commute", from: MERTHYR, to: POWYS_STUB, share: 0.02, outside: true, ...ill },
  { id: "rail:merthyr-rct", kind: "rail", from: MERTHYR, to: RCT, name: line, quality: 1, ...ill },
  { id: "rail:rct-cardiff", kind: "rail", from: RCT, to: CARDIFF, name: line, quality: 1, ...ill },
  { id: "river:taff-merthyr-rct", kind: "river", from: MERTHYR, to: RCT, name: taff, ...ill, to_check: true },
  { id: "river:taff-rct-cardiff", kind: "river", from: RCT, to: CARDIFF, name: taff, ...ill, to_check: true },
];
