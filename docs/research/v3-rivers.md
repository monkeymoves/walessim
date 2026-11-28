# v3 rivers: checking the river hops for All Wales

Checked 28 November 2026 for `docs/design/v3-wales.md` section 3 ("Rivers"). Each hop is "upstream council, then downstream council" on one named river, in flow order. A hop is a direction, not a flow figure.

## Sources and method

| Key | Source | What it gave |
|---|---|---|
| R | `os_open_rivers`: OS Open Rivers, GeoPackage (`oprvrs_gpkg_gb.zip`, md5 dd777b3f966fb814ae2352d9c2076cd4), downloaded 28 November 2026 from the OS Data Hub to `pipeline/raw/rivers/`. OS OpenData, OGL v3.0, "Contains OS data © Crown copyright and database rights 2026" | The river lines, their names and their digitised flow direction |
| B | `ons_lad_boundaries`, newer vintage: ONS Local Authority Districts December 2024, full resolution clipped (BFC), EPSG:27700, from the ONS Open Geography Portal feature service, OGL v3.0 | Which council each 100 m of river lies in |
| C | `nrw_catchments`, as data: NRW WFD cycle 3 management and operational catchments (`geonode:nrw_wfd_management_catchments_c3`, `geonode:nrw_wfd_operational_catchments_c3`) from DataMapWales WFS, OGL v3.0 | Share of each catchment's area in each council, a second check that the river drains more than one council |
| G | Gazetteer: towns on each stretch, read from the grid positions of the traced line | The towns named in the tables. Not checked against OS Open Names, so treat a town name as a pointer, not a source |

Method (R with B). For each named river (OS name or its alternative, for example "Afon Gwy" / "River Wye"), canals left out, the main stem was walked downstream from its furthest head, choosing the longer branch at each split and jumping the small gaps OS Open Rivers has at lakes and weirs (Llyn Tegid, Pontsticill, Chester weir). The line was sampled every 100 m and each point placed in a council (a point within 150 m of a boundary counts as on it). A stretch where the line keeps swapping between two councils is the river acting as the boundary, written "border" below. Kilometres are along the OS line and rounded. The tracing script was a throwaway in the session scratchpad, not kept in the repo; the steps above are enough to rebuild it as a pipeline check.

Verdicts: **confirmed** (the hop is real as written), **corrected** (the design row was wrong or incomplete, the fix is given), **weak case** (the river is mainly a shared boundary, so "upstream" is thin; use only if the board needs it).

## Design rows that were wrong or incomplete

1. **Dee**: "Wrexham, Flintshire" is not a direct hop. Between them the Dee is the Wrexham and Cheshire West and Chester boundary for about 17 km (Holt and Farndon), then wholly in England for about 14 km (Chester), and only enters Flintshire at Saltney. Write it Wrexham, then the Cheshire West and Chester stub, then Flintshire.
2. **Tywi**: not inside one council. Its top 10 to 13 km is the Ceredigion and Powys boundary, down into Llyn Brianne; it is in Carmarthenshire only from the dam. Weak case, so it can still make no link, but the claim in the design is wrong.
3. **Dyfi**: the last hop is not straight to "the Gwynedd and Ceredigion border". For about 11 km below Machynlleth the Dyfi is the Gwynedd and Powys boundary; only then does Ceredigion take the south bank (Glandyfi), and the estuary is Gwynedd (Aberdyfi) against Ceredigion (Ynyslas).
4. **Elwy and Clwyd**: the hop is on the Elwy only. The Clwyd is wholly in Denbighshire; only its mouth (Foryd, Rhyl against Kinmel Bay) touches Conwy.
5. **Wye**: right as written, but the lower Wye (Redbrook to Chepstow, about 26 km) is the Monmouthshire and Forest of Dean boundary, so the Forest of Dean is a second downstream bank, not a further hop.

Every other row was confirmed.

