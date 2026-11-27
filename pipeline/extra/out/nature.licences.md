| Dataset | Publisher | Licence | Where read (2026-11-27) | Attribution |
|---|---|---|---|---|
| Air quality NO2 and PM2.5 by local authority (StatsWales `36f88bfb`) | Welsh Government, from Defra PCM modelling | OGL v3.0 | https://www.gov.wales/copyright-statement | Contains public sector information licensed under the Open Government Licence v3.0. Source: Welsh Government via StatsWales; data provider Defra. |
| WIMD 2025 indicators by LSOA, ambient green space and noise (StatsWales `2f8dfe38`) | Welsh Government | OGL v3.0 | https://www.gov.wales/copyright-statement | Contains public sector information licensed under the Open Government Licence v3.0. Source: Welsh Government, WIMD 2025. |
| Fly-tipping incidents (StatsWales `1d891896`) | Welsh Government, from local authority returns | OGL v3.0 | https://www.gov.wales/copyright-statement | Contains public sector information licensed under the Open Government Licence v3.0. Source: Welsh Government via StatsWales. |
| Ancient Woodland Inventory 2021 (`inspire-nrw:NRW_ANCIENT_WOODLAND_INVENTORY_2021`) | Natural Resources Wales | OGL ("Licence: Open Government Licence for Public Sector Information (OGL)", published 27 July 2026) | https://datamap.gov.wales/layers/inspire-nrw:NRW_ANCIENT_WOODLAND_INVENTORY_2021 | Contains Natural Resources Wales information (c) Natural Resources Wales and Database Right. All rights Reserved. Contains Ordnance Survey Data. Ordnance Survey Licence number AC0000849444. Crown Copyright and Database Right. |
| Local authority boundaries (`inspire-wg:localauthorities`), used to clip the layer above | Welsh Government via DataMapWales | OGL | https://datamap.gov.wales/layers/inspire-wg:localauthorities | Contains public sector information licensed under the Open Government Licence v3.0. Contains Ordnance Survey data (c) Crown copyright and database right. |

Caveats
- StatsWales dataset pages state no licence of their own; the plan relies on the gov.wales copyright statement.
- The StatsWales web view rounds air quality to whole numbers; the API stored values are used.
- NDVI and noise authority rows are empty in StatsWales, so authority and Wales values are population-weighted means of LSOA values computed in the pipeline.
- Boundary layer licence (OGL) read on its DataMapWales layer page on 2026-11-27; the page states no attribution text, so the OGL line is used.
