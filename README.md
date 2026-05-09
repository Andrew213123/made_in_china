# 中国制造依赖网络

基于 CEPII BACI HS07 V202601 数据构建的静态可视分析系统，用于观察 2007-2024 年全球经济体对中国制造进口的结构性依赖。系统包含全球空间分布、国家画像、结构矩阵、流向分析、产品脆弱性和方法说明等页面。

本仓库面向 GitHub Pages 部署：保留前端源码、Cesium 运行时和已经处理好的 `processed` 运行数据；删除原始 BACI CSV、地理边界源数据、`node_modules` 与本地临时文件。

## 在线部署

仓库根目录就是静态站点入口：

```text
index.html
```

已包含 GitHub Pages 工作流。推送到 `main` 后，可在 GitHub 仓库的 Pages 设置中选择 GitHub Actions 发布。

## 本地运行

在项目根目录启动静态服务：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

如果 Windows 中 `python` 指向 Microsoft Store 占位程序，可改用：

```powershell
py -3 -m http.server 8000 --bind 127.0.0.1
```

打开：

```text
http://127.0.0.1:8000/index.html
```

## 仓库保留内容

为保证 GitHub Pages 与本地演示功能一致，仓库保留：

- `index.html`、`styles.css`、`src/*.js`
- `Cesium-1.139.1/Build/Cesium/**`
- `public/data/dashboard_processed.js`
- `public/data/world_countries_simplified.geojson`
- `public/data/country_meta.csv`
- `public/data/country_centroids.csv`
- `public/data/processed/annual/**`
- `public/data/processed/metadata/**`
- `public/data/processed/drilldown/**`
- `public/data/processed/country_dependency_trend.csv`
- `public/data/processed/product_dependency_trend.csv`
- 年度 compact 与 fallback 数据文件，如 `country_category_matrix_*.csv`、`country_topic_matrix_*.csv`、`product_vulnerability_*.csv`
- `scripts/*.py` 与 `docs/*.md`

已排除：

- `public/data/BACI_HS07_V202601/` 原始 BACI CSV
- `public/data/geoboundaries/`、`public/data/natural_earth/` 地理源数据
- `public/data/processed/country_detail/` 旧版国家详情备份，当前运行使用 `processed/drilldown/country`
- `public/data/processed/category_dependency_trend.csv`，该文件超过 GitHub 普通仓库 100MB 单文件限制，且当前前端运行路径不调用
- `node_modules/`、本地 Agent 配置、临时测试文件

## 数据口径

BACI 原始字段：

| 字段 | 含义 |
| --- | --- |
| `t` | year |
| `i` | exporter |
| `j` | importer |
| `k` | HS6 product |
| `v` | trade value, thousand USD |
| `q` | quantity |

项目默认将 `i = CHN` 解释为中国大陆出口来源，不默认合并 `HKG`，以避免转口贸易干扰主口径。

默认分析范围：

```text
manufactures = HS28-HS96
```

系统同时保留：

```text
analysis_major / analysis_minor / hs_chapter / topic_tag
```

详细分类标准见：

- [docs/goods-classification-standard.md](docs/goods-classification-standard.md)
- [docs/baci-processing.md](docs/baci-processing.md)
- [docs/data-contract.md](docs/data-contract.md)

## 指标说明

- `CDI`：中国制造进口依赖水平。
- `HHI`：进口来源集中度。
- `Vulnerability`：结构性脆弱性指标，用于比较和筛选，不代表真实断供概率。

## 重新预处理

如需从原始 BACI 重新生成数据，请先将原始数据恢复到：

```text
public/data/BACI_HS07_V202601/
```

然后运行：

```powershell
python scripts/preprocess_baci.py `
  --baci-dir public/data/BACI_HS07_V202601 `
  --out public/data/processed `
  --centroids public/data/country_centroids.csv `
  --country-meta public/data/country_meta.csv `
  --frontend-mode compact
```

重新生成首屏数据包：

```powershell
python scripts/build_dashboard_data.py `
  --processed public/data/processed `
  --out public/data/dashboard_processed.js
```

## 许可与数据声明

代码采用 MIT License。BACI 原始数据及其派生数据的使用需遵守 CEPII BACI 数据来源与授权说明；本仓库代码许可不覆盖第三方数据版权。