## Dee (Afon Dyfrdwy)

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Gwynedd to Denbighshire | Rises below Dduallt, Llanuwchllyn, Llyn Tegid at Bala, Llandderfel (Gwynedd, about 24 km plus the lake); 1 km of border, then Llandrillo, Corwen, Carrog (Denbighshire) | R, B, C (Dee: Gwynedd 17.5%, Denbighshire 17.5%; Dee Upper above Alwen: Gwynedd 79%, Denbighshire 19%) | Confirmed |
| Denbighshire to Wrexham | Corwen to Llangollen in Denbighshire (about 40 km); 2 km of border at Trevor and Froncysyllte (Pontcysyllte); Cefn Mawr and Newbridge in Wrexham | R, B, C (Dee Middle Ceiriog to Alwen: Denbighshire 76%, Wrexham 24%) | Confirmed |
| Wrexham to Cheshire West and Chester (stub) | Wrexham about 34 km (Erbistock, Overton, Bangor-on-Dee), with 4 km as the Wrexham and Shropshire boundary above Erbistock; then about 17 km as the Wrexham and Cheshire West boundary (Holt against Farndon) down to Aldford; then Chester, wholly in England, about 14 km | R, B, C (Dee Lower Chester Weir to Ceiriog: Wrexham 59%, Cheshire West 26%) | Corrected (new hop) |
| Cheshire West and Chester (stub) to Flintshire | Enters Flintshire at Saltney; the canalised Dee through Queensferry, Shotton and Connah's Quay (about 14 km), then the estuary with Flint and Bagillt on the Flintshire shore and the Wirral opposite | R, B, C (Dee Estuary: Flintshire 97%) | Corrected (replaces a direct Wrexham to Flintshire hop) |

## Elwy and Clwyd

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Elwy: Conwy to Denbighshire | Rises above Llangernyw; Llanfair Talhaiarn (Conwy, 17.5 km); 6 km as the Conwy and Denbighshire boundary; then Denbighshire 9 km, past St Asaph to the Clwyd near Rhuddlan | R, B, C (Elwy: Conwy 91%, Denbighshire 9%) | Confirmed |
| Clwyd: Denbighshire to Conwy | Wholly Denbighshire for 57 km (Ruthin, below Denbigh, St Asaph, Rhuddlan); the last 3.5 km, the Foryd, has Rhyl (Denbighshire) on one bank and Kinmel Bay (Conwy) on the other | R, B, C (Clwyd Upper: Denbighshire 99.9%) | Weak case: no link. Flooding at Kinmel Bay is from the sea |

## Severn (Afon Hafren)

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Powys to Shropshire (stub) | Rises on Pumlumon; Llanidloes, Caersws, Newtown, Welshpool (Powys, about 100 km); half a kilometre of border at the Vyrnwy confluence near Crew Green; then Shropshire (Shrewsbury) | R, B, C (Severn Uplands: Powys 71%, Shropshire 28%) | Confirmed |
| Tributaries, same direction | Vyrnwy: Powys 50 km, then the Powys and Shropshire boundary for its last 16 km to the Severn. Tanat: Powys 27 km (Llangynog, Llanrhaeadr-ym-Mochnant), then Shropshire | R, B | Confirmed (adds nothing new) |

## Wye (Afon Gwy)

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Powys to Herefordshire (stub) | Rises on Pumlumon (Powys); Llangurig, Rhayader, Builth Wells, Glasbury (Powys, 88 km); 5 km of border at Hay-on-Wye; then Herefordshire 98 km (Hereford, Ross-on-Wye) | R, B, C (Wye: Powys 44.9%, Herefordshire 42.2%) | Confirmed |
| Herefordshire (stub) to Monmouthshire | A short Herefordshire and Forest of Dean border near Goodrich; Monmouthshire 7 km at Monmouth, where the Monnow joins | R, B, C (Wye: Monmouthshire 9.3%) | Confirmed |
| Monmouthshire and Forest of Dean, shared | About 26 km as the Monmouthshire and Forest of Dean boundary: Redbrook, Tintern, Chepstow, then the Severn estuary | R, B, C (lower Wye operational catchment: Forest of Dean 54%, Monmouthshire 45%) | Weak case: shared bank, no further hop |
| Tributaries, same direction | Lugg: Powys to Herefordshire near Presteigne (23 km in Powys). Arrow: Powys to Herefordshire above Kington (12 km in Powys). Monnow: Herefordshire, then the Herefordshire and Monmouthshire boundary (Skenfrith), then Monmouthshire at Monmouth | R, B, C (Monnow: Monmouthshire 64.5%, Herefordshire 25.2%, Powys 10.3%) | Confirmed (adds nothing new) |

