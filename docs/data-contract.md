# 前端数据契约

当前前端默认加载：

```text
public/data/dashboard_processed.js
```

该文件由 `public/data/processed/` 下的年度 JSON/CSV 和趋势文件汇总生成，目的是避免浏览器直接读取大型原始 BACI CSV。

## 顶层结构

```js
window.DASHBOARD_DATA = {
  years: [],
  defaults: {},
  scopes: [],
  hsSections: [],
  categories: [],
  categoriesMajor: [],
  categoriesMinor: [],
  topicTags: [],
  china: {},
  countries: [],
  products: [],
  source: {}
}
```

## 兼容字段说明

### `categories`

为当前前端保留的兼容字段，默认提供“制造品核心大类”。

```js
{
  id: "J",
  name: "机械、电气与电子设备",
  color: "#58a6ff"
}
```

### `categoriesMajor`

分析型大类元数据，对应 `analysis_major`。

```js
{
  id: "D",
  name: "化学品、医药与高分子材料",
  color: "#b392f0",
  chapters: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
  isDefaultManufacturing: true
}
```

### `categoriesMinor`

分析型小类元数据，对应 `analysis_minor`。

```js
{
  id: "J02",
  name: "电气、电子、通信与音视频设备",
  color: "#58a6ff",
  groupId: "J",
  groupName: "机械、电气与电子设备",
  scope: "manufactures",
  chapters: [85]
}
```

### `topicTags`

```js
{
  id: "battery_chain",
  name: "电池产业链",
  color: "#4ecdc4"
}
```

## `countries`

```js
{
  iso3: "IND",
  name: "India",
  region: "South Asia",
  incomeGroup: "Lower middle income",
  lon: 78.96,
  lat: 20.59,
  cdi: {
    "2007": 0.21,
    "2008": 0.22,
    "2024": 0.47
  },
  hhi: 0.49,
  vulnerability: 0.64,
  totalImport: 488000000,
  chinaImport: 207000000,
  topCategory: "机械、电气与电子设备",
  categories: {
    "J": {
      dependency: 0.62,
      hhi: 0.56,
      importance: 0.24,
      vulnerability: 0.71
    }
  }
}
```

说明：

- `cdi`：按年份展开的国家总体 CDI 序列
- `categories`：当前前端默认使用的大类矩阵映射

## `products`

```js
{
  hs6: "850760",
  name: "Lithium-ion batteries",
  category: "J",
  categoryName: "机械、电气与电子设备",
  analysisMinorId: "J02",
  analysisMinorName: "电气、电子、通信与音视频设备",
  analysisMajorId: "J",
  analysisMajorName: "机械、电气与电子设备",
  topicTags: "green_manufacturing|battery_chain|ev_chain",
  globalImport: 126000000,
  chinaGlobalSupply: 52000000,
  chinaGlobalShare: 0.52,
  avgDependency: 0.46,
  maxDependency: 0.88,
  avgHhi: 0.49,
  dependentCountryCount: 87,
  vulnerability: 0.68,
  strategic: true
}
```

## `public/data/processed/` 关键文件

### `country_dependency_YYYY.json`

国家级指标，用于 Globe、KPI 和国家排序。

### `trade_flows_YYYY.json`

中国到各国的重点流向，用于地球弧线。

### `country_category_matrix_YYYY.csv`

同时包含：

- `categoryLevel = fine`
- `categoryLevel = group`

并带有：

- `scope`
- `categoryId`
- `categoryName`
- `parentGroupId`

示例：

```csv
year,iso3,country,categoryLevel,categoryId,categoryName,parentGroupId,scope,dependency,hhi,importance,vulnerability,chinaImport,totalImport
2024,JPN,Japan,fine,J02,电气、电子、通信与音视频设备,J,manufactures,0.42,0.31,0.24,0.35,123,456
2024,JPN,Japan,group,J,机械、电气与电子设备,,manufactures,0.38,0.29,0.31,0.33,234,567
```

### `country_topic_matrix_YYYY.csv`

国家—专题标签矩阵。

### `product_vulnerability_YYYY.csv`

产品靶盘与产品级分析数据。

### `country_supplier_structure_YYYY.json`

来源结构摘要。

### `country_dependency_breadth_YYYY.json`

依赖广度摘要。

### `country_structural_change_YYYY.json`

结构变化摘要。

## 兼容策略

当前前端仍以 `categories` 作为默认类别集合，因此 `dashboard_processed.js` 会继续提供这一兼容字段。更丰富的分类层级已通过：

- `categoriesMajor`
- `categoriesMinor`
- `hsSections`
- `topicTags`

对外暴露，供后续前端升级使用。
