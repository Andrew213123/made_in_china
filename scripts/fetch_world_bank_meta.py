"""
Fetch World Bank country metadata for region and income group filters.

Output:
    public/data/country_meta.csv
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from urllib.request import urlopen


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    url = "https://api.worldbank.org/v2/country?format=json&per_page=400"
    with urlopen(url, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))

    rows = []
    for item in payload[1]:
        iso3 = item.get("id")
        region = item.get("region", {}).get("value", "")
        income = item.get("incomeLevel", {}).get("value", "")
        if not iso3 or region == "Aggregates":
            continue
        rows.append(
            {
                "iso3": iso3,
                "country": item.get("name", ""),
                "region": region,
                "incomeGroup": income,
                "iso2": item.get("iso2Code", ""),
            }
        )

    rows.sort(key=lambda row: row["iso3"])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["iso3", "country", "region", "incomeGroup", "iso2"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} World Bank country metadata rows to {args.out}")


if __name__ == "__main__":
    main()
