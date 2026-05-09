# BACI 原始数据处理口径

本项目使用 `BACI HS07 Version 202601`。数据粒度为：

```text
year × exporter × importer × HS6 product
```

原始字段：

| 字段 | 含义 | 项目解释 |
| --- | --- | --- |
| `t` | year | 年份 |
| `i` | exporter | 出口国，即供应来源 |
| `j` | importer | 进口国，即依赖分析对象 |
| `k` | product | HS6 商品编码 |
| `v` | value | 贸易额，通常为千美元 |
| `q` | quantity | 数量，当前前端不作为主指标 |

## 中国口径

项目默认仅将 `CHN` 视为中国大陆口径，不默认合并 `HKG`。如需敏感性分析，可在预处理时使用：

```powershell
--include-hong-kong
```

## 默认分析范围

默认主分析范围为：

```text
manufactures = HS28–96
```

同时预处理过程保留对 `HS01–97` 全部商品的分类和聚合能力。

## 商品分类标准

本项目采用四层分类：

```text
Scope → analysis_major → analysis_minor → HS6
```

其中：

- `Scope`：控制分析口径，如 `all_goods`、`manufactures`
- `analysis_major`：适合宏观图表展示的大类
- `analysis_minor`：适合下拉框、Top 类别贡献和细分类矩阵的小类
- `topic_tag`：跨章节专题标签，如绿色制造、电池产业链、半导体链

完整分类规则见 [goods-classification-standard.md](goods-classification-standard.md)。

## 核心指标

对每个进口国 `j`、产品 `k`、年份 `t`：

```text
D(j,k,t) = V(CHN,j,k,t) / Σ_i V(i,j,k,t)
```

其中 `D(j,k,t)` 表示某国某产品对中国的进口依赖度。

国家层面的中国制造依赖指数：

```text
CDI(j,t) = CountryChinaImport(j,t) / CountryTotalImport(j,t)
```

来源集中度：

```text
HHI(j,k,t) = Σ_i share(i,j,k,t)^2
```

中国全球供给占比：

```text
S(k,t) = Σ_j V(CHN,j,k,t) / Σ_i Σ_j V(i,j,k,t)
```

产品结构性脆弱性：

```text
Vulnerability(j,k,t)
= 0.35 × D(j,k,t)
+ 0.25 × HHI(j,k,t)
+ 0.25 × W(j,k,t)
+ 0.15 × S(k,t)
```

其中 `W(j,k,t)` 表示产品在该国制造业进口中的重要性。

说明：

- `Vulnerability` 是结构性指标
- 它不等同于真实断供概率
- 它不包含库存、替代能力、合同约束和政策干预等现实因素

## 处理命令

```powershell
py -3 -m pip install -r requirements.txt
py -3 scripts/preprocess_baci.py `
  --baci-dir public/data/BACI_HS07_V202601 `
  --out public/data/processed `
  --centroids public/data/country_centroids.csv `
  --country-meta public/data/country_meta.csv
```

常用可选参数：

```powershell
--start-year 2007
--end-year 2024
--include-hong-kong
--min-display-import 1000
--top-flows 40
--skip-country-detail
```

## 主要输出

年度输出：

- `country_dependency_YYYY.json`
- `trade_flows_YYYY.json`
- `country_category_matrix_YYYY.csv`
- `country_topic_matrix_YYYY.csv`
- `product_vulnerability_YYYY.csv`
- `country_supplier_structure_YYYY.json`
- `country_dependency_breadth_YYYY.json`
- `country_structural_change_YYYY.json`
- `country_detail/ISO3_YYYY.json`

跨年趋势输出：

- `country_dependency_trend.csv`
- `category_dependency_trend.csv`
- `product_dependency_trend.csv`

元数据输出：

- `category_metadata.json`
- `category_group_metadata.json`
- `topic_tag_metadata.json`
- `scope_metadata.json`
- `hs_section_metadata.json`
- `hs_chapter_metadata.json`
