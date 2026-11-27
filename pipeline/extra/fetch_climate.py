#!/usr/bin/env python3
"""Climate goal: fetch and compute new local authority measures.

Run from the pipeline directory:   python3 -I extra/fetch_climate.py
(-I is fine because the script adds its own paths explicitly.)

Raw downloads are cached in pipeline/raw/extra/climate/ (gitignored). Delete a
file there to force a fresh download. Writes pipeline/extra/out/climate.json.
No number is estimated: each is read from a published table or computed from
published tables, as described in out/climate.indicators.yaml.
"""
import csv, io, json, os, re, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
PIPE = os.path.dirname(HERE)
sys.path.insert(0, PIPE)
sys.path.insert(0, HERE)
import fetch_la_indicators as F  # noqa: E402  (has a __main__ guard)
import odsread  # noqa: E402
import openpyxl  # noqa: E402

LAS, WALES = F.LAS, F.WALES
RAW = os.path.join(PIPE, "raw", "extra", "climate")
OUT = os.path.join(HERE, "out", "climate.json")
os.makedirs(RAW, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
F.RAW = RAW  # helpers cache into our folder

GOV = "https://assets.publishing.service.gov.uk/media/"
URLS = {
    "veh0142.ods": GOV + "6aad561b086ce7c57b818707/veh0142.ods",
    "veh0105.ods": GOV + "6aad561bce3f006bd4346ce1/veh0105.ods",
    "evci0102.ods": GOV + "6aff279ad367b3459e424029/evci0102_2026-10_EV_chargers_by_local_authority_UK.ods",
    "gas_consumption.xlsx": GOV + "69f9bf208f3213f7384ecae6/Subnational_gas_consumption_statistics_2005-2024.xlsx",
    "gas_off_grid.xlsx": GOV + "6942b893501cdd438f4cf521/Subnational_estimates_of_properties_not_connected_to_the_gas_network_2015-2024.xlsx",
}
SW = "https://api.stats.gov.wales/v2/%s/data?format=csv&page_size=10000&page_number=%d"
SW_IDS = {
    "waste_recycling": "f9314a75-6c2b-4baf-b8ef-383a2bc06125",
    "residual_waste": "080804d5-8454-4f50-ae9e-5e0a2a4d22cd",
    "heat_pumps": "155d1692-2002-40f1-90d7-106fa55fc53e",
    "dwellings": "6476cc20-ddeb-46a5-be64-10a23c8a159f",
    "wimd_la": "c28ab0ec-5893-46c2-a372-98d4058ba415",
}

IND = {}
DROPPED = {}


def put(iid, year, values):
    IND[iid] = {"year": year, "values": {k: values[k] for k in LAS + [WALES] if k in values}}


def statswales(key):
    """All rows of a StatsWales dataset via the public CSV API (paged)."""
    ds = SW_IDS[key]
    rows, page = [], 1
    while True:
        text = F.cached_text(f"sw_{key}_p{page}.csv", SW % (ds, page))
        part = list(csv.DictReader(io.StringIO(text.lstrip("﻿"))))
        rows += part
        if len(part) < 10000:
            return rows
        page += 1


def code_of(names, area):
    a = area.strip().lower()
    if a == "wales":
        return WALES
    return names.get(a)


def local(name):
    return F.cached(name, URLS[name]) if name in URLS else None


# ------------------------------------------------------------- measures
def recycling(names):
    rows = statswales("waste_recycling")
    d = "Percentage of Waste Reused/Recycled/Composted (Statutory Target)"
    v = {code_of(names, r["Area"]): float(r["Data values"]) for r in rows
         if r["Data description"] == d and r["Year"] == "2024-25" and code_of(names, r["Area"])}
    put("recycling_rate", "2024-25", v)


def residual_waste(names):
    rows = statswales("residual_waste")
    d = "Annual residual household waste produced per person by local authority (kg)"
    v = {code_of(names, r["Area"]): float(r["Data values"]) for r in rows
         if r["Data description"] == d and r["Year"] == "2024-25" and code_of(names, r["Area"])}
    put("residual_waste_head", "2024-25", v)


def plug_in_cars():
    def table(fname, sheet, num_fuel):
        d = odsread.read_ods(local(fname), sheet_names=[sheet])[sheet]
        hdr = next(r for r in d if r and r[0] == "Units")
        col = hdr.index("2026 Q2")
        out = {}
        for r in d:
            if len(r) > col and r[1] == "Cars" and r[2] == "Total" and r[3] == "Private" and r[5] in LAS + [WALES]:
                out[r[5]] = float(r[col])
        return out
    pi = table("veh0142.ods", "VEH0142", True)         # number of plug-in cars, privately kept (company cars are registered at leasing firms, which inflates Bridgend and Swansea)
    allc = table("veh0105.ods", "VEH0105", False)      # thousands of licensed cars
    put("plug_in_cars", "end of June 2026", {k: 100 * pi[k] / (allc[k] * 1000) for k in pi if k in allc})


def chargers():
    d = odsread.read_ods(local("evci0102.ods"), sheet_names=["EVCI0102a", "EVCI0102b", "EVCI0102c"])
    col = 5  # "1 October 2026"
    a = {r[0]: r[col] for r in d["EVCI0102a"] if r[0] in LAS}
    b = {r[0]: r[col] for r in d["EVCI0102b"] if r[0] in LAS}
    c = {r[0]: r[col] for r in d["EVCI0102c"] if r[0] in LAS}
    for r in d["EVCI0102a"]:
        if r[0] in LAS and not isinstance(r[col], float):
            raise RuntimeError("non numeric charger count " + str(r[:2]))
    popn = {k: a[k] / c[k] * 1e5 for k in LAS}   # the publisher's own population base (ONS MYE 2024)
    c[WALES] = sum(a.values()) / sum(popn.values()) * 1e5
    put("ev_chargers", "1 October 2026", c)
    c50 = {r[0]: r[col] for r in d["EVCI0102c"] if False}
    rapid = {k: b[k] / popn[k] * 1e5 for k in LAS}
    rapid[WALES] = sum(b.values()) / sum(popn.values()) * 1e5
    put("ev_chargers_rapid", "1 October 2026", rapid)


def heat_pumps(names):
    hp = statswales("heat_pumps")
    n = {code_of(names, r["Area"]): float(r["Data values"]) for r in hp
         if r["Technology"] == "Heat Pump" and r["Data description"] == "Number of Projects"
         and r["Year"] == "2024" and code_of(names, r["Area"]) and r["Data values"] != ""}
    dw = statswales("dwellings")
    stock = {code_of(names, r["Area"]): float(r["Data values"]) for r in dw
             if r["Tenure"].strip() == "All tenures" and r["Period"] == "31/03/2024"
             and r["Data description"] == "Dwelling stock estimates (number)" and code_of(names, r["Area"])}
    put("heat_pumps", "2024", {k: 1000 * n[k] / stock[k] for k in n if k in stock})


def sap(names):
    rows = statswales("wimd_la")
    d = "Average energy efficiency of residential properties (Standard Assessment Procedure score)"
    v = {code_of(names, r["Area name"]): float(r["Data values"]) for r in rows
         if r["Data description"] == d and code_of(names, r["Area name"])}
    put("home_energy_efficiency", "WIMD 2025", v)


def xlsx_table(fname, sheet, hdr_first="Code"):
    wb = openpyxl.load_workbook(local(fname), read_only=True, data_only=True)
    rows = list(wb[sheet].iter_rows(values_only=True))
    h = next(i for i, r in enumerate(rows) if r[0] == hdr_first)
    hdr = [str(c).replace("\n", " ").strip() if c is not None else "" for c in rows[h]]
    return hdr, [r for r in rows[h + 1:] if r[0] in LAS + [WALES]]


def gas():
    hdr, rows = xlsx_table("gas_consumption.xlsx", "2024")
    c = hdr.index("Median consumption (kWh per meter): Domestic")
    put("gas_use_median", "2024", {r[0]: float(r[c]) for r in rows})
    hdr, rows = xlsx_table("gas_off_grid.xlsx", "2024")
    c = hdr.index("Estimated percentage of properties not  on the gas grid".replace("  ", " ")) \
        if "Estimated percentage of properties not on the gas grid" in hdr else \
        next(i for i, h in enumerate(hdr) if h.startswith("Estimated percentage"))
    put("off_gas_grid", "2024", {r[0]: 100 * float(r[c]) for r in rows})


def drive_to_work():
    rows = F.nomis("NM_2078_1", f"geography={F.GEOG}&measures=20100&select=geography_code,c2021_ttwmeth_12,obs_value",
                   "nomis_ts061.csv")
    tot, home, car = {}, {}, {}
    for r in rows:
        k, m, v = r["GEOGRAPHY_CODE"], r["C2021_TTWMETH_12"], float(r["OBS_VALUE"])
        if m == "0": tot[k] = v
        elif m == "1": home[k] = v
        elif m == "7": car[k] = v
    put("drive_to_work", "2021", {k: 100 * car[k] / (tot[k] - home[k]) for k in tot if k in car and k in home})


def home_transport_emissions():
    p = F.cached("desnz_la_ghg_2005_2024.csv",
                 "https://assets.publishing.service.gov.uk/media/6a3bacc9d52550a19950f2f5/"
                 "2005-24-local-authority-ghg-emissions-csv-dataset.csv")
    kt = {"Domestic": {}, "Transport": {}}
    pop = {}
    with open(p, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if r["Calendar Year"] == "2024" and r["Country"] == "Wales":
                k = r["Local Authority Code"]
                pop[k] = float(r["Mid-year Population (thousands)"]) * 1000
                if r["LA GHG Sector"] in kt:
                    kt[r["LA GHG Sector"]][k] = kt[r["LA GHG Sector"]].get(k, 0) + float(r["Territorial emissions (kt CO2e)"])
    tot = {k: kt["Domestic"][k] + kt["Transport"][k] for k in LAS}
    v = {k: tot[k] * 1000 / pop[k] for k in LAS}
    v[WALES] = sum(tot.values()) * 1000 / sum(pop[k] for k in LAS)
    put("home_transport_emissions", "2024", v)


def main():
    names = F.name_map()
    steps = [("recycling", lambda: recycling(names)), ("residual waste", lambda: residual_waste(names)),
             ("plug-in cars", plug_in_cars), ("chargers", chargers),
             ("heat pumps", lambda: heat_pumps(names)), ("SAP", lambda: sap(names)),
             ("gas", gas), ("drive to work", drive_to_work),
             ("home and transport emissions", home_transport_emissions)]
    for name, fn in steps:
        print("==", name)
        try:
            fn()
        except Exception as e:
            DROPPED[name] = repr(e)
            print("  FAILED:", repr(e))
    final = {}
    for iid, d in IND.items():
        missing = [k for k in LAS if k not in d["values"]]
        if missing or WALES not in d["values"]:
            DROPPED[iid] = "missing: " + ",".join(missing or [WALES])
            continue
        d["values"] = {k: round(v, 4) for k, v in d["values"].items()}
        final[iid] = d
    with open(OUT, "w") as f:
        json.dump({"generated": "2026-11-27", "indicators": final}, f, indent=1)
    print("wrote", OUT, len(final), "indicators")
    for k, v in DROPPED.items():
        print("DROPPED", k, v)


if __name__ == "__main__":
    main()
