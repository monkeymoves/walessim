# v3 places: research for Rhyl, Port Talbot, Machynlleth and Bethesda

Research note for `docs/design/v3-wales.md` section 3 ("Places"). Written 28 November 2026. Nothing here is in the model yet: the owning agent turns it into `model/board/places/<id>.yaml`, adds any new source to `model/sources.yaml` and a row to `docs/data-licences.md`.

How to read it:

- **Figures** were pulled on 28 November 2026 from the live open source named, or read from `model/data/la-indicators.json` (already sourced). Small-area figures are sums over named LSOAs (Census 2021 small areas); the LSOA codes are given so the build can recompute them.
- **"To check"** means the fact is widely reported but I did not reach a primary open source for it. It must not ship as a figure until checked.
- **Voice lines** are written for the game. They are not quotes and must carry the usual "Illustrative voice, not a real quote" label.
- **Options and effects** are game design suggestions, not findings. No real body has agreed to any option.
- Rules kept: generic levers only (no parties, no current named schemes, no living politicians), pips not pounds in anything the player reads, no em or en dashes.

## New sources needed

Existing ids reused: `wimd_2025`, `statswales_flood`, `nomis_census_ts033`, `nomis_mye`, `nomis_ashe`, `nomis_ashe_workplace`, `nomis_jobs_density`, `statswales_ct1`, `cadw_listed_buildings`, `os_open_rivers`.

| Suggested id | What | Where | Licence | Year |
|---|---|---|---|---|
| `wimd_2025_domains` | WIMD 2025 domain ranks by LSOA (income, employment, health, access to services, housing, physical environment) | DataMapWales WFS, layers `geonode:wimd2025_<domain>` | OGL v3.0 (DataMapWales) | 2025 |
| `wimd_2025` (extend) | Overall rank by LSOA **with names** (`lsoa_name_en`, `lsoa_name_cy` fields exist on the same layer) | `geonode:wimd2025_overall` | OGL v3.0 | 2025 |
| `nrw_carr_2024` | NRW Communities at Risk Register 2024, present day: theoretical danger score and rank by community, for rivers, sea and surface water, undefended and managed (with defences and warnings) | DataMapWales `geonode:nrw_car2024_present_day`, published 31 January 2025 | OGL v3.0, attribution "Contains Natural Resources Wales information and OS data" | 2024 (pub. 2025) |
| `nomis_census_ts007a` | Census 2021 TS007A age by five-year band, LSOA | Nomis NM_2020_1 | OGL v3.0 (ONS) | 2021 |
| `nomis_census_ks102` | Census 2011 KS102EW age structure, LSOA | Nomis NM_145_1 | OGL v3.0 (ONS) | 2011 |
| `nomis_census_ks207wa` | Census 2011 KS207WA Welsh language skills, LSOA | Nomis NM_614_1 | OGL v3.0 (ONS) | 2011 |
| `nomis_census_ts054` | Census 2021 TS054 tenure, LSOA | Nomis NM_2072_1 | OGL v3.0 (ONS) | 2021 |
| `nomis_census_ts060a` | Census 2021 TS060A industry (19 groups), LSOA | Nomis NM_2017_1 | OGL v3.0 (ONS) | 2021 |
| `nomis_census_ts066` | Census 2021 TS066 economic activity, LSOA | Nomis NM_2083_1 | OGL v3.0 (ONS) | 2021 |
| `nrw_coastal_flooding_review_2014` | Wales Coastal Flooding Review, Phase 1 report (31 January 2014): impacts of the 5 December 2013 surge | naturalresources.wales/media/1936/wales-coastal-flooding-review-phase-1.pdf | NRW publication; NRW site terms point to OGL, maps inside are "Crown copyright, all rights reserved". Use the numbers only, no maps. **Check** | 2014 |
| `wg_central_rhyl_defences` | Welsh Government news release, Central Rhyl coastal defences open, 9 October 2025 | media.service.gov.wales/news/gbp-66m-scheme-protects-hundreds-of-properties-in-rhyl-from-flooding | OGL v3.0 (gov.wales copyright statement) | 2025 |
| `wg_sea_transport` | Welsh Government statistics, Sea transport 2023 and 2024 (Port Talbot tonnage, from DfT port freight statistics) | gov.wales/sea-transport-2024-html and gov.wales/sea-transport-2023-html | OGL v3.0 | 2023, 2024 |
| `ukgov_port_talbot_eaf` | UK Government press release, construction starts on the Port Talbot electric arc furnace, 14 July 2025 | gov.uk/government/news/5000-jobs-secured-as-construction-starts-on-port-talbot-green-steel-project | OGL v3.0 | 2025 |
| `senedd_research_port_talbot` | Senedd Research articles: 23 January 2024 (Tata announces next steps, up to 2,800 UK job losses), 30 September 2025 (one year on from the blast furnaces closing) | research.senedd.wales | Senedd Commission copyright. Reuse terms not checked: **check** before citing. Prefer the OGL sources above for any figure the player sees | 2024, 2025 |
| `wg_air_quality_npt` | Air Quality in Wales: Neath Port Talbot AQMA Taibach/Margam (declared 2000, PM10) | airquality.gov.wales/laqm/area/neath-port-talbot-aqma-taibachmargam | Welsh Government site, licence **check** (likely OGL) | 2000 to now |
| `wg_dyfi_bridge` | Welsh Government, A487 new Dyfi bridge (project page) | gov.wales/a487-new-dyfi-bridge | OGL v3.0 | 2024 |
| `tfw_cambrian_timetable` | Transport for Wales timetable, Birmingham to Aberystwyth and Machynlleth to Pwllheli, 19 July to 13 September 2026 | tfw.wales/sites/default/files/2026-07/1_Cambrian_May-2026_V3.pdf | TfW publication, no open licence stated: use as a checked fact only, **check** | 2026 |
| `gwynedd_llechi` | Llechi Cymru, Penrhyn Slate Quarry and Bethesda (Gwynedd Council, the World Heritage Site body) | llechi.cymru/node/120 | Gwynedd Council copyright, not OGL. Facts only, no text copied. Better: a Cadw or Coflein record, **check** | 2025 |

