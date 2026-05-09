(function () {
  "use strict";

  const DATA_ROOT = "./public/data/processed";
  const ANNUAL_ROOT = `${DATA_ROOT}/annual`;
  const DRILLDOWN_ROOT = `${DATA_ROOT}/drilldown`;
  const FULL_ROOT = `${DATA_ROOT}/full`;

  const cache = {
    json: new Map(),
    csv: new Map(),
    year: new Map(),
    countryDetail: new Map(),
    countryTrend: null,
    categoryTrend: null,
    supplierStructure: new Map(),
    dependencyBreadth: new Map(),
    structuralChange: new Map(),
    fullMatrix: new Map(),
    fullTopicMatrix: new Map(),
    matrixMinorTop: new Map(),
    matrixChapterTop: new Map(),
    flowMajor: new Map(),
    productTop: new Map(),
    minorDrilldown: new Map(),
    chapterDrilldown: new Map(),
    topicDrilldown: new Map()
  };

  async function fetchText(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.text();
  }

  async function loadJson(path) {
    if (cache.json.has(path)) return cache.json.get(path);
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const data = await response.json();
    cache.json.set(path, data);
    return data;
  }

  async function loadCsv(path) {
    if (cache.csv.has(path)) return cache.csv.get(path);
    const text = await fetchText(path);
    const rows = parseCsv(text);
    cache.csv.set(path, rows);
    return rows;
  }

  async function loadFirstJson(paths, required = true) {
    let lastError = null;
    for (const path of paths) {
      try {
        return await loadJson(path);
      } catch (error) {
        lastError = error;
      }
    }
    if (required) throw lastError || new Error(`Failed to load JSON from ${paths.join(", ")}`);
    return null;
  }

  async function loadFirstCsv(paths, required = true) {
    let lastError = null;
    for (const path of paths) {
      try {
        return await loadCsv(path);
      } catch (error) {
        lastError = error;
      }
    }
    if (required) throw lastError || new Error(`Failed to load CSV from ${paths.join(", ")}`);
    return [];
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (quoted) {
        if (char === '"' && next === '"') {
          value += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          value += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === ",") {
        row.push(value);
        value = "";
      } else if (char === "\n") {
        row.push(value);
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
        value = "";
      } else if (char !== "\r") {
        value += char;
      }
    }
    if (value || row.length) {
      row.push(value);
      rows.push(row);
    }
    const headers = rows.shift() || [];
    return rows.map((cells) =>
      Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
    );
  }

  function num(value, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeCountry(row) {
    return {
      year: num(row.year),
      iso3: row.iso3,
      name: row.country || row.name || row.iso3,
      country: row.country || row.name || row.iso3,
      rank: num(row.rank),
      cdi: num(row.cdi),
      totalImport: num(row.totalImport),
      chinaImport: num(row.chinaImport),
      hhi: num(row.hhi),
      vulnerability: num(row.vulnerability),
      topCategory: row.topCategory || "",
      region: row.region || "Unclassified",
      incomeGroup: row.incomeGroup || "Unclassified",
      lon: row.lon === null ? null : num(row.lon, null),
      lat: row.lat === null ? null : num(row.lat, null),
      scope: row.scope || "manufactures",
      scopes: row.scopes || {}
    };
  }

  function normalizeMatrix(row, categoryIds) {
    const categoryName = row.categoryName || row.category || "";
    const categoryId =
      row.categoryId || categoryIds.get(categoryName) || row.category || categoryName;
    return {
      year: num(row.year),
      iso3: row.iso3,
      country: row.country,
      category: categoryName,
      categoryName,
      categoryId,
      categoryLevel: row.categoryLevel || "group",
      parentGroupId: row.parentGroupId || "",
      scope: row.scope || "manufactures",
      importValue: num(row.importValue || row.totalImport),
      chinaImport: num(row.chinaImport),
      dependency: num(row.dependency),
      hhi: num(row.hhi),
      importance: num(row.importance),
      vulnerability: num(row.vulnerability),
      totalImport: num(row.totalImport)
    };
  }

  function normalizeTopicMatrix(row) {
    return {
      year: num(row.year),
      iso3: row.iso3,
      country: row.country,
      category: row.topicName || row.topicTag || "",
      categoryName: row.topicName || row.topicTag || "",
      categoryId: row.topicTag || "",
      categoryLevel: "topic_tag",
      parentGroupId: "",
      scope: row.scope || "manufactures",
      importValue: num(row.totalImport),
      chinaImport: num(row.chinaImport),
      dependency: num(row.dependency),
      hhi: num(row.hhi),
      importance: num(row.importance),
      vulnerability: num(row.vulnerability),
      totalImport: num(row.totalImport)
    };
  }

  function normalizeProduct(row, categoryIds) {
    const categoryName = row.categoryName || row.category || "";
    const groupCategoryId =
      row.groupCategoryId ||
      categoryIds.get(row.groupCategoryName) ||
      row.groupCategoryName ||
      "";
    return {
      year: num(row.year),
      hs6: row.hs6,
      name: row.productName || row.name,
      category: groupCategoryId || row.categoryId || categoryIds.get(categoryName) || categoryName,
      categoryId: row.categoryId || categoryIds.get(categoryName) || categoryName,
      categoryName,
      groupCategoryId,
      groupCategoryName: row.groupCategoryName || "",
      topicTags: row.topicTags || "",
      topicTagIds: row.topicTagIds || "",
      scope: row.scope || "manufactures",
      globalImport: num(row.globalImport),
      chinaGlobalSupply: num(row.chinaGlobalSupply),
      chinaGlobalShare: num(row.chinaGlobalShare),
      avgDependency: num(row.avgDependency),
      maxDependency: num(row.maxDependency),
      avgHhi: num(row.avgHhi),
      dependentCountryCount: num(row.dependentCountryCount),
      vulnerability: num(row.vulnerability),
      strategic: num(row.vulnerability) >= 0.65
    };
  }

  function createBundle(countries, flows, matrix, topicMatrix, products, flowMajor) {
    const bundle = {
      countries,
      flows,
      matrix: [],
      topicMatrix: [],
      products: [],
      matrixIndex: new Map(),
      topicIndex: new Map(),
      productIndex: new Map(),
      loadedMinor: new Set(),
      loadedChapters: new Set(),
      loadedTopics: new Set(),
      loadedMatrixMinorTop: false,
      loadedMatrixChapterTop: false,
      loadedFullMatrix: false,
      loadedFullTopicMatrix: false,
      loadedProductTop: false,
      flowMajor: flowMajor || null
    };
    mergeMatrixRows(bundle, matrix);
    mergeTopicRows(bundle, topicMatrix);
    mergeProducts(bundle, products);
    return bundle;
  }

  function mergeMatrixRows(bundle, rows, options = {}) {
    const replace = Boolean(options.replace);
    (rows || []).forEach((row) => {
      const key = `${row.scope || "manufactures"}::${row.categoryLevel || "group"}::${row.iso3}::${row.categoryId}`;
      if (bundle.matrixIndex.has(key)) {
        if (!replace) return;
        const index = bundle.matrix.findIndex(
          (item) =>
            `${item.scope || "manufactures"}::${item.categoryLevel || "group"}::${item.iso3}::${item.categoryId}` === key
        );
        if (index >= 0) bundle.matrix[index] = row;
        bundle.matrixIndex.set(key, row);
        return;
      }
      bundle.matrix.push(row);
      bundle.matrixIndex.set(key, row);
    });
  }

  function mergeTopicRows(bundle, rows, options = {}) {
    const replace = Boolean(options.replace);
    (rows || []).forEach((row) => {
      const key = `${row.scope || "manufactures"}::${row.iso3}::${row.categoryId}`;
      if (bundle.topicIndex.has(key)) {
        if (!replace) return;
        const index = bundle.topicMatrix.findIndex(
          (item) => `${item.scope || "manufactures"}::${item.iso3}::${item.categoryId}` === key
        );
        if (index >= 0) bundle.topicMatrix[index] = row;
        bundle.topicIndex.set(key, row);
        return;
      }
      bundle.topicMatrix.push(row);
      bundle.topicIndex.set(key, row);
    });
  }

  function mergeProducts(bundle, rows) {
    (rows || []).forEach((row) => {
      const key = row.hs6;
      const previous = bundle.productIndex.get(key);
      if (previous && num(previous.vulnerability) >= num(row.vulnerability)) return;
      if (!previous) {
        bundle.products.push(row);
      } else {
        const index = bundle.products.findIndex((item) => item.hs6 === key);
        if (index >= 0) bundle.products[index] = row;
      }
      bundle.productIndex.set(key, row);
    });
  }

  async function getYearBundle(year, categoryIds) {
    if (cache.year.has(year)) return cache.year.get(year);

    const annualBase = `${ANNUAL_ROOT}/${year}`;
    const [countriesRaw, flows, matrixMajorRaw] =
      await Promise.all([
        loadFirstJson(
          [`${annualBase}/country_dependency.json`, `${DATA_ROOT}/country_dependency_${year}.json`],
          true
        ),
        loadFirstJson(
          [`${annualBase}/globe_major.json`, `${DATA_ROOT}/trade_flows_${year}.json`],
          false
        ),
        loadFirstCsv(
          [
            `${annualBase}/matrix_major.csv`,
            `${FULL_ROOT}/country_category_matrix_${year}.csv`,
            `${DATA_ROOT}/country_category_matrix_${year}.csv`
          ],
          true
        )
      ]);

    const countries = (countriesRaw || []).map(normalizeCountry);
    const matrix = (matrixMajorRaw || []).map((row) => normalizeMatrix(row, categoryIds));

    const bundle = createBundle(
      countries,
      flows || [],
      matrix,
      [],
      [],
      null
    );
    cache.year.set(year, bundle);
    return bundle;
  }

  async function getCountryDetail(iso3, year, scope = "manufactures") {
    const normalizedScope = scope || "manufactures";
    const key = `${year}:${normalizedScope}:${iso3}`;
    if (cache.countryDetail.has(key)) return cache.countryDetail.get(key);
    const detail = await loadFirstJson(
      [
        `${DRILLDOWN_ROOT}/country/${year}/${normalizedScope}/${iso3}.json`,
        `${DRILLDOWN_ROOT}/country/${year}/${iso3}.json`,
        `${DATA_ROOT}/country_detail/${iso3}_${year}.json`
      ],
      true
    );
    cache.countryDetail.set(key, detail);
    return detail;
  }

  async function getCountryTrend() {
    if (cache.countryTrend) return cache.countryTrend;
    cache.countryTrend = await loadCsv(`${DATA_ROOT}/country_dependency_trend.csv`);
    return cache.countryTrend;
  }

  async function getCategoryTrend() {
    if (cache.categoryTrend) return cache.categoryTrend;
    cache.categoryTrend = await loadCsv(`${DATA_ROOT}/category_dependency_trend.csv`);
    return cache.categoryTrend;
  }

  async function getCountrySupplierStructure(year) {
    if (cache.supplierStructure.has(year)) return cache.supplierStructure.get(year);
    const data = await loadFirstJson([`${DATA_ROOT}/country_supplier_structure_${year}.json`], false);
    cache.supplierStructure.set(year, data);
    return data;
  }

  async function getCountryDependencyBreadth(year) {
    if (cache.dependencyBreadth.has(year)) return cache.dependencyBreadth.get(year);
    const data = await loadFirstJson([`${DATA_ROOT}/country_dependency_breadth_${year}.json`], false);
    cache.dependencyBreadth.set(year, data);
    return data;
  }

  async function getCountryStructuralChange(year) {
    if (cache.structuralChange.has(year)) return cache.structuralChange.get(year);
    const data = await loadFirstJson([`${DATA_ROOT}/country_structural_change_${year}.json`], false);
    cache.structuralChange.set(year, data);
    return data;
  }

  async function getMatrixMinorTop(year, categoryIds) {
    if (cache.matrixMinorTop.has(year)) return cache.matrixMinorTop.get(year);
    const rows = await loadFirstCsv([`${ANNUAL_ROOT}/${year}/matrix_minor_top.csv`], false);
    const normalized = (rows || []).map((row) => normalizeMatrix(row, categoryIds));
    cache.matrixMinorTop.set(year, normalized);
    return normalized;
  }

  async function getMatrixMajor(year, categoryIds) {
    const annualBase = `${ANNUAL_ROOT}/${year}`;
    const rows = await loadFirstCsv(
      [`${annualBase}/matrix_major.csv`, `${FULL_ROOT}/country_category_matrix_${year}.csv`],
      false
    );
    return (rows || []).map((row) => normalizeMatrix(row, categoryIds));
  }

  async function getFullMatrix(year, categoryIds) {
    if (cache.fullMatrix.has(year)) return cache.fullMatrix.get(year);
    const rows = await loadFirstCsv(
      [`${FULL_ROOT}/country_category_matrix_${year}.csv`, `${DATA_ROOT}/country_category_matrix_${year}.csv`],
      false
    );
    const normalized = (rows || []).map((row) => normalizeMatrix(row, categoryIds));
    cache.fullMatrix.set(year, normalized);
    return normalized;
  }

  async function getFullTopicMatrix(year) {
    if (cache.fullTopicMatrix.has(year)) return cache.fullTopicMatrix.get(year);
    const rows = await loadFirstCsv(
      [`${FULL_ROOT}/country_topic_matrix_${year}.csv`, `${DATA_ROOT}/country_topic_matrix_${year}.csv`],
      false
    );
    const normalized = (rows || []).map(normalizeTopicMatrix);
    cache.fullTopicMatrix.set(year, normalized);
    return normalized;
  }

  async function getMatrixChapterTop(year, categoryIds) {
    if (cache.matrixChapterTop.has(year)) return cache.matrixChapterTop.get(year);
    const rows = await loadFirstCsv([`${ANNUAL_ROOT}/${year}/matrix_chapter_top.csv`], false);
    const normalized = (rows || []).map((row) => normalizeMatrix(row, categoryIds));
    cache.matrixChapterTop.set(year, normalized);
    return normalized;
  }

  async function getFlowMajor(year) {
    if (cache.flowMajor.has(year)) return cache.flowMajor.get(year);
    const data = await loadFirstJson([`${ANNUAL_ROOT}/${year}/flow_major.json`], false);
    cache.flowMajor.set(year, data);
    return data;
  }

  async function getAnnualFlowMajor(year) {
    return getFlowMajor(year);
  }

  async function getCountryDrilldown(year, iso3, scope = "manufactures") {
    return getCountryDetail(iso3, year, scope);
  }

  async function getProductTop(year, categoryIds) {
    if (cache.productTop.has(year)) return cache.productTop.get(year);
    const rows = await loadFirstCsv(
      [
        `${ANNUAL_ROOT}/${year}/product_vulnerability_top.csv`,
        `${FULL_ROOT}/product_vulnerability_${year}.csv`,
        `${DATA_ROOT}/product_vulnerability_${year}.csv`
      ],
      true
    );
    const normalized = (rows || []).map((row) => normalizeProduct(row, categoryIds));
    cache.productTop.set(year, normalized);
    return normalized;
  }

  async function getMinorDrilldown(year, categoryId) {
    const key = `${year}:${categoryId}`;
    if (cache.minorDrilldown.has(key)) return cache.minorDrilldown.get(key);
    const data = await loadFirstJson([`${DRILLDOWN_ROOT}/minor/${year}/${categoryId}.json`], false);
    cache.minorDrilldown.set(key, data);
    return data;
  }

  async function getChapterDrilldown(year, chapterId) {
    const normalized = String(chapterId || "").startsWith("HS")
      ? String(chapterId)
      : `HS${String(chapterId).padStart(2, "0")}`;
    const key = `${year}:${normalized}`;
    if (cache.chapterDrilldown.has(key)) return cache.chapterDrilldown.get(key);
    const data = await loadFirstJson([`${DRILLDOWN_ROOT}/hs_chapter/${year}/${normalized}.json`], false);
    cache.chapterDrilldown.set(key, data);
    return data;
  }

  async function getTopicDrilldown(year, topicTag) {
    const key = `${year}:${topicTag}`;
    if (cache.topicDrilldown.has(key)) return cache.topicDrilldown.get(key);
    const data = await loadFirstJson([`${DRILLDOWN_ROOT}/topic/${year}/${topicTag}.json`], false);
    cache.topicDrilldown.set(key, data);
    return data;
  }

  async function ensureMatrixMinorTop(bundle, year, categoryIds) {
    if (!bundle || bundle.loadedMatrixMinorTop) return bundle?.matrix || [];
    const rows = await getMatrixMinorTop(year, categoryIds);
    mergeMatrixRows(bundle, rows);
    bundle.loadedMatrixMinorTop = true;
    return rows;
  }

  async function ensureMatrixChapterTop(bundle, year, categoryIds) {
    if (!bundle || bundle.loadedMatrixChapterTop) return bundle?.matrix || [];
    const rows = await getMatrixChapterTop(year, categoryIds);
    mergeMatrixRows(bundle, rows);
    bundle.loadedMatrixChapterTop = true;
    return rows;
  }

  async function ensureFlowMajor(bundle, year) {
    if (!bundle || bundle.flowMajor) return bundle?.flowMajor || null;
    const payload = await getFlowMajor(year);
    bundle.flowMajor = payload || null;
    return bundle.flowMajor;
  }

  async function ensureFullMatrix(bundle, year, categoryIds) {
    if (!bundle || bundle.loadedFullMatrix) return bundle?.matrix || [];
    const rows = await getFullMatrix(year, categoryIds);
    mergeMatrixRows(bundle, rows, { replace: true });
    bundle.loadedFullMatrix = true;
    return rows;
  }

  async function ensureFullTopicMatrix(bundle, year) {
    if (!bundle || bundle.loadedFullTopicMatrix) return bundle?.topicMatrix || [];
    const rows = await getFullTopicMatrix(year);
    mergeTopicRows(bundle, rows, { replace: true });
    bundle.loadedFullTopicMatrix = true;
    return rows;
  }

  async function ensureProductTop(bundle, year, categoryIds) {
    if (!bundle || bundle.loadedProductTop) return bundle?.products || [];
    const rows = await getProductTop(year, categoryIds);
    mergeProducts(bundle, rows);
    bundle.loadedProductTop = true;
    return rows;
  }

  async function ensureMinorDrilldown(bundle, year, categoryId, categoryIds) {
    if (!bundle || !categoryId || bundle.loadedMinor.has(categoryId)) return null;
    const payload = await getMinorDrilldown(year, categoryId);
    if (!payload) return null;

    const rows = (payload.countries || []).map((row) =>
      normalizeMatrix(
        {
          ...row,
          categoryLevel: "fine",
          categoryId: row.categoryId || payload.categoryId,
          categoryName: row.categoryName || payload.categoryName,
          scope: row.scope || payload.scope || "manufactures"
        },
        categoryIds
      )
    );
    const products = (payload.products || []).map((row) =>
      normalizeProduct(
        {
          ...row,
          year,
          categoryId: row.categoryId || payload.categoryId,
          categoryName: row.category || row.categoryName || payload.categoryName,
          scope: row.scope || payload.scope || "manufactures",
          productName: row.productName || row.name
        },
        categoryIds
      )
    );
    mergeMatrixRows(bundle, rows);
    mergeProducts(bundle, products);
    bundle.loadedMinor.add(categoryId);
    return payload;
  }

  async function ensureChapterDrilldown(bundle, year, chapterId, categoryIds) {
    const normalized = String(chapterId || "").startsWith("HS")
      ? String(chapterId)
      : `HS${String(chapterId).padStart(2, "0")}`;
    if (!bundle || !normalized || bundle.loadedChapters.has(normalized)) return null;
    const payload = await getChapterDrilldown(year, normalized);
    if (!payload) return null;

    const rows = (payload.countries || []).map((row) =>
      normalizeMatrix(
        {
          ...row,
          categoryLevel: "hs_chapter",
          categoryId: row.categoryId || payload.chapterId || normalized,
          categoryName: row.categoryName || payload.chapterId || normalized,
          scope: row.scope || payload.scope || "manufactures"
        },
        categoryIds
      )
    );
    const products = (payload.products || []).map((row) =>
      normalizeProduct(
        {
          ...row,
          year,
          categoryId: row.categoryId,
          categoryName: row.category || row.categoryName,
          scope: row.scope || payload.scope || "manufactures",
          productName: row.productName || row.name
        },
        categoryIds
      )
    );
    mergeMatrixRows(bundle, rows);
    mergeProducts(bundle, products);
    bundle.loadedChapters.add(normalized);
    return payload;
  }

  async function ensureTopicDrilldown(bundle, year, topicTag, categoryIds) {
    if (!bundle || !topicTag || bundle.loadedTopics.has(topicTag)) return null;
    const payload = await getTopicDrilldown(year, topicTag);
    if (!payload) return null;

    const rows = (payload.countries || []).map((row) =>
      normalizeTopicMatrix({
        ...row,
        topicTag: row.topicTag || payload.topicTag,
        topicName: row.topicName || payload.topicName,
        scope: row.scope || payload.scope || "manufactures"
      })
    );
    const products = (payload.products || []).map((row) =>
      normalizeProduct(
        {
          ...row,
          year,
          scope: row.scope || payload.scope || "manufactures",
          productName: row.productName || row.name
        },
        categoryIds
      )
    );
    mergeTopicRows(bundle, rows);
    mergeProducts(bundle, products);
    bundle.loadedTopics.add(topicTag);
    return payload;
  }

  window.AppDataLoader = {
    getYearBundle,
    getCountryDetail,
    getCountryTrend,
    getCategoryTrend,
    getCountrySupplierStructure,
    getCountryDependencyBreadth,
    getCountryStructuralChange,
    getAnnualFlowMajor,
    getMatrixMajor,
    getFullMatrix,
    getFullTopicMatrix,
    getMatrixMinorTop,
    getMatrixChapterTop,
    getFlowMajor,
    getCountryDrilldown,
    getProductTop,
    getMinorDrilldown,
    getChapterDrilldown,
    getTopicDrilldown,
    ensureMatrixMinorTop,
    ensureMatrixChapterTop,
    ensureFlowMajor,
    ensureFullMatrix,
    ensureFullTopicMatrix,
    ensureProductTop,
    ensureMinorDrilldown,
    ensureChapterDrilldown,
    ensureTopicDrilldown,
    num
  };
})();
