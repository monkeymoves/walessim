"""Minimal streaming ODS reader (no odfpy needed). read_ods(path, sheet_names=None, max_rows=None)
returns {sheet_name: [row lists]}; repeated cells and rows are expanded (empty trailing repeats are capped)."""
import zipfile
import xml.etree.ElementTree as ET

NS = {"t": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
      "o": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
      "x": "urn:oasis:names:tc:opendocument:xmlns:text:1.0"}
T = "{%s}" % NS["t"]
O = "{%s}" % NS["o"]
X = "{%s}" % NS["x"]


def _cell_value(c):
    vt = c.get(O + "value-type")
    if vt in ("float", "percentage", "currency"):
        return float(c.get(O + "value"))
    if vt is None:
        return None
    return "".join("".join(p.itertext()) for p in c.findall(X + "p"))


def read_ods(path, sheet_names=None, max_rows=None):
    out = {}
    with zipfile.ZipFile(path) as z:
        with z.open("content.xml") as f:
            cur = None
            for ev, el in ET.iterparse(f, events=("start", "end")):
                if ev == "start" and el.tag == T + "table":
                    cur = el.get(T + "name")
                    if sheet_names is None or cur in sheet_names:
                        out[cur] = []
                    else:
                        cur = None if False else "~skip"
                if ev == "end" and el.tag == T + "table-row":
                    if cur and cur != "~skip" and (max_rows is None or len(out[cur]) < max_rows):
                        row = []
                        for c in el:
                            if c.tag not in (T + "table-cell", T + "covered-table-cell"):
                                continue
                            rep = int(c.get(T + "number-columns-repeated", "1"))
                            v = _cell_value(c)
                            row.extend([v] * min(rep, 50 if v is None else rep))
                        rrep = int(el.get(T + "number-rows-repeated", "1"))
                        if any(v is not None for v in row):
                            for _ in range(min(rrep, 1000)):
                                out[cur].append(row)
                    el.clear()
    return out