## 1. Rhyl (Y Rhyl)

- **Council:** Denbighshire, `W06000004` (`authorities.yaml` already lists Rhyl / Y Rhyl as a town).
- **Template:** T3, one hard choice.
- **Offered by (suggestion):** projects `coast-wetlands`, `slow-the-water`; events `coastal-surge`, `storm-winter`.
- **Small areas used:** the 16 LSOAs named "Rhyl ..." in WIMD 2025 (W01000226 to W01000241). Rhyl West is W01000239, W01000240, W01000241.

### Facts

| # | Fact | Source id | Licence | Year |
|---|---|---|---|---|
| 1 | About 26,500 people live in Rhyl's 16 small areas (26,507). | `nomis_census_ts007a` | OGL | 2021 |
| 2 | Rhyl West 2 is the most deprived of Wales's 1,917 small areas. Four of the ten most deprived small areas in Wales are in Rhyl (Rhyl West 2 ranked 1st, Rhyl South West 2 5th, Rhyl West 1 9th, Rhyl West 3 10th). Six of Rhyl's 16 are in the most deprived tenth. | `wimd_2025` | OGL | 2025 |
| 3 | Rhyl West 2 is also ranked 1st of 1,917 for income, for employment and for health deprivation. | `wimd_2025_domains` | OGL | 2025 |
| 4 | In Rhyl West, half of households rent privately (50.4 per cent, against 17.0 per cent across Wales). Only about a quarter own their home (26.0 per cent, against 66.1). | `nomis_census_ts054` | OGL | 2021 |
| 5 | In Rhyl West, 16.9 per cent of residents aged 16 and over are out of work through long-term sickness or disability, against 5.9 per cent across Wales. | `nomis_census_ts066` | OGL | 2021 |
| 6 | On 5 December 2013 a tidal surge flooded about 136 properties in Rhyl. Over 400 properties were told to evacuate and over 200 people went to rest centres. | `nrw_coastal_flooding_review_2014` | see source table | 2013 |
| 7 | NRW's Communities at Risk Register ranks Rhyl 2nd in Wales for danger from the sea without defences, and 6th with defences and warnings. It also ranks Rhyl 2nd for river flooding with defences in place. NRW says the register is an indicator, not an absolute ranking. | `nrw_carr_2024` | OGL | 2024 |
| 8 | A new sea wall and raised promenade on the central front opened on 9 October 2025. It protects 548 homes and 44 other buildings. Welsh Government paid 85 per cent of the building cost and the council 15. (In game: say "a new wall on the central front", not the cost in pounds.) | `wg_central_rhyl_defences` | OGL | 2025 |
| 9 | Denbighshire has the lowest median full-time pay of residents of the 22 councils (660 pounds a week, Wales 719) and the second highest share of homes at flood risk (43.5 per 100 households, Wales 21.8). Show as ranks, not pounds. | `nomis_ashe`, `statswales_flood` (via `la-indicators.json`) | OGL | 2025 |
| 10 | 7.4 per cent of Rhyl's working residents worked in hotels, cafes and food, against 5.2 per cent across Wales. Census day fell in lockdown, so treat as a rough guide. | `nomis_census_ts060a` | OGL | 2021 |

