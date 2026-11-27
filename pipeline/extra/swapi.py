"""StatsWales v2 CSV API helper (cached)."""
import csv, io, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import fetch_la_indicators as F

def sw_rows(raw_dir, name, dataset, page_size=10000):
    os.makedirs(raw_dir, exist_ok=True)
    path = os.path.join(raw_dir, "sw_" + name + ".csv")
    if not os.path.exists(path):
        parts, p = [], 1
        while True:
            url = f"https://api.stats.gov.wales/v2/{dataset}/data?format=csv&page_size={page_size}&page_number={p}"
            txt = F.http(url).decode("utf-8-sig")
            rows = list(csv.reader(io.StringIO(txt)))
            if p == 1:
                parts.append(rows[0])
            parts.extend(rows[1:])
            if len(rows) - 1 < page_size:
                break
            p += 1
            time.sleep(1)
        with open(path, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(parts)
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))
