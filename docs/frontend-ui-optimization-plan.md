# 中国制造依赖网络前端优化方案

项目名称：`中国制造依赖网络：2007–2024 年全球供应链结构演化可视化`

英文副标题：`China Manufacturing Dependency Network: Visualizing the Evolution of Global Supply Chain Dependence, 2007–2024`

## 0. 基于当前项目的判断

当前项目已经具备可用的数据资产、核心图表类型和静态部署能力，但前端仍停留在“单页数据展示”的阶段。

从现有代码看：

- [index.html](</c:/Users/Administrator/Desktop/中国制造依赖网络：全球供应链中的结构性依赖可视化/index.html:15>) 已经包含总览、矩阵、流向、靶盘、洞察、方法六个 section，但缺少独立的 `Country` 页面，首页也没有形成清晰的观测台结构。
- [styles.css](</c:/Users/Administrator/Desktop/中国制造依赖网络：全球供应链中的结构性依赖可视化/styles.css:123>) 已形成深色半透明面板基础，但整体还是“左中右三栏仪表盘”，信息密度分配不均，底部时间控制和顶部导航的层级不够清楚。
- [src/app.js](</c:/Users/Administrator/Desktop/中国制造依赖网络：全球供应链中的结构性依赖可视化/src/app.js:4>) 采用单文件集中管理状态、Cesium、ECharts 和交互逻辑，已经能跑通功能，但不利于继续做系统性优化。
- [src/data-loader.js](</c:/Users/Administrator/Desktop/中国制造依赖网络：全球供应链中的结构性依赖可视化/src/data-loader.js:3>) 已经有按年份缓存能力，这为后续首屏瘦身、按需加载和局部刷新提供了很好的基础。

这次优化不建议推翻技术路线，而是把现有项目升级为一个更有记忆点、更清晰的“全球制造依赖观测台”。

## 1. 页面信息架构

建议将站点重组为 7 个主视图，保留单页静态应用，但通过顶部导航和锚点 section 明确用户当前位置。

### 一级导航

1. `Globe` 全球依赖总览
2. `Country` 国家依赖画像
3. `Matrix` 国家-产品类别矩阵
4. `Flow` 中国制造流向分析
5. `Target` 产品脆弱性靶盘
6. `Insights` 数据洞察故事线
7. `Method` 数据与方法说明

### 导航原则

- 顶部导航始终固定，显示当前页面高亮。
- 导航右侧保留全局控制：当前年份、指标、帮助入口。
- `Country` 不是附属面板，而是从首页右侧画像扩展出来的独立分析页。
- `Globe` 负责回答“空间格局与全球分布”。
- `Country` 负责回答“单个国家依赖结构是什么”。
- `Matrix` 负责回答“国家与产品结构的组合差异是什么”。
- `Flow` 负责回答“中国产品通过哪些类别流向哪些国家/区域/收入组”。
- `Target` 负责回答“哪些 HS6 产品同时高依赖、高集中、高重要”。
- `Insights` 负责课堂展示叙事。
- `Method` 负责学术可信度和指标解释。

## 2. 首页布局优化

首页保留左筛选、中地球、右画像的主框架，但改为“观测台”式编排。

### 首页布局

- 顶部固定导航
  - 左：项目标题 + 英文副标题
  - 中：7 个主视图导航
  - 右：年份、指标切换、帮助入口
- 主体三栏
  - 左侧：筛选控制台
  - 中央：3D 地球主视图
  - 右侧：国家依赖画像
- 底部联动带
  - 全球 KPI 条
  - 年份时间轴
  - 矩阵预览条或迷你热力条

### 首页第一屏必须回答的问题

- 这是什么项目：
  顶部标题区用一句短说明固定解释为“全球制造依赖观测台”。
- 当前看的是什么年份：
  顶部年份芯片和底部时间轴同时显示。
- 颜色代表什么：
  左侧图例卡明确说明冷暖色从低依赖到高依赖。
- 中国制造流向哪里：
  地球上弧线默认展示 Top 40，底部 KPI 给出最大流向国家。
- 哪些国家依赖更高：
  地球暖色高亮，叠加少量高依赖标签。
- 点击国家后能看什么：
  右侧画像面板标题下方显示“点击国家查看结构画像与趋势”。

### 现有首页建议改造

- 将目前地球顶部的 KPI 条从浮层改为更稳定的底部摘要带。
- 将右侧详情从“数字 + 列表”改成 5 段式画像面板。
- 将顶部 `mode-chip` 与左侧 `metricSelect` 合并为同一全局控制，避免重复。
- 增加 `Country` 深入页按钮，让右侧画像成为独立分析入口。

## 3. 各分析页布局优化

### Globe 页