Supporting, not for the player: 13.0 per cent of Rhyl's residents aged 3 and over can speak Welsh (Wales 17.8), `nomis_census_ts033`, 2021.

### The hard choice

**Prompt:** "The new wall holds the sea for now. What does the town behind it need first?"

**Why it is hard:** The streets most at risk from the water and the streets in deepest hardship are close together but not the same streets. Money spent on one waits for the other.

| Option | Branch | Gain | Loss | Effects (suggested, tune) |
|---|---|---|---|---|
| **Good homes in the west end.** Buy up and repair the old guest houses and flats of the west end as homes for local rent, with a health and work team on the street. | homes | Fewer people in poor, cold, short-let rooms. Health and work in the poorest streets start to turn. | The harbour and river side stay as exposed as they are. Slow: years before it shows. | homes +, health +, risk flood 0 |
| **Raise the next stretch.** Defences on the river and harbour side, where the Clwyd meets the sea. | landscape | The next surge does not come in round the back of the new wall. Insurance and lending hold up. | Nothing changes for the people in Rhyl West. The walls need upkeep for ever. | risk flood -1, homes 0 |
| **Bring the front back to life.** Year-round things to do on the new promenade: events, a covered venue, small firms in empty seafront buildings. | made_here | Work on the front, and not only in August. Visitors spend in the town. | Much of the work is seasonal and low paid. Rents near the front rise and push the poorest further in. | work +, homes -, young_adults + small |

Grade ideas: homes option grades very well if `health-hub` is within reach; raise-the-stretch grades very well if a `coastal-surge` or `storm-winter` lands within the next two turns; the front grades well only with `frequent-trains` or `buses-meet-trains` on the coast line.

### Voice lines (written for the game, not quotes)

- "The water came up to the new wall and stopped. Round the back, by the harbour, nobody's so sure." (adapted from the Rhyl voice already in `game-design.md` 9.1)
- "They mended the prom first. Our landlord still hasn't mended the window."

### What a local would notice if we got it wrong

- **Kinmel Bay and Towyn are in Conwy, not Denbighshire.** The 1990 Towyn flood was in Conwy. The 2013 surge hit both, but the Rhyl figure (136 properties) is Rhyl's own.
- **The defences are in stretches.** The east front scheme (finished 2023) and the central front scheme (opened 2025) are separate, and Prestatyn has its own. Do not say "the whole town is protected now". The council's page says the east scheme protects 1,650 properties, while the contractor's page says 693: do not use either until checked.
- **Rhyl West is a real place with a real name and a lot of pride.** Show what people there do, not only the ranks. Avoid "worst" language; the ranks speak for themselves.
- Welsh name: Y Rhyl. The river is the Clwyd, the harbour is the Foryd. The Marine Lake, the SC2 water park and the Pavilion Theatre are on the front; the old Sun Centre closed. (Place names to check against OS Open Names before use.)

