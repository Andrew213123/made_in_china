(function () {
  "use strict";

  /**
   * 中国制造依赖网络：Cesium 3D Globe 主控制文件
   * 适配：零构建静态网页 + Cesium CDN + ECharts + D3 + dashboard_processed.js
   *
   * 建议加载顺序：
   * 3. public/data/dashboard_processed.js
   * 4. src/utils.js
   * 5. src/state.js
   * 6. src/data-loader.js
   * 7. src/detail-panel.js
   * 8. src/charts.js
   * 9. src/app.js
   */

  const indexData = window.DASHBOARD_DATA;
  const loader = window.AppDataLoader;
  const state =
    window.AppState?.createInitialState(indexData || { years: [2024] }) || {};
  const utils = window.AppUtils || {};
  const detailPanel = window.AppDetailPanel || {};
  const charts = window.AppCharts || {};

  const {
    debounce = fallbackDebounce,
    escapeHtml = fallbackEscapeHtml,
    formatTradeValue = fallbackFormatTradeValue,
    cssColorForValue = fallbackCssColorForValue
  } = utils;

  if (!indexData || !loader || !window.Cesium) {
    console.error(
      "Missing required modules: DASHBOARD_DATA / AppDataLoader / Cesium"
    );
    return;
  }

  const Cesium = window.Cesium;

  /**
   * --------------------------------------------------------------------------
   * Visual constants
   * --------------------------------------------------------------------------
   */

  const WORLD_GEOJSON_FALLBACKS = [
    "./public/data/geoboundaries/adm0.geojson",
    "./public/data/processed/world_countries_simplified.geojson",
    "./public/data/world_countries_simplified.geojson"
  ];
  const COUNTRY_TRANSLATION_URL =
    "./public/data/geoboundaries/translation-cache.json";
  const LOCAL_NATURAL_EARTH_URL = Cesium.buildModuleUrl(
    "Assets/Textures/NaturalEarthII"
  );

  const EARTH_RADIUS = Cesium.Ellipsoid.WGS84.maximumRadius;
  const DEFAULT_DISTANCE = EARTH_RADIUS + 15_800_000;
  const MIN_DISTANCE = EARTH_RADIUS + 1_250_000;
  const MAX_DISTANCE = EARTH_RADIUS + 36_000_000;

  const DEFAULT_CAMERA = {
    lon: Cesium.Math.toRadians(88),
    lat: Cesium.Math.toRadians(28),
    distance: DEFAULT_DISTANCE
  };

  const ROTATE_RATE = 0.032;

  const FLOW_LIMIT = 24;
  const GLOBAL_PRIMARY_FLOW_LIMIT = 10;
  const REGION_FLOW_LIMIT = 2;
  const LABEL_LIMIT = 8;
  const MATRIX_LIMIT = 40;
  const TARGET_LIMIT = 220;
  const SECTION_DATA_IDS = ["overview", "country", "matrix", "flows", "target", "game", "docs"];

  const COUNTRY_BASE_FILL = "#14263a";
  const COUNTRY_BASE_BORDER = "#7fd8ff";

  const COUNTRY_INACTIVE_FILL_ALPHA = 0.10;
  const COUNTRY_ACTIVE_FILL_ALPHA = 0.50;
  const COUNTRY_HOVER_FILL_ALPHA = 0.72;
  const COUNTRY_SELECTED_FILL_ALPHA = 0.82;

  const COUNTRY_INACTIVE_BORDER_ALPHA = 0.22;
  const COUNTRY_ACTIVE_BORDER_ALPHA = 0.48;
  const COUNTRY_HOVER_BORDER_ALPHA = 0.88;
  const COUNTRY_SELECTED_BORDER_ALPHA = 0.98;

  const BOUNDARY_ALTITUDE = 14_000;
  const BOUNDARY_POINT_PRECISION = 4;
  const BOUNDARY_DATELINE_THRESHOLD = 170;

  const CHINA_GOLD = "#ffd166";
  const CHINA_RED = "#aa381e";
  const CHINA_RED_EDGE = "#ffb77b";
  const CYAN_LINE = "#69e5ff";

  const COUNTRY_ZH_FALLBACK = {
    ABW: "阿鲁巴",
    AFG: "阿富汗",
    AGO: "安哥拉",
    AIA: "安圭拉",
    ALB: "阿尔巴尼亚",
    AND: "安道尔",
    ANT: "荷属安的列斯",
    ARE: "阿联酋",
    ARG: "阿根廷",
    ARM: "亚美尼亚",
    ASM: "美属萨摩亚",
    ATF: "法属南部和南极领地",
    ATG: "安提瓜和巴布达",
    AUS: "澳大利亚",
    AUT: "奥地利",
    AZE: "阿塞拜疆",
    BDI: "布隆迪",
    BEL: "比利时",
    BEN: "贝宁",
    BES: "博奈尔",
    BFA: "布基纳法索",
    BGD: "孟加拉国",
    BGR: "保加利亚",
    BHR: "巴林",
    BHS: "巴哈马",
    BIH: "波黑",
    BLM: "圣巴泰勒米",
    BLR: "白俄罗斯",
    BLZ: "伯利兹",
    BMU: "百慕大",
    BOL: "玻利维亚",
    BRA: "巴西",
    BRB: "巴巴多斯",
    BRN: "文莱",
    BTN: "不丹",
    BWA: "博茨瓦纳",
    CAF: "中非",
    CAN: "加拿大",
    CCK: "科科斯群岛",
    CHE: "瑞士",
    CHL: "智利",
    CHN: "中国",
    CIV: "科特迪瓦",
    CMR: "喀麦隆",
    COD: "刚果（金）",
    COG: "刚果（布）",
    COK: "库克群岛",
    COL: "哥伦比亚",
    COM: "科摩罗",
    CPV: "佛得角",
    CRI: "哥斯达黎加",
    CUB: "古巴",
    CUW: "库拉索",
    CXR: "圣诞岛",
    CYM: "开曼群岛",
    CYP: "塞浦路斯",
    CZE: "捷克",
    DEU: "德国",
    DJI: "吉布提",
    DMA: "多米尼克",
    DNK: "丹麦",
    DOM: "多米尼加",
    DZA: "阿尔及利亚",
    ECU: "厄瓜多尔",
    EGY: "埃及",
    ERI: "厄立特里亚",
    ESP: "西班牙",
    EST: "爱沙尼亚",
    ETH: "埃塞俄比亚",
    FIN: "芬兰",
    FJI: "斐济",
    FLK: "福克兰群岛",
    FRA: "法国",
    FSM: "密克罗尼西亚",
    GAB: "加蓬",
    GBR: "英国",
    GEO: "格鲁吉亚",
    GHA: "加纳",
    GIB: "直布罗陀",
    GIN: "几内亚",
    GMB: "冈比亚",
    GNB: "几内亚比绍",
    GNQ: "赤道几内亚",
    GRC: "希腊",
    GRD: "格林纳达",
    GRL: "格陵兰",
    GTM: "危地马拉",
    GUM: "关岛",
    GUY: "圭亚那",
    HKG: "中国香港",
    HND: "洪都拉斯",
    HRV: "克罗地亚",
    HTI: "海地",
    HUN: "匈牙利",
    IDN: "印度尼西亚",
    IND: "印度",
    IOT: "英属印度洋领地",
    IRL: "爱尔兰",
    IRN: "伊朗",
    IRQ: "伊拉克",
    ISL: "冰岛",
    ISR: "以色列",
    ITA: "意大利",
    JAM: "牙买加",
    JOR: "约旦",
    JPN: "日本",
    KAZ: "哈萨克斯坦",
    KEN: "肯尼亚",
    KGZ: "吉尔吉斯斯坦",
    KHM: "柬埔寨",
    KIR: "基里巴斯",
    KNA: "圣基茨和尼维斯",
    KOR: "韩国",
    KWT: "科威特",
    LAO: "老挝",
    LBN: "黎巴嫩",
    LBR: "利比里亚",
    LBY: "利比亚",
    LCA: "圣卢西亚",
    LKA: "斯里兰卡",
    LSO: "莱索托",
    LTU: "立陶宛",
    LUX: "卢森堡",
    LVA: "拉脱维亚",
    MAC: "中国澳门",
    MAR: "摩洛哥",
    MDA: "摩尔多瓦",
    MDG: "马达加斯加",
    MDV: "马尔代夫",
    MEX: "墨西哥",
    MHL: "马绍尔群岛",
    MKD: "北马其顿",
    MLI: "马里",
    MLT: "马耳他",
    MMR: "缅甸",
    MNE: "黑山",
    MNG: "蒙古",
    MOZ: "莫桑比克",
    MNP: "北马里亚纳群岛",
    MRT: "毛里塔尼亚",
    MSR: "蒙特塞拉特",
    MUS: "毛里求斯",
    MWI: "马拉维",
    MYS: "马来西亚",
    MYT: "马约特",
    NAM: "纳米比亚",
    NCL: "新喀里多尼亚",
    NER: "尼日尔",
    NFK: "诺福克岛",
    NGA: "尼日利亚",
    NIC: "尼加拉瓜",
    NIU: "纽埃",
    NLD: "荷兰",
    NOR: "挪威",
    NPL: "尼泊尔",
    NRU: "瑙鲁",
    NZL: "新西兰",
    OMN: "阿曼",
    PAK: "巴基斯坦",
    PAN: "巴拿马",
    PCN: "皮特凯恩群岛",
    PER: "秘鲁",
    PHL: "菲律宾",
    PLW: "帕劳",
    PNG: "巴布亚新几内亚",
    POL: "波兰",
    PRK: "朝鲜",
    PRT: "葡萄牙",
    PRY: "巴拉圭",
    PSE: "巴勒斯坦",
    PYF: "法属波利尼西亚",
    QAT: "卡塔尔",
    ROU: "罗马尼亚",
    RUS: "俄罗斯",
    RWA: "卢旺达",
    S19: "其他亚洲地区",
    SAU: "沙特阿拉伯",
    SDN: "苏丹",
    SEN: "塞内加尔",
    SGP: "新加坡",
    SHN: "圣赫勒拿",
    SLB: "所罗门群岛",
    SLE: "塞拉利昂",
    SLV: "萨尔瓦多",
    SMR: "圣马力诺",
    SOM: "索马里",
    SPM: "圣皮埃尔和密克隆",
    SRB: "塞尔维亚",
    SSD: "南苏丹",
    STP: "圣多美和普林西比",
    SUR: "苏里南",
    SVK: "斯洛伐克",
    SVN: "斯洛文尼亚",
    SWE: "瑞典",
    SWZ: "斯威士兰",
    SXM: "荷属圣马丁",
    SYC: "塞舌尔",
    SYR: "叙利亚",
    TCA: "特克斯和凯科斯群岛",
    TCD: "乍得",
    TGO: "多哥",
    THA: "泰国",
    TJK: "塔吉克斯坦",
    TKL: "托克劳",
    TKM: "土库曼斯坦",
    TLS: "东帝汶",
    TON: "汤加",
    TTO: "特立尼达和多巴哥",
    TUN: "突尼斯",
    TUR: "土耳其",
    TUV: "图瓦卢",
    TZA: "坦桑尼亚",
    UGA: "乌干达",
    UKR: "乌克兰",
    URY: "乌拉圭",
    USA: "美国",
    UZB: "乌兹别克斯坦",
    VCT: "圣文森特和格林纳丁斯",
    VEN: "委内瑞拉",
    VGB: "英属维尔京群岛",
    VNM: "越南",
    VUT: "瓦努阿图",
    WLF: "瓦利斯和富图纳",
    WSM: "萨摩亚",
    YEM: "也门",
    ZAF: "南非",
    ZMB: "赞比亚",
    ZWE: "津巴布韦"
  };

  const SUPPLY_MAZE_CARGO = {
    electronics: {
      label: "机械电子",
      icon: "芯",
      deadline: 38,
      baseCost: 18,
      riskSensitivity: 1.2,
      stepCost: 3,
      routeAgility: 0.95,
      altCost: 9,
      chinaRisk: 1.18,
      note: "高价值、替代难：风险墙惩罚更高，替代路线更贵。",
      insight: "机械电子往往零部件复杂、替代供应难度高，过度集中会放大依赖暴露。"
    },
    textile: {
      label: "纺织服装",
      icon: "衣",
      deadline: 46,
      baseCost: 12,
      riskSensitivity: 0.82,
      stepCost: 2,
      routeAgility: 1.2,
      altCost: 5,
      chinaRisk: 0.86,
      note: "轻货、路线灵活：适合绕行分散风险，时间压力较低。",
      insight: "纺织服装的替代弹性相对更强，适合用绕行和多元供应降低风险。"
    },
    transport: {
      label: "运输设备",
      icon: "运",
      deadline: 42,
      baseCost: 24,
      riskSensitivity: 1.05,
      stepCost: 4,
      routeAgility: 0.78,
      altCost: 11,
      chinaRisk: 1.05,
      note: "重货、路径受限：港口和物流事件惩罚更明显。",
      insight: "运输设备更依赖物流节点，港口拥堵和路线延误会明显影响交付。"
    },
    medical: {
      label: "医药材料",
      icon: "医",
      deadline: 32,
      baseCost: 20,
      riskSensitivity: 1.35,
      stepCost: 3,
      routeAgility: 0.9,
      altCost: 8,
      chinaRisk: 1.24,
      note: "时效敏感：延误会明显拉低评分，风险雷达变化更剧烈。",
      insight: "医药材料对交付时效更敏感，延误和突发事件会快速拉低稳定性。"
    }
  };

  const SUPPLY_MAZE_DYNAMIC_INTERVAL = 4;

  const SUPPLY_MAZE_YEARS = {
    2007: { label: "2007 全球化扩张", riskCount: 5, eventCount: 3, riskBoost: 0.85, description: "风险墙较少，全球化扩张使通道更顺，但集中依赖仍会累积暴露。" },
    2018: { label: "2018 贸易摩擦", riskCount: 8, eventCount: 4, riskBoost: 1.08, description: "贸易摩擦抬高部分通道成本，路线选择开始更重视替代供应。" },
    2020: { label: "2020 疫情冲击", riskCount: 10, eventCount: 5, riskBoost: 1.28, description: "疫情冲击让港口、延误和突发事件更频繁，时间压力显著上升。" },
    2024: { label: "2024 供应链重组", riskCount: 8, eventCount: 4, riskBoost: 1.12, description: "供应链重组阶段，稳定性和替代供应变得更重要。" }
  };

  const SUPPLY_MAZE_EVENTS = [
    { title: "港口拥堵", text: "关键港口排队，交付时间上升。", cost: 4, time: 7, risk: 3, exposure: 2, lesson: "物流瓶颈会让原本低成本路线变慢。" },
    { title: "汇率波动", text: "采购预算被挤压，成本压力上升。", cost: 9, time: 1, risk: 2, exposure: 1, lesson: "成本风险会改变看似稳定的采购方案。" },
    { title: "替代供应不足", text: "替代来源临时缺货，依赖暴露上升。", cost: 3, time: 3, risk: 6, exposure: 8, lesson: "替代供应不是口号，真正可用的产能很重要。" },
    { title: "库存缓冲启动", text: "库存吸收了部分冲击，风险下降但成本增加。", cost: 5, time: -2, risk: -8, exposure: -3, lesson: "库存能提升韧性，但会占用资金。" },
    { title: "区域伙伴补位", text: "附近供应商接入，风险下降，路线略变慢。", cost: 6, time: 3, risk: -10, exposure: -8, lesson: "多元供应能降低集中依赖，但需要付出成本。" },
    { title: "中国制造产能释放", text: "产能恢复，成本和时间压力下降，但集中暴露略升。", cost: -7, time: -5, risk: 4, exposure: 6, lesson: "高效供给有优势，也要注意集中度。" }
  ];

  const SUPPLY_MINE_DIFFICULTIES = {
    showcase: { label: "展示模式 8×8", size: 8, riskMines: 5, safeMines: 2, eventEvery: 9 },
    standard: { label: "标准模式 10×10", size: 10, riskMines: 6, safeMines: 3, eventEvery: 13 }
  };

  const SUPPLY_MINE_TYPES = {
    barrier: { label: "贸易壁垒雷", icon: "障", className: "mine-risk-barrier", lesson: "贸易限制政策会让影响范围扩散。" },
    breakage: { label: "供应链中断雷", icon: "断", className: "mine-risk-breakage", lesson: "关键供应商断供会直接拉低安全指数。" },
    fx: { label: "汇率波动雷", icon: "汇", className: "mine-risk-fx", lesson: "价格与汇率波动会让已获得的信息不再稳定。" },
    geopolitics: { label: "地缘政治雷", icon: "政", className: "mine-risk-geo", lesson: "地缘冲突会动摇已有判断。" },
    compliance: { label: "合规风险雷", icon: "规", className: "mine-risk-compliance", lesson: "合规审查可能使已有防御工具失效。" },
    falseInfo: { label: "虚假信息雷", icon: "讯", className: "mine-risk-info", lesson: "不准确的信息会误导风险判断。" }
  };

  const SUPPLY_MINE_TOOLS = {
    diversify: { label: "多元化采购卡", icon: "多", className: "mine-tool-diversify", desc: "自动抵御一次任意风险冲击。" },
    inventory: { label: "库存缓冲仓", icon: "仓", className: "mine-tool-inventory", desc: "优先抵御供应链中断或能源冲击。" },
    intel: { label: "情报分析器", icon: "情", className: "mine-tool-intel", desc: "主动揭示 3 个未知节点的真实内容。" },
    express: { label: "快速转运港", icon: "港", className: "mine-tool-express", desc: "优先抵御贸易壁垒或航运冲击。" },
    shield: { label: "关税保护盾", icon: "盾", className: "mine-tool-shield", desc: "提交评估时让错误标记扣分减半。" }
  };

  const SUPPLY_MINE_TOOL_LOADOUTS = {
    showcase: ["diversify", "diversify", "inventory", "intel", "express", "shield"],
    standard: ["diversify", "diversify", "diversify", "inventory", "inventory", "intel", "express", "shield"]
  };

  const procurementGame = {
    countryIso3: "",
    year: 2024,
    cargoId: "electronics",
    player: { row: 1, col: 1 },
    stats: null,
    maze: null,
    completed: false,
    lastEvent: null,
    riskShiftCount: 0,
    shiftedRiskCells: new Set(),
    visitedEvents: new Set(),
    allocations: {
      china: 45,
      alt: 25,
      inventory: 15,
      express: 15
    },
    dispatched: false,
    dispatchCount: 0,
    lastResult: null
  };

  const SUPPLY_DEFENSE_GRID = { rows: 7, cols: 12 };
  const SUPPLY_DEFENSE_TOWER_TYPES = {
    china: {
      label: "中国制造加速站",
      short: "中",
      cost: 18,
      className: "tower-node-china",
      desc: "加快交付、压低成本，但会提高依赖暴露。"
    },
    alt: {
      label: "替代供应站",
      short: "替",
      cost: 26,
      className: "tower-node-alt",
      desc: "降低依赖暴露、提升稳定，但成本更高。"
    },
    inventory: {
      label: "库存缓冲仓",
      short: "仓",
      cost: 22,
      className: "tower-node-inventory",
      desc: "吸收突发风险，适合风险年份。"
    },
    express: {
      label: "快速转运港",
      short: "港",
      cost: 24,
      className: "tower-node-express",
      desc: "缩短交付时间，但会增加运输成本。"
    }
  };
  const SUPPLY_DEFENSE_PATHS = [
    [
      [3, 0],
      [3, 1],
      [2, 2],
      [2, 3],
      [2, 4],
      [1, 5],
      [1, 6],
      [1, 7],
      [2, 8],
      [2, 9],
      [3, 10],
      [3, 11]
    ],
    [
      [3, 0],
      [4, 1],
      [4, 2],
      [4, 3],
      [3, 4],
      [3, 5],
      [3, 6],
      [4, 7],
      [4, 8],
      [4, 9],
      [3, 10],
      [3, 11]
    ],
    [
      [3, 0],
      [3, 1],
      [3, 2],
      [4, 3],
      [5, 4],
      [5, 5],
      [5, 6],
      [5, 7],
      [4, 8],
      [3, 9],
      [3, 10],
      [3, 11]
    ]
  ];
  const SUPPLY_DEFENSE_BUILD_CELLS = new Set(
    [
      [1, 2],
      [1, 4],
      [1, 8],
      [2, 6],
      [2, 10],
      [3, 3],
      [3, 8],
      [4, 5],
      [4, 10],
      [5, 2],
      [5, 8],
      [6, 4],
      [6, 7],
      [6, 10]
    ].map(([row, col]) => `${row}-${col}`)
  );
  const supplyDefenseGame = {
    countryIso3: "",
    year: 2024,
    cargoId: "electronics",
    budget: 100,
    wave: 0,
    orders: [],
    nodes: [],
    riskZones: new Set(),
    selectedTowerType: "china",
    running: false,
    completed: false,
    timer: null,
    tick: 0,
    score: 0,
    lastEvent: null,
    insight: null,
    metrics: {
      totalOrders: 0,
      delivered: 0,
      onTime: 0,
      failed: 0,
      costPressure: 0,
      exposure: 0,
      stability: 82
    }
  };

  const supplyMineGame = {
    countryIso3: "",
    year: 2024,
    cargoId: "electronics",
    difficulty: "showcase",
    cells: [],
    tools: {},
    operationsSinceEvent: 0,
    securityAdjust: 0,
    riskHits: 0,
    resistedHits: 0,
    toolsFound: 0,
    submitted: false,
    intelActive: false,
    intelSelections: 0,
    falseInfoUntil: 0,
    result: null,
    lastEvent: null,
    seedVersion: 0
  };

  /**
   * --------------------------------------------------------------------------
   * DOM
   * --------------------------------------------------------------------------
   */

  const DOM = {
    tabs: document.querySelectorAll(".tab"),
    sections: document.querySelectorAll(".section"),
    sectionLinks: document.querySelectorAll("[data-section-link]"),
    tabTargets: document.querySelectorAll("[data-tab-target]"),

    yearSelect: document.getElementById("yearSelect"),
    metricSelect: document.getElementById("metricSelect"),
    metricPills: document.querySelectorAll("[data-metric-pill]"),
    metricDescription: document.getElementById("metricDescription"),

    scopeSelect: document.getElementById("scopeSelect"),
    categoryDimensionSelect: document.getElementById("categoryDimensionSelect"),
    categoryDimensionNote: document.getElementById("categoryDimensionNote"),
    categorySelect: document.getElementById("categorySelect"),
    countrySelect: document.getElementById("countrySelect"),
    targetTopicTagSelect: document.getElementById("targetTopicTagSelect"),

    countryWorkbenchCountrySelect: document.getElementById("countryWorkbenchCountrySelect"),
    countryWorkbenchYearSelect: document.getElementById("countryWorkbenchYearSelect"),
    countryWorkbenchScopeSelect: document.getElementById("countryWorkbenchScopeSelect"),
    countryWorkbenchCategorySelect: document.getElementById("countryWorkbenchCategorySelect"),
    countryWorkbenchDimensionButtons: document.querySelectorAll("[data-country-workbench-dimension]"),
    countryWorkbenchContext: document.getElementById("countryWorkbenchContext"),

    thresholdInput: document.getElementById("thresholdInput"),
    thresholdLabel: document.getElementById("thresholdLabel"),

    timelineInput: document.getElementById("timelineInput"),
    timelineMarkers: document.querySelectorAll(".timeline-marker"),
    currentYear: document.getElementById("currentYear"),
    topCurrentYear: document.getElementById("topCurrentYear"),
    playButton: document.getElementById("playButton"),

    legend: document.getElementById("legend"),
    kpiStrip: document.getElementById("kpiStrip"),
    matrixPreview: document.getElementById("matrixPreview"),

    globeWrap: document.getElementById("globeWrap"),
    globeCanvasHost: document.getElementById("globe"),
    globeLabels: document.getElementById("globeLabels"),
    globeTooltip: document.getElementById("globeTooltip"),
    countryFocusMap: document.getElementById("countryFocusMap"),
    overviewDetailClose: document.getElementById("overviewDetailClose"),

    matrixCategoryButtons: document.querySelectorAll("[data-matrix-category-level]"),
    matrixMetricButtons: document.querySelectorAll("[data-matrix-metric]"),
    matrixSortButtons: document.querySelectorAll("[data-matrix-sort]"),
    matrixScopeSelect: document.getElementById("matrixScopeSelect"),
    matrixCategorySelect: document.getElementById("matrixCategorySelect"),
    matrixCountryLimitSelect: document.getElementById("matrixCountryLimitSelect"),
    matrixSummaryCards: document.getElementById("matrixSummaryCards"),
    matrixCellMetricBars: document.getElementById("matrixCellMetricBars"),
    matrixCountryTopCategories: document.getElementById("matrixCountryTopCategories"),
    matrixCategoryTopCountries: document.getElementById("matrixCategoryTopCountries"),
    matrixCategoryAverageRank: document.getElementById("matrixCategoryAverageRank"),
    matrixGroupSummary: document.getElementById("matrixGroupSummary"),
    matrixOutlierCells: document.getElementById("matrixOutlierCells"),
    matrixProductDetails: document.getElementById("matrixProductDetails"),
    matrixMeta: document.getElementById("matrixMeta"),

    flowCategoryButtons: document.querySelectorAll("[data-flow-category-level]"),
    flowModeButtons: document.querySelectorAll("[data-flow-mode]"),
    flowMetricButtons: document.querySelectorAll("[data-flow-metric]"),
    flowSortButtons: document.querySelectorAll("[data-flow-sort]"),
    flowScopeSelect: document.getElementById("flowScopeSelect"),
    flowCategorySelect: document.getElementById("flowCategorySelect"),
    flowCategoryLimitSelect: document.getElementById("flowCategoryLimitSelect"),
    flowTargetLimitSelect: document.getElementById("flowTargetLimitSelect"),
    flowMinShareSelect: document.getElementById("flowMinShareSelect"),
    flowExitCountryFocus: document.getElementById("flowExitCountryFocus"),
    flowKpiStrip: document.getElementById("flowKpiStrip"),
    flowInsightText: document.getElementById("flowInsightText"),
    flowContextChips: document.getElementById("flowContextChips"),
    flowChartTitle: document.getElementById("flowChartTitle"),
    flowChartMeta: document.getElementById("flowChartMeta"),
    flowChartCaption: document.getElementById("flowChartCaption"),
    flowTargetLabel: document.getElementById("flowTargetLabel"),
    flowMeta: document.getElementById("flowMeta"),
    flowDescription: document.getElementById("flowDescription"),
    flowTopCategories: document.getElementById("flowTopCategories"),
    flowTopTargets: document.getElementById("flowTopTargets"),
    flowCategoryBars: document.getElementById("flowCategoryBars"),
    flowTargetRank: document.getElementById("flowTargetRank"),
    flowConcentrationBars: document.getElementById("flowConcentrationBars"),

    targetSpotlightList: document.getElementById("targetSpotlightList"),

    gameCountrySelect: document.getElementById("gameCountrySelect"),
    gameYearSelect: document.getElementById("gameYearSelect"),
    gameCargoSelect: document.getElementById("gameCargoSelect"),
    gameResetButton: document.getElementById("gameResetButton"),
    gameMissionText: document.getElementById("gameMissionText"),
    gameBrief: document.getElementById("gameBrief"),
    gameCountryContext: document.getElementById("gameCountryContext"),
    gameYearContext: document.getElementById("gameYearContext"),
    gameContextExplain: document.getElementById("gameContextExplain"),
    gameCargoStats: document.getElementById("gameCargoStats"),
    gameMazeGrid: document.getElementById("gameMazeGrid"),
    gameMazeHint: document.getElementById("gameMazeHint"),
    gameChinaShare: document.getElementById("gameChinaShare"),
    gameAltShare: document.getElementById("gameAltShare"),
    gameInventoryShare: document.getElementById("gameInventoryShare"),
    gameExpressShare: document.getElementById("gameExpressShare"),
    gameChinaShareValue: document.getElementById("gameChinaShareValue"),
    gameAltShareValue: document.getElementById("gameAltShareValue"),
    gameInventoryShareValue: document.getElementById("gameInventoryShareValue"),
    gameExpressShareValue: document.getElementById("gameExpressShareValue"),
    gameDispatchButton: document.getElementById("gameDispatchButton"),
    dispatchNetworkView: document.getElementById("dispatchNetworkView"),
    gameEventImpact: document.getElementById("gameEventImpact"),
    gameEventLesson: document.getElementById("gameEventLesson"),
    gameEventLog: document.getElementById("gameEventLog"),
    gameRouteTag: document.getElementById("gameRouteTag"),
    gameScore: document.getElementById("gameScore"),
    gameResultText: document.getElementById("gameResultText"),
    gameCostValue: document.getElementById("gameCostValue"),
    gameTimeValue: document.getElementById("gameTimeValue"),
    gameRiskValue: document.getElementById("gameRiskValue"),
    gameStabilityValue: document.getElementById("gameStabilityValue"),
    gameCostFill: document.getElementById("gameCostFill"),
    gameTimeFill: document.getElementById("gameTimeFill"),
    gameRiskFill: document.getElementById("gameRiskFill"),
    gameStabilityFill: document.getElementById("gameStabilityFill"),

    towerCountrySelect: document.getElementById("towerCountrySelect"),
    towerYearSelect: document.getElementById("towerYearSelect"),
    towerCargoSelect: document.getElementById("towerCargoSelect"),
    towerStartButton: document.getElementById("towerStartButton"),
    towerResetButton: document.getElementById("towerResetButton"),
    towerBoard: document.getElementById("towerBoard"),
    towerShop: document.getElementById("towerShop"),
    towerScore: document.getElementById("towerScore"),
    towerBudget: document.getElementById("towerBudget"),
    towerWave: document.getElementById("towerWave"),
    towerEventCard: document.getElementById("towerEventCard"),
    towerInsightCard: document.getElementById("towerInsightCard"),
    towerMissionText: document.getElementById("towerMissionText"),
    towerDependency: document.getElementById("towerDependency"),
    towerConcentration: document.getElementById("towerConcentration"),
    towerContextText: document.getElementById("towerContextText"),
    towerStatusText: document.getElementById("towerStatusText"),
    towerDeliveryRate: document.getElementById("towerDeliveryRate"),
    towerOnTimeRate: document.getElementById("towerOnTimeRate"),
    towerCostPressure: document.getElementById("towerCostPressure"),
    towerExposure: document.getElementById("towerExposure"),
    towerStability: document.getElementById("towerStability"),
    towerScoreText: document.getElementById("towerScoreText"),

    mineCountrySelect: document.getElementById("mineCountrySelect"),
    mineYearSelect: document.getElementById("mineYearSelect"),
    mineCargoSelect: document.getElementById("mineCargoSelect"),
    mineDifficultySelect: document.getElementById("mineDifficultySelect"),
    mineResetButton: document.getElementById("mineResetButton"),
    mineSubmitButton: document.getElementById("mineSubmitButton"),
    mineIntelButton: document.getElementById("mineIntelButton"),
    mineRiskBoard: document.getElementById("mineRiskBoard"),
    mineSafeBoard: document.getElementById("mineSafeBoard"),
    mineMissionText: document.getElementById("mineMissionText"),
    mineContextText: document.getElementById("mineContextText"),
    mineStatusText: document.getElementById("mineStatusText"),
    mineDependency: document.getElementById("mineDependency"),
    mineConcentration: document.getElementById("mineConcentration"),
    mineVulnerability: document.getElementById("mineVulnerability"),
    mineTargetCount: document.getElementById("mineTargetCount"),
    mineSecurityScore: document.getElementById("mineSecurityScore"),
    mineScoreText: document.getElementById("mineScoreText"),
    mineRevealedCount: document.getElementById("mineRevealedCount"),
    mineSuspectCount: document.getElementById("mineSuspectCount"),
    mineConfirmCount: document.getElementById("mineConfirmCount"),
    mineHitCount: document.getElementById("mineHitCount"),
    mineToolRack: document.getElementById("mineToolRack"),
    mineEventCard: document.getElementById("mineEventCard"),
    mineResultCard: document.getElementById("mineResultCard")
  };

  /**
   * --------------------------------------------------------------------------
   * Data indexes
   * --------------------------------------------------------------------------
   */

  const categoryCollections = {
    compatibility: indexData.categories || [],
    major: indexData.categoriesMajor || [],
    minor: indexData.categoriesMinor || [],
    topic: indexData.topicTags || [],
    hsSection: indexData.hsSections || [],
    hsChapter: indexData.hsChapters || []
  };

  const categoryById = new Map(
    [
      ...(categoryCollections.compatibility || []),
      ...(categoryCollections.major || []),
      ...(categoryCollections.minor || []),
      ...(categoryCollections.topic || []),
      ...(categoryCollections.hsSection || []),
      ...(categoryCollections.hsChapter || [])
    ]
      .filter((category) => category?.id)
      .map((category) => [category.id, category])
  );

  const categoryIds = new Map(
    (indexData.categories || [])
      .filter((item) => item.id !== "all")
      .map((item) => [item.name, item.id])
  );

  const countryMetaByIso3 = new Map(
    (indexData.countries || []).map((country) => [country.iso3, country])
  );

  /**
   * --------------------------------------------------------------------------
   * Cesium runtime state
   * --------------------------------------------------------------------------
   */

  const cesiumState = {
    viewer: null,
    screenHandler: null,

    sources: {
      countryFill: null,
      countryBorder: null,
      tradeFlow: null,
      chinaSource: null,
      focus: null,
      grid: null
    },

    primitives: {
      flowPoints: null,
      focusPoints: null
    },

    countryEntityByIso3: new Map(),
    borderEntityByIso3: new Map(),
    countryNameZhByIso3: new Map(),
    countryNameZhByName: new Map(),
    countryGeoFeatureByIso3: new Map(),

    hoveredIso3: "",
    labelFrame: 0,
    heatFrame: 0,

    camera: {
      lon: DEFAULT_CAMERA.lon,
      lat: DEFAULT_CAMERA.lat,
      distance: DEFAULT_CAMERA.distance,
      autoRotate: true,
      pausedUntil: 0,
      animation: null,
      pointers: new Map(),
      dragging: false,
      moved: false,
      clickEligible: false,
      lastScreen: null,
      pinchDistance: 0
    }
  };

  let activeControlFrame = 0;

  document.addEventListener("DOMContentLoaded", init);

  /**
   * --------------------------------------------------------------------------
   * Init
   * --------------------------------------------------------------------------
   */

  async function init() {
    normalizeState();
    normalizeStaticCopy();
    populateStaticControls();

    window.lucide?.createIcons();

    initTabs();
    initGlobe();

    charts.init?.({
      onCountryCategoryClick: handleCountryCategoryClick,
      onMatrixHover: handleMatrixHover,
      onMatrixClick: handleMatrixClick,
      onTargetClick: handleTargetClick
    });

    bindControls();

    await loadYear(state.year);

    window.addEventListener(
      "resize",
      debounce(() => {
        resizeCesium();
        charts.resize?.();
        queueLabelRender();
      }, 140)
    );
  }

  function coerceAnalysisLevel(level) {
    return level === "analysis_minor" ? "analysis_minor" : "analysis_major";
  }

  function coerceFlowCategoryLevel(level) {
    return ["analysis_major", "analysis_minor", "hs_chapter", "topic_tag"].includes(level)
      ? level
      : "analysis_major";
  }

  function normalizeState() {
    const years = indexData.years || [2024];

    state.year = Number(state.year || years[years.length - 1] || 2024);
    state.metric = state.metric || "cdi";
    state.selectedScope = state.selectedScope || indexData.defaults?.scope || "manufactures";
    state.categoryDimension = coerceAnalysisLevel(state.categoryDimension);
    state.selectedCategory = state.selectedCategory || "all";
    state.selectedTopicTag = state.selectedTopicTag || "all";
    state.threshold = Number.isFinite(Number(state.threshold))
      ? Number(state.threshold)
      : 0.1;

    state.heat = state.heat !== false;
    state.flows = state.flows !== false;
    state.labels = state.labels !== false;
    state.particles = Boolean(state.particles);

    state.matrixSort = state.matrixSort || "cdi";
    state.matrixCategoryLevel = coerceAnalysisLevel(state.matrixCategoryLevel);
    state.matrixCountryLimit = [20, 40, 80].includes(Number(state.matrixCountryLimit))
      ? Number(state.matrixCountryLimit)
      : MATRIX_LIMIT;
    state.flowMode = state.flowMode || "region";
    state.flowCategoryLevel = coerceFlowCategoryLevel(state.flowCategoryLevel);
    state.flowSelectedCategory = state.flowSelectedCategory || "all";
    state.flowSort = ["value", "metric", "dependency", "vulnerability", "importance"].includes(state.flowSort)
      ? state.flowSort
      : "value";
    state.flowCategoryLimit = [4, 6, 8, 10, 12].includes(Number(state.flowCategoryLimit))
      ? Number(state.flowCategoryLimit)
      : 6;
    state.flowTargetLimit = [0, 6, 8, 10, 15, 20].includes(Number(state.flowTargetLimit))
      ? Number(state.flowTargetLimit)
      : 0;
    state.flowMinShare = [0, 0.005, 0.01, 0.02].includes(Number(state.flowMinShare))
      ? Number(state.flowMinShare)
      : 0;
    state.activeSection = state.activeSection || "overview";
    state.selectedCountry = state.selectedCountry || "USA";
    state.selectedProduct = state.selectedProduct || "";
    state.countryFocusActive = Boolean(state.countryFocusActive);
    state.analysisScope = state.analysisScope || "global";
    state.sectionLoad = normalizeSectionLoadState(state.sectionLoad);
  }

  function createSectionLoadRecord() {
    return {
      status: "idle",
      key: "",
      error: null,
      promise: null
    };
  }

  function normalizeSectionLoadState(previous = {}) {
    const next = {};
    SECTION_DATA_IDS.forEach((section) => {
      next[section] = {
        ...createSectionLoadRecord(),
        ...(previous?.[section] || {})
      };
      if (!["idle", "loading", "ready", "error"].includes(next[section].status)) {
        next[section].status = "idle";
      }
      next[section].promise = null;
    });
    return next;
  }

  function resetSectionLoadState(section) {
    if (!state.sectionLoad) state.sectionLoad = normalizeSectionLoadState();
    if (section) {
      state.sectionLoad[section] = createSectionLoadRecord();
      return;
    }
    state.sectionLoad = normalizeSectionLoadState();
  }

  function sectionDataKey(section = activePrimarySection()) {
    const base = [
      Number(state.year),
      state.selectedScope || "manufactures",
      state.selectedCountry || "",
      state.metric || "cdi"
    ];

    if (section === "overview") {
      return [...base, state.categoryDimension, state.selectedCategory || "all"].join("::");
    }
    if (section === "country") {
      return [...base, state.categoryDimension, state.selectedCategory || "all"].join("::");
    }
    if (section === "matrix") {
      return [
        ...base,
        state.matrixCategoryLevel,
        state.matrixCountryLimit,
        state.matrixSort,
        state.selectedCategory || "all"
      ].join("::");
    }
    if (section === "flows") {
      return [
        ...base,
        state.flowMode,
        state.flowCategoryLevel,
        state.flowSelectedCategory || "all",
        state.flowCategoryLimit,
        state.flowTargetLimit,
        state.flowMinShare,
        state.flowSort
      ].join("::");
    }
    if (section === "target") {
      return [...base, state.selectedTopicTag || "all"].join("::");
    }
    return [...base, section || "overview"].join("::");
  }

  function isCountryScope() {
    return state.analysisScope === "country" && state.selectedCountry;
  }

  function activePrimarySection() {
    return (
      state.activeSection ||
      document.querySelector(".section.is-active")?.id ||
      "overview"
    );
  }

  function shouldLoadFocusedCountryData(section = activePrimarySection()) {
    return section === "overview" || section === "country";
  }

  function currentCountry() {
    return findCountry(state.selectedCountry);
  }

  function normalizeMatrixLevel(level) {
    if (level === "hs_chapter") return "hs_chapter";
    if (level === "topic_tag") return "topic_tag";
    level = coerceAnalysisLevel(level);
    if (level === "analysis_major") return "group";
    if (level === "analysis_minor") return "fine";
    return "group";
  }

  function loadedCategoryIdsForLevel(level, scope = state.selectedScope) {
    const normalized = normalizeMatrixLevel(level);
    const ids = new Set();
    (state.bundle?.matrix || []).forEach((row) => {
      if ((row.scope || "manufactures") !== scope) return;
      if ((row.categoryLevel || "group") !== normalized) return;
      if (row.categoryId) ids.add(String(row.categoryId));
    });
    return ids;
  }

  function loadedTopicIdsForScope(scope = state.selectedScope) {
    const ids = new Set();
    (state.bundle?.topicMatrix || []).forEach((row) => {
      if ((row.scope || "manufactures") !== scope) return;
      if (row.categoryId) ids.add(String(row.categoryId));
    });
    return ids;
  }

  function chapterSpanLabel(chapters = []) {
    const list = (chapters || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!list.length) return "";
    const first = String(list[0]).padStart(2, "0");
    const last = String(list[list.length - 1]).padStart(2, "0");
    return list.length === 1 ? `HS${first}` : `HS${first}-${last}`;
  }

  function scopeLabel(scopeId) {
    return (
      (indexData.scopes || []).find((scope) => scope.id === scopeId)?.name ||
      scopeId ||
      "制造品 HS28-96"
    );
  }

  function countryIso3(country) {
    return String(country?.iso3 || country?.countryCode || "").toUpperCase();
  }

  function countryChineseName(country) {
    const iso3 = countryIso3(country);
    const nameEn = country?.nameEn || country?.country || country?.name || iso3;
    return (
      country?.nameZh ||
      (iso3 ? cesiumState.countryNameZhByIso3.get(iso3) : "") ||
      (nameEn ? cesiumState.countryNameZhByName.get(normalizeNameKey(nameEn)) : "") ||
      COUNTRY_ZH_FALLBACK[iso3] ||
      country?.name ||
      country?.country ||
      iso3
    );
  }

  function countryDisplayLabel(country) {
    const iso3 = countryIso3(country);
    const name = countryChineseName(country);
    return iso3 ? `${iso3} / ${name}` : name;
  }

  function sortCountriesForDisplay(a, b) {
    return countryChineseName(a).localeCompare(countryChineseName(b), "zh-Hans") ||
      countryIso3(a).localeCompare(countryIso3(b));
  }

  function categoryDimensionLabel(dimension) {
    const labels = {
      analysis_major: "分析大类",
      analysis_minor: "分析细类"
    };
    return labels[dimension] || "分析大类";
  }

  function scopeAwareMinorCategories(scope = state.selectedScope) {
    const rows = categoryCollections.minor || [];
    if (!rows.length) return [];
    if (scope === "all_goods") {
      return rows.filter((item) => item.id !== "Z99");
    }
    return rows.filter((item) => (item.scope || "manufactures") === scope);
  }

  function scopeAwareMajorCategories(scope = state.selectedScope) {
    const rows = categoryCollections.major || [];
    if (!rows.length) return (indexData.categories || []).filter((item) => item.id !== "all");
    if (scope === "all_goods") {
      return rows.filter((item) => item.id !== "Z");
    }
    const groupIds = new Set(scopeAwareMinorCategories(scope).map((item) => item.groupId || item.analysisMajorId));
    return rows.filter((item) => groupIds.has(item.id));
  }

  function topicTagOptions() {
    return (categoryCollections.topic || []).map((item) => ({
      id: item.id,
      name: item.name,
      color: item.color || CHINA_GOLD,
      level: "topic_tag",
      dimension: "topic_tag",
      scope: "all_goods"
    }));
  }

  function categoryOptionsForDimension(dimension = state.categoryDimension, scope = state.selectedScope) {
    if (dimension === "analysis_minor") {
      return scopeAwareMinorCategories(scope).map((item) => ({
        ...item,
        level: "fine",
        dimension: "analysis_minor"
      }));
    }

    return scopeAwareMajorCategories(scope).map((item) => ({
      ...item,
      level: "group",
      dimension: "analysis_major"
    }));
  }

  function currentCategoryOptions() {
    return categoryOptionsForDimension(state.categoryDimension, state.selectedScope);
  }

  function countryContributionCategories() {
    return scopeAwareMinorCategories(state.selectedScope).map((item) => ({
      ...item,
      level: "fine",
      dimension: "analysis_minor"
    }));
  }

  function matrixCategoryOptions() {
    const options = categoryOptionsForDimension(
      state.matrixCategoryLevel,
      state.selectedScope
    );
    if (!state.bundle || state.matrixCategoryLevel === "analysis_major") {
      return options;
    }
    const available = loadedCategoryIdsForLevel(
      state.matrixCategoryLevel,
      state.selectedScope
    );
    return options.filter((item) => available.has(String(item.id)));
  }

  function flowCategoryOptionsFor(level = state.flowCategoryLevel, scope = state.selectedScope) {
    if (level === "topic_tag") {
      const options = topicTagOptions();
      if (!state.bundle) return options;
      const available = loadedTopicIdsForScope(scope);
      return options.filter((item) => available.has(String(item.id)));
    }

    if (level === "hs_chapter") {
      const rows = categoryCollections.hsChapter || [];
      const scoped =
        scope === "all_goods"
          ? rows.filter((item) => item.id !== "HS99")
          : rows.filter((item) => (item.scope || "manufactures") === scope);
      const available = loadedCategoryIdsForLevel("hs_chapter", scope);
      return scoped
        .map((item) => ({
          id: item.id,
          name: item.name || item.id,
          color: item.color || categoryById.get(item.analysisMajorId)?.color || CYAN_LINE,
          level: "hs_chapter",
          dimension: "hs_chapter",
          scope: item.scope || "manufactures"
        }))
        .filter((item) => !state.bundle || available.has(String(item.id)));
    }

    const options = categoryOptionsForDimension(level, scope);
    if (!state.bundle) return options;
    const available = loadedCategoryIdsForLevel(level, scope);
    return options.filter((item) => available.has(String(item.id)));
  }

  function flowCategoryOptions() {
    return flowCategoryOptionsFor(state.flowCategoryLevel, state.selectedScope);
  }

  function ensureAvailableFlowCategoryLevel() {
    if (!state.bundle) return;
    const preferred = coerceFlowCategoryLevel(state.flowCategoryLevel);
    const candidates = Array.from(
      new Set([preferred, "analysis_major", "analysis_minor", "topic_tag", "hs_chapter"])
    );
    const nextLevel = candidates.find((level) => flowCategoryOptionsFor(level, state.selectedScope).length > 0);
    if (nextLevel && nextLevel !== state.flowCategoryLevel) {
      state.flowCategoryLevel = nextLevel;
      state.flowSelectedCategory = "all";
    }
  }

    function normalizeStaticCopy() {
    document.title = "中国制造依赖网络：面向展示的可视化系统";

    setTextBySelector(".brand-copy h1", "中国制造依赖网络");
    setTextBySelector(
      ".brand-subtitle",
      "用可视化看懂 2007-2024 年世界各国对中国制造的依赖变化"
    );

    setNavSubtitle("overview", "全球依赖总览");
    setNavSubtitle("country", "看懂一个国家");
    setNavSubtitle("matrix", "国家和产品对比");
    setNavSubtitle("flows", "中国制造流向哪里");
    setNavSubtitle("target", "哪些产品最值得关注");
    setNavSubtitle("game", "风险排查");
    setNavSubtitle("docs", "数据从哪来");

    setTextBySelector(".controls .panel-head h2", "选择你想看的内容");
    setTextBySelector(
      ".controls .panel-intro",
      "选择年份、国家和指标，观察世界各国对中国制造的依赖变化。"
    );

    setTextBySelector(".globe-header h2", "世界有多依赖中国制造？");
    setTextBySelector(
      ".globe-header p",
      "颜色越暖，说明依赖越高；弧线展示中国制造流向的主要国家。"
    );

    localizeStaticUi();
  }

  function localizeStaticUi() {
    const textMap = [
      [".tabs [data-section='overview'] small", "全球依赖总览"],
      [".tabs [data-section='country'] small", "看懂一个国家"],
      [".tabs [data-section='matrix'] small", "国家和产品对比"],
      [".tabs [data-section='flows'] small", "中国制造流向哪里"],
      [".tabs [data-section='target'] small", "哪些产品最值得关注"],
      [".tabs [data-section='game'] span", "扫雷游戏"],
      [".tabs [data-section='game'] small", "风险排查"],
      [".tabs [data-section='docs'] small", "数据从哪来"],
      [".controls .panel-kicker", "全球依赖总览"],
      [".globe-header .panel-kicker", "地球视图"],
      ["#detailPanel .panel-kicker", "全球总览"],
      ["#country .panel-kicker", "国家故事"],
      [".globe-annotations span:nth-child(1)", "冷色 = 低依赖"],
      [".globe-annotations span:nth-child(2)", "暖色 = 高依赖"],
      [".globe-annotations span:nth-child(3)", "点击国家查看画像"],
      [".globe-hint span", "拖拽旋转 / 滚轮缩放"],
      [".summary-card .summary-head h3", "关键指标"],
      [".timeline-head h3", `${state.year || 2024} 年格局`],
      ["#playButton", "播放演化"],
      [".timeline-marker[data-year='2008']", "2008 金融危机"],
      [".timeline-marker[data-year='2018']", "2018 贸易摩擦"],
      [".timeline-marker[data-year='2020']", "2020 疫情冲击"],
      [".timeline-marker[data-year='2024']", "2024 最新"],
      ["#countryTitle", "全球总览 · 国家聚焦"],
      ["#countryMeta", "这是全球总览中的国家聚焦视图，展示当前国家在世界范围内对中国制造的依赖位置。"],
      [".detail-title-row .subtle-link", "查看详情"],
      ["#countryPageTitle", "看懂一个国家的中国制造依赖"],
      ["#countryPageIntro", "选择一个国家，查看它依赖中国制造的程度、变化趋势，以及主要依赖哪些产品。"],
      ["#matrix .panel-kicker", "依赖热力图"],
      ["#matrix .section-head h2", "哪些国家依赖哪些产品？"],
      ["#matrix .section-head > p", "用一张热力图比较不同国家和不同产品类别，颜色越暖，依赖越高。"],
      ["#flows .panel-kicker", "贸易流向"],
      ["#flows .section-head h2", "中国制造主要流向哪里？"],
      ["#flows .section-head > p", "用流向图展示中国制造通过哪些产品类别，流向哪些地区、国家或收入组。"],
      ["#target .panel-kicker", "重点产品"],
      ["#target .section-head h2", "哪些产品最值得关注？"],
      ["#target .section-head > p", "本页使用 HS6 具体产品口径：它比大类更细，适合定位具体风险商品；星球越靠近中心表示综合风险越高。"],
      [".target-select-label", "专题标签"],
      ["#docs .panel-kicker", "项目说明"],
      ["#docs .section-head h2", "数据、方法与设计依据"],
      ["#docs .section-head > p", "说明本项目如何从 BACI 国际贸易数据出发，构造依赖指标，并转化为多视图交互式可视分析系统。"]
    ];

    textMap.forEach(([selector, text]) => setTextBySelector(selector, text));

    const groups = document.querySelectorAll(".controls .control-group");
    setNodeText(groups[0]?.querySelector("h3"), "年份");
    setNodeText(groups[0]?.querySelector("label:nth-of-type(1)"), "年份");
    setNodeText(groups[0]?.querySelector("label:nth-of-type(2)"), "只显示高于这个值的国家");
    setNodeText(groups[1]?.querySelector("h3"), "指标");
    setNodeText(groups[1]?.querySelector("label"), "想看什么");
    setNodeText(groups[1]?.querySelector(".group-note"), "依赖度表示一个国家制造品进口中有多少来自中国。");
    setNodeText(groups[2]?.querySelector("h3"), "筛选");
    setNodeText(groups[2]?.querySelector("label:nth-of-type(1)"), "商品范围");
    setNodeText(groups[2]?.querySelector("label:nth-of-type(2)"), "分类维度");
    setNodeText(groups[2]?.querySelector("label:nth-of-type(3)"), "商品类别");
    setNodeText(groups[2]?.querySelector("label:nth-of-type(4)"), "国家");
    setNodeText(
      groups[2]?.querySelector(".group-note"),
      "展示版默认保留核心筛选：商品范围和国家。"
    );
    setNodeText(groups[3]?.querySelector("h3"), "颜色图例");
    setNodeText(
      groups[3]?.querySelector(".group-note"),
      "冷色表示依赖较低，暖色表示依赖较高。"
    );

    const detailLabels = [
      ["#detailPanel .identity-stats div:nth-child(1) span", "当前年份"],
      ["#detailPanel .identity-stats div:nth-child(2) span", "全球排名"],
      ["#detailPanel .identity-stats div:nth-child(3) span", "主导类别"],
      [".metric-card .metric-grid div:nth-child(1) span", "依赖度"],
      [".metric-card .metric-grid div:nth-child(2) span", "来源集中"],
      [".metric-card .metric-grid div:nth-child(3) span", "综合风险"],
      [".metric-card .metric-grid div:nth-child(4) span", "来自中国的制造品进口额"],
      [".metric-card .metric-grid div:nth-child(5) span", "制造业总进口额"],
      [".metric-card .metric-grid div:nth-child(6) span", "2007-2024 变化"],
      [".trend-card h3", "长期趋势"],
      [".structure-card h3", "依赖度排行"],
      [".evidence-card h3", "补充证据"]
    ];

    detailLabels.forEach(([selector, text]) => setTextBySelector(selector, text));
  }
  function setNodeText(element, text) {
    if (element) element.childNodes[0].nodeValue = text;
  }

  function setTextBySelector(selector, text) {
    const element = document.querySelector(selector);
    if (!element) return;
    if (element.matches?.("label") && element.querySelector("select")) {
      setNodeText(element, text);
      return;
    }
    element.textContent = text;
  }

  function setNavSubtitle(section, text) {
    const element = document.querySelector(`.tab[data-section="${section}"] small`);
    if (element) element.textContent = text;
  }

  function populateStaticControls() {
    populateSelect(
      DOM.yearSelect,
      (indexData.years || []).map((year) => ({ value: year, label: year })),
      state.year
    );

    populateSelect(
      DOM.scopeSelect,
      (indexData.scopes || []).map((item) => ({
        value: item.id,
        label: item.name
      })),
      state.selectedScope
    );
    populateSelect(
      DOM.countryWorkbenchYearSelect,
      (indexData.years || []).map((year) => ({ value: year, label: year })),
      state.year
    );
    populateSelect(
      DOM.countryWorkbenchScopeSelect,
      (indexData.scopes || []).map((item) => ({
        value: item.id,
        label: item.name
      })),
      state.selectedScope
    );
    populateSelect(
      DOM.matrixScopeSelect,
      (indexData.scopes || []).map((item) => ({
        value: item.id,
        label: item.name
      })),
      state.selectedScope
    );
    populateSelect(
      DOM.flowScopeSelect,
      (indexData.scopes || []).map((item) => ({
        value: item.id,
        label: item.name
      })),
      state.selectedScope
    );
    populateSelect(
      DOM.matrixCountryLimitSelect,
      [
        { value: 20, label: "Top 20" },
        { value: 40, label: "Top 40" },
        { value: 80, label: "Top 80" }
      ],
      state.matrixCountryLimit
    );

    populateSelect(
      DOM.categoryDimensionSelect,
      [
        { value: "analysis_major", label: "分析大类" },
        { value: "analysis_minor", label: "分析细类" }
      ],
      state.categoryDimension
    );

    refreshCategorySelect();
    refreshCountryWorkbenchCategorySelect();
    refreshMatrixCategorySelect();
    refreshFlowCategorySelect();
    refreshTargetTopicSelect();

    if (DOM.timelineInput) {
      DOM.timelineInput.min = 0;
      DOM.timelineInput.max = Math.max(0, indexData.years.length - 1);
      DOM.timelineInput.value = String(indexData.years.indexOf(state.year));
    }

    if (DOM.thresholdInput) {
      DOM.thresholdInput.value = String(state.threshold);
    }

    if (DOM.thresholdLabel) {
      DOM.thresholdLabel.textContent = Number(state.threshold || 0).toFixed(2);
    }

    populateCountrySelect();
    populateCountryWorkbenchCountrySelect();

    renderLegend();
  }

  function buildCategoryAllOption() {
    return {
      value: "all",
      label: `${scopeLabel(state.selectedScope)} · 全部${categoryDimensionLabel(state.categoryDimension)}`
    };
  }

  function refreshCategorySelect() {
    const options = currentCategoryOptions();
    const selectOptions = [buildCategoryAllOption()].concat(
      options.map((item) => ({
        value: item.id,
        label: item.name
      }))
    );

    const validIds = new Set(selectOptions.map((item) => String(item.value)));
    if (!validIds.has(String(state.selectedCategory))) {
      state.selectedCategory = "all";
    }

    populateSelect(DOM.categorySelect, selectOptions, state.selectedCategory);

    if (DOM.categoryDimensionNote) {
      DOM.categoryDimensionNote.textContent =
        state.categoryDimension === "analysis_major"
          ? `当前使用 ${scopeLabel(state.selectedScope)} 下的分析大类，适合 Globe 与 Flow 的宏观比较。`
          : `当前使用 ${scopeLabel(state.selectedScope)} 下的细分产品类别，适合查看一个国家主要依赖什么。`;
    }
  }

  function refreshCountryWorkbenchCategorySelect() {
    const options = currentCategoryOptions();
    const selectOptions = [buildCategoryAllOption()].concat(
      options.map((item) => ({
        value: item.id,
        label: item.name
      }))
    );
    populateSelect(
      DOM.countryWorkbenchCategorySelect,
      selectOptions,
      state.selectedCategory
    );
  }

  function refreshMatrixCategorySelect() {
    const options = categoryOptionsForDimension(
      state.matrixCategoryLevel,
      state.selectedScope
    );
    const available =
      state.matrixCategoryLevel === "analysis_minor"
        ? loadedCategoryIdsForLevel(state.matrixCategoryLevel, state.selectedScope)
        : null;
    const filteredOptions = available
      ? options.filter((item) => available.has(String(item.id)))
      : options;
    const selectOptions = [
      {
        value: "all",
        label: `${scopeLabel(state.selectedScope)} · 全部${categoryDimensionLabel(
          state.matrixCategoryLevel
        )}`
      }
    ].concat(
      filteredOptions.map((item) => ({
        value: item.id,
        label: item.name
      }))
    );
    const validIds = new Set(selectOptions.map((item) => String(item.value)));
    if (!validIds.has(String(state.selectedCategory))) {
      state.selectedCategory = "all";
    }
    populateSelect(DOM.matrixCategorySelect, selectOptions, state.selectedCategory);
  }

  function refreshFlowCategorySelect() {
    const options = flowCategoryOptions();
    const selectOptions = [
      {
        value: "all",
        label: `${scopeLabel(state.selectedScope)} · 全部${flowCategoryLevelLabel(
          state.flowCategoryLevel
        )}`
      }
    ].concat(
      options.map((item) => ({
        value: item.id,
        label: item.name
      }))
    );

    const validIds = new Set(selectOptions.map((item) => String(item.value)));
    if (!validIds.has(String(state.flowSelectedCategory))) {
      state.flowSelectedCategory = "all";
    }

    populateSelect(DOM.flowCategorySelect, selectOptions, state.flowSelectedCategory);
  }

  function refreshTargetTopicSelect() {
    const options = [{ value: "all", label: "全部专题" }].concat(
      topicTagOptions().map((item) => ({
        value: item.id,
        label: item.name
      }))
    );
    if (DOM.targetTopicTagSelect) {
      populateSelect(DOM.targetTopicTagSelect, options, state.selectedTopicTag || "all");
    }
  }

  function populateSelect(select, options, selectedValue) {
    if (!select) return;

    select.innerHTML = options
      .map(
        (item) =>
          `<option value="${escapeHtml(item.value)}">${escapeHtml(
            item.label
          )}</option>`
      )
      .join("");

    select.value = String(selectedValue);
  }

  function renderLegend() {
    if (!DOM.legend) return;
    DOM.legend.innerHTML = `
      <div class="legend-scale"></div>
      <div class="legend-labels">
        <span>低依赖</span>
        <span>中等</span>
        <span>高依赖</span>
      </div>
    `;
  }

  function populateCountrySelect() {
    if (!state.bundle) return;

    const countries = state.bundle.countries
      .slice()
      .sort(sortCountriesForDisplay);

    if (DOM.countrySelect) {
      const currentValue = isCountryScope() ? state.selectedCountry : "all";
      DOM.countrySelect.innerHTML = [
        `<option value="all">全部国家</option>`,
        ...countries.map(
          (c) =>
            `<option value="${escapeHtml(countryIso3(c))}">${escapeHtml(countryDisplayLabel(c))}</option>`
        )
      ].join("");

      DOM.countrySelect.value = DOM.countrySelect.querySelector(
        `option[value="${currentValue}"]`
      )
        ? currentValue
        : "all";
    }

    populateCountryWorkbenchCountrySelect(countries);
  }

  function populateCountryWorkbenchCountrySelect(sourceCountries) {
    if (!DOM.countryWorkbenchCountrySelect || !state.bundle) return;

    const countries = (sourceCountries || state.bundle.countries || [])
      .slice()
      .sort(sortCountriesForDisplay);

    DOM.countryWorkbenchCountrySelect.innerHTML = countries
      .map(
        (c) =>
          `<option value="${escapeHtml(countryIso3(c))}">${escapeHtml(countryDisplayLabel(c))}</option>`
      )
      .join("");

    const currentValue =
      state.selectedCountry && findCountry(state.selectedCountry)
        ? state.selectedCountry
        : countries[0]?.iso3 || "";
    DOM.countryWorkbenchCountrySelect.value = currentValue;
  }

  function updateScopeUI() {
    if (DOM.countrySelect) {
      DOM.countrySelect.value = isCountryScope() ? state.selectedCountry : "all";
    }
  }

  function setAnalysisScope(scope) {
    state.analysisScope = scope;
    updateScopeUI();
    renderAll();
  }

  async function selectCountryForAnalysis(iso3) {
    await selectCountry(iso3, { flyTo: true });
  }

  async function returnToGlobal() {
    state.analysisScope = "global";
    state.countryFocusActive = false;
    await hydrateActiveSelection();
    await ensureVisibleSectionData(activePrimarySection());
    updateScopeUI();
    renderAll();
    flyCameraToGlobal();
  }

  /**
   * --------------------------------------------------------------------------
   * Tabs
   * --------------------------------------------------------------------------
   */

  function initTabs() {
    DOM.tabs.forEach((button) => {
      button.addEventListener("click", () =>
        activatePrimaryTab(button.dataset.section)
      );
    });

    DOM.sectionLinks.forEach((button) => {
      button.addEventListener("click", () =>
        activatePrimaryTab(button.dataset.sectionLink)
      );
    });

    DOM.tabTargets.forEach((button) => {
      button.addEventListener("click", () =>
        activatePrimaryTab(button.dataset.tabTarget)
      );
    });
  }

  async function activatePrimaryTab(sectionId) {
    const target = sectionId || "overview";
    state.activeSection = target;

    DOM.tabs.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.section === target);
    });

    DOM.sections.forEach((section) => {
      section.classList.toggle("is-active", section.id === target);
    });

    renderGlobalShell(target);
    markSectionLoading(target, true);
    try {
      await ensureSectionData(target, "tab");
    } catch (error) {
      console.warn("Section could not finish loading:", target, error);
    } finally {
      markSectionLoading(target, false);
    }
    renderActiveSection({ resize: true });

    setTimeout(() => {
      resizeCesium();
      charts.resize?.();
      queueLabelRender();
    }, 80);
  }

  /**
   * --------------------------------------------------------------------------
   * Cesium init
   * --------------------------------------------------------------------------
   */

  function initGlobe() {
    if (!DOM.globeCanvasHost) {
      console.warn("Missing #globe container.");
      return;
    }

    const creditContainer = ensureCreditContainer();
    Cesium.Ion.defaultAccessToken = "";

    try {
      cesiumState.viewer = new Cesium.Viewer("globe", {
        baseLayer: false,
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: true,
        scene3DOnly: true,
        creditContainer
      });
    } catch (error) {
      console.error(error);
      showGlobeBootError("Cesium Viewer 初始化失败。请检查 Cesium CDN 或本地静态服务。");
      return;
    }

    configureScene(cesiumState.viewer);
    addManufacturingBaseLayer(cesiumState.viewer);
    createLayerSources();
    configureCameraRig();
    bindSceneInteractions();
    loadGeoBoundaryCountryLayers();
    createGraticule();
    createChinaLayer();
    resizeCesium();
  }

  function ensureCreditContainer() {
    let credit = document.getElementById("cesiumCredits");

    if (!credit) {
      credit = document.createElement("div");
      credit.id = "cesiumCredits";
      credit.hidden = true;
      document.body.appendChild(credit);
    }

    return credit;
  }

  async function addManufacturingBaseLayer(viewer) {
    try {
      const provider = await Cesium.TileMapServiceImageryProvider.fromUrl(
        LOCAL_NATURAL_EARTH_URL
      );

      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = 0.12;
      layer.brightness = 0.22;
      layer.contrast = 0.68;
      layer.saturation = 0.08;
      layer.gamma = 0.78;
      layer.hue = 0.02;
    } catch (error) {
      console.warn(
        "Local NaturalEarthII base layer failed. Using globe base color only.",
        error
      );
    }
  }

  function configureScene(viewer) {
    const scene = viewer.scene;

    viewer.resolutionScale = getPreferredResolutionScale();

    scene.backgroundColor = Cesium.Color.fromCssColorString("#020617");
    scene.globe.show = true;
    scene.globe.baseColor = Cesium.Color.fromCssColorString("#030b16");
    scene.globe.enableLighting = false;
    scene.globe.dynamicAtmosphereLighting = false;
    scene.globe.dynamicAtmosphereLightingFromSun = false;
    scene.globe.showGroundAtmosphere = false;
    scene.globe.maximumScreenSpaceError = 1.2;
    scene.globe.preloadAncestors = true;
    scene.globe.preloadSiblings = true;
    scene.globe.depthTestAgainstTerrain = false;
    scene.moon.show = false;
    scene.sun.show = false;
    scene.skyBox.show = false;
    scene.skyAtmosphere.show = false;

    scene.postProcessStages.fxaa.enabled = false;
    if (scene.postProcessStages.bloom) {
      scene.postProcessStages.bloom.enabled = false;
    }

    scene.highDynamicRange = false;
    scene.fog.enabled = false;

    if ("msaaSamples" in scene) {
      scene.msaaSamples = 4;
    }

    viewer.camera.percentageChanged = 0.012;
  }

  function getPreferredResolutionScale() {
    const dpr = window.devicePixelRatio || 1;
    const viewportPixels = window.innerWidth * window.innerHeight;
    const cap = viewportPixels >= 3_800_000 ? 1.55 : 1.85;
    return Math.max(1, Math.min(dpr, cap));
  }

  function createLayerSources() {
    const viewer = cesiumState.viewer;
    if (!viewer) return;

    cesiumState.sources.grid = new Cesium.CustomDataSource("graticule");
    cesiumState.sources.countryFill = null;
    cesiumState.sources.countryBorder = new Cesium.CustomDataSource("country-border");
    cesiumState.sources.tradeFlow = new Cesium.CustomDataSource("trade-flow");
    cesiumState.sources.chinaSource = new Cesium.CustomDataSource("china-source");
    cesiumState.sources.focus = new Cesium.CustomDataSource("focus-highlight");

    viewer.dataSources.add(cesiumState.sources.grid);
    viewer.dataSources.add(cesiumState.sources.countryBorder);
    viewer.dataSources.add(cesiumState.sources.tradeFlow);
    viewer.dataSources.add(cesiumState.sources.chinaSource);
    viewer.dataSources.add(cesiumState.sources.focus);

    cesiumState.primitives.flowPoints = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection()
    );

    cesiumState.primitives.focusPoints = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection()
    );
  }

  /**
   * --------------------------------------------------------------------------
   * Country region layer: each country as a separate bordered area
   * --------------------------------------------------------------------------
   */

  async function loadGeoBoundaryCountryLayers() {
    if (!cesiumState.viewer) return;

    try {
      const [translation, geojsonSource] = await Promise.all([
        loadCountryTranslations(),
        loadCountryGeoJsonSource()
      ]);
      const { url, geojson, dataSource } = geojsonSource;

      indexCountryTranslations(translation, geojson);
      applyChineseCountryNamesToBundle();

      if (
        cesiumState.sources.countryFill &&
        cesiumState.viewer.dataSources.contains(cesiumState.sources.countryFill)
      ) {
        cesiumState.viewer.dataSources.remove(cesiumState.sources.countryFill, true);
      }

      cesiumState.countryEntityByIso3.clear();
      cesiumState.borderEntityByIso3.clear();
      cesiumState.countryGeoFeatureByIso3.clear();
      cesiumState.sources.countryBorder?.entities.removeAll();
      cesiumState.sources.countryFill = dataSource;
      cesiumState.viewer.dataSources.add(dataSource);

      const features = Array.isArray(geojson.features) ? geojson.features : [];
      const edgeRegistry = new Set();

      for (const feature of features) {
        const iso3 = readIso3FromFeature(feature);
        if (!iso3) continue;
        cesiumState.countryGeoFeatureByIso3.set(iso3, feature);
        appendBoundaryGeometry(
          cesiumState.sources.countryBorder.entities,
          feature.geometry,
          edgeRegistry,
          iso3
        );
      }

      dataSource.entities.values.forEach((entity) => {
        const iso3 = readIso3(entity);
        if (!iso3 || !entity.polygon) return;

        setEntityProperty(entity, "iso3", iso3);
        const bucket = cesiumState.countryEntityByIso3.get(iso3) || [];
        bucket.push(entity);
        cesiumState.countryEntityByIso3.set(iso3, bucket);

        entity.show = true;
        entity.polygon.outline = false;
        entity.polygon.arcType = Cesium.ArcType.GEODESIC;
        entity.polygon.granularity = Cesium.Math.toRadians(1.0);
        entity.polygon.perPositionHeight = false;
        entity.polygon.height = 800;
        entity.polygon.extrudedHeight = undefined;
      });

      populateCountrySelect();
      renderAll();
    } catch (error) {
      console.error("Failed to load geoBoundaries country layer:", error);
      showGlobeBootError(
        "国家边界数据加载失败，请检查 geoBoundaries 或 world_countries_simplified 数据路径。",
        false
      );
    }
  }

  async function loadCountryGeoJsonSource() {
    let lastError = null;

    for (const url of WORLD_GEOJSON_FALLBACKS) {
      try {
        const geojson = await fetchJson(url);
        const dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
          stroke: Cesium.Color.TRANSPARENT,
          fill: Cesium.Color.fromCssColorString(COUNTRY_BASE_FILL).withAlpha(
            COUNTRY_INACTIVE_FILL_ALPHA
          ),
          clampToGround: false
        });
        return { url, geojson, dataSource };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Country GeoJSON load failed.");
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/geo+json, application/json" }
    });
    if (!response.ok) {
      throw new Error(`${url} returned HTTP ${response.status}`);
    }
    return response.json();
  }

  async function loadCountryTranslations() {
    try {
      return await fetchJson(COUNTRY_TRANSLATION_URL);
    } catch (error) {
      console.warn("Country translation cache failed to load.", error);
      return {};
    }
  }

  function indexCountryTranslations(translation, geojson) {
    cesiumState.countryNameZhByIso3.clear();
    cesiumState.countryNameZhByName.clear();

    Object.entries(translation || {}).forEach(([name, zh]) => {
      const cleanName = String(name || "").trim();
      const cleanZh = String(zh || "").trim();
      if (cleanName && cleanZh) {
        cesiumState.countryNameZhByName.set(normalizeNameKey(cleanName), cleanZh);
      }
    });

    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    for (const feature of features) {
      const iso3 = readIso3FromFeature(feature);
      const nameEn = readFeatureCountryName(feature);
      const nameZh = resolveChineseCountryName(feature, nameEn);
      if (iso3 && nameZh) {
        cesiumState.countryNameZhByIso3.set(iso3, nameZh);
      }
      if (nameEn && nameZh) {
        cesiumState.countryNameZhByName.set(normalizeNameKey(nameEn), nameZh);
      }
    }
  }

  function applyChineseCountryNamesToBundle() {
    if (!state.bundle?.countries) return;

    for (const country of state.bundle.countries) {
      const iso3 = countryIso3(country);
      const nameEn = country.nameEn || country.name || country.country || iso3;
      const nameZh =
        cesiumState.countryNameZhByIso3.get(iso3) ||
        cesiumState.countryNameZhByName.get(normalizeNameKey(nameEn)) ||
        COUNTRY_ZH_FALLBACK[iso3];

      if (!country.nameEn) country.nameEn = nameEn;
      if (nameZh) {
        country.nameZh = nameZh;
        country.name = nameZh;
      }
    }
  }

  function resolveChineseCountryName(feature, nameEn) {
    const props = feature?.properties || {};
    const iso3 = readIso3FromFeature(feature);
    const direct = String(props.nameZh || props.shapeNameZh || "").trim();
    const byIso = iso3 ? cesiumState.countryNameZhByIso3.get(iso3) : "";
    const byName = nameEn
      ? cesiumState.countryNameZhByName.get(normalizeNameKey(nameEn))
      : "";

    return byIso || byName || direct || COUNTRY_ZH_FALLBACK[iso3] || "";
  }

  function readFeatureCountryName(feature) {
    const props = feature?.properties || {};
    return String(
      props.name ||
        props.shapeName ||
        props.NAME ||
        props.admin ||
        props.ADMIN ||
        props.name_long ||
        props.NAME_LONG ||
        feature?.id ||
        ""
    ).trim();
  }

  function readIso3FromFeature(feature) {
    const props = feature?.properties || {};
    const value =
      props.iso3 ||
      props.ISO3 ||
      props.iso_a3 ||
      props.ISO_A3 ||
      props.adm0_a3 ||
      props.ADM0_A3 ||
      props.WB_A3 ||
      props.BRK_A3 ||
      props.shapeGroup ||
      (typeof feature?.id === "string" && feature.id.length === 3
        ? feature.id
        : "");
    const iso3 = String(value || "").trim().toUpperCase();
    return iso3 && iso3 !== "-99" ? iso3 : "";
  }

  function normalizeNameKey(value) {
    return String(value || "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
      .trim();
  }

  function renderCountryFocusBackdrop(section = activePrimarySection()) {
    if (!DOM.countryFocusMap) return;

    if (section !== "overview" || !state.countryFocusActive || !state.selectedCountry) {
      DOM.countryFocusMap.innerHTML = "";
      return;
    }

    const country = findCountry(state.selectedCountry);
    const feature = cesiumState.countryGeoFeatureByIso3.get(state.selectedCountry);
    DOM.countryFocusMap.innerHTML = buildCountrySilhouetteSvg(feature, country);
  }

  function buildCountrySilhouetteSvg(feature, country) {
    const countryName = country?.name || country?.country || country?.iso3 || "当前国家";
    const rings = collectGeoRings(feature?.geometry);

    if (!rings.length) {
      return `<div class="country-focus-watermark">${escapeHtml(countryName)}</div>`;
    }

    const normalizedRings = normalizeRingsForDateline(rings);
    const points = normalizedRings.flat();
    const minLon = Math.min(...points.map((point) => point[0]));
    const maxLon = Math.max(...points.map((point) => point[0]));
    const minLat = Math.min(...points.map((point) => point[1]));
    const maxLat = Math.max(...points.map((point) => point[1]));
    const width = Math.max(maxLon - minLon, 0.1);
    const height = Math.max(maxLat - minLat, 0.1);
    const viewWidth = 1000;
    const viewHeight = 560;
    const pad = 54;
    const scale = Math.min(
      (viewWidth - pad * 2) / width,
      (viewHeight - pad * 2) / height
    );
    const offsetX = (viewWidth - width * scale) / 2;
    const offsetY = (viewHeight - height * scale) / 2;

    const path = normalizedRings
      .map((ring) =>
        ring
          .map((point, index) => {
            const x = offsetX + (point[0] - minLon) * scale;
            const y = offsetY + (maxLat - point[1]) * scale;
            return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(" ") + " Z"
      )
      .join(" ");

    return `
      <svg viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(
      countryName
    )} 轮廓">
        <path d="${path}" fill-rule="evenodd"></path>
      </svg>
      <div class="country-focus-watermark">${escapeHtml(countryName)}</div>
    `;
  }

  function collectGeoRings(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Polygon") {
      return geometry.coordinates
        .map(cleanRingCoordinates)
        .filter((ring) => ring.length >= 3);
    }
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates
        .flatMap((polygon) => polygon.map(cleanRingCoordinates))
        .filter((ring) => ring.length >= 3);
    }
    return [];
  }

  function cleanRingCoordinates(ring) {
    return (Array.isArray(ring) ? ring : [])
      .map((point) => [Number(point?.[0]), Number(point?.[1])])
      .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
  }

  function normalizeRingsForDateline(rings) {
    const allLongitudes = rings.flat().map((point) => point[0]);
    const min = Math.min(...allLongitudes);
    const max = Math.max(...allLongitudes);
    if (max - min <= 180) return rings;

    return rings.map((ring) =>
      ring.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat])
    );
  }

  function appendBoundaryGeometry(entities, geometry, edgeRegistry, iso3) {
    const type = geometry?.type;
    const coordinates = geometry?.coordinates;
    if (!type || !Array.isArray(coordinates)) return;

    if (type === "Polygon") {
      appendPolygonBoundary(entities, coordinates, edgeRegistry, iso3);
      return;
    }

    if (type === "MultiPolygon") {
      coordinates.forEach((polygon) =>
        appendPolygonBoundary(entities, polygon, edgeRegistry, iso3)
      );
    }
  }

  function appendPolygonBoundary(entities, rings, edgeRegistry, iso3) {
    if (!Array.isArray(rings)) return;
    rings.forEach((ring) => addBoundarySegments(entities, ring, true, edgeRegistry, iso3));
  }

  function addBoundarySegments(entities, coordinates, closed, edgeRegistry, iso3) {
    const segments = buildBoundarySegments(coordinates, closed);

    for (const segment of segments) {
      if (segment.length < 2) continue;

      let pending = [];

      for (let index = 1; index < segment.length; index += 1) {
        const previous = segment[index - 1];
        const point = segment[index];
        const edgeKey = buildBoundaryEdgeKey(previous, point);

        if (edgeRegistry.has(edgeKey)) {
          emitBoundaryPolyline(entities, pending, iso3);
          pending = [];
          continue;
        }

        edgeRegistry.add(edgeKey);
        if (!pending.length) pending.push(previous);
        pending.push(point);
      }

      emitBoundaryPolyline(entities, pending, iso3);
    }
  }

  function emitBoundaryPolyline(entities, segment, iso3) {
    if (!segment || segment.length < 2) return;

    const entity = entities.add({
      id: `border-${iso3}-${entities.values.length}`,
      polyline: {
        positions: segment.map(([lon, lat]) =>
          Cesium.Cartesian3.fromDegrees(lon, lat, BOUNDARY_ALTITUDE)
        ),
        width: 1.05,
        arcType: Cesium.ArcType.NONE,
        clampToGround: false,
        material: new Cesium.PolylineGlowMaterialProperty({
          color: Cesium.Color.fromCssColorString(COUNTRY_BASE_BORDER).withAlpha(0.48),
          glowPower: 0.08,
          taperPower: 0.9
        })
      }
    });

    setEntityProperty(entity, "iso3", iso3);
    cesiumState.borderEntityByIso3.set(iso3, entity);
  }

  function buildBoundarySegments(coordinates, closed) {
    const sampled = sampleBoundaryCoordinates(coordinates, closed);
    if (sampled.length < 2) return [];

    const segments = [];
    let current = [sampled[0]];

    for (let index = 1; index < sampled.length; index += 1) {
      const point = sampled[index];
      const previous = current[current.length - 1];

      if (Math.abs(point[0] - previous[0]) > BOUNDARY_DATELINE_THRESHOLD) {
        if (current.length > 1) segments.push(current);
        current = [point];
        continue;
      }

      current.push(point);
    }

    if (current.length > 1) segments.push(current);
    return segments;
  }

  function sampleBoundaryCoordinates(coordinates, closed) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) return [];

    const cleaned = [];
    for (const coordinate of coordinates) {
      if (!Array.isArray(coordinate) || coordinate.length < 2) continue;
      const lon = Number(coordinate[0]);
      const lat = Number(coordinate[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;

      const point = [
        Number(lon.toFixed(BOUNDARY_POINT_PRECISION)),
        Number(lat.toFixed(BOUNDARY_POINT_PRECISION))
      ];
      const previous = cleaned[cleaned.length - 1];
      if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
        cleaned.push(point);
      }
    }

    if (closed && cleaned.length > 2) {
      const first = cleaned[0];
      const last = cleaned[cleaned.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        cleaned.push(first);
      }
    }

    return cleaned;
  }

  function buildBoundaryEdgeKey(left, right) {
    const first = `${left[0].toFixed(BOUNDARY_POINT_PRECISION)},${left[1].toFixed(
      BOUNDARY_POINT_PRECISION
    )}`;
    const second = `${right[0].toFixed(BOUNDARY_POINT_PRECISION)},${right[1].toFixed(
      BOUNDARY_POINT_PRECISION
    )}`;
    return first < second ? `${first}|${second}` : `${second}|${first}`;
  }

  function setEntityProperty(entity, key, value) {
    if (!entity.properties) {
      entity.properties = new Cesium.PropertyBag();
    }

    if (!entity.properties[key]) {
      entity.properties.addProperty(key);
    }

    entity.properties[key] = new Cesium.ConstantProperty(value);
  }

  function readIso3(entity) {
    const props = entity.properties;
    if (!props) return "";

    const candidates = [
      "iso3",
      "ISO3",
      "iso_a3",
      "ISO_A3",
      "shapeGroup",
      "ADM0_A3",
      "adm0_a3",
      "WB_A3",
      "BRK_A3",
      "SOV_A3",
      "GU_A3",
      "NAME"
    ];

    for (const key of candidates) {
      const value = props[key]?.getValue?.();
      if (value && value !== "-99") return String(value).trim();
    }

    return "";
  }

  

  function updateCountryHeat() {
    const source = cesiumState.sources.countryFill;
    if (!source || !state.bundle) return;

    const byIso = new Map(
      state.bundle.countries.map((country) => [country.iso3, country])
    );

    for (const entity of source.entities.values) {
      const iso3 = readIso3(entity);
      if (!iso3 || !entity.polygon) continue;

      const country = byIso.get(iso3);
      const isChina = iso3 === "CHN";
      const hasData = !!country;
      const value = hasData ? metricValue(country) : 0;
      const meetsThreshold = hasData && value >= state.threshold;
      const hovered = iso3 === cesiumState.hoveredIso3;
      const selected = iso3 === state.selectedCountry;
      const focused = hovered || selected;
      const inCountryMode = isCountryScope();
      const mutedByCountryScope = inCountryMode && !selected;

      let fillColor = Cesium.Color.fromCssColorString(COUNTRY_BASE_FILL);
      let alpha = COUNTRY_INACTIVE_FILL_ALPHA;

      if (isChina) {
        fillColor = Cesium.Color.fromCssColorString(CHINA_RED);
        alpha = selected
          ? 0.9
          : hovered
          ? 0.82
          : mutedByCountryScope
          ? 0.24
          : 0.72;
      } else if (selected) {
        fillColor = hasData && state.heat ? colorForValue(value) : Cesium.Color.fromCssColorString("#ffffff");
        alpha = COUNTRY_SELECTED_FILL_ALPHA;
      } else if (hovered) {
        fillColor = hasData && state.heat ? colorForValue(value) : Cesium.Color.fromCssColorString(COUNTRY_BASE_BORDER);
        alpha = COUNTRY_HOVER_FILL_ALPHA;
      } else if (mutedByCountryScope) {
        fillColor = Cesium.Color.fromCssColorString(COUNTRY_BASE_FILL);
        alpha = 0.06;
      } else if (!hasData) {
        fillColor = Cesium.Color.fromCssColorString(COUNTRY_BASE_FILL);
        alpha = 0.04;
      } else if (!state.heat) {
        fillColor = Cesium.Color.fromCssColorString("#13314d");
        alpha = focused ? 0.4 : 0.14;
      } else if (meetsThreshold) {
        fillColor = colorForValue(value);
        alpha = COUNTRY_ACTIVE_FILL_ALPHA;
      } else {
        fillColor = colorForValue(value);
        alpha = 0.12;
      }

      entity.show = true;
      entity.polygon.material = fillColor.withAlpha(alpha);
      entity.polygon.outline = false;
      entity.polygon.height = selected ? 1_200 : hovered ? 1_000 : isChina ? 950 : 800;
      entity.polygon.extrudedHeight = undefined;
      entity.polygon.disableDepthTestDistance = Number.POSITIVE_INFINITY;

      if (focused) {
        entity.polygon.material = fillColor.withAlpha(
          selected ? COUNTRY_SELECTED_FILL_ALPHA : COUNTRY_HOVER_FILL_ALPHA
        );
      }
    }

    cesiumState.viewer?.scene.requestRender();
  }

  function updateCountryBorders() {
    const source = cesiumState.sources.countryBorder;
    if (!source || !state.bundle) return;

    const byIso = new Map(
      state.bundle.countries.map((country) => [country.iso3, country])
    );

    for (const entity of source.entities.values) {
      const iso3 = entity.properties?.iso3?.getValue?.();
      const country = byIso.get(iso3);
      const isChina = iso3 === "CHN";

      const hasData = !!country;
      const pass = hasData ? passesFilters(country) : false;
      const value = hasData ? metricValue(country) : 0;
      const active = hasData && pass && value >= state.threshold;
      const hovered = iso3 === cesiumState.hoveredIso3;
      const selected = iso3 === state.selectedCountry;
      const mutedByCountryScope = isCountryScope() && !selected;

      let borderColor;
      let borderAlpha;
      let borderWidth;

      if (selected) {
        borderColor = Cesium.Color.fromCssColorString(CHINA_GOLD);
        borderAlpha = 0.98;
        borderWidth = 2.7;
      } else if (isChina) {
        borderColor = Cesium.Color.fromCssColorString(CHINA_RED_EDGE);
        borderAlpha = hovered ? 0.94 : mutedByCountryScope ? 0.44 : 0.72;
        borderWidth = hovered ? 2.1 : 1.45;
      } else if (hovered) {
        borderColor = Cesium.Color.fromCssColorString("#ffffff");
        borderAlpha = 0.88;
        borderWidth = 1.8;
      } else if (active) {
        borderColor = Cesium.Color.fromCssColorString(COUNTRY_BASE_BORDER);
        borderAlpha = 0.42;
        borderWidth = 1.15;
      } else {
        borderColor = Cesium.Color.fromCssColorString(COUNTRY_BASE_BORDER);
        borderAlpha = hasData ? 0.28 : 0.16;
        borderWidth = 1.0;
      }

      if (entity.polygon) {
        entity.polygon.material = Cesium.Color.TRANSPARENT;
        entity.polygon.outline = false;
      }

      if (entity.polyline) {
        entity.polyline.width = borderWidth;
        entity.polyline.arcType = Cesium.ArcType.NONE;
        entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
          color: borderColor.withAlpha(borderAlpha),
          glowPower: selected || hovered ? 0.14 : 0.06,
          taperPower: 0.9
        });
      }
    }

    cesiumState.viewer?.scene.requestRender();
  }

  /**
   * --------------------------------------------------------------------------
   * Camera rig
   * --------------------------------------------------------------------------
   */

  function configureCameraRig() {
    const viewer = cesiumState.viewer;
    if (!viewer) return;

    const controller = viewer.scene.screenSpaceCameraController;

    controller.enableInputs = true;
    controller.enableRotate = true;
    controller.enableTranslate = false;
    controller.enableZoom = true;
    controller.enableTilt = true;
    controller.enableLook = false;
    controller.inertiaSpin = 0.82;
    controller.inertiaTranslate = 0;
    controller.inertiaZoom = 0.72;
    controller.minimumZoomDistance = 1_350_000;
    controller.maximumZoomDistance = 32_000_000;
    controller.zoomFactor = 2.1;

    cesiumState.camera.lon = DEFAULT_CAMERA.lon;
    cesiumState.camera.lat = DEFAULT_CAMERA.lat;
    cesiumState.camera.distance = DEFAULT_CAMERA.distance;
    applyCameraRig(true);

    viewer.clock.onTick.addEventListener(() => {
      if (
        cesiumState.camera.autoRotate &&
        Date.now() >= cesiumState.camera.pausedUntil &&
        !cesiumState.camera.dragging
      ) {
        viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -ROTATE_RATE / 210);
        syncCameraStateFromViewer();
        queueLabelRender();
      }
    });

    viewer.camera.moveStart.addEventListener(() => {
      cesiumState.camera.dragging = true;
      pauseCameraRotation(2800);
    });

    viewer.camera.moveEnd.addEventListener(() => {
      cesiumState.camera.dragging = false;
      syncCameraStateFromViewer();
      queueLabelRender();
    });

    viewer.camera.changed.addEventListener(() => {
      syncCameraStateFromViewer();
      queueLabelRender();
    });

    viewer.scene.requestRender();
  }

  function updateCameraRig() {
    const camera = cesiumState.camera;

    updateCameraAnimation();

    if (
      !camera.animation &&
      !camera.dragging &&
      !camera.pointers.size &&
      camera.autoRotate &&
      Date.now() >= camera.pausedUntil
    ) {
      camera.lon = normalizeLon(camera.lon - ROTATE_RATE / 60);
    }

    applyCameraRig();
  }

  function updateCameraAnimation() {
    const animation = cesiumState.camera.animation;
    if (!animation) return false;

    const now = performance.now();
    const progress = Math.min(1, (now - animation.startedAt) / animation.durationMs);
    const eased = progress * progress * (3 - 2 * progress);

    cesiumState.camera.lon = normalizeLon(
      animation.startLon + animation.deltaLon * eased
    );

    cesiumState.camera.lat = clampLat(
      animation.startLat + (animation.endLat - animation.startLat) * eased
    );

    cesiumState.camera.distance = clampDistance(
      animation.startDistance +
        (animation.endDistance - animation.startDistance) * eased
    );

    if (progress >= 1) {
      cesiumState.camera.animation = null;
    }

    return true;
  }

  function applyCameraRig(forceRender = false) {
    const viewer = cesiumState.viewer;
    if (!viewer) return;

    const camera = cesiumState.camera;

    const destination = Cesium.Cartesian3.fromRadians(
      normalizeLon(camera.lon),
      clampLat(camera.lat),
      Math.max(0, clampDistance(camera.distance) - EARTH_RADIUS)
    );

    const orientation = buildCenteredCameraOrientation(destination);

    viewer.camera.setView({
      destination,
      orientation
    });

    if (forceRender) viewer.scene.requestRender();
  }

  function buildCenteredCameraOrientation(destination) {
    const direction = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.negate(destination, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );

    const surface =
      Cesium.Ellipsoid.WGS84.scaleToGeodeticSurface(
        destination,
        new Cesium.Cartesian3()
      ) || Cesium.Cartesian3.normalize(destination, new Cesium.Cartesian3());

    const enuFrame = Cesium.Transforms.eastNorthUpToFixedFrame(surface);
    const north4 = Cesium.Matrix4.getColumn(enuFrame, 1, new Cesium.Cartesian4());
    const north = Cesium.Cartesian3.normalize(
      new Cesium.Cartesian3(north4.x, north4.y, north4.z),
      new Cesium.Cartesian3()
    );

    let right = Cesium.Cartesian3.cross(direction, north, new Cesium.Cartesian3());

    if (Cesium.Cartesian3.magnitudeSquared(right) < 1e-8) {
      right = Cesium.Cartesian3.cross(
        direction,
        Cesium.Cartesian3.UNIT_Z,
        right
      );
    }

    right = Cesium.Cartesian3.normalize(right, right);

    const up = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(right, direction, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );

    return { direction, up };
  }

  function animateCameraTo({ lon, lat, distance, duration = 1200 }) {
    pauseCameraRotation(duration + 2500);

    cesiumState.camera.animation = {
      startedAt: performance.now(),
      durationMs: Math.max(1, duration),
      startLon: cesiumState.camera.lon,
      startLat: cesiumState.camera.lat,
      startDistance: cesiumState.camera.distance,
      deltaLon: Cesium.Math.negativePiToPi(normalizeLon(lon) - cesiumState.camera.lon),
      endLat: clampLat(lat),
      endDistance: clampDistance(distance)
    };
  }

  function flyCameraToCountry(iso3, options = {}) {
    const viewer = cesiumState.viewer;
    const country = findCountry(iso3);
    if (
      !viewer ||
      !country ||
      !Number.isFinite(country.lon) ||
      !Number.isFinite(country.lat)
    ) {
      return;
    }

    pauseCameraRotation((options.duration || 1.4) * 1000 + 2400);

    const framedLat = Cesium.Math.clamp(
      country.lat - Math.sign(country.lat || 1) * 8,
      -60,
      72
    );
    const framedLon = country.lon + (country.lon >= 0 ? -6 : 6);

    const destination = Cesium.Cartesian3.fromDegrees(
      framedLon,
      framedLat,
      options.height || 7_800_000
    );

    viewer.camera.flyTo({
      destination,
      orientation: buildCenteredCameraOrientation(destination),
      duration: options.duration || 1.4,
      complete: () => {
        syncCameraStateFromViewer();
        queueLabelRender();
      }
    });
  }

  function flyCameraToGlobal() {
    const viewer = cesiumState.viewer;
    if (!viewer) return;

    pauseCameraRotation(4200);

    const destination = Cesium.Cartesian3.fromRadians(
      DEFAULT_CAMERA.lon,
      DEFAULT_CAMERA.lat,
      DEFAULT_DISTANCE - EARTH_RADIUS
    );

    viewer.camera.flyTo({
      destination,
      orientation: buildCenteredCameraOrientation(destination),
      duration: 1.5,
      complete: () => {
        syncCameraStateFromViewer();
        queueLabelRender();
      }
    });
  }

  function syncCameraStateFromViewer() {
    const viewer = cesiumState.viewer;
    if (!viewer) return;

    const cartographic = viewer.camera.positionCartographic;
    if (!cartographic) return;

    cesiumState.camera.lon = cartographic.longitude;
    cesiumState.camera.lat = cartographic.latitude;
    cesiumState.camera.distance = EARTH_RADIUS + Math.max(0, cartographic.height);
  }

  function normalizeLon(lon) {
    return Cesium.Math.negativePiToPi(lon || 0);
  }

  function clampLat(lat) {
    return Cesium.Math.clamp(
      lat || 0,
      Cesium.Math.toRadians(-82),
      Cesium.Math.toRadians(82)
    );
  }

  function clampDistance(distance) {
    return Cesium.Math.clamp(
      Number.isFinite(distance) ? distance : DEFAULT_DISTANCE,
      MIN_DISTANCE,
      MAX_DISTANCE
    );
  }

  function pauseCameraRotation(duration = 4500) {
    cesiumState.camera.pausedUntil = Date.now() + duration;
  }

  /**
   * --------------------------------------------------------------------------
   * Mouse / touch interaction
   * --------------------------------------------------------------------------
   */

  function bindSceneInteractions() {
    const viewer = cesiumState.viewer;
    if (!viewer) return;

    const canvas = viewer.scene.canvas;
    canvas.style.touchAction = "none";
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("pointerdown", () => pauseCameraRotation(), {
      passive: true
    });
    canvas.addEventListener("wheel", () => pauseCameraRotation(), {
      passive: true
    });
    canvas.addEventListener(
      "mouseleave",
      () => {
        if (cesiumState.hoveredIso3) {
          cesiumState.hoveredIso3 = "";
          if (activePrimarySection() === "overview") {
            updateCountryHeat();
            updateCountryBorders();
            updateTradeFlows();
            queueLabelRender();
          }
        }
        hideGlobeTooltip();
      },
      { passive: true }
    );

    cesiumState.screenHandler?.destroy?.();
    cesiumState.screenHandler = new Cesium.ScreenSpaceEventHandler(canvas);

    cesiumState.screenHandler.setInputAction((movement) => {
      pauseCameraRotation(2200);
      handleHover(movement.endPosition);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    cesiumState.screenHandler.setInputAction((click) => {
      pauseCameraRotation(3200);
      handleSceneClick(click.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  function getCanvasPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return new Cesium.Cartesian2(event.clientX - rect.left, event.clientY - rect.top);
  }

  function getPointerDistance() {
    const pointers = [...cesiumState.camera.pointers.values()];
    if (pointers.length < 2) return 0;
    return Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y);
  }

  function orbitCameraByScreenDelta(dx, dy, canvas) {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);

    cesiumState.camera.lon = normalizeLon(
      cesiumState.camera.lon - (dx / width) * Math.PI * 1.85
    );

    cesiumState.camera.lat = clampLat(
      cesiumState.camera.lat + (dy / height) * Math.PI * 1.18
    );

    cesiumState.camera.animation = null;
    applyCameraRig(true);
  }

  function zoomCameraByFactor(factor) {
    if (!Number.isFinite(factor) || factor <= 0) return;

    cesiumState.camera.distance = clampDistance(
      cesiumState.camera.distance * factor
    );

    cesiumState.camera.animation = null;
    applyCameraRig(true);
  }

  function handleHover(position) {
    const viewer = cesiumState.viewer;
    if (!viewer) return;

    const picked = viewer.scene.pick(position);
    const iso3 = picked?.id?.properties?.iso3?.getValue?.();

    if (iso3) {
      if (cesiumState.hoveredIso3 !== iso3) {
        cesiumState.hoveredIso3 = iso3;
        if (activePrimarySection() === "overview") {
          updateCountryHeat();
          updateCountryBorders();
          updateTradeFlows();
          queueLabelRender();
        }
      }

      showGlobeTooltip(iso3, position);
      return;
    }

    if (cesiumState.hoveredIso3) {
      cesiumState.hoveredIso3 = "";
      if (activePrimarySection() === "overview") {
        updateCountryHeat();
        updateCountryBorders();
        updateTradeFlows();
        queueLabelRender();
      }
    }

    hideGlobeTooltip();
  }

  function handleSceneClick(position) {
    const viewer = cesiumState.viewer;
    if (!viewer) return;

    const picked = viewer.scene.pick(position);
    const iso3 = picked?.id?.properties?.iso3?.getValue?.();

    if (!iso3) return;

    const country = findCountry(iso3);
    if (!country) return;

    selectCountry(iso3, { flyTo: true });
  }

  /**
   * --------------------------------------------------------------------------
   * China source, graticule, flows, focus layer
   * --------------------------------------------------------------------------
   */

  function createGraticule() {
    const source = cesiumState.sources.grid;
    if (!source) return;

    source.entities.removeAll();

    const lineColor = Cesium.Color.fromCssColorString("#5db8ff").withAlpha(0.085);

    [-60, -30, 0, 30, 60].forEach((lat) => {
      source.entities.add({
        polyline: {
          positions: parallelPositions(lat),
          width: lat === 0 ? 1.15 : 0.7,
          material: lineColor
        }
      });
    });

    for (let lon = -150; lon <= 150; lon += 30) {
      source.entities.add({
        polyline: {
          positions: meridianPositions(lon),
          width: 0.7,
          material: lineColor
        }
      });
    }
  }

  function parallelPositions(latitude) {
    const positions = [];
    for (let lon = -180; lon <= 180; lon += 3) {
      positions.push(Cesium.Cartesian3.fromDegrees(lon, latitude, 6000));
    }
    return positions;
  }

  function meridianPositions(longitude) {
    const positions = [];
    for (let lat = -80; lat <= 80; lat += 3) {
      positions.push(Cesium.Cartesian3.fromDegrees(longitude, lat, 6000));
    }
    return positions;
  }

  function createChinaLayer() {
    const source = cesiumState.sources.chinaSource;
    if (!source || !indexData.china) return;

    source.entities.removeAll();

    const china = indexData.china;
    const lon = Number(china.lon ?? 104.1954);
    const lat = Number(china.lat ?? 35.8617);

    source.entities.add({
      id: "china-source-core",
      name: "中国",
      position: Cesium.Cartesian3.fromDegrees(lon, lat, 120_000),
      point: {
        pixelSize: 20,
        color: Cesium.Color.fromCssColorString(CHINA_GOLD),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        scaleByDistance: new Cesium.NearFarScalar(8e5, 1.4, 3.5e7, 0.6)
      },
      label: {
        text: "中国",
        font: "700 17px Inter, Microsoft YaHei, sans-serif",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        scaleByDistance: new Cesium.NearFarScalar(1.2e6, 1.0, 3.8e7, 0.45)
      }
    });

    source.entities.add({
      id: "china-source-halo",
      position: Cesium.Cartesian3.fromDegrees(lon, lat, 110_000),
      point: {
        pixelSize: 34,
        color: Cesium.Color.fromCssColorString(CHINA_GOLD).withAlpha(0.18),
        outlineColor: Cesium.Color.fromCssColorString(CHINA_GOLD).withAlpha(0.4),
        outlineWidth: 1,
        scaleByDistance: new Cesium.NearFarScalar(8e5, 1.2, 3.5e7, 0.3),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
  }

  

  function updateTradeFlows() {
    const source = cesiumState.sources.tradeFlow;
    const pointCollection = cesiumState.primitives.flowPoints;

    if (!source || !pointCollection || !state.bundle) return;

    source.entities.removeAll();
    pointCollection.removeAll();

    if (!state.flows) {
      cesiumState.viewer?.scene.requestRender();
      return;
    }

    const visible = selectVisibleFlows();

    visible.forEach((flow, index) => {
      if (!Number.isFinite(flow.toLon) || !Number.isFinite(flow.toLat)) return;

      const layerType = classifyFlowLayer(flow, index);
      const style = getArcStyle(flow, layerType);
      const origin = offsetFlowOrigin(flow, layerType);

      const positions = buildGreatArc(
        origin.lon,
        origin.lat,
        flow.toLon,
        flow.toLat,
        style.height
      );

      source.entities.add({
        id: `flow-${flow.id || `${flow.toIso3}-${index}`}`,
        polyline: {
          positions,
          width: style.width,
          arcType: Cesium.ArcType.NONE,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: style.glowPower,
            taperPower: 0.72,
            color: style.color.withAlpha(style.alpha)
          })
        },
        properties: {
          type: "trade-flow",
          toIso3: flow.toIso3,
          dependency: flow.dependency,
          value: getFlowDisplayValue(flow)
        }
      });

      if (state.particles && (layerType === "focused" || layerType === "primary")) {
        source.entities.add({
          id: `flow-pulse-${flow.id || `${flow.toIso3}-${index}`}`,
          position: movingPointProperty(positions, index),
          point: {
            pixelSize: layerType === "focused" ? 9 : 5,
            color: Cesium.Color.WHITE.withAlpha(layerType === "focused" ? 0.98 : 0.74),
            outlineColor: style.color.withAlpha(0.92),
            outlineWidth: layerType === "focused" ? 2.4 : 1.6,
            scaleByDistance: new Cesium.NearFarScalar(9e5, 1.3, 3.5e7, 0.35)
          }
        });
      }

      const endpointAlpha =
        layerType === "focused"
          ? 0.96
          : layerType === "hovered"
          ? 0.82
          : layerType === "primary"
          ? 0.62
          : 0.22;

      pointCollection.add({
        position: Cesium.Cartesian3.fromDegrees(flow.toLon, flow.toLat, 32_000),
        pixelSize:
          layerType === "focused"
            ? 12
            : layerType === "hovered"
            ? 9
            : layerType === "primary"
            ? 5.5
            : 3.2,
        color: style.color.withAlpha(endpointAlpha),
        outlineColor: Cesium.Color.WHITE.withAlpha(
          layerType === "focused" ? 0.94 : layerType === "hovered" ? 0.72 : 0.38
        ),
        outlineWidth: layerType === "focused" ? 2 : 1,
        scaleByDistance: new Cesium.NearFarScalar(8e5, 1.25, 3.2e7, 0.25),
        translucencyByDistance: new Cesium.NearFarScalar(8e5, 1.0, 3.5e7, 0.15)
      });
    });

    cesiumState.viewer?.scene.requestRender();
  }

  function flowCandidates() {
    if (!state.bundle?.flows) return [];

    const allowedIso3 = new Set(filteredCountries().map((country) => country.iso3));

    return state.bundle.flows
      .filter((flow) => {
        if (!allowedIso3.has(flow.toIso3)) return false;
        if (Number(flow.dependency || 0) < state.threshold) return false;

        if (state.selectedCategory !== "all") {
          const country = findCountry(flow.toIso3);
          const cell = country ? categoryMetrics(country, state.selectedCategory) : null;
          return cell && Number(cell.dependency || 0) >= state.threshold;
        }

        return true;
      })
      .sort((a, b) => getFlowRankValue(b) - getFlowRankValue(a));
  }

  function visibleFlows() {
    return selectVisibleFlows();
  }

  function selectVisibleFlows() {
    const candidates = flowCandidates();
    if (!candidates.length) return [];

    if (isCountryScope() || state.countryFocusActive) {
      return candidates
        .filter((flow) => flow.toIso3 === state.selectedCountry)
        .slice(0, 1);
    }

    const merged = new Map();
    const primaryKeys = new Set();
    const hoverIso3 = cesiumState.hoveredIso3;

    candidates
      .slice(0, GLOBAL_PRIMARY_FLOW_LIMIT)
      .forEach((flow) => {
        const key = flowKey(flow);
        primaryKeys.add(key);
        merged.set(key, flow);
      });

    const flowsByRegion = new Map();
    candidates.forEach((flow) => {
      const region = getFlowTargetRegion(flow);
      if (!flowsByRegion.has(region)) flowsByRegion.set(region, []);
      flowsByRegion.get(region).push(flow);
    });

    flowsByRegion.forEach((flows) => {
      flows
        .slice(0, REGION_FLOW_LIMIT)
        .forEach((flow) => merged.set(flowKey(flow), flow));
    });

    if (hoverIso3) {
      const hoveredFlow = candidates.find((flow) => flow.toIso3 === hoverIso3);
      if (hoveredFlow) merged.set(flowKey(hoveredFlow), hoveredFlow);
    }

    return [...merged.values()]
      .sort((a, b) => getFlowRankValue(b) - getFlowRankValue(a))
      .slice(0, FLOW_LIMIT)
      .map((flow) => ({
        ...flow,
        __layerHint: primaryKeys.has(flowKey(flow)) ? "primary" : "secondary"
      }));
  }

  function classifyFlowLayer(flow, index) {
    if (isCountryScope() || state.countryFocusActive) {
      return flow.toIso3 === state.selectedCountry ? "focused" : "secondary";
    }

    if (cesiumState.hoveredIso3 && flow.toIso3 === cesiumState.hoveredIso3) {
      return "hovered";
    }

    return flow.__layerHint || (index < GLOBAL_PRIMARY_FLOW_LIMIT ? "primary" : "secondary");
  }

  function getArcStyle(flow, layerType) {
    const valueNorm = getFlowValueNorm(flow);
    const distanceFactor = getFlowDistanceFactor(flow);
    const baseHeight = 340_000 + distanceFactor * 980_000 + valueNorm * 680_000;
    const layerOffset =
      layerType === "focused"
        ? 320_000
        : layerType === "hovered"
        ? 190_000
        : layerType === "primary"
        ? 120_000
        : 0;

    if (layerType === "focused") {
      return {
        width: 6.6,
        alpha: 0.95,
        glowPower: 0.42,
        height: baseHeight + layerOffset,
        color: Cesium.Color.fromCssColorString("#fff0b3")
      };
    }

    if (layerType === "hovered") {
      return {
        width: 5.1,
        alpha: 0.88,
        glowPower: 0.3,
        height: baseHeight + layerOffset,
        color: Cesium.Color.fromCssColorString("#ffd166")
      };
    }

    if (layerType === "primary") {
      return {
        width: 2.4 + valueNorm * 2.4,
        alpha: 0.62 + valueNorm * 0.24,
        glowPower: 0.24,
        height: baseHeight + layerOffset,
        color: Cesium.Color.fromCssColorString("#f7c75a")
      };
    }

    return {
      width: 0.9 + valueNorm * 0.9,
      alpha: 0.14 + valueNorm * 0.18,
      glowPower: 0.1,
      height: baseHeight,
      color: Cesium.Color.fromCssColorString("#f7c75a")
    };
  }

  function offsetFlowOrigin(flow, layerType) {
    const fromLon = Number(flow.fromLon);
    const fromLat = Number(flow.fromLat);
    const toLon = Number(flow.toLon);
    const toLat = Number(flow.toLat);
    const dx = wrapDegrees(toLon - fromLon);
    const dy = toLat - fromLat;
    const spread =
      layerType === "secondary" ? 1.22 : layerType === "focused" ? 0.74 : 1.0;

    const offsetLon =
      Cesium.Math.clamp((dx / 180) * 3.6, -3.8, 3.8) * spread +
      Cesium.Math.clamp((-dy / 90) * 0.7, -0.9, 0.9);
    const offsetLat =
      Cesium.Math.clamp((dy / 90) * 2.5, -2.5, 2.5) * spread +
      Cesium.Math.clamp((dx / 180) * 0.45, -0.6, 0.6);

    return {
      lon: fromLon + offsetLon,
      lat: fromLat + offsetLat
    };
  }

  function getFlowRankValue(flow) {
    const valueNorm = getFlowValueNorm(flow);
    const dependency = Number(flow.dependency || 0);
    return valueNorm * 0.72 + dependency * 0.28;
  }

  function getFlowValueNorm(flow) {
    const valueNorm = Number(flow.valueNorm);
    if (Number.isFinite(valueNorm) && valueNorm > 0) return valueNorm;

    const value = getFlowDisplayValue(flow);
    if (!Number.isFinite(value) || value <= 0) return 0;

    return Math.min(1, Math.log10(value + 1) / 8);
  }

  function getFlowDisplayValue(flow) {
    return Number(flow.chinaImport || flow.value || 0);
  }

  function getFlowTargetRegion(flow) {
    const country = findCountry(flow.toIso3);
    return country?.region || "未分类";
  }

  function getFlowDistanceFactor(flow) {
    try {
      const start = Cesium.Cartographic.fromDegrees(flow.fromLon, flow.fromLat);
      const end = Cesium.Cartographic.fromDegrees(flow.toLon, flow.toLat);
      const geodesic = new Cesium.EllipsoidGeodesic(start, end);
      const normalized = geodesic.surfaceDistance / 17_000_000;
      return Cesium.Math.clamp(normalized, 0.18, 1);
    } catch (error) {
      return 0.45;
    }
  }

  function flowKey(flow) {
    return String(flow.id || `${flow.toIso3}::${flow.category || "all"}`);
  }

  function wrapDegrees(value) {
    let wrapped = Number(value || 0);
    while (wrapped > 180) wrapped -= 360;
    while (wrapped < -180) wrapped += 360;
    return wrapped;
  }

  function buildGreatArc(fromLon, fromLat, toLon, toLat, maxHeight, samples = 88) {
    const positions = [];

    try {
      const start = Cesium.Cartographic.fromDegrees(Number(fromLon), Number(fromLat));
      const end = Cesium.Cartographic.fromDegrees(Number(toLon), Number(toLat));
      const geodesic = new Cesium.EllipsoidGeodesic(start, end);

      for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const cartographic = geodesic.interpolateUsingFraction(t);
        const height = Math.sin(Math.PI * t) * maxHeight + 16_000;
        positions.push(
          Cesium.Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            height
          )
        );
      }

      return positions;
    } catch (error) {
      for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const lon = Number(fromLon) + (Number(toLon) - Number(fromLon)) * t;
        const lat = Number(fromLat) + (Number(toLat) - Number(fromLat)) * t;
        const height = Math.sin(Math.PI * t) * maxHeight + 16_000;
        positions.push(Cesium.Cartesian3.fromDegrees(lon, lat, height));
      }

      return positions;
    }
  }

  function movingPointProperty(positions, seed) {
    const start = Cesium.JulianDate.now();
    const period = 3.7 + (seed % 5) * 0.36;

    return new Cesium.CallbackProperty((time) => {
      const seconds = Cesium.JulianDate.secondsDifference(time, start);
      const t = ((seconds % period) + period) / period;
      const index = Math.min(
        positions.length - 1,
        Math.floor(t * (positions.length - 1))
      );
      return positions[index];
    }, false);
  }

  function updateFocusLayer() {
    const source = cesiumState.sources.focus;
    const points = cesiumState.primitives.focusPoints;

    if (!source || !points || !state.bundle) return;

    source.entities.removeAll();
    points.removeAll();

    const emphasisCountries = uniqueByIso3(
      [findCountry(state.selectedCountry), findCountry(cesiumState.hoveredIso3)].filter(Boolean)
    );

    emphasisCountries.forEach((country) => {
      const selected = country.iso3 === state.selectedCountry;
      points.add({
        position: Cesium.Cartesian3.fromDegrees(country.lon, country.lat, selected ? 92_000 : 76_000),
        pixelSize: selected ? 16 : 11,
        color: Cesium.Color.WHITE.withAlpha(selected ? 0.76 : 0.46),
        outlineColor: Cesium.Color.fromCssColorString(CHINA_GOLD).withAlpha(selected ? 0.98 : 0.72),
        outlineWidth: selected ? 3 : 2,
        scaleByDistance: new Cesium.NearFarScalar(8e5, 1.25, 3.2e7, 0.28)
      });
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Year loading and rendering
   * --------------------------------------------------------------------------
   */

  async function hydrateActiveSelection(section = activePrimarySection()) {
    if (!state.bundle) return;

    const year = Number(state.year);
    const activeCountry =
      state.selectedCountry || rankedCountries()[0]?.iso3 || state.bundle.countries[0]?.iso3;

    state.countryDetailRecord = null;
    if (
      activeCountry &&
      shouldLoadFocusedCountryData(section)
    ) {
      try {
        state.countryDetailRecord = await loader.getCountryDetail(
          activeCountry,
          year,
          state.selectedScope
        );
      } catch (error) {
        console.warn("Country drilldown not available:", activeCountry, year, error);
      }
    }

    if (state.selectedCategory !== "all") {
      try {
        if (
          state.categoryDimension === "analysis_minor" &&
          state.selectedScope === "manufactures"
        ) {
          await loader.ensureMinorDrilldown?.(
            state.bundle,
            year,
            state.selectedCategory,
            categoryIds
          );
        }
      } catch (error) {
        console.warn(
          "Category drilldown not available:",
          state.categoryDimension,
          state.selectedCategory,
          error
        );
      }
    }
  }

  async function ensureCountrySupplementalData() {
    if (!state.bundle) return;
    if (Array.isArray(state.trend) && state.trend.length) return;

    const rows = await loader.getCountryTrend().catch((error) => {
      console.warn("Country trend not available:", error);
      return [];
    });

    state.trend = Array.isArray(rows) ? rows : [];
  }

  function markSectionLoading(section, isLoading) {
    const element = document.getElementById(section);
    element?.classList.toggle("is-section-loading", Boolean(isLoading));
    if (isLoading) {
      document.body.dataset.loadingSection = section;
    } else if (document.body.dataset.loadingSection === section) {
      delete document.body.dataset.loadingSection;
    }
  }

  async function loadSectionData(section = activePrimarySection()) {
    if (!state.bundle) return;

    const year = Number(state.year);

    if (section === "overview") {
      await hydrateActiveSelection("overview");
      return;
    }

    if (section === "country") {
      await ensureCountrySupplementalData();
      await hydrateActiveSelection("country");
      return;
    }

    if (section === "matrix") {
      await loader.ensureFullMatrix?.(state.bundle, year, categoryIds);
      if (state.matrixCategoryLevel === "analysis_minor") {
        await loader.ensureMatrixMinorTop?.(state.bundle, year, categoryIds);
      }
      return;
    }

    if (section === "flows") {
      await loader.ensureFlowMajor?.(state.bundle, year);
      await loader.ensureFullMatrix?.(state.bundle, year, categoryIds);
      await loader.ensureFullTopicMatrix?.(state.bundle, year);
      if (state.flowCategoryLevel === "analysis_minor") {
        await loader.ensureMatrixMinorTop?.(state.bundle, year, categoryIds);
      }
      if (state.flowCategoryLevel === "hs_chapter" && state.selectedScope === "manufactures") {
        await loader.ensureMatrixChapterTop?.(state.bundle, year, categoryIds);
      }
      ensureAvailableFlowCategoryLevel();
      if (state.flowCategoryLevel === "topic_tag") {
        const topics = topicTagOptions().slice(0, 12);
        if (state.flowSelectedCategory && state.flowSelectedCategory !== "all") {
          const selectedTopic = topicTagOptions().find(
            (topic) => topic.id === state.flowSelectedCategory
          );
          if (selectedTopic && !topics.some((topic) => topic.id === selectedTopic.id)) {
            topics.push(selectedTopic);
          }
        }
        await Promise.all(
          topics.map((topic) =>
            loader.ensureTopicDrilldown?.(state.bundle, year, topic.id, categoryIds).catch((error) => {
              console.warn("Topic drilldown not available:", topic.id, error);
              return null;
            })
          )
        );
      }
      return;
    }

    if (section === "target") {
      await loader.ensureProductTop?.(state.bundle, year, categoryIds);
    }
  }

  async function ensureSectionData(section = activePrimarySection(), reason = "visible") {
    if (!state.bundle) return;

    const target = SECTION_DATA_IDS.includes(section) ? section : "overview";
    if (!state.sectionLoad) state.sectionLoad = normalizeSectionLoadState();
    const record = state.sectionLoad[target] || createSectionLoadRecord();
    const key = sectionDataKey(target);

    if (record.status === "ready" && record.key === key) return;
    if (record.status === "loading" && record.key === key && record.promise) {
      return record.promise;
    }

    record.status = "loading";
    record.key = key;
    record.error = null;
    markSectionLoading(target, true);

    record.promise = loadSectionData(target, reason)
      .then(() => {
        record.key = sectionDataKey(target);
        record.status = "ready";
        record.error = null;
      })
      .catch((error) => {
        record.status = "error";
        record.error = error;
        console.warn(`Section data failed: ${target}`, error);
        throw error;
      })
      .finally(() => {
        record.promise = null;
        markSectionLoading(target, false);
      });

    state.sectionLoad[target] = record;
    return record.promise;
  }

  async function ensureVisibleSectionData(section = activePrimarySection()) {
    return ensureSectionData(section, "visible");
  }

  async function loadYear(year) {
    try {
      markLoading(true);

      const bundle = await loader.getYearBundle(Number(year), categoryIds);

      state.year = Number(year);
      state.bundle = bundle;
      state.trend = [];
      state.supplierStructure = null;
      state.dependencyBreadth = null;
      state.structuralChange = null;
      resetSectionLoadState();
      applyChineseCountryNamesToBundle();

      if (!state.selectedCountry || !findCountry(state.selectedCountry)) {
        state.selectedCountry = rankedCountries()[0]?.iso3 || "USA";
      }

      try {
        await ensureSectionData(activePrimarySection(), "year");
      } catch (error) {
        console.warn("Active section data not ready after year change:", error);
      }
      syncControlsFromState();
      renderActiveSection({ resize: true });

      markLoading(false);
    } catch (error) {
      console.error(error);
      markLoading(false);
      showGlobeBootError(`年度数据加载失败：${escapeHtml(error.message || error)}`, false);
    }
  }

  function markLoading(isLoading) {
    state.loading = Boolean(isLoading);
    document.body.classList.toggle("is-loading", state.loading);
  }

  function renderGlobalShell(section = activePrimarySection()) {
    document.body.classList.toggle("has-country-focus", Boolean(state.countryFocusActive));
    document.body.classList.toggle("is-overview-active", section === "overview");

    syncControlsFromState();
    updateScopeUI();
    updatePageTitles();
  }

  function renderOverviewSection() {
    updateCountryHeat();
    updateCountryBorders();
    updateTradeFlows();
    updateFocusLayer();
    queueLabelRender();

    renderKpis();
    renderMatrixPreview();
    renderDetailPanels("overview");
    renderCountryFocusBackdrop("overview");
  }

  function renderCountrySection() {
    renderDetailPanels("country");
    renderCountryFocusBackdrop("country");
  }

  function renderActiveSection(options = {}) {
    const section = activePrimarySection();

    renderGlobalShell(section);
    if (section !== "game") {
      stopSupplyDefenseTimer();
    }

    if (section === "overview") {
      renderOverviewSection();
    }
    if (section === "country") {
      renderCountrySection();
    }
    if (section === "matrix") {
      renderMatrixAnalysis();
    }
    if (section === "flows") {
      renderFlowAnalysis();
    }
    if (section === "target") {
      renderTargetAnalysis();
    }
    if (section === "game") {
      renderProcurementGame();
    }

    if (options.resize) {
      charts.resize?.();
    }

    if (["overview", "matrix", "flows"].includes(section)) {
      window.setTimeout(() => charts.resize?.(), section === "overview" ? 180 : 80);
      if (section === "overview" && state.countryFocusActive) {
        window.setTimeout(() => charts.resize?.(), 1050);
      }
    }
  }

  function renderAll(options = {}) {
    renderActiveSection({ resize: Boolean(options.resize) });
  }

  function updatePageTitles() {
    const selectedOption =
      state.selectedCategory === "all"
        ? null
        : currentCategoryOptions().find((item) => item.id === state.selectedCategory) || null;

    const matrixTitle = document.querySelector("#matrix .section-head > p");
    if (matrixTitle) {
      matrixTitle.textContent = `默认比较 ${categoryDimensionLabel(
        state.matrixCategoryLevel
      )} 结构；当前范围为 ${scopeLabel(state.selectedScope)}；点击单元格可同步国家与类别。`;
    }

    const flowTitle = document.querySelector("#flows .section-head > p");
    if (flowTitle) {
      flowTitle.textContent = `当前按 ${flowCategoryLevelLabel(
        state.flowCategoryLevel
      )} 展示中国${scopeLabel(
        state.selectedScope
      )}流向，可通过类别数量、目标数量和最小份额生成不同流向结构。`;
    }

    const targetKicker = document.querySelector("#target .panel-kicker");
    if (targetKicker) {
      targetKicker.textContent = "重点产品";
    }

    const targetTitle = document.querySelector("#target .section-head > p");
    if (targetTitle) {
      targetTitle.textContent =
        state.selectedTopicTag && state.selectedTopicTag !== "all"
          ? `当前专题：${categoryById.get(state.selectedTopicTag)?.name || state.selectedTopicTag}。本页展示 HS6 具体产品，星球越靠近中心表示综合风险越高。`
          : "本页展示 HS6 具体产品，用来定位具体风险商品；星球越靠近中心表示综合风险越高，星球大小表示全球贸易规模。";
    }

    const countryTitle = document.querySelector(".structure-card .section-card-head span");
    if (countryTitle) {
      countryTitle.textContent = selectedOption
        ? `当前类别：${selectedOption.name}`
        : state.activeSection === "overview" && state.countryFocusActive
          ? state.categoryDimension === "analysis_major"
            ? "Top 5 大类"
            : "Top 5 细类"
          : state.categoryDimension === "analysis_major"
            ? "Top 5 大类"
            : "Top 5 细类";
    }
  }

  function queueHeatRender() {
    if (cesiumState.heatFrame) return;

    cesiumState.heatFrame = window.requestAnimationFrame(() => {
      cesiumState.heatFrame = 0;
      updateCountryHeat();
      updateCountryBorders();
      queueLabelRender();
    });
  }

  function queueActiveSectionRender() {
    if (activeControlFrame) return;

    activeControlFrame = window.requestAnimationFrame(() => {
      activeControlFrame = 0;
      const section = activePrimarySection();
      if (section === "overview") {
        queueHeatRender();
        updateTradeFlows();
        updateFocusLayer();
        renderKpis();
        renderMatrixPreview();
        return;
      }
      renderActiveSection();
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Controls
   * --------------------------------------------------------------------------
   */

  function syncControlsFromState() {
    refreshCategorySelect();
    refreshCountryWorkbenchCategorySelect();
    refreshMatrixCategorySelect();
    refreshFlowCategorySelect();
    refreshTargetTopicSelect();

    if (DOM.yearSelect) DOM.yearSelect.value = String(state.year);
    if (DOM.metricSelect) DOM.metricSelect.value = state.metric;
    if (DOM.scopeSelect) DOM.scopeSelect.value = state.selectedScope;
    if (DOM.matrixScopeSelect) DOM.matrixScopeSelect.value = state.selectedScope;
    if (DOM.flowScopeSelect) DOM.flowScopeSelect.value = state.selectedScope;
    if (DOM.matrixCountryLimitSelect) {
      DOM.matrixCountryLimitSelect.value = String(state.matrixCountryLimit);
    }
    if (DOM.countryWorkbenchYearSelect) {
      DOM.countryWorkbenchYearSelect.value = String(state.year);
    }
    if (DOM.countryWorkbenchScopeSelect) {
      DOM.countryWorkbenchScopeSelect.value = state.selectedScope;
    }
    if (DOM.countryWorkbenchCountrySelect && state.selectedCountry) {
      DOM.countryWorkbenchCountrySelect.value = state.selectedCountry;
    }
    if (DOM.categoryDimensionSelect) {
      DOM.categoryDimensionSelect.value = state.categoryDimension;
    }
    if (DOM.categorySelect) DOM.categorySelect.value = state.selectedCategory;
    if (DOM.matrixCategorySelect) DOM.matrixCategorySelect.value = state.selectedCategory;
    if (DOM.flowCategorySelect) DOM.flowCategorySelect.value = state.flowSelectedCategory || "all";
    if (DOM.countryWorkbenchCategorySelect) {
      DOM.countryWorkbenchCategorySelect.value = state.selectedCategory;
    }
    if (DOM.targetTopicTagSelect) {
      DOM.targetTopicTagSelect.value = state.selectedTopicTag || "all";
    }
    if (DOM.thresholdInput) DOM.thresholdInput.value = String(state.threshold);
    if (DOM.thresholdLabel) DOM.thresholdLabel.textContent = state.threshold.toFixed(2);

    const yearIndex = indexData.years.indexOf(state.year);
    if (DOM.timelineInput && yearIndex >= 0) {
      DOM.timelineInput.value = String(yearIndex);
    }

    if (DOM.currentYear) DOM.currentYear.textContent = String(state.year);
    if (DOM.topCurrentYear) DOM.topCurrentYear.textContent = String(state.year);

    DOM.metricPills.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.metricPill === state.metric);
    });

    DOM.matrixSortButtons.forEach((button) => {
      const isCategorySort = button.dataset.matrixSort === "category";
      const disabled = isCategorySort && state.selectedCategory === "all";
      button.disabled = disabled;
      button.classList.toggle("is-disabled", disabled);
      button.classList.toggle("is-active", button.dataset.matrixSort === state.matrixSort);
    });

    DOM.matrixCategoryButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.matrixCategoryLevel === state.matrixCategoryLevel
      );
    });

    DOM.matrixMetricButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.matrixMetric === state.metric);
    });

    DOM.flowModeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.flowMode === state.flowMode);
    });

    DOM.flowCategoryButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.flowCategoryLevel === state.flowCategoryLevel
      );
    });

    DOM.flowMetricButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.flowMetric === state.metric);
    });

    DOM.flowSortButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.flowSort === state.flowSort);
    });

    if (DOM.flowCategoryLimitSelect) {
      DOM.flowCategoryLimitSelect.value = String(state.flowCategoryLimit);
    }
    if (DOM.flowTargetLimitSelect) {
      DOM.flowTargetLimitSelect.value = String(state.flowTargetLimit);
    }
    if (DOM.flowMinShareSelect) {
      DOM.flowMinShareSelect.value = String(state.flowMinShare);
    }

    DOM.countryWorkbenchDimensionButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.countryWorkbenchDimension === state.categoryDimension
      );
    });

    renderMetricDescription();
  }

  function renderMetricDescription() {
    if (!DOM.metricDescription) return;

    const map = {
      cdi: "依赖度表示某国制造业进口中有多少来自中国，是最适合展示的核心指标。",
      hhi: "来源集中表示进口来源是否集中在少数国家，数值越高说明替代来源越少。",
      vulnerability:
        "综合风险把依赖度、来源集中、产品重要性和中国全球供给占比放在一起看。"
    };

    DOM.metricDescription.textContent = map[state.metric] || map.cdi;
  }

  function bindControls() {
    DOM.yearSelect?.addEventListener("change", async () => {
      await loadYear(Number(DOM.yearSelect.value));
    });

    DOM.metricSelect?.addEventListener("change", () => {
      state.metric = DOM.metricSelect.value || "cdi";
      syncControlsFromState();
      renderAll();
    });

    DOM.metricPills.forEach((button) => {
      button.addEventListener("click", () => {
        state.metric = button.dataset.metricPill || "cdi";
        syncControlsFromState();
        renderAll();
      });
    });

    DOM.scopeSelect?.addEventListener("change", async () => {
      state.selectedScope = DOM.scopeSelect.value || "manufactures";
      state.selectedCategory = "all";
      state.selectedProduct = "";
      await hydrateActiveSelection();
      await ensureVisibleSectionData(activePrimarySection());
      syncControlsFromState();
      renderAll();
    });

    DOM.categoryDimensionSelect?.addEventListener("change", async () => {
      state.categoryDimension = coerceAnalysisLevel(DOM.categoryDimensionSelect.value);
      state.selectedCategory = "all";
      await hydrateActiveSelection();
      await ensureVisibleSectionData(activePrimarySection());
      syncControlsFromState();
      renderAll();
    });

    DOM.categorySelect?.addEventListener("change", async () => {
      state.selectedCategory = DOM.categorySelect.value || "all";
      await hydrateActiveSelection();
      await ensureVisibleSectionData(activePrimarySection());
      renderAll();
    });

    DOM.countryWorkbenchCountrySelect?.addEventListener("change", async () => {
      const iso3 = DOM.countryWorkbenchCountrySelect.value;
      if (!iso3) return;
      await selectCountry(iso3, { flyTo: false });
    });

    DOM.countryWorkbenchYearSelect?.addEventListener("change", async () => {
      const year = Number(DOM.countryWorkbenchYearSelect.value);
      if (year && year !== state.year) {
        await loadYear(year);
      }
    });

    DOM.countryWorkbenchScopeSelect?.addEventListener("change", async () => {
      state.selectedScope = DOM.countryWorkbenchScopeSelect.value || "manufactures";
      state.selectedCategory = "all";
      state.selectedProduct = "";
      await hydrateActiveSelection();
      await ensureVisibleSectionData("country");
      syncControlsFromState();
      renderAll();
    });

    DOM.countryWorkbenchDimensionButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        state.categoryDimension = coerceAnalysisLevel(
          button.dataset.countryWorkbenchDimension
        );
        state.selectedCategory = "all";
        await hydrateActiveSelection();
        await ensureVisibleSectionData("country");
        syncControlsFromState();
        renderAll();
      });
    });

    DOM.countryWorkbenchCategorySelect?.addEventListener("change", async () => {
      state.selectedCategory = DOM.countryWorkbenchCategorySelect.value || "all";
      await hydrateActiveSelection();
      await ensureVisibleSectionData("country");
      syncControlsFromState();
      renderAll();
    });

    DOM.targetTopicTagSelect?.addEventListener("change", async () => {
      state.selectedTopicTag = DOM.targetTopicTagSelect.value || "all";
      if (state.selectedTopicTag !== "all") {
        state.selectedProduct = "";
      }
      await ensureVisibleSectionData("target");
      renderTargetAnalysis();
    });

    DOM.gameCountrySelect?.addEventListener("change", () => {
      procurementGame.countryIso3 = DOM.gameCountrySelect.value || "";
      resetSupplyMazeGame(false);
      renderProcurementGame();
    });

    DOM.gameYearSelect?.addEventListener("change", () => {
      procurementGame.year = Number(DOM.gameYearSelect.value || state.year || 2024);
      resetSupplyMazeGame(false);
      renderProcurementGame();
    });

    DOM.gameCargoSelect?.addEventListener("change", () => {
      procurementGame.cargoId = DOM.gameCargoSelect.value || "electronics";
      resetSupplyMazeGame(false);
      renderProcurementGame();
    });

    DOM.gameResetButton?.addEventListener("click", () => {
      resetSupplyMazeGame(false);
      renderProcurementGame();
    });

    const dispatchInputs = [
      ["china", DOM.gameChinaShare],
      ["alt", DOM.gameAltShare],
      ["inventory", DOM.gameInventoryShare],
      ["express", DOM.gameExpressShare]
    ];
    dispatchInputs.forEach(([key, input]) => {
      input?.addEventListener("input", () => {
        setDispatchAllocation(key, input.value);
        renderProcurementGame();
      });
    });

    DOM.gameDispatchButton?.addEventListener("click", () => {
      procurementGame.dispatched = true;
      procurementGame.dispatchCount += 1;
      renderProcurementGame();
    });

    DOM.gameMazeGrid?.addEventListener("click", (event) => {
      const cell = event.target?.closest?.("[data-maze-row]");
      if (!cell) return;
      const row = Number(cell.dataset.mazeRow);
      const col = Number(cell.dataset.mazeCol);
      const dr = row - procurementGame.player.row;
      const dc = col - procurementGame.player.col;
      if (Math.abs(dr) + Math.abs(dc) !== 1) return;
      moveSupplyMazePlayer(dr, dc);
    });

    DOM.towerCountrySelect?.addEventListener("change", () => {
      supplyDefenseGame.countryIso3 = DOM.towerCountrySelect.value || "";
      initSupplyDefenseGame({ preserveSelection: true });
      renderProcurementGame();
    });

    DOM.towerYearSelect?.addEventListener("change", () => {
      supplyDefenseGame.year = Number(DOM.towerYearSelect.value || state.year || 2024);
      initSupplyDefenseGame({ preserveSelection: true });
      renderProcurementGame();
    });

    DOM.towerCargoSelect?.addEventListener("change", () => {
      supplyDefenseGame.cargoId = DOM.towerCargoSelect.value || "electronics";
      initSupplyDefenseGame({ preserveSelection: true });
      renderProcurementGame();
    });

    DOM.towerStartButton?.addEventListener("click", () => {
      startSupplyDefenseWave();
    });

    DOM.towerResetButton?.addEventListener("click", () => {
      initSupplyDefenseGame({ preserveSelection: true });
      renderProcurementGame();
    });

    DOM.towerShop?.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-tower-type]");
      if (!button) return;
      supplyDefenseGame.selectedTowerType = button.dataset.towerType || "china";
      renderProcurementGame();
    });

    DOM.towerBoard?.addEventListener("click", (event) => {
      const cell = event.target?.closest?.("[data-defense-cell]");
      if (!cell) return;
      placeSupplyTower(cell.dataset.defenseCell, supplyDefenseGame.selectedTowerType);
    });

    DOM.mineCountrySelect?.addEventListener("change", () => {
      supplyMineGame.countryIso3 = DOM.mineCountrySelect.value || "";
      resetSupplyMineGame({ preserveSelection: true });
      renderProcurementGame();
    });

    DOM.mineYearSelect?.addEventListener("change", () => {
      supplyMineGame.year = Number(DOM.mineYearSelect.value || state.year || 2024);
      resetSupplyMineGame({ preserveSelection: true });
      renderProcurementGame();
    });

    DOM.mineCargoSelect?.addEventListener("change", () => {
      supplyMineGame.cargoId = DOM.mineCargoSelect.value || "electronics";
      resetSupplyMineGame({ preserveSelection: true });
      renderProcurementGame();
    });

    DOM.mineDifficultySelect?.addEventListener("change", () => {
      supplyMineGame.difficulty = DOM.mineDifficultySelect.value || "showcase";
      resetSupplyMineGame({ preserveSelection: true });
      renderProcurementGame();
    });

    DOM.mineResetButton?.addEventListener("click", () => {
      resetSupplyMineGame({ preserveSelection: true });
      renderProcurementGame();
    });

    DOM.mineSubmitButton?.addEventListener("click", () => {
      submitSupplyMineAssessment();
      renderProcurementGame();
    });

    DOM.mineIntelButton?.addEventListener("click", () => {
      activateSupplyMineIntel();
      renderProcurementGame();
    });

    [DOM.mineRiskBoard, DOM.mineSafeBoard].forEach((board) => {
      board?.addEventListener("click", (event) => {
        const cell = event.target?.closest?.("[data-mine-id]");
        if (!cell) return;
        revealSupplyMineCell(cell.dataset.mineId);
      });
      board?.addEventListener("contextmenu", (event) => {
        const cell = event.target?.closest?.("[data-mine-id]");
        if (!cell) return;
        event.preventDefault();
        toggleSupplyMineMark(cell.dataset.mineId);
      });
    });

    window.addEventListener("keydown", (event) => {
      if (activePrimarySection() !== "game") return;
      if (!DOM.gameMazeGrid) return;
      const keys = {
        ArrowUp: [-1, 0],
        KeyW: [-1, 0],
        ArrowDown: [1, 0],
        KeyS: [1, 0],
        ArrowLeft: [0, -1],
        KeyA: [0, -1],
        ArrowRight: [0, 1],
        KeyD: [0, 1]
      };
      const move = keys[event.code];
      if (!move) return;
      event.preventDefault();
      moveSupplyMazePlayer(move[0], move[1]);
    });

    DOM.thresholdInput?.addEventListener("input", () => {
      state.threshold = Number(DOM.thresholdInput.value || 0);
      if (DOM.thresholdLabel) {
        DOM.thresholdLabel.textContent = state.threshold.toFixed(2);
      }

      queueActiveSectionRender();
    });

    DOM.timelineInput?.addEventListener("input", () => {
      const index = Number(DOM.timelineInput.value);
      const year = indexData.years[index];
      if (year && year !== state.year) loadYear(year);
    });

    DOM.timelineMarkers.forEach((marker) => {
      marker.addEventListener("click", async () => {
        const year = Number(marker.dataset.year);
        if (year && indexData.years.includes(year)) await loadYear(year);
      });
    });

    DOM.playButton?.addEventListener("click", toggleTimelinePlayback);

    DOM.matrixSortButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        state.matrixSort = button.dataset.matrixSort || "cdi";
        syncControlsFromState();
        renderMatrixAnalysis();
      });
    });

    DOM.matrixMetricButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.metric = button.dataset.matrixMetric || "cdi";
        syncControlsFromState();
        renderMatrixAnalysis();
        if (activePrimarySection() === "overview") queueHeatRender();
      });
    });

    DOM.matrixCategoryButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        state.matrixCategoryLevel = coerceAnalysisLevel(button.dataset.matrixCategoryLevel);
        state.matrixFocus = null;
        state.matrixHoverFocus = null;
        state.categoryDimension = state.matrixCategoryLevel;
        state.selectedCategory = "all";
        await hydrateActiveSelection();
        await ensureVisibleSectionData("matrix");
        syncControlsFromState();
        renderMatrixAnalysis();
      });
    });

    DOM.matrixScopeSelect?.addEventListener("change", async () => {
      state.selectedScope = DOM.matrixScopeSelect.value || "manufactures";
      state.selectedCategory = "all";
      state.matrixFocus = null;
      state.matrixHoverFocus = null;
      await hydrateActiveSelection();
      await ensureVisibleSectionData("matrix");
      syncControlsFromState();
      renderAll();
    });

    DOM.matrixCountryLimitSelect?.addEventListener("change", () => {
      state.matrixCountryLimit = Number(DOM.matrixCountryLimitSelect.value || MATRIX_LIMIT);
      state.matrixFocus = null;
      state.matrixHoverFocus = null;
      syncControlsFromState();
      renderMatrixAnalysis();
    });

    DOM.matrixCategorySelect?.addEventListener("change", async () => {
      state.categoryDimension = state.matrixCategoryLevel;
      state.selectedCategory = DOM.matrixCategorySelect.value || "all";
      state.matrixSort =
        state.matrixSort === "category" && state.selectedCategory === "all"
          ? "cdi"
          : state.matrixSort;
      state.matrixFocus = null;
      state.matrixHoverFocus = null;
      await hydrateActiveSelection();
      syncControlsFromState();
      renderAll();
    });

    DOM.matrixProductDetails?.addEventListener("toggle", () => {
      if (DOM.matrixProductDetails.open) renderMatrixProductClues();
    });

    DOM.matrixOutlierCells?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-country][data-category]");
      if (!button) return;
      const countryIso3 = button.dataset.country;
      const categoryId = button.dataset.category;
      if (!countryIso3 || !categoryId) return;
      state.matrixFocus = { countryIso3, categoryId };
      state.matrixHoverFocus = null;
      state.categoryDimension = state.matrixCategoryLevel;
      state.selectedCategory = categoryId;
      await hydrateActiveSelection();
      await selectCountry(countryIso3, { flyTo: false });
      syncControlsFromState();
      renderAll();
    });

    DOM.flowModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.flowMode = button.dataset.flowMode || "region";
        syncControlsFromState();
        renderFlowAnalysis();
      });
    });

    DOM.flowMetricButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.metric = button.dataset.flowMetric || "cdi";
        syncControlsFromState();
        renderFlowAnalysis();
      });
    });

    DOM.flowSortButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.flowSort = button.dataset.flowSort || "value";
        syncControlsFromState();
        renderFlowAnalysis();
      });
    });

    DOM.flowCategoryButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        state.flowCategoryLevel = coerceFlowCategoryLevel(button.dataset.flowCategoryLevel);
        state.flowSelectedCategory = "all";
        await hydrateActiveSelection();
        await ensureVisibleSectionData("flows");
        syncControlsFromState();
        renderFlowAnalysis();
      });
    });

    DOM.flowScopeSelect?.addEventListener("change", async () => {
      state.selectedScope = DOM.flowScopeSelect.value || "manufactures";
      state.flowSelectedCategory = "all";
      await hydrateActiveSelection();
      await ensureVisibleSectionData("flows");
      syncControlsFromState();
      renderAll();
    });

    DOM.flowCategorySelect?.addEventListener("change", async () => {
      state.flowSelectedCategory = DOM.flowCategorySelect.value || "all";
      await ensureVisibleSectionData("flows");
      syncControlsFromState();
      renderFlowAnalysis();
    });

    DOM.flowCategoryLimitSelect?.addEventListener("change", () => {
      state.flowCategoryLimit = Number(DOM.flowCategoryLimitSelect.value || 6);
      syncControlsFromState();
      renderFlowAnalysis();
    });

    DOM.flowTargetLimitSelect?.addEventListener("change", () => {
      state.flowTargetLimit = Number(DOM.flowTargetLimitSelect.value || 0);
      syncControlsFromState();
      renderFlowAnalysis();
    });

    DOM.flowMinShareSelect?.addEventListener("change", () => {
      state.flowMinShare = Number(DOM.flowMinShareSelect.value || 0);
      syncControlsFromState();
      renderFlowAnalysis();
    });

    DOM.flowExitCountryFocus?.addEventListener("click", async () => {
      await returnToGlobal();
      state.activeSection = "flows";
      syncControlsFromState();
      await ensureVisibleSectionData("flows");
      renderAll();
    });

    DOM.overviewDetailClose?.addEventListener("click", async () => {
      await returnToGlobal();
    });

    DOM.countrySelect?.addEventListener("change", async () => {
      const iso3 = DOM.countrySelect.value;
      if (iso3 === "all") {
        await returnToGlobal();
      } else if (iso3) {
        await selectCountryForAnalysis(iso3);
      }
    });
  }

  function toggleTimelinePlayback() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
      DOM.playButton?.classList.remove("is-playing");
      return;
    }

    DOM.playButton?.classList.add("is-playing");

    state.timer = setInterval(() => {
      const index = indexData.years.indexOf(state.year);
      const nextIndex = index >= indexData.years.length - 1 ? 0 : index + 1;
      loadYear(indexData.years[nextIndex]);
    }, 1150);
  }

  /**
   * --------------------------------------------------------------------------
   * Tooltip, label, selection
   * --------------------------------------------------------------------------
   */

  function showGlobeTooltip(iso3, position) {
    if (!DOM.globeTooltip || !state.bundle) return;

    const country = findCountry(iso3);
    if (!country) return;

    const value = metricValue(country);

    DOM.globeTooltip.hidden = false;
    DOM.globeTooltip.style.left = `${position.x + 18}px`;
    DOM.globeTooltip.style.top = `${position.y + 18}px`;

    DOM.globeTooltip.innerHTML = `
      <strong>${escapeHtml(country.name || country.country || iso3)}</strong>
      <span>${escapeHtml(country.region || "未分类")} · ${escapeHtml(
      country.incomeGroup || "未分类"
    )}</span>
      <span>${state.year} · ${state.metric.toUpperCase()} ${value.toFixed(
      2
    )} · 排名 #${country.rank || "-"}</span>
      <span>主导类别：${escapeHtml(country.topCategory || "-")}</span>
    `;
  }

  function hideGlobeTooltip() {
    if (DOM.globeTooltip) DOM.globeTooltip.hidden = true;
  }

  async function selectCountry(iso3, options = {}) {
    const country = findCountry(iso3);
    if (!country) return;

    state.selectedCountry = iso3;
    state.analysisScope = "country";
    state.countryFocusActive = true;
    await hydrateActiveSelection();
    await ensureVisibleSectionData(activePrimarySection());
    updateScopeUI();

    renderAll();

    if (options.flyTo) {
      flyCameraToCountry(iso3);
    }
  }

  function queueLabelRender() {
    if (cesiumState.labelFrame) return;

    cesiumState.labelFrame = window.requestAnimationFrame(() => {
      cesiumState.labelFrame = 0;
      renderGlobeLabels();
    });
  }

  function renderGlobeLabels() {
    if (!DOM.globeLabels || !state.bundle) return;

    if (!state.labels) {
      DOM.globeLabels.innerHTML = "";
      return;
    }

    const selected = findCountry(state.selectedCountry);

    const top = rankedCountries()
      .filter((country) => Number.isFinite(country.lon) && Number.isFinite(country.lat))
      .slice(0, LABEL_LIMIT);

    const labelItems = uniqueByIso3([
      selected,
      findCountry(cesiumState.hoveredIso3),
      ...top
    ].filter(Boolean));

    const occupied = [];
    const html = [];

    for (const country of labelItems) {
      const screen = globeScreenPosition(country);
      if (!screen || !screen.visible) continue;

      if (
        collides(screen, occupied, 96, 38) &&
        country.iso3 !== state.selectedCountry
      ) {
        continue;
      }

      occupied.push({ x: screen.x, y: screen.y, w: 96, h: 38 });

      const value = metricValue(country);
      const active =
        country.iso3 === state.selectedCountry ||
        country.iso3 === cesiumState.hoveredIso3;

      html.push(`
        <button
          class="globe-label ${active ? "is-selected" : ""}"
          data-side="${screen.x < window.innerWidth * 0.5 ? "left" : "right"}"
          data-country="${escapeHtml(country.iso3)}"
          style="left:${screen.x}px;top:${screen.y}px;border-color:${fallbackCssColor(value)}"
          title="${escapeHtml(country.name)}"
        >
          <span></span>
          <strong>${escapeHtml(country.name)}</strong>
          <em>${state.metric.toUpperCase()} ${value.toFixed(2)}</em>
        </button>
      `);
    }

    DOM.globeLabels.innerHTML = html.join("");

    DOM.globeLabels.querySelectorAll("[data-country]").forEach((button) => {
      button.addEventListener("click", () =>
        selectCountry(button.dataset.country, { flyTo: true })
      );
    });
  }

  function uniqueByIso3(countries) {
    const map = new Map();
    countries.forEach((country) => {
      if (country?.iso3) map.set(country.iso3, country);
    });
    return [...map.values()];
  }

  function globeScreenPosition(country) {
    const viewer = cesiumState.viewer;
    if (!viewer) return null;

    const position = Cesium.Cartesian3.fromDegrees(country.lon, country.lat, 90_000);

    const occluder = new Cesium.EllipsoidalOccluder(
      Cesium.Ellipsoid.WGS84,
      viewer.camera.position
    );

    if (!occluder.isPointVisible(position)) {
      return null;
    }

    const screen = Cesium.SceneTransforms.worldToWindowCoordinates(
      viewer.scene,
      position
    );

    if (!screen || !Number.isFinite(screen.x) || !Number.isFinite(screen.y)) {
      return null;
    }

    return { x: screen.x, y: screen.y, visible: true };
  }

  function collides(point, occupied, width, height) {
    return occupied.some((box) => {
      return (
        Math.abs(point.x - box.x) < (width + box.w) / 2 &&
        Math.abs(point.y - box.y) < (height + box.h) / 2
      );
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Metrics and filters
   * --------------------------------------------------------------------------
   */

  function metricValue(country) {
    if (!country) return 0;

    if (state.selectedCategory && state.selectedCategory !== "all") {
      const cell = categoryMetrics(country, state.selectedCategory, {
        dimension: state.categoryDimension,
        scope: state.selectedScope
      });

      if (state.metric === "hhi") return Number(cell.hhi || 0);
      if (state.metric === "vulnerability") return Number(cell.vulnerability || 0);

      return Number(cell.dependency || 0);
    }

    const scopeMetrics = countryScopeMetrics(country, state.selectedScope);

    if (state.metric === "hhi") return Number(scopeMetrics.hhi || country.hhi || 0);
    if (state.metric === "vulnerability") {
      return Number(scopeMetrics.vulnerability || country.vulnerability || 0);
    }

    return Number(scopeMetrics.dependency || country.cdi || 0);
  }

  function resolveCategoryRef(categoryRef, dimension = state.categoryDimension) {
    if (!categoryRef || categoryRef === "all") {
      return { id: "all", level: normalizeMatrixLevel(dimension), dimension };
    }

    if (typeof categoryRef === "object") {
      return categoryRef;
    }

    const options = categoryOptionsForDimension(dimension, state.selectedScope);
    return options.find((item) => item.id === categoryRef) || {
      id: categoryRef,
      level: normalizeMatrixLevel(dimension),
      dimension
    };
  }

  function aggregateMatrixCells(cells, countryTotalImport = null) {
    const validCells = (cells || []).filter(Boolean);
    if (!validCells.length) {
      return {
        dependency: 0,
        hhi: 0,
        vulnerability: 0,
        importance: 0,
        chinaImport: 0,
        totalImport: 0
      };
    }

    const totalImport = validCells.reduce(
      (sum, cell) => sum + Number(cell.totalImport || 0),
      0
    );
    const chinaImport = validCells.reduce(
      (sum, cell) => sum + Number(cell.chinaImport || 0),
      0
    );

    const denominator = Number.isFinite(Number(countryTotalImport))
      ? Number(countryTotalImport)
      : totalImport;

    const weightTotal = totalImport || 1;

    return {
      dependency: totalImport > 0 ? chinaImport / totalImport : 0,
      hhi:
        validCells.reduce(
          (sum, cell) => sum + Number(cell.hhi || 0) * Number(cell.totalImport || 0),
          0
        ) / weightTotal,
      vulnerability:
        validCells.reduce(
          (sum, cell) =>
            sum + Number(cell.vulnerability || 0) * Number(cell.totalImport || 0),
          0
        ) / weightTotal,
      importance: denominator > 0 ? totalImport / denominator : 0,
      chinaImport,
      totalImport
    };
  }

  function countryScopeMetrics(country, scope = state.selectedScope) {
    if (!country) {
      return {
        dependency: 0,
        hhi: 0,
        vulnerability: 0,
        importance: 1,
        chinaImport: 0,
        totalImport: 0
      };
    }

    const rows = (state.bundle?.matrix || []).filter(
      (row) =>
        row.iso3 === country.iso3 &&
        row.scope === scope &&
        row.categoryLevel === "group"
    );

    if (!rows.length) {
      const scoped = country.scopes?.[scope];
      return {
        dependency: Number(scoped?.cdi || country.cdi || 0),
        hhi: Number(scoped?.hhi || country.hhi || 0),
        vulnerability: Number(scoped?.vulnerability || country.vulnerability || 0),
        importance: 1,
        chinaImport: Number(scoped?.chinaImport || country.chinaImport || 0),
        totalImport: Number(scoped?.totalImport || country.totalImport || 0)
      };
    }

    const aggregated = aggregateMatrixCells(rows);
    aggregated.importance = 1;
    return aggregated;
  }

  function categoryMetrics(country, categoryRef, options = {}) {
    if (!country || !categoryRef || categoryRef === "all") {
      return {
        dependency: Number(country?.cdi || 0),
        hhi: Number(country?.hhi || 0),
        vulnerability: Number(country?.vulnerability || 0),
        importance: 0
      };
    }

    const scope = options.scope || state.selectedScope || "manufactures";
    const dimension = options.dimension || state.categoryDimension;
    const ref = resolveCategoryRef(categoryRef, dimension);
    const zero = {
      dependency: 0,
      hhi: 0,
      vulnerability: 0,
      importance: 0,
      chinaImport: 0,
      totalImport: 0
    };

    const level = ref.level || normalizeMatrixLevel(dimension);
    const categoryId = ref.proxyCategoryId || ref.id;

    return (
      state.bundle?.matrixIndex?.get(`${scope}::${level}::${country.iso3}::${categoryId}`) ||
      state.bundle?.matrixIndex?.get(`all_goods::${level}::${country.iso3}::${categoryId}`) ||
      zero
    );
  }

  function colorForValue(value) {
    return Cesium.Color.fromCssColorString(fallbackCssColor(value));
  }

  function fallbackCssColor(value) {
    const v = Number(value || 0);
    if (typeof cssColorForValue === "function") return cssColorForValue(v);
    return fallbackCssColorForValue(v);
  }

  function passesFilters(country) {
    if (!country) return false;

    if (isCountryScope() && country.iso3 !== state.selectedCountry) {
      return false;
    }

    if (state.selectedCategory !== "all") {
      const cell = categoryMetrics(country, state.selectedCategory, {
        dimension: state.categoryDimension,
        scope: state.selectedScope
      });
      if (Number(cell.dependency || 0) < state.threshold) return false;
    } else {
      const scopeMetrics = countryScopeMetrics(country, state.selectedScope);
      if (Number(scopeMetrics.dependency || 0) < state.threshold) return false;
    }

    return true;
  }

  function filteredCountries() {
    if (!state.bundle) return [];

    return state.bundle.countries.filter((country) => {
      if (!passesFilters(country)) return false;
      return metricValue(country) >= state.threshold;
    });
  }

  function rankedCountries() {
    return filteredCountries()
      .slice()
      .sort((a, b) => metricValue(b) - metricValue(a));
  }

  function visibleCategories() {
    const categories = currentCategoryOptions();

    if (state.selectedCategory === "all") return categories;

    return categories.filter((category) => category.id === state.selectedCategory);
  }

  function findCountry(iso3) {
    if (!iso3 || !state.bundle) return null;

    return (
      state.bundle.countries.find((country) => country.iso3 === iso3) ||
      countryMetaByIso3.get(iso3) ||
      null
    );
  }

  function currentCategoryLabel() {
    if (state.selectedCategory === "all") {
      return state.categoryDimension === "analysis_major" ? "全部大类" : "全部细类";
    }
    return (
      currentCategoryOptions().find((item) => item.id === state.selectedCategory)?.name ||
      state.selectedCategory
    );
  }

  function currentFilterContextLabel() {
    return `${scopeLabel(state.selectedScope)} / ${categoryDimensionLabel(
      state.categoryDimension
    )} / ${currentCategoryLabel()}`;
  }

  /**
   * --------------------------------------------------------------------------
   * KPI and mini views
   * --------------------------------------------------------------------------
   */

  function renderKpis() {
    if (!DOM.kpiStrip || !state.bundle) return;

    if (isCountryScope()) {
      const country = currentCountry();
      if (country) {
        const firstYearValue =
          countryTrendValue(country.iso3, indexData.years[0]) ?? country.cdi;
        const previousValue =
          countryTrendValue(country.iso3, previousYear()) ?? country.cdi;
        const periodDelta = Number(country.cdi || 0) - Number(firstYearValue || 0);
        const yearDelta = Number(country.cdi || 0) - Number(previousValue || 0);

        const kpis = [
          {
            tone: "gold",
            label: "当前国家",
            value: country.name,
            badge: `排名 #${country.rank || "-"}`,
            lines: [
              `${country.region} / ${country.incomeGroup}`,
              `主导类别 ${country.topCategory || "-"}`
            ],
            textValue: true
          },
          {
            tone: "cyan",
            label: "依赖强度",
            value: country.cdi.toFixed(2),
            badge: `较 2007 ${periodDelta >= 0 ? "+" : ""}${periodDelta.toFixed(2)}`,
            lines: [
              `较上年 ${yearDelta >= 0 ? "+" : ""}${yearDelta.toFixed(2)}`,
              "中国制造依赖指数"
            ]
          },
          {
            tone: "blue",
            label: "来源集中",
            value: country.hhi.toFixed(2),
            badge: "来源集中",
            lines: [
              `中国制造品进口额 ${formatTradeValue(country.chinaImport)}`,
              `制造业总进口额 ${formatTradeValue(country.totalImport)}`
            ]
          },
          {
            tone: "red",
            label: "结构脆弱性",
            value: country.vulnerability.toFixed(2),
            badge:
              country.vulnerability >= 0.5
                ? "较高"
                : country.vulnerability >= 0.35
                ? "中等"
                : "温和",
            lines: [
              `主导类别 ${country.topCategory || "-"}`,
              `${state.year} 年综合脆弱性`
            ]
          }
        ];

        DOM.kpiStrip.innerHTML = kpis
          .map(
            (item) => `
              <article class="kpi-card is-${escapeHtml(item.tone)} ${item.textValue ? "is-text" : ""}">
                <div class="kpi-card-head">
                  <span class="kpi-label">${escapeHtml(item.label)}</span>
                  <span class="kpi-badge">${escapeHtml(item.badge)}</span>
                </div>
                <strong class="kpi-value">${escapeHtml(String(item.value))}</strong>
                <div class="kpi-meta">
                  ${item.lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
                </div>
              </article>
            `
          )
          .join("");
        return;
      }
    }

    const rows = filteredCountries();
    const totalCountries = state.bundle.countries.length || rows.length || 1;
    const high = rows.filter((country) => Number(country.cdi || 0) >= 0.3);
    const extreme = rows.filter((country) => Number(country.cdi || 0) >= 0.6);
    const avg =
      rows.reduce((sum, country) => sum + Number(country.cdi || 0), 0) /
      Math.max(1, rows.length);
    const median = medianOf(rows.map((country) => Number(country.cdi || 0)));
    const coverage = (rows.length / Math.max(1, totalCountries)) * 100;
    const regionCount = new Set(rows.map((country) => country.region).filter(Boolean)).size;
    const incomeCount = new Set(
      rows.map((country) => country.incomeGroup).filter(Boolean)
    ).size;
    const previousAvg = averageTrendForCountries(
      rows.map((country) => country.iso3),
      previousYear()
    );
    const avgDelta = avg - previousAvg;

    const maxFlow = visibleFlows()[0];
    const maxFlowCountry = maxFlow ? findCountry(maxFlow.toIso3) : null;
    const flowDependency =
      maxFlowCountry && state.selectedCategory !== "all"
        ? Number(categoryMetrics(maxFlowCountry, state.selectedCategory).dependency || 0)
        : Number(maxFlow?.dependency || maxFlowCountry?.cdi || 0);

    const kpis = [
      {
        tone: "blue",
        label: "分析国家",
        value: rows.length,
        badge: `覆盖 ${coverage.toFixed(0)}%`,
        lines: [`${regionCount} 个区域 / ${incomeCount} 个收入组`, "当前筛选样本"]
      },
      {
        tone: "red",
        label: "高依赖国家",
        value: high.length,
        badge: `占样本 ${rows.length ? ((high.length / rows.length) * 100).toFixed(0) : 0}%`,
        lines: [`极高依赖 ${extreme.length} 国`, `阈值 ${state.threshold.toFixed(2)}`]
      },
      {
        tone: "gold",
        label: "全球平均依赖度",
        value: avg.toFixed(2),
        badge: `${avgDelta >= 0 ? "+" : ""}${avgDelta.toFixed(2)} vs prev`,
        lines: [`中位数 ${median.toFixed(2)}`, `${state.year} 年样本均值`]
      },
      {
        tone: "cyan",
        label: "最大流向国家",
        value: maxFlowCountry?.name || maxFlow?.toIso3 || "-",
        badge: maxFlow ? formatTradeValue(Number(maxFlow.value || 0)) : "无流向",
        lines: [
          `依赖度 ${flowDependency.toFixed(2)}`,
          `主导类别 ${maxFlow?.category || maxFlowCountry?.topCategory || "-"}`
        ],
        textValue: true
      }
    ];

    DOM.kpiStrip.innerHTML = kpis
      .map(
        (item) => `
          <article class="kpi-card is-${escapeHtml(item.tone)} ${item.textValue ? "is-text" : ""}">
            <div class="kpi-card-head">
              <span class="kpi-label">${escapeHtml(item.label)}</span>
              <span class="kpi-badge">${escapeHtml(item.badge)}</span>
            </div>
            <strong class="kpi-value">${escapeHtml(String(item.value))}</strong>
            <div class="kpi-meta">
              ${item.lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
            </div>
          </article>
        `
      )
      .join("");
  }

  function averageTrendForCountries(iso3List, year) {
    if (!iso3List?.length) return 0;

    const isoSet = new Set(iso3List);
    let values = [];

    if (Array.isArray(state.trend) && state.trend.length) {
      values = state.trend
        .filter((row) => Number(row.year) === Number(year) && isoSet.has(row.iso3))
        .map((row) => Number(row.cdi || 0))
        .filter(Number.isFinite);
    } else {
      values = [...isoSet]
        .map((iso3) => {
          const series = countryMetaByIso3.get(iso3)?.cdi;
          if (!series) return NaN;
          return Number(series[String(year)] ?? series[year]);
        })
        .filter(Number.isFinite);
    }

    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function medianOf(values) {
    const cleaned = values
      .map((value) => Number(value))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    if (!cleaned.length) return 0;

    const mid = Math.floor(cleaned.length / 2);
    return cleaned.length % 2
      ? cleaned[mid]
      : (cleaned[mid - 1] + cleaned[mid]) / 2;
  }

  function renderMatrixPreview() {
    if (!DOM.matrixPreview || !state.bundle) return;

    const countries = rankedCountries().slice(0, 5);
    const categories = (indexData.categories || [])
      .filter((category) => category.id !== "all")
      .slice(0, 6);

    DOM.matrixPreview.innerHTML = countries
      .map((country) => {
        const cells = categories
          .map((category) => {
            const value = Number(categoryMetrics(country, category.id).dependency || 0);
            return `
              <span
                title="${escapeHtml(country.name)} · ${escapeHtml(
              category.name
            )} · ${value.toFixed(2)}"
                style="background:${fallbackCssColor(value)}"
              ></span>
            `;
          })
          .join("");

        return `
          <div class="mini-matrix-row">
            <strong>${escapeHtml(country.name)}</strong>
            <div>${cells}</div>
          </div>
        `;
      })
      .join("");
  }

  /**
   * --------------------------------------------------------------------------
   * Detail / charts
   * --------------------------------------------------------------------------
   */

  function renderDetailPanels(section = activePrimarySection()) {
    const country = findCountry(state.selectedCountry) || rankedCountries()[0];
    if (!country) return;
    const detailRecord = state.countryDetailRecord || null;

    const profile = detailPanel.buildCountryProfile
      ? detailPanel.buildCountryProfile({
          country,
          state,
          indexData,
          rankedCountries,
          visibleCategories,
          allCategories: countryContributionCategories(),
          categoryMetrics: (countryRow, categoryRef) =>
            categoryMetrics(countryRow, categoryRef, {
              dimension: "analysis_minor",
              scope: state.selectedScope
            }),
          countryTrendValue,
          previousYear,
          countries: state.bundle?.countries || []
        })
      : buildFallbackCountryProfile(country);

    const dependencyRanking = buildRightRailDependencyRanking(detailRecord, profile).map(
      (item) => {
        const categoryMeta = categoryById.get(item.id);
        return {
          ...item,
          name: categoryMeta?.name || item.name || item.categoryName || item.id,
          color:
            categoryMeta?.color ||
            cssColorForValue?.(Number(item.dependency || 0))
        };
      }
    );
    const categoryFocus = buildRightRailCategoryFocus(detailRecord, dependencyRanking);

    const overviewTrendSeries = buildCountryOverviewTrendSeries(country.iso3, detailRecord);
    const seriesSummary = summarizeSeries(overviewTrendSeries);
    const profileForDisplay = {
      ...profile,
      delta: seriesSummary.yearDelta,
      periodDelta: seriesSummary.periodDelta
    };

    if (section === "overview") {
      detailPanel.renderOverviewDetail?.({
        country,
        state,
        profile: profileForDisplay,
        formatTradeValue,
        setText,
        escapeHtml
      });

      charts.renderOverviewTrend?.({
        years: indexData.years,
        series: overviewTrendSeries
      });

      detailPanel.renderTrendSummary?.({
        years: indexData.years,
        series: overviewTrendSeries
      });

      detailPanel.renderCountryDiagnosis?.({
        country,
        profile: profileForDisplay,
        state,
        contextLabel: currentFilterContextLabel(),
        escapeHtml
      });

      detailPanel.renderOverviewEvidence?.({
        detailRecord,
        containerId: "countrySignalGrid",
        scopeLabel: scopeLabel(state.selectedScope),
        categoryLabel: currentCategoryLabel(),
        escapeHtml
      });

      detailPanel.renderSupplierStructure?.({
        country,
        supplierProfile:
          detailRecord?.supplierStructure ||
          state.supplierStructure?.[country.iso3] ||
          null,
        supplierData: state.supplierStructure,
        escapeHtml
      });

      detailPanel.renderDependencyBreadth?.({
        country,
        breadthProfile:
          detailRecord?.dependencyBreadth ||
          state.dependencyBreadth?.[country.iso3] ||
          null,
        breadthData: state.dependencyBreadth,
        escapeHtml
      });

      if (state.selectedCategory !== "all") {
        detailPanel.renderCategoryFocus?.({
          item: categoryFocus?.item,
          rank: categoryFocus?.rank,
          contextLabel: currentFilterContextLabel(),
          containerId: "topProducts"
        });
      } else {
        detailPanel.renderDependencyRanking?.({
          rows: dependencyRanking,
          containerId: "topProducts",
          emptyLabel: state.categoryDimension === "analysis_major" ? "大类依赖排行" : "细类依赖排行",
          limit: 5
        });
      }

      return;
    }

    if (section !== "country") return;

    detailPanel.renderCountryPage?.({
      country,
      state,
      profile: profileForDisplay,
      formatTradeValue,
      setText
    });

    charts.renderCountryTrend?.({
      years: indexData.years,
      series: overviewTrendSeries
    });

    charts.renderCountryCategory?.({
      categories: profile.categories || []
    });

    detailPanel.renderCategoryContribution?.({
      profile: profileForDisplay,
      containerId: "countryPageCategoryContribution"
    });

    renderCountryWorkbench({
      country,
      detailRecord,
      profile: profileForDisplay,
      overviewTrendSeries
    });
  }

  function ensureProcurementCountry() {
    if (!state.bundle?.countries?.length) return null;

    const candidates = [
      procurementGame.countryIso3,
      state.selectedCountry,
      "USA",
      rankedCountries()[0]?.iso3,
      state.bundle.countries[0]?.iso3
    ].filter(Boolean);

    const iso3 = candidates.find((item) => findCountry(item));
    procurementGame.countryIso3 = iso3 || state.bundle.countries[0]?.iso3 || "";
    return findCountry(procurementGame.countryIso3);
  }

  function procurementAllocationKey(countryIso3, categoryId) {
    return `${countryIso3 || "global"}::${categoryId}`;
  }

  function procurementCategoryRows(country) {
    if (!country) return [];

    const options = categoryOptionsForDimension("analysis_major", "manufactures");
    const rows = options
      .map((category) => {
        const cell = categoryMetrics(country, category.id, {
          scope: "manufactures",
          dimension: "analysis_major"
        });
        const dependency = Number(cell.dependency || cell.cdi || 0);
        return {
          id: category.id,
          name: category.name || category.id,
          color: category.color || fallbackCssColor(dependency),
          dependency,
          hhi: Number(cell.hhi || 0),
          vulnerability: Number(cell.vulnerability || 0),
          importance: Number(cell.importance || 0),
          chinaImport: Number(cell.chinaImport || 0),
          totalImport: Number(cell.totalImport || 0)
        };
      })
      .filter(
        (row) =>
          Number(row.totalImport || 0) > 0 ||
          Number(row.chinaImport || 0) > 0 ||
          Number(row.dependency || 0) > 0
      )
      .sort(
        (a, b) =>
          Number(b.totalImport || 0) - Number(a.totalImport || 0) ||
          Number(b.dependency || 0) - Number(a.dependency || 0)
      )
      .slice(0, 4);

    if (rows.length) return rows;

    return options.slice(0, 4).map((category, index) => ({
      id: category.id,
      name: category.name || category.id,
      color: category.color || fallbackCssColor(0.2 + index * 0.08),
      dependency: Number(country.cdi || 0),
      hhi: Number(country.hhi || 0),
      vulnerability: Number(country.vulnerability || 0),
      importance: 1 / 4,
      chinaImport: 0,
      totalImport: 0
    }));
  }

  function setMeter(element, value, mode = "normal") {
    if (!element) return;
    const clamped = Math.max(0, Math.min(100, Number(value || 0)));
    element.style.width = `${clamped}%`;
    element.dataset.mode = mode;
  }

  function seededRandom(seed) {
    let value = seed % 2147483647;
    if (value <= 0) value += 2147483646;
    return () => {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function supplyMazeSeed(country) {
    const iso = countryIso3(country) || "USA";
    return (
      String(iso)
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) +
      Number(procurementGame.year || 2024) * 17 +
      String(procurementGame.cargoId || "electronics").length * 97
    );
  }

  function resetSupplyMazeGame(preserveMaze = false) {
    procurementGame.player = { row: 1, col: 1 };
    procurementGame.stats = null;
    procurementGame.completed = false;
    procurementGame.lastEvent = null;
    procurementGame.riskShiftCount = 0;
    procurementGame.shiftedRiskCells = new Set();
    procurementGame.visitedEvents = new Set();
    procurementGame.allocations = recommendedDispatchAllocation();
    procurementGame.dispatched = false;
    procurementGame.dispatchCount = 0;
    procurementGame.lastResult = null;
    if (!preserveMaze) procurementGame.maze = null;
  }

  function selectedMazeCargo() {
    return SUPPLY_MAZE_CARGO[procurementGame.cargoId] || SUPPLY_MAZE_CARGO.electronics;
  }

  function selectedMazeYear() {
    const year = Number(procurementGame.year || state.year || 2024);
    return SUPPLY_MAZE_YEARS[year] ? year : 2024;
  }

  function recommendedDispatchAllocation() {
    const cargo = selectedMazeCargo();
    const year = selectedMazeYear();
    if (year === 2020) return { china: 36, alt: 26, inventory: 24, express: 14 };
    if (year === 2018) return { china: 40, alt: 32, inventory: 14, express: 14 };
    if (year === 2024) return { china: 42, alt: 30, inventory: 16, express: 12 };
    if (cargo === SUPPLY_MAZE_CARGO.medical) return { china: 38, alt: 24, inventory: 18, express: 20 };
    return { china: 48, alt: 24, inventory: 14, express: 14 };
  }

  function normalizedDispatchAllocation() {
    const allocation = procurementGame.allocations || recommendedDispatchAllocation();
    const values = {
      china: Math.max(0, Number(allocation.china || 0)),
      alt: Math.max(0, Number(allocation.alt || 0)),
      inventory: Math.max(0, Number(allocation.inventory || 0)),
      express: Math.max(0, Number(allocation.express || 0))
    };
    const total = Object.values(values).reduce((sum, value) => sum + value, 0) || 1;
    return {
      china: (values.china / total) * 100,
      alt: (values.alt / total) * 100,
      inventory: (values.inventory / total) * 100,
      express: (values.express / total) * 100
    };
  }

  function setDispatchAllocation(key, value) {
    procurementGame.allocations = {
      ...recommendedDispatchAllocation(),
      ...(procurementGame.allocations || {})
    };
    procurementGame.allocations[key] = Math.max(0, Math.min(100, Number(value || 0)));
    procurementGame.dispatched = false;
    procurementGame.lastResult = null;
    procurementGame.lastEvent = null;
  }

  function dispatchEventForScenario(country, allocation) {
    const year = selectedMazeYear();
    const scoped = countryScopeMetrics(country, "manufactures");
    const dependency = Number(scoped.dependency || country?.cdi || 0);
    const seed =
      supplyMazeSeed(country) +
      Math.round(allocation.china * 13 + allocation.alt * 17 + allocation.inventory * 19 + allocation.express * 23) +
      procurementGame.dispatchCount * 101;
    const rng = seededRandom(seed);
    const eventPool = [
      {
        title: "目标市场突然补货",
        text: "需求临时上升，库存和快速转运能缓冲交付压力。",
        cost: 5,
        time: allocation.inventory >= 18 || allocation.express >= 18 ? -4 : 8,
        exposure: 2,
        stability: allocation.inventory >= 18 ? 8 : -8,
        lesson: "库存不是浪费，它能在需求波动时换来响应速度。"
      },
      {
        title: "替代供应认证延迟",
        text: "替代供应需要质量认证，短期内交付速度下降。",
        cost: allocation.alt >= 30 ? 8 : 3,
        time: allocation.alt >= 30 ? 7 : 2,
        exposure: allocation.alt >= 30 ? -5 : 2,
        stability: allocation.alt >= 30 ? -3 : -8,
        lesson: "多元化不是马上可用，真实供应链需要提前建设替代产能。"
      },
      {
        title: "中国制造产能释放",
        text: "主要供应源恢复产能，成本和交付压力下降。",
        cost: allocation.china >= 40 ? -8 : -3,
        time: allocation.china >= 40 ? -7 : -2,
        exposure: allocation.china >= 55 ? 8 : 3,
        stability: allocation.china >= 40 ? 5 : 0,
        lesson: "高效供应源有明显优势，但过度集中会提高暴露。"
      },
      {
        title: "港口与航运拥堵",
        text: "跨境物流变慢，快速转运能部分抵消延误。",
        cost: allocation.express >= 18 ? 8 : 4,
        time: allocation.express >= 18 ? -3 : 9,
        exposure: 3,
        stability: allocation.express >= 18 ? 6 : -9,
        lesson: "快速转运可以救交付，但会增加运输成本。"
      }
    ];
    if (year === 2018) {
      eventPool.push({
        title: "贸易摩擦升级",
        text: "关税和不确定性上升，单一来源方案承压。",
        cost: 8 + dependency * 8,
        time: 3,
        exposure: allocation.china >= 55 ? 12 : 5,
        stability: allocation.alt >= 28 ? 3 : -10,
        lesson: "政策冲击下，供应来源越单一，调整空间越小。"
      });
    }
    if (year === 2020) {
      eventPool.push({
        title: "疫情冲击物流",
        text: "运输和工厂排产同时受扰，库存缓冲变得更重要。",
        cost: 6,
        time: allocation.inventory >= 22 ? 2 : 12,
        exposure: 6,
        stability: allocation.inventory >= 22 ? 8 : -14,
        lesson: "疫情类冲击会同时影响时间和稳定性，提前缓冲很关键。"
      });
    }
    if (year === 2024) {
      eventPool.push({
        title: "供应链重组检查",
        text: "客户要求证明供应来源更稳健，替代供应和库存会加分。",
        cost: 4,
        time: 2,
        exposure: allocation.china >= 60 ? 12 : 4,
        stability: allocation.alt + allocation.inventory >= 45 ? 10 : -8,
        lesson: "重组阶段不是完全脱钩，而是追求更可解释的韧性结构。"
      });
    }
    return eventPool[Math.floor(rng() * eventPool.length)];
  }

  function calculateDispatchResult(country) {
    const cargo = selectedMazeCargo();
    const yearConfig = SUPPLY_MAZE_YEARS[selectedMazeYear()] || SUPPLY_MAZE_YEARS[2024];
    const scoped = countryScopeMetrics(country, "manufactures");
    const dependency = Number(scoped.dependency || country?.cdi || 0);
    const concentration = Number(scoped.hhi || country?.hhi || 0);
    const allocation = normalizedDispatchAllocation();
    const event = procurementGame.dispatched
      ? dispatchEventForScenario(country, allocation)
      : null;

    const costPressure =
      cargo.baseCost +
      allocation.alt * 0.34 +
      allocation.inventory * 0.42 +
      allocation.express * 0.56 -
      allocation.china * 0.16 +
      Number(event?.cost || 0);
    const timePressure =
      34 -
      allocation.china * 0.12 -
      allocation.express * 0.22 +
      allocation.alt * 0.18 -
      allocation.inventory * 0.1 +
      Number(event?.time || 0) +
      (selectedMazeYear() === 2020 ? 8 : 0);
    const exposurePressure =
      dependency * 45 +
      concentration * 24 +
      allocation.china * 0.55 -
      allocation.alt * 0.34 -
      allocation.inventory * 0.12 +
      Number(event?.exposure || 0);
    const stability =
      76 -
      exposurePressure * 0.36 -
      Math.max(0, timePressure - 35) * 0.42 -
      Math.max(0, costPressure - 45) * 0.18 +
      allocation.alt * 0.18 +
      allocation.inventory * 0.32 +
      Number(event?.stability || 0);
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            Math.max(0, costPressure - 45) * 0.38 -
            Math.max(0, timePressure - cargo.deadline * 0.75) * 0.55 -
            Math.max(0, exposurePressure) * 0.42 +
            Math.max(0, stability - 55) * 0.24 +
            (procurementGame.dispatched ? 6 : 0)
        )
      )
    );

    return {
      allocation,
      event,
      costPressure: Math.max(0, costPressure),
      timePressure: Math.max(0, timePressure),
      riskPressure: Math.max(0, Math.min(100, exposurePressure)),
      stability: Math.max(0, Math.min(100, stability)),
      score
    };
  }

  function evaluateDispatchPlan(result) {
    const allocation = result.allocation;
    if (!procurementGame.dispatched) {
      return {
        tag: "等待调度",
        text: "调整四种资源比例后执行调度，看看方案能否扛住事件压力测试。"
      };
    }
    if (result.score >= 82 && result.stability >= 62) {
      return {
        tag: "韧性均衡",
        text: "方案兼顾效率和稳定性，能够解释为什么供应链需要组合策略。"
      };
    }
    if (allocation.china >= 62 && result.riskPressure >= 60) {
      return {
        tag: "高效但集中",
        text: "中国供给比例高，成本和速度有优势，但依赖暴露也更明显。"
      };
    }
    if (allocation.alt + allocation.inventory >= 58 && result.costPressure >= 58) {
      return {
        tag: "稳健但偏贵",
        text: "替代供应和库存提升了韧性，但成本压力较高。"
      };
    }
    if (allocation.express >= 35) {
      return {
        tag: "速度优先",
        text: "快速转运降低了延误风险，但会显著消耗预算。"
      };
    }
    if (result.riskPressure >= 72) {
      return {
        tag: "暴露过高",
        text: "当前方案过度依赖单一供应路径，遇到外部事件时抗冲击能力不足。"
      };
    }
    return {
      tag: "可交付方案",
      text: "方案能够完成订单，但仍可通过调整替代供应和库存比例提高稳定性。"
    };
  }

  function formatDispatchEffect(event) {
    if (!event) return "等待执行";
    return formatMazeEffect({
      cost: event.cost,
      time: event.time,
      exposure: event.exposure,
      risk: -Number(event.stability || 0)
    });
  }

  function generateSupplyMaze(country) {
    const year = selectedMazeYear();
    const config = SUPPLY_MAZE_YEARS[year] || SUPPLY_MAZE_YEARS[2024];
    const size = 13;
    const rng = seededRandom(supplyMazeSeed(country));
    const grid = Array.from({ length: size }, () => Array(size).fill("wall"));
    const visited = Array.from({ length: size }, () => Array(size).fill(false));
    const dirs = [
      [0, 2],
      [0, -2],
      [2, 0],
      [-2, 0]
    ];

    function shuffle(items) {
      return items
        .map((item) => ({ item, key: rng() }))
        .sort((a, b) => a.key - b.key)
        .map((entry) => entry.item);
    }

    function carve(row, col) {
      visited[row][col] = true;
      grid[row][col] = "path";
      shuffle(dirs).forEach(([dr, dc]) => {
        const nr = row + dr;
        const nc = col + dc;
        if (nr <= 0 || nc <= 0 || nr >= size - 1 || nc >= size - 1 || visited[nr][nc]) {
          return;
        }
        grid[row + dr / 2][col + dc / 2] = "path";
        carve(nr, nc);
      });
    }

    carve(1, 1);
    grid[1][1] = "start";
    grid[size - 2][size - 2] = "target";

    const openCells = [];
    for (let row = 1; row < size - 1; row += 1) {
      for (let col = 1; col < size - 1; col += 1) {
        if (grid[row][col] === "path") openCells.push({ row, col });
      }
    }

    const takeCells = (count) => {
      const chosen = [];
      while (chosen.length < count && openCells.length) {
        const index = Math.floor(rng() * openCells.length);
        chosen.push(openCells.splice(index, 1)[0]);
      }
      return chosen;
    };

    takeCells(config.riskCount).forEach(({ row, col }) => {
      grid[row][col] = "risk";
    });
    takeCells(config.eventCount).forEach(({ row, col }) => {
      grid[row][col] = "event";
    });
    takeCells(4).forEach(({ row, col }) => {
      grid[row][col] = "china";
    });
    takeCells(4).forEach(({ row, col }) => {
      grid[row][col] = "alt";
    });
    takeCells(2).forEach(({ row, col }) => {
      grid[row][col] = "port";
    });

    return { grid, size, year, config };
  }

  function ensureSupplyMaze(country) {
    if (!procurementGame.maze) {
      procurementGame.maze = generateSupplyMaze(country);
    }
    if (!procurementGame.stats) {
      const cargo = selectedMazeCargo();
      const scoped = countryScopeMetrics(country, "manufactures");
      const baseRisk = Number(scoped.dependency || country?.cdi || 0) * 26;
      procurementGame.stats = {
        cost: cargo.baseCost,
        time: 0,
        risk: Math.max(8, Math.round(baseRisk)),
        chinaExposure: Math.round(Number(scoped.dependency || country?.cdi || 0) * 30),
        chinaUsed: 0,
        altUsed: 0,
        riskHits: 0,
        eventHits: 0,
        portHits: 0,
        steps: 0
      };
    }
    return procurementGame.maze;
  }

  function mazeTileLabel(tile) {
    const labels = {
      start: "中",
      target: "终",
      china: "中",
      alt: "替",
      risk: "险",
      event: "事",
      port: "港",
      wall: ""
    };
    return labels[tile] || "";
  }

  function tilePenalty(tile, country) {
    const cargo = selectedMazeCargo();
    const yearConfig = SUPPLY_MAZE_YEARS[selectedMazeYear()] || SUPPLY_MAZE_YEARS[2024];
    const scoped = countryScopeMetrics(country, "manufactures");
    const dependency = Number(scoped.dependency || country?.cdi || 0);
    const countryRisk = dependency + Number(scoped.hhi || country?.hhi || 0) * 0.5;
    const isTransportCargo = procurementGame.cargoId === "transport";
    const base = {
      cost: cargo.stepCost,
      time: 1 / Math.max(0.6, Number(cargo.routeAgility || 1)),
      risk: 1.2,
      exposure: 0,
      type: "path"
    };
    if (tile === "china") {
      return {
        cost: -2,
        time: -1,
        risk: (2 + countryRisk * 3) * cargo.riskSensitivity * yearConfig.riskBoost,
        exposure: (7 + dependency * 14) * Number(cargo.chinaRisk || 1) * yearConfig.riskBoost,
        type: "china"
      };
    }
    if (tile === "alt") {
      return {
        cost: Number(cargo.altCost || 7),
        time: 2 / Math.max(0.6, Number(cargo.routeAgility || 1)),
        risk: -7,
        exposure: -10,
        type: "alt"
      };
    }
    if (tile === "risk") {
      return {
        cost: 6 + Number(cargo.stepCost || 0),
        time: 4 / Math.max(0.6, Number(cargo.routeAgility || 1)),
        risk: (11 + countryRisk * 6) * cargo.riskSensitivity * yearConfig.riskBoost,
        exposure: 5 * cargo.riskSensitivity,
        type: "risk"
      };
    }
    if (tile === "port") {
      return {
        cost: isTransportCargo ? 10 : 5,
        time: isTransportCargo ? 8 : 5,
        risk: isTransportCargo ? 7 : 3,
        exposure: isTransportCargo ? 3 : 1,
        type: "port"
      };
    }
    return base;
  }

  function applyMazePenalty(penalty) {
    const stats = procurementGame.stats;
    if (!stats) return;

    stats.cost = Math.max(0, stats.cost + Number(penalty.cost || 0));
    stats.time = Math.max(0, stats.time + Number(penalty.time || 0));
    stats.risk = Math.max(0, stats.risk + Number(penalty.risk || 0));
    stats.chinaExposure = Math.max(0, stats.chinaExposure + Number(penalty.exposure || 0));

    if (penalty.type === "china") stats.chinaUsed += 1;
    if (penalty.type === "alt") stats.altUsed += 1;
    if (penalty.type === "risk") stats.riskHits += 1;
    if (penalty.type === "port") stats.portHits += 1;
  }

  function shiftDynamicRiskWalls(country) {
    const maze = procurementGame.maze;
    if (!maze?.grid) return;

    const rng = seededRandom(
      supplyMazeSeed(country) + procurementGame.stats.steps * 101 + procurementGame.riskShiftCount * 997
    );
    const riskCells = [];
    const candidateCells = [];

    maze.grid.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        const isReserved =
          (rowIndex === procurementGame.player.row && colIndex === procurementGame.player.col) ||
          tile === "start" ||
          tile === "target" ||
          tile === "event";
        if (tile === "risk" && !isReserved) riskCells.push({ row: rowIndex, col: colIndex });
        if ((tile === "path" || tile === "china" || tile === "alt" || tile === "port") && !isReserved) {
          candidateCells.push({ row: rowIndex, col: colIndex });
        }
      });
    });

    if (!riskCells.length || !candidateCells.length) return;

    const shiftCount = Math.min(3, Math.max(1, Math.round((maze.config?.riskCount || 6) / 4)));
    const shifted = new Set();
    for (let index = 0; index < shiftCount; index += 1) {
      if (!riskCells.length || !candidateCells.length) break;
      const oldIndex = Math.floor(rng() * riskCells.length);
      const newIndex = Math.floor(rng() * candidateCells.length);
      const oldCell = riskCells.splice(oldIndex, 1)[0];
      const newCell = candidateCells.splice(newIndex, 1)[0];
      maze.grid[oldCell.row][oldCell.col] = "path";
      maze.grid[newCell.row][newCell.col] = "risk";
      shifted.add(`${newCell.row}:${newCell.col}`);
    }

    procurementGame.riskShiftCount += 1;
    procurementGame.shiftedRiskCells = shifted;
    procurementGame.lastEvent = {
      title: "全球供应链环境变化",
      text: `${shiftCount} 个风险点重新分布，原先安全的路线可能变得不稳定。`,
      effect: "风险迁移",
      lesson: "供应链路线不能只靠记忆，外部环境会持续改变最优路径。"
    };
  }

  function triggerMazeEvent(country) {
    const seed =
      supplyMazeSeed(country) +
      procurementGame.stats.steps * 31 +
      procurementGame.player.row * 7 +
      procurementGame.player.col * 11;
    const rng = seededRandom(seed);
    const card = SUPPLY_MAZE_EVENTS[Math.floor(rng() * SUPPLY_MAZE_EVENTS.length)];
    procurementGame.stats.eventHits += 1;
    applyMazePenalty({
      cost: card.cost,
      time: card.time,
      risk: card.risk,
      exposure: card.exposure,
      type: "event"
    });
    procurementGame.lastEvent = {
      title: card.title,
      text: card.text,
      effect: formatMazeEffect(card),
      lesson: card.lesson
    };
  }

  function formatMazeEffect(card) {
    const parts = [];
    if (Number(card.cost || 0) !== 0) parts.push(`成本 ${formatSigned(card.cost)}`);
    if (Number(card.time || 0) !== 0) parts.push(`时间 ${formatSigned(card.time)}`);
    if (Number(card.risk || 0) !== 0) parts.push(`稳定风险 ${formatSigned(card.risk)}`);
    if (Number(card.exposure || 0) !== 0) parts.push(`依赖暴露 ${formatSigned(card.exposure)}`);
    return parts.join(" / ") || "无直接数值变化";
  }

  function formatSigned(value) {
    const number = Number(value || 0);
    return `${number > 0 ? "+" : ""}${number}`;
  }

  function moveSupplyMazePlayer(dr, dc) {
    if (activePrimarySection() !== "game" || procurementGame.completed) return;
    const country = ensureProcurementCountry();
    if (!country) return;
    const maze = ensureSupplyMaze(country);
    const next = {
      row: procurementGame.player.row + dr,
      col: procurementGame.player.col + dc
    };
    const tile = maze.grid[next.row]?.[next.col];
    if (!tile || tile === "wall") return;

    procurementGame.shiftedRiskCells = new Set();
    procurementGame.player = next;
    procurementGame.stats.steps += 1;
    const penalty = tilePenalty(tile, country);
    applyMazePenalty(penalty);

    const eventKey = `${next.row}:${next.col}`;
    if (tile === "event" && !procurementGame.visitedEvents.has(eventKey)) {
      procurementGame.visitedEvents.add(eventKey);
      triggerMazeEvent(country);
    } else if (tile === "event") {
      procurementGame.lastEvent = {
        title: "事件已处理",
        text: "这个事件点已经处理过，继续寻找更稳的路线。",
        effect: "无新增影响",
        lesson: "复盘已经发生的冲击，有助于选择下一段路线。"
      };
    }

    if (tile === "target") {
      procurementGame.completed = true;
    }

    if (
      !procurementGame.completed &&
      procurementGame.stats.steps > 0 &&
      procurementGame.stats.steps % SUPPLY_MAZE_DYNAMIC_INTERVAL === 0
    ) {
      shiftDynamicRiskWalls(country);
    }

    renderProcurementGame();
  }

  function calculateSupplyMazeScore() {
    const cargo = selectedMazeCargo();
    const stats = procurementGame.stats || { cost: 0, time: 0, risk: 0, chinaExposure: 0, steps: 0 };
    const costPressure = Math.max(0, stats.cost);
    const timePressure = Math.max(0, (stats.time / Math.max(cargo.deadline, 1)) * 100);
    const exposurePressure = Math.max(
      0,
      Math.min(100, Number(stats.risk || 0) * 0.52 + Number(stats.chinaExposure || 0) * 0.48)
    );
    const stability = Math.max(
      0,
      Math.min(
        100,
        100 -
          exposurePressure * 0.58 -
          Math.max(0, timePressure - 92) * 0.35 -
          Number(stats.riskHits || 0) * 3
      )
    );
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            Math.max(0, costPressure - 55) * 0.55 -
            Math.max(0, timePressure - 82) * 0.45 -
            exposurePressure * 0.38 +
            Math.min(Number(stats.altUsed || 0), 3) * 3 +
            (procurementGame.completed ? 12 : 0)
        )
      )
    );
    return { costPressure, timePressure, riskPressure: exposurePressure, stability, score };
  }

  function evaluateSupplyMazeRoute(result) {
    const stats = procurementGame.stats || {};
    if (!procurementGame.completed) {
      if (!Number(stats.steps || 0)) {
        return {
          tag: "等待出发",
          text: "先选择快线还是替代供应路线，路线选择会实时改变四项指标。"
        };
      }
      if (result.riskPressure > 70) {
        return {
          tag: "集中暴露偏高",
          text: "当前路线对单一通道依赖偏高，可以尝试经过替代供应点降低暴露。"
        };
      }
      if (result.timePressure > 95) {
        return {
          tag: "交付接近超时",
          text: "当前货物对时间敏感，继续绕行可能影响交付。"
        };
      }
      return {
        tag: "决策进行中",
        text: "继续前进：最短路不一定最高分，注意风险墙和事件卡。"
      };
    }

    if (result.timePressure > 105) {
      return {
        tag: "超时交付",
        text: "货物送达了，但时间代价过高，供应链响应速度不足。"
      };
    }
    if (result.riskPressure > 72 && Number(stats.chinaUsed || 0) > Number(stats.altUsed || 0)) {
      return {
        tag: "高效但集中",
        text: "路线较快，但过度依赖单一路径，遇到冲击时韧性不足。"
      };
    }
    if (Number(stats.altUsed || 0) >= 2 && result.stability >= 55) {
      return {
        tag: "稳健分散",
        text: "你使用了替代供应来分散风险，成本略高但稳定性更好。"
      };
    }
    if (result.costPressure < 55 && result.riskPressure > 55) {
      return {
        tag: "低成本冒险",
        text: "路线成本控制不错，但风险暴露偏高，现实中需要配合库存或替代来源。"
      };
    }
    return {
      tag: result.score >= 80 ? "均衡突围" : "完成交付",
      text:
        result.score >= 80
          ? "路线兼顾了交付、成本和依赖暴露，是一条比较稳健的供应链路径。"
          : "货物已送达，但仍可通过减少风险区或增加替代供应提升分数。"
    };
  }

  function supplyMazeResultText(result) {
    return evaluateSupplyMazeRoute(result).text;
  }

  function isReachableMazeCell(row, col, maze) {
    if (procurementGame.completed) return false;
    const dr = Math.abs(row - procurementGame.player.row);
    const dc = Math.abs(col - procurementGame.player.col);
    if (dr + dc !== 1) return false;
    const tile = maze?.grid?.[row]?.[col];
    return Boolean(tile && tile !== "wall");
  }

  function renderMazeEventCard() {
    const event = procurementGame.lastEvent;
    if (!event) {
      if (DOM.gameEventImpact) DOM.gameEventImpact.textContent = "等待触发";
      if (DOM.gameEventLog) DOM.gameEventLog.textContent = "走到紫色事件格会触发一次供应链事件。";
      if (DOM.gameEventLesson) {
        DOM.gameEventLesson.textContent = "事件会改变成本、时间或依赖暴露，模拟现实供应链的不确定性。";
      }
      return;
    }
    if (DOM.gameEventImpact) DOM.gameEventImpact.textContent = event.effect || "供应链冲击";
    if (DOM.gameEventLog) DOM.gameEventLog.textContent = `${event.title}：${event.text}`;
    if (DOM.gameEventLesson) DOM.gameEventLesson.textContent = event.lesson || "外部冲击会改变路线评价。";
  }

  function renderMazeContext(country, maze, cargo) {
    const scoped = countryScopeMetrics(country, "manufactures");
    const dependency = Number(scoped.dependency || country?.cdi || 0);
    const hhi = Number(scoped.hhi || country?.hhi || 0);
    const vulnerability = Number(scoped.vulnerability || country?.vulnerability || 0);
    if (DOM.gameYearContext) {
      DOM.gameYearContext.textContent = maze.config?.label || "年份情境";
    }
    if (DOM.gameCountryContext) {
      DOM.gameCountryContext.innerHTML = `
        <div><span>依赖度</span><strong>${dependency.toFixed(2)}</strong></div>
        <div><span>来源集中</span><strong>${hhi.toFixed(2)}</strong></div>
        <div><span>综合风险</span><strong>${vulnerability.toFixed(2)}</strong></div>
      `;
    }
    if (DOM.gameContextExplain) {
      DOM.gameContextExplain.textContent = `${countryChineseName(country)} 对中国制造依赖度为 ${dependency.toFixed(
        2
      )}。依赖越高，走黄色中国制造通道越高效，但累积的依赖暴露也越明显。${cargo.insight}`;
    }
  }

  function renderMazeBrief(country, cargo) {
    if (!DOM.gameBrief) return;
    DOM.gameBrief.innerHTML = `
      <div><strong>目标</strong><span>把“${escapeHtml(cargo.label)}”送到 ${escapeHtml(countryChineseName(country))}。</span></div>
      <div><strong>决策</strong><span>黄色快线更高效，青色替代点更稳，红色风险区会拖慢交付。</span></div>
      <div><strong>胜利</strong><span>到达终点，同时压低成本、时间和依赖暴露。</span></div>
    `;
  }

  function renderDispatchBrief(country, cargo) {
    if (!DOM.gameBrief) return;
    DOM.gameBrief.innerHTML = `
      <div><strong>订单目标</strong><span>把“${escapeHtml(cargo.label)}”稳定供应到 ${escapeHtml(countryChineseName(country))}。</span></div>
      <div><strong>调度选择</strong><span>中国供给、替代供应、库存缓冲、快速转运四项比例相加为 100%。</span></div>
      <div><strong>答辩含义</strong><span>观众能看到低成本、高速度和低依赖暴露之间的真实权衡。</span></div>
    `;
  }

  function renderDispatchContext(country, yearConfig, cargo) {
    const scoped = countryScopeMetrics(country, "manufactures");
    const dependency = Number(scoped.dependency || country?.cdi || 0);
    const hhi = Number(scoped.hhi || country?.hhi || 0);
    const vulnerability = Number(scoped.vulnerability || country?.vulnerability || 0);
    if (DOM.gameYearContext) DOM.gameYearContext.textContent = yearConfig.label || "年份情境";
    if (DOM.gameCountryContext) {
      DOM.gameCountryContext.innerHTML = `
        <div><span>依赖度</span><strong>${dependency.toFixed(2)}</strong></div>
        <div><span>来源集中</span><strong>${hhi.toFixed(2)}</strong></div>
        <div><span>综合风险</span><strong>${vulnerability.toFixed(2)}</strong></div>
      `;
    }
    if (DOM.gameContextExplain) {
      DOM.gameContextExplain.textContent = `${countryChineseName(country)} 当前制造品依赖度为 ${dependency.toFixed(
        2
      )}。中国供给比例越高，效率优势越明显；但如果依赖度和来源集中较高，事件冲击下的暴露也会提高。${cargo.insight}`;
    }
  }

  function renderDispatchEventCard(event) {
    if (!event) {
      if (DOM.gameEventImpact) DOM.gameEventImpact.textContent = "等待执行";
      if (DOM.gameEventLog) {
        DOM.gameEventLog.textContent = "点击“执行调度”后，系统会抽取一个年份相关事件，检验你的供应方案。";
      }
      if (DOM.gameEventLesson) {
        DOM.gameEventLesson.textContent = "事件卡会说明为什么供应链需要在效率、成本和韧性之间取平衡。";
      }
      return;
    }
    if (DOM.gameEventImpact) DOM.gameEventImpact.textContent = formatDispatchEffect(event);
    if (DOM.gameEventLog) DOM.gameEventLog.textContent = `${event.title}：${event.text}`;
    if (DOM.gameEventLesson) DOM.gameEventLesson.textContent = event.lesson || "外部事件会改变方案表现。";
  }

  function renderDispatchControls(result) {
    const allocation = result.allocation;
    const controls = [
      [DOM.gameChinaShare, DOM.gameChinaShareValue, allocation.china],
      [DOM.gameAltShare, DOM.gameAltShareValue, allocation.alt],
      [DOM.gameInventoryShare, DOM.gameInventoryShareValue, allocation.inventory],
      [DOM.gameExpressShare, DOM.gameExpressShareValue, allocation.express]
    ];
    controls.forEach(([input, label, value]) => {
      if (input) input.value = String(Math.round(value));
      if (label) label.textContent = `${Math.round(value)}%`;
    });
  }

  function renderDispatchNetwork(result) {
    const root = DOM.dispatchNetworkView;
    if (!root) return;
    const allocation = result.allocation;
    root.style.setProperty("--china-flow", `${Math.max(8, allocation.china)}%`);
    root.style.setProperty("--alt-flow", `${Math.max(8, allocation.alt)}%`);
    root.style.setProperty("--inventory-flow", `${Math.max(8, allocation.inventory)}%`);
    root.style.setProperty("--express-flow", `${Math.max(8, allocation.express)}%`);
    root.classList.toggle("is-dispatched", Boolean(procurementGame.dispatched));
    root.querySelector(".source-node")?.setAttribute("data-share", `${Math.round(allocation.china)}%`);
    root.querySelector(".alt-node")?.setAttribute("data-share", `${Math.round(allocation.alt)}%`);
    root.querySelector(".inventory-node")?.setAttribute("data-share", `${Math.round(allocation.inventory)}%`);
    root.querySelector(".express-node")?.setAttribute("data-share", `${Math.round(allocation.express)}%`);
  }

  function selectedMineDifficulty() {
    return SUPPLY_MINE_DIFFICULTIES[supplyMineGame.difficulty] || SUPPLY_MINE_DIFFICULTIES.showcase;
  }

  function selectedMineYear() {
    const year = Number(supplyMineGame.year || state.year || 2024);
    return SUPPLY_MAZE_YEARS[year] ? year : 2024;
  }

  function selectedMineCargo() {
    return SUPPLY_MAZE_CARGO[supplyMineGame.cargoId] || SUPPLY_MAZE_CARGO.electronics;
  }

  function supplyMineCountryMetrics(country) {
    const scoped = countryScopeMetrics(country, "manufactures");
    return {
      dependency: clamp01(scoped.dependency || scoped.cdi || country?.cdi || 0),
      hhi: clamp01(scoped.hhi || country?.hhi || 0),
      vulnerability: clamp01(scoped.vulnerability || country?.vulnerability || 0)
    };
  }

  function ensureSupplyMineCountry() {
    if (!state.bundle?.countries?.length) return null;
    const candidates = [
      supplyMineGame.countryIso3,
      state.selectedCountry,
      "USA",
      rankedCountries()[0]?.iso3,
      state.bundle.countries[0]?.iso3
    ].filter(Boolean);
    const iso3 = candidates.find((item) => findCountry(item));
    supplyMineGame.countryIso3 = iso3 || state.bundle.countries[0]?.iso3 || "";
    return findCountry(supplyMineGame.countryIso3);
  }

  function supplyMineSeed(country) {
    const iso = countryIso3(country) || "USA";
    return (
      String(iso)
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) +
      selectedMineYear() * 37 +
      String(supplyMineGame.cargoId || "electronics").length * 193 +
      String(supplyMineGame.difficulty || "showcase").length * 71 +
      supplyMineGame.seedVersion * 1009
    );
  }

  function shuffleSupplyMineItems(items, rng) {
    return items
      .map((item) => ({ item, score: rng() }))
      .sort((a, b) => a.score - b.score)
      .map(({ item }) => item);
  }

  function weightedSupplyMineType(zone, metrics, rng) {
    const riskWeights =
      zone === "risk"
        ? [
            ["barrier", 2.2 + (selectedMineYear() === 2018 ? 1.8 : 0)],
            ["breakage", 2 + metrics.hhi * 3],
            ["fx", 1.2],
            ["geopolitics", 1.1 + (selectedMineYear() === 2024 ? 0.9 : 0)]
          ]
        : [
            ["compliance", 2],
            ["falseInfo", 1.25 + metrics.vulnerability]
          ];
    const total = riskWeights.reduce((sum, [, weight]) => sum + weight, 0);
    let cursor = rng() * total;
    for (const [type, weight] of riskWeights) {
      cursor -= weight;
      if (cursor <= 0) return type;
    }
    return riskWeights[0][0];
  }

  function makeSupplyMineCell(zone, row, col) {
    return {
      id: `${zone}-${row}-${col}`,
      zone,
      row,
      col,
      mineType: "",
      toolType: "",
      revealed: false,
      mark: 0,
      peek: false
    };
  }

  function resetSupplyMineGame({ preserveSelection = false } = {}) {
    const countryIso3Value = preserveSelection ? supplyMineGame.countryIso3 : "";
    const yearValue = preserveSelection ? selectedMineYear() : Number(state.year || 2024);
    const cargoValue = preserveSelection ? supplyMineGame.cargoId : "electronics";
    const difficultyValue = preserveSelection ? supplyMineGame.difficulty : "showcase";
    supplyMineGame.countryIso3 = countryIso3Value;
    supplyMineGame.year = SUPPLY_MAZE_YEARS[yearValue] ? yearValue : 2024;
    supplyMineGame.cargoId = SUPPLY_MAZE_CARGO[cargoValue] ? cargoValue : "electronics";
    supplyMineGame.difficulty = SUPPLY_MINE_DIFFICULTIES[difficultyValue] ? difficultyValue : "showcase";
    supplyMineGame.tools = {};
    supplyMineGame.operationsSinceEvent = 0;
    supplyMineGame.securityAdjust = 0;
    supplyMineGame.riskHits = 0;
    supplyMineGame.resistedHits = 0;
    supplyMineGame.toolsFound = 0;
    supplyMineGame.submitted = false;
    supplyMineGame.intelActive = false;
    supplyMineGame.intelSelections = 0;
    supplyMineGame.falseInfoUntil = 0;
    supplyMineGame.result = null;
    supplyMineGame.lastEvent = {
      title: "排查开始",
      text: "先翻开少量格子获取线索，再用右键标记疑似或确认风险。",
      lesson: "供应链风险判断通常从不完整线索开始。"
    };
    supplyMineGame.seedVersion += 1;

    const country = ensureSupplyMineCountry();
    const metrics = supplyMineCountryMetrics(country);
    const difficulty = selectedMineDifficulty();
    const rng = seededRandom(supplyMineSeed(country));
    const size = difficulty.size;
    const cells = [];
    ["risk", "safe"].forEach((zone) => {
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          cells.push(makeSupplyMineCell(zone, row, col));
        }
      }
    });

    const riskMineCount = Math.min(
      size * size - 2,
      Math.max(3, difficulty.riskMines + Math.round(metrics.dependency * 2 + metrics.vulnerability * 2))
    );
    const safeMineCount = Math.min(
      size * size - 2,
      Math.max(1, difficulty.safeMines + Math.round(metrics.hhi * 1.5))
    );

    ["risk", "safe"].forEach((zone) => {
      const zoneCells = shuffleSupplyMineItems(cells.filter((cell) => cell.zone === zone), rng);
      const mineCount = zone === "risk" ? riskMineCount : safeMineCount;
      zoneCells.slice(0, mineCount).forEach((cell) => {
        cell.mineType = weightedSupplyMineType(zone, metrics, rng);
      });
    });

    const availableSafeCells = shuffleSupplyMineItems(
      cells.filter((cell) => cell.zone === "safe" && !cell.mineType),
      rng
    );
    const tools = SUPPLY_MINE_TOOL_LOADOUTS[supplyMineGame.difficulty] || SUPPLY_MINE_TOOL_LOADOUTS.showcase;
    tools.forEach((toolType, index) => {
      if (availableSafeCells[index]) availableSafeCells[index].toolType = toolType;
    });

    supplyMineGame.cells = cells;
  }

  function findSupplyMineCell(cellId) {
    return supplyMineGame.cells.find((cell) => cell.id === cellId) || null;
  }

  function adjacentSupplyMineCells(cell) {
    return supplyMineGame.cells.filter(
      (item) =>
        item.zone === cell.zone &&
        item.id !== cell.id &&
        Math.abs(item.row - cell.row) <= 1 &&
        Math.abs(item.col - cell.col) <= 1
    );
  }

  function supplyMineHintValue(cell) {
    const base = adjacentSupplyMineCells(cell).filter((item) => item.mineType || item.toolType).length;
    if (Date.now() < supplyMineGame.falseInfoUntil) {
      return Math.max(0, base + ((cell.row + cell.col) % 2 ? 1 : -1));
    }
    return base;
  }

  function consumeSupplyMineTool(toolType) {
    if (!supplyMineGame.tools[toolType]) return false;
    supplyMineGame.tools[toolType] -= 1;
    if (supplyMineGame.tools[toolType] <= 0) delete supplyMineGame.tools[toolType];
    return true;
  }

  function addSupplyMineTool(toolType) {
    supplyMineGame.tools[toolType] = (supplyMineGame.tools[toolType] || 0) + 1;
    supplyMineGame.toolsFound += 1;
  }

  function spawnSupplyMineRisk(zoneHint = "risk") {
    const country = ensureSupplyMineCountry();
    const metrics = supplyMineCountryMetrics(country);
    const rng = seededRandom(supplyMineSeed(country) + supplyMineGame.toolsFound * 431 + supplyMineGame.riskHits * 97);
    const candidates = shuffleSupplyMineItems(
      supplyMineGame.cells.filter((cell) => !cell.revealed && !cell.mark && !cell.mineType && !cell.toolType),
      rng
    );
    const preferred = candidates.find((cell) => cell.zone === zoneHint) || candidates[0];
    if (!preferred) return;
    preferred.mineType = weightedSupplyMineType(preferred.zone, metrics, rng);
  }

  function useSupplyMineDefense(mineType) {
    if (mineType === "breakage" && consumeSupplyMineTool("inventory")) return "库存缓冲仓吸收了断供冲击。";
    if (mineType === "barrier" && consumeSupplyMineTool("express")) return "快速转运港绕开了贸易壁垒。";
    if (consumeSupplyMineTool("diversify")) return "多元化采购卡抵御了一次风险冲击。";
    return "";
  }

  function revealSupplyMineNeighbors(cell, radius = 1) {
    supplyMineGame.cells.forEach((item) => {
      if (
        item.zone === cell.zone &&
        !item.revealed &&
        !item.mark &&
        Math.abs(item.row - cell.row) <= radius &&
        Math.abs(item.col - cell.col) <= radius
      ) {
        item.revealed = true;
      }
    });
  }

  function triggerSupplyMineRisk(cell) {
    const mine = SUPPLY_MINE_TYPES[cell.mineType];
    const defenseText = useSupplyMineDefense(cell.mineType);
    if (defenseText) {
      supplyMineGame.resistedHits += 1;
      supplyMineGame.securityAdjust += 5;
      supplyMineGame.lastEvent = {
        title: `${mine.label}已被抵御`,
        text: defenseText,
        lesson: mine.lesson
      };
      return;
    }

    supplyMineGame.riskHits += 1;
    const country = ensureSupplyMineCountry();
    const metrics = supplyMineCountryMetrics(country);
    const penalty = Math.round(5 + metrics.vulnerability * 8 + selectedMineCargo().riskSensitivity * 2);
    supplyMineGame.securityAdjust -= penalty;

    if (cell.mineType === "barrier") {
      revealSupplyMineNeighbors(cell, selectedMineYear() === 2020 ? 2 : 1);
    }
    if (cell.mineType === "breakage") {
      supplyMineGame.securityAdjust -= 4;
    }
    if (cell.mineType === "fx") {
      const revealed = supplyMineGame.cells.filter((item) => item.revealed && !item.mineType);
      revealed.slice(0, 4).forEach((item) => {
        item.revealed = false;
      });
    }
    if (cell.mineType === "geopolitics") {
      supplyMineGame.cells.forEach((item) => {
        if (item.mark) item.mark = item.mark === 1 ? 2 : 0;
      });
    }
    if (cell.mineType === "compliance") {
      const heldTool = Object.keys(supplyMineGame.tools)[0];
      if (heldTool) consumeSupplyMineTool(heldTool);
    }
    if (cell.mineType === "falseInfo") {
      supplyMineGame.falseInfoUntil = Date.now() + 10000;
      window.setTimeout(() => {
        if (activePrimarySection() === "game") renderProcurementGame();
      }, 10200);
    }

    supplyMineGame.lastEvent = {
      title: mine.label,
      text: `风险被触发，供应链安全指数下降 ${penalty} 点。`,
      lesson: mine.lesson
    };
  }

  function countSupplyMineOperations() {
    if (supplyMineGame.submitted) return;
    supplyMineGame.operationsSinceEvent += 1;
    if (supplyMineGame.operationsSinceEvent >= selectedMineDifficulty().eventEvery) {
      supplyMineGame.operationsSinceEvent = 0;
      triggerSupplyMineGlobalEvent();
    }
  }

  function revealSupplyMineCell(cellId) {
    const cell = findSupplyMineCell(cellId);
    if (!cell || cell.revealed || cell.mark || supplyMineGame.submitted) return;
    if (supplyMineGame.intelActive) {
      cell.peek = true;
      supplyMineGame.intelSelections += 1;
      if (supplyMineGame.intelSelections >= 3) supplyMineGame.intelActive = false;
      window.setTimeout(() => {
        cell.peek = false;
        if (activePrimarySection() === "game") renderProcurementGame();
      }, 5000);
      supplyMineGame.lastEvent = {
        title: "情报分析",
        text: "该节点已短暂显示真实内容，请在 5 秒内完成判断。",
        lesson: "情报能降低不确定性，但窗口期有限。"
      };
      renderProcurementGame();
      return;
    }

    cell.revealed = true;
    if (cell.mineType) {
      triggerSupplyMineRisk(cell);
    } else if (cell.toolType) {
      const tool = SUPPLY_MINE_TOOLS[cell.toolType];
      addSupplyMineTool(cell.toolType);
      spawnSupplyMineRisk(cell.zone === "safe" ? "safe" : "risk");
      supplyMineGame.securityAdjust += 3;
      supplyMineGame.lastEvent = {
        title: `获得${tool.label}`,
        text: `${tool.desc} 同时，场上新增了一个潜在风险点。`,
        lesson: "风险管理能力提升的同时，新的风险也可能滋生。"
      };
    } else {
      const hint = supplyMineHintValue(cell);
      supplyMineGame.lastEvent = {
        title: hint ? `发现线索 ${hint}` : "安全空白区",
        text: hint ? `周围 8 格中共有 ${hint} 个风险或工具节点。` : "周围暂未发现风险或工具，可以继续扩大排查。",
        lesson: "数字线索不区分风险和工具，必须结合周围格子推理。"
      };
    }
    countSupplyMineOperations();
    renderProcurementGame();
  }

  function toggleSupplyMineMark(cellId) {
    const cell = findSupplyMineCell(cellId);
    if (!cell || cell.revealed || supplyMineGame.submitted) return;
    cell.mark = (cell.mark + 1) % 3;
    supplyMineGame.lastEvent = {
      title: cell.mark === 1 ? "疑似风险标记" : cell.mark === 2 ? "确认风险标记" : "取消标记",
      text:
        cell.mark === 1
          ? "疑似标记更稳，但单靠疑似无法获得足够安全指数。"
          : cell.mark === 2
            ? "确认标记收益更高，错误判断的代价也更大。"
            : "重新开放该节点，可继续翻开或重新判断。",
      lesson: "风险评估既要看线索，也要决定判断的置信度。"
    };
    countSupplyMineOperations();
    renderProcurementGame();
  }

  function activateSupplyMineIntel() {
    if (supplyMineGame.submitted) return;
    if (!consumeSupplyMineTool("intel")) {
      supplyMineGame.lastEvent = {
        title: "缺少情报分析器",
        text: "需要先在防御资源区翻到“情报分析器”，才能主动揭示未知节点。",
        lesson: "没有情报工具时，供应链判断只能依赖有限线索。"
      };
      return;
    }
    supplyMineGame.intelActive = true;
    supplyMineGame.intelSelections = 0;
    supplyMineGame.lastEvent = {
      title: "情报分析器已启动",
      text: "接下来点击 3 个未知格子，可短暂查看它们的真实内容。",
      lesson: "情报收集能减少误判，但资源有限。"
    };
  }

  function triggerSupplyMineGlobalEvent() {
    const year = selectedMineYear();
    const country = ensureSupplyMineCountry();
    const metrics = supplyMineCountryMetrics(country);
    const rng = seededRandom(supplyMineSeed(country) + supplyMineGame.operationsSinceEvent * 97 + supplyMineGame.toolsFound * 131);
    const pool = [
      { type: "market", title: "市场波动", text: "价格和需求变化让安全指数出现波动。", tool: "shield", adjust: rng() > 0.5 ? 6 : -8 },
      { type: "shipping", title: "航运危机", text: "港口拥堵影响排查节奏，备用通道可以抵御。", tool: "express", adjust: -8 },
      { type: "trade", title: "贸易摩擦升级", text: "贸易限制扩散，高依赖国家更容易暴露风险。", tool: "diversify", adjust: -Math.round(6 + metrics.dependency * 8) }
    ];
    if (year === 2020) pool.push({ type: "pandemic", title: "疫情冲击", text: "系统性冲击清空部分防御工具。", tool: "", adjust: -12 });
    if (year === 2018) pool.push({ type: "trade", title: "贸易战升级", text: "风险区新增一个贸易相关风险点。", tool: "diversify", adjust: -10 });
    if (year === 2024) pool.push({ type: "rebuild", title: "供应链重组审查", text: "来源过度集中会被放大检视。", tool: "inventory", adjust: -Math.round(5 + metrics.hhi * 8) });
    const event = pool[Math.floor(rng() * pool.length)];

    if (event.type === "pandemic") {
      supplyMineGame.tools = {};
      supplyMineGame.securityAdjust += event.adjust;
      supplyMineGame.lastEvent = {
        title: event.title,
        text: `${event.text} 这是难以完全抵御的系统性冲击。`,
        lesson: "疫情类风险说明：供应链韧性不能只靠单一道具。"
      };
      return;
    }

    if (event.tool && consumeSupplyMineTool(event.tool)) {
      supplyMineGame.resistedHits += 1;
      supplyMineGame.securityAdjust += 4;
      supplyMineGame.lastEvent = {
        title: `${event.title}已被抵御`,
        text: `${SUPPLY_MINE_TOOLS[event.tool].label} 抵消了本次全球事件。`,
        lesson: SUPPLY_MINE_TOOLS[event.tool].desc
      };
      return;
    }

    supplyMineGame.securityAdjust += event.adjust;
    if (event.type === "trade" || event.type === "rebuild") spawnSupplyMineRisk("risk");
    if (event.type === "shipping") {
      const unrevealed = supplyMineGame.cells.filter((cell) => !cell.revealed && !cell.mark);
      unrevealed.slice(0, 3).forEach((cell) => {
        cell.peek = true;
      });
      window.setTimeout(() => {
        unrevealed.slice(0, 3).forEach((cell) => {
          cell.peek = false;
        });
        if (activePrimarySection() === "game") renderProcurementGame();
      }, 1800);
    }
    supplyMineGame.lastEvent = {
      title: event.title,
      text: `${event.text} 安全指数${event.adjust >= 0 ? "上升" : "下降"} ${Math.abs(event.adjust)} 点。`,
      lesson: "外部冲击会改变原本看似稳定的供应链判断。"
    };
  }

  function supplyMineStats() {
    const cells = supplyMineGame.cells;
    const revealed = cells.filter((cell) => cell.revealed).length;
    const suspect = cells.filter((cell) => cell.mark === 1).length;
    const confirm = cells.filter((cell) => cell.mark === 2).length;
    const targets = cells.filter((cell) => cell.mineType || cell.toolType).length;
    const safeCells = cells.filter((cell) => !cell.mineType);
    const revealedSafe = safeCells.filter((cell) => cell.revealed).length;
    const markProgress = suspect * 5 + confirm * 10;
    const provisional = Math.round(
      markProgress +
        (safeCells.length ? (revealedSafe / safeCells.length) * 20 : 0) +
        supplyMineGame.toolsFound * 3 +
        supplyMineGame.resistedHits * 4 +
        supplyMineGame.securityAdjust -
        supplyMineGame.riskHits * 4
    );
    return {
      revealed,
      suspect,
      confirm,
      targets,
      safeCells: safeCells.length,
      revealedSafe,
      markProgress,
      security: Math.max(0, Math.min(100, provisional))
    };
  }

  function submitSupplyMineAssessment() {
    if (supplyMineGame.submitted) return;
    const stats = supplyMineStats();
    const marked = supplyMineGame.cells.filter((cell) => cell.mark);
    const correct = marked.filter((cell) => cell.mineType || cell.toolType);
    const wrong = marked.filter((cell) => !cell.mineType && !cell.toolType);
    const hasShield = Boolean(supplyMineGame.tools.shield);
    const wrongPenalty = wrong.reduce((sum, cell) => sum + (cell.mark === 2 ? 20 : 10), 0) * (hasShield ? 0.5 : 1);
    const finalScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          stats.markProgress +
            (stats.safeCells ? (stats.revealedSafe / stats.safeCells) * 20 : 0) +
            supplyMineGame.toolsFound * 4 +
            supplyMineGame.resistedHits * 5 +
            supplyMineGame.securityAdjust -
            supplyMineGame.riskHits * 3 -
            wrongPenalty
        )
      )
    );
    const accuracy = marked.length ? Math.round((correct.length / marked.length) * 100) : 0;
    const title =
      finalScore >= 90
        ? "精准风险分析师"
        : finalScore >= 75
          ? "稳健供应链排查"
          : finalScore >= 60
            ? "发现风险但仍有遗漏"
            : "风险评估需要复盘";
    supplyMineGame.submitted = true;
    supplyMineGame.result = {
      score: finalScore,
      success: finalScore >= 75,
      title,
      correct: correct.length,
      wrong: wrong.length,
      marked: marked.length,
      accuracy
    };
    supplyMineGame.lastEvent = {
      title: "评估报告已提交",
      text: `${title}：识别 ${correct.length}/${stats.targets} 个关键节点，标记准确率 ${accuracy}%。`,
      lesson: "供应链风险评估的价值在于把线索、置信度和防御工具组合成可解释判断。"
    };
  }

  function renderSupplyMineControls(country) {
    const countries = state.bundle.countries.slice().sort(sortCountriesForDisplay);
    if (DOM.mineCountrySelect) {
      DOM.mineCountrySelect.innerHTML = countries
        .map((item) => `<option value="${escapeHtml(countryIso3(item))}">${escapeHtml(countryDisplayLabel(item))}</option>`)
        .join("");
      DOM.mineCountrySelect.value = supplyMineGame.countryIso3;
    }
    if (DOM.mineYearSelect) {
      DOM.mineYearSelect.innerHTML = Object.entries(SUPPLY_MAZE_YEARS)
        .map(([year, item]) => `<option value="${year}">${escapeHtml(item.label)}</option>`)
        .join("");
      DOM.mineYearSelect.value = String(selectedMineYear());
    }
    if (DOM.mineCargoSelect) {
      DOM.mineCargoSelect.innerHTML = Object.entries(SUPPLY_MAZE_CARGO)
        .map(([id, item]) => `<option value="${id}">${escapeHtml(item.label)}</option>`)
        .join("");
      DOM.mineCargoSelect.value = supplyMineGame.cargoId;
    }
    if (DOM.mineDifficultySelect) DOM.mineDifficultySelect.value = supplyMineGame.difficulty;

    const metrics = supplyMineCountryMetrics(country);
    const cargo = selectedMineCargo();
    const yearConfig = SUPPLY_MAZE_YEARS[selectedMineYear()] || SUPPLY_MAZE_YEARS[2024];
    setText("mineDependency", metrics.dependency.toFixed(2));
    setText("mineConcentration", metrics.hhi.toFixed(2));
    setText("mineVulnerability", metrics.vulnerability.toFixed(2));
    setText("mineTargetCount", supplyMineStats().targets);
    if (DOM.mineMissionText) {
      DOM.mineMissionText.textContent = `${countryIso3(country)} / ${countryChineseName(country)}：排查“${cargo.label}”供应链风险，提交前请区分疑似与确认标记。`;
    }
    if (DOM.mineContextText) {
      DOM.mineContextText.textContent = `${yearConfig.description} ${cargo.note} 当前目标市场综合风险 ${metrics.vulnerability.toFixed(
        2
      )}，风险越高，误判和踩雷的代价越大。`;
    }
  }

  function renderSupplyMineCell(cell) {
    const revealed = cell.revealed || cell.peek || supplyMineGame.submitted;
    const classes = [
      "mine-cell",
      cell.revealed ? "is-revealed" : "",
      cell.peek ? "is-peek" : "",
      cell.mark === 1 ? "is-suspect" : "",
      cell.mark === 2 ? "is-confirmed" : "",
      revealed && cell.mineType ? "is-risk" : "",
      revealed && cell.toolType && !cell.mineType ? "is-tool" : ""
    ]
      .filter(Boolean)
      .join(" ");
    let content = "";
    if (!revealed && cell.mark === 1) content = "?";
    if (!revealed && cell.mark === 2) content = "险";
    if (revealed && cell.mineType) {
      const mine = SUPPLY_MINE_TYPES[cell.mineType];
      content = `<span class="${escapeHtml(mine.className)}">${escapeHtml(mine.icon)}</span>`;
    } else if (revealed && cell.toolType) {
      const tool = SUPPLY_MINE_TOOLS[cell.toolType];
      content = `<span class="${escapeHtml(tool.className)}">${escapeHtml(tool.icon)}</span>`;
    } else if (revealed) {
      const hint = supplyMineHintValue(cell);
      content = hint ? `<span class="mine-number mine-number-${Math.min(6, hint)}">${hint}</span>` : "";
    }
    return `
      <button type="button" class="${classes}" data-mine-id="${escapeHtml(cell.id)}" title="${escapeHtml(cell.id)}">
        ${content}
      </button>
    `;
  }

  function renderSupplyMineBoards() {
    const difficulty = selectedMineDifficulty();
    [DOM.mineRiskBoard, DOM.mineSafeBoard].forEach((board) => {
      if (board) board.style.setProperty("--mine-size", String(difficulty.size));
    });
    if (DOM.mineRiskBoard) {
      DOM.mineRiskBoard.innerHTML = supplyMineGame.cells
        .filter((cell) => cell.zone === "risk")
        .map(renderSupplyMineCell)
        .join("");
    }
    if (DOM.mineSafeBoard) {
      DOM.mineSafeBoard.innerHTML = supplyMineGame.cells
        .filter((cell) => cell.zone === "safe")
        .map(renderSupplyMineCell)
        .join("");
    }
  }

  function renderSupplyMineDashboard() {
    const stats = supplyMineStats();
    const score = supplyMineGame.result?.score ?? stats.security;
    setText("mineSecurityScore", `${score}%`);
    setText("mineRevealedCount", stats.revealed);
    setText("mineSuspectCount", stats.suspect);
    setText("mineConfirmCount", stats.confirm);
    setText("mineHitCount", supplyMineGame.riskHits);
    if (DOM.mineScoreText) {
      DOM.mineScoreText.textContent = supplyMineGame.submitted
        ? `${supplyMineGame.result.title}：标记准确率 ${supplyMineGame.result.accuracy}%`
        : "安全指数会随翻格、标记、道具和突发事件实时变化。";
    }
    if (DOM.mineStatusText) {
      DOM.mineStatusText.textContent = supplyMineGame.intelActive
        ? `情报分析中：还可查看 ${Math.max(0, 3 - supplyMineGame.intelSelections)} 个未知节点`
        : supplyMineGame.submitted
          ? "评估已提交，可重新开局再次挑战"
          : "左键翻开，右键标记：疑似风险 → 确认风险 → 清空";
    }
    if (DOM.mineToolRack) {
      const entries = Object.entries(SUPPLY_MINE_TOOLS);
      DOM.mineToolRack.innerHTML = entries
        .map(([id, tool]) => {
          const count = supplyMineGame.tools[id] || 0;
          return `<span class="${count ? "has-tool" : ""}" title="${escapeHtml(tool.desc)}">${escapeHtml(tool.icon)} ${escapeHtml(
            tool.label
          )} ×${count}</span>`;
        })
        .join("");
    }
    if (DOM.mineIntelButton) {
      DOM.mineIntelButton.disabled = supplyMineGame.submitted || supplyMineGame.intelActive || !supplyMineGame.tools.intel;
      DOM.mineIntelButton.textContent = supplyMineGame.intelActive ? "情报分析中" : "使用情报分析器";
    }
    if (DOM.mineEventCard) {
      const event = supplyMineGame.lastEvent;
      DOM.mineEventCard.innerHTML = event
        ? `<strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.text)}</p><small>${escapeHtml(event.lesson || "")}</small>`
        : "<strong>风险事件</strong><p>翻开或标记一定数量格子后，会触发一次全球供应链事件。</p>";
    }
    if (DOM.mineResultCard) {
      const result = supplyMineGame.result;
      DOM.mineResultCard.innerHTML = result
        ? `
          <strong>${escapeHtml(result.success ? "排查成功" : "排查未完成")}</strong>
          <p>${escapeHtml(result.title)}：识别 ${result.correct}/${stats.targets} 个关键节点，错误标记 ${result.wrong} 个。</p>
        `
        : "<strong>等待提交</strong><p>不要只追求翻得快，确认标记越多，收益和风险都越高。</p>";
    }
  }

  function renderSupplyMineGame() {
    if (!state.bundle) return;
    const country = ensureSupplyMineCountry();
    if (!country) return;
    if (!SUPPLY_MINE_DIFFICULTIES[supplyMineGame.difficulty]) supplyMineGame.difficulty = "showcase";
    if (!SUPPLY_MAZE_CARGO[supplyMineGame.cargoId]) supplyMineGame.cargoId = "electronics";
    supplyMineGame.year = selectedMineYear();
    if (!supplyMineGame.cells.length) {
      resetSupplyMineGame({ preserveSelection: true });
    }
    renderSupplyMineControls(country);
    renderSupplyMineBoards();
    renderSupplyMineDashboard();
  }

  function towerCellKey(row, col) {
    return `${row}-${col}`;
  }

  function supplyDefenseSeed(country) {
    const iso = countryIso3(country) || "USA";
    return (
      String(iso)
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) +
      Number(supplyDefenseGame.year || 2024) * 29 +
      String(supplyDefenseGame.cargoId || "electronics").length * 113 +
      supplyDefenseGame.wave * 997
    );
  }

  function selectedDefenseCargo() {
    return SUPPLY_MAZE_CARGO[supplyDefenseGame.cargoId] || SUPPLY_MAZE_CARGO.electronics;
  }

  function selectedDefenseYear() {
    const year = Number(supplyDefenseGame.year || state.year || 2024);
    return SUPPLY_MAZE_YEARS[year] ? year : 2024;
  }

  function ensureSupplyDefenseCountry() {
    if (!state.bundle?.countries?.length) return null;
    const candidates = [
      supplyDefenseGame.countryIso3,
      state.selectedCountry,
      "USA",
      rankedCountries()[0]?.iso3,
      state.bundle.countries[0]?.iso3
    ].filter(Boolean);
    const iso3 = candidates.find((item) => findCountry(item));
    supplyDefenseGame.countryIso3 = iso3 || state.bundle.countries[0]?.iso3 || "";
    return findCountry(supplyDefenseGame.countryIso3);
  }

  function supplyDefenseCountryMetrics(country) {
    const scoped = countryScopeMetrics(country, "manufactures");
    return {
      dependency: clamp01(scoped.dependency || scoped.cdi || country?.cdi || 0),
      hhi: clamp01(scoped.hhi || country?.hhi || 0),
      vulnerability: clamp01(scoped.vulnerability || country?.vulnerability || 0)
    };
  }

  function stopSupplyDefenseTimer() {
    if (supplyDefenseGame.timer) {
      window.clearInterval(supplyDefenseGame.timer);
      supplyDefenseGame.timer = null;
    }
    supplyDefenseGame.running = false;
  }

  function initSupplyDefenseGame({ preserveSelection = false } = {}) {
    const countryIso3Value = preserveSelection ? supplyDefenseGame.countryIso3 : "";
    const yearValue = preserveSelection ? selectedDefenseYear() : Number(state.year || 2024);
    const cargoValue = preserveSelection ? supplyDefenseGame.cargoId : "electronics";
    stopSupplyDefenseTimer();
    supplyDefenseGame.countryIso3 = countryIso3Value;
    supplyDefenseGame.year = SUPPLY_MAZE_YEARS[yearValue] ? yearValue : 2024;
    supplyDefenseGame.cargoId = SUPPLY_MAZE_CARGO[cargoValue] ? cargoValue : "electronics";
    supplyDefenseGame.budget = 100;
    supplyDefenseGame.wave = 0;
    supplyDefenseGame.orders = [];
    supplyDefenseGame.nodes = [];
    supplyDefenseGame.riskZones = new Set();
    supplyDefenseGame.selectedTowerType = supplyDefenseGame.selectedTowerType || "china";
    supplyDefenseGame.completed = false;
    supplyDefenseGame.tick = 0;
    supplyDefenseGame.score = 0;
    supplyDefenseGame.lastEvent = null;
    supplyDefenseGame.insight = null;
    supplyDefenseGame.metrics = {
      totalOrders: 0,
      delivered: 0,
      onTime: 0,
      failed: 0,
      costPressure: 0,
      exposure: 0,
      stability: 82
    };
  }

  function generateSupplyRiskZones(country, wave) {
    const yearConfig = SUPPLY_MAZE_YEARS[selectedDefenseYear()] || SUPPLY_MAZE_YEARS[2024];
    const metrics = supplyDefenseCountryMetrics(country);
    const rng = seededRandom(supplyDefenseSeed(country) + wave * 53);
    const allPathKeys = Array.from(
      new Set(
        SUPPLY_DEFENSE_PATHS.flatMap((path) =>
          path
            .slice(2, -2)
            .map(([row, col]) => towerCellKey(row, col))
        )
      )
    );
    const riskCount = Math.min(
      allPathKeys.length,
      Math.max(2, Math.round(2 + wave + metrics.vulnerability * 3 + yearConfig.riskCount * 0.18))
    );
    return new Set(
      allPathKeys
        .map((key) => ({ key, score: rng() }))
        .sort((a, b) => a.score - b.score)
        .slice(0, riskCount)
        .map((item) => item.key)
    );
  }

  function spawnSupplyOrders(country, wave) {
    const cargo = selectedDefenseCargo();
    const metrics = supplyDefenseCountryMetrics(country);
    const count = [4, 6, 8][Math.max(0, wave - 1)] || 4;
    const deadline = Math.max(14, Math.round(cargo.deadline * 0.48 + wave * 2 - cargo.routeAgility * 2));
    const orders = Array.from({ length: count }, (_, index) => ({
      id: `${wave}-${index}`,
      pathIndex: index % SUPPLY_DEFENSE_PATHS.length,
      progress: -index * 0.78,
      age: 0,
      speed: 0.28 * Number(cargo.routeAgility || 1),
      deadline,
      risk: metrics.vulnerability * 10,
      status: "moving",
      hitRisk: false
    }));
    supplyDefenseGame.metrics.totalOrders += count;
    supplyDefenseGame.orders = orders;
  }

  function startSupplyDefenseWave() {
    if (!state.bundle || supplyDefenseGame.running || supplyDefenseGame.completed) return;
    const country = ensureSupplyDefenseCountry();
    if (!country) return;
    if (supplyDefenseGame.wave >= 3) {
      supplyDefenseGame.completed = true;
      calculateSupplyDefenseScore();
      renderProcurementGame();
      return;
    }
    supplyDefenseGame.wave += 1;
    supplyDefenseGame.tick = 0;
    supplyDefenseGame.riskZones = generateSupplyRiskZones(country, supplyDefenseGame.wave);
    spawnSupplyOrders(country, supplyDefenseGame.wave);
    supplyDefenseGame.lastEvent = {
      title: `第 ${supplyDefenseGame.wave} 波订单出发`,
      text: "订单沿多条航线前进，红色区域代表本轮风险冲击点。",
      lesson: "先观察风险区，再决定是否补库存、替代供应或快速转运。"
    };
    supplyDefenseGame.running = true;
    renderProcurementGame();
    supplyDefenseGame.timer = window.setInterval(advanceSupplyOrders, 520);
  }

  function towerNodesNear(row, col) {
    return supplyDefenseGame.nodes.filter((node) => {
      const distance = Math.abs(node.row - row) + Math.abs(node.col - col);
      return distance <= 1;
    });
  }

  function applyTowerEffects(order, row, col) {
    const cargo = selectedDefenseCargo();
    const nearNodes = towerNodesNear(row, col);
    let speedBoost = 0;
    let protectedByBuffer = false;
    nearNodes.forEach((node) => {
      if (node.type === "china") {
        speedBoost += 0.1;
        supplyDefenseGame.metrics.costPressure = Math.max(0, supplyDefenseGame.metrics.costPressure - 0.24);
        supplyDefenseGame.metrics.exposure += 0.42 * Number(cargo.chinaRisk || 1);
      }
      if (node.type === "alt") {
        speedBoost -= 0.02;
        supplyDefenseGame.metrics.costPressure += 0.34;
        supplyDefenseGame.metrics.exposure = Math.max(0, supplyDefenseGame.metrics.exposure - 0.46);
        supplyDefenseGame.metrics.stability += 0.12;
      }
      if (node.type === "inventory") {
        protectedByBuffer = true;
        supplyDefenseGame.metrics.costPressure += 0.26;
        supplyDefenseGame.metrics.stability += 0.2;
      }
      if (node.type === "express") {
        speedBoost += 0.16;
        supplyDefenseGame.metrics.costPressure += 0.52;
      }
    });
    return { speedBoost, protectedByBuffer };
  }

  function orderCell(order) {
    const path = SUPPLY_DEFENSE_PATHS[order.pathIndex] || SUPPLY_DEFENSE_PATHS[0];
    const index = Math.max(0, Math.min(path.length - 1, Math.floor(order.progress)));
    return path[index] || path[0];
  }

  function advanceSupplyOrders() {
    if (!supplyDefenseGame.running) return;
    const country = ensureSupplyDefenseCountry();
    const yearConfig = SUPPLY_MAZE_YEARS[selectedDefenseYear()] || SUPPLY_MAZE_YEARS[2024];
    const cargo = selectedDefenseCargo();
    supplyDefenseGame.tick += 1;

    supplyDefenseGame.orders.forEach((order) => {
      if (order.status !== "moving") return;
      order.age += 1;
      if (order.progress < 0) {
        order.progress += 0.36;
        return;
      }
      const [row, col] = orderCell(order);
      const effects = applyTowerEffects(order, row, col);
      const key = towerCellKey(row, col);
      if (supplyDefenseGame.riskZones.has(key)) {
        order.hitRisk = true;
        if (effects.protectedByBuffer) {
          order.risk += 2 * Number(cargo.riskSensitivity || 1);
          supplyDefenseGame.metrics.stability += 0.4;
        } else {
          order.risk += 9 * Number(yearConfig.riskBoost || 1) * Number(cargo.riskSensitivity || 1);
          supplyDefenseGame.metrics.costPressure += 1.2;
          supplyDefenseGame.metrics.stability -= 1.4;
        }
      }
      order.progress += Math.max(0.12, Math.min(0.58, order.speed + effects.speedBoost));
      supplyDefenseGame.metrics.costPressure += Number(cargo.stepCost || 3) * 0.04;

      const path = SUPPLY_DEFENSE_PATHS[order.pathIndex] || SUPPLY_DEFENSE_PATHS[0];
      if (order.risk > 48) {
        order.status = "failed";
        supplyDefenseGame.metrics.failed += 1;
      } else if (order.age > order.deadline + 8) {
        order.status = "failed";
        supplyDefenseGame.metrics.failed += 1;
      } else if (order.progress >= path.length - 1) {
        order.status = "delivered";
        supplyDefenseGame.metrics.delivered += 1;
        if (order.age <= order.deadline) supplyDefenseGame.metrics.onTime += 1;
      }
    });

    const active = supplyDefenseGame.orders.some((order) => order.status === "moving");
    if (!active) {
      stopSupplyDefenseTimer();
      triggerSupplyRiskEvent(country);
      if (supplyDefenseGame.wave >= 3) {
        supplyDefenseGame.completed = true;
        calculateSupplyDefenseScore();
      }
    }
    renderProcurementGame();
  }

  function triggerSupplyRiskEvent(country) {
    const year = selectedDefenseYear();
    const cargo = selectedDefenseCargo();
    const metrics = supplyDefenseCountryMetrics(country);
    const rng = seededRandom(supplyDefenseSeed(country) + supplyDefenseGame.wave * 211);
    const inventoryCount = supplyDefenseGame.nodes.filter((node) => node.type === "inventory").length;
    const altCount = supplyDefenseGame.nodes.filter((node) => node.type === "alt").length;
    const chinaCount = supplyDefenseGame.nodes.filter((node) => node.type === "china").length;
    const eventPool = [
      {
        title: "港口拥堵",
        text: "部分航线排队，快速转运港和库存缓冲能吸收延误。",
        cost: 4,
        exposure: 2,
        stability: inventoryCount || cargo === SUPPLY_MAZE_CARGO.transport ? 3 : -7,
        lesson: "物流节点会让低成本路线变慢，运输设备尤其敏感。"
      },
      {
        title: "替代供应认证延迟",
        text: "新供应源需要质量认证，多元化也有时间和管理成本。",
        cost: altCount ? 6 : 2,
        exposure: altCount ? -5 : 3,
        stability: altCount ? 1 : -6,
        lesson: "替代供应能降风险，但必须提前建设，临时切换并不轻松。"
      },
      {
        title: "中国制造产能释放",
        text: "主供应源恢复产能，交付效率提升，但集中暴露会继续累积。",
        cost: -5,
        exposure: chinaCount ? 7 : 2,
        stability: chinaCount ? 4 : 0,
        lesson: "中国制造效率优势明显，但高效率和高集中度需要平衡。"
      }
    ];
    if (year === 2018) {
      eventPool.push({
        title: "贸易摩擦升级",
        text: "政策不确定性抬高成本，依赖度越高冲击越明显。",
        cost: 8 + metrics.dependency * 8,
        exposure: 8 + metrics.dependency * 10,
        stability: altCount ? 2 : -10,
        lesson: "贸易摩擦下，单一来源方案缺少调整空间。"
      });
    }
    if (year === 2020) {
      eventPool.push({
        title: "疫情冲击物流",
        text: "港口、仓储和排产同时承压，库存缓冲价值上升。",
        cost: 7,
        exposure: 6,
        stability: inventoryCount ? 8 : -14,
        lesson: "疫情类冲击会同时影响时间与稳定性，库存能换来韧性。"
      });
    }
    if (year === 2024) {
      eventPool.push({
        title: "供应链重组检查",
        text: "客户要求供应来源更可解释，替代供应和库存组合会加分。",
        cost: 5,
        exposure: chinaCount >= 2 ? 10 : 4,
        stability: altCount + inventoryCount >= 2 ? 10 : -8,
        lesson: "供应链重组不是不要效率，而是让风险结构更可解释。"
      });
    }
    const event = eventPool[Math.floor(rng() * eventPool.length)];
    supplyDefenseGame.metrics.costPressure = Math.max(0, supplyDefenseGame.metrics.costPressure + event.cost);
    supplyDefenseGame.metrics.exposure = Math.max(0, supplyDefenseGame.metrics.exposure + event.exposure);
    supplyDefenseGame.metrics.stability = Math.max(
      0,
      Math.min(100, supplyDefenseGame.metrics.stability + event.stability)
    );
    supplyDefenseGame.lastEvent = event;
    renderSupplyDefenseInsight(event);
  }

  function placeSupplyTower(cellKey, type) {
    if (!cellKey || supplyDefenseGame.running || supplyDefenseGame.completed) return;
    if (!SUPPLY_DEFENSE_BUILD_CELLS.has(cellKey)) return;
    if (supplyDefenseGame.nodes.some((node) => node.key === cellKey)) return;
    const tower = SUPPLY_DEFENSE_TOWER_TYPES[type] || SUPPLY_DEFENSE_TOWER_TYPES.china;
    if (supplyDefenseGame.budget < tower.cost) {
      supplyDefenseGame.lastEvent = {
        title: "预算不足",
        text: `建造 ${tower.label} 需要 ${tower.cost} 预算。`,
        lesson: "供应链韧性需要投入，预算约束会迫使策略取舍。"
      };
      renderProcurementGame();
      return;
    }
    const [row, col] = cellKey.split("-").map(Number);
    supplyDefenseGame.nodes.push({ key: cellKey, row, col, type });
    supplyDefenseGame.budget -= tower.cost;
    supplyDefenseGame.lastEvent = {
      title: "防线节点已部署",
      text: `${tower.label} 已放置到航线附近。`,
      lesson: tower.desc
    };
    renderProcurementGame();
  }

  function calculateSupplyDefenseScore() {
    const metrics = supplyDefenseGame.metrics;
    const total = Math.max(1, metrics.totalOrders);
    const deliveryRate = metrics.delivered / total;
    const onTimeRate = metrics.delivered ? metrics.onTime / metrics.delivered : 0;
    const costScore = Math.max(0, 1 - metrics.costPressure / 90);
    const exposureScore = Math.max(0, 1 - metrics.exposure / 85);
    const stabilityScore = clamp01(metrics.stability / 100);
    const score = Math.round(
      deliveryRate * 40 + onTimeRate * 20 + costScore * 15 + exposureScore * 15 + stabilityScore * 10
    );
    supplyDefenseGame.score = Math.max(0, Math.min(100, score));
    const label =
      score >= 90
        ? "韧性网络"
        : score >= 75
          ? "均衡防线"
          : score >= 60
            ? "高效但有隐患"
            : "供应链失守";
    supplyDefenseGame.insight = {
      title: label,
      text:
        score >= 75
          ? "你的方案在效率和韧性之间取得了较好平衡。"
          : "这次方案暴露了成本、集中依赖或交付稳定性的短板。",
      lesson: "真实供应链决策不是只追求最短路径，而是在成本、时间、依赖和稳定之间寻找可解释的平衡。"
    };
    return supplyDefenseGame.score;
  }

  function renderSupplyDefenseInsight(event = supplyDefenseGame.lastEvent) {
    if (!event) return;
    const metrics = supplyDefenseGame.metrics;
    const delivered = metrics.delivered;
    const failed = metrics.failed;
    supplyDefenseGame.insight = {
      title: delivered >= failed ? "本轮防线保持运转" : "本轮风险穿透防线",
      text:
        delivered >= failed
          ? "订单多数完成交付，说明当前节点组合能吸收一部分风险。"
          : "失败订单偏多，说明路线过度暴露或缓冲节点不足。",
      lesson: event.lesson
    };
  }

  function renderSupplyDefenseShop() {
    if (!DOM.towerShop) return;
    DOM.towerShop.innerHTML = Object.entries(SUPPLY_DEFENSE_TOWER_TYPES)
      .map(([id, tower]) => {
        const active = id === supplyDefenseGame.selectedTowerType ? " is-active" : "";
        const disabled = supplyDefenseGame.running || supplyDefenseGame.budget < tower.cost ? " is-disabled" : "";
        return `
          <button type="button" class="tower-shop-item${active}${disabled}" data-tower-type="${id}">
            <span class="tower-shop-icon ${escapeHtml(tower.className)}">${escapeHtml(tower.short)}</span>
            <strong>${escapeHtml(tower.label)}</strong>
            <em>${tower.cost} 预算</em>
            <small>${escapeHtml(tower.desc)}</small>
          </button>
        `;
      })
      .join("");
  }

  function renderSupplyDefenseBoard() {
    const root = DOM.towerBoard;
    if (!root) return;
    const pathKeys = new Set(
      SUPPLY_DEFENSE_PATHS.flatMap((path) => path.map(([row, col]) => towerCellKey(row, col)))
    );
    const orderGroups = new Map();
    supplyDefenseGame.orders.forEach((order) => {
      if (order.status !== "moving" || order.progress < 0) return;
      const [row, col] = orderCell(order);
      const key = towerCellKey(row, col);
      orderGroups.set(key, [...(orderGroups.get(key) || []), order]);
    });
    const nodeByKey = new Map(supplyDefenseGame.nodes.map((node) => [node.key, node]));
    const cells = [];
    for (let row = 0; row < SUPPLY_DEFENSE_GRID.rows; row += 1) {
      for (let col = 0; col < SUPPLY_DEFENSE_GRID.cols; col += 1) {
        const key = towerCellKey(row, col);
        const node = nodeByKey.get(key);
        const orders = orderGroups.get(key) || [];
        const classes = [
          "tower-cell",
          pathKeys.has(key) ? "is-path" : "",
          SUPPLY_DEFENSE_BUILD_CELLS.has(key) ? "is-buildable" : "",
          supplyDefenseGame.riskZones.has(key) ? "is-risk" : "",
          key === "3-0" ? "is-source" : "",
          key === "3-11" ? "is-target" : "",
          node ? "has-node" : ""
        ]
          .filter(Boolean)
          .join(" ");
        const nodeHtml = node
          ? `<span class="tower-node ${escapeHtml(SUPPLY_DEFENSE_TOWER_TYPES[node.type].className)}">${escapeHtml(
              SUPPLY_DEFENSE_TOWER_TYPES[node.type].short
            )}</span>`
          : "";
        const orderHtml = orders
          .slice(0, 3)
          .map((order, index) => `<span class="tower-order" style="--order-index:${index}"></span>`)
          .join("");
        const label = key === "3-0" ? "源" : key === "3-11" ? "终" : supplyDefenseGame.riskZones.has(key) ? "险" : "";
        cells.push(`
          <button type="button" class="${classes}" data-defense-cell="${key}" title="${escapeHtml(key)}">
            ${nodeHtml}
            ${orderHtml}
            ${label ? `<span class="tower-cell-label">${label}</span>` : ""}
          </button>
        `);
      }
    }
    root.innerHTML = cells.join("");
  }

  function renderSupplyDefenseDashboard() {
    const metrics = supplyDefenseGame.metrics;
    const total = Math.max(1, metrics.totalOrders);
    const deliveryRate = Math.round((metrics.delivered / total) * 100);
    const onTimeRate = metrics.delivered ? Math.round((metrics.onTime / metrics.delivered) * 100) : 0;
    const score = supplyDefenseGame.completed ? calculateSupplyDefenseScore() : supplyDefenseGame.score;
    setText("towerScore", supplyDefenseGame.completed ? String(score) : "--");
    setText("towerBudget", supplyDefenseGame.budget);
    setText("towerWave", `${supplyDefenseGame.wave}/3`);
    setText("towerDeliveryRate", `${deliveryRate}%`);
    setText("towerOnTimeRate", `${onTimeRate}%`);
    setText("towerCostPressure", metrics.costPressure.toFixed(0));
    setText("towerExposure", metrics.exposure.toFixed(0));
    setText("towerStability", Math.max(0, Math.min(100, metrics.stability)).toFixed(0));
    if (DOM.towerScoreText) {
      DOM.towerScoreText.textContent = supplyDefenseGame.completed
        ? `${supplyDefenseGame.insight?.title || "本局完成"}：${supplyDefenseGame.insight?.text || ""}`
        : "完成三波后生成评价。";
    }
    if (DOM.towerEventCard) {
      const event = supplyDefenseGame.lastEvent;
      DOM.towerEventCard.innerHTML = event
        ? `<strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.text)}</p><small>${escapeHtml(
            event.lesson || ""
          )}</small>`
        : "<strong>风险事件</strong><p>每波结束后会触发一次年份相关事件。</p>";
    }
    if (DOM.towerInsightCard) {
      const insight = supplyDefenseGame.insight;
      DOM.towerInsightCard.innerHTML = insight
        ? `<strong>${escapeHtml(insight.title)}</strong><p>${escapeHtml(insight.text)}</p><small>${escapeHtml(
            insight.lesson || ""
          )}</small>`
        : "<strong>学习卡片</strong><p>最短、最快、最便宜的路线不一定最稳。</p>";
    }
  }

  function renderSupplyDefenseGame() {
    if (!state.bundle) return;
    const country = ensureSupplyDefenseCountry();
    if (!country) return;
    if (!SUPPLY_MAZE_CARGO[supplyDefenseGame.cargoId]) supplyDefenseGame.cargoId = "electronics";
    supplyDefenseGame.year = selectedDefenseYear();
    const countries = state.bundle.countries.slice().sort(sortCountriesForDisplay);
    const cargo = selectedDefenseCargo();
    const yearConfig = SUPPLY_MAZE_YEARS[selectedDefenseYear()] || SUPPLY_MAZE_YEARS[2024];
    const metrics = supplyDefenseCountryMetrics(country);

    if (DOM.towerCountrySelect) {
      DOM.towerCountrySelect.innerHTML = countries
        .map((item) => `<option value="${escapeHtml(countryIso3(item))}">${escapeHtml(countryDisplayLabel(item))}</option>`)
        .join("");
      DOM.towerCountrySelect.value = supplyDefenseGame.countryIso3;
    }
    if (DOM.towerYearSelect) {
      DOM.towerYearSelect.innerHTML = Object.entries(SUPPLY_MAZE_YEARS)
        .map(([year, item]) => `<option value="${year}">${escapeHtml(item.label)}</option>`)
        .join("");
      DOM.towerYearSelect.value = String(supplyDefenseGame.year);
    }
    if (DOM.towerCargoSelect) {
      DOM.towerCargoSelect.innerHTML = Object.entries(SUPPLY_MAZE_CARGO)
        .map(([id, item]) => `<option value="${id}">${escapeHtml(item.label)}</option>`)
        .join("");
      DOM.towerCargoSelect.value = supplyDefenseGame.cargoId;
    }

    if (DOM.towerMissionText) {
      DOM.towerMissionText.textContent = `${countryIso3(country)} / ${countryChineseName(
        country
      )}：保护“${cargo.label}”订单完成三波交付。目标不是只走最快路线，而是在预算内降低依赖暴露并保持稳定。`;
    }
    setText("towerDependency", metrics.dependency.toFixed(2));
    setText("towerConcentration", metrics.hhi.toFixed(2));
    if (DOM.towerContextText) {
      DOM.towerContextText.textContent = `${yearConfig.description} ${cargo.note} 目标市场综合风险 ${metrics.vulnerability.toFixed(
        2
      )}，风险越高，红色冲击区造成的损失越明显。`;
    }
    if (DOM.towerStatusText) {
      if (supplyDefenseGame.running) {
        DOM.towerStatusText.textContent = `第 ${supplyDefenseGame.wave} 波运行中：观察订单是否能穿过风险区`;
      } else if (supplyDefenseGame.completed) {
        DOM.towerStatusText.textContent = "三波已完成，可重新布防挑战更高评分";
      } else {
        const selected = SUPPLY_DEFENSE_TOWER_TYPES[supplyDefenseGame.selectedTowerType];
        DOM.towerStatusText.textContent = `当前选择：${selected.label}。点击浅色可建节点部署防线。`;
      }
    }
    if (DOM.towerStartButton) {
      DOM.towerStartButton.disabled = supplyDefenseGame.running || supplyDefenseGame.completed;
      DOM.towerStartButton.textContent =
        supplyDefenseGame.wave >= 3 ? "本局已完成" : `开始第 ${supplyDefenseGame.wave + 1} 波`;
    }
    renderSupplyDefenseShop();
    renderSupplyDefenseBoard();
    renderSupplyDefenseDashboard();
  }

  function renderProcurementGame() {
    renderSupplyMineGame();
  }

  function metricLabel(metric = state.metric) {
    if (metric === "hhi") return "来源集中";
    if (metric === "vulnerability") return "综合风险";
    return "依赖度";
  }

  function categoryMetricKey(metric = state.metric) {
    if (metric === "hhi") return "hhi";
    if (metric === "vulnerability") return "vulnerability";
    return "dependency";
  }

  function metricValueFromRow(row, metric = state.metric) {
    const key = categoryMetricKey(metric);
    return Number(row?.[key] || 0);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value || 0)));
  }

  function quantile(values, q) {
    const sorted = values
      .map((value) => Number(value))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const position = (sorted.length - 1) * q;
    const base = Math.floor(position);
    const rest = position - base;
    const next = sorted[base + 1];
    return Number.isFinite(next) ? sorted[base] + rest * (next - sorted[base]) : sorted[base];
  }

  function percentileRank(values, current) {
    const sorted = values.map((value) => Number(value)).filter(Number.isFinite);
    if (!sorted.length) return 0;
    const belowOrEqual = sorted.filter((value) => value <= Number(current || 0)).length;
    return belowOrEqual / sorted.length;
  }

  function countryMetricPositionValue(country, metric) {
    const scoped = countryScopeMetrics(country, state.selectedScope);
    if (metric === "hhi") return Number(scoped.hhi || country?.hhi || 0);
    if (metric === "vulnerability") {
      return Number(scoped.vulnerability || country?.vulnerability || 0);
    }
    return Number(scoped.dependency || scoped.cdi || country?.cdi || 0);
  }

  function buildMetricPositionStats(country, countries = state.bundle?.countries || []) {
    return ["cdi", "hhi", "vulnerability"].reduce((acc, metric) => {
      const values = countries.map((item) => countryMetricPositionValue(item, metric));
      const current = countryMetricPositionValue(country, metric);
      acc[metric] = {
        current: clamp01(current),
        median: clamp01(quantile(values, 0.5)),
        p75: clamp01(quantile(values, 0.75)),
        p90: clamp01(quantile(values, 0.9)),
        percentile: percentileRank(values, current)
      };
      return acc;
    }, {});
  }

  function countryTrendMetricValue(iso3, year, metric = state.metric) {
    const row = (state.trend || []).find(
      (item) => item.iso3 === iso3 && Number(item.year) === Number(year)
    );
    if (row && Number.isFinite(Number(row?.[metric]))) {
      return Number(row[metric]);
    }
    if (metric === "cdi") return countryTrendValue(iso3, year);
    const country = findCountry(iso3);
    if (country && Number(state.year) === Number(year)) {
      return Number(countryScopeMetrics(country, state.selectedScope)?.[metric] || 0);
    }
    return null;
  }

  function buildCategoryRowsForWorkbench(detailRecord, profile) {
    const dimension = state.categoryDimension;
    const trendMap =
      dimension === "analysis_major" ? detailRecord?.majorTrends : detailRecord?.minorTrends;

    if (trendMap && typeof trendMap === "object") {
      return Object.entries(trendMap)
        .map(([id, series]) => {
          const rows = Array.isArray(series) ? series : [];
          const latest =
            rows.find((row) => Number(row.year) === Number(state.year)) ||
            rows
              .slice()
              .reverse()
              .find((row) => Number.isFinite(Number(row?.dependency)));
          if (!latest) return null;
          const categoryMeta = categoryById.get(id);
          return {
            id,
            name: categoryMeta?.name || latest.categoryName || id,
            dependency: Number(latest.dependency || 0),
            hhi: Number(latest.hhi || 0),
            vulnerability: Number(latest.vulnerability || 0),
            importance: Number(latest.importance || 0),
            chinaImport: Number(latest.chinaImport || 0),
            totalImport: Number(latest.totalImport || 0),
            color: categoryMeta?.color || cssColorForValue(Number(latest.vulnerability || 0))
          };
        })
        .filter(Boolean);
    }

    const fallback =
      dimension === "analysis_major"
        ? profile?.topMajorCategories || profile?.categories || []
        : profile?.topMinorCategories || profile?.categories || [];

    return (fallback || []).map((row) => ({
      ...row,
      name: categoryById.get(row.id)?.name || row.name || row.categoryName || row.id,
      color:
        categoryById.get(row.id)?.color ||
        row.color ||
        cssColorForValue(Number(row.vulnerability || row.dependency || 0))
    }));
  }

  function buildStructuralChangeRows(detailRecord) {
    const trendMap =
      state.categoryDimension === "analysis_major"
        ? detailRecord?.majorTrends
        : detailRecord?.minorTrends;

    if (!trendMap || typeof trendMap !== "object") {
      return { rows: [], baseYear: detailRecord?.structuralChange?.baseYear || 2007 };
    }

    const preferredBaseYear = Number(detailRecord?.structuralChange?.baseYear || 2007);
    const currentYear = Number(state.year);
    const dominantScore = (row) =>
      Number(row?.importance || row?.chinaImport || row?.dependency || 0);

    const candidates = Object.entries(trendMap)
      .map(([id, series]) => {
        const rows = Array.isArray(series) ? series : [];
        if (!rows.length) return null;
        const sortedRows = rows
          .slice()
          .sort((a, b) => Number(a.year || 0) - Number(b.year || 0));
        const base =
          sortedRows.find((row) => Number(row.year) === preferredBaseYear) ||
          sortedRows[0];
        const current =
          sortedRows.find((row) => Number(row.year) === currentYear) ||
          sortedRows[sortedRows.length - 1];
        if (!base || !current) return null;
        const categoryMeta = categoryById.get(id);
        return {
          id,
          name: categoryMeta?.name || current.categoryName || base.categoryName || id,
          baseYear: Number(base.year || preferredBaseYear),
          currentYear: Number(current.year || currentYear),
          baseValue: dominantScore(base),
          currentValue: dominantScore(current),
          importance: Number(current.importance || 0),
          vulnerability: Number(current.vulnerability || 0),
          dependency: Number(current.dependency || 0),
          chinaImport: Number(current.chinaImport || 0)
        };
      })
      .filter(
        (row) =>
          row &&
          (Number.isFinite(row.baseValue) || Number.isFinite(row.currentValue)) &&
          (row.baseValue > 0 || row.currentValue > 0)
      );

    const baseDominant = candidates
      .slice()
      .sort(
        (a, b) =>
          Number(b.baseValue || 0) - Number(a.baseValue || 0) ||
          Number(b.currentValue || 0) - Number(a.currentValue || 0)
      )[0];
    const currentDominant = candidates
      .slice()
      .sort(
        (a, b) =>
          Number(b.currentValue || 0) - Number(a.currentValue || 0) ||
          Number(b.baseValue || 0) - Number(a.baseValue || 0)
      )[0];
    const candidateBaseYears = candidates.map((row) => row.baseYear).filter(Number.isFinite);
    const resolvedBaseYear = candidateBaseYears.length
      ? Math.min(...candidateBaseYears)
      : preferredBaseYear;

    if (candidates.length < 2) {
      return {
        rows: [],
        baseYear: resolvedBaseYear,
        currentYear: currentYear,
        dominantCategoryBase:
          baseDominant?.name || detailRecord?.structuralChange?.dominantCategoryBase || null,
        dominantCategoryCurrent:
          currentDominant?.name || detailRecord?.structuralChange?.dominantCategoryCurrent || null
      };
    }

    const rankBy = (field) =>
      new Map(
        candidates
          .slice()
          .sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0))
          .map((row, index) => [row.id, index + 1])
      );
    const baseRank = rankBy("baseValue");
    const currentRank = rankBy("currentValue");
    const selected = state.selectedCategory !== "all" ? String(state.selectedCategory) : null;
    const selectedRow = selected ? candidates.find((row) => String(row.id) === selected) : null;
    let rows = candidates
      .slice()
      .sort(
        (a, b) =>
          Number(b.currentValue || 0) - Number(a.currentValue || 0) ||
          Number(b.baseValue || 0) - Number(a.baseValue || 0)
      )
      .slice(0, 5);
    if (selectedRow && !rows.some((row) => String(row.id) === String(selectedRow.id))) {
      rows = rows.slice(0, 4).concat(selectedRow);
    }

    return {
      rows: rows.map((row) => ({
        ...row,
        baseRank: baseRank.get(row.id) || rows.length,
        currentRank: currentRank.get(row.id) || rows.length
      })),
      baseYear: resolvedBaseYear,
      currentYear: currentYear,
      dominantCategoryBase:
        baseDominant?.name || detailRecord?.structuralChange?.dominantCategoryBase || null,
      dominantCategoryCurrent:
        currentDominant?.name || detailRecord?.structuralChange?.dominantCategoryCurrent || null
    };
  }

  function buildCountryWorkbenchModel({ country, detailRecord, profile }) {
    const scopeMetrics = {
      ...countryScopeMetrics(country, state.selectedScope),
      ...(detailRecord?.metrics || {})
    };
    const categoryMetric = categoryMetricKey();
    const categoryRows = buildCategoryRowsForWorkbench(detailRecord, profile)
      .map((row) => ({
        ...row,
        metricValue: metricValueFromRow(row)
      }))
      .filter((row) => Number.isFinite(Number(row.metricValue)));

    const rankedAll = categoryRows
      .slice()
      .sort(
        (a, b) =>
          Number(b.metricValue || 0) - Number(a.metricValue || 0) ||
          Number(b.importance || 0) - Number(a.importance || 0)
      );

    const rankingRows = rankedAll.slice(0, 5);

    const categoryFocus =
      state.selectedCategory === "all"
        ? null
        : rankedAll.find((row) => String(row.id) === String(state.selectedCategory)) ||
          buildRightRailCategoryFocus(detailRecord, rankedAll)?.item ||
          null;
    const categoryRank = categoryFocus
      ? rankedAll.findIndex((row) => String(row.id) === String(categoryFocus.id)) + 1
      : null;

    const trendSeries = buildCountryOverviewTrendSeries(country.iso3, detailRecord);
    const contextLabel = currentFilterContextLabel();
    const distributionRows = (state.bundle?.countries || []).map((row) => ({
      ...row,
      metricValue: metricValue(row)
    }));
    const distributionValues = distributionRows.map((row) => Number(row.metricValue || 0));
    const distributionCurrent = metricValue(country);
    const structuralChange = buildStructuralChangeRows(detailRecord);
    const structuralChangeDisplay = {
      ...(detailRecord?.structuralChange || {}),
      baseYear:
        structuralChange.baseYear ||
        detailRecord?.structuralChange?.baseYear ||
        2007,
      year:
        structuralChange.currentYear ||
        detailRecord?.structuralChange?.year ||
        state.year,
      dominantCategoryBase:
        structuralChange.dominantCategoryBase ||
        detailRecord?.structuralChange?.dominantCategoryBase ||
        null,
      dominantCategoryCurrent:
        structuralChange.dominantCategoryCurrent ||
        detailRecord?.structuralChange?.dominantCategoryCurrent ||
        null
    };

    return {
      country,
      contextLabel,
      metrics: scopeMetrics,
      metricPositionStats: buildMetricPositionStats(country),
      trendSeries,
      categoryMetric,
      rankingRows,
      portfolioRows: categoryRows,
      categoryFocus,
      categoryRank,
      metricDistribution: distributionRows,
      metricDistributionStats: {
        current: clamp01(distributionCurrent),
        median: clamp01(quantile(distributionValues, 0.5)),
        p75: clamp01(quantile(distributionValues, 0.75)),
        p90: clamp01(quantile(distributionValues, 0.9)),
        percentile: percentileRank(distributionValues, distributionCurrent)
      },
      supplierStructure: detailRecord?.supplierStructure || null,
      dependencyBreadth: detailRecord?.dependencyBreadth || null,
      structuralChange: structuralChangeDisplay,
      structuralChangeRows: structuralChange.rows,
      structuralChangeBaseYear: structuralChange.baseYear,
      structuralChangeCurrentYear: structuralChange.currentYear
    };
  }

  function renderCountryWorkbench({ country, detailRecord, profile, overviewTrendSeries }) {
    const model = buildCountryWorkbenchModel({ country, detailRecord, profile });
    const selectedCategoryLabel = currentCategoryLabel();
    const categoryMode = "ranking";

    setText("countryPageContextScope", scopeLabel(state.selectedScope));
    setText("countryPageContextDimension", categoryDimensionLabel(state.categoryDimension));
    setText("countryPageContextCategory", selectedCategoryLabel);
    setText("countryPageContextMetric", metricLabel(state.metric));
    setText(
      "countryPageTrendMeta",
      `${scopeLabel(state.selectedScope)} / ${categoryDimensionLabel(
        state.categoryDimension
      )} / ${metricLabel(state.metric)}`
    );
    setText(
      "countryCategoryChartTitle",
      "类别依赖排行"
    );
    setText(
      "countryCategoryChartMeta",
      "Top 5 / Lollipop"
    );

    renderCountryWorkbenchContext(model);
    renderMetricBullets(model);

    charts.renderCountryMetricDistribution?.({
      countries: model.metricDistribution,
      currentIso3: country.iso3,
      metric: state.metric,
      metricLabel: metricLabel(state.metric),
      stats: model.metricDistributionStats
    });
    charts.renderCountryTrend?.({
      years: indexData.years,
      series: model.trendSeries || overviewTrendSeries,
      metricLabel: metricLabel(state.metric)
    });
    detailPanel.renderTrendSummary?.({
      years: indexData.years,
      series: model.trendSeries || overviewTrendSeries,
      containerId: "countryPageTrendSummary"
    });
    charts.renderCountryCategory?.({
      categories: model.rankingRows,
      metric: model.categoryMetric,
      selectedCategory: state.selectedCategory
    });
    charts.renderCountryCategoryPortfolio?.({
      rows: model.portfolioRows,
      selectedCategory: state.selectedCategory
    });
    charts.renderCountrySupplier?.({
      supplierProfile: model.supplierStructure
    });
    charts.renderCountryStructuralChange?.({
      rows: model.structuralChangeRows,
      fallback: model.structuralChange,
      selectedCategory: state.selectedCategory,
      baseYear: model.structuralChangeBaseYear || 2007,
      currentYear: model.structuralChangeCurrentYear || state.year
    });

    detailPanel.renderDependencyRanking?.({
      rows: model.rankingRows,
      containerId: "countryPageCategoryContribution",
      emptyLabel: `${metricLabel(state.metric)} 排行`,
      limit: 5
    });
    setHtml("countryWorkbenchCategoryFocus", "");

    detailPanel.renderOverviewEvidence?.({
      detailRecord: {
        ...(detailRecord || {}),
        structuralChange: model.structuralChange
      },
      containerId: "countryPageStructuralChange",
      scopeLabel: scopeLabel(state.selectedScope),
      categoryLabel: selectedCategoryLabel,
      escapeHtml
    });
    detailPanel.renderSupplierStructure?.({
      country,
      supplierProfile: model.supplierStructure,
      containerId: "countryPageSupplierStructure",
      escapeHtml
    });
    renderBreadthFunnel(model.dependencyBreadth);
    detailPanel.renderDependencyBreadth?.({
      country,
      breadthProfile: model.dependencyBreadth,
      containerId: "countryPageDependencyBreadth",
      escapeHtml
    });
  }

  function renderCountryWorkbenchContext(model) {
    if (!DOM.countryWorkbenchContext) return;
    const chips = [
      scopeLabel(state.selectedScope),
      categoryDimensionLabel(state.categoryDimension),
      currentCategoryLabel(),
      metricLabel(state.metric),
      model.country?.iso3 || "-"
    ];
    DOM.countryWorkbenchContext.innerHTML = chips
      .map((item) => `<span class="country-context-chip">${escapeHtml(item)}</span>`)
      .join("");
  }

  function renderMetricBullets(model) {
    const container = document.getElementById("countryMetricBullets");
    if (!container) return;
    const metrics = [
      ["依赖度", "cdi"],
      ["来源集中", "hhi"],
      ["综合风险", "vulnerability"]
    ];

    container.innerHTML = metrics
      .map(([label, key]) => {
        const stats = model.metricPositionStats?.[key] || {};
        const current = clamp01(stats.current);
        const med = clamp01(stats.median);
        const p75 = clamp01(stats.p75);
        const p90 = clamp01(stats.p90);
        const percentile = Math.round(Number(stats.percentile || 0) * 100);
        return `
          <div class="metric-bullet">
            <div class="metric-bullet-head">
              <span>${escapeHtml(label)}</span>
              <strong>${current.toFixed(2)}</strong>
            </div>
            <div class="metric-bullet-track">
              <span class="metric-bullet-risk" style="left:${p75 * 100}%"></span>
              <span class="metric-bullet-median" style="left:${med * 100}%"></span>
              <span class="metric-bullet-p75" style="left:${p75 * 100}%"></span>
              <span class="metric-bullet-p90" style="left:${p90 * 100}%"></span>
              <span class="metric-bullet-point" style="left:${current * 100}%"></span>
            </div>
            <div class="metric-bullet-foot">
              <span>中位 ${med.toFixed(2)}</span>
              <span>P75 ${p75.toFixed(2)}</span>
              <span>分位 ${percentile}%</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderBreadthFunnel(profile) {
    const container = document.getElementById("countryWorkbenchBreadth");
    if (!container) return;
    if (!profile) {
      container.innerHTML =
        '<div class="analysis-item is-empty"><span>依赖广度</span><strong>暂无</strong><em>当前国家快照未携带 HS6 覆盖数据。</em></div>';
      return;
    }

    const total = Math.max(Number(profile.totalHs6Count || 0), 1);
    const rows = [
      ["HS6 产品总数", Number(profile.totalHs6Count || 0), 1, "#69e5ff"],
      ["有中国供应", Number(profile.chinaSuppliedHs6Count || 0), Number(profile.coverageRatio || 0), "#4dd4ac"],
      [">50% 依赖", Number(profile.highDependencyHs6Count || 0), Number(profile.highDependencyRatio || 0), "#ffd166"],
      [">80% 依赖", Number(profile.extremeDependencyHs6Count || 0), Number(profile.extremeDependencyRatio || 0), "#ff8a5b"]
    ];

    container.innerHTML = rows
      .map(([label, count, ratio, color]) => {
        const width = Math.max(4, Math.min(100, Number(ratio || 0) * 100));
        return `
          <div class="breadth-funnel-row">
            <div class="breadth-funnel-head">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(String(Math.round(count)))}</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${width}%;background:linear-gradient(90deg, ${color}88, ${color});"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function buildFallbackCountryProfile(country) {
    const buildRows = (dimension) =>
      categoryOptionsForDimension(dimension, state.selectedScope)
        .map((category) => {
          const cell = categoryMetrics(country, category, {
            dimension,
            scope: state.selectedScope
          });
          const contributionScore =
            Number(cell.dependency || 0) * Number(cell.importance || 0);
          return {
            id: category.id,
            name: category.name,
            value: contributionScore,
            dependency: Number(cell.dependency || 0),
            hhi: Number(cell.hhi || 0),
            vulnerability: Number(cell.vulnerability || 0),
            importance: Number(cell.importance || 0),
            contributionScore,
            color: category.color
          };
        })
        .sort((a, b) => b.contributionScore - a.contributionScore);

    const minorCategories = buildRows("analysis_minor");
    const majorCategories = buildRows("analysis_major");
    const categories =
      state.categoryDimension === "analysis_major" ? majorCategories : minorCategories;

    return {
      country,
      categories,
      topCategories: categories.slice(0, 5),
      topMinorCategories: minorCategories.slice(0, 5),
      topMajorCategories: majorCategories.slice(0, 5),
      delta: (countryTrendValue(country.iso3, state.year) || 0) -
        (countryTrendValue(country.iso3, indexData.years[0]) || 0)
    };
  }

  function overviewAverageTrend() {
    return (indexData.years || []).map((year) => {
      if (Array.isArray(state.trend) && state.trend.length) {
        const rows = state.trend.filter((row) => Number(row.year) === Number(year));
        return (
          rows.reduce((sum, row) => sum + Number(row.cdi || 0), 0) /
          Math.max(1, rows.length)
        );
      }

      const values = (indexData.countries || [])
        .map((country) => Number(country?.cdi?.[String(year)] ?? country?.cdi?.[year]))
        .filter(Number.isFinite);

      return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    });
  }

  function buildSeriesFromTrendRows(rows, valueKey) {
    const trendMap = new Map(
      (rows || [])
        .map((row) => [Number(row.year), Number(row?.[valueKey])])
        .filter((entry) => Number.isFinite(entry[0]) && Number.isFinite(entry[1]))
    );

    return (indexData.years || []).map((year) =>
      trendMap.has(Number(year)) ? trendMap.get(Number(year)) : null
    );
  }

  function buildCountryOverviewTrendSeries(iso3, detailRecord = state.countryDetailRecord) {
    let rows = [];
    let valueKey = state.metric || "cdi";

    if (state.selectedCategory !== "all" && detailRecord) {
      if (state.categoryDimension === "analysis_major") {
        rows = detailRecord?.majorTrends?.[state.selectedCategory] || [];
      } else {
        rows = detailRecord?.minorTrends?.[state.selectedCategory] || [];
      }
      valueKey = categoryMetricKey(state.metric);
    } else {
      rows = detailRecord?.overallTrend || detailRecord?.trend || [];
    }

    const fromSnapshot = buildSeriesFromTrendRows(rows, valueKey);
    const hasSnapshot = fromSnapshot.some((value) => Number.isFinite(Number(value)));
    if (hasSnapshot) return fromSnapshot;

    return (indexData.years || []).map((year) =>
      countryTrendMetricValue(iso3, year, state.metric)
    );
  }

  function buildRightRailDependencyRanking(detailRecord, profile) {
    const source =
      state.categoryDimension === "analysis_major"
        ? detailRecord?.majorDependencyRanking || detailRecord?.topMajorCategories
        : detailRecord?.minorDependencyRanking || detailRecord?.topMinorCategories;

    if (Array.isArray(source) && source.length) {
      return source
        .slice()
        .sort(
          (a, b) =>
            Number(b.dependency || 0) - Number(a.dependency || 0) ||
            Number(b.importance || 0) - Number(a.importance || 0)
        )
        .slice(0, 5);
    }

    const fallbackRows =
      state.categoryDimension === "analysis_major"
        ? profile?.topMajorCategories || profile?.categories || []
        : profile?.topMinorCategories || profile?.categories || [];

    return (fallbackRows || [])
      .filter((item) => Number(item.dependency || 0) > 0)
      .sort(
        (a, b) =>
          Number(b.dependency || 0) - Number(a.dependency || 0) ||
          Number(b.importance || 0) - Number(a.importance || 0)
      )
      .slice(0, 5);
  }

  function buildRightRailCategoryFocus(detailRecord, rankingRows) {
    if (state.selectedCategory === "all") return null;

    const categoryId = state.selectedCategory;
    const trendMap =
      state.categoryDimension === "analysis_major"
        ? detailRecord?.majorTrends
        : detailRecord?.minorTrends;

    if (trendMap && typeof trendMap === "object") {
      const ordered = Object.entries(trendMap)
        .map(([id, series]) => {
          const rows = Array.isArray(series) ? series : [];
          const latest = rows
            .slice()
            .reverse()
            .find((row) => Number.isFinite(Number(row?.dependency)));
          if (!latest) return null;
          return {
            id,
            name: categoryById.get(id)?.name || latest.categoryName || id,
            dependency: Number(latest.dependency || 0),
            importance: Number(latest.importance || 0),
            vulnerability: Number(latest.vulnerability || 0),
            hhi: Number(latest.hhi || 0),
            chinaImport: Number(latest.chinaImport || 0),
            totalImport: Number(latest.totalImport || 0)
          };
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            Number(b.dependency || 0) - Number(a.dependency || 0) ||
            Number(b.importance || 0) - Number(a.importance || 0)
        );

      const item = ordered.find((row) => String(row.id) === String(categoryId));
      if (item) {
        return {
          item,
          rank: ordered.findIndex((row) => String(row.id) === String(categoryId)) + 1
        };
      }
    }

    const country = findCountry(state.selectedCountry) || rankedCountries()[0];
    if (country) {
      const cell = categoryMetrics(country, categoryId, {
        dimension: state.categoryDimension,
        scope: state.selectedScope
      });
      if (Number.isFinite(Number(cell?.dependency))) {
        const fallbackItem = {
          id: categoryId,
          name: categoryById.get(categoryId)?.name || categoryId,
          dependency: Number(cell.dependency || 0),
          importance: Number(cell.importance || 0),
          vulnerability: Number(cell.vulnerability || 0),
          hhi: Number(cell.hhi || 0),
          chinaImport: Number(cell.chinaImport || 0),
          totalImport: Number(cell.totalImport || 0)
        };
        const fallbackRows = Array.isArray(rankingRows) ? rankingRows : [];
        const rank = fallbackRows.findIndex((row) => String(row.id) === String(categoryId));
        return {
          item: fallbackItem,
          rank: rank >= 0 ? rank + 1 : null
        };
      }
    }

    const rows = Array.isArray(rankingRows) ? rankingRows : [];
    const item = rows.find((row) => String(row.id) === String(categoryId));
    if (!item) return null;

    return {
      item,
      rank: rows.findIndex((row) => String(row.id) === String(categoryId)) + 1
    };
  }

  function summarizeSeries(series) {
    const points = (indexData.years || [])
      .map((year, index) => ({
        year: Number(year),
        value: Number(series?.[index])
      }))
      .filter((item) => Number.isFinite(item.value));

    if (!points.length) {
      return { yearDelta: 0, periodDelta: 0 };
    }

    const current = points[points.length - 1];
    const previous = points.length > 1 ? points[points.length - 2] : current;
    const first = points[0];
    return {
      yearDelta: current.value - previous.value,
      periodDelta: current.value - first.value
    };
  }

  function countryTrendValue(iso3, year) {
    const row = (state.trend || []).find(
      (item) => item.iso3 === iso3 && Number(item.year) === Number(year)
    );

    if (row) return Number(row.cdi);

    const series = countryMetaByIso3.get(iso3)?.cdi;
    if (!series) return null;

    const value = Number(series[String(year)] ?? series[year]);
    return Number.isFinite(value) ? value : null;
  }

  function previousYear() {
    const index = indexData.years.indexOf(state.year);
    return index <= 0 ? indexData.years[0] : indexData.years[index - 1];
  }

  function sortedMatrixCountries() {
    const countries = filteredCountries().slice();

    if (state.matrixSort === "region") {
      return countries.sort(
        (a, b) =>
          String(a.region).localeCompare(String(b.region)) ||
          metricValue(b) - metricValue(a)
      );
    }

    if (state.matrixSort === "income") {
      return countries.sort(
        (a, b) =>
          String(a.incomeGroup).localeCompare(String(b.incomeGroup)) ||
          metricValue(b) - metricValue(a)
      );
    }

    if (state.matrixSort === "category" && state.selectedCategory !== "all") {
      return countries.sort(
        (a, b) =>
          matrixCellMetricValue(
            categoryMetrics(b, state.selectedCategory, {
              dimension: state.matrixCategoryLevel,
              scope: state.selectedScope
            })
          ) -
          matrixCellMetricValue(
            categoryMetrics(a, state.selectedCategory, {
              dimension: state.matrixCategoryLevel,
              scope: state.selectedScope
            })
          )
      );
    }

    return countries.sort((a, b) => metricValue(b) - metricValue(a));
  }

  function matrixCellMetricValue(cell) {
    if (state.metric === "hhi") return Number(cell?.hhi || 0);
    if (state.metric === "vulnerability") return Number(cell?.vulnerability || 0);
    return Number(cell?.dependency || 0);
  }

  function matrixMetricLabel() {
    if (state.metric === "hhi") return "来源集中";
    if (state.metric === "vulnerability") return "综合风险";
    return "依赖度";
  }

  function buildMatrixModel() {
    const countries = sortedMatrixCountries().slice(0, Number(state.matrixCountryLimit || MATRIX_LIMIT));
    const allCategories = matrixCategoryOptions();
    let categories =
      state.selectedCategory !== "all" &&
      state.categoryDimension === state.matrixCategoryLevel
        ? allCategories.filter((category) => category.id === state.selectedCategory)
        : allCategories;

    if (state.selectedCategory === "all" && categories.length > 1) {
      categories = categories
        .map((category) => {
          const values = countries.map((country) =>
            matrixCellMetricValue(
              categoryMetrics(country, category, {
                dimension: state.matrixCategoryLevel,
                scope: state.selectedScope
              })
            )
          );
          const mean =
            values.reduce((sum, value) => sum + Number(value || 0), 0) /
            Math.max(1, values.length);
          return { category, mean };
        })
        .sort(
          (a, b) =>
            Number(b.mean || 0) - Number(a.mean || 0) ||
            String(a.category?.name || "").localeCompare(String(b.category?.name || ""))
        )
        .map((item) => item.category);
    }

    const cells = [];
    countries.forEach((country) => {
      categories.forEach((category) => {
        const cell = categoryMetrics(country, category, {
          dimension: state.matrixCategoryLevel,
          scope: state.selectedScope
        });
        cells.push({
          country,
          category,
          cell,
          value: matrixCellMetricValue(cell)
        });
      });
    });

    const sortedCells = cells.slice().sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    const maxCell = sortedCells[0] || null;
    const highCount = cells.filter((item) => Number(item.value || 0) >= 0.5).length;
    const focusSeed = state.matrixHoverFocus || state.matrixFocus || {
      countryIso3: maxCell?.country?.iso3 || countries[0]?.iso3,
      categoryId: maxCell?.category?.id || categories[0]?.id
    };
    const focusCountry =
      countries.find((country) => country.iso3 === focusSeed?.countryIso3) ||
      findCountry(focusSeed?.countryIso3) ||
      countries[0];
    const focusCategory =
      categories.find((category) => category.id === focusSeed?.categoryId) ||
      allCategories.find((category) => category.id === focusSeed?.categoryId) ||
      categories[0];
    const focusCell =
      focusCountry && focusCategory
        ? categoryMetrics(focusCountry, focusCategory, {
            dimension: state.matrixCategoryLevel,
            scope: state.selectedScope
          })
        : null;

    const countryTopCategories = focusCountry
      ? allCategories
          .map((category) => {
            const cell = categoryMetrics(focusCountry, category, {
              dimension: state.matrixCategoryLevel,
              scope: state.selectedScope
            });
            return { category, cell, value: matrixCellMetricValue(cell) };
          })
          .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
          .slice(0, 5)
      : [];

    const categoryTopCountries = focusCategory
      ? filteredCountries()
          .map((country) => {
            const cell = categoryMetrics(country, focusCategory, {
              dimension: state.matrixCategoryLevel,
              scope: state.selectedScope
            });
            return { country, cell, value: matrixCellMetricValue(cell) };
          })
          .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
          .slice(0, 5)
      : [];

    const categoryAverageRows = categories
      .map((category) => {
        const values = countries.map((country) =>
          matrixCellMetricValue(
            categoryMetrics(country, category, {
              dimension: state.matrixCategoryLevel,
              scope: state.selectedScope
            })
          )
        );
        const mean = values.reduce((sum, value) => sum + Number(value || 0), 0) / Math.max(1, values.length);
        return { category, value: mean };
      })
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .slice(0, 8);

    const groupField = state.matrixSort === "income" ? "incomeGroup" : "region";
    const groupMap = new Map();
    cells.forEach((entry) => {
      const key = entry.country?.[groupField] || "未分类";
      const group = groupMap.get(key) || { name: key, values: [], countrySet: new Set() };
      group.values.push(Number(entry.value || 0));
      if (entry.country?.iso3) group.countrySet.add(entry.country.iso3);
      groupMap.set(key, group);
    });
    const groupSummaryRows = Array.from(groupMap.values())
      .map((item) => ({
        name: item.name,
        count: item.countrySet?.size || 0,
        value:
          item.values.reduce((sum, value) => sum + Number(value || 0), 0) /
          Math.max(1, item.values.length)
      }))
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .slice(0, 8);

    return {
      countries,
      categories,
      cells,
      focusCountry,
      focusCategory,
      focusCell,
      summary: {
        maxCell,
        highRatio: cells.length ? highCount / cells.length : 0,
        sampleSize: `${countries.length} × ${categories.length}`
      },
      countryTopCategories,
      categoryTopCountries,
      categoryAverageRows,
      groupSummaryRows,
      outlierCells: sortedCells.slice(0, 10),
      cellDistribution: cells
    };
  }

  function renderMatrixAnalysis() {
    if (!state.bundle) return;

    const model = buildMatrixModel();
    const { countries, categories } = model;

    if (!countries.length || !categories.length) return;

    charts.renderMatrix?.({
      countries,
      categories,
      getCell: (country, category) =>
        categoryMetrics(country, category, {
          dimension: state.matrixCategoryLevel,
          scope: state.selectedScope
        }),
      metric: state.metric,
      matrixSort: state.matrixSort,
      selectedCategory: state.selectedCategory,
      categoryLevel: state.matrixCategoryLevel,
      year: state.year,
      metaEl: DOM.matrixMeta
    });

    charts.renderMatrixCellDistribution?.({
      cells: model.cellDistribution,
      focusCell: model.focusCell
        ? {
            country: model.focusCountry,
            category: model.focusCategory,
            value: matrixCellMetricValue(model.focusCell)
          }
        : null,
      metricLabel: matrixMetricLabel()
    });

    state.lastMatrixCategories = categories;
    state.lastMatrixCountries = countries;

    if (!state.matrixFocus) {
      state.matrixFocus = {
        countryIso3: model.focusCountry?.iso3 || countries[0]?.iso3 || state.selectedCountry,
        categoryId: model.focusCategory?.id || categories[0]?.id
      };
    }

    renderMatrixSummary(model);
    renderMatrixFocus(model);
    renderMatrixBottomSummary(model);
    if (activePrimarySection() === "matrix") {
      window.setTimeout(() => charts.resize?.(), 80);
    }
  }

  function renderMatrixFocus(model = buildMatrixModel()) {
    const categories = model.categories || state.lastMatrixCategories || matrixCategoryOptions();

    const focus =
      state.matrixHoverFocus || state.matrixFocus || {
        countryIso3: state.selectedCountry,
        categoryId: categories[0]?.id
      };

    const country = model.focusCountry || findCountry(focus.countryIso3) || rankedCountries()[0];
    const category =
      model.focusCategory || categories.find((item) => item.id === focus.categoryId) || categories[0];

    if (!country || !category) return;

    const cell = model.focusCell || categoryMetrics(country, category, {
      dimension: state.matrixCategoryLevel,
      scope: state.selectedScope
    });

    charts.renderMatrixFocus?.({
      country,
      category,
      cell,
      year: state.year,
      setText
    });

    renderMatrixCellMetricBars(cell);
    renderMatrixRankList({
      containerId: "matrixCountryTopCategories",
      rows: model.countryTopCategories.map((item) => ({
        name: item.category.name,
        value: item.value,
        note: `${matrixMetricLabel()} ${item.value.toFixed(2)}`
      })),
      emptyLabel: "该国类别结构"
    });
    renderMatrixRankList({
      containerId: "matrixCategoryTopCountries",
      rows: model.categoryTopCountries.map((item) => ({
        name: item.country.name,
        value: item.value,
        note: `${item.country.iso3} · ${matrixMetricLabel()} ${item.value.toFixed(2)}`
      })),
      emptyLabel: "该类别国家排行"
    });
    if (DOM.matrixProductDetails?.open) renderMatrixProductClues(country, category);
    else {
      setHtml(
        "matrixFocusProducts",
        '<div class="analysis-item is-empty"><span>产品线索</span><strong>按需加载</strong><em>展开后读取当前国家-类别的产品线索。</em></div>'
      );
    }
  }

  function formatMatrixValue(value) {
    return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "-";
  }

  function renderMatrixSummary(model) {
    const maxCell = model.summary?.maxCell;
    const cards = [
      {
        label: "最高值单元格",
        value: maxCell
          ? `${maxCell.country?.name || "-"} · ${maxCell.category?.name || "-"}`
          : "-",
        note: `${matrixMetricLabel()} ${formatMatrixValue(maxCell?.value)}`
      },
      {
        label: "高值单元格占比",
        value: `${Math.round(Number(model.summary?.highRatio || 0) * 100)}%`,
        note: `${matrixMetricLabel()} ≥ 0.50`
      },
      {
        label: "当前样本规模",
        value: model.summary?.sampleSize || "-",
        note: "国家 × 类别"
      }
    ];
    if (!DOM.matrixSummaryCards) return;
    DOM.matrixSummaryCards.innerHTML = cards
      .map(
        (item) => `
          <article class="matrix-summary-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <em>${escapeHtml(item.note)}</em>
          </article>
        `
      )
      .join("");
  }

  function renderMatrixCellMetricBars(cell) {
    if (!DOM.matrixCellMetricBars) return;
    const rows = [
      ["依赖度", Number(cell?.dependency || 0)],
      ["来源集中", Number(cell?.hhi || 0)],
      ["产品重要性", Number(cell?.importance || 0)],
      ["综合风险", Number(cell?.vulnerability || 0)]
    ];
    DOM.matrixCellMetricBars.innerHTML = rows
      .map(([label, value]) => {
        const width = Math.max(3, Math.min(100, value * 100));
        const color = cssColorForValue(value);
        return `
          <div class="matrix-metric-bar">
            <div class="matrix-metric-bar-head">
              <span>${escapeHtml(label)}</span>
              <strong>${value.toFixed(2)}</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${width}%;background:linear-gradient(90deg, ${color}88, ${color});"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderMatrixRankList({ containerId, rows, emptyLabel }) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = (rows || []).filter((row) => Number.isFinite(Number(row.value))).slice(0, 8);
    if (!list.length) {
      container.innerHTML = `
        <div class="analysis-item is-empty">
          <span>${escapeHtml(emptyLabel || "排行")}</span>
          <strong>暂无</strong>
          <em>当前矩阵样本不足。</em>
        </div>
      `;
      return;
    }
    const max = Math.max(0.01, ...list.map((row) => Number(row.value || 0)));
    container.innerHTML = list
      .map((row, index) => {
        const value = Number(row.value || 0);
        const color = cssColorForValue(value);
        const width = Math.max(4, Math.min(100, (value / max) * 100));
        return `
          <div class="matrix-rank-item">
            <span class="ranking-index">${index + 1}</span>
            <div class="matrix-rank-main">
              <strong title="${escapeHtml(row.name || "-")}">${escapeHtml(row.name || "-")}</strong>
              <small>${escapeHtml(row.note || `${matrixMetricLabel()} ${value.toFixed(2)}`)}</small>
              <div class="bar-track">
                <div class="bar-fill" style="width:${width}%;background:linear-gradient(90deg, ${color}88, ${color});"></div>
              </div>
            </div>
            <span class="matrix-rank-value">${value.toFixed(2)}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderMatrixBottomSummary(model) {
    renderMatrixRankList({
      containerId: "matrixCategoryAverageRank",
      rows: model.categoryAverageRows.map((item) => ({
        name: item.category.name,
        value: item.value,
        note: `样本均值 · ${matrixMetricLabel()} ${item.value.toFixed(2)}`
      })).slice(0, 5),
      emptyLabel: "类别平均排行"
    });
    renderMatrixRankList({
      containerId: "matrixGroupSummary",
      rows: model.groupSummaryRows.map((item) => ({
        name: item.name,
        value: item.value,
        note: `${item.count} 国 · 均值 ${item.value.toFixed(2)}`
      })),
      emptyLabel: "区域 / 收入组摘要"
    });
    renderMatrixOutliers(model.outlierCells || []);
  }

  function renderMatrixOutliers(rows) {
    if (!DOM.matrixOutlierCells) return;
    const list = (rows || []).slice(0, 6);
    if (!list.length) {
      DOM.matrixOutlierCells.innerHTML = `
        <div class="analysis-item is-empty">
          <span>重点组合</span>
          <strong>暂无</strong>
          <em>当前矩阵样本不足。</em>
        </div>
      `;
      return;
    }

    DOM.matrixOutlierCells.innerHTML = list
      .map((item, index) => {
        const value = Number(item.value || 0);
        const color = cssColorForValue(value);
        return `
          <button class="matrix-outlier-item" type="button" data-country="${escapeHtml(
            item.country?.iso3 || ""
          )}" data-category="${escapeHtml(item.category?.id || "")}">
            <span class="ranking-index">${index + 1}</span>
            <span class="matrix-outlier-main">
              <strong>${escapeHtml(item.country?.name || "-")}</strong>
              <em title="${escapeHtml(item.category?.name || "-")}">${escapeHtml(item.category?.name || "-")}</em>
            </span>
            <span class="matrix-outlier-value" style="color:${color}">${value.toFixed(2)}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderMatrixProductClues(country = null, category = null) {
    const categories = state.lastMatrixCategories || matrixCategoryOptions();
    const focus = state.matrixFocus || state.matrixHoverFocus || {
      countryIso3: state.selectedCountry,
      categoryId: categories[0]?.id
    };
    const focusCountry = country || findCountry(focus.countryIso3) || rankedCountries()[0];
    const focusCategory =
      category || categories.find((item) => item.id === focus.categoryId) || categories[0];

    if (!focusCountry || !focusCategory) return;

    detailPanel.renderCountryHs6Products?.({
      loader,
      country: focusCountry,
      year: state.year,
      scope: state.selectedScope,
      selectedCountry: focusCountry.iso3,
      containerId: "matrixFocusProducts",
      categoryNameFilter: focusCategory.filterName || focusCategory.name,
      limit: 6,
      escapeHtml
    });
  }

  function flowCategoryLevelLabel(level = state.flowCategoryLevel) {
    return (
      {
        analysis_major: "分析大类",
        analysis_minor: "分析细类",
        hs_chapter: "HS 章节",
        topic_tag: "专题标签"
      }[level] || "分析大类"
    );
  }

  function flowModeLabel(mode = state.flowMode, focusMode = isFlowCountryFocus()) {
    if (focusMode) return "国家聚焦";
    return (
      {
        region: "区域模式",
        country: "国家模式",
        income: "收入组模式"
      }[mode] || "区域模式"
    );
  }

  function isFlowCountryFocus() {
    return state.analysisScope === "country" && Boolean(state.selectedCountry);
  }

  function flowCell(country, category) {
    if (!country || !category) return null;
    if (category.level === "topic_tag" || state.flowCategoryLevel === "topic_tag") {
      return state.bundle?.topicIndex?.get(`${state.selectedScope || "manufactures"}::${country.iso3}::${category.id}`) || null;
    }
    return categoryMetrics(country, category, {
      dimension: category.dimension || state.flowCategoryLevel,
      scope: state.selectedScope
    });
  }

  function flowTargetName(country, effectiveMode) {
    if (effectiveMode === "focus") return country.name || country.country || country.iso3;
    if (effectiveMode === "country") return country.name || country.country || country.iso3;
    if (effectiveMode === "income") return country.incomeGroup || "Unclassified";
    return country.region || "Unclassified";
  }

  function flowMetricValue(item) {
    if (state.metric === "hhi") return Number(item.hhi || 0);
    if (state.metric === "vulnerability") return Number(item.vulnerability || 0);
    return Number(item.dependency || 0);
  }

  function flowSortValue(item) {
    if (state.flowSort === "metric") return flowMetricValue(item);
    if (state.flowSort === "dependency") return Number(item.dependency || 0);
    if (state.flowSort === "vulnerability") return Number(item.vulnerability || 0);
    if (state.flowSort === "importance") return Number(item.importance || item.totalImport || 0);
    return Number(item.chinaImport || item.value || 0);
  }

  function flowSortLabel(sort = state.flowSort) {
    return (
      {
        value: "按流向额",
        metric: `按${metricLabel(state.metric)}`,
        dependency: "按依赖度",
        vulnerability: "按脆弱性",
        importance: "按重要性"
      }[sort] || "按流向额"
    );
  }

  function buildFlowWorkbenchModel() {
    const focusMode = isFlowCountryFocus();
    const effectiveMode = focusMode ? "focus" : state.flowMode || "region";
    const scope = state.selectedScope || "manufactures";
    const countries = focusMode
      ? [currentCountry()].filter(Boolean)
      : (state.bundle?.countries || []).filter(Boolean);
    const selectedFlowCategory = state.flowSelectedCategory || "all";
    const availableCategories = flowCategoryOptions();
    const allCategories =
      selectedFlowCategory && selectedFlowCategory !== "all"
        ? availableCategories.filter((category) => String(category.id) === String(selectedFlowCategory))
        : availableCategories;

    const categoryLimit = Number(state.flowCategoryLimit || 6);
    const minShare = Number(state.flowMinShare || 0);
    const categoryTotals = allCategories
      .map((category) => {
        let chinaImport = 0;
        let totalImport = 0;
        let vulnerabilityNumerator = 0;
        let dependencyNumerator = 0;
        let hhiNumerator = 0;
        countries.forEach((country) => {
          const cell = flowCell(country, category);
          const value = Number(cell?.chinaImport || 0);
          const total = Number(cell?.totalImport || 0);
          chinaImport += value;
          totalImport += total;
          vulnerabilityNumerator += Number(cell?.vulnerability || 0) * Math.max(total, value, 0);
          dependencyNumerator += Number(cell?.dependency || 0) * Math.max(total, value, 0);
          hhiNumerator += Number(cell?.hhi || 0) * Math.max(total, value, 0);
        });
        const weight = Math.max(totalImport, chinaImport, 1);
        return {
          ...category,
          categoryId: category.proxyCategoryId || category.id,
          chinaImport,
          totalImport,
          importance: totalImport,
          dependency: dependencyNumerator / weight,
          hhi: hhiNumerator / weight,
          vulnerability: vulnerabilityNumerator / weight
        };
      })
      .filter((category) => Number(category.chinaImport || 0) > 0)
      .sort((a, b) => {
        const diff = flowSortValue(b) - flowSortValue(a);
        return diff || Number(b.chinaImport || 0) - Number(a.chinaImport || 0);
      });

    const categories =
      selectedFlowCategory && selectedFlowCategory !== "all"
        ? categoryTotals.slice(0, 1)
        : categoryTotals.slice(0, categoryLimit);
    const candidateRows = [];
    countries.forEach((country) => {
      categories.forEach((category) => {
        const cell = flowCell(country, category);
        const chinaImport = Number(cell?.chinaImport || 0);
        if (chinaImport <= 0) return;
        candidateRows.push({
          country,
          category,
          targetName: flowTargetName(country, effectiveMode),
          value: chinaImport,
          dependency: Number(cell?.dependency || 0),
          hhi: Number(cell?.hhi || 0),
          importance: Number(cell?.importance || cell?.totalImport || 0),
          vulnerability: Number(cell?.vulnerability || 0)
        });
      });
    });

    const rawTargetTotals = new Map();
    candidateRows.forEach((row) => {
      rawTargetTotals.set(row.targetName, (rawTargetTotals.get(row.targetName) || 0) + row.value);
    });
    const autoTargetLimit =
      effectiveMode === "country" ? 10 : effectiveMode === "income" ? 99 : effectiveMode === "focus" ? 1 : 8;
    const targetLimit = Number(state.flowTargetLimit || 0) || autoTargetLimit;
    const targetNames = Array.from(rawTargetTotals.entries())
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
      .slice(0, targetLimit)
      .map(([name]) => name);
    const targetSet = new Set(targetNames);
    const targetRows = candidateRows.filter((row) => targetSet.has(row.targetName));
    const rawVisibleTotal = targetRows.reduce((sum, row) => sum + Number(row.value || 0), 0);
    const visibleRows = targetRows.filter((row) =>
      minShare > 0 ? Number(row.value || 0) / Math.max(rawVisibleTotal, 1) >= minShare : true
    );
    const totalFlow = visibleRows.reduce((sum, row) => sum + Number(row.value || 0), 0);

    const visibleCategoryTotals = new Map();
    const visibleTargetTotals = new Map();
    visibleRows.forEach((row) => {
      const categoryId = row.category.categoryId || row.category.id;
      const current = visibleCategoryTotals.get(categoryId) || {
        ...row.category,
        value: 0,
        dependency: 0,
        hhi: 0,
        importance: 0,
        vulnerability: 0,
        weight: 0
      };
      current.value += row.value;
      current.dependency += row.dependency * row.value;
      current.hhi += row.hhi * row.value;
      current.importance += row.importance;
      current.vulnerability += row.vulnerability * row.value;
      current.weight += row.value;
      visibleCategoryTotals.set(categoryId, current);

      const target = visibleTargetTotals.get(row.targetName) || { name: row.targetName, value: 0 };
      target.value += row.value;
      visibleTargetTotals.set(row.targetName, target);
    });

    const topCategories = Array.from(visibleCategoryTotals.values())
      .map((item) => ({
        ...item,
        share: totalFlow > 0 ? item.value / totalFlow : 0,
        dependency: item.weight ? item.dependency / item.weight : 0,
        hhi: item.weight ? item.hhi / item.weight : 0,
        vulnerability: item.weight ? item.vulnerability / item.weight : 0
      }))
      .sort((a, b) => {
        const diff = flowSortValue(b) - flowSortValue(a);
        return diff || Number(b.value || 0) - Number(a.value || 0);
      });

    const topTargets = Array.from(visibleTargetTotals.values())
      .map((item) => ({ ...item, share: totalFlow > 0 ? item.value / totalFlow : 0 }))
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

    const nodes = [
      { name: "中国", displayName: "中国", layer: "source", itemStyle: { color: CHINA_GOLD } },
      ...topCategories.map((category) => ({
        name: `cat:${category.categoryId || category.id}`,
        displayName: category.name,
        layer: "category",
        itemStyle: { color: category.color || CYAN_LINE }
      })),
      ...topTargets.map((target) => ({
        name: `target:${target.name}`,
        displayName: target.name,
        layer: "target",
        itemStyle: {
          color: focusMode ? CHINA_GOLD : "#86a8c7",
          borderColor: focusMode ? "#ffd166" : "rgba(255,255,255,.28)",
          borderWidth: focusMode ? 2 : 1
        }
      }))
    ];

    const links = [];
    topCategories.forEach((category) => {
      links.push({
        source: "中国",
        target: `cat:${category.categoryId || category.id}`,
        value: category.value,
        lineColor: category.color || CYAN_LINE,
        categoryName: category.name,
        targetName: "类别合计",
        share: category.share,
        dependency: category.dependency,
        hhi: category.hhi,
        vulnerability: category.vulnerability
      });
    });
    visibleRows.forEach((row) => {
      links.push({
        source: `cat:${row.category.categoryId || row.category.id}`,
        target: `target:${row.targetName}`,
        value: row.value,
        lineColor: row.category.color || CYAN_LINE,
        categoryName: row.category.name,
        targetName: row.targetName,
        share: totalFlow > 0 ? row.value / totalFlow : 0,
        dependency: row.dependency,
        hhi: row.hhi,
        vulnerability: row.vulnerability
      });
    });

    const concentration = {
      top1: topCategories.slice(0, 1).reduce((sum, item) => sum + item.share, 0),
      top3: topCategories.slice(0, 3).reduce((sum, item) => sum + item.share, 0),
      top6: topCategories.slice(0, 6).reduce((sum, item) => sum + item.share, 0)
    };

    const topCategoryNames = topCategories.slice(0, 3).map((item) => item.name).join("、") || "暂无类别";
    const topTargetNames = topTargets.slice(0, 3).map((item) => item.name).join("、") || "暂无目标";
    const scopeName = scopeLabel(scope);
    const insightText = focusMode
      ? `${currentCountry()?.name || state.selectedCountry} 在 ${state.year} 年接收的中国${scopeName}主要集中于 ${topCategoryNames}。当前按${flowSortLabel()}筛选 ${
          selectedFlowCategory === "all" ? `Top ${categoryLimit} 类别` : "指定类别"
        }，可用于判断该国依赖结构的类别集中性。`
      : `在 ${state.year} 年的${flowModeLabel(state.flowMode)}下，中国${scopeName}流向主要集中于 ${topCategoryNames}；目标端以 ${topTargetNames} 为主要承接对象，当前图按${flowSortLabel()}选择 ${
          selectedFlowCategory === "all" ? `Top ${categoryLimit} 类别` : "指定类别"
        } 和 ${
          state.flowTargetLimit ? `Top ${targetLimit} 目标` : "自动目标数"
        } 生成。`;

    return {
      context: {
        year: state.year,
        scope,
        categoryLevel: state.flowCategoryLevel,
        categoryLimit,
        targetLimit,
        minShare,
        mode: effectiveMode,
        focusMode,
        focusCountry: currentCountry(),
        selectedCategory: selectedFlowCategory,
        selectedCategoryName:
          selectedFlowCategory === "all"
            ? "全部类别"
            : availableCategories.find((category) => category.id === selectedFlowCategory)?.name || selectedFlowCategory,
        sort: state.flowSort
      },
      kpis: {
        year: state.year,
        mode: flowModeLabel(state.flowMode, focusMode),
        categoryCount: topCategories.length,
        totalFlow
      },
      insightText,
      nodes,
      links,
      topCategories,
      topTargets,
      concentration,
      totalFlow,
      modeDescription: flowModeDescription(effectiveMode),
      chartCaption: flowChartCaption(effectiveMode),
      empty: !topCategories.length || !topTargets.length || !links.length
    };
  }

  function flowModeDescription(mode) {
    const scopeName = scopeLabel(state.selectedScope);
    const copy = {
      focus: `国家聚焦模式只保留选中国家，用于分析该国从中国进口${scopeName}的类别构成。`,
      region: `区域模式适合宏观展示，用于观察中国${scopeName}通过商品类别流向全球主要区域。`,
      country: `国家模式用于识别主要承接中国${scopeName}的经济体，并比较不同国家的承接结构。`,
      income: `收入组模式用于分析不同发展水平经济体接收中国${scopeName}的结构差异。`
    };
    return copy[mode] || copy.region;
  }

  function flowChartCaption(mode) {
    const copy = {
      focus: "China → Categories → Selected Country：展示选中国家的中国制造类别来源结构。",
      region: "China → Categories → Region：区域模式用于观察中国制造流向的全球空间结构。",
      country: "China → Categories → Country：国家模式用于识别主要承接中国制造的经济体。",
      income: "China → Categories → Income Group：收入组模式用于比较不同发展水平经济体的承接结构。"
    };
    return copy[mode] || copy.region;
  }

  function renderFlowAnalysis() {
    if (!state.bundle) return;

    const model = buildFlowWorkbenchModel();

    renderFlowWorkbench(model);
    charts.renderSankey?.({
      nodes: model.nodes,
      links: model.links,
      context: model.context,
      empty: model.empty,
      totalFlow: model.totalFlow
    });
    if (activePrimarySection() === "flows") {
      window.setTimeout(() => charts.resize?.(), 80);
    }
  }

  function renderFlowWorkbench(model) {
    if (!model) return;
    const compactCategories = (model.topCategories || []).slice(0, 5);
    const compactTargets = (model.topTargets || []).slice(0, 6);
    renderFlowKpis(model);
    renderFlowContext(model);
    renderFlowBarList(DOM.flowTopCategories, compactCategories, { valueLabel: "chinaImport" });
    renderFlowBarList(DOM.flowCategoryBars, model.topCategories, { valueLabel: "share" });
    renderFlowTargetList(DOM.flowTopTargets, compactTargets);
    renderFlowTargetList(DOM.flowTargetRank, compactTargets);
    renderFlowConcentration(model.concentration, model.context.categoryLimit);
    charts.renderFlowCategoryContribution?.({
      rows: model.topCategories,
      totalFlow: model.totalFlow,
      metricLabel: flowSortLabel(model.context.sort)
    });
    charts.renderFlowTargetComposition?.({
      rows: model.topTargets,
      totalFlow: model.totalFlow,
      modeLabel: flowModeLabel(state.flowMode, model.context.focusMode)
    });
    charts.renderFlowConcentration?.({
      categories: model.topCategories,
      targets: model.topTargets,
      concentration: model.concentration
    });

    if (DOM.flowInsightText) DOM.flowInsightText.textContent = model.insightText || "当前口径暂无可解释流向。";
    if (DOM.flowDescription) DOM.flowDescription.textContent = model.modeDescription;
    if (DOM.flowChartCaption) DOM.flowChartCaption.textContent = model.chartCaption;
    if (DOM.flowChartTitle) {
      DOM.flowChartTitle.textContent = model.context.focusMode
        ? "China → Category → Selected Country"
        : "China → Category → Target";
    }
    if (DOM.flowChartMeta) {
      DOM.flowChartMeta.textContent = `${flowCategoryLevelLabel(model.context.categoryLevel)} · ${
        model.context.selectedCategory === "all"
          ? `Top ${model.topCategories.length || 0}/${model.context.categoryLimit}`
          : model.context.selectedCategoryName
      } · ${flowSortLabel(model.context.sort)}`;
    }
    if (DOM.flowMeta) {
      DOM.flowMeta.textContent = `${flowModeLabel(state.flowMode, model.context.focusMode)} · ${flowCategoryLevelLabel(
        model.context.categoryLevel
      )} · ${state.year}`;
    }
    if (DOM.flowTargetLabel) {
      DOM.flowTargetLabel.textContent = model.context.focusMode ? "聚焦国家" : flowModeLabel(state.flowMode);
    }
    if (DOM.flowExitCountryFocus) {
      DOM.flowExitCountryFocus.hidden = !model.context.focusMode;
    }
  }

  function renderFlowKpis(model) {
    if (!DOM.flowKpiStrip) return;
    const cards = [
      ["当前年份", String(model.kpis.year), "Year"],
      ["当前模式", model.kpis.mode, "Mode"],
      ["类别数量", `${model.kpis.categoryCount} / ${model.context.categoryLimit}`, flowCategoryLevelLabel(model.context.categoryLevel)],
      ["总流向额", formatTradeValue(model.kpis.totalFlow), "China imports"]
    ];
    DOM.flowKpiStrip.innerHTML = cards
      .map(
        ([label, value, note]) => `
          <article class="flow-kpi-card">
            <span>${escapeHtml(label)}</span>
            <strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong>
            <em>${escapeHtml(note)}</em>
          </article>
        `
      )
      .join("");
  }

  function renderFlowContext(model) {
    if (!DOM.flowContextChips) return;
    const chips = [
      scopeLabel(model.context.scope),
      flowCategoryLevelLabel(model.context.categoryLevel),
      flowSortLabel(model.context.sort),
      model.context.selectedCategoryName,
      model.context.focusMode ? `聚焦：${model.context.focusCountry?.name || state.selectedCountry}` : flowModeLabel(state.flowMode),
      `Top ${model.topCategories.length || 0}/${model.context.categoryLimit}`,
      model.context.minShare ? `最小份额 ≥ ${(model.context.minShare * 100).toFixed(1)}%` : "不过滤小流"
    ];
    DOM.flowContextChips.innerHTML = chips
      .map((chip) => `<span class="country-context-chip">${escapeHtml(chip)}</span>`)
      .join("");
  }

  function renderFlowBarList(container, rows, options = {}) {
    if (!container) return;
    const list = rows || [];
    if (!list.length) {
      container.innerHTML = `<div class="analysis-item is-empty"><span>类别结构</span><strong>暂无</strong><em>当前口径没有可展示的 Top 类别。</em></div>`;
      return;
    }
    const max = Math.max(1, ...list.map((item) => Number(item.value || item.chinaImport || 0)));
    container.innerHTML = list
      .map((item) => {
        const value = Number(item.value || item.chinaImport || 0);
        const share = Number(item.share || 0);
        const color = item.color || CYAN_LINE;
        return `
          <div class="flow-bar-row">
            <div class="flow-bar-label">
              <strong title="${escapeHtml(item.name || item.categoryName || item.id)}">${escapeHtml(
          item.name || item.categoryName || item.id
        )}</strong>
              <span>${options.valueLabel === "share" ? `${(share * 100).toFixed(1)}%` : formatTradeValue(value)}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.max(4, (value / max) * 100)}%;background:${color};"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderFlowTargetList(container, rows) {
    if (!container) return;
    const list = rows || [];
    if (!list.length) {
      container.innerHTML = `<div class="analysis-item is-empty"><span>目标排行</span><strong>暂无</strong><em>当前口径没有目标流向。</em></div>`;
      return;
    }
    const max = Math.max(1, ...list.map((item) => Number(item.value || 0)));
    container.innerHTML = list
      .map((item, index) => `
        <div class="flow-target-item">
          <span class="ranking-index">${index + 1}</span>
          <div class="flow-target-main">
            <strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
            <small>${formatTradeValue(item.value)} · ${(Number(item.share || 0) * 100).toFixed(1)}%</small>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.max(4, (Number(item.value || 0) / max) * 100)}%;"></div>
            </div>
          </div>
        </div>
      `)
      .join("");
  }

  function renderFlowConcentration(concentration = {}, categoryLimit = 6) {
    if (!DOM.flowConcentrationBars) return;
    const rows = [
      ["Top 1 类别", Number(concentration.top1 || 0)],
      ["Top 3 类别", Number(concentration.top3 || 0)],
      [`Top ${Math.min(6, Number(categoryLimit || 6))} 类别`, Number(concentration.top6 || 0)]
    ];
    DOM.flowConcentrationBars.innerHTML = rows
      .map(([label, value]) => `
        <div class="flow-concentration-row">
          <div><span>${escapeHtml(label)}</span><strong>${(value * 100).toFixed(1)}%</strong></div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.max(2, Math.min(100, value * 100))}%;"></div>
          </div>
        </div>
      `)
      .join("");
  }

  function renderTargetAnalysis() {
    if (!state.bundle) return;

    const products = state.bundle.products
      .filter((product) => !product.scope || state.selectedScope === "all_goods" || product.scope === state.selectedScope)
      .filter((product) => productCategoryMatches(product, state.selectedCategory))
      .filter((product) => productTopicMatches(product, state.selectedTopicTag))
      .filter((product) => Number(product.vulnerability || 0) >= state.threshold)
      .sort((a, b) => Number(b.vulnerability || 0) - Number(a.vulnerability || 0))
      .slice(0, TARGET_LIMIT);

    if (!products.length) {
      setText("productTitle", "当前筛选下暂无产品");
      setText("productCategoryMeta", "请调整专题标签 / 商品范围");
      setText("productDetail", "当前阈值、范围或专题标签组合下没有可展示的 HS6 脆弱性产品。");
      if (DOM.targetSpotlightList) {
        DOM.targetSpotlightList.innerHTML =
          '<div class="hs6-item"><strong>暂无高关注产品</strong><span>请切换专题标签、商品类别或降低阈值。</span></div>';
      }
      return;
    }

    if (!products.some((item) => item.hs6 === state.selectedProduct)) {
      state.selectedProduct = products[0].hs6;
    }

    charts.renderTarget?.({
      products,
      selectedProduct: state.selectedProduct,
      categoryById,
      spotlightEl: DOM.targetSpotlightList,
      onSelectProduct: (hs6) => {
        state.selectedProduct = hs6;
        renderTargetAnalysis();
      },
      setText
    });
  }

  function productCategoryMatches(product, selectedCategory) {
    if (!selectedCategory || selectedCategory === "all") return true;

    const ref = resolveCategoryRef(selectedCategory, state.categoryDimension);
    const categoryId = ref.proxyCategoryId || ref.id;

    return (
      product.categoryId === categoryId ||
      product.analysisMinorId === categoryId ||
      product.analysisMajorId === categoryId ||
      product.category === categoryId
    );
  }

  function productTopicMatches(product, selectedTopicTag) {
    if (!selectedTopicTag || selectedTopicTag === "all") return true;
    const tags = []
      .concat(String(product.topicTags || "").split(/[|,;]/))
      .concat(String(product.topicTagIds || "").split(/[|,;]/))
      .map((item) => item.trim())
      .filter(Boolean);
    return tags.includes(selectedTopicTag);
  }

  /**
   * --------------------------------------------------------------------------
   * Chart callbacks
   * --------------------------------------------------------------------------
   */

  async function handleCountryCategoryClick(params) {
    const categoryId = params?.data?.categoryId;
    if (!categoryId) return;

    state.categoryDimension = "analysis_minor";
    state.selectedCategory = categoryId;

    await hydrateActiveSelection();
    syncControlsFromState();
    renderAll();
  }

  function handleMatrixHover(params) {
    if (params?.isGlobalOut) {
      state.matrixHoverFocus = null;
      const model = buildMatrixModel();
      renderMatrixFocus(model);
      charts.renderMatrixCellDistribution?.({
        cells: model.cellDistribution,
        focusCell: model.focusCell
          ? {
              country: model.focusCountry,
              category: model.focusCategory,
              value: matrixCellMetricValue(model.focusCell)
            }
          : null,
        metricLabel: matrixMetricLabel()
      });
      return;
    }

    const data = params?.data || {};
    const iso3 = data.countryIso3;
    const categoryId = data.categoryId;
    if (!iso3 || !categoryId) return;

    state.matrixHoverFocus = { countryIso3: iso3, categoryId };
    const model = buildMatrixModel();
    renderMatrixFocus(model);
    charts.renderMatrixCellDistribution?.({
      cells: model.cellDistribution,
      focusCell: model.focusCell
        ? {
            country: model.focusCountry,
            category: model.focusCategory,
            value: matrixCellMetricValue(model.focusCell)
          }
        : null,
      metricLabel: matrixMetricLabel()
    });

    if (cesiumState.hoveredIso3 !== iso3) {
      cesiumState.hoveredIso3 = iso3;
      if (activePrimarySection() === "overview") {
        updateCountryHeat();
        updateCountryBorders();
        updateTradeFlows();
        queueLabelRender();
      }
    }
  }

  async function handleMatrixClick(params) {
    if (params?.componentType === "xAxis") {
      const category = (state.lastMatrixCategories || []).find((item) => item.name === params.value);
      if (!category) return;
      state.categoryDimension = state.matrixCategoryLevel;
      state.selectedCategory = category.id;
      state.matrixFocus = {
        countryIso3: state.matrixFocus?.countryIso3 || state.selectedCountry,
        categoryId: category.id
      };
      state.matrixHoverFocus = null;
      await hydrateActiveSelection();
      syncControlsFromState();
      renderAll();
      return;
    }

    if (params?.componentType === "yAxis") {
      const country = (state.lastMatrixCountries || []).find((item) => item.name === params.value);
      if (!country) return;
      state.matrixFocus = {
        countryIso3: country.iso3,
        categoryId: state.matrixFocus?.categoryId || state.selectedCategory || "all"
      };
      state.matrixHoverFocus = null;
      await selectCountry(country.iso3, { flyTo: false });
      syncControlsFromState();
      renderAll();
      return;
    }

    const data = params?.data || {};
    if (!data.countryIso3) return;
    state.matrixFocus = {
      countryIso3: data.countryIso3,
      categoryId: data.categoryId
    };
    state.matrixHoverFocus = null;
    state.categoryDimension = state.matrixCategoryLevel;
    state.selectedCategory = data.categoryId || "all";
    await hydrateActiveSelection();
    await selectCountry(data.countryIso3, { flyTo: true });
    syncControlsFromState();
    renderAll();
  }

  function handleTargetClick(params) {
    const hs6 = params?.data?.hs6;
    if (!hs6) return;

    state.selectedProduct = hs6;
    renderTargetAnalysis();
  }

  /**
   * --------------------------------------------------------------------------
   * Helpers
   * --------------------------------------------------------------------------
   */

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value ?? "-");
  }

  function setHtml(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = String(value ?? "");
  }

  function resizeCesium() {
    if (!cesiumState.viewer) return;

    cesiumState.viewer.resolutionScale = getPreferredResolutionScale();
    cesiumState.viewer.resize();
    cesiumState.viewer.scene.requestRender();
  }

  function showGlobeBootError(message, clear = true) {
    if (!DOM.globeWrap) return;

    if (clear) {
      DOM.globeWrap.querySelector("#globe")?.replaceChildren();
    }

    let box = DOM.globeWrap.querySelector(".globe-error");

    if (!box) {
      box = document.createElement("div");
      box.className = "globe-error";
      DOM.globeWrap.appendChild(box);
    }

    box.innerHTML = `
      <strong>3D 鍦扮悆鍔犺浇鎻愮ず</strong>
      <span>${escapeHtml(message)}</span>
    `;
  }

  function fallbackDebounce(fn, wait) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function fallbackEscapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function fallbackFormatTradeValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}B`;
    if (number >= 1_000) return `${(number / 1_000).toFixed(2)}M`;
    return `${number.toFixed(0)}K`;
  }

  function fallbackCssColorForValue(value) {
    const v = Number(value || 0);
    if (v >= 0.75) return "#d7263d";
    if (v >= 0.55) return "#ff6b4a";
    if (v >= 0.35) return "#f5b84b";
    if (v >= 0.18) return "#2dd4bf";
    return "#2f81f7";
  }
})();


