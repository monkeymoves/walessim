# Atlas data plan: growing Heddiw to 5 to 8 measures per goal

Research date: 2026-11-27. Nothing in `model/`, `pipeline/` or `src/` was changed. This is a shortlist to choose from, not a commitment. Every licence below was read on the publisher's own page on the research date; the page is given in the licence key. This is a record of what publishers state, not legal advice.

Today the atlas has 19 measures: Work and pay 3, Nature and floods 2, Health 2, Fairness 3, Homes and community 5 (two of them, `pop` and `pop_change`, are context with no direction), Welsh and culture 1, Climate 3.

## What changed since the last data pass

- **StatsWales now has a public API.** `https://api.stats.gov.wales/v2/{dataset_id}/data?format=csv&page_size=10000&page_number=N` returns the whole dataset as CSV with area codes (tested). The OpenAPI spec is at `https://api.stats.gov.wales/v2/docs/swagger.json`, and `/v2/{id}/filters` lists every dimension. The old StatsWales site and OData feed now redirect to stats.gov.wales. The pipeline's HTML table scraping can be swapped for this. In the tables, "SW API" means this endpoint with the dataset id given.
- **Healthy life expectancy is now published for Welsh local authorities.** The ONS release of 19 February 2026 (2022 to 2024) includes unitary authorities in Wales, so the note on `life_exp` in `model/indicators.yaml` is out of date.
- **Woodland cover can now be computed.** There is still no published LA table, but the Forestry Commission National Forest Inventory map is OGL and can be summed by LA (see method M2). The note on `greenspace_access` says woodland has no open source; that no longer holds.
- **WIMD 2025 publishes many more LA-level indicators than the three in use.** The LA indicator dataset (`c28ab0ec`, 48 indicators) and the seven domain datasets by LSOA and LA each carry rows for all 22 LAs, including air pollution, noise, crime by type and health measures.
- **Public Health Wales data cannot be used.** Its website terms of use allow personal and non-commercial use only and forbid republishing without permission (see rejects).

## Licence key

Each row in the tables names one of these. "OGL" means the Open Government Licence v3.0.

| Key | Licence as stated | Page where it was read (2026-11-27) |
|---|---|---|
| L-WG | OGL: "You may use and re-use the information featured in this website (not including logos) ... under the terms of the Open Government Licence". StatsWales pages carry no licence of their own and rest on this. | https://www.gov.wales/copyright-statement |
| L-ONS | OGL: "Most content on this website is subject to Crown copyright protection and is published under the Open Government Licence (OGL)" | https://www.ons.gov.uk/help/termsandconditions |
| L-NOMIS | OGL for ONS material on Nomis (not third-party material) | https://www.nomisweb.co.uk/home/copyright.asp |
| L-GOVUK | GOV.UK footer: "All content is available under the Open Government Licence v3.0, except where otherwise stated", checked on each dataset page named in the row | the dataset page named in the row |
| L-DMW | DataMapWales layer page, field "Licence: Open Government Licence for Public Sector Information (OGL)", checked on each layer named in the row | `https://datamap.gov.wales/layers/<layer>` for the layer named |
| L-FC | data.gov.uk record, licence "Open Government Licence"; "There are no public access constraints to this data"; attribution "© Forestry Commission copyright and/or database right 2025" | https://www.data.gov.uk/dataset/64379a2a-d877-415e-9e8d-8553bf09faea/national-forest-inventory-gb-2024 |
| L-POLICE | "licence: Open Government Licence v3.0" | https://data.police.uk/about/ |
| L-CADW | OGL, not including logos | https://www.cadw.gov.wales/copyright-statement and the DataMapWales layer pages |
| L-RCAHMW | OGL; required attribution: "This data is from the List of Historic Place Names in Wales, produced by the Royal Commission on the Ancient and Historical Monuments of Wales (RCAHMW). © Crown Database Right: RCAHMW, licensed under the Open Government Licence 3.0." | https://datamap.gov.wales/layers/geonode:rcahmw_historicplacenames_wales_recordednames |

## Method notes used in the tables

- **M1, StatsWales API.** `GET https://api.stats.gov.wales/v2/<id>/data?format=csv&page_size=10000`, page until fewer rows return. Filter rows on the dimension values named. Area names are matched to codes as the pipeline already does, or taken from the `Area code` column where present.
- **M2, area share from polygons.** Fetch the layer by WFS (`https://datamap.gov.wales/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=<layer>&outputFormat=application/json`, paged with `count` and `startIndex`), dissolve overlapping polygons, intersect with LA land boundaries (DataMapWales `inspire-wg:localauthorities`, high water mark, OGL [L-DMW]), divide by LA land area. Needs shapely or geopandas in the pipeline. Wales value from the summed areas.
- **M3, counts of points per LA.** Point-in-polygon against the same LA boundaries, then divide by population (Nomis mid-2025, already fetched) or by land area.
- **M4, LSOA to LA.** Sum LSOA counts using the Nomis LSOA 2021 to LA lookup the pipeline already uses for WIMD.
- **Denominators.** Population: ONS mid-2025 (already in the pipeline). Dwellings: StatsWales dwelling stock estimates `6476cc20`, 31 March 2025. Households: Census 2021 TS041 (already in the pipeline) for Census-based shares.
- **WIMD 2025 indicators** come from source years that vary by indicator (mostly 2021 to 2024). Label the period "WIMD 2025" as the pipeline already does, and note that the dataset is not expected to be updated.

Direction column: "Higher" means higher is better, "Lower" means lower is better, "Context" means no direction (`higher_is_better: null`).

---