## Usk (Afon Wysg)

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Carmarthenshire to Powys | Rises on the Black Mountain; about 1 km of the head and the Usk Reservoir sit on the Carmarthenshire and Powys boundary | R, B, C (Usk above Brecon: Powys 98%, Carmarthenshire 2%) | Weak case: no link |
| Powys to Monmouthshire | Powys about 55 km: Trecastle, Sennybridge, Brecon, Talybont-on-Usk, Crickhowell; 2.6 km of border at Glangrwyney; then Monmouthshire | R, B, C (Usk Brecon to Abergavenny: Powys 74%, Monmouthshire 23%) | Confirmed |
| Monmouthshire to Newport | Abergavenny and Usk town (Monmouthshire, 37 km); 7 km as the Monmouthshire and Newport boundary; then Caerleon and Newport (9 km) | R, B, C (Usk below Abergavenny: Monmouthshire 82%, Newport 12%) | Confirmed (existing row) |

The existing `links.yaml` comment ("through Abergavenny and Usk") leaves out Powys; the Usk spends more of its length in Powys than anywhere else.

## Taff (Taf)

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Powys to Merthyr Tydfil (Taf Fawr) | Rises below Pen y Fan; Beacons and Cantref reservoirs (Powys, about 3 km); about 5 km past Llwyn-on Reservoir where the line runs along the Powys, Rhondda Cynon Taf and Merthyr Tydfil boundaries; then Merthyr Tydfil to Cefn Coed | R, B, C (operational catchment named "Taff DS Cynon" in the NRW layer: Merthyr Tydfil 56%, Powys 29%, Rhondda Cynon Taf 9%) | Confirmed (new hop) |
| Powys to Merthyr Tydfil (Taf Fechan) | Neuadd reservoirs and Pentwyn (Powys); Pontsticill Reservoir (a lake gap in OS lines); Merthyr Tydfil from the Pontsticill dam, 7 km to Cefn Coed | R, B | Confirmed (same hop) |
| Merthyr Tydfil to Rhondda Cynon Taf | Cefn Coed, Merthyr, Troed-y-rhiw, Aberfan, Merthyr Vale (16 km); enters Rhondda Cynon Taf just below Quakers Yard, then Abercynon and Pontypridd | R, B | Confirmed (existing row) |
| Rhondda Cynon Taf to Cardiff | Pontypridd, Treforest, Nantgarw (16 km); 1.4 km of border at Taff's Well; then Radyr, Llandaff, the city, Cardiff Bay | R, B, C (Taff US Cynon: Cardiff 52%, Rhondda Cynon Taf 40%) | Confirmed (existing row) |

The existing comment ("Taf Fawr and Taf Fechan meet at Cefn Coed") is right but both head streams rise in Powys, so Powys to Merthyr Tydfil is a real hop on All Wales. Taf Fawr only brushes Rhondda Cynon Taf at Llwyn-on: no link there.

## Tawe

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Powys to Neath Port Talbot | Rises at Llyn y Fan Fawr; Craig-y-nos, Abercraf, Ystradgynlais (Powys, 21 km); enters Neath Port Talbot at Ystalyfera | R, B, C (Tawe: Powys 44.8%, Neath Port Talbot 27%, Swansea 19.9%) | Confirmed |
| Neath Port Talbot to Swansea | Ystalyfera, Godre'r-graig, Pontardawe (9.5 km); 0.7 km of border; then Clydach, Morriston, Swansea (14.5 km) | R, B | Confirmed |

Its tributary the Twrch is a boundary river (Carmarthenshire, Powys, Neath Port Talbot) to Ystalyfera: no link.

## Neath (Afon Nedd)

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Powys to Neath Port Talbot | Powys 10 km to Pontneddfechan; 2 km of border; then Glynneath, Resolven, Aberdulais, Neath, Briton Ferry (27 km) to Swansea Bay | R, B, C (Neath: Neath Port Talbot 60.8%, Powys 31.6%, Rhondda Cynon Taf 7.1%) | Confirmed |

The Mellte (Ystradfellte, Powys) ends on the Powys and Rhondda Cynon Taf boundary near Pontneddfechan: no link to Rhondda Cynon Taf.

## Taf (west)

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Pembrokeshire to Carmarthenshire | Rises in the Preseli hills near Crymych (Pembrokeshire, 6 km); 4 km of border near Glandwr and Llanglydwen; Carmarthenshire 14 km; 5 km more of border above Whitland; then Whitland, St Clears, Laugharne (19 km) and the estuary | R, B, C (Taf: Carmarthenshire 83%, Pembrokeshire 17%) | Confirmed |

