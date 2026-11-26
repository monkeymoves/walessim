# SoNaRR 2025 DPSIR graph (sonarr-dpsir.json)

Copied unchanged from `WALES/prototype/model.json`. It is the typed causal graph behind the existing Fuzzy Cognitive Map (FCM) prototype (`WALES/prototype/fcm.js`, design notes in `WALES/docs/blueprint.md` section 3). Source: State of Natural Resources Report 2025 (Natural Resources Wales), extracted from the 8 Power BI portal spreadsheets. This file is for porting the engine to TypeScript.

## File shape

```
{ "meta": {...}, "nodes": [42 nodes], "edges": [162 edges] }
```

`meta`: `title`, `source`, `sign_convention` ("driver->pressure +, pressure->state -, state->service +"), `weight_note`, `default_weight` (0.5).

## Nodes

Fields on every node: `id` (string, `<kind-prefix>:<snake_case>`), `label`, `kind`, `initial` (number 0 to 1).

`kind` values (DPSIR stages, left to right):

| kind | count | meaning |
|---|---|---|
| `driver` | 5 | Direct drivers. Exogenous: no incoming edges, held at their input value by the engine. |
| `pressure` | 23 | Pressures. Extra fields: `trend_counts` (object mapping SoNaRR trend label to number of assessment rows) and `dominant_trend` (`deteriorating`, `mixed picture`, `improving` or `not available`). Metadata only, not used by the update rule. |
| `state_ecosystem` | 8 | Ecosystem condition. Extra field `n_state_rows` (number of SoNaRR assessment rows behind the value). |
| `state_resource` | 3 | Natural resource condition (air, soil, water). Extra field `n_state_rows`. |
| `service` | 3 | Ecosystem service types (cultural, provisioning, regulating). |

### How initial values are encoded

- State nodes (`state_*`): `initial` is the SoNaRR "Assessment of state" (Low/Medium/High) aggregated over the assessment rows into a number between 0 and 1 (higher = better condition). Values are data, e.g. urban 0.3, woodlands 0.575.
- Drivers and pressures: a flat placeholder, 0.6 for all 28 (these are pressure intensity inputs, not SoNaRR measurements).
- Services: a flat placeholder 0.5 for all 3.
- The engine calibrates a per-node bias so that with every node at its `initial` value the model output reproduces `initial` exactly (see below). The baseline is the data; interventions show deviation from it.

## Edges

Fields on every edge: `source`, `target` (node ids), `sign` (+1 or -1), `weight`, `confidence`, `provenance` (human-readable "A -> B" text), `kind`, `support`.

| field | encoding |
|---|---|
| `sign` | By kind: `driver_pressure` +1, `pressure_state` -1, `state_service` +1. Documented as user-overridable. |
| `weight` | 0 to 1 magnitude. A uniform prior of 0.5 for all `driver_pressure` (23) and `pressure_state` (115) edges, because SoNaRR asserts a link but publishes no strength. For `state_service` edges it derives from SoNaRR "Relative importance": 0.8 (10 edges), 0.65 (5), 0.5 (1), 0.4 (1), 0.3 (7). The engine uses the signed weight `sign * weight`. |
| `confidence` | 0.3 to 0.9, from SoNaRR "Confidence assessment overall" (apparently 0.9 high, 0.6 medium, 0.3 low; one edge is 0.5; mapping inferred from the values, check the extractor in the WALES repo). Not used in the point update; it sets the spread of the uncertainty ensemble (`spread = (1 - confidence) * scale`). |
| `kind` | `driver_pressure` (23), `pressure_state` (115), `state_service` (24). |
| `support` | Integer 1 to 33: how many SoNaRR assessment rows assert this link. Informational (evidence count). |

The graph has no feedback cycles (effectively a DAG), so the engine converges in a few iterations.

## Engine summary (for the TypeScript port)

Reference implementation: `WALES/prototype/fcm.js` (about 140 lines, dependency free, exposes `compile`, `run`, `baseline`, `leverage`, `ensembleEdge`, `ensembleStates`). Unit tests in `WALES/scripts/test_fcm.js`.