- 保持现有三栏结构，但强化中央主视图权重。
- 左侧筛选用分组卡片替代线性表单。
- 右侧国家画像按“身份、指标、趋势、结构、解读”分区。
- 底部时间轴强化关键年份标记：`2008`、`2018`、`2020`、`2024`。

### Country 页

独立新增页面，不改变数据来源，只复用国家详情数据。

- 顶部：国家名、区域、收入组、全球排名、返回 Globe
- 左列：CDI / HHI / Vulnerability / 中国制造品进口额 / 制造业总进口额
- 中列：2007–2024 趋势折线
- 右列：自动解读文本
- 下方两栏：
  - 产品类别结构条形图
  - Top HS6 产品列表

### Matrix 页

当前矩阵页可保留 ECharts 热力图方案，但布局需升级为“依赖结构地图”。

- 页面顶部增加排序控制：
  `按 CDI`、`按区域`、`按收入组`、`按某类别`
- 左上保留说明短句，不写长段解释。
- 矩阵上方增加当前 metric、year、category filter 状态条。
- 右侧增加单元格详情抽屉：
  点击某格时展示该国家该类别的 Top HS6 产品。

### Flow 页

- 将当前桑基图升级为三模式切换：
  `China -> Category -> Region`
  `China -> Category -> Country`
  `China -> Category -> Income Group`
- 默认模式为 `Region`。
- 页面右侧增加模式说明和当前 Top 类别摘要。
- 高依赖流提高亮度，低依赖流降低透明度。

### Target 页

- 靶盘作为视觉记忆点，保持主图居中。
- 左上增加说明图例：
  半径、点大小、颜色、光晕、边框分别代表什么。
- 右侧产品详情面板升级为：
  HS6、名称、类别、脆弱性、中国供给占比、平均依赖度、依赖国家数量、趋势、Top 10 国家。
- 底部增加“高关注产品名单”条带，便于展示时快速点选。

### Insights 页

当前洞察页内容偏静态，需要改为 4 张数据驱动洞察卡。

- 每张卡包含：
  - 一句结论
  - 一个小图
  - 一个跳转按钮
- 推荐结构：
  - 洞察 1：全球平均 CDI 是否上升
  - 洞察 2：CDI 增长最快国家
  - 洞察 3：高依赖国家最多的产品类别
  - 洞察 4：脆弱性最高 HS6 产品

### Method 页

- 改成学术卡片式布局，而不是连续长文。
- 每个模块单独成卡：
  数据来源、字段定义、项目口径、产品范围、CDI、HHI、Vulnerability、局限性。
- 公式与局限性单独突出显示。
- 页面尾部保留参考资料链接。

## 4. 颜色与视觉规范

建议以现有深色体系为基础收敛，而不是走强霓虹风。

### 核心色板

```css
--bg-main: #06111F;
--bg-panel: rgba(8, 20, 36, 0.78);
--border-soft: rgba(105, 229, 255, 0.22);

--low-dependency: #2F81F7;
--mid-low-dependency: #2DD4BF;
--mid-high-dependency: #F5B84B;
--high-dependency: #FF6B4A;
--extreme-dependency: #D7263D;

--china-highlight: #FFD166;
--trade-flow: #69E5FF;

--text-main: #EEF7FF;
--text-secondary: #9FB4C9;
--text-muted: #65758B;
```

### 风格规范

- 空间背景克制，避免廉价大屏光污染。
- 中国固定金色，不参与普通色标。
- 暖色只表示风险和高依赖，不承担普通装饰功能。
- 面板统一使用深色半透明玻璃层，不再混用不同亮度的卡片底。
- 数字指标采用等宽数字风格，保证扫读。
- 文字说明保持短句，不写段落堆叠。

### 字体建议

结合 `ui-ux-pro-max` 的检索结果，不建议直接采用强赛博风，而是折中为：

- 标题：`Exo` 或 `IBM Plex Sans`
- 正文：`Inter` 或 `IBM Plex Sans`
- 数字与代码：`Roboto Mono` 或 `IBM Plex Mono`

原因：

- 保留研究感和技术感。
- 保持中文兼容与阅读稳定性。
- 避免纯终端风破坏课程展示的可读性。

## 5. 交互联动规则

### 全局联动

- `year` 改变：
  Globe、Country、Matrix、Flow、Target、Insights 同步更新。
- `metric` 改变：
  Globe 着色、Matrix 色标、Country 核心指标、Insights 对应指标同步更新。
- `category` 改变：
  Globe 热力与弧线过滤、Country 结构图、Matrix 高亮列、Flow 模式数据、Target 筛选联动。
- `region` / `incomeGroup` 改变：
  Globe 国家范围、Matrix 行集、Flow 节点、KPI 统计联动。
