"""Polite Overpass fetch with exponential backoff. Usage: python3 -I overpass.py <query.txt> <out.json>
Uses the generic User-Agent etifeddiaeth-pipeline/0.1."""
import json
import sys
import time
import urllib.parse
import urllib.request

URL = "https://overpass-api.de/api/interpreter"


def fetch(query, out, tries=8):
    wait = 20
    for i in range(tries):
        req = urllib.request.Request(URL, data=urllib.parse.urlencode({"data": query}).encode(),
                                     headers={"User-Agent": "etifeddiaeth-pipeline/0.1"})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                body = r.read()
            json.loads(body)
            open(out, "wb").write(body)
            print("ok", out, len(body) // 1024, "KB")
            return True
        except Exception as ex:  # noqa: BLE001
            print("attempt", i + 1, "failed:", str(ex)[:120], "wait", wait, flush=True)
            time.sleep(wait)
            wait = min(wait * 2, 300)
    return False


if __name__ == "__main__":
    sys.exit(0 if fetch(open(sys.argv[1]).read(), sys.argv[2]) else 1)
