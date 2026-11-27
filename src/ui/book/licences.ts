// Every dataset the app draws on, with the attribution string its publisher asks for and its
// licence, copied from docs/data-licences.md (checked 2026-11-26). The strings stay in their
// original language and wording: they are legal acknowledgements, not interface copy.

export interface Attribution {
  id: string;
  /** What the dataset is, in the publisher's own English. */
  dataset: string;
  /** Licence name; "unconfirmed" marks the one dataset whose licence is not yet confirmed. */
  licence: string;
  licenceUrl: string | null;
  /** The exact attribution string. */
  attribution: string;
  /** The page the attribution and licence were read from. */
  url: string;
  /** True when the licence is not confirmed in writing (see docs/data-licences.md). */
  unconfirmed?: boolean;
}

const OGL = "Open Government Licence v3.0";
const OGL_URL = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";
const OGL_WG = "Contains public sector information licensed under the Open Government Licence v3.0.";

export const ATTRIBUTIONS: Attribution[] = [
  {
    id: "ons-boundaries",
    dataset: "Local Authority Districts (December 2023) Boundaries UK BGC (ONS Open Geography Portal)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "Source: Office for National Statistics licensed under the Open Government Licence v.3.0. Contains OS data © Crown copyright and database right 2023.",
    url: "https://geoportal.statistics.gov.uk/",
  },
  {
    id: "nrw-flood",
    dataset: "NRW Flood Map for Planning, river flood zones (DataMapWales)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "Contains Natural Resources Wales information © Natural Resources Wales and database right. All rights reserved. Contains OS data © Crown copyright and database right.",
    url: "https://datamap.gov.wales/layers/inspire-nrw:NRW_FLOODZONE_RIVERS",
  },
  {
    id: "wimd-2019",
    dataset: "Welsh Index of Multiple Deprivation 2019, overall (DataMapWales)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "Welsh Government, WIMD 2019. Contains OS data © Crown copyright and database right.",
    url: "https://datamap.gov.wales/layers/inspire-wg:wimd2019_overall",
  },
  {
    id: "wimd-2025",
    dataset: "Welsh Index of Multiple Deprivation 2025, overall (DataMapWales)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: `${OGL_WG} Source: Welsh Government, WIMD 2025.`,
    url: "https://datamap.gov.wales/layers/geonode:wimd2025_overall",
  },
  {
    id: "statswales-flood",
    dataset: "StatsWales: WIMD 2025 indicators, properties at risk of flooding (NRW data)",
    licence: `${OGL}, by the Welsh Government copyright statement`,
    licenceUrl: "https://www.gov.wales/copyright-statement",
    attribution: `${OGL_WG} Source: Welsh Government (StatsWales); flood data from Natural Resources Wales.`,
    url: "https://stats.gov.wales/en-GB/c28ab0ec-5893-46c2-a372-98d4058ba415",
  },
  {
    id: "coal-tips",
    dataset: "Welsh Government disused coal tips, Spring 2026 Annex 1 Table 2 (counts only)",
    licence: "Licence not yet confirmed",
    licenceUrl: null,
    attribution: `If confirmed OGL: ${OGL_WG} Source: Welsh Government.`,
    url: "https://www.gov.wales/coal-tip-safety",
    unconfirmed: true,
  },
  {
    id: "bgs-landslides",
    dataset: "BGS National Landslide Database, index via OGC API",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "Contains British Geological Survey materials © UKRI 2026",
    url: "https://ogcapi.bgs.ac.uk/collections/landslideindex?f=json",
  },
  {
    id: "ons-nomis",
    dataset: "ONS data via Nomis (mid-year estimates, Census 2021 TS033 and TS041, APS, ASHE)",
    licence: `${OGL} (Crown copyright)`,
    licenceUrl: OGL_URL,
    attribution: "Source: Office for National Statistics, licensed under the Open Government Licence v3.0.",
    url: "https://www.nomisweb.co.uk/home/copyright.asp",
  },
  {
    id: "ons-web",
    dataset: "ONS datasets on ons.gov.uk (regional GDP, affordability, life expectancy, SNPP, migration, Census)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "Source: Office for National Statistics, licensed under the Open Government Licence v3.0.",
    url: "https://www.ons.gov.uk/help/termsandconditions",
  },
  {
    id: "desnz",
    dataset: "DESNZ local authority greenhouse gas emissions; regional renewable statistics",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: `${OGL_WG} Source: Department for Energy Security and Net Zero.`,
    url: "https://www.gov.uk/government/statistics/uk-local-authority-and-regional-greenhouse-gas-emissions-statistics-2005-to-2024",
  },
  {
    id: "wg-io",
    dataset: "Welsh Government Supply, Use and Input-Output Tables 2022; Cymraeg 2050 (policy milestone only)",
    licence: `${OGL}, by the Welsh Government copyright statement`,
    licenceUrl: "https://www.gov.wales/copyright-statement",
    attribution: `${OGL_WG} Source: Welsh Government.`,
    url: "https://www.gov.wales/copyright-statement",
  },
  {
    id: "terrain",
    dataset: "AWS Terrain Tiles (Mapzen terrarium)",
    licence: "Open, attribution required by the Joerd project",
    licenceUrl: "https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
    attribution: "Mapzen; Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers; Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration; United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.",
    url: "https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
  },
  {
    id: "osm",
    dataset: "OpenStreetMap via Overpass API (buildings, roads, rail, rivers, landuse, places and similar)",
    licence: "Open Database Licence (ODbL) 1.0",
    licenceUrl: "https://www.openstreetmap.org/copyright",
    attribution: "© OpenStreetMap contributors, available under the Open Database Licence (https://www.openstreetmap.org/copyright)",
    url: "https://www.openstreetmap.org/copyright",
  },
];
