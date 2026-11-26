"""Extract Welsh Government 2022 IO multipliers (Table 5) to model/data/io-multipliers.json
and verify them against the published Leontief inverses (Tables 6 and 7).
Needs odfpy (pandas ODS reader). Usage: python3 -I io_extract.py <ods> <out_json>
"""
import json
import site
import sys

sys.path.append(site.getusersitepackages())
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

ODS, OUT = sys.argv[1], sys.argv[2]
x = pd.ExcelFile(ODS, engine="odf")
t5 = x.parse("Table_5", header=None).iloc[5:63].reset_index(drop=True)
assert len(t5) == 58
inds = []
for _, r in t5.iterrows():
    v = [float(r[i]) if str(r[i]) != "[z]" else None for i in range(2, 15)]  # [z] = not applicable (L68A has no employment)
    inds.append({
        "id": str(r[0]), "name": str(r[1]),
        "output_m": v[2], "gva_m": v[7], "fte": v[12],
        "type1": {"output_mult": v[0], "gva_mult": v[3], "gva_effect": v[5],
                  "emp_mult": v[8], "emp_effect": v[10]},
        "type2": {"output_mult": v[1], "gva_mult": v[4], "gva_effect": v[6],
                  "emp_mult": v[9], "emp_effect": v[11]},
    })
data = {
    "source": {"id": "wg-io-2022", "title": "Supply, Use and Input-Output Tables 2022, Table 5 (indicative economic multipliers)",
               "publisher": "Welsh Government", "url": "https://www.gov.wales/supply-and-use-tables-and-input-output-tables-2022",
               "licence": "OGL v3.0", "status": "Official statistics in development",
               "caveat": "Use for the economy or sectors as a whole, not individual transactions. FTE estimates are bespoke, for IO analysis only. Includes Port Talbot blast furnaces (since closed)."},
    "year": 2022,
    "units": {"output_m": "GBP million, basic prices, industry total output", "gva_m": "GBP million",
              "fte": "estimated full-time equivalent jobs (bespoke IO satellite)",
              "output_mult": "total output per 1 unit of direct output (column sum of the Leontief inverse)",
              "gva_mult": "total GVA effect divided by direct GVA per unit output",
              "gva_effect": "GBP GVA generated per GBP 1 of final demand for the industry",
              "emp_mult": "total FTE effect divided by direct FTE per unit output",
              "emp_effect": "FTE jobs per GBP 1 million of final demand for the industry",
              "type1": "direct + indirect (supply chain)", "type2": "direct + indirect + induced (households endogenised)"},
    "industries": inds,
}
json.dump(data, open(OUT, "w"), indent=1, ensure_ascii=False)
print("wrote", OUT, len(inds), "industries")

# ---- verification against published Leontief inverses ----
def inv(sheet):
    d = x.parse(sheet, header=None)
    return d.iloc[6:64, 0].astype(str).tolist(), d.iloc[6:64, 2:60].astype(float).to_numpy()
codes, L1 = inv("Table_6")
_, L2 = inv("Table_7")
assert codes == [i["id"] for i in inds]
out = np.array([i["output_m"] for i in inds])
gva = np.array([i["gva_m"] for i in inds])
fte = np.array([np.nan if i["fte"] is None else i["fte"] for i in inds])
for name, L, k in (("type1", L1, "type1"), ("type2", L2, "type2")):
    om = L.sum(axis=0)
    ge = (gva / out) @ L
    ee = (fte / out) @ L
    gm = ge / (gva / out)
    em = ee / (fte / out)
    pub = lambda f: np.array([np.nan if i[k][f] is None else i[k][f] for i in inds])  # noqa: E731
    for lab, mine, f in (("output_mult", om, "output_mult"), ("gva_effect", ge, "gva_effect"), ("gva_mult", gm, "gva_mult"),
                         ("emp_effect", ee, "emp_effect"), ("emp_mult", em, "emp_mult")):
        d = np.abs(mine - pub(f))
        d = np.where(np.isnan(d), 0, d)
        print(f"{name} {lab}: max abs diff {d.max():.2e} (worst {codes[int(d.argmax())]})")
j = codes.index("A01")
print("A01 type1 output mult recomputed", L1[:, j].sum(), "published", inds[j]["type1"]["output_mult"])