### Could not source

- Visitor numbers and spend for Rhyl (the usual STEAM figures are not open).
- The Shoreline Management Plan policy for the Rhyl frontage (I could not reach the policy statement; likely "hold the line", **to check**).
- How many properties are still at risk after the 2025 wall (would need the NRW Flood Map for Planning sea zones cut to Rhyl, which `build_place.py` could do).
- Count of homes in multiple occupation in Rhyl West (not in an open table I found).

## 2. Port Talbot

- **Council:** Neath Port Talbot, `W06000012` (in `authorities.yaml`; flags include `port`).
- **Template:** T3.
- **Offered by (suggestion):** projects `big-employer`, `cluster-roots`, `skills-college`; events `employer-leaves`, `work-changes`.
- **Small areas used:** the 25 LSOAs named Aberavon, Sandfields, Port Talbot, Tai-bach, Margam and Baglan in WIMD 2025 (listed in the build note at the end).

### Facts, stated as of November 2026

| # | Fact | Source id | Licence | Year |
|---|---|---|---|---|
| 1 | The last blast furnace at the steelworks closed on 30 September 2024, ending more than 100 years of making iron and steel from ore in the town. The works still runs, rolling and finishing steel. | `senedd_research_port_talbot` (date); "still runs" **to check** with an OGL source | see source table | 2024 |
| 2 | Up to 2,800 job losses were proposed across the company's UK sites when the plan was announced in January 2024, most of them at Port Talbot. The exact Port Talbot count is not in an open source I could reach. | `senedd_research_port_talbot` | see source table | 2024 |
| 3 | An electric arc furnace, which melts scrap steel with electricity, is being built on the site. The council approved it on 18 February 2025 and building began on 14 July 2025, backed by a UK Government grant. The company expects it to start late in 2027 or early in 2028. | `ukgov_port_talbot_eaf` (start date, grant); `senedd_research_port_talbot` (planning date) | OGL; see source table | 2025 |
| 4 | Freight through Port Talbot harbour fell from 6.7 million tonnes in 2023 to 2.6 million tonnes in 2024, mostly iron ore and coal for the works. That is the second lowest year since records began in 1975. | `wg_sea_transport` | OGL | 2023, 2024 |
| 5 | About 39,400 people live in the 25 small areas of Aberavon, Sandfields, Port Talbot, Tai-bach, Margam and Baglan. Seven of them are in the most deprived tenth in Wales; Sandfields West 2 ranks 39th of 1,917. | `nomis_census_ts007a`, `wimd_2025` | OGL | 2021, 2025 |
| 6 | Before the furnaces closed, 14.4 per cent of working residents in these areas worked in manufacturing, against 8.7 per cent across Wales. | `nomis_census_ts060a` | OGL | 2021 |
| 7 | Jobs based in Neath Port Talbot pay well: median full-time pay at workplaces there is 4th highest of the 22 councils. But there are few jobs for the number of people: 0.61 jobs per working-age resident, 18th of 22 (Wales 0.76). Show as ranks. | `nomis_ashe_workplace`, `nomis_jobs_density` | OGL | 2026, 2024 |
| 8 | NRW's register ranks Port Talbot 1st in Wales for river flood danger, both without defences and with them, and 8th for the sea without defences. | `nrw_carr_2024` | OGL | 2024 |
| 9 | Since 2000 part of Tai-bach and Margam has been an air quality management area for fine dust (PM10) from the works. It was still in force in the council's 2024 to 2029 action plan. | `wg_air_quality_npt` | check | 2000 to 2024 |

### The hard choice

**Prompt:** "The furnaces are cold and the new one will need fewer hands. What is the rest of the town's work for?"

**Why it is hard:** Each path backs a different kind of job. The big one pays best but may never come. The small ones come sooner but pay less. Giving land back to the town gives up work on it for good.