1. `compile(model, lambda = 4)`: index nodes by id; dense matrix `W[i][j] += sign * weight` for each edge i to j; per-target L1 normalisation `Wn[i][j] = W[i][j] / sum_i |W[i][j]|`; `inAbs[j]` is that denominator; `bias[j] = logit(clamp(initial[j], 0.02, 0.98)) - lambda * sum_i Wn[i][j] * initial[i]` (zero for exogenous nodes).
2. `run(compiled, opts)`: start from `initial` (or `opts.start`), apply clamps. Each iteration, for every node j: clamped nodes keep their clamp value; exogenous nodes (`inAbs[j] == 0`) hold their value; otherwise `A[j] = sigmoid(lambda * sum_i Wn[i][j] * A[i] + bias[j])`. Stop when max change is under `eps` (1e-6) or after `maxIter` (200).
3. Optional `weightOverride` (key `"src|dst"`, user prior v in [0,1], 0.5 = default) is applied additively after normalisation: `Wn[i][j] += sign * (v - 0.5) * 0.4`, not renormalised. Optional `noise` (same keys) is added the same way for the uncertainty ensemble.
4. `leverage`: clamp each driver or pressure to 0.1 in turn, sum the change in `state_ecosystem` and `state_resource` activations versus baseline, sort descending.
5. `ensembleStates`: 30 seeded (mulberry32, seed 1234567) samples of additive per-edge noise `sign * u * (1 - confidence) * 0.06`, u uniform in [-1, 1]; pinned edges get no noise; report p10, p50, p90 per state node.

## Counts

42 nodes (5 driver, 23 pressure, 8 state_ecosystem, 3 state_resource, 3 service), 162 edges (23 + 115 + 24).

## All node ids

| id | label | kind | initial |
|---|---|---|---|
| `driver:climate_change` | Climate change | driver | 0.6 |
| `driver:direct_exploitation` | Direct exploitation | driver | 0.6 |
| `driver:inns_pests_and_diseases` | INNS, pests and diseases | driver | 0.6 |
| `driver:land_and_sea_use_change` | Land and sea use change | driver | 0.6 |
| `driver:pollution` | Pollution | driver | 0.6 |
| `pressure:access_sport_recreational_activity` | Access, sport, recreational activity | pressure | 0.6 |
| `pressure:afforestation` | Afforestation | pressure | 0.6 |
| `pressure:agricultural_intensification` | Agricultural intensification | pressure | 0.6 |
| `pressure:air_pollution` | Air pollution | pressure | 0.6 |
| `pressure:built_development_and_infrastructure` | Built development and infrastructure | pressure | 0.6 |
| `pressure:changes_in_air_temperature_includes_rainfall_trends` | Changes in air temperature (includes rainfall trends) | pressure | 0.6 |
| `pressure:changes_in_intensity_and_frequency_of_weather_events` | Changes in intensity and frequency of weather events | pressure | 0.6 |
| `pressure:changes_in_water_temperature` | Changes in water temperature | pressure | 0.6 |
| `pressure:drainage` | Drainage | pressure | 0.6 |
| `pressure:fisheries` | Fisheries | pressure | 0.6 |
| `pressure:inns` | INNS | pressure | 0.6 |
| `pressure:land_pollution` | Land pollution | pressure | 0.6 |
| `pressure:large_mammal_herbivore_activities` | Large mammal herbivore activities | pressure | 0.6 |
| `pressure:light_pollution` | Light pollution | pressure | 0.6 |
| `pressure:noise_pollution` | Noise pollution | pressure | 0.6 |
| `pressure:non_efficient_use` | Non-efficient use | pressure | 0.6 |
| `pressure:ocean_acidification` | Ocean acidification | pressure | 0.6 |
| `pressure:pests_and_diseases` | Pests and diseases | pressure | 0.6 |
| `pressure:physical_modification_freshwater_and_coastal` | Physical modification (freshwater and coastal) | pressure | 0.6 |
| `pressure:reduced_land_use_management_intensity` | Reduced land use / management intensity | pressure | 0.6 |
| `pressure:sea_level_rise` | Sea level rise | pressure | 0.6 |
| `pressure:water_abstraction_and_demand` | Water abstraction and demand | pressure | 0.6 |
| `pressure:water_pollution` | Water pollution | pressure | 0.6 |
| `service:cultural` | Cultural | service | 0.5 |
| `service:provisioning` | Provisioning | service | 0.5 |
| `service:regulating` | Regulating | service | 0.5 |
| `state:coastal_margins` | Coastal margins | state_ecosystem | 0.38 |
| `state:enclosed_farmland` | Enclosed farmland | state_ecosystem | 0.425 |
| `state:freshwater` | Freshwater | state_ecosystem | 0.35 |
| `state:marine` | Marine | state_ecosystem | 0.537 |
| `state:mountain_moorland_and_heath` | Mountain, moorland and heath | state_ecosystem | 0.382 |
| `state:semi_natural_grassland` | Semi-natural grassland | state_ecosystem | 0.388 |
| `state:urban` | Urban | state_ecosystem | 0.3 |
| `state:woodlands` | Woodlands | state_ecosystem | 0.575 |
| `state:air` | Air | state_resource | 0.519 |
| `state:soil` | Soil | state_resource | 0.46 |
| `state:water` | Water | state_resource | 0.56 |