## 1. Work and pay (prosperous)

Current: `gva_head`, `employment`, `earnings`. Note that ASHE 2026 is now on Nomis (`NM_30_1` latest 2026), so `earnings` can move from 2025 to 2026.

| Rank | Measure (unit) | Direction | Publisher | Latest period | Licence | Fetch method and endpoint | All 22? | Caveat |
|---|---|---|---|---|---|---|---|---|
| 1 | Gross disposable household income per head (GBP per person) | Higher | ONS, republished by Welsh Government | 2024 | OGL [L-WG], ONS original [L-ONS] | M1, dataset `90841eef-d28b-4971-9660-472e0bf0940a`, Component "Gross disposable household income", Data description "£ per head" | Yes | Residence based, so it complements GVA per head, which is distorted by commuting. |
| 2 | Claimant count as a share of residents aged 16 to 64 (percent) | Lower | DWP, via ONS Nomis | October 2026 | OGL [L-NOMIS] | Nomis `NM_162_1.data.csv?geography=<22 LAs + W92000004>&time=latest&gender=0&age=0&measure=2&measures=20100` | Yes (tested) | Monthly and not seasonally adjusted at LA level; use the same month each year or a 12 month mean. Includes some Universal Credit claimants who are in work. |
| 3 | Economic inactivity rate, aged 16 to 64 (percent) | Lower | ONS Annual Population Survey, via Nomis | July 2025 to June 2026 | OGL [L-NOMIS] | Nomis `NM_17_5`, `variable=111`, `measures=20599` (same call shape as `employment`) | Yes (tested, 22 of 22) | Sample survey; wide confidence intervals in small LAs. Includes students and retired people under 65. |
| 4 | Active enterprises per 10,000 residents aged 16 to 64 (count) | Higher | ONS business demography, via Welsh Government | 2025 | OGL [L-WG] | M1, `f2dc5994-cf29-4cb7-b692-360b87a85c71`, "Active enterprises per 10,000 of the population aged 16 to 64" | Yes | Counts enterprises by registered address, so head offices inflate some areas. |
| 5 | Working-age adults qualified to level 4 or above (percent) | Higher | ONS APS, via Welsh Government | 2025 | OGL [L-WG] | M1, `b021de56-f634-4a90-abb9-622b8ae812bb`, "Qualified to level 4 or above", Persons, 18 to 64 | Yes | APS based; definitions changed to RQF in 2022, so the series has a break. |
| 6 | Jobs density (jobs per resident aged 16 to 64, ratio) | Higher | ONS, via Nomis | 2024 | OGL [L-NOMIS] | Nomis `NM_57_1`, `item=3`, `time=2024` | Yes (tested) | A ratio of workplace jobs to residents; low in commuter belts (Torfaen, Caerphilly) for reasons that are not weakness. |
| 7 | Business birth rate (percent of active enterprises) | Higher | ONS business demography, via Welsh Government | 2025 | OGL [L-WG] | M1, `f2dc5994`, "Birth Rate" | Yes | Volatile year to year; consider a 3 year mean. |
| 8 | Median full-time weekly pay of jobs located in the LA, workplace based (GBP per week) | Higher | ONS ASHE, via Nomis | 2026 | OGL [L-NOMIS] | Nomis `NM_99_1`, `sex=8&pay=1&item=2` | Yes (tested) | Pairs with the residence-based `earnings`; the gap shows commuting. |
| 9 | Working-age people in employment deprivation (percent) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec-5893-46c2-a372-98d4058ba415`, "Working age people in employment deprivation (percentage)" | Yes | Benefit based; overlaps the claimant count. |
| 10 | Three year business survival rate (percent) | Higher | ONS, via Welsh Government | Businesses born in 2022, surviving to 2025 | OGL [L-WG] | M1, `1ecdcedf-efe5-412a-bd46-75a3e051ebf3`, Survival year "3 year survival", "Percent" | Yes | Lagged by construction (five year survival is only available for the 2020 cohort); small cohorts in small LAs. |
| 11 | Self-employed share of people in employment, 16 to 64 (percent) | Context | ONS APS, via Nomis | July 2025 to June 2026 | OGL [L-NOMIS] | Nomis `NM_17_5`, `variable=74` | Yes (tested) | Not clearly good or bad; rural LAs are high. |

**Recommended pick (5, giving 8 in total):** GDHI per head, claimant count rate, economic inactivity, active enterprises per 10,000, level 4 qualifications. Also refresh `earnings` to ASHE 2026.

## 2. Nature and floods (resilient)

Current: `flood_exposure`, `greenspace_access`.

| Rank | Measure (unit) | Direction | Publisher | Latest period | Licence | Fetch method and endpoint | All 22? | Caveat |
|---|---|---|---|---|---|---|---|---|
| 1 | Population-weighted annual mean nitrogen dioxide (µg/m3) | Lower | Welsh Government from Defra PCM modelling and ONS small area populations | 2024 | OGL [L-WG] | M1, `36f88bfb-36a3-4b54-9c24-51dcab107a62` (Air Quality), Pollutant "NO2" | Yes | Modelled on a 1 km grid, not measured. The web view rounds to whole numbers; the API returns the stored values. Defra should be credited as data provider. |
| 2 | Population-weighted annual mean fine particulates, PM2.5 (µg/m3) | Lower | as above | 2024 | OGL [L-WG] | M1, same dataset, Pollutant "PM2.5" | Yes | As above. PM10 is also available but tracks PM2.5 closely; pick one. |
| 3 | Woodland cover (percent of land area) | Higher | Forestry Commission, National Forest Inventory | NFI GB 2024 map | OGL [L-FC] | M2 on the NFI GB 2024 woodland layer from the Forestry Commission open data hub (`https://data-forestry.opendata.arcgis.com/datasets/5a3efa283e81431b911b5c9872527ca5_0`), clipped to Wales. Fallback: DataMapWales `geonode:nfi_wales_2020` (OGL [L-DMW], 2020 data) by WFS | Yes, computed | Woodland of 0.5 ha or more only; excludes small woods and hedgerow trees. GB-wide file is large; filter by Wales bounding box. |
| 4 | Land designated as a Site of Special Scientific Interest (percent of land area) | Higher | Natural Resources Wales | Layer published 12 August 2026 | OGL [L-DMW] `inspire-nrw:NRW_SSSI` | M2, WFS `inspire-nrw:NRW_SSSI` (1,088 features) | Yes, computed | Clip to land at high water mark, since many SSSIs are intertidal. A designation, not a measure of condition. |
| 5 | Land in a National Park or Area of Outstanding Natural Beauty (National Landscape) (percent of land area) | Higher | Natural Resources Wales | National Parks published 29 May 2025; AONB 28 November 2022 | OGL [L-DMW] `inspire-nrw:NRW_NATIONAL_PARK`, `inspire-nrw:NRW_AONB` | M2 on the union of both layers (3 and 6 features) | Yes, computed (many LAs score 0) | Landscape designation, not nature quality. Several LAs are 0, which is true but makes a flat bottom on the map. |
| 6 | River length at good or better overall status under the Water Framework Directive (percent of river length) | Higher | Natural Resources Wales | Cycle 3 baseline classification, assessed 2021 (published April 2023) | OGL [L-DMW] `geonode:nrw_wfd_river_waterbodies_c3_baseline_classification` | WFS on that layer (717 river lines, field `overallwb`); intersect lines with LA boundaries, sum length by status | Yes, computed | Status is assessed per water body, and water bodies cross LA lines; the LA figure is a length share, not an LA assessment. A 2024 interim classification exists but its layer page states no licence, so use the 2021 baseline until that is fixed. |
| 7 | Ambient green space, mean vegetation index (NDVI score) | Higher | Welsh Government, WIMD 2025, from NRW and OS data | WIMD 2025 | OGL [L-WG] | M1, `2f8dfe38-bfa8-4f61-bc34-1d84d470a940`, Indicator "Ambient green space (Normalised Difference Vegetation Index)", rows with W06 codes | Yes (tested, 22 rows) | Satellite greenness around homes; complements `greenspace_access`. |
| 8 | Population exposed to road, rail or industrial noise (percent) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `2f8dfe38`, "Population exposed to noise pollution" | Yes (tested) | Based on strategic noise mapping, which covers main roads, rail and agglomerations only. |
| 9 | Land in a Special Area of Conservation, Special Protection Area or Ramsar site (percent of land area) | Higher | Natural Resources Wales | Layers published 28 November 2022 | OGL [L-DMW] `inspire-nrw:NRW_SAC`, `NRW_SPA`, `NRW_RAMSAR` | M2 on the union of the three | Yes, computed | Overlaps heavily with SSSI; pick SSSI or this, not both. |
| 10 | Ancient woodland (percent of land area) | Higher | Natural Resources Wales | Ancient Woodland Inventory 2021, published 27 July 2026 | OGL [L-DMW] `inspire-nrw:NRW_ANCIENT_WOODLAND_INVENTORY_2021` | M2 (48,839 features) | Yes, computed | Many small polygons; dissolve first. |
| 11 | Urban tree canopy cover (percent of urban area) | Higher | Natural Resources Wales | 2018 survey, layer published 13 January 2023 | OGL [L-DMW] `inspire-nrw:UrbanTreeCover2018` | M2 within the survey's urban areas | Probably, check every LA has a surveyed town | Old (2018) and limited to towns; not comparable with woodland cover. |
| 12 | Fly-tipping incidents per 1,000 residents | Lower | Welsh Government, from local authority returns | 2024-25 | OGL [L-WG] | M1, `1d891896-2866-4fe8-a6fd-90f7caea2a24`, "Number of incidents" | Yes | Reflects how hard councils look and record as well as how much tipping there is. |