| Option | Branch | Gain | Loss | Effects (suggested, tune) |
|---|---|---|---|---|
| **A yard for the next big trade.** Make the deep-water harbour and spare works land ready to build and ship large parts for floating wind turbines at sea. | made_here | Skilled, well-paid work of the kind the works gave. Uses the harbour again. | Depends on orders decided far away. Years of building before the jobs. If the orders go elsewhere, little is left. | work + (late, wide spread), risk employer +1 |
| **Many small firms.** Clear and service plots for small manufacturers and repair firms, with training for steelworkers to move across. | made_here | Work comes sooner and in many places, so one closure cannot take it all. | Lower pay than the works. Slower to fill the gap. Needs `skills-college` to reach full strength. | work + (sooner), risk employer -1 |
| **Give the edge back to the town.** Clean the land nearest the houses and the beach for homes, dunes and a park between Sandfields and the works. | landscape | Cleaner air and a better place to live for the streets that lived next to the works for a century. | Less land for work for good. Cleaning old industrial land is slow and the cost is uncertain. | health +, nature +, work - |

Grade ideas: the yard grades very well only with `cluster-roots` working and a link to the coast line; small firms grade very well with `skills-college` in the council; the town edge grades well with `frequent-trains` on the Swansea Bay line.

Note for the designer: do **not** name the freeport, the transition board or its funds, or the company in options. These are current named schemes. Generic levers only: "a yard for wind", "plots for small firms", "training for steelworkers".

### Voice lines (written for the game, not quotes)

- "My grandfather, my father and me, all on the works. My son's asking what he's meant to do with that."
- "You can see the stars over Margam now. Funny thing to miss, the glow."

### What a local would notice if we got it wrong

- **"The steelworks closed" is wrong.** The blast furnaces closed. The works still employs people, rolls steel, and is building a new furnace. Say "the end of making steel from ore", not "closure".
- **No company spin and no "green steel" slogan.** The UK Government release says jobs were "secured", which it does not define. Do not repeat job numbers for the new furnace; none is in an open source.
- Aberavon (Aberafan) is the old town and the beach; Sandfields is the big estate by the sea; Tai-bach and Margam sit right under the works. The M4 runs on a raised road through the town between the houses and the works.
- Do not name well-known people from the town who are living.
- The town has lived with the dust and the noise for generations. Do not frame the air quality as only a loss or only a gain: people say both.

### Could not source

- Exact jobs lost at Port Talbot and jobs left (no open primary figure; press numbers vary from about 1,900 to 2,500).
- The area of the works and how much land, if any, the company will release. Nothing open says any land will be released; the options must stay hypothetical.
- Air quality after the closures (no post-2024 report found).
- Claimant count change in Port Talbot itself since 2024 (the Senedd article says the official counts stayed fairly flat; could be pulled from `nomis_claimant` at ward level).
- The closure of the coke ovens in 2024 (widely reported, **to check**).

## 3. Machynlleth

- **Council:** Powys, `W06000023`. Machynlleth is **not** yet in Powys's `towns` list in `authorities.yaml` (Newtown, Brecon, Llanidloes); add it if letters should name it.
- **Template:** T3.
- **Offered by (suggestion):** projects `frequent-trains`, `buses-meet-trains`, `welsh-school`; events `young-leave`, `surgery-closes`.
- **Small areas used:** LSOA W01000473 ("Machynlleth", roughly the town) and W01000442 ("Glantwymyn", the hill parishes to the east and north). The LSOA codes are the same in 2011 and 2021, so the two censuses compare.

### Facts