- `threshold` 改变：
  Globe 弧线、热力显示、Target 产品集、KPI 中高依赖国家数同步变化。

### Globe 页交互

- Hover 国家：
  显示简洁 tooltip，包含国家名、区域、CDI、HHI、Vulnerability。
- Click 国家：
  高亮国家、多条相关弧线、右侧画像更新，并提供进入 `Country` 页入口。
- Click 标签：
  与点击国家一致。
- 时间轴播放：
  自动更新所有视图，但不重复触发全量 re-init。

### Matrix 页交互

- Hover 单元格：
  显示完整指标。
- Click 单元格：
  设置 `selectedCountry` + `selectedCategory`，并打开右侧详情抽屉。
- Click 行标签：
  跳转 Country 页。
- Click 列标题：
  切换为该类别高亮模式。

### Flow 页交互

- Hover 流：
  显示类别、目标、价值量、依赖度。
- Click 节点：
  将对应类别或区域同步回全局筛选。

### Target 页交互

- Hover 点：
  显示 HS6、类别、脆弱性、中国供给占比、依赖国家数。
- Click 点：
  右侧详情更新，并同步类别筛选。

### Insights 页交互

- 每张卡的“跳转查看”按钮都要带上下文跳转：
  - 到 Country 页并定位国家
  - 到 Matrix 页并高亮类别
  - 到 Target 页并定位产品

## 6. 数据加载策略

当前 [src/data-loader.js](</c:/Users/Administrator/Desktop/中国制造依赖网络：全球供应链中的结构性依赖可视化/src/data-loader.js:130>) 已经按年份打包加载四类数据，可以在此基础上做更细的懒加载和缓存组织。

### 首屏策略

- 首屏只加载 `dashboard_processed.js`
- 同时预取当前默认年份的：
  - `country_dependency_YEAR.json`
  - `trade_flows_YEAR.json`
  - `country_category_matrix_YEAR.csv`
  - `product_vulnerability_YEAR.csv`
- 国家详情 `country_detail/ISO3_YEAR.json` 保持点击后加载

### 建议缓存结构

```js
const cache = {
  countryDependency: new Map(),
  tradeFlows: new Map(),
  categoryMatrix: new Map(),
  productVulnerability: new Map(),
  countryDetail: new Map(),
  countryTrend: null,
  categoryTrend: null,
  productTrend: null
};
```

### 加载原则

- 切换年份时优先命中缓存。
- 切换筛选项时只做内存过滤，不重新请求。
- `Insights` 页优先使用已加载的 trend 表，不额外请求。
- 对大文件加载增加：
  - loading skeleton
  - empty state
  - error state

### 错误提示

- 地球数据失败：顶部状态条提示“空间数据加载失败”
- 年份数据失败：面板提示“该年份数据未能加载，请重试”
- 国家详情失败：右侧卡片提示“未找到该国家详细产品结构”

## 7. 工程模块拆分

建议将当前 [src/app.js](</c:/Users/Administrator/Desktop/中国制造依赖网络：全球供应链中的结构性依赖可视化/src/app.js:307>) 中的状态、视图渲染和事件全部拆开，但继续保持无构建静态模块路线。

### 目录结构

```text
src/
  state.js
  data-loader.js
  globe.js
  charts.js
  detail-panel.js
  insights.js
  utils.js
  app.js
```

### 模块职责

`state.js`

- 管理全局状态：
  `year`, `selectedCountry`, `selectedCategory`, `selectedRegion`, `selectedIncome`, `metric`, `threshold`
- 提供订阅和派发机制
- 明确“全局状态变更”和“局部 UI 状态变更”

`data-loader.js`

- 加载首屏索引数据
- 加载年份 bundle
- 加载国家详情
- 管理缓存与错误包装

`globe.js`

- Cesium 初始化
- 国家热力层
- 中国源点
- 贸易弧线
- Hover / click picking
- 相机聚焦

`charts.js`

- 趋势图
- 矩阵图
- 桑基图
- 靶盘图
- 统一 resize 和 dispose

`detail-panel.js`

- Country 画像卡
- Product 画像卡
- 自动解读文本
- 排名与产品结构摘要

`insights.js`

- 读取 trend / bundle 自动生成洞察卡
- 生成跳转上下文

`utils.js`

- 颜色映射
- 数值格式化
- 排序、筛选、节流
- tooltip 和 legend 构造

`app.js`

- 初始化顺序
- 路由和 section 切换
- 绑定 DOM
- 调用各模块 render

## 8. 性能优化建议

### 必做项

1. 首屏只加载索引数据。
2. 年份数据按需加载并缓存。
3. 地球弧线默认只渲染 Top 40。
4. 矩阵默认 Top 40 国家。
5. 靶盘默认 Top 200 产品。
6. `resize` 节流，避免所有图频繁重算。
7. `year` 切换时不重建 Cesium Viewer。
8. 切换筛选仅刷新受影响组件。
9. 加载和错误状态显式可见。

