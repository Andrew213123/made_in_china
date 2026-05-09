(function () {
  "use strict";

  const utils = window.AppUtils || {};

  const escapeHtml = utils.escapeHtml || ((value) => String(value ?? ""));
  const formatTradeValue =
    utils.formatTradeValue ||
    ((value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return "-";
      if (num >= 1000000) return `${(num / 1000000).toFixed(2)}B`;
      if (num >= 1000) return `${(num / 1000).toFixed(2)}M`;
      return `${num.toFixed(0)}K`;
    });
  const cssColorForValue =
    utils.cssColorForValue ||
    ((value) => {
      const num = Number(value);
      if (num >= 0.75) return "#d7263d";
      if (num >= 0.55) return "#ff6b4a";
      if (num >= 0.35) return "#f5b84b";
      if (num >= 0.18) return "#2dd4bf";
      return "#2f81f7";
    });

  function num(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function average(rows, getter) {
    if (!Array.isArray(rows) || !rows.length) return 0;
    const values = rows.map(getter).filter(Number.isFinite);
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function signed(value, digits = 2) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? `${parsed >= 0 ? "+" : ""}${parsed.toFixed(digits)}`
      : "-";
  }

  function formatPercent(value, digits = 1) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(digits)}%` : "-";
  }

  function setTextSafe(setText, id, value) {
    if (typeof setText === "function") {
      setText(id, value);
      return;
    }
    const element = document.getElementById(id);
    if (element) element.textContent = String(value ?? "-");
  }

  function setHtml(id, html) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = html;
  }

  function computeRank(rows, iso3) {
    const sorted = (rows || [])
      .slice()
      .sort((a, b) => num(b.cdi) - num(a.cdi));
    const index = sorted.findIndex((row) => row.iso3 === iso3);
    return index >= 0 ? index + 1 : null;
  }

  function dependencyLevel(cdi) {
    const value = num(cdi);
    if (value >= 0.5) return "高度依赖";
    if (value >= 0.3) return "中高依赖";
    if (value >= 0.15) return "中等依赖";
    return "较低依赖";
  }

  function concentrationLevel(hhi) {
    const value = num(hhi);
    if (value >= 0.7) return "来源高度集中";
    if (value >= 0.45) return "来源中度集中";
    return "来源较分散";
  }

  function vulnerabilityLevel(value) {
    const parsed = num(value);
    if (parsed >= 0.4) return "高关注";
    if (parsed >= 0.25) return "中等关注";
    return "低关注";
  }

  function buildCountryProfile({
    country,
    state,
    indexData,
    rankedCountries,
    visibleCategories,
    allCategories,
    categoryMetrics,
    countryTrendValue,
    previousYear,
    countries
  }) {
    const years = Array.isArray(indexData?.years) ? indexData.years : [2007];
    const firstYear = Number(years[0] || 2007);
    const prevYear =
      typeof previousYear === "function" ? Number(previousYear()) : firstYear;

    const firstValue =
      typeof countryTrendValue === "function"
        ? num(countryTrendValue(country.iso3, firstYear), num(country.cdi))
        : num(country.cdi);
    const prevValue =
      typeof countryTrendValue === "function"
        ? num(countryTrendValue(country.iso3, prevYear), num(country.cdi))
        : num(country.cdi);

    const scopeMetrics = country?.scopes?.[state?.selectedScope || "manufactures"] || {
      cdi: num(country?.cdi),
      hhi: num(country?.hhi),
      vulnerability: num(country?.vulnerability),
      chinaImport: num(country?.chinaImport),
      totalImport: num(country?.totalImport),
      topCategory: country?.topCategory || ""
    };

    const categorySource =
      (Array.isArray(allCategories) && allCategories.length
        ? allCategories
        : typeof visibleCategories === "function"
          ? visibleCategories()
          : []
      ).filter((category) => category && category.id !== "all");

    const categories = categorySource
      .map((category) => {
        const cell =
          typeof categoryMetrics === "function"
            ? categoryMetrics(country, category.id) || {}
            : {};
        const dependency = num(cell.dependency);
        const importance = num(cell.importance);
        const contributionScore = dependency * importance;
        return {
          id: category.id,
          name: category.name || category.id,
          color: category.color || cssColorForValue(dependency),
          dependency,
          hhi: num(cell.hhi),
          importance,
          vulnerability: num(cell.vulnerability),
          contributionScore,
          value: contributionScore
        };
      })
      .sort((a, b) => b.contributionScore - a.contributionScore);

    const cohort =
      Array.isArray(countries) && countries.length
        ? countries
        : typeof rankedCountries === "function"
          ? rankedCountries()
          : [];
    const regionRows = cohort.filter(
      (row) => String(row.region || "") === String(country.region || "")
    );
    const incomeRows = cohort.filter(
      (row) => String(row.incomeGroup || "") === String(country.incomeGroup || "")
    );

    const globalAvg = average(cohort, (row) => num(row.cdi, NaN));
    const regionAvg = average(regionRows, (row) => num(row.cdi, NaN));
    const incomeAvg = average(incomeRows, (row) => num(row.cdi, NaN));

    return {
      country,
      scopeMetrics,
      categories,
      topCategories: categories.slice(0, 5),
      selectedCategory:
        state?.selectedCategory && state.selectedCategory !== "all"
          ? categories.find((item) => item.id === state.selectedCategory) || null
          : null,
      firstYear,
      previousYear: prevYear,
      firstValue,
      prevValue,
      delta: num(country.cdi) - prevValue,
      periodDelta: num(country.cdi) - firstValue,
      globalAvg,
      regionAvg,
      incomeAvg,
      globalGap: num(country.cdi) - globalAvg,
      regionGap: num(country.cdi) - regionAvg,
      incomeGap: num(country.cdi) - incomeAvg,
      regionRank: computeRank(regionRows, country.iso3),
      regionSize: regionRows.length,
      incomeRank: computeRank(incomeRows, country.iso3),
      incomeSize: incomeRows.length
    };
  }

  function renderOverviewDetail({
    country,
    state,
    profile,
    formatTradeValue: formatValue,
    setText
  }) {
    const formatValueSafe = formatValue || formatTradeValue;
    const scopeMetrics = profile?.scopeMetrics || country;

    setTextSafe(setText, "countryTitle", "全球总览 · 国家聚焦");
    setTextSafe(
      setText,
      "countryMeta",
      `${country.region || "未分类"} / ${country.incomeGroup || "未分类"} / ${state.year} 年国家快照`
    );
    setTextSafe(
      setText,
      "countryIdentityName",
      country.name || country.country || country.iso3
    );
    setTextSafe(
      setText,
      "countryIdentityMeta",
      `${country.region || "未分类"} / ${country.incomeGroup || "未分类"}`
    );
    setTextSafe(setText, "detailYear", state.year);
    setTextSafe(setText, "detailRank", country.rank ? `#${country.rank}` : "-");
    setTextSafe(
      setText,
      "detailTopCategory",
      scopeMetrics.topCategory || country.topCategory || profile?.topCategories?.[0]?.name || "-"
    );
    setTextSafe(setText, "detailCdi", num(scopeMetrics.cdi).toFixed(2));
    setTextSafe(setText, "detailHhi", num(scopeMetrics.hhi).toFixed(2));
    setTextSafe(
      setText,
      "detailVulnerability",
      num(scopeMetrics.vulnerability).toFixed(2)
    );
    setTextSafe(
      setText,
      "detailChinaImport",
      formatValueSafe(num(scopeMetrics.chinaImport))
    );
    setTextSafe(
      setText,
      "detailTotalImport",
      formatValueSafe(num(scopeMetrics.totalImport))
    );
    setTextSafe(setText, "detailPeriodDelta", signed(profile?.periodDelta));
    setTextSafe(setText, "detailDelta", `${signed(profile?.delta)} 较上年`);
  }

  function renderCountryPage({
    country,
    state,
    profile,
    formatTradeValue: formatValue,
    setText
  }) {
    const formatValueSafe = formatValue || formatTradeValue;
    const scopeMetrics = profile?.scopeMetrics || country;
    setTextSafe(
      setText,
      "countryPageTitle",
      `${country.name || country.iso3} / 国家依赖结构画像`
    );
    setTextSafe(
      setText,
      "countryPageIntro",
      "从国家层面拆解当前年份的依赖强度、来源集中度、类别结构、长期变化与结构性脆弱特征。"
    );
    setTextSafe(
      setText,
      "countryPageRank",
      country.rank ? `全球排名 #${country.rank}` : "全球排名 -"
    );
    setTextSafe(setText, "countryPageIdentityName", country.name || country.iso3);
    setTextSafe(
      setText,
      "countryPageIdentityMeta",
      `${country.region || "未分类"} / ${country.incomeGroup || "未分类"}`
    );
    setTextSafe(setText, "countryPageYear", state.year);
    setTextSafe(
      setText,
      "countryPageTopCategory",
      scopeMetrics.topCategory || country.topCategory || profile?.topCategories?.[0]?.name || "-"
    );
    setTextSafe(setText, "countryPageCdi", num(scopeMetrics.cdi).toFixed(2));
    setTextSafe(setText, "countryPageHhi", num(scopeMetrics.hhi).toFixed(2));
    setTextSafe(
      setText,
      "countryPageVulnerability",
      num(scopeMetrics.vulnerability).toFixed(2)
    );
    setTextSafe(setText, "countryPageDelta", signed(profile?.periodDelta));
    setTextSafe(
      setText,
      "countryPageChinaImport",
      formatValueSafe(num(scopeMetrics.chinaImport))
    );
    setTextSafe(
      setText,
      "countryPageTotalImport",
      formatValueSafe(num(scopeMetrics.totalImport))
    );
    setTextSafe(
      setText,
      "countryPageTrendMeta",
      `${state?.selectedScope || "manufactures"} / ${state?.categoryDimension || "analysis_major"} 趋势`
    );
    setTextSafe(setText, "countryPageStage", "中国制造输入结构");
  }

  function renderCountryDiagnosis({ country, profile, contextLabel }) {
    const scopeMetrics = profile?.scopeMetrics || country;
    const diagnosisHtml = [
      {
        label: "依赖水平",
        value: dependencyLevel(scopeMetrics.cdi),
        note: `依赖度 ${num(scopeMetrics.cdi).toFixed(2)}`
      },
      {
        label: "来源结构",
        value: concentrationLevel(scopeMetrics.hhi),
        note: `来源集中 ${num(scopeMetrics.hhi).toFixed(2)}`
      },
      {
        label: "风险关注",
        value: vulnerabilityLevel(scopeMetrics.vulnerability),
        note: `综合风险 ${num(scopeMetrics.vulnerability).toFixed(2)}`
      },
      {
        label: "主导类别",
        value: scopeMetrics.topCategory || country.topCategory || profile?.topCategories?.[0]?.name || "-",
        note: "当前贡献最高的类别"
      },
      {
        label: "当前口径",
        value: contextLabel || "制造品 / 分析大类 / 全部类别",
        note: "右侧分析与左侧筛选保持一致"
      }
    ]
      .map(
        (item) => `
          <div class="signal-stat">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <em>${escapeHtml(item.note)}</em>
          </div>
        `
      )
      .join("");

    setHtml("countryDiagnosisGrid", diagnosisHtml);
    setHtml("countryComparison", "");
  }

  function renderTrendSummary({ years, series, containerId = "countryTrendSummary" }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const points = (years || [])
      .map((year, index) => ({
        year: Number(year),
        value: Number(series?.[index])
      }))
      .filter((item) => Number.isFinite(item.value));

    if (!points.length) {
      container.innerHTML =
        '<div class="trend-summary-item is-empty"><span>趋势摘要</span><strong>暂无</strong><em>当前国家缺少可用时间序列。</em></div>';
      return;
    }

    const first = points[0];
    const current = points[points.length - 1];
    const peak = points.reduce((best, item) =>
      item.value > best.value ? item : best
    );
    const netChange = current.value - first.value;

    container.innerHTML = [
      {
        label: `${first.year} 基线`,
        value: first.value.toFixed(2),
        note: "观察期起点"
      },
      {
        label: "当前值",
        value: current.value.toFixed(2),
        note: `${current.year} 年水平`
      },
      {
        label: "净变化",
        value: signed(netChange),
        note: netChange >= 0 ? "长期抬升" : "长期回落"
      },
      {
        label: "峰值年份",
        value: String(peak.year),
        note: `峰值 ${peak.value.toFixed(2)}`
      }
    ]
      .map(
        (item) => `
          <div class="trend-summary-item">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <em>${escapeHtml(item.note)}</em>
          </div>
        `
      )
      .join("");
  }

  function renderDependencyRanking({
    rows,
    containerId = "topProducts",
    emptyLabel = "依赖度排行",
    limit = 5
  }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const ranking = Array.isArray(rows)
      ? rows
          .filter((row) => Number.isFinite(num(row.dependency, NaN)))
          .sort(
            (a, b) =>
              num(b.dependency) - num(a.dependency) ||
              num(b.importance) - num(a.importance)
          )
          .slice(0, limit)
      : [];

    if (!ranking.length) {
      container.innerHTML = `
        <div class="analysis-item is-empty">
          <span>${escapeHtml(emptyLabel)}</span>
          <strong>等待国家快照</strong>
          <em>当前未加载该国在所选口径下的依赖排行。</em>
        </div>
      `;
      return;
    }

    container.innerHTML = ranking
      .map((row, index) => {
        const width = Math.max(6, Math.min(100, num(row.dependency) * 100));
        const color = row.color || cssColorForValue(num(row.dependency));
        return `
          <div class="ranking-card">
            <div class="ranking-row">
              <span class="ranking-index">${index + 1}</span>
              <div class="ranking-copy">
                <strong>${escapeHtml(row.name || row.categoryName || row.id || "-")}</strong>
                <small>重要性 ${num(row.importance).toFixed(2)} / 综合风险 ${num(row.vulnerability).toFixed(2)}</small>
              </div>
              <span class="ranking-value">${num(row.dependency).toFixed(2)}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${width}%;background:linear-gradient(90deg, ${color}88, ${color});"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderCategoryFocus({
    item,
    rank,
    contextLabel,
    containerId = "topProducts"
  }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!item) {
      container.innerHTML = `
        <div class="analysis-item is-empty">
          <span>当前类别分析</span>
          <strong>暂无</strong>
          <em>当前国家快照中未找到所选类别。</em>
        </div>
      `;
      return;
    }

    const width = Math.max(8, Math.min(100, num(item.dependency) * 100));
    const color = item.color || cssColorForValue(num(item.dependency));
    container.innerHTML = `
      <div class="category-focus-card">
        <div class="category-focus-head">
          <span class="category-focus-kicker">当前类别分析</span>
          <strong>${escapeHtml(item.name || item.categoryName || item.id || "-")}</strong>
          <em>${escapeHtml(contextLabel || "当前筛选口径")}</em>
        </div>
        <div class="category-focus-bar">
          <div class="bar-track">
            <div class="bar-fill" style="width:${width}%;background:linear-gradient(90deg, ${color}88, ${color});"></div>
          </div>
          <strong>${num(item.dependency).toFixed(2)}</strong>
        </div>
        <div class="category-focus-grid">
          <div class="analysis-item">
            <span>重要性</span>
            <strong>${num(item.importance).toFixed(2)}</strong>
          </div>
          <div class="analysis-item">
            <span>脆弱性</span>
            <strong>${num(item.vulnerability).toFixed(2)}</strong>
          </div>
          <div class="analysis-item">
            <span>来源集中</span>
            <strong>${num(item.hhi).toFixed(2)}</strong>
          </div>
          <div class="analysis-item">
            <span>本国排序</span>
            <strong>${Number.isFinite(num(rank, NaN)) ? `#${rank}` : "-"}</strong>
          </div>
        </div>
      </div>
    `;
  }

  function renderCategoryContribution({
    profile,
    containerId = "countryPageCategoryContribution"
  }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rows = (profile?.topCategories || []).slice(0, 5);
    if (!rows.length) {
      container.innerHTML =
        '<div class="analysis-item is-empty"><span>类别贡献</span><strong>暂无</strong><em>当前筛选下没有可展示的类别贡献。</em></div>';
      return;
    }

    container.innerHTML = rows
      .map((row) => {
        const width = Math.max(4, Math.min(100, num(row.dependency) * 100));
        const color = row.color || cssColorForValue(num(row.dependency));
        return `
          <div class="bar-card">
            <div class="bar-row">
              <span>${escapeHtml(row.name)}</span>
              <div class="bar-track">
                <div class="bar-fill" style="width:${width}%;background:linear-gradient(90deg, ${color}99, ${color});"></div>
              </div>
              <strong>${num(row.dependency).toFixed(2)}</strong>
            </div>
            <div class="bar-note">重要性 ${num(row.importance).toFixed(2)} / 贡献得分 ${num(row.contributionScore).toFixed(2)} / 综合风险 ${num(row.vulnerability).toFixed(2)}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderOverviewEvidence({
    detailRecord,
    containerId = "countrySignalGrid",
    scopeLabel = "制造品",
    categoryLabel = "全部类别"
  }) {
    const summaryContainer = document.getElementById(containerId);
    if (!summaryContainer) return;

    if (!detailRecord) {
      summaryContainer.innerHTML =
        '<div class="signal-stat is-loading"><span>结构变化</span><strong>加载中</strong><em>正在读取当前国家在所选口径下的结构变化。</em></div>';
      return;
    }

    const structuralChange = detailRecord.structuralChange || null;
    summaryContainer.innerHTML = [
      {
        label: "结构变化",
        value:
          structuralChange?.changedLevel ||
          (Number.isFinite(num(structuralChange?.structureChange, NaN))
            ? num(structuralChange?.structureChange).toFixed(2)
            : "未提供"),
        note: structuralChange
          ? `${structuralChange.baseYear || 2007} → ${detailRecord.year || ""}`
          : "当前快照未内置结构变化"
      },
      {
        label: "分析范围",
        value: scopeLabel,
        note: "当前商品范围"
      },
      {
        label: "当前类别",
        value: categoryLabel,
        note: "结构证据与左侧筛选保持一致"
      },
      {
        label: "主导类别变化",
        value:
          structuralChange
            ? `${structuralChange.dominantCategoryBase || "-"} → ${structuralChange.dominantCategoryCurrent || "-"}`
            : "未提供",
        note: "观察期首尾的主导类别变化"
      }
    ]
      .map(
        (item) => `
          <div class="signal-stat">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <em>${escapeHtml(item.note)}</em>
          </div>
        `
      )
      .join("");
  }

  function renderSupplierStructure({
    country,
    supplierData,
    supplierProfile,
    containerId = "countrySupplierStructure"
  }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const profile = supplierProfile || supplierData?.[country.iso3];
    if (!profile) {
      container.innerHTML =
        '<div class="analysis-item is-empty"><span>数据状态</span><strong>暂无来源结构</strong><em>国家快照未携带来源结构，或预处理未生成该项。</em></div>';
      return;
    }

    const summary = [
      ["中国供应方排名", profile.chinaRank ? `#${profile.chinaRank}` : "-"],
      ["中国份额", formatPercent(profile.chinaShare)]
    ]
      .map(
        ([label, value]) => `
          <div class="analysis-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `
      )
      .join("");

    const suppliers = (profile.suppliers || [])
      .slice(0, 5)
      .map(
        (supplier) => `
          <div class="supplier-row">
            <div class="supplier-rank">${escapeHtml(supplier.rank)}</div>
            <div class="supplier-name">${escapeHtml(supplier.name || supplier.exporter || "-")}</div>
            <div class="supplier-share">${escapeHtml(formatPercent(supplier.share))}</div>
          </div>
        `
      )
      .join("");

    container.innerHTML = summary + suppliers;
  }

  function renderDependencyBreadth({
    country,
    breadthData,
    breadthProfile,
    containerId = "countryBreadth"
  }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const profile = breadthProfile || breadthData?.[country.iso3];
    if (!profile) {
      container.innerHTML =
        '<div class="analysis-item is-empty"><span>数据状态</span><strong>暂无依赖广度</strong><em>国家快照未携带依赖广度，或预处理未生成该项。</em></div>';
      return;
    }

    const total = Math.max(num(profile.totalHs6Count), 1);
    const supplied = num(profile.chinaSuppliedHs6Count);
    const high = num(profile.highDependencyHs6Count);
    const extreme = num(profile.extremeDependencyHs6Count);
    const bars = [
      ["中国供应覆盖率", num(profile.coverageRatio), "#69e5ff"],
      [">50% 依赖覆盖", num(profile.highDependencyRatio), "#f6c453"],
      [">80% 依赖覆盖", num(profile.extremeDependencyRatio), "#ff8a5b"]
    ];

    container.innerHTML = `
      <div class="breadth-summary-grid">
        <div class="analysis-item">
          <span>HS6 产品总数</span>
          <strong>${escapeHtml(String(Math.round(total)))}</strong>
        </div>
        <div class="analysis-item">
          <span>有中国供应</span>
          <strong>${escapeHtml(String(Math.round(supplied)))}</strong>
        </div>
      </div>
      <div class="breadth-bars">
        ${bars
          .map(
            ([label, ratio, color]) => `
              <div class="breadth-bar-row">
                <div class="breadth-bar-head">
                  <span>${escapeHtml(label)}</span>
                  <strong>${escapeHtml(formatPercent(ratio))}</strong>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${Math.max(4, Math.min(100, num(ratio) * 100))}%;background:linear-gradient(90deg, ${color}99, ${color});"></div>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="breadth-footnote">
        <span>>50% 依赖：${escapeHtml(String(Math.round(high)))}</span>
        <span>>80% 依赖：${escapeHtml(String(Math.round(extreme)))}</span>
      </div>
    `;
  }

  async function renderCountryHs6Products({
    loader,
    country,
    year,
    scope = "manufactures",
    containerId,
    categoryNameFilter,
    limit = 8
  }) {
    const container = document.getElementById(containerId);
    if (!container || !loader?.getCountryDetail) return;

    const requestKey = `${country.iso3}:${year}:${containerId}:${categoryNameFilter || "all"}`;
    container.dataset.requestKey = requestKey;
    container.innerHTML =
      '<div class="hs6-item"><strong>加载中</strong><span>读取国家产品细项</span></div>';

    let detail = null;
    try {
      detail = await loader.getCountryDetail(country.iso3, year, scope);
    } catch (error) {
      console.warn("Country HS6 detail not available:", country.iso3, year, error);
    }

    if (container.dataset.requestKey !== requestKey) return;

    let rows = Array.isArray(detail?.topProducts) ? detail.topProducts.slice() : [];
    if (categoryNameFilter) {
      rows = rows.filter(
        (item) =>
          String(item.category || item.categoryName || "").trim() ===
          String(categoryNameFilter).trim()
      );
    }
    rows = rows.slice(0, limit);

    if (!rows.length) {
      container.innerHTML =
        '<div class="hs6-item"><strong>暂无 HS6 产品</strong><span>当前国家 / 类别组合下没有可展示的重点产品。</span></div>';
      return;
    }

    container.innerHTML = rows
      .map(
        (item) => `
          <div class="hs6-item">
            <strong>${escapeHtml(item.hs6 || "-")} / ${escapeHtml(item.productName || item.name || "-")}</strong>
            <span>依赖度 ${num(item.dependency).toFixed(2)} / 来源集中 ${num(item.hhi).toFixed(2)} / 综合风险 ${num(item.vulnerability).toFixed(2)}</span>
            <span>中国进口额 ${formatTradeValue(num(item.chinaImport))} / 总进口额 ${formatTradeValue(num(item.importValue))}</span>
          </div>
        `
      )
      .join("");
  }

  window.AppDetailPanel = {
    buildCountryProfile,
    renderOverviewDetail,
    renderCountryPage,
    renderCountryDiagnosis,
    renderTrendSummary,
    renderDependencyRanking,
    renderCategoryFocus,
    renderCategoryContribution,
    renderOverviewEvidence,
    renderSupplierStructure,
    renderDependencyBreadth,
    renderCountryHs6Products
  };
})();