| # | Fact | Source id | Licence | Year |
|---|---|---|---|---|
| 1 | About 2,160 people live in the Machynlleth small area (2,157), down from 2,235 in 2011. | `nomis_census_ts007a`, `nomis_census_ks102` | OGL | 2011, 2021 |
| 2 | Young adults left and older people stayed: people aged 20 to 24 fell from 110 to 85, and the share aged 65 or over rose from 20.7 to 26.0 per cent. | `nomis_census_ts007a`, `nomis_census_ks102` | OGL | 2011, 2021 |
| 3 | 47.4 per cent of the town's residents aged 3 and over could speak Welsh in 2021, down from 51.6 per cent in 2011. In Glantwymyn it was 54.5, down from 57.8. | `nomis_census_ts033`, `nomis_census_ks207wa` | OGL | 2011, 2021 |
| 4 | Powys has the smallest share of people aged 20 to 34 of any council (13.4 per cent, Wales 18.2), the largest share aged 65 or over (29.6 per cent), and the most self-employed workers (24.0 per cent, Wales 11.2). | `nomis_mye`, `nomis_aps` (via `la-indicators.json`) | OGL | 2025, 2025 to 2026 |
| 5 | The town has the services; the hills round it do not. Glantwymyn ranks 29th of 1,917 for poor access to services, among the worst in Wales, while the town itself ranks 1,258th. | `wimd_2025_domains` | OGL | 2025 |
| 6 | A new bridge over the Dyfi on the A487 opened in February 2024. The old 18th century bridge often closed when the river flooded, with a diversion of up to 30 miles. | `wg_dyfi_bridge` | OGL | 2024 |
| 7 | In the summer 2026 timetable, 12 trains a weekday leave Machynlleth towards Shrewsbury, every other one running on to Birmingham. From 19 October 2026 coast trains start and end at Machynlleth while new trains come in, so coast passengers change here. Winter service is thinner: **check** the current timetable before showing a number. | `tfw_cambrian_timetable` | check | 2026 |
| 8 | NRW's register puts the town low for flooding (878th for rivers with defences). The water problem was the road, not the streets. | `nrw_carr_2024` | OGL | 2024 |

Supporting: Machynlleth's working residents work more in public administration (9.9 per cent), education (9.1) and hotels and food (9.0, Wales 5.2) than the Welsh average; `nomis_census_ts060a`, 2021, lockdown caveat.

History, **to check** before showing (no open primary record reached): a Wednesday street market under a charter of 1291; Owain Glyndŵr held a parliament here in 1404 (the present Parliament House building is later, possibly 16th century; check the Cadw listing in `cadw_listed_buildings` or the Coflein record); the Dyfi valley is a UNESCO biosphere (check UNESCO).

### The hard choice

**Prompt:** "The trains run, the bridge is dry, and the young still go. What would make them stay?"

**Why it is hard:** Each answer keeps a different group. Homes keep families but bring no work. Work brings people, not all of them Welsh speakers and not all of them local. Buses keep the hills joined to the town but do not keep the young.

| Option | Branch | Gain | Loss | Effects (suggested, tune) |
|---|---|---|---|---|
| **Homes for young locals.** Small homes in and near the town for local rent or shared ownership, with a rule that they go to people with ties here. | homes | Young couples can stay in the town they grew up in. Welsh keeps its footing in the school and on the street. | No new work: they still drive or take the train to it. Few homes for the money. | homes +, welsh +, young_adults + |
| **Work by the station.** A college outpost and shared workspace with fast internet beside the station, open to firms and remote workers. | made_here | Skilled work without leaving. Trains bring students and staff in from the coast and Aberystwyth. | Draws people from outside faster than it keeps locals. Rents rise. Welsh on the street may thin. | work +, young_adults +, homes -, welsh - small |
| **Buses that come when called.** A booked minibus linking the hill farms and villages to the town, the surgery and every train. | valleys | Older people in the hills can reach the doctor, the shop and the train. Fewer give up and move. | It does little to keep the young. It costs every year, for ever. | health +, climate + small, young_adults 0 |

Grade ideas: homes grade very well with `welsh-school` in Powys; work by the station grades very well with `frequent-trains` on the Cambrian line; the bus grades well with `buses-meet-trains` and only adequately alone.

### Voice lines (written for the game, not quotes)

- "Half my year went to Cardiff after school. The other half went to Aber. Two of us came back, and we're both living with our mams."
- "New bridge is lovely. Took them long enough. Now get me a bus up the valley that isn't Tuesday."

### What a local would notice if we got it wrong