### 组件级性能策略

- `Globe`
  - 国家层和弧线层分离更新
  - 相同 geometry 尽量复用
  - 标签数量限制为 Top 5 或 Top 8
- `Matrix`
  - 国家数量分页或 Top N
  - 列标题固定
  - 长列表用滚动容器而不是整页撑高
- `Flow`
  - 默认只取 Top 6 类别 x Top 10 目标
- `Target`
  - 默认只渲染 Top 200 产品
  - 大小、光晕、边框一次性映射，避免 hover 时整体重算

### 用户感知性能

- 初次进入首页先显示布局骨架，再填充图表。
- 年份切换时显示顶部 loading bar，而不是全屏阻断。
- 国家详情单独 loading，不阻塞地球交互。

## 9. 课程展示路线

建议把系统的课堂展示路径固定为 6 步。

1. `Globe`
   从 2024 年总览进入，回答“全球哪些国家更依赖中国制造”。
2. `Timeline`
   播放 2007–2024，解释关键年份冲击与格局变化。
3. `Country`
   选择印度、越南、德国、美国等案例，比较不同类型依赖画像。
4. `Matrix`
   解释依赖不是国家总排名问题，而是国家 x 产品类别结构问题。
5. `Target`
   展示高脆弱 HS6 产品，强化“高依赖 + 高集中 + 高重要”的概念。
6. `Method`
   收束到数据、公式、口径与局限性，保证课程表达严谨。

### 课堂呈现原则

- 每页只回答一个核心问题。
- 每页最多保留 1 个主图 + 1 个辅助图层级。
- 自动解读文本必须短。
- 指标说明必须随处可达。

## 10. 可直接指导开发的修改清单

### 信息架构

- 顶部导航从 6 项改为 7 项，新增 `Country`
- 首页右侧画像新增进入 `Country` 页入口
- 全局控制统一放到顶部，不重复散落

### HTML 结构

- 重构 [index.html](</c:/Users/Administrator/Desktop/中国制造依赖网络：全球供应链中的结构性依赖可视化/index.html:41>) 的首页 section
- 新增 `country` section
- `insights` 改为四卡结构 + 小图容器 + 跳转按钮
- `docs` 改为卡片分组结构

### CSS

- 重写根变量，使其与依赖色板一致
- 给左侧筛选区增加分组卡组件
- 给右侧画像增加身份卡、指标卡、趋势卡、结构卡、解读卡
- 把底部时间轴和 KPI 条整合成统一底栏
- 加入移动端单列布局下的主次顺序控制

### JavaScript

- 拆分 [src/app.js](</c:/Users/Administrator/Desktop/中国制造依赖网络：全球供应链中的结构性依赖可视化/src/app.js:4>) 为多模块
- 把状态管理抽到 `state.js`
- 把 `renderDetail` 抽到 `detail-panel.js`
- 把 `renderMatrix`、`renderSankey`、`renderTarget` 抽到 `charts.js`
- 把 `renderInsights` 抽到 `insights.js`

### 数据与缓存

- 扩展 [src/data-loader.js](</c:/Users/Administrator/Desktop/中国制造依赖网络：全球供应链中的结构性依赖可视化/src/data-loader.js:3>) 的缓存结构
- 区分年份缓存与国家详情缓存
- 增加失败重试与错误提示

### 交互

- Hover tooltip 统一样式
- 点击国家后同步高亮地球、画像、矩阵行
- 时间轴播放支持暂停和关键年份跳点
- 洞察卡支持带上下文跳转

### 内容表达

- 重写 Country 自动解读文本生成逻辑，避免模板痕迹过重
- 重写 Insights 页文案，使其由数据驱动生成
- 重写 Method 页为结构化方法卡片

## 实施优先级

### P1：先完成

- 顶部导航重组
- 首页三栏层级重做
- 右侧国家画像重构
- 底部时间轴 + KPI 条重构

### P2：随后完成

- 新增 Country 页
- Matrix 页排序和抽屉详情
- Flow 页三模式切换
- Target 页图例与详情升级

### P3：最后完成

- Insights 数据驱动化
- Method 页学术卡片化
- 模块拆分与性能整理

## 结论

这次优化的方向不是增加更多图表，而是重新组织现有图表的主次关系，让项目从“带数据的前端页面”升级为“可解释、可叙事、可课堂展示、可持续维护的全球制造依赖观测台”。

保留现有 GitHub Pages 静态部署路线是正确的。下一步开发应优先改首页与状态架构，再逐页提升分析深度和叙事能力。
