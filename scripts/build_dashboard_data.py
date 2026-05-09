"""
Build the compact dashboard bundle consumed by the current zero-build frontend.

The processed layer now carries the full HS official -> analysis major/minor
classification system. This script exports:

1. compatibility fields for the existing frontend (`categories`)
2. richer metadata for future UI upgrades (`categoriesMajor`, `categoriesMinor`)
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


DEFAULT_SCOPE = "manufactures"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--processed", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--top-countries", type=int, default=40)
    parser.add_argument("--top-products", type=int, default=80)
    parser.add_argument("--latest-year", type=int, default=2024)
    return parser.parse_args()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def num(value, default=0.0):
    if value in (None, ""):
        return default
    return float(value)


def default_matrix_categories(group_categories: list[dict]) -> list[dict]:
    preferred = [item for item in group_categories if item.get("isDefaultManufacturing")]
    return preferred or group_categories


def first_existing(*paths: Path) -> Path:
    for path in paths:
        if path.exists():
            return path
    raise FileNotFoundError(f"No matching file found in candidates: {paths}")


def main() -> None:
    args = parse_args()
    processed = args.processed
    annual = processed / "annual" / str(args.latest_year)

    latest_country_rows = read_json(
        first_existing(
            annual / "country_dependency.json",
            processed / f"country_dependency_{args.latest_year}.json",
        )
    )
    latest_matrix_rows = read_csv(
        first_existing(
            annual / "matrix_major.csv",
            processed / "full" / f"country_category_matrix_{args.latest_year}.csv",
            processed / f"country_category_matrix_{args.latest_year}.csv",
        )
    )
    latest_product_rows = read_csv(
        first_existing(
            annual / "product_vulnerability_top.csv",
            processed / "full" / f"product_vulnerability_{args.latest_year}.csv",
            processed / f"product_vulnerability_{args.latest_year}.csv",
        )
    )
    trend_rows = read_csv(processed / "country_dependency_trend.csv")

    scope_metadata = read_json(processed / "scope_metadata.json")
    section_metadata = read_json(processed / "hs_section_metadata.json")
    chapter_metadata = read_json(processed / "hs_chapter_metadata.json")
    group_metadata = read_json(processed / "category_group_metadata.json")
    fine_metadata = read_json(processed / "category_metadata.json")
    topic_metadata = read_json(processed / "topic_tag_metadata.json")

    compat_categories = default_matrix_categories(group_metadata)
    compat_category_ids = {item["id"] for item in compat_categories}

    selected = latest_country_rows[: args.top_countries]
    selected_iso3 = {row["iso3"] for row in selected}

    trend_by_iso = {}
    for row in trend_rows:
        iso3 = row.get("iso3")
        if iso3 in selected_iso3:
            trend_by_iso.setdefault(iso3, {})[str(row["year"])] = num(row.get("cdi"))

    matrix_by_iso: dict[str, dict] = {iso3: {} for iso3 in selected_iso3}
    for row in latest_matrix_rows:
        if row.get("scope") != DEFAULT_SCOPE:
            continue
        if row.get("categoryLevel") != "group":
            continue
        iso3 = row.get("iso3")
        category_id = row.get("categoryId")
        if iso3 not in selected_iso3 or category_id not in compat_category_ids:
            continue
        matrix_by_iso.setdefault(iso3, {})[category_id] = {
            "dependency": num(row.get("dependency")),
            "hhi": num(row.get("hhi")),
            "importance": num(row.get("importance")),
            "vulnerability": num(row.get("vulnerability")),
        }

    countries = []
    for row in selected:
        cdi_series = {
            str(year): trend_by_iso.get(row["iso3"], {}).get(str(year), num(row.get("cdi")))
            for year in range(2007, args.latest_year + 1)
        }
        countries.append(
            {
                "iso3": row["iso3"],
                "name": row["country"],
                "region": row.get("region") or "Unclassified",
                "incomeGroup": row.get("incomeGroup") or "Unclassified",
                "lon": num(row.get("lon"), None),
                "lat": num(row.get("lat"), None),
                "cdi": cdi_series,
                "hhi": num(row.get("hhi")),
                "vulnerability": num(row.get("vulnerability")),
                "totalImport": num(row.get("totalImport")),
                "chinaImport": num(row.get("chinaImport")),
                "topCategory": row.get("topCategory") or "",
                "categories": matrix_by_iso.get(row["iso3"], {}),
            }
        )

    products = []
    for row in latest_product_rows:
        if row.get("scope") != DEFAULT_SCOPE:
            continue
        products.append(
            {
                "hs6": row["hs6"],
                "name": row["productName"],
                "category": row.get("groupCategoryId") or row.get("categoryId"),
                "categoryName": row.get("groupCategoryName") or row.get("categoryName") or row.get("category"),
                "analysisMinorId": row.get("categoryId"),
                "analysisMinorName": row.get("categoryName") or row.get("category"),
                "analysisMajorId": row.get("groupCategoryId"),
                "analysisMajorName": row.get("groupCategoryName"),
                "topicTags": row.get("topicTags", ""),
                "globalImport": num(row.get("globalImport")),
                "chinaGlobalSupply": num(row.get("chinaGlobalSupply")),
                "chinaGlobalShare": num(row.get("chinaGlobalShare")),
                "avgDependency": num(row.get("avgDependency")),
                "maxDependency": num(row.get("maxDependency")),
                "avgHhi": num(row.get("avgHhi")),
                "dependentCountryCount": int(num(row.get("dependentCountryCount"))),
                "vulnerability": num(row.get("vulnerability")),
                "strategic": num(row.get("vulnerability")) >= 0.65,
            }
        )
        if len(products) >= args.top_products:
            break

    compatibility_categories = [{"id": "all", "name": "全部制造品", "color": "#f5b84b"}]
    compatibility_categories.extend(
        {"id": item["id"], "name": item["name"], "color": item["color"]}
        for item in compat_categories
    )

    payload = {
        "years": list(range(2007, args.latest_year + 1)),
        "defaults": {
            "scope": DEFAULT_SCOPE,
            "categoryLevel": "group",
        },
        "scopes": scope_metadata,
        "hsSections": section_metadata,
        "hsChapters": chapter_metadata,
        "categories": compatibility_categories,
        "categoriesMajor": group_metadata,
        "categoriesMinor": fine_metadata,
        "topicTags": topic_metadata,
        "china": {"iso3": "CHN", "name": "China", "lon": 104.1954, "lat": 35.8617},
        "countries": countries,
        "products": products,
        "source": {
            "name": "CEPII BACI HS07 Version 202601",
            "processedLatestYear": args.latest_year,
            "topCountries": args.top_countries,
            "topProducts": args.top_products,
            "classificationStandard": "HS2007 official sections + analysis major/minor taxonomy",
        },
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        "window.DASHBOARD_DATA = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote compact dashboard data to {args.out}")


if __name__ == "__main__":
    main()