**Recommended pick (6, giving 8 in total):** NO2, PM2.5, woodland cover, SSSI share, National Park and AONB share, river water quality. NDVI is a good substitute if one of the GIS-derived measures proves too heavy for the pipeline.

## 3. Health (healthier)

Current: `life_exp`, `age65`.

| Rank | Measure (unit) | Direction | Publisher | Latest period | Licence | Fetch method and endpoint | All 22? | Caveat |
|---|---|---|---|---|---|---|---|---|
| 1 | Healthy life expectancy at birth (years) | Higher | ONS | 2022 to 2024 (released 19 February 2026) | OGL [L-ONS] | xlsx `https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/healthandsocialcare/healthandlifeexpectancies/datasets/healthstatelifeexpectancyallagesuk/current/healthylifeexpectancyuk.xlsx` | Bulletin says Welsh unitary authorities are included; confirm all 22 on first fetch | Male and female published separately; use the same simple mean rule as `life_exp`. Confidence intervals are wide for small LAs. |
| 2 | Deaths under age 75 (rate per 100,000) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Premature deaths (people aged under 75, rate per 100,000)" | Yes | Check in the WIMD technical report whether the rate is age standardised before ranking. |
| 3 | Residents in bad or very bad health (percent) | Lower | ONS Census 2021, via Nomis | March 2021 | OGL [L-NOMIS] | Nomis `NM_2055_1` (TS037) | Yes | Self-reported; a 2021 snapshot. Strongly driven by age mix. |
| 4 | People with GP-recorded mental health conditions (rate per 100) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "People with GP recorded mental health conditions (percentage)" | Yes | Depends on how often people consult and how GPs record. |
| 5 | Single live births with low birth weight (percent) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Single live births with low birth weight (percentage)" | Yes | Small numbers in small LAs; WIMD pools years. |
| 6 | Children fully immunised by their fourth birthday (percent) | Higher | Welsh Government (from NHS immunisation records) | 2025-26 | OGL [L-WG] | M1, `f5060a7c-8b2c-41c4-985f-f0a75a5dac5f`, Flying start status "All areas", Data description "Percentage" | Yes | Sits in a Flying Start dataset; use the "All areas" rows only. |
| 7 | Residents disabled under the Equality Act, day-to-day activities limited a lot (percent) | Lower | ONS Census 2021, via Nomis | March 2021 | OGL [L-NOMIS] | Nomis `NM_2056_1` (TS038) | Yes | Age-driven; overlaps bad health. |
| 8 | People with GP-recorded chronic conditions (rate per 100) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "People with GP recorded chronic conditions (percentage)" | Yes | Age-driven. |
| 9 | Residents giving 20 or more hours a week of unpaid care (percent) | Context | ONS Census 2021, via Nomis | March 2021 | OGL [L-NOMIS] | Nomis `NM_2057_1` (TS039) | Yes | Not clearly good or bad; could feed `care_pressure` in the game. |
| 10 | Cancer incidence (rate per 100,000) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Cancer incidence in the population (rate per 100,000)" | Yes | Partly reflects screening and age. |
| 11 | Suicide rate (per 100,000, age standardised, three year pooled) | Lower | ONS | Latest edition on the page (file `suicidebylocalauthority2025.xlsx`) | OGL [L-ONS] | `https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/datasets/suicidesbylocalauthority` | Expected yes, confirm on fetch | Small numbers; ONS flags low reliability for small counts. Sensitive topic for a game. |
| 12 | Drug misuse deaths (per 100,000) | Lower | ONS | Latest edition | OGL [L-ONS] | `https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/datasets/drugmisusedeathsbylocalauthority` | Expected yes, some counts suppressed | Small numbers; sensitive topic. |