## Dyfi (River Dovey)

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Gwynedd to Powys | Rises below Aran Fawddwy; Llanymawddwy, Dinas Mawddwy, Mallwyd (Gwynedd, 16 km); 3.5 km of border; then Cemmaes, Glantwymyn, Machynlleth (Powys, 15 km) | R, B, C (Dyfi Upper: Powys 62%, Gwynedd 38%) | Confirmed |
| Powys to Gwynedd, then Gwynedd and Ceredigion | Below the Dyfi bridge at Machynlleth, about 11 km as the Gwynedd (Pennal) and Powys (Derwenlas) boundary; Ceredigion takes the south bank at Glandyfi; the estuary has Aberdyfi (Gwynedd) against Ynyslas and Borth (Ceredigion) | R, B, C (Dyfi Lower: Powys 43.5%, Ceredigion 33.5%, Gwynedd 23%) | Corrected (weak case: a shared lower river) |

## Teifi

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Ceredigion to Carmarthenshire | Rises at Llyn Teifi; Pontrhydfendigaid, Tregaron (Ceredigion, 43 km, all of the upper river); from Lampeter about 50 km as the Ceredigion and Carmarthenshire boundary: Llanybydder and Newcastle Emlyn on the Carmarthenshire bank, Llandysul and Adpar on the Ceredigion bank | R, B, C (Teifi: Ceredigion 66.9%, Carmarthenshire 23.6%, Pembrokeshire 9.5%) | Weak case. Defensible if needed: the upper river is wholly Ceredigion and two Carmarthenshire towns sit on the bank |
| Ceredigion and Carmarthenshire to Pembrokeshire | About 21 km from Cenarth where Pembrokeshire takes the south bank (Cilgerran); Cardigan (Ceredigion, 3 km); the estuary has St Dogmaels (Pembrokeshire) opposite | R, B | Weak case: no link |

## Loughor (Afon Llwchwr)

| Hop | Towns that show it | Source | Verdict |
|---|---|---|---|
| Carmarthenshire to Swansea | Rises at Llygad Llwchwr; Carmarthenshire 11 km to below Ammanford; then about 20 km as the Carmarthenshire and Swansea boundary: Pontarddulais and Loughor on the Swansea bank, Hendy and Bynea on the Carmarthenshire bank; then the Burry Inlet | R, B, C (Loughor: Carmarthenshire 65.3%, Swansea 31.7%, Neath Port Talbot 2.8%) | Weak case. Defensible if needed: the upper river is wholly Carmarthenshire |

Its tributary the Amman is the Carmarthenshire and Neath Port Talbot boundary at Brynamman and Gwaun-Cae-Gurwen: no link.

## South East rows already in `model/board/links.yaml` (read only)

| River and hop | What the trace shows | Source | Verdict |
|---|---|---|---|
| Taff: Merthyr Tydfil to Rhondda Cynon Taf; Rhondda Cynon Taf to Cardiff | As in the Taff table | R, B | Confirmed |
| Rhymney: Caerphilly to Cardiff | Head 1.6 km on the Powys side above Rhymney town; Caerphilly 37 km (Rhymney, Bargoed, Ystrad Mynach, Bedwas, Machen); about 7 km below Machen as the Caerphilly and Newport boundary (Michaelston-y-Fedw is Newport); Cardiff 8 km (Llanrumney, Rumney) to the sea | R, B, C (Rhymney: Caerphilly 70.6%, Cardiff 20.1%, Newport 4.6%) | Confirmed. The comment could mention the Newport bank |
| Ebbw: Blaenau Gwent to Caerphilly; Caerphilly to Newport | Ebbw Vale and Cwm (Blaenau Gwent, 15 km, Abertillery is on the Ebbw Fach, which joins at Aberbeeg in Blaenau Gwent); Crumlin, Newbridge, Abercarn, Risca (Caerphilly, 14 km); Rogerstone and Newport (11 km) | R, B, C (Ebbw Sirhowy: Caerphilly 43.8%, Blaenau Gwent 41.1%) | Confirmed. The Sirhowy (Tredegar to Blackwood) gives the same Blaenau Gwent to Caerphilly hop |
| Afon Lwyd: Torfaen to Newport | Blaenavon, Pontypool, Cwmbran (Torfaen, about 24 km over two OS pieces); 1.2 km of border; Caerleon (Newport, 3.7 km) to the Usk | R, B, C (Llwyd: Torfaen 91.5%) | Confirmed |
| Usk: Monmouthshire to Newport | As in the Usk table | R, B | Confirmed |
| Ely: Rhondda Cynon Taf to Vale of Glamorgan; Vale of Glamorgan to Cardiff | Tonyrefail, Llantrisant, Pontyclun (Rhondda Cynon Taf, 18 km); Peterston-super-Ely (Vale, 11.5 km); St Fagans and Ely (Cardiff, 6.5 km); the last 5 km, Leckwith to Cardiff Bay, is the Cardiff and Vale boundary (Penarth on the Vale bank) | R, B, C (Ely: Rhondda Cynon Taf 48.9%, Vale 28.3%, Cardiff 22.8%) | Confirmed. The comment's "to Cardiff Bay" is right; the mouth is shared with Penarth |
| Ogmore: Bridgend to Vale of Glamorgan | Ogmore Vale, Blackmill, Bridgend (Bridgend, 15 km); the last 2.4 km is the Bridgend and Vale boundary to Ogmore-by-Sea. The Ewenny joins at Ogmore Castle after 6.6 km as the same boundary | R, B, C (Ogmore: Bridgend 70%, Vale 23.5%) | Weak case, as the comment says |