- **"Ancient capital of Wales" is a claim, not a fact.** Machynlleth was never declared a capital. Say "where Glyndŵr held his parliament in 1404", once checked.
- **The line splits at Dovey Junction (Cyffordd Dyfi), not at Machynlleth.** Machynlleth is the last main station before the split.
- Machynlleth is in Powys but looks west and north: the shops, school and trains serve people from Gwynedd (Corris, Aberdyfi side) and Ceredigion too. The Centre for Alternative Technology just north is across the border in Gwynedd.
- Locals call it Mach. The clock tower on Maengwyn Street is the landmark. (Check names on OS Open Names.)
- Language of the secondary school has been a live local argument; do not depict any decision about it.

### Could not source

- Machynlleth station passenger numbers (ORR station usage is open but I did not pull the table).
- Winter 2026 train frequency; the summer extras are not year-round.
- Whether the old Dyfi bridge has reopened to walkers and cyclists.
- Distance in minutes to the nearest hospital (could use the WIMD 2025 access indicators at LSOA level, `statswales_wimd2025_lsoa`).
- Second homes and holiday lets around Machynlleth (Powys council tax data is not open below council level).

## 4. Bethesda (adapting v1 for the board)

- **Council:** Gwynedd, `W06000002` (in `authorities.yaml`, flag `slate`).
- **Template:** T2 "Who is it for", reused whole, exactly as the Rhondda reuses T1. Following `rhondda.yaml`, the board file would be:

```yaml
id: bethesda
council: W06000002
template: T2
v1_place: bethesda
scales: social-homes
offered_by:
  projects: [social-homes, welsh-school, community-energy]
  events: [buying-rush, fewer-hear-welsh]
sources: [census-2021-welsh, language-housing, nomis_census_ts033, nomis_census_ks207wa, wimd_2025, nrw_carr_2024]
confidence: low
```

### What carries over unchanged

The dilemma (who the quarry is for now), the ten options, three picks, three tests (Aros, Iaith, Pwysau), the trend penalties and the voice line already in `game-design.md` 9.1. It is the most designed visit in the game and it fits the North West board as it is.

### What has to change

1. **Trigger cards are v1 cards.** `trigger_cards` names `homes-for-locals`, `community-owned-energy`, `tourism-pays-its-way`, `welsh-medium-childcare`. On the board these map to projects: `social-homes`, `community-energy`, (no tourism project exists), `welsh-school`.
2. **Two options depend on v1 cards that do not exist on the board.** Option 5 (visitor levy trust) `requires_card: tourism-pays-its-way`, and option 8 (quarry workshops) `half_without_card: skills-and-apprenticeships`. Suggest: option 8 maps to the `skills-college` project in Gwynedd; option 5 needs either a board project or a rule card, or it should be dropped for the board. Designer's call.
3. **Curveballs are v1 curveballs.** `price-of-a-home`, `wet-decade`, `language-at-the-edge` need mapping to board futures and events (`rents-rise` or `buying-rush`, `storm-winter`, `fewer-hear-welsh`).
4. **WIMD 2019 to 2025.** `bethesda.json` carries WIMD 2019 ranks (1,909 areas). The 2025 layer has names and the same field shape; `build_place.py` fetches `inspire-wg:wimd2019_overall` and should switch to `geonode:wimd2025_overall`.
5. **Facts marked "to check" can now be sourced or corrected.** See below. One v1 line needs a wording fix.

### Facts