**Recommended pick (6, giving 8 in total):** healthy life expectancy, premature deaths, bad health, mental health conditions, low birth weight, childhood immunisation.

## 4. Fairness (equal)

Current: `deprivation`, `deprivation_10`, `poor_housing`.

| Rank | Measure (unit) | Direction | Publisher | Latest period | Licence | Fetch method and endpoint | All 22? | Caveat |
|---|---|---|---|---|---|---|---|---|
| 1 | Children under 16 in relative low income families (percent) | Lower | DWP | Financial year ending 2025 (published 26 March 2026) | OGL [L-GOVUK] https://www.gov.uk/government/statistics/children-in-low-income-families-local-area-statistics-2022-to-2025 | ODS `https://assets.publishing.service.gov.uk/media/69b809619d8b52961a62b49a/children-in-low-income-families-local-area-statistics-2022-2025.ods` | Yes (UK local areas) | Before housing costs, calibrated to the national survey; LA figures are modelled. The URL changes each March; read it from the collection page. |
| 2 | Pupils eligible for free school meals, means tested (percent) | Lower | Welsh Government, PLASC | 2025/26 school year | OGL [L-WG] | M1, `7be88416-50db-4a08-917d-ca6e4a17db39`, Category "Eligible for free school meals", "Percentage of pupils" | Yes | Universal primary free meals do not change this count, which is still the means-tested eligibility; but take-up of the means test may have fallen. Use the 5 to 15 version `a875cf2c` if a cleaner age band is wanted. |
| 3 | Older people in income deprivation (percent) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Older people in income deprivation (percentage)" | Yes | Pension Credit based; take-up of Pension Credit is incomplete. |
| 4 | Hourly pay of the lowest-paid fifth of full-time residents, 20th percentile (GBP per hour) | Higher | ONS ASHE, via Nomis | 2026 | OGL [L-NOMIS] | Nomis `NM_30_1`, `sex=8&pay=5&item=7`, `time=2026` (tested, 22 of 22 values) | Yes | Full-time only; part-time low pay is missed. Check the `pay` code label before use. |
| 5 | Gender pay gap, median hourly pay of full-time men minus women, as a percent of men's | Lower (smaller gap) | ONS ASHE, via Nomis | 2026 | OGL [L-NOMIS] | Nomis `NM_30_1`, `sex=1,3&pay=5&item=2` (tested, 44 of 44 values) | Yes | Noisy in small LAs and can go negative; present with the "sample based" label. |
| 6 | People in income deprivation (percent) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "People in income deprivation (percentage)" | Yes | Overlaps `deprivation`; better as a replacement for `deprivation_10` than an addition. |
| 7 | Children in income deprivation (percent) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Children in income deprivation (percentage)" | Yes | Overlaps the DWP measure; pick one. |
| 8 | Households deprived in two or more dimensions (percent) | Lower | ONS Census 2021, via Nomis | March 2021 | OGL [L-NOMIS] | Nomis `NM_2031_1` (TS011) | Yes | 2021 snapshot. |
| 9 | Persistent absence from secondary school (percent of pupils) | Lower | Welsh Government | Latest school year in dataset | OGL [L-WG] | M1, `c12083b4-a874-45d4-bf25-0653f5564223` (secondary, by LA) | Yes | Mix of fairness and education. |
| 10 | Households unable to afford to buy or rent privately (score) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Households unable to afford to enter owner occupation or the private rental market (score)" | Yes | A modelled score, harder to explain than a percent; overlaps `affordability`. |
| 11 | Discretionary Assistance Fund payments per 1,000 residents | Context | Welsh Government | 2025-26 (monthly to March 2026) | OGL [L-WG] | M1, `4cb5e809-d794-44ef-9f98-0f4e44ad0647`, "Number of payments", sum 12 months | Yes | Measures crisis grants paid, which reflects awareness and local promotion as well as need. |

