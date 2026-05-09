"""
Generate country centroids and simplified GeoJSON from Natural Earth Admin 0
countries.

Input:
    public/data/natural_earth/ne_110m_admin_0_countries.shp

Output:
    public/data/country_centroids.csv
    public/data/world_countries_simplified.geojson
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import shapefile


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shp", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--geojson", required=True, type=Path)
    return parser.parse_args()


def field_index(reader: shapefile.Reader, name: str) -> int:
    fields = [field[0] for field in reader.fields[1:]]
    return fields.index(name)


def record_value(record, indexes: dict[str, int], *names: str) -> str:
    for name in names:
        if name in indexes:
            value = record[indexes[name]]
            if value and value != "-99":
                return value
    return ""


def main() -> None:
    args = parse_args()
    reader = shapefile.Reader(str(args.shp), encoding="latin1")
    fields = [field[0] for field in reader.fields[1:]]
    indexes = {name: fields.index(name) for name in fields}

    rows = []
    features = []
    for shape_record in reader.iterShapeRecords():
        record = shape_record.record
        iso3 = record_value(record, indexes, "ISO_A3", "ADM0_A3", "GU_A3")
        if not iso3 or iso3 == "-99":
            continue
        name = record_value(record, indexes, "NAME", "ADMIN", "NAME_LONG")
        min_lon, min_lat, max_lon, max_lat = shape_record.shape.bbox
        rows.append(
            {
                "iso3": iso3,
                "country": name,
                "lon": round((min_lon + max_lon) / 2, 6),
                "lat": round((min_lat + max_lat) / 2, 6),
            }
        )
        geometry = shape_record.shape.__geo_interface__
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "iso3": iso3,
                    "country": name,
                },
                "geometry": geometry,
            }
        )

    # Manual fixes for common Natural Earth ISO edge cases.
    manual = {
        "AUS": ("Australia", 133.7751, -25.2744),
        "BRA": ("Brazil", -51.9253, -14.235),
        "CAN": ("Canada", -106.3468, 56.1304),
        "CHN": ("China", 104.1954, 35.8617),
        "DEU": ("Germany", 10.4515, 51.1657),
        "FRA": ("France", 2.2137, 46.2276),
        "IND": ("India", 78.9629, 20.5937),
        "IDN": ("Indonesia", 113.9213, -0.7893),
        "JPN": ("Japan", 138.2529, 36.2048),
        "KOR": ("Korea, Rep.", 127.7669, 35.9078),
        "MEX": ("Mexico", -102.5528, 23.6345),
        "NOR": ("Norway", 8.4689, 60.472),
        "RUS": ("Russian Federation", 105.3188, 61.524),
        "TUR": ("Turkiye", 35.2433, 38.9637),
        "USA": ("United States", -98.5795, 39.8283),
        "VNM": ("Vietnam", 108.2772, 14.0583),
        "XKX": ("Kosovo", 20.903, 42.6026),
        "ZAF": ("South Africa", 22.9375, -30.5595),
    }
    by_iso = {row["iso3"]: row for row in rows}
    for iso3, (country, lon, lat) in manual.items():
        if iso3 in by_iso:
            by_iso[iso3].update({"country": country, "lon": lon, "lat": lat})
        else:
            rows.append({"iso3": iso3, "country": country, "lon": lon, "lat": lat})

    rows.sort(key=lambda row: row["iso3"])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["iso3", "country", "lon", "lat"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} centroids to {args.out}")

    args.geojson.parent.mkdir(parents=True, exist_ok=True)
    args.geojson.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Wrote {len(features)} country features to {args.geojson}")


if __name__ == "__main__":
    main()