## Rivers that make links the design table does not list

| River and hop | What the trace shows | Source | Verdict |
|---|---|---|---|
| Alyn (Afon Alun): Denbighshire to Flintshire; Flintshire to Wrexham | Llanarmon-yn-Iâl and Loggerheads (Denbighshire, 19 km); Mold, Caergwrle and Hope (Flintshire, 22 km); 1 km of border; Rossett (Wrexham, 14 km) to the Dee on the English border | R, B, C (Alyn: Flintshire 54.5%, Denbighshire 30%, Wrexham 15.5%) | Confirmed. The strongest new candidate for the north east |
| Ceiriog: Wrexham to Shropshire | Llanarmon Dyffryn Ceiriog and Glyn Ceiriog (Wrexham, 23 km), then the Wrexham and Shropshire boundary at Chirk to the Dee | R, B | Weak case |
| Teme: Powys and Shropshire | Rises in Powys; about 20 of its first 37 km are the Powys and Shropshire boundary (Knighton), then into England | R, B, C (Teme: Powys 6.8%) | Weak case |

## Rivers inside one council (no link)

| River | Council | Note | Source |
|---|---|---|---|
| Conwy | Conwy | 47.5 km, both banks of the estuary too (Conwy town and Deganwy) | R, B, C (Conwy Upper 98%, Conwy Lower 99.6%) |
| Clwyd | Denbighshire | Only the mouth touches Conwy (see above) | R, B, C |
| Western Cleddau, Eastern Cleddau | Pembrokeshire | Eastern Cleddau touches Carmarthenshire for 0.4 km near its head | R, B, C (98 to 99.9%) |
| Afan (River Avan) | Neath Port Talbot | 23 km | R, B, C (99%) |
| Rhondda, Cynon | Rhondda Cynon Taf | | R, B |
| Ebbw Fach | Blaenau Gwent | | R, B |
| Ithon, Irfon | Powys | | R, B, C (99 to 100%) |
| Mawddach, Glaslyn, Ogwen, Seiont | Gwynedd | | R, B |
| Rheidol, Aeron, Ystwyth | Ceredigion | The Ystwyth's first 2 km are on the Powys side | R, B |
| Cothi, Gwendraeth Fawr | Carmarthenshire | The Cothi rises on the Ceredigion boundary | R, B |
| Thaw | Vale of Glamorgan | | R, B |
| Tywi | Carmarthenshire, mostly | Corrected: its top 10 to 13 km is the Ceredigion and Powys boundary into Llyn Brianne. Weak case, no link | R, B, C (Tywi: Carmarthenshire 87.6%, Ceredigion 8.2%, Powys 4.1%) |
| Kenfig (Afon Cynffig), Ewenny | Boundary rivers | Kenfig: Neath Port Talbot and Bridgend; Ewenny: Bridgend and Vale. No link | R, B |

Anglesey has no river that leaves the island, as the design says.

## Follow-ups for the data owners (not done here)

- `model/sources.yaml`: `os_open_rivers` and `nrw_catchments` notes still say "not yet checked". The NRW entry could name the DataMapWales layers used here. Boundaries used were the December 2024 BFC set, newer than the `ons_lad_boundaries` entry (December 2023 BGC); Welsh council codes did not change between them.
- `docs/data-licences.md`: the OS Open Rivers download carries the OS OpenData licence (OGL v3.0) with the attribution line quoted above.