**Recommended pick (5, giving 8 in total):** children in low income families, free school meals, older people in income deprivation, low pay (20th percentile), gender pay gap. If the gender gap proves too noisy, swap in households deprived in two or more dimensions.

## 5. Homes and community (cohesive)

Current: `pop` and `pop_change` (context), `young_adults`, `affordability`, `gp_travel_public`.

| Rank | Measure (unit) | Direction | Publisher | Latest period | Licence | Fetch method and endpoint | All 22? | Caveat |
|---|---|---|---|---|---|---|---|---|
| 1 | Second homes per 100 dwellings | Lower | Welsh Government, council tax returns (CT1) | 2026-27 taxbase | OGL [L-WG] | M1, `062488e2-3fd6-4755-9b0b-a64547fc570f`, Row "H8 - Total chargeable second homes" divided by "A1 - All chargeable dwellings", "Number of dwellings" | Yes | Counts homes registered as second homes for council tax; some switch to business rates as holiday lets and drop out. |
| 2 | Homeless people in temporary accommodation per 10,000 residents | Lower | Welsh Government, from local authorities | 30 September 2026 (monthly) | OGL [L-WG] | M1, `35713e0f-e755-4444-ab14-915d8d9432e1`, Accommodation type "Total", "Total number of homeless people temporarily accommodated" | Yes | Reflects council practice and stock as well as need; use a 12 month mean to smooth. |
| 3 | Police recorded crime, excluding fraud, per 1,000 residents | Lower | Home Office | Year ending June 2026 | OGL [L-GOVUK] https://www.gov.uk/government/statistical-data-sets/police-recorded-crime-and-outcomes-open-data-tables | ODS `https://assets.publishing.service.gov.uk/media/6ad230f3a89985bb970267f2/prc-csp-mar21-jun26-tables-221026.ods` (Community Safety Partnership tables) | Check: most Welsh CSPs match one LA, but any merged CSP would need splitting | Recording practice differs between the four Welsh forces. Fallback for a clean LA split: data.police.uk street-level CSVs by LSOA (OGL [L-POLICE]) summed with M4, or the WIMD 2025 crime indicators below. |
| 4 | Overcrowded households (percent) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Overcrowded households (percentage)" | Yes | Census 2021 based. Same idea as Census TS052 (`NM_2070_1`). |
| 5 | Long-term empty homes per 100 dwellings | Lower | Welsh Government, CT1 | 2026-27 taxbase | OGL [L-WG] | M1, `062488e2`, Row "H7 - Total chargeable empty properties" (or "H4g" for those paying the long-term premium) over "A1" | Yes | H7 includes short-term empties; H4g depends on whether each council charges a premium. Read the CT1 notes before choosing. |
| 6 | New homes completed per 1,000 dwellings | Higher | Welsh Government | 2025-26 | OGL [L-WG] | M1, `60138097-1bda-4bde-8631-28b5f6a97764`, "Total new dwellings completed", Dwelling type "Total", divided by dwelling stock | Yes | Lumpy year to year in small LAs; use a 3 year mean. |
| 7 | Social housing share of dwellings (percent) | Context | Welsh Government | 31 March 2025 | OGL [L-WG] | M1, `6476cc20-ddeb-46a5-be64-10a23c8a159f`, Tenure "Total social Housing", "Dwelling stock estimates (percentage)" | Yes | Not clearly good or bad; useful game context. |
| 8 | Residential premises unable to get superfast broadband (percent) | Lower | Welsh Government, WIMD 2025 (Ofcom data) | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Residential premises unable to receive superfast broadband (percentage)" | Yes | Fast-changing; WIMD year is already dated. |
| 9 | Police recorded violence with injury (rate per 100 at-risk population) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `db7a291a-3307-4486-8e01-c8d9b11bffb9`, Indicator "Police recorded violence with injury per at-risk population", W06 rows | Yes (tested) | Also available: antisocial behaviour, burglary, criminal damage, theft, public order, stalking and harassment. Night-time economies (Cardiff, Swansea) inflate rates. |
| 10 | Road casualties killed or seriously injured per 100,000 residents | Lower | DfT, STATS19 | 2025 | OGL [L-GOVUK] https://www.gov.uk/government/statistical-data-sets/road-safety-open-data | CSV from that page (collision file has the LA district code) | Yes | Small numbers; pool 3 years. The StatsWales collision table stops at 2022. |
| 11 | Rough sleepers per 100,000 residents | Lower | Welsh Government | 30 September 2026 | OGL [L-WG] | M1, `116be6b0-97bb-4abc-8cfb-13ff4b5d5d7e` | Yes | Very small numbers; many LAs report single figures. |
| 12 | Adults who feel a sense of community or belonging to their local area (percent) | Higher | Welsh Government, National Survey for Wales | April 2024 to March 2025 | OGL [L-WG] | Results viewer workbook `https://www.gov.wales/sites/default/files/statistics-and-research/2025-08/national-survey-results-viewer-ms-excel-2023.xlsb` (8.6 MB, XLSB, needs `pyxlsb`) | Not confirmed: LA breakdown in the workbook not checked | Sample is roughly proportional to population, so small LAs have a few hundred respondents. Only adopt after confirming the workbook has LA rows. |