| # | Fact | Source id | Licence | Year |
|---|---|---|---|---|
| 1 | Welsh speakers aged 3 and over: Gogledd Bethesda 74.1 per cent (79.3 in 2011), De Bethesda 81.2 (83.0), Gerlan a Rachub 73.2 (73.7). Across the three, 75.6 per cent, down from 77.5. Wales 17.8. | `nomis_census_ts033`, `nomis_census_ks207wa` | OGL | 2011, 2021 |
| 2 | Gwynedd has more second homes than any other council: 8.5 per 100 homes (Wales 1.8). | `statswales_ct1` (via `la-indicators.json`) | OGL | 2026 to 2027 |
| 3 | WIMD 2025: Gogledd Bethesda ranks 577th of 1,917 (fourth tenth), De Bethesda 952nd, Gerlan a Rachub 1,127th. Not among the poorest in Wales, but Gogledd Bethesda is in the poorer half for income and employment. | `wimd_2025`, `wimd_2025_domains` | OGL | 2025 |
| 4 | NRW's register ranks Bethesda 59th in Wales for river flood danger with defences. The NRW Flood Map for Planning puts short stretches of the A5 at the south end of the town, near the Ogwen, in Flood Zones 2 and 3 (from `bethesda.json`). | `nrw_carr_2024`, NRW flood zones | OGL | 2024 |
| 5 | Penrhyn quarry was at one time the largest slate quarry in the world, with about 3,000 men by the middle of the 19th century. It still works today. | `gwynedd_llechi` (check licence; prefer Cadw or Coflein) | check | 2025 |
| 6 | The Great Strike at Penrhyn lasted from November 1900 to November 1903 and split the valley. | `gwynedd_llechi` | check | 2025 |
| 7 | The quarry, Bethesda and the Ogwen valley down to Port Penrhyn are one of the parts of the Slate Landscape of Northwest Wales World Heritage Site, inscribed in 2021. | UNESCO nomination documents (whc.unesco.org/document/218087); Gwynedd Council WHS page | UNESCO: check; facts only | 2021 |
| 8 | Ships still carry Penrhyn slate aggregate from Port Penrhyn, which supports v1 option 7 (rework the tips for aggregate) as a real trade, not an invented one. | `gwynedd_llechi` | check | 2025 |

### Voice lines (written for the game, not quotes)

- "Three houses on our street went in a fortnight. None of them to anyone who'll be here in January." (already in `game-design.md` 9.1)
- "My taid's taid was out for the whole three years of the strike. You don't forget that in a street this size."

### What a local would notice if we got it wrong

- **v1 says "a lockout from 1900 to 1903".** Locally it is the Great Strike (Y Streic Fawr). Historians argue over strike or lockout; the community's own word is strike. Change the history line to "the Great Strike of 1900 to 1903".
- **The quarry is not dead.** v1 says it "was once the biggest". True, but it still works and sells slate today. Do not write it as a ruin.
- Locals call the town Pesda. Bethesda takes its name from the chapel. The quarry owners' fortune came partly from Jamaican sugar plantations worked by enslaved people; Gwynedd's own heritage site says so, and some locals will expect it acknowledged.
- The visitor attraction at the quarry is a zip line run by a company; keep it generic ("visitors have come to the quarry").
- v1 says "The Ogwen floods the lower High Street". The flood map supports some risk at the south end where the A5 meets the river, but "lower High Street" is my best reading, not checked. Ask a local or check the NRW map before keeping the phrase.

### Could not source

- Second homes and holiday lets for the Ogwen valley alone (Gwynedd's council tax data is not open below council level; v1's data note implies it was used, but `bethesda.json` has no such layer).
- An OGL primary source for the quarry's history (Llechi Cymru is Gwynedd Council copyright; Cadw or Coflein records would be better).
- House prices for Bethesda alone (ONS small-area house price statistics exist at MSOA level, Gwynedd 003; not pulled).

## Build note: small areas used

- Rhyl (16): W01000226 to W01000241, all LSOAs named "Rhyl ..." in WIMD 2025.
- Port Talbot (25): every LSOA named Aberavon 1 to 4, Sandfields East 1 to 4, Sandfields West 1 to 4, Port Talbot 1 to 4, Tai-bach 1 to 3, Margam 1 and 2, Baglan 1 to 4. Recompute from the WIMD 2025 layer names; Cymer (Neath Port Talbot) is not Port Talbot town and is excluded.
- Machynlleth: W01000473 (town), W01000442 (Glantwymyn).
- Bethesda: W01000097 (Gogledd Bethesda), W01000096 (De Bethesda), W01000071 (Gerlan a Rachub).
- Nomis queries take LSOA GSS codes directly in `geography=`. Census 2011 tables need `rural_urban=0`.
