// Every dataset the app draws on, with the attribution string its publisher asks for and its
// licence, copied from docs/data-licences.md (checked 2026-11-26; the extra atlas measures 2026-11-27). The strings stay in their
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
    dataset: "ONS data via Nomis (mid-year estimates; Census 2021 TS011, TS027, TS032, TS033, TS037, TS038, TS039, TS041 and TS061; APS; ASHE resident and workplace analyses; jobs density)",
    licence: `${OGL} (Crown copyright)`,
    licenceUrl: OGL_URL,
    attribution: "Source: Office for National Statistics, licensed under the Open Government Licence v3.0.",
    url: "https://www.nomisweb.co.uk/home/copyright.asp",
  },
  {
    id: "ons-web",
    dataset: "ONS datasets on ons.gov.uk (regional GDP, affordability, life expectancy, healthy life expectancy, suicides and drug poisoning deaths by local authority, SNPP, migration, Census)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "Source: Office for National Statistics, licensed under the Open Government Licence v3.0.",
    url: "https://www.ons.gov.uk/help/termsandconditions",
  },
  {
    id: "desnz",
    dataset: "DESNZ local authority greenhouse gas emissions; regional renewable statistics; local authority gas consumption; households not connected to the gas network",
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
    id: "nomis-claimant",
    dataset: "Claimant count via Nomis (NM_162_1), Department for Work and Pensions data",
    licence: `${OGL} (Crown copyright)`,
    licenceUrl: OGL_URL,
    attribution: "Source: Office for National Statistics (claimant count: Department for Work and Pensions), licensed under the Open Government Licence v3.0.",
    url: "https://www.nomisweb.co.uk/home/copyright.asp",
  },
  {
    id: "statswales-ons",
    dataset: "StatsWales, ONS originals: household income per head, business demography, business survival, qualifications of working age adults",
    licence: `${OGL}, by the Welsh Government copyright statement`,
    licenceUrl: "https://www.gov.wales/copyright-statement",
    attribution: `${OGL_WG} Source: Office for National Statistics, via Welsh Government (StatsWales).`,
    url: "https://www.gov.wales/copyright-statement",
  },
  {
    id: "statswales-air",
    dataset: "StatsWales: air quality, population weighted NO2 and PM2.5 by local authority (Defra modelling)",
    licence: `${OGL}, by the Welsh Government copyright statement`,
    licenceUrl: "https://www.gov.wales/copyright-statement",
    attribution: `${OGL_WG} Source: Welsh Government via StatsWales; data provider Defra.`,
    url: "https://stats.gov.wales/en-GB/36f88bfb-36a3-4b54-9c24-51dcab107a62",
  },
  {
    id: "statswales-wimd-lsoa",
    dataset: "StatsWales: WIMD 2025 indicators by small area (ambient green space, noise)",
    licence: `${OGL}, by the Welsh Government copyright statement`,
    licenceUrl: "https://www.gov.wales/copyright-statement",
    attribution: `${OGL_WG} Source: Welsh Government, WIMD 2025.`,
    url: "https://stats.gov.wales/en-GB/2f8dfe38-bfa8-4f61-bc34-1d84d470a940",
  },
  {
    id: "statswales-people",
    dataset: "StatsWales: immunisation by age 4, free school meals, Discretionary Assistance Fund payments, pupils by school language, pupils speaking Welsh at home, teachers working through Welsh, frequency of speaking Welsh",
    licence: `${OGL}, by the Welsh Government copyright statement`,
    licenceUrl: "https://www.gov.wales/copyright-statement",
    attribution: `${OGL_WG} Source: Welsh Government (StatsWales).`,
    url: "https://www.gov.wales/copyright-statement",
  },
  {
    id: "statswales-housing",
    dataset: "StatsWales: council tax dwellings (CT1), dwelling stock estimates, homeless people in temporary accommodation, new dwellings completed",
    licence: `${OGL}, by the Welsh Government copyright statement`,
    licenceUrl: "https://www.gov.wales/copyright-statement",
    attribution: `${OGL_WG} Source: Welsh Government (StatsWales), data from local authorities.`,
    url: "https://www.gov.wales/copyright-statement",
  },
  {
    id: "statswales-climate",
    dataset: "StatsWales: local authority municipal waste, residual household waste per person, low carbon energy projects (heat pumps)",
    licence: `${OGL}, by the Welsh Government copyright statement`,
    licenceUrl: "https://www.gov.wales/copyright-statement",
    attribution: `${OGL_WG} Source: Welsh Government (StatsWales); waste data from Natural Resources Wales (WasteDataFlow); low carbon energy project data compiled by Regen.`,
    url: "https://www.gov.wales/copyright-statement",
  },
  {
    id: "dwp-children",
    dataset: "DWP Children in low income families: local area statistics, FYE 2022 to 2025",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: `${OGL_WG} Source: Department for Work and Pensions.`,
    url: "https://www.gov.uk/government/statistics/children-in-low-income-families-local-area-statistics-2022-to-2025",
  },
  {
    id: "dft-vehicles",
    dataset: "DfT and DVLA vehicle licensing statistics (VEH0142, VEH0105); DfT electric vehicle charging infrastructure statistics (EVCI0102)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: `${OGL_WG} Source: Department for Transport and Driver and Vehicle Licensing Agency (vehicle licensing); Department for Transport, charger data from Zapmap (charging infrastructure).`,
    url: "https://www.gov.uk/government/statistical-data-sets/electric-vehicle-charging-infrastructure-statistics-data-tables-evci",
  },
  {
    id: "nrw-layers",
    dataset: "NRW layers on DataMapWales: Ancient Woodland Inventory 2021, Sites of Special Scientific Interest, National Parks, National Landscapes (AONB), WFD river water bodies (Cycle 3 baseline)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "Contains Natural Resources Wales information © Natural Resources Wales and Database Right. All rights Reserved. Contains Ordnance Survey Data. Ordnance Survey Licence number AC0000849444. Crown Copyright and Database Right.",
    url: "https://datamap.gov.wales/layers/inspire-nrw:NRW_SSSI",
  },
  {
    id: "fc-nfi",
    dataset: "Forestry Commission National Forest Inventory GB 2024 woodland map",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "© Forestry Commission copyright. Contains Ordnance Survey data © Crown copyright and database right 2025.",
    url: "https://data-forestry.opendata.arcgis.com/datasets/5a3efa283e81431b911b5c9872527ca5_0",
  },
  {
    id: "cadw",
    dataset: "Cadw Scheduled Monuments and listed buildings (DataMapWales)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "Designated Historic Asset GIS Data, The Welsh Historic Environment Service (Cadw), 27 November 2026, licensed under the Open Government Licence http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    url: "https://datamap.gov.wales/layers/inspire-wg:Cadw_ListedBuildings",
  },
  {
    id: "rcahmw-place-names",
    dataset: "RCAHMW List of Historic Place Names in Wales, recorded names (DataMapWales)",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: "This data is from the List of Historic Place Names in Wales, produced by the Royal Commission on the Ancient and Historical Monuments of Wales (RCAHMW). © Crown Database Right: RCAHMW, licensed under the Open Government Licence 3.0.",
    url: "https://datamap.gov.wales/layers/geonode:rcahmw_historicplacenames_wales_recordednames",
  },
  {
    id: "dmw-boundaries",
    dataset: "Welsh Government local authority boundaries (DataMapWales), used to clip layers and measure land area",
    licence: OGL,
    licenceUrl: OGL_URL,
    attribution: `${OGL_WG} Contains Ordnance Survey data © Crown copyright and database right.`,
    url: "https://datamap.gov.wales/layers/inspire-wg:localauthorities",
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
