"""
BACI Version 202601 preprocessing pipeline for the China Manufacturing
Dependency Network project.

Official BACI grain:
    t: year
    i: exporter numeric country code
    j: importer numeric country code
    k: HS6 product code
    v: trade value, thousand USD
    q: quantity, metric tons

The pipeline keeps raw BACI offline and writes frontend-ready static files.
Default mode is compact:

1. annual/<year>/*          lightweight display files for Globe / Matrix / Flow / Target
2. drilldown/<kind>/<year>  category / topic / country drilldown files
3. full/*                   optional research backup outputs
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from category_schema import (  # noqa: E402
    HONG_KONG_ISO3,
    SCOPE_LABELS,
    TOPIC_TAG_LABELS,
    classify_hs6,
    fine_category_metadata,
    group_category_metadata,
    hs_chapter_metadata,
    hs_section_metadata,
    scope_metadata,
    topic_tag_metadata,
    topic_tag_text,
    topic_tags_for_product,
)


CHINA_ISO3 = "CHN"
DEFAULT_SCOPE = "manufactures"
TOP_MATRIX_MINOR = 12
TOP_MATRIX_CHAPTER = 12
TOP_FLOW_MAJOR = 6


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert BACI HS07 yearly CSV files into frontend visualization data."
    )
    parser.add_argument("--baci-dir", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--country-codes", type=Path)
    parser.add_argument("--product-codes", type=Path)
    parser.add_argument(
        "--centroids",
        type=Path,
        help="Optional country_centroids.csv with iso3,country,lon,lat.",
    )
    parser.add_argument(
        "--country-meta",
        type=Path,
        help="Optional country_meta.csv with iso3,region,incomeGroup.",
    )
    parser.add_argument("--start-year", type=int, default=2007)
    parser.add_argument("--end-year", type=int, default=2024)
    parser.add_argument("--china-iso3", default=CHINA_ISO3)
    parser.add_argument("--include-hong-kong", action="store_true")
    parser.add_argument("--min-display-import", type=float, default=1000.0)
    parser.add_argument("--dependent-threshold", type=float, default=0.5)
    parser.add_argument("--top-flows", type=int, default=40)
    parser.add_argument("--top-products-per-country", type=int, default=10)
    parser.add_argument("--skip-country-detail", action="store_true")
    parser.add_argument("--frontend-mode", choices=["compact", "full"], default="compact")
    parser.add_argument("--top-products", type=int, default=500)
    parser.add_argument("--top-countries-per-category", type=int, default=80)
    parser.add_argument("--write-full-matrix", action="store_true")
    return parser.parse_args()


def require_polars():
    try:
        import polars as pl
    except ModuleNotFoundError as exc:
        raise SystemExit("Polars is required. Install it with: pip install polars") from exc
    return pl


def baci_year(path: Path) -> int:
    return int(path.name.split("_Y")[1].split("_")[0])


def yearly_files(baci_dir: Path, start_year: int, end_year: int) -> list[Path]:
    files = sorted(baci_dir.glob("BACI_HS07_Y*_V*.csv"))
    selected = [path for path in files if start_year <= baci_year(path) <= end_year]
    missing = sorted(set(range(start_year, end_year + 1)) - {baci_year(path) for path in selected})
    if missing:
        raise FileNotFoundError(f"Missing BACI year files: {missing}")
    return selected


def find_one(directory: Path, pattern: str) -> Path:
    matches = sorted(directory.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"No file matching {pattern} under {directory}")
    return matches[0]


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def to_records(df) -> list[dict]:
    return df.to_dicts()


def num(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def validate_metric_ranges(pl, frame, columns: Iterable[str], label: str) -> None:
    for column in columns:
        if column not in frame.columns:
            continue
        bad = frame.filter(
            (pl.col(column) < 0) | (pl.col(column) > 1) | pl.col(column).is_null()
        ).height
        if bad:
            raise ValueError(f"{label}.{column} has {bad} values outside [0, 1] or null.")


def structure_change_level(value: float) -> str:
    if value < 0.15:
        return "低变化"
    if value < 0.35:
        return "中等变化"
    return "显著变化"


def full_output_enabled(args: argparse.Namespace) -> bool:
    return args.frontend_mode == "full" or args.write_full_matrix


def annual_dir(out: Path, year: int) -> Path:
    return out / "annual" / str(year)


def drilldown_dir(out: Path, kind: str, year: int) -> Path:
    return out / "drilldown" / kind / str(year)


def load_dimensions(pl, args: argparse.Namespace):
    country_codes = args.country_codes or find_one(args.baci_dir, "country_codes_*.csv")
    product_codes = args.product_codes or find_one(args.baci_dir, "product_codes_HS07_*.csv")

    countries = (
        pl.read_csv(country_codes, schema_overrides={"country_code": pl.Int64, "country_iso3": pl.Utf8})
        .select(
            pl.col("country_code").alias("iso_num"),
            pl.col("country_iso3").alias("iso3"),
            pl.col("country_name").alias("country"),
        )
        .filter(pl.col("iso3").is_not_null())
    )

    product_rows = (
        pl.read_csv(product_codes, schema_overrides={"code": pl.Utf8})
        .select(pl.col("code").alias("hs6"), pl.col("description").alias("product_name"))
        .to_dicts()
    )

    product_dimension = []
    for row in product_rows:
        hs6 = str(row["hs6"]).zfill(6)
        classification = classify_hs6(hs6)
        if not classification:
            continue
        topic_tags = topic_tags_for_product(
            hs6,
            classification["analysisMinor"],
            row.get("product_name"),
        )
        product_dimension.append(
            {
                "hs6": hs6,
                "hs2": classification["hsChapter"],
                "hsChapter": classification["hsChapter"],
                "hsSection": classification["hsSection"],
                "hsSectionName": classification["hsSectionName"],
                "analysisMajor": classification["analysisMajor"],
                "analysisMajorName": classification["analysisMajorName"],
                "analysisMinor": classification["analysisMinor"],
                "analysisMinorName": classification["analysisMinorName"],
                "product_name": row.get("product_name") or hs6,
                "fineCategory": classification["analysisMinor"],
                "fineCategoryName": classification["analysisMinorName"],
                "groupCategory": classification["analysisMajor"],
                "groupCategoryName": classification["analysisMajorName"],
                "scope": classification["scope"],
                "topicTags": topic_tags,
                "topicTagIdsText": "|".join(topic_tags),
                "topicTagsText": topic_tag_text(topic_tags),
            }
        )

    products = pl.DataFrame(product_dimension)

    centroids = None
    if args.centroids:
        centroids = pl.read_csv(args.centroids).select("iso3", "lon", "lat")
    country_meta = None
    if args.country_meta:
        country_meta = pl.read_csv(args.country_meta).select("iso3", "region", "incomeGroup")

    return countries, products, centroids, country_meta


def scan_baci_year(pl, path: Path):
    return pl.scan_csv(
        str(path),
        schema_overrides={
            "t": pl.Int32,
            "i": pl.Int64,
            "j": pl.Int64,
            "k": pl.Utf8,
            "v": pl.Float64,
            "q": pl.Float64,
        },
    ).select(
        pl.col("t").alias("year"),
        pl.col("i").alias("exporter_code"),
        pl.col("j").alias("importer_code"),
        pl.col("k").str.zfill(6).alias("hs6"),
        pl.col("v").alias("value"),
    ).filter(pl.col("value") >= 0)


def duplicate_all_goods(pl, frame):
    return frame.with_columns(pl.lit("all_goods").alias("scope"))


def add_optional_country_dimensions(pl, frame, centroids, country_meta):
    if centroids is not None:
        frame = frame.join(centroids, on="iso3", how="left")
    else:
        frame = frame.with_columns(
            pl.lit(None, dtype=pl.Float64).alias("lon"),
            pl.lit(None, dtype=pl.Float64).alias("lat"),
        )

    if country_meta is not None:
        frame = frame.join(country_meta, on="iso3", how="left")
    else:
        frame = frame.with_columns(
            pl.lit(None, dtype=pl.Utf8).alias("region"),
            pl.lit(None, dtype=pl.Utf8).alias("incomeGroup"),
        )

    return frame


def build_country_dependency_output(
    country_scope_metrics,
    group_matrix,
    centroids,
    country_meta,
    pl,
    include_scopes: bool = False,
):
    default_scope = country_scope_metrics.filter(pl.col("scope") == DEFAULT_SCOPE)

    top_category = (
        group_matrix
        .with_columns((pl.col("dependency") * pl.col("importance")).alias("contributionScore"))
        .sort(["scope", "iso3", "contributionScore"], descending=[False, False, True])
        .group_by(["scope", "iso3"])
        .first()
        .select("scope", "iso3", pl.col("categoryName").alias("topCategory"))
    )

    default_scope = (
        default_scope.join(
            top_category.filter(pl.col("scope") == DEFAULT_SCOPE).select("iso3", "topCategory"),
            on="iso3",
            how="left",
        )
        .sort("cdi", descending=True)
        .with_row_count("rank", offset=1)
    )

    default_scope = add_optional_country_dimensions(pl, default_scope, centroids, country_meta)

    scope_map = {}
    if include_scopes:
        top_by_scope = {
            (row["scope"], row["iso3"]): row["topCategory"] for row in top_category.to_dicts()
        }
        for row in country_scope_metrics.to_dicts():
            iso3 = row["iso3"]
            scope_map.setdefault(iso3, {})
            scope_map[iso3][row["scope"]] = {
                "scope": row["scope"],
                "scopeName": SCOPE_LABELS.get(row["scope"], row["scope"]),
                "cdi": row["cdi"],
                "hhi": row["hhi"],
                "vulnerability": row["vulnerability"],
                "chinaImport": row["chinaImport"],
                "totalImport": row["totalImport"],
                "topCategory": top_by_scope.get((row["scope"], iso3), ""),
            }

    output = []
    for row in default_scope.to_dicts():
        record = {
            "year": row["year"],
            "iso3": row["iso3"],
            "country": row["country"],
            "rank": row["rank"],
            "cdi": row["cdi"],
            "totalImport": row["totalImport"],
            "chinaImport": row["chinaImport"],
            "hhi": row["hhi"],
            "vulnerability": row["vulnerability"],
            "topCategory": row.get("topCategory") or "",
            "region": row.get("region") or "",
            "incomeGroup": row.get("incomeGroup") or "",
            "lon": row.get("lon"),
            "lat": row.get("lat"),
            "scope": DEFAULT_SCOPE,
        }
        if include_scopes:
            record["scopes"] = scope_map.get(row["iso3"], {})
        output.append(record)

    return output, default_scope


def build_trade_flows(default_country_dependency, year: int, args, pl):
    return (
        default_country_dependency.filter(pl.col("lon").is_not_null() & pl.col("lat").is_not_null())
        .sort("chinaImport", descending=True)
        .head(args.top_flows)
        .with_columns(
            pl.lit(args.china_iso3).alias("fromIso3"),
            pl.col("iso3").alias("toIso3"),
            pl.col("country").alias("toCountry"),
            pl.lit(104.1954).alias("fromLon"),
            pl.lit(35.8617).alias("fromLat"),
            pl.col("lon").alias("toLon"),
            pl.col("lat").alias("toLat"),
            pl.col("chinaImport").alias("value"),
            (pl.col("chinaImport") / pl.max("chinaImport")).alias("valueNorm"),
            pl.col("cdi").alias("dependency"),
            pl.lit(year).alias("year"),
            (pl.lit(args.china_iso3) + "-" + pl.col("iso3") + "-" + pl.lit(str(year))).alias("id"),
        )
        .select(
            "id",
            "year",
            "fromIso3",
            "toIso3",
            "toCountry",
            "fromLon",
            "fromLat",
            "toLon",
            "toLat",
            "value",
            "valueNorm",
            "dependency",
            "vulnerability",
            "region",
            "incomeGroup",
            "topCategory",
        )
    )


def build_supplier_structure_by_scope(flow, year: int, pl, china_sources: list[str]) -> dict[str, dict]:
    result = {}
    scopes = sorted(set(flow.select("scope").to_series().to_list()))
    if "all_goods" not in scopes:
        scopes.append("all_goods")
    for scope in scopes:
        suppliers = (
            (flow if scope == "all_goods" else flow.filter(pl.col("scope") == scope))
            .group_by("importer_iso3", "importer", "exporter_iso3", "exporter")
            .agg(pl.sum("value").alias("value"))
            .sort(["importer_iso3", "value"], descending=[False, True])
        )

        scope_payload = {}
        for importer_iso3, rows in suppliers.partition_by("importer_iso3", as_dict=True).items():
            importer_iso3 = importer_iso3[0] if isinstance(importer_iso3, tuple) else importer_iso3
            importer_rows = rows.to_dicts()
            if not importer_rows:
                continue
            total_import = sum(num(row["value"]) for row in importer_rows)
            ranked = []
            china_rank = None
            china_share = 0.0
            second_share = 0.0
            for index, row in enumerate(importer_rows, start=1):
                share = num(row["value"]) / total_import if total_import else 0.0
                exporter = row["exporter_iso3"]
                ranked.append(
                    {
                        "exporter": exporter,
                        "name": row["exporter"],
                        "value": num(row["value"]),
                        "share": share,
                        "rank": index,
                    }
                )
                if exporter in china_sources and china_rank is None:
                    china_rank = index
                    china_share = share
                elif china_rank != 1 and second_share == 0.0 and exporter not in china_sources:
                    second_share = share

            if china_rank == 1 and len(ranked) > 1:
                second_share = ranked[1]["share"]

            scope_payload[importer_iso3] = {
                "year": year,
                "iso3": importer_iso3,
                "country": importer_rows[0]["importer"],
                "scope": scope,
                "totalImport": total_import,
                "suppliers": ranked[:5],
                "chinaRank": china_rank,
                "chinaShare": china_share,
                "secondShare": second_share,
                "chinaLead": china_share - second_share,
                "top3Share": sum(item["share"] for item in ranked[:3]),
                "top5Share": sum(item["share"] for item in ranked[:5]),
            }
        result[scope] = scope_payload
    return result


def build_dependency_breadth_by_scope(product_metrics, year: int, pl, dependent_threshold: float) -> dict[str, dict]:
    result = {}
    scopes = sorted(set(product_metrics.select("scope").to_series().to_list()))
    for scope in scopes:
        breadth = (
            product_metrics.filter(pl.col("scope") == scope)
            .group_by("importer_iso3")
            .agg(
                pl.len().alias("totalHs6Count"),
                (pl.col("chinaImport") > 0).sum().alias("chinaSuppliedHs6Count"),
                (pl.col("dependency") >= dependent_threshold).sum().alias("highDependencyHs6Count"),
                (pl.col("dependency") >= 0.8).sum().alias("extremeDependencyHs6Count"),
            )
            .sort("importer_iso3")
        )

        scope_payload = {}
        for row in breadth.to_dicts():
            total = max(int(row["totalHs6Count"]), 1)
            supplied = int(row["chinaSuppliedHs6Count"])
            high = int(row["highDependencyHs6Count"])
            extreme = int(row["extremeDependencyHs6Count"])
            scope_payload[row["importer_iso3"]] = {
                "year": year,
                "iso3": row["importer_iso3"],
                "scope": scope,
                "totalHs6Count": total,
                "chinaSuppliedHs6Count": supplied,
                "highDependencyHs6Count": high,
                "extremeDependencyHs6Count": extreme,
                "coverageRatio": supplied / total,
                "highDependencyRatio": high / total,
                "extremeDependencyRatio": extreme / total,
            }
        result[scope] = scope_payload
    return result


def top_contributors(frame, key_col: str, name_col: str, pl, scope: str = DEFAULT_SCOPE) -> dict:
    rows = (
        frame.filter(pl.col("scope") == scope)
        .with_columns((pl.col("dependency") * pl.col("importance")).alias("contributionScore"))
        .sort(["iso3", "contributionScore"], descending=[False, True])
        .group_by("iso3")
        .head(5)
        .select(
            "iso3",
            key_col,
            name_col,
            "dependency",
            "importance",
            "hhi",
            "vulnerability",
            "chinaImport",
            "totalImport",
            "contributionScore",
        )
        .to_dicts()
    )
    payload = {}
    for row in rows:
        iso3 = row.pop("iso3")
        payload.setdefault(iso3, []).append(
            {
                "id": row[key_col],
                "name": row[name_col],
                "dependency": row["dependency"],
                "importance": row["importance"],
                "hhi": row["hhi"],
                "vulnerability": row["vulnerability"],
                "chinaImport": row["chinaImport"],
                "totalImport": row["totalImport"],
                "contributionScore": row["contributionScore"],
            }
        )
    return payload


def top_by_dependency(frame, key_col: str, name_col: str, pl, scope: str = DEFAULT_SCOPE) -> dict:
    rows = (
        frame.filter(pl.col("scope") == scope)
        .sort(
            ["iso3", "dependency", "importance"],
            descending=[False, True, True],
        )
        .group_by("iso3")
        .head(5)
        .select(
            "iso3",
            key_col,
            name_col,
            "dependency",
            "importance",
            "hhi",
            "vulnerability",
            "chinaImport",
            "totalImport",
        )
        .to_dicts()
    )
    payload = {}
    for row in rows:
        iso3 = row.pop("iso3")
        payload.setdefault(iso3, []).append(
            {
                "id": row[key_col],
                "name": row[name_col],
                "dependency": row["dependency"],
                "importance": row["importance"],
                "hhi": row["hhi"],
                "vulnerability": row["vulnerability"],
                "chinaImport": row["chinaImport"],
                "totalImport": row["totalImport"],
            }
        )
    return payload


def build_country_details_payload(
    year: int,
    scope: str,
    country_rows,
    fine_matrix,
    group_matrix,
    topic_matrix,
    product_metrics,
    args,
    pl,
) -> dict[str, dict]:
    total_countries = country_rows.height

    top_products = (
        product_metrics.filter(
            (pl.col("scope") == scope)
            & (pl.col("importValue") >= args.min_display_import)
        )
        .sort(["importer_iso3", "vulnerability"], descending=[False, True])
        .group_by("importer_iso3")
        .head(args.top_products_per_country)
        .select(
            "importer_iso3",
            "hs6",
            "product_name",
            "fineCategory",
            "fineCategoryName",
            "groupCategory",
            "groupCategoryName",
            "topicTagIdsText",
            "topicTagsText",
            "importValue",
            "chinaImport",
            "dependency",
            "hhi",
            "importance",
            "vulnerability",
        )
    )

    top_minor = top_contributors(fine_matrix, "categoryId", "categoryName", pl, scope=scope)
    top_major = top_contributors(group_matrix, "categoryId", "categoryName", pl, scope=scope)
    top_topic = top_contributors(topic_matrix, "topicTag", "topicName", pl, scope=scope)
    ranking_minor = top_by_dependency(fine_matrix, "categoryId", "categoryName", pl, scope=scope)
    ranking_major = top_by_dependency(group_matrix, "categoryId", "categoryName", pl, scope=scope)

    grouped_products = {}
    for row in top_products.to_dicts():
        iso3 = row.pop("importer_iso3")
        grouped_products.setdefault(iso3, []).append(
            {
                "hs6": row["hs6"],
                "productName": row["product_name"],
                "categoryId": row["fineCategory"],
                "category": row["fineCategoryName"],
                "groupCategoryId": row["groupCategory"],
                "groupCategoryName": row["groupCategoryName"],
                "topicTags": row["topicTagsText"],
                "topicTagIds": row["topicTagIdsText"],
                "importValue": row["importValue"],
                "chinaImport": row["chinaImport"],
                "dependency": row["dependency"],
                "hhi": row["hhi"],
                "importance": row["importance"],
                "vulnerability": row["vulnerability"],
            }
        )

    details = {}
    for country in country_rows.to_dicts():
        iso3 = country["iso3"]
        top_category = country.get("topCategory") or ""
        detail = {
            "year": year,
            "iso3": iso3,
            "country": country["country"],
            "nameEn": country["country"],
            "rank": country["rank"],
            "totalCountries": total_countries,
            "scope": scope,
            "cdi": country["cdi"],
            "topCategory": top_category,
            "metrics": {
                "cdi": country["cdi"],
                "hhi": country["hhi"],
                "vulnerability": country["vulnerability"],
                "chinaImport": country["chinaImport"],
                "totalImport": country["totalImport"],
                "rank": country["rank"],
            },
            "topMinorCategories": top_minor.get(iso3, []),
            "topMajorCategories": top_major.get(iso3, []),
            "minorDependencyRanking": ranking_minor.get(iso3, []),
            "majorDependencyRanking": ranking_major.get(iso3, []),
            "topTopicTags": top_topic.get(iso3, []),
            "topFineCategories": top_minor.get(iso3, []),
            "topGroupCategories": top_major.get(iso3, []),
            "topProducts": grouped_products.get(iso3, []),
            "trend": [],
            "overallTrend": [],
            "majorTrends": {},
            "minorTrends": {},
            "interpretation": (
                f"{country['country']} 在 {year} 年的中国制造依赖指数为 "
                f"{country['cdi']:.2f}，主导类别为 {top_category or '未识别'}。"
            ),
        }
        details[iso3] = detail
    return details


def build_chapter_matrix(scoped_metrics, country_scope_metrics, pl):
    chapter_matrix = (
        scoped_metrics.group_by(
            "year",
            "importer_iso3",
            "importer",
            "scope",
            "hsChapter",
            "hsSection",
            "hsSectionName",
        )
        .agg(
            pl.sum("importValue").alias("totalImport"),
            pl.sum("chinaImport").alias("chinaImport"),
            (((pl.col("hhi") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("hhi"),
            (((pl.col("vulnerability") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("vulnerability"),
        )
        .join(
            country_scope_metrics.select(
                "year",
                "iso3",
                "scope",
                pl.col("totalImport").alias("countryTotalImport"),
            ),
            left_on=["year", "importer_iso3", "scope"],
            right_on=["year", "iso3", "scope"],
            how="inner",
        )
        .with_columns(
            (pl.col("chinaImport") / pl.col("totalImport")).alias("dependency"),
            (pl.col("totalImport") / pl.col("countryTotalImport")).alias("importance"),
            pl.lit("hs_chapter").alias("categoryLevel"),
            pl.concat_str(
                [pl.lit("HS"), pl.col("hsChapter").cast(pl.Int64).cast(pl.Utf8).str.zfill(2)]
            ).alias("categoryId"),
            pl.concat_str(
                [pl.lit("HS"), pl.col("hsChapter").cast(pl.Int64).cast(pl.Utf8).str.zfill(2)]
            ).alias("categoryName"),
            pl.concat_str(
                [pl.lit("HS"), pl.col("hsChapter").cast(pl.Int64).cast(pl.Utf8).str.zfill(2)]
            ).alias("category"),
            pl.col("hsSection").alias("parentGroupId"),
        )
        .rename({"importer_iso3": "iso3", "importer": "country"})
        .select(
            "year",
            "iso3",
            "country",
            "categoryLevel",
            "categoryId",
            "categoryName",
            "category",
            "parentGroupId",
            "scope",
            "dependency",
            "hhi",
            "importance",
            "vulnerability",
            "chinaImport",
            "totalImport",
        )
    )
    return chapter_matrix


def select_matrix_columns(frame):
    return frame.select(
        "year",
        "iso3",
        "country",
        "categoryLevel",
        "categoryId",
        "categoryName",
        "category",
        "parentGroupId",
        "scope",
        "dependency",
        "hhi",
        "importance",
        "vulnerability",
        "chinaImport",
        "totalImport",
    )


def top_category_ids(pl, frame, category_id_col: str, limit: int) -> list[str]:
    if frame.is_empty():
        return []
    rows = (
        frame.group_by(category_id_col)
        .agg(pl.sum("chinaImport").alias("chinaImport"))
        .sort("chinaImport", descending=True)
        .head(limit)
        .select(category_id_col)
        .to_series()
        .to_list()
    )
    return [str(item) for item in rows]


def build_flow_major_payload(group_matrix, year: int, pl) -> dict:
    matrix_major = group_matrix.filter(pl.col("scope") == DEFAULT_SCOPE)
    top_categories = (
        matrix_major.group_by("categoryId", "categoryName")
        .agg(
            pl.sum("chinaImport").alias("chinaImport"),
            pl.sum("totalImport").alias("totalImport"),
            (((pl.col("dependency") * pl.col("totalImport")).sum()) / pl.col("totalImport").sum()).alias("dependency"),
            (((pl.col("vulnerability") * pl.col("totalImport")).sum()) / pl.col("totalImport").sum()).alias("vulnerability"),
        )
        .sort("chinaImport", descending=True)
        .head(TOP_FLOW_MAJOR)
    )
    top_ids = set(top_categories.select("categoryId").to_series().to_list())
    country_rows = (
        matrix_major.filter(pl.col("categoryId").is_in(top_ids))
        .sort(["categoryId", "chinaImport"], descending=[False, True])
        .select(
            "iso3",
            "country",
            "categoryId",
            "categoryName",
            "chinaImport",
            "dependency",
            "vulnerability",
            "totalImport",
        )
        .to_dicts()
    )
    return {
        "year": year,
        "scope": DEFAULT_SCOPE,
        "categoryLevel": "analysis_major",
        "topCategories": top_categories.to_dicts(),
        "countryFlows": country_rows,
    }


def write_annual_compact_outputs(
    out: Path,
    year: int,
    country_dependency_rows: list[dict],
    trade_flows,
    group_matrix,
    fine_matrix,
    chapter_matrix,
    product_vulnerability,
    args,
    pl,
) -> None:
    annual = annual_dir(out, year)
    annual.mkdir(parents=True, exist_ok=True)

    write_json(annual / "country_dependency.json", country_dependency_rows)
    write_json(annual / "globe_major.json", to_records(trade_flows))

    matrix_major = select_matrix_columns(
        group_matrix.filter(pl.col("scope") == DEFAULT_SCOPE)
    )
    matrix_major.write_csv(annual / "matrix_major.csv")

    top_minor_ids = top_category_ids(
        pl,
        fine_matrix.filter(pl.col("scope") == DEFAULT_SCOPE),
        "categoryId",
        TOP_MATRIX_MINOR,
    )
    matrix_minor_top = select_matrix_columns(
        fine_matrix.filter(
            (pl.col("scope") == DEFAULT_SCOPE) & pl.col("categoryId").is_in(top_minor_ids)
        )
    )
    matrix_minor_top.write_csv(annual / "matrix_minor_top.csv")

    top_chapter_ids = top_category_ids(
        pl,
        chapter_matrix.filter(pl.col("scope") == DEFAULT_SCOPE),
        "categoryId",
        TOP_MATRIX_CHAPTER,
    )
    matrix_chapter_top = select_matrix_columns(
        chapter_matrix.filter(
            (pl.col("scope") == DEFAULT_SCOPE) & pl.col("categoryId").is_in(top_chapter_ids)
        )
    )
    matrix_chapter_top.write_csv(annual / "matrix_chapter_top.csv")

    write_json(annual / "flow_major.json", build_flow_major_payload(group_matrix, year, pl))

    product_top = (
        product_vulnerability.filter(pl.col("scope") == DEFAULT_SCOPE)
        .sort("vulnerability", descending=True)
        .head(args.top_products)
    )
    product_top.write_csv(annual / "product_vulnerability_top.csv")


def write_country_drilldowns(
    out: Path,
    year: int,
    details_by_scope: dict[str, dict[str, dict]],
    supplier_structure_by_scope: dict[str, dict],
    dependency_breadth_by_scope: dict[str, dict],
) -> None:
    legacy_dir = drilldown_dir(out, "country", year)
    legacy_dir.mkdir(parents=True, exist_ok=True)

    for scope, details in details_by_scope.items():
        scoped_dir = drilldown_dir(out, "country", year) / scope
        scoped_dir.mkdir(parents=True, exist_ok=True)
        for iso3, detail in details.items():
            payload = dict(detail)
            payload["supplierStructure"] = supplier_structure_by_scope.get(scope, {}).get(iso3)
            payload["dependencyBreadth"] = dependency_breadth_by_scope.get(scope, {}).get(iso3)
            write_json(scoped_dir / f"{iso3}.json", payload)
            if scope == DEFAULT_SCOPE:
                write_json(legacy_dir / f"{iso3}.json", payload)


def write_minor_drilldowns(out: Path, year: int, fine_matrix, product_metrics, args, pl) -> None:
    target_dir = drilldown_dir(out, "minor", year)
    target_dir.mkdir(parents=True, exist_ok=True)

    matrix_default = fine_matrix.filter(pl.col("scope") == DEFAULT_SCOPE)
    category_ids = matrix_default.select("categoryId").unique().to_series().to_list()

    for category_id in category_ids:
        rows = (
            matrix_default.filter(pl.col("categoryId") == category_id)
            .sort("chinaImport", descending=True)
            .head(args.top_countries_per_category)
        )
        products = (
            product_metrics.filter(
                (pl.col("scope") == DEFAULT_SCOPE) & (pl.col("fineCategory") == category_id)
            )
            .sort("vulnerability", descending=True)
            .head(80)
            .select(
                "hs6",
                pl.col("product_name").alias("productName"),
                "fineCategory",
                "fineCategoryName",
                "groupCategory",
                "groupCategoryName",
                "topicTagIdsText",
                "topicTagsText",
                "importValue",
                "chinaImport",
                "dependency",
                "hhi",
                "importance",
                "vulnerability",
            )
            .to_dicts()
        )
        write_json(
            target_dir / f"{category_id}.json",
            {
                "year": year,
                "scope": DEFAULT_SCOPE,
                "categoryLevel": "analysis_minor",
                "categoryId": category_id,
                "categoryName": rows.select("categoryName").row(0)[0] if rows.height else category_id,
                "countries": rows.to_dicts(),
                "products": products,
            },
        )


def write_topic_drilldowns(out: Path, year: int, topic_matrix, product_vulnerability, args, pl) -> None:
    target_dir = drilldown_dir(out, "topic", year)
    target_dir.mkdir(parents=True, exist_ok=True)

    matrix_default = topic_matrix.filter(pl.col("scope") == DEFAULT_SCOPE)
    tags = matrix_default.select("topicTag").unique().to_series().to_list()

    for tag in tags:
        rows = (
            matrix_default.filter(pl.col("topicTag") == tag)
            .sort("chinaImport", descending=True)
            .head(args.top_countries_per_category)
        )
        products = (
            product_vulnerability.filter(
                (pl.col("scope") == DEFAULT_SCOPE)
                & pl.col("topicTagIds").fill_null("").str.contains(rf"(^|\|){tag}(\||$)")
            )
            .sort("vulnerability", descending=True)
            .head(120)
            .to_dicts()
        )
        write_json(
            target_dir / f"{tag}.json",
            {
                "year": year,
                "scope": DEFAULT_SCOPE,
                "topicTag": tag,
                "topicName": TOPIC_TAG_LABELS.get(tag, tag),
                "countries": rows.to_dicts(),
                "products": products,
            },
        )


def write_hs_chapter_drilldowns(out: Path, year: int, chapter_matrix, product_metrics, args, pl) -> None:
    target_dir = drilldown_dir(out, "hs_chapter", year)
    target_dir.mkdir(parents=True, exist_ok=True)

    chapter_default = chapter_matrix.filter(pl.col("scope") == DEFAULT_SCOPE)
    chapter_ids = chapter_default.select("categoryId").unique().to_series().to_list()

    for chapter_id in chapter_ids:
        chapter_number = int(str(chapter_id).replace("HS", ""))
        rows = (
            chapter_default.filter(pl.col("categoryId") == chapter_id)
            .sort("chinaImport", descending=True)
            .head(args.top_countries_per_category)
        )
        products = (
            product_metrics.filter(
                (pl.col("scope") == DEFAULT_SCOPE) & (pl.col("hsChapter") == chapter_number)
            )
            .sort("vulnerability", descending=True)
            .head(80)
            .select(
                "hs6",
                pl.col("product_name").alias("productName"),
                "fineCategory",
                "fineCategoryName",
                "groupCategory",
                "groupCategoryName",
                "topicTagIdsText",
                "topicTagsText",
                "importValue",
                "chinaImport",
                "dependency",
                "hhi",
                "importance",
                "vulnerability",
            )
            .to_dicts()
        )
        write_json(
            target_dir / f"{chapter_id}.json",
            {
                "year": year,
                "scope": DEFAULT_SCOPE,
                "categoryLevel": "hs_chapter",
                "chapterId": chapter_id,
                "countries": rows.to_dicts(),
                "products": products,
            },
        )


def write_full_outputs(out: Path, year: int, fine_matrix, group_matrix, topic_matrix, product_vulnerability, pl) -> None:
    full_dir = out / "full"
    full_dir.mkdir(parents=True, exist_ok=True)
    pl.concat([fine_matrix, group_matrix], how="vertical_relaxed").write_csv(
        full_dir / f"country_category_matrix_{year}.csv"
    )
    topic_matrix.write_csv(full_dir / f"country_topic_matrix_{year}.csv")
    product_vulnerability.write_csv(full_dir / f"product_vulnerability_{year}.csv")


def process_year(pl, path: Path, args: argparse.Namespace, countries, products, centroids, country_meta):
    year = baci_year(path)
    print(f"Processing {year} from {path.name}")

    china_sources = [args.china_iso3]
    if args.include_hong_kong:
        china_sources.append(HONG_KONG_ISO3)

    flow = (
        scan_baci_year(pl, path)
        .join(products.lazy(), on="hs6", how="inner")
        .join(countries.lazy(), left_on="exporter_code", right_on="iso_num", how="inner")
        .rename({"iso3": "exporter_iso3", "country": "exporter"})
        .join(countries.lazy(), left_on="importer_code", right_on="iso_num", how="inner")
        .rename({"iso3": "importer_iso3", "country": "importer"})
        .filter(pl.col("importer_iso3") != args.china_iso3)
        .collect(engine="streaming")
    )

    product_import = flow.group_by(
        "year",
        "importer_iso3",
        "importer",
        "hs6",
        "product_name",
        "hsChapter",
        "hsSection",
        "hsSectionName",
        "fineCategory",
        "fineCategoryName",
        "groupCategory",
        "groupCategoryName",
        "scope",
        "topicTags",
        "topicTagIdsText",
        "topicTagsText",
    ).agg(pl.sum("value").alias("importValue"))

    china_import = (
        flow.filter(pl.col("exporter_iso3").is_in(china_sources))
        .group_by("year", "importer_iso3", "hs6")
        .agg(pl.sum("value").alias("chinaImport"))
    )

    source_shares = flow.join(
        product_import.select("year", "importer_iso3", "hs6", "importValue"),
        on=["year", "importer_iso3", "hs6"],
        how="inner",
    ).with_columns((pl.col("value") / pl.col("importValue")).alias("sourceShare"))

    hhi = source_shares.group_by("year", "importer_iso3", "hs6").agg(
        (pl.col("sourceShare") ** 2).sum().alias("hhi")
    )

    global_supply = flow.group_by("year", "hs6").agg(pl.sum("value").alias("globalImport"))
    china_global_supply = (
        flow.filter(pl.col("exporter_iso3").is_in(china_sources))
        .group_by("year", "hs6")
        .agg(pl.sum("value").alias("chinaGlobalSupply"))
    )

    product_supply = (
        global_supply.join(china_global_supply, on=["year", "hs6"], how="left")
        .with_columns(pl.col("chinaGlobalSupply").fill_null(0))
        .with_columns((pl.col("chinaGlobalSupply") / pl.col("globalImport")).alias("chinaGlobalShare"))
    )

    product_metrics = (
        product_import.join(china_import, on=["year", "importer_iso3", "hs6"], how="left")
        .with_columns(pl.col("chinaImport").fill_null(0))
        .join(hhi, on=["year", "importer_iso3", "hs6"], how="left")
        .join(
            product_supply.select("year", "hs6", "globalImport", "chinaGlobalSupply", "chinaGlobalShare"),
            on=["year", "hs6"],
            how="left",
        )
        .with_columns((pl.col("chinaImport") / pl.col("importValue")).alias("dependency"))
    )

    product_metrics = product_metrics.with_columns(
        (pl.col("importValue") / pl.sum("importValue").over(["year", "importer_iso3", "scope"])).alias("importance")
    ).with_columns(
        (
            0.35 * pl.col("dependency")
            + 0.25 * pl.col("hhi")
            + 0.25 * pl.col("importance")
            + 0.15 * pl.col("chinaGlobalShare")
        ).alias("vulnerability")
    )

    scoped_metrics = pl.concat(
        [product_metrics, duplicate_all_goods(pl, product_metrics)],
        how="vertical_relaxed",
    )

    country_scope_metrics = (
        scoped_metrics.group_by("year", "importer_iso3", "importer", "scope")
        .agg(
            pl.sum("importValue").alias("totalImport"),
            pl.sum("chinaImport").alias("chinaImport"),
            (((pl.col("hhi") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("hhi"),
            (((pl.col("vulnerability") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("vulnerability"),
        )
        .with_columns((pl.col("chinaImport") / pl.col("totalImport")).alias("cdi"))
        .rename({"importer_iso3": "iso3", "importer": "country"})
    )

    fine_matrix = (
        scoped_metrics.group_by(
            "year",
            "importer_iso3",
            "importer",
            "scope",
            "fineCategory",
            "fineCategoryName",
            "groupCategory",
        )
        .agg(
            pl.sum("importValue").alias("totalImport"),
            pl.sum("chinaImport").alias("chinaImport"),
            (((pl.col("hhi") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("hhi"),
            (((pl.col("vulnerability") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("vulnerability"),
        )
        .join(
            country_scope_metrics.select(
                "year",
                "iso3",
                "scope",
                pl.col("totalImport").alias("countryTotalImport"),
            ),
            left_on=["year", "importer_iso3", "scope"],
            right_on=["year", "iso3", "scope"],
            how="inner",
        )
        .with_columns(
            (pl.col("chinaImport") / pl.col("totalImport")).alias("dependency"),
            (pl.col("totalImport") / pl.col("countryTotalImport")).alias("importance"),
            pl.lit("fine").alias("categoryLevel"),
            pl.col("fineCategory").alias("categoryId"),
            pl.col("fineCategoryName").alias("categoryName"),
            pl.col("fineCategoryName").alias("category"),
            pl.col("groupCategory").alias("parentGroupId"),
        )
        .rename({"importer_iso3": "iso3", "importer": "country"})
        .select(
            "year",
            "iso3",
            "country",
            "categoryLevel",
            "categoryId",
            "categoryName",
            "category",
            "parentGroupId",
            "scope",
            "dependency",
            "hhi",
            "importance",
            "vulnerability",
            "chinaImport",
            "totalImport",
        )
    )

    group_matrix = (
        scoped_metrics.group_by(
            "year",
            "importer_iso3",
            "importer",
            "scope",
            "groupCategory",
            "groupCategoryName",
        )
        .agg(
            pl.sum("importValue").alias("totalImport"),
            pl.sum("chinaImport").alias("chinaImport"),
            (((pl.col("hhi") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("hhi"),
            (((pl.col("vulnerability") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("vulnerability"),
        )
        .join(
            country_scope_metrics.select(
                "year",
                "iso3",
                "scope",
                pl.col("totalImport").alias("countryTotalImport"),
            ),
            left_on=["year", "importer_iso3", "scope"],
            right_on=["year", "iso3", "scope"],
            how="inner",
        )
        .with_columns(
            (pl.col("chinaImport") / pl.col("totalImport")).alias("dependency"),
            (pl.col("totalImport") / pl.col("countryTotalImport")).alias("importance"),
            pl.lit("group").alias("categoryLevel"),
            pl.col("groupCategory").alias("categoryId"),
            pl.col("groupCategoryName").alias("categoryName"),
            pl.col("groupCategoryName").alias("category"),
            pl.lit("").alias("parentGroupId"),
        )
        .rename({"importer_iso3": "iso3", "importer": "country"})
        .select(
            "year",
            "iso3",
            "country",
            "categoryLevel",
            "categoryId",
            "categoryName",
            "category",
            "parentGroupId",
            "scope",
            "dependency",
            "hhi",
            "importance",
            "vulnerability",
            "chinaImport",
            "totalImport",
        )
    )

    chapter_matrix = build_chapter_matrix(scoped_metrics, country_scope_metrics, pl)

    topic_matrix = (
        scoped_metrics.filter(pl.col("topicTags").list.len() > 0)
        .explode("topicTags")
        .rename({"topicTags": "topicTag"})
        .with_columns(pl.col("topicTag").replace(TOPIC_TAG_LABELS).alias("topicName"))
        .group_by("year", "importer_iso3", "importer", "scope", "topicTag", "topicName")
        .agg(
            pl.sum("importValue").alias("totalImport"),
            pl.sum("chinaImport").alias("chinaImport"),
            (((pl.col("hhi") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("hhi"),
            (((pl.col("vulnerability") * pl.col("importValue")).sum()) / pl.col("importValue").sum()).alias("vulnerability"),
        )
        .join(
            country_scope_metrics.select(
                "year",
                "iso3",
                "scope",
                pl.col("totalImport").alias("countryTotalImport"),
            ),
            left_on=["year", "importer_iso3", "scope"],
            right_on=["year", "iso3", "scope"],
            how="inner",
        )
        .with_columns(
            (pl.col("chinaImport") / pl.col("totalImport")).alias("dependency"),
            (pl.col("totalImport") / pl.col("countryTotalImport")).alias("importance"),
        )
        .rename({"importer_iso3": "iso3", "importer": "country"})
        .select(
            "year",
            "iso3",
            "country",
            "topicTag",
            "topicName",
            "scope",
            "dependency",
            "hhi",
            "importance",
            "vulnerability",
            "chinaImport",
            "totalImport",
        )
    )

    product_vulnerability = (
        product_metrics.filter(pl.col("importValue") >= args.min_display_import)
        .group_by(
            "year",
            "hs6",
            "product_name",
            "fineCategory",
            "fineCategoryName",
            "groupCategory",
            "groupCategoryName",
            "scope",
            "topicTagIdsText",
            "topicTagsText",
        )
        .agg(
            pl.mean("dependency").alias("avgDependency"),
            pl.max("dependency").alias("maxDependency"),
            pl.mean("hhi").alias("avgHhi"),
            pl.mean("vulnerability").alias("vulnerability"),
            (pl.col("dependency") >= args.dependent_threshold).sum().alias("dependentCountryCount"),
        )
        .join(product_supply, on=["year", "hs6"], how="left")
        .rename({"product_name": "productName"})
        .with_columns(
            pl.col("fineCategoryName").alias("category"),
            pl.col("fineCategoryName").alias("categoryName"),
        )
        .select(
            "year",
            "hs6",
            "productName",
            pl.col("fineCategory").alias("categoryId"),
            "categoryName",
            pl.col("groupCategory").alias("groupCategoryId"),
            "groupCategoryName",
            "scope",
            pl.col("topicTagIdsText").alias("topicTagIds"),
            pl.col("topicTagsText").alias("topicTags"),
            "category",
            "globalImport",
            "chinaGlobalSupply",
            "chinaGlobalShare",
            "avgDependency",
            "maxDependency",
            "avgHhi",
            "dependentCountryCount",
            "vulnerability",
        )
        .sort("vulnerability", descending=True)
    )

    validate_metric_ranges(pl, country_scope_metrics, ["cdi", "hhi", "vulnerability"], f"country_scope_metrics_{year}")
    validate_metric_ranges(pl, fine_matrix, ["dependency", "hhi", "importance", "vulnerability"], f"fine_matrix_{year}")
    validate_metric_ranges(pl, group_matrix, ["dependency", "hhi", "importance", "vulnerability"], f"group_matrix_{year}")
    validate_metric_ranges(pl, chapter_matrix, ["dependency", "hhi", "importance", "vulnerability"], f"chapter_matrix_{year}")
    validate_metric_ranges(pl, product_vulnerability, ["chinaGlobalShare", "avgDependency", "maxDependency", "avgHhi", "vulnerability"], f"product_vulnerability_{year}")

    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    (out / "country_detail").mkdir(exist_ok=True)

    country_dependency_rows, default_country_dependency = build_country_dependency_output(
        country_scope_metrics,
        group_matrix,
        centroids,
        country_meta,
        pl,
        include_scopes=True,
    )
    write_json(out / f"country_dependency_{year}.json", country_dependency_rows)

    trade_flows = build_trade_flows(default_country_dependency, year, args, pl)
    write_json(out / f"trade_flows_{year}.json", to_records(trade_flows))

    supplier_structure_by_scope = build_supplier_structure_by_scope(flow, year, pl, china_sources)
    dependency_breadth_by_scope = build_dependency_breadth_by_scope(
        scoped_metrics, year, pl, args.dependent_threshold
    )
    write_json(
        out / f"country_supplier_structure_{year}.json",
        supplier_structure_by_scope.get(DEFAULT_SCOPE, {}),
    )
    write_json(
        out / f"country_dependency_breadth_{year}.json",
        dependency_breadth_by_scope.get(DEFAULT_SCOPE, {}),
    )

    details_by_scope = {}
    if not args.skip_country_detail:
        scopes = sorted(set(country_scope_metrics.select("scope").to_series().to_list()))
        top_category_rows = (
            group_matrix.with_columns(
                (pl.col("dependency") * pl.col("importance")).alias("contributionScore")
            )
            .sort(["scope", "iso3", "contributionScore"], descending=[False, False, True])
            .group_by(["scope", "iso3"])
            .first()
            .select("scope", "iso3", pl.col("categoryName").alias("topCategory"))
        )
        for scope in scopes:
            country_rows = (
                country_scope_metrics.filter(pl.col("scope") == scope)
                .join(
                    top_category_rows.filter(pl.col("scope") == scope).select("iso3", "topCategory"),
                    on="iso3",
                    how="left",
                )
                .sort("cdi", descending=True)
                .with_row_count("rank", offset=1)
            )
            details = build_country_details_payload(
                year,
                scope,
                country_rows,
                fine_matrix,
                group_matrix,
                topic_matrix,
                scoped_metrics,
                args,
                pl,
            )
            details_by_scope[scope] = details
            if scope == DEFAULT_SCOPE:
                for iso3, detail in details.items():
                    write_json(out / "country_detail" / f"{iso3}_{year}.json", detail)

    write_annual_compact_outputs(
        out,
        year,
        country_dependency_rows,
        trade_flows,
        group_matrix,
        fine_matrix,
        chapter_matrix,
        product_vulnerability,
        args,
        pl,
    )
    write_country_drilldowns(
        out,
        year,
        details_by_scope,
        supplier_structure_by_scope,
        dependency_breadth_by_scope,
    )
    write_minor_drilldowns(out, year, fine_matrix, product_metrics, args, pl)
    write_topic_drilldowns(out, year, topic_matrix, product_vulnerability, args, pl)
    write_hs_chapter_drilldowns(out, year, chapter_matrix, product_metrics, args, pl)

    if full_output_enabled(args):
        write_full_outputs(out, year, fine_matrix, group_matrix, topic_matrix, product_vulnerability, pl)

    return {
        "country_dependency": default_country_dependency,
        "country_scope_metrics": country_scope_metrics,
        "fine_matrix": fine_matrix,
        "group_matrix": group_matrix,
        "product_vulnerability": product_vulnerability,
    }


def write_structural_change(pl, out: Path, group_frames: list, base_year: int = 2007) -> None:
    group_trend = pl.concat(group_frames, how="vertical_relaxed").filter(
        (pl.col("scope") == DEFAULT_SCOPE) & (pl.col("categoryLevel") == "group")
    )

    base_rows = group_trend.filter(pl.col("year") == base_year).to_dicts()
    base_map = {}
    for row in base_rows:
        iso3 = row["iso3"]
        base_map.setdefault(iso3, {})
        base_map[iso3][row["categoryId"]] = {
            "share": num(row["chinaImport"]),
            "name": row["categoryName"],
        }

    years = sorted({int(row["year"]) for row in group_trend.select("year").unique().to_dicts()})
    for year in years:
        rows = group_trend.filter(pl.col("year") == year).to_dicts()
        current_map = {}
        for row in rows:
            iso3 = row["iso3"]
            current_map.setdefault(iso3, {})
            current_map[iso3][row["categoryId"]] = {
                "share": num(row["chinaImport"]),
                "name": row["categoryName"],
            }

        payload = {}
        for iso3, current_categories in current_map.items():
            base_categories = base_map.get(iso3)
            if not base_categories:
                continue
            current_total = sum(item["share"] for item in current_categories.values()) or 1.0
            base_total = sum(item["share"] for item in base_categories.values()) or 1.0
            keys = set(current_categories) | set(base_categories)
            change = 0.5 * sum(
                abs(
                    current_categories.get(key, {}).get("share", 0.0) / current_total
                    - base_categories.get(key, {}).get("share", 0.0) / base_total
                )
                for key in keys
            )
            dominant_base = max(base_categories.items(), key=lambda item: item[1]["share"])[1]["name"]
            dominant_current = max(current_categories.items(), key=lambda item: item[1]["share"])[1]["name"]
            payload[iso3] = {
                "year": year,
                "baseYear": base_year,
                "iso3": iso3,
                "scope": DEFAULT_SCOPE,
                "structureChange": change,
                "changedLevel": structure_change_level(change),
                "dominantCategoryBase": dominant_base,
                "dominantCategoryCurrent": dominant_current,
            }
        write_json(out / f"country_structural_change_{year}.json", payload)


def write_trends(pl, out: Path, country_frames, fine_frames, group_frames, product_frames) -> None:
    country_trend = pl.concat(
        [
            frame.select(
                "year",
                "iso3",
                "country",
                "rank",
                "cdi",
                "totalImport",
                "chinaImport",
                "topCategory",
                "region",
                "incomeGroup",
            )
            for frame in country_frames
        ],
        how="vertical",
    )
    country_trend.write_csv(out / "country_dependency_trend.csv")

    category_trend = pl.concat(
        [pl.concat([fine, group], how="vertical_relaxed") for fine, group in zip(fine_frames, group_frames)],
        how="vertical_relaxed",
    )
    category_trend.write_csv(out / "category_dependency_trend.csv")

    product_trend = pl.concat(
        [
            frame.select(
                "year",
                "hs6",
                "productName",
                "categoryId",
                "categoryName",
                "groupCategoryId",
                "groupCategoryName",
                "scope",
                "topicTagIds",
                "topicTags",
                "chinaGlobalShare",
                "avgDependency",
                "maxDependency",
                "avgHhi",
                "dependentCountryCount",
                "vulnerability",
            )
            for frame in product_frames
        ],
        how="vertical",
    )
    product_trend.write_csv(out / "product_dependency_trend.csv")


def enrich_country_detail_snapshots(pl, out: Path, country_scope_frames, fine_frames, group_frames) -> None:
    if not country_scope_frames:
        return

    country_trend = pl.concat(country_scope_frames, how="vertical_relaxed")
    top_category = (
        pl.concat(group_frames, how="vertical_relaxed")
        .with_columns((pl.col("dependency") * pl.col("importance")).alias("contributionScore"))
        .sort(["year", "scope", "iso3", "contributionScore"], descending=[False, False, False, True])
        .group_by(["year", "scope", "iso3"])
        .first()
        .select("year", "scope", "iso3", pl.col("categoryName").alias("topCategory"))
    )
    country_trend = (
        country_trend.join(top_category, on=["year", "scope", "iso3"], how="left")
        .with_columns(
            pl.col("cdi").rank("ordinal", descending=True).over(["year", "scope"]).alias("rank"),
            pl.len().over(["year", "scope"]).alias("totalCountries"),
        )
        .sort(["scope", "iso3", "year"])
    )

    overall_trend = {}
    for row in country_trend.to_dicts():
        scope = row["scope"]
        iso3 = row["iso3"]
        overall_trend.setdefault(scope, {}).setdefault(iso3, []).append(
            {
                "year": int(row["year"]),
                "cdi": num(row["cdi"]),
                "hhi": num(row["hhi"]),
                "vulnerability": num(row["vulnerability"]),
                "chinaImport": num(row["chinaImport"]),
                "totalImport": num(row["totalImport"]),
                "rank": int(row["rank"]),
                "topCategory": row.get("topCategory") or "",
            }
        )

    def build_category_trend_map(frame, value_key="categoryId"):
        payload = {}
        for row in frame.sort(["scope", "iso3", value_key, "year"]).to_dicts():
            scope = row["scope"]
            iso3 = row["iso3"]
            category_id = row[value_key]
            payload.setdefault(scope, {}).setdefault(iso3, {}).setdefault(category_id, []).append(
                {
                    "year": int(row["year"]),
                    "dependency": num(row["dependency"]),
                    "importance": num(row["importance"]),
                    "hhi": num(row["hhi"]),
                    "vulnerability": num(row["vulnerability"]),
                    "chinaImport": num(row["chinaImport"]),
                    "totalImport": num(row["totalImport"]),
                    "categoryName": row.get("categoryName") or row.get("category") or category_id,
                }
            )
        return payload

    major_trends = build_category_trend_map(pl.concat(group_frames, how="vertical_relaxed"))
    minor_trends = build_category_trend_map(pl.concat(fine_frames, how="vertical_relaxed"))

    structural_change_all = {}
    group_trend = pl.concat(group_frames, how="vertical_relaxed").filter(pl.col("categoryLevel") == "group")
    for scope in sorted(set(group_trend.select("scope").to_series().to_list())):
        scoped_rows = group_trend.filter(pl.col("scope") == scope)
        base_rows = scoped_rows.filter(pl.col("year") == 2007).to_dicts()
        base_map = {}
        for row in base_rows:
            base_map.setdefault(row["iso3"], {})[row["categoryId"]] = {
                "share": num(row["chinaImport"]),
                "name": row["categoryName"],
            }
        for year in sorted(set(scoped_rows.select("year").to_series().to_list())):
            current_rows = scoped_rows.filter(pl.col("year") == year).to_dicts()
            current_map = {}
            for row in current_rows:
                current_map.setdefault(row["iso3"], {})[row["categoryId"]] = {
                    "share": num(row["chinaImport"]),
                    "name": row["categoryName"],
                }
            payload = {}
            for iso3, current_categories in current_map.items():
                base_categories = base_map.get(iso3)
                if not base_categories:
                    continue
                current_total = sum(item["share"] for item in current_categories.values()) or 1.0
                base_total = sum(item["share"] for item in base_categories.values()) or 1.0
                keys = set(current_categories) | set(base_categories)
                change = 0.5 * sum(
                    abs(
                        current_categories.get(key, {}).get("share", 0.0) / current_total
                        - base_categories.get(key, {}).get("share", 0.0) / base_total
                    )
                    for key in keys
                )
                dominant_base = max(base_categories.items(), key=lambda item: item[1]["share"])[1]["name"]
                dominant_current = max(current_categories.items(), key=lambda item: item[1]["share"])[1]["name"]
                payload[iso3] = {
                    "year": int(year),
                    "baseYear": 2007,
                    "iso3": iso3,
                    "scope": scope,
                    "structureChange": change,
                    "changedLevel": structure_change_level(change),
                    "dominantCategoryBase": dominant_base,
                    "dominantCategoryCurrent": dominant_current,
                }
            structural_change_all.setdefault(int(year), {})[scope] = payload

    years = sorted(set(country_trend.select("year").to_series().to_list()))
    scopes = sorted(set(country_trend.select("scope").to_series().to_list()))
    for year in years:
        for scope in scopes:
            yearly_rows = country_trend.filter(
                (pl.col("year") == year) & (pl.col("scope") == scope)
            ).to_dicts()
            for row in yearly_rows:
                iso3 = row["iso3"]
                paths = [out / "drilldown" / "country" / str(year) / scope / f"{iso3}.json"]
                if scope == DEFAULT_SCOPE:
                    paths.extend(
                        [
                            out / "drilldown" / "country" / str(year) / f"{iso3}.json",
                            out / "country_detail" / f"{iso3}_{year}.json",
                        ]
                    )

                for path in paths:
                    if not path.exists():
                        continue
                    payload = json.loads(path.read_text(encoding="utf-8"))
                    payload["scope"] = scope
                    payload["rank"] = int(row["rank"])
                    payload["totalCountries"] = int(row["totalCountries"])
                    payload["overallTrend"] = overall_trend.get(scope, {}).get(iso3, [])
                    payload["trend"] = payload["overallTrend"]
                    payload["majorTrends"] = major_trends.get(scope, {}).get(iso3, {})
                    payload["minorTrends"] = minor_trends.get(scope, {}).get(iso3, {})
                    payload["structuralChange"] = structural_change_all.get(int(year), {}).get(scope, {}).get(iso3)
                    write_json(path, payload)


def write_metadata(out: Path) -> None:
    metadata_dir = out / "metadata"
    metadata_dir.mkdir(parents=True, exist_ok=True)

    payloads = {
        "hs_section_metadata.json": hs_section_metadata(),
        "hs_chapter_metadata.json": hs_chapter_metadata(),
        "category_metadata.json": fine_category_metadata(),
        "category_group_metadata.json": group_category_metadata(),
        "topic_tag_metadata.json": topic_tag_metadata(),
        "scope_metadata.json": scope_metadata(),
    }

    for filename, payload in payloads.items():
        write_json(out / filename, payload)
        write_json(metadata_dir / filename, payload)


def main() -> None:
    args = parse_args()
    pl = require_polars()

    args.out.mkdir(parents=True, exist_ok=True)
    files = yearly_files(args.baci_dir, args.start_year, args.end_year)
    countries, products, centroids, country_meta = load_dimensions(pl, args)
    write_metadata(args.out)

    country_frames = []
    country_scope_frames = []
    fine_frames = []
    group_frames = []
    product_frames = []

    for path in files:
        yearly = process_year(pl, path, args, countries, products, centroids, country_meta)
        country_frames.append(yearly["country_dependency"])
        country_scope_frames.append(yearly["country_scope_metrics"])
        fine_frames.append(yearly["fine_matrix"])
        group_frames.append(yearly["group_matrix"])
        product_frames.append(yearly["product_vulnerability"])

    write_trends(pl, args.out, country_frames, fine_frames, group_frames, product_frames)
    write_structural_change(pl, args.out, group_frames, base_year=2007)
    enrich_country_detail_snapshots(pl, args.out, country_scope_frames, fine_frames, group_frames)
    print(f"Wrote processed data to {args.out}")


if __name__ == "__main__":
    main()