**Recommended pick (4, giving 9 in total, 7 with a direction):** second homes, homeless in temporary accommodation, recorded crime rate, overcrowding. Empty homes and new homes completed are close alternates.

## 6. Welsh and culture (culture)

Current: `welsh_speakers` (Census 2021).

| Rank | Measure (unit) | Direction | Publisher | Latest period | Licence | Fetch method and endpoint | All 22? | Caveat |
|---|---|---|---|---|---|---|---|---|
| 1 | Pupils in Welsh-medium or dual-language schools or provision (percent of pupils) | Higher | Welsh Government, PLASC | 2025/26 | OGL [L-WG] | M1, `aedd6ec5-f557-42d4-b767-8e93e5706663`, School language "Welsh medium school / provision (including transitional)" (optionally plus dual language) over "All schools", "Number of pupils" | Yes | New language categories from 2024/25, so only two years in this series; older series used different labels. |
| 2 | People aged 3+ who speak Welsh every day (percent) | Higher | ONS Annual Population Survey, via Welsh Government | Year ending 31 March 2026 | OGL [L-WG] | M1, `f66b78dd-e166-4e8e-9b61-d2a61d0c39e3`, Frequency "Daily" | Yes | APS overstates Welsh ability compared with the Census; use for relative standing and trend, not as a Census replacement. |
| 3 | People aged 3+ who can speak, read and write Welsh (percent) | Higher | ONS Census 2021, via Nomis | March 2021 | OGL [L-NOMIS] | Nomis `NM_2050_1` (TS032 detailed skills) | Yes | Same Census year as `welsh_speakers`, so it adds depth rather than recency. |
| 4 | Pupils aged 5+ who speak Welsh at home (percent) | Higher | Welsh Government, PLASC (parents' assessment) | 2025/26 | OGL [L-WG] | M1, `5f03275f-5999-48c7-bc35-301cdfe351c1`, "Speaks Welsh at home" over "Total" | Yes | Parent-reported. |
| 5 | Listed buildings per 1,000 residents | Context (or Higher, as heritage richness) | Cadw | Live register, layer updated July 2026 | OGL [L-CADW], layer `inspire-wg:Cadw_ListedBuildings` [L-DMW] | M3 on WFS `inspire-wg:Cadw_ListedBuildings` (30,110 points) | Yes, computed | A count of designations, not of use or condition. Per km2 is the alternative denominator; per head favours rural LAs. |
| 6 | Average return travel time to a public library by public transport (minutes) | Lower | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Average return travel time to a public library by public transport, minutes" | Yes | Access, not use. Sports facility travel time is also in the same dataset. |
| 7 | Annual Population Survey Welsh speakers aged 3+ (percent) | Higher | ONS APS, via Welsh Government | Year ending 30 June 2026 | OGL [L-WG] | M1, `d11ca4b4-2cc5-4695-924b-54152498e316`, "Can speak Welsh" over "All aged 3 or older" | Yes | Quarterly trend between Censuses; overstates relative to the Census. |
| 8 | Teachers teaching or working through the medium of Welsh (percent of teachers) | Higher | Welsh Government, school workforce census | 2025/26 | OGL [L-WG] | M1, `eae9e3f2-c335-454f-a963-f31828591af5`, "Teaching/Working through the medium of Welsh in current post" over "Total" | Yes | Largely mirrors rank 1. |
| 9 | Scheduled monuments per 100 km2 | Context | Cadw | Live register, layer updated July 2026 | OGL [L-CADW], layer `inspire-wg:Cadw_SAM` [L-DMW] | M3 on WFS (4,239 features; polygons, use centroids) | Yes, computed | A count of designations. |
| 10 | Recorded historic place names per km2 | Context | RCAHMW | Layer published 13 January 2026 | OGL [L-RCAHMW] | M3 on WFS `geonode:rcahmw_historicplacenames_wales_recordednames` (666,308 points) | Yes, computed | Reflects where sources and volunteers have recorded names, not only how many names exist. Must carry the RCAHMW attribution string. |
| 11 | People who say their national identity is Welsh (alone or with another) (percent) | Context | ONS Census 2021, via Nomis | March 2021 | OGL [L-NOMIS] | Nomis `NM_2046_1` (TS027) | Yes | Identity, not a goal; show as context only and avoid any political framing. |
| 12 | Adults who attended an arts event or visited a historic place in the last year (percent) | Higher | Welsh Government, National Survey for Wales | April 2022 to March 2023 (arts not asked in 2024-25) | OGL [L-WG] | Results viewer workbook (see Homes rank 12) | Not confirmed | Old, topic rotates out of the survey, and the LA breakdown is unconfirmed. |

**Recommended pick (6, giving 7 in total):** Welsh-medium pupils, daily Welsh speakers, speak-read-write Welsh, Welsh at home (pupils), listed buildings per 1,000, library travel time.

## 7. Climate (global)

Current: `emissions_head`, `renewables`, `renewables_mw`.

| Rank | Measure (unit) | Direction | Publisher | Latest period | Licence | Fetch method and endpoint | All 22? | Caveat |
|---|---|---|---|---|---|---|---|---|
| 1 | Local authority municipal waste reused, recycled or composted (percent) | Higher | Welsh Government, data from Natural Resources Wales (WasteDataFlow) | 2024-25 | OGL [L-WG] | M1, `f9314a75-6c2b-4baf-b8ef-383a2bc06125`, "Percentage of Waste Reused/Recycled/Composted (Statutory Target)" | Yes | Accredited official statistics. All LAs are high (Wales leads the UK), so the spread is narrow. |
| 2 | Licensed cars that are plug-in (battery or plug-in hybrid) (percent) | Higher | DfT and DVLA | End of June 2026 (tables updated 23 September 2026) | OGL [L-GOVUK] https://www.gov.uk/government/statistical-data-sets/vehicle-licensing-statistics-data-tables | ODS VEH0142 (plug-in by LA) `https://assets.publishing.service.gov.uk/media/6aad561b086ce7c57b818707/veh0142.ods` over VEH0105 (all licensed by LA) `https://assets.publishing.service.gov.uk/media/6aad561bce3f006bd4346ce1/veh0105.ods`, cars, private and company | Yes | Company cars are registered at the keeper's address, which can inflate some LAs. Use private keepership if the spread looks odd. |
| 3 | Public electric vehicle charging devices per 100,000 residents | Higher | DfT | 1 October 2026 | OGL [L-GOVUK] https://www.gov.uk/government/statistical-data-sets/electric-vehicle-charging-infrastructure-statistics-data-tables-evci | ODS EVCI0102 `https://assets.publishing.service.gov.uk/media/6aff279ad367b3459e424029/evci0102_2026-10_EV_chargers_by_local_authority_UK.ods` | Yes | Quarterly; URL changes each quarter, read it from the page. |
| 4 | Heat pumps installed per 1,000 dwellings | Higher | Welsh Government (compiled by Regen, from DESNZ, scheme and network data) | 2024 | OGL [L-WG] | M1, `155d1692-2002-40f1-90d7-106fa55fc53e`, Technology "Heat Pump", "Number of Projects", divided by dwelling stock | Yes (plus "Offshore" and "Unknown" rows to drop) | Includes non-domestic installations; WG notes some small low carbon projects are estimated. |
| 5 | Average energy efficiency of homes (SAP score) | Higher | Welsh Government, WIMD 2025 | WIMD 2025 | OGL [L-WG] | M1, `c28ab0ec`, "Average energy efficiency of residential properties (Standard Assessment Procedure score)" | Yes | Modelled for all homes, which avoids the bias of EPC data (certificates exist only for homes sold, let or built). |
| 6 | Median domestic gas use per meter (kWh, weather corrected) | Lower | DESNZ | 2024 | OGL [L-GOVUK] https://www.gov.uk/government/statistics/regional-and-local-authority-gas-consumption-statistics | xlsx `https://assets.publishing.service.gov.uk/media/69f9bf208f3213f7384ecae6/Subnational_gas_consumption_statistics_2005-2024.xlsx` | Yes | Only homes on the gas grid; rural LAs have fewer such homes, so pair with the off-gas share below. |
| 7 | Household waste not recycled, per person (kg) | Lower | Welsh Government | 2024-25 | OGL [L-WG] | M1, `080804d5-8454-4f50-ae9e-5e0a2a4d22cd`, "per person" | Yes | Complements rank 1, measures waste reduction rather than sorting. |
| 8 | Workers who usually drive to work (percent of those in work, excluding work from home) | Lower | ONS Census 2021, via Nomis | March 2021 | OGL [L-NOMIS] | Nomis `NM_2078_1` (TS061) | Yes | Census was in a lockdown period; ONS advises caution with travel to work. |
| 9 | Domestic and transport greenhouse gas emissions per person (tonnes CO2e) | Lower | DESNZ | 2024 | OGL [L-GOVUK] (already cited in `docs/data-licences.md`) | Same CSV the pipeline already reads, filter the sector columns | Yes | Splits `emissions_head` into sectors people can act on; removes the Neath Port Talbot industry distortion. |
| 10 | Properties not connected to the gas network (percent) | Context | DESNZ | 2024 | OGL [L-GOVUK] https://www.gov.uk/government/statistics/sub-national-estimates-of-households-not-connected-to-the-gas-network | xlsx `https://assets.publishing.service.gov.uk/media/6942b893501cdd438f4cf521/Subnational_estimates_of_properties_not_connected_to_the_gas_network_2015-2024.xlsx` | Yes | Estimate from meter data and address counts. |
| 11 | Mean domestic electricity use per meter (kWh) | Context | DESNZ | 2024 | OGL [L-GOVUK] https://www.gov.uk/government/statistics/regional-and-local-authority-electricity-consumption-statistics | xlsx `https://assets.publishing.service.gov.uk/media/69426e905431f4f94d7f0b5e/Subnational_electricity_consumption_statistics_2005-2024.xlsx` | Yes | Rising use can mean electrification (good) or inefficiency (bad), so no direction. |
| 12 | Share of domestic EPCs lodged at band C or better (percent) | Higher | MHCLG | Certificates to September 2026 | OGL [L-GOVUK] https://www.gov.uk/government/statistical-data-sets/live-tables-on-energy-performance-of-buildings-certificates | ODS Table D1 `https://assets.publishing.service.gov.uk/media/6ae0bbc016428df537606223/D1-_Domestic_Properties.ods` | Check the table has a Welsh LA breakdown | Certificates cover only homes sold, let or newly built; biased towards newer and rented stock. Rank 5 is preferred. |

**Recommended pick (5, giving 8 in total):** recycling rate, plug-in car share, public chargers per 100,000, heat pumps per 1,000 dwellings, average SAP score.

---

## Summary of the recommended picks

| Goal | Now | Add | Total | Added measures |
|---|---|---|---|---|
| Work and pay | 3 | 5 | 8 | GDHI per head; claimant count rate; economic inactivity; enterprises per 10,000; level 4 qualifications |
| Nature and floods | 2 | 6 | 8 | NO2; PM2.5; woodland cover; SSSI share; National Park and AONB share; river water quality |
| Health | 2 | 6 | 8 | Healthy life expectancy; premature deaths; bad health; mental health conditions; low birth weight; immunisation by 4 |
| Fairness | 3 | 5 | 8 | Children in low income families; free school meals; older people in income deprivation; low pay; gender pay gap |
| Homes and community | 5 | 4 | 9 (7 with direction) | Second homes; temporary accommodation; recorded crime; overcrowding |
| Welsh and culture | 1 | 6 | 7 | Welsh-medium pupils; daily Welsh speakers; speak, read and write Welsh; Welsh at home; listed buildings; library travel time |
| Climate | 3 | 5 | 8 | Recycling; plug-in cars; public chargers; heat pumps; average SAP |

That is 37 new measures, 56 in all. Of the 37, 28 come from StatsWales, Nomis or ONS tables in shapes the pipeline already handles, 4 from gov.uk spreadsheets (DWP, DfT twice, Home Office), and 5 need the new GIS step (M2 and M3): woodland, SSSI, National Park and AONB, river quality, listed buildings.

New attribution lines the app will need: Forestry Commission (NFI), Cadw, Defra (air quality provider), DWP, DfT, Home Office, DESNZ (already present), and NRW with the OS licence line for each NRW layer.

## Where open data is thin

- **Culture (as distinct from the Welsh language).** There is no current, open, LA-level measure of taking part in arts, museums, libraries or sport. The National Survey for Wales arts questions were last asked in 2022-23, the LA breakdown in its workbook is unconfirmed, and arts and sport national indicators were not updated in 2026. The plan fills the goal with Welsh language measures, heritage designations and access times, which are honest but describe stock and access rather than participation.
- **Health, partly.** Much of the open LA health data is either the Census 2021 snapshot or WIMD 2025 indicators with pooled source years. The richest recent sources (Public Health Wales tools and child measurement) are not reusable under their terms.
- **Nature, in effort rather than availability.** The licences are clean, but five of the strongest nature and culture measures need an area-intersection step that the pipeline does not yet have.

## Rejects

| Candidate | Reason |
|---|---|
| Public Health Wales data (Child Measurement Programme obesity by LA, Public Health Outcomes tools) | Terms of use at https://phw.nhs.wales/terms-of-use/ allow "personal and non-commercial purposes" only and say visitors "must not reproduce or re-publish any material ... without permission". |
| Unified Peat Map of Wales | DataMapWales page states "Public Sector Geospatial Agreement (PSGA)", not OGL (https://datamap.gov.wales/layers/inspire-wg:wg_unified_peat_2019). |
| Peatlands of Wales (extent, carbon) | Page says OGL but the constraints note "Mapping derived from soils data © Cranfield University (NSRI)". Cranfield soils data is usually licensed restrictively; hold until NRW confirms in writing. |
| WFD Cycle 3 interim 2024 river classification | Layer page states no licence (`geonode:nrw_wfd_c3_2024_interim_rivers`). Use the 2021 baseline, which is OGL. |
| Priority habitat layers (`geonode:nrw_priority_habitat_*`) | Licence "not_specified" in the DataMapWales catalogue. |
| ONS personal well-being (life satisfaction, anxiety) by LA | ONS has paused LA estimates because of APS sample problems; the latest LA table is April 2022 to March 2023. Too old. |
| Fuel poverty by LA | Latest Welsh LA modelled estimates date from 2018; the 2024 estimates are Wales only. |
| APS unemployment rate by LA | Suppressed as unreliable for 9 of 22 LAs in July 2025 to June 2026 (tested). The claimant count covers the same ground. |
| APS disability employment gap by LA | Not tested; expected to be suppressed in small LAs for the same sample reasons. Revisit only if a pooled ONS table appears. |
| Bathing water quality | Several LAs have no designated bathing water (for example Powys, Merthyr Tydfil, Blaenau Gwent), so not all 22 have a value. |
| Grassland and woodland fires | Published by Fire and Rescue Area (3 areas), not LA. |
| GP numbers per head | Published by GP cluster and health board; clusters do not map cleanly to LAs. |
| Bus passenger journeys per head | Published for Wales and GB countries only. |
| Road collisions from StatsWales (`449cb665`) | Stops at 2022; use DfT STATS19 instead (Homes rank 10). |
| ONS recorded crime by CSP (ons.gov.uk) | Last edition is year ending March 2024; the Home Office open data tables run to June 2026 and replace it. |
| National Survey for Wales measures (sense of community, arts, physical activity, loneliness) as recommended picks | Licence is fine (OGL via gov.wales) but the LA breakdown inside the 8.6 MB XLSB results viewer was not confirmed, samples per LA are small, and topics rotate between years. Kept as unconfirmed candidates only. |
| Electoral turnout by LA | The Electoral Commission copyright page refused automated access (HTTP 403), so the licence could not be verified on the publisher's page. Senedd 2026 results are by the new constituencies, not LAs. |
| Universal Credit claimants via DWP Stat-Xplore | Needs an account and API key, and the Stat-Xplore terms page could not be read; the DWP children in low income families table and the claimant count cover the need. |
| Welsh Housing Conditions Survey energy performance (`491241a0`) | Wales total only, 2017-18. |
| Healthy weight at age 4 to 5 by LA (StatsWales Flying Start table `4da5ddfb`) | Split into Flying Start and non-Flying Start areas with no all-area figure, and derived from Public Health Wales data. |
