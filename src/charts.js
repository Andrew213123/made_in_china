(function () {
  const { cssColorForValue, escapeHtml, formatTradeValue } = window.AppUtils;

  const charts = {
    trend: null,
    countryTrend: null,
    countryMetricDistribution: null,
    countryCategory: null,
    countryPortfolio: null,
    countrySupplier: null,
    countryStructuralChange: null,
    matrix: null,
    matrixCellDistribution: null,
    sankey: null,
    flowCategoryContribution: null,
    flowTargetComposition: null,
    flowConcentration: null,
    target: null
  };

  const handlers = {
    onCountryCategoryClick: null,
    onMatrixHover: null,
    onMatrixClick: null,
    onTargetClick: null
  };

  function init(options = {}) {
    handlers.onCountryCategoryClick = options.onCountryCategoryClick || null;
    handlers.onMatrixHover = options.onMatrixHover || null;
    handlers.onMatrixClick = options.onMatrixClick || null;
    handlers.onTargetClick = options.onTargetClick || null;

    charts.trend = initChart("trendChart");
    charts.countryTrend = initChart("countryTrendChart");
    charts.countryMetricDistribution = initChart("countryMetricDistributionChart");
    charts.countryCategory = initChart("countryCategoryChart");
    charts.countryPortfolio = initChart("countryCategoryPortfolioChart");
    charts.countrySupplier = initChart("countrySupplierChart");
    charts.countryStructuralChange = initChart("countryStructuralChangeChart");
    charts.matrix = initChart("matrixChart");
    charts.matrixCellDistribution = initChart("matrixCellDistributionChart");
    charts.sankey = initChart("sankeyChart");
    charts.flowCategoryContribution = initChart("flowCategoryContributionChart");
    charts.flowTargetComposition = initChart("flowTargetCompositionChart");
    charts.flowConcentration = initChart("flowConcentrationChart");
    charts.target = initChart("targetChart");

    bindEvents();
  }

  function initChart(id) {
    const element = document.getElementById(id);
    return element && window.echarts ? window.echarts.init(element) : null;
  }

  function bindEvents() {
    if (charts.countryCategory) {
      charts.countryCategory.off("click");
      charts.countryCategory.on("click", (params) => {
        handlers.onCountryCategoryClick?.(params);
      });
    }

    if (charts.countryPortfolio) {
      charts.countryPortfolio.off("click");
      charts.countryPortfolio.on("click", (params) => {
        handlers.onCountryCategoryClick?.(params);
      });
    }

    if (charts.matrix) {
      charts.matrix.off("mouseover");
      charts.matrix.off("globalout");
      charts.matrix.off("click");
      charts.matrix.on("mouseover", (params) => {
        handlers.onMatrixHover?.(params);
      });
      charts.matrix.on("globalout", (params) => {
        handlers.onMatrixHover?.({ ...params, isGlobalOut: true });
      });
      charts.matrix.on("click", (params) => {
        handlers.onMatrixClick?.(params);
      });
    }

    if (charts.target) {
      charts.target.off("click");
      charts.target.on("click", (params) => {
        handlers.onTargetClick?.(params);
      });
    }
  }

  function buildTrendOption(years, series, extraSeries, options = {}) {
    const allValues = series.filter(Number.isFinite);
    if (extraSeries) {
      extraSeries.forEach((s) => s.data.filter(Number.isFinite).forEach((v) => allValues.push(v)));
    }
    const maxValue = allValues.length ? Math.max(...allValues) : 0.7;

    const mainSeries = {
      type: "line",
      data: series,
      smooth: true,
      symbolSize: 6,
      lineStyle: { color: "#ffd166", width: 3 },
      itemStyle: { color: "#ffd166" },
      areaStyle: { color: "rgba(255,209,102,.15)" },
      name: options.name || "当前值"
    };

    const finitePoints = (years || [])
      .map((year, index) => ({ year, index, value: Number(series?.[index]) }))
      .filter((item) => Number.isFinite(item.value));
    if (finitePoints.length) {
      const first = finitePoints[0];
      const current = finitePoints[finitePoints.length - 1];
      const peak = finitePoints.reduce((best, item) =>
        item.value > best.value ? item : best
      );
      mainSeries.markPoint = {
        symbolSize: 44,
        label: { color: "#06111d", fontSize: 10, formatter: "{b}" },
        itemStyle: { color: "#ffd166" },
        data: [
          { name: "起点", coord: [first.year, first.value] },
          { name: "当前", coord: [current.year, current.value] },
          { name: "峰值", coord: [peak.year, peak.value] }
        ]
      };
      mainSeries.markLine = {
        symbol: "none",
        label: { color: "#9fb4c9", fontSize: 10 },
        lineStyle: { color: "rgba(105,229,255,.24)", type: "dashed" },
        data: [2008, 2018, 2020, 2024]
          .filter((year) => (years || []).includes(year))
          .map((year) => ({ name: String(year), xAxis: year }))
      };
    }

    const allSeries = [mainSeries];

    if (extraSeries && extraSeries.length) {
      extraSeries.forEach((s) => {
        allSeries.push({
          type: "line",
          data: s.data,
          smooth: true,
          symbolSize: 4,
          lineStyle: { color: s.color, width: 2, type: s.dash ? "dashed" : "solid" },
          itemStyle: { color: s.color },
          name: s.name
        });
      });
    }

    return {
      backgroundColor: "transparent",
      grid: { left: 42, right: 18, top: 10 + (extraSeries ? 14 : 0), bottom: 28, containLabel: true },
      tooltip: { trigger: "axis" },
      legend: extraSeries
        ? {
            show: true,
            top: 0,
            textStyle: { color: "#9fb4c9", fontSize: 10 },
            itemWidth: 16,
            itemHeight: 8
          }
        : undefined,
      xAxis: {
        type: "category",
        data: years,
        axisLabel: { color: "#9fb4c9", fontSize: 11, margin: 10 }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: Math.max(0.7, Math.ceil(maxValue * 10) / 10),
        axisLabel: { color: "#9fb4c9" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
      },
      series: allSeries
    };
  }

  function renderOverviewTrend({ years, series }) {
    if (!charts.trend) return;
    charts.trend.setOption(buildTrendOption(years, series));
  }

  function renderCountryTrend({ years, series, extraSeries, metricLabel }) {
    if (!charts.countryTrend) return;
    charts.countryTrend.setOption(
      buildTrendOption(years, series, extraSeries, { name: metricLabel || "当前值" })
    );
  }

  function renderCountryMetricDistribution({ countries, currentIso3, metric, metricLabel, stats }) {
    if (!charts.countryMetricDistribution) return;
    const rows = (countries || [])
      .map((country, index) => ({
        name: country.name || country.iso3,
        iso3: country.iso3,
        rank: country.rank,
        value: Number(country?.metricValue ?? country?.[metric] ?? 0),
        jitter: ((index % 7) - 3) * 0.045
      }))
      .filter((item) => Number.isFinite(item.value));

    const guide = {
      median: Number(stats?.median || 0),
      p75: Number(stats?.p75 || 0),
      p90: Number(stats?.p90 || 0)
    };

    charts.countryMetricDistribution.setOption({
      backgroundColor: "transparent",
      grid: { left: 44, right: 28, top: 34, bottom: 42 },
      tooltip: {
        formatter: (params) => {
          const item = params.data || {};
          return [
            `<strong>${escapeHtml(item.name || item.iso3)}</strong>`,
            `${escapeHtml(metricLabel || metric || "value")} ${Number(item.value?.[0] ?? item.metricValue ?? 0).toFixed(2)}`,
            `排名 #${item.rank || "-"}`
          ].join("<br/>");
        }
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 1,
        name: metricLabel || metric || "value",
        nameLocation: "middle",
        nameGap: 28,
        nameTextStyle: { color: "#9fb4c9" },
        axisLabel: { color: "#9fb4c9" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
      },
      yAxis: { type: "value", min: -0.45, max: 0.45, show: false },
      series: [
        {
          type: "scatter",
          data: rows.map((item) => ({
            ...item,
            value: [item.value, item.jitter],
            label: {
              show: item.iso3 === currentIso3,
              formatter: item.iso3,
              position: "top",
              color: "#ffd166",
              fontWeight: 700
            },
            itemStyle: {
              color:
                item.iso3 === currentIso3
                  ? "#aa381e"
                  : "rgba(105,229,255,.35)",
              borderColor: item.iso3 === currentIso3 ? "#ffd166" : "transparent",
              borderWidth: item.iso3 === currentIso3 ? 2 : 0
            },
            symbolSize: item.iso3 === currentIso3 ? 13 : 6
          })),
          markArea: {
            silent: true,
            itemStyle: { color: "rgba(170,56,30,.10)" },
            data: [[{ name: "高值区间", xAxis: guide.p75 }, { xAxis: 1 }]]
          },
          markLine: {
            silent: true,
            symbol: "none",
            label: { color: "#d9e8f7", fontSize: 10, formatter: "{b}" },
            lineStyle: { color: "rgba(238,247,255,.45)", type: "dashed", width: 1 },
            data: [
              { name: "中位数", xAxis: guide.median },
              {
                name: "P75",
                xAxis: guide.p75,
                lineStyle: { color: "rgba(255,209,102,.48)" }
              },
              {
                name: "P90",
                xAxis: guide.p90,
                lineStyle: { color: "rgba(255,138,91,.58)" }
              }
            ]
          }
        }
      ]
    }, true);
  }

  function renderCountryCategory({ categories, metric = "dependency", selectedCategory = "all" }) {
    if (!charts.countryCategory) return;
    const metricLabel = metric === "hhi" ? "来源集中" : metric === "vulnerability" ? "综合风险" : "依赖度";
    const rows = (categories || []).slice(0, 8);

    charts.countryCategory.setOption({
      backgroundColor: "transparent",
      grid: { left: 118, right: 36, top: 18, bottom: 24 },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const item = params.data || {};
          return [
            `<strong>${escapeHtml(item.name || "-")}</strong>`,
            `${metricLabel} ${Number(item.metricValue || 0).toFixed(2)}`,
            `Importance ${Number(item.importance || 0).toFixed(2)}`,
            `综合风险 ${Number(item.vulnerability || 0).toFixed(2)}`
          ].join("<br/>");
        }
      },
      xAxis: {
        type: "value",
        max: 1,
        axisLabel: { color: "#9fb4c9" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
      },
      yAxis: {
        type: "category",
        data: rows.map((item) => item.name),
        inverse: true,
        axisLabel: { color: "#eef7ff", width: 104, overflow: "truncate" }
      },
      series: [
        {
          type: "bar",
          data: rows.map((item) => ({
            value: item.metricValue,
            metricValue: item.metricValue,
            importance: item.importance,
            vulnerability: item.vulnerability,
            categoryId: item.id,
            name: item.name,
            itemStyle: {
              color:
                selectedCategory !== "all" && item.id !== selectedCategory
                  ? "rgba(105,229,255,.22)"
                  : item.color || cssColorForValue(item.vulnerability || item.metricValue || 0)
            }
          })),
          barWidth: 4,
          showBackground: true,
          backgroundStyle: { color: "rgba(255,255,255,.05)" }
        },
        {
          type: "scatter",
          symbolSize: (value, params) => {
            const item = params.data || {};
            return Math.max(8, Math.min(22, 8 + Number(item.importance || 0) * 40));
          },
          data: rows.map((item) => ({
            value: [item.metricValue, item.name],
            metricValue: item.metricValue,
            importance: item.importance,
            vulnerability: item.vulnerability,
            categoryId: item.id,
            name: item.name,
            itemStyle: {
              color:
                selectedCategory !== "all" && item.id !== selectedCategory
                  ? "rgba(159,180,201,.42)"
                  : cssColorForValue(item.vulnerability || item.metricValue || 0),
              borderColor: item.id === selectedCategory ? "#ffd166" : "transparent",
              borderWidth: item.id === selectedCategory ? 2 : 0
            }
          }))
        }
      ]
    });
  }

  function renderCountryCategoryPortfolio({ rows, selectedCategory = "all" }) {
    if (!charts.countryPortfolio) return;
    const dataRows = (rows || []).filter(
      (item) => Number.isFinite(Number(item.importance)) && Number.isFinite(Number(item.dependency))
    );
    const median = (values) => {
      const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
      if (!sorted.length) return 0;
      return sorted[Math.floor(sorted.length / 2)];
    };
    const medianImportance = median(dataRows.map((item) => Number(item.importance)));
    const medianDependency = median(dataRows.map((item) => Number(item.dependency)));
    const maxTrade = Math.max(1, ...dataRows.map((item) => Number(item.chinaImport || 0)));

    charts.countryPortfolio.setOption({
      backgroundColor: "transparent",
      grid: { left: 42, right: 20, top: 24, bottom: 42 },
      tooltip: {
        formatter: (params) => {
          const item = params.data || {};
          return [
            `<strong>${escapeHtml(item.name || "-")}</strong>`,
            `Dependency ${Number(item.dependency || 0).toFixed(2)}`,
            `Importance ${Number(item.importance || 0).toFixed(2)}`,
            `综合风险 ${Number(item.vulnerability || 0).toFixed(2)}`,
            `China Import ${formatTradeValue(Number(item.chinaImport || 0))}`
          ].join("<br/>");
        }
      },
      xAxis: {
        name: "Importance",
        type: "value",
        min: 0,
        max: Math.max(0.12, Math.ceil(Math.max(...dataRows.map((item) => Number(item.importance || 0)), 0.1) * 10) / 10),
        nameTextStyle: { color: "#9fb4c9" },
        axisLabel: { color: "#9fb4c9" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
      },
      yAxis: {
        name: "Dependency",
        type: "value",
        min: 0,
        max: 1,
        nameTextStyle: { color: "#9fb4c9" },
        axisLabel: { color: "#9fb4c9" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
      },
      series: [
        {
          type: "scatter",
          data: dataRows.map((item) => ({
            ...item,
            value: [Number(item.importance || 0), Number(item.dependency || 0)],
            symbolSize: Math.max(8, Math.min(28, 8 + Math.sqrt(Number(item.chinaImport || 0) / maxTrade) * 20)),
            itemStyle: {
              color:
                selectedCategory !== "all" && item.id !== selectedCategory
                  ? "rgba(105,229,255,.20)"
                  : cssColorForValue(Number(item.vulnerability || 0)),
              borderColor: item.id === selectedCategory ? "#ffd166" : "rgba(255,255,255,.16)",
              borderWidth: item.id === selectedCategory ? 2 : 1
            },
            categoryId: item.id
          })),
          markLine: {
            symbol: "none",
            label: { color: "#9fb4c9", fontSize: 10 },
            lineStyle: { color: "rgba(255,255,255,.22)", type: "dashed" },
            data: [{ xAxis: medianImportance }, { yAxis: medianDependency }]
          }
        }
      ]
    });
  }

  function renderCountrySupplier({ supplierProfile }) {
    if (!charts.countrySupplier) return;
    const rows = (supplierProfile?.suppliers || []).slice(0, 5);
    charts.countrySupplier.setOption({
      backgroundColor: "transparent",
      grid: { left: 88, right: 28, top: 16, bottom: 18 },
      tooltip: {
        formatter: (params) => {
          const item = params.data || {};
          return `<strong>${escapeHtml(item.name || "-")}</strong><br/>Share ${(Number(item.value || 0) * 100).toFixed(1)}%`;
        }
      },
      xAxis: {
        type: "value",
        min: 0,
        max: Math.max(0.5, Math.ceil(Math.max(...rows.map((item) => Number(item.share || 0)), 0.3) * 10) / 10),
        axisLabel: { color: "#9fb4c9", formatter: (value) => `${Math.round(value * 100)}%` },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: rows.map((item) => item.name || item.exporter || "-"),
        axisLabel: { color: "#eef7ff", width: 78, overflow: "truncate" }
      },
      series: [
        {
          type: "bar",
          barWidth: 10,
          data: rows.map((item) => ({
            value: Number(item.share || 0),
            name: item.name || item.exporter || "-",
            itemStyle: { color: item.exporter === "CHN" || item.name === "China" ? "#aa381e" : "#69e5ff" }
          })),
          showBackground: true,
          backgroundStyle: { color: "rgba(255,255,255,.05)" }
        }
      ]
    });
  }

  function renderCountryStructuralChange({ structuralChange }) {
    if (!charts.countryStructuralChange) return;
    const base = structuralChange?.dominantCategoryBase || "2007 主导类别";
    const current = structuralChange?.dominantCategoryCurrent || "当前主导类别";
    const baseYear = structuralChange?.baseYear || 2007;
    const year = structuralChange?.year || "";

    charts.countryStructuralChange.setOption({
      backgroundColor: "transparent",
      grid: { left: 18, right: 18, top: 26, bottom: 20 },
      tooltip: {
        formatter: () =>
          `${baseYear}: ${escapeHtml(base)}<br/>${year || "当前"}: ${escapeHtml(current)}`
      },
      xAxis: {
        type: "category",
        data: [String(baseYear), String(year || "当前")],
        axisLabel: { color: "#9fb4c9" },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.18)" } }
      },
      yAxis: { type: "value", min: 0, max: 1, show: false },
      series: [
        {
          type: "line",
          data: [0.35, 0.65],
          symbolSize: 14,
          lineStyle: { color: "#ffd166", width: 3 },
          itemStyle: { color: "#ffd166" },
          label: {
            show: true,
            color: "#eef7ff",
            formatter: (params) => (params.dataIndex === 0 ? base : current),
            width: 130,
            overflow: "break"
          }
        }
      ]
    });
  }

  function renderCountryStructuralChangeV2({
    rows,
    fallback,
    selectedCategory = "all",
    baseYear = 2007,
    currentYear = ""
  }) {
    if (!charts.countryStructuralChange) return;
    const dataRows = (rows || []).filter(
      (item) =>
        Number.isFinite(Number(item.baseRank)) &&
        Number.isFinite(Number(item.currentRank))
    );
    const fallbackBase = fallback?.dominantCategoryBase || "2007 主导类别";
    const fallbackCurrent = fallback?.dominantCategoryCurrent || "当前主导类别";
    const fallbackLevel = fallback?.changedLevel || "结构变化需补充数据";
    const fallbackYear = fallback?.year || currentYear || "当前";

    if (dataRows.length < 2) {
      charts.countryStructuralChange.setOption({
        backgroundColor: "transparent",
        title: {
          text: fallbackLevel,
          subtext: `${baseYear} ${fallbackBase}\n${fallbackYear} ${fallbackCurrent}`,
          left: "center",
          top: "middle",
          textStyle: { color: "#ffd166", fontSize: 14, fontWeight: 700 },
          subtextStyle: {
            color: "#9fb4c9",
            fontSize: 11,
            lineHeight: 18,
            width: 260,
            overflow: "break"
          }
        },
        grid: { left: 36, right: 36, top: 42, bottom: 34 },
        xAxis: { show: false },
        yAxis: { show: false },
        series: []
      }, true);
      return;
    }

    const maxRank = Math.max(
      5,
      ...dataRows.map((item) => Number(item.baseRank || 0)),
      ...dataRows.map((item) => Number(item.currentRank || 0))
    );
    const maxTrade = Math.max(1, ...dataRows.map((item) => Number(item.chinaImport || 0)));
    const shortName = (name) => {
      const text = String(name || "-");
      return text.length > 8 ? `${text.slice(0, 8)}…` : text;
    };
    const series = dataRows.map((item) => {
      const isSelected = selectedCategory !== "all" && String(item.id) === String(selectedCategory);
      const color = cssColorForValue(Number(item.vulnerability || 0));
      const width = Math.max(2, Math.min(7, 2 + Math.sqrt(Number(item.chinaImport || 0) / maxTrade) * 5));
      return {
        type: "line",
        name: item.name,
        smooth: false,
        symbol: "circle",
        symbolSize: isSelected ? 10 : 7,
        lineStyle: {
          color,
          width: isSelected ? width + 2 : width,
          opacity: selectedCategory !== "all" && !isSelected ? 0.22 : 0.82
        },
        itemStyle: {
          color,
          borderColor: isSelected ? "#ffd166" : "rgba(255,255,255,.30)",
          borderWidth: isSelected ? 2 : 1
        },
        label: { show: false },
        emphasis: { focus: "series" },
        data: [
          {
            value: [String(baseYear), Number(item.baseRank)],
            tooltipData: item,
            label: {
              show: true,
              position: "left",
              color: isSelected ? "#ffd166" : "#eef7ff",
              fontSize: 10,
              width: 62,
              overflow: "truncate",
              formatter: shortName(item.name)
            }
          },
          {
            value: [String(currentYear || fallbackYear), Number(item.currentRank)],
            tooltipData: item,
            label: {
              show: true,
              position: "right",
              color: isSelected ? "#ffd166" : "#eef7ff",
              fontSize: 10,
              width: 62,
              overflow: "truncate",
              formatter: shortName(item.name)
            }
          }
        ]
      };
    });

    charts.countryStructuralChange.setOption({
      backgroundColor: "transparent",
      grid: { left: 76, right: 76, top: 34, bottom: 34 },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const item = params.data?.tooltipData || {};
          return [
            `<strong>${escapeHtml(item.name || "-")}</strong>`,
            `${baseYear} 排名 #${item.baseRank || "-"}`,
            `${currentYear || fallbackYear} 排名 #${item.currentRank || "-"}`,
            `Importance ${Number(item.importance || 0).toFixed(2)}`,
            `综合风险 ${Number(item.vulnerability || 0).toFixed(2)}`
          ].join("<br/>");
        }
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: [String(baseYear), String(currentYear || fallbackYear)],
        axisLabel: { color: "#9fb4c9" },
        axisLine: { lineStyle: { color: "rgba(255,255,255,.18)" } },
        splitLine: { show: false }
      },
      yAxis: {
        type: "value",
        inverse: true,
        min: 0.5,
        max: maxRank + 0.5,
        interval: 1,
        axisLabel: { color: "#9fb4c9", formatter: "#{value}" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
      },
      series
    }, true);
  }

  function renderMatrix({
    countries,
    categories,
    getCell,
    metric,
    matrixSort,
    selectedCategory,
    categoryLevel,
    year,
    metaEl
  }) {
    if (!charts.matrix) return;

    const metricKey = metric === "cdi" ? "dependency" : metric;
    const matrix = [];
    countries.forEach((country, rowIndex) => {
      categories.forEach((category, colIndex) => {
        const cell = getCell(country, category);
        const value = Number(cell?.[metricKey] || 0);
        matrix.push({
          value: [colIndex, rowIndex, value],
          countryIso3: country.iso3,
          categoryId: category.id,
          countryName: country.name,
          categoryName: category.name,
          dependency: Number(cell?.dependency || 0),
          hhi: Number(cell?.hhi || 0),
          importance: Number(cell?.importance || 0),
          vulnerability: Number(cell?.vulnerability || 0)
        });
      });
    });

    const axisName = metric === "cdi" ? "Dependency" : metric.toUpperCase();
    charts.matrix.setOption(
      {
        backgroundColor: "transparent",
        tooltip: {
          confine: true,
          formatter: (params) => {
            const item = params.data || {};
            return [
              `<strong>${escapeHtml(item.countryName || "")}</strong>`,
              escapeHtml(item.categoryName || ""),
              `Dependency ${Number(item.dependency || 0).toFixed(2)}`,
              `来源集中 ${Number(item.hhi || 0).toFixed(2)}`,
              `Importance ${Number(item.importance || 0).toFixed(2)}`,
              `综合风险 ${Number(item.vulnerability || 0).toFixed(2)}`
            ].join("<br/>");
          }
        },
        grid: { left: 170, right: 36, top: 48, bottom: 84, containLabel: false },
        xAxis: {
          type: "category",
          data: categories.map((item) => item.name),
          triggerEvent: true,
          axisTick: { alignWithLabel: true, lineStyle: { color: "rgba(255,255,255,.18)" } },
          axisLine: { lineStyle: { color: "rgba(255,255,255,.18)" } },
          axisLabel: {
            color: "#d9ecff",
            rotate: 30,
            interval: 0,
            width: 120,
            overflow: "truncate",
            margin: 10,
            fontSize: 13
          }
        },
        yAxis: {
          type: "category",
          data: countries.map((item) => item.name),
          triggerEvent: true,
          axisTick: { show: false },
          axisLine: { lineStyle: { color: "rgba(255,255,255,.18)" } },
          axisLabel: { color: "#d9ecff", width: 152, overflow: "truncate", fontSize: 15, margin: 12 }
        },
        visualMap: {
          show: false,
          min: 0,
          max: 1,
          inRange: { color: ["#2f81f7", "#2dd4bf", "#f5b84b", "#ff6b4a", "#d7263d"] }
        },
        series: [
          {
            name: axisName,
            type: "heatmap",
            data: matrix,
            progressive: 0,
            emphasis: { itemStyle: { borderColor: "#fff", borderWidth: 2 } },
            itemStyle: { borderWidth: 1, borderColor: "rgba(6,17,31,.88)" }
          }
        ]
      },
      true
    );

    if (metaEl) {
      const levelLabel = {
        analysis_major: "Major categories",
        analysis_minor: "Minor categories"
      };
      const sortLabel = {
        cdi: "Metric sort",
        region: "Region sort",
        income: "Income-group sort",
        category: selectedCategory === "all" ? "Metric sort" : "Selected-category sort"
      };
      metaEl.textContent = `${countries.length} countries · ${levelLabel[categoryLevel] || "Major categories"} · ${
        sortLabel[matrixSort] || "Metric sort"
      } · ${year} · ${metric.toUpperCase()}`;
    }
  }

  function renderMatrixCellDistribution({ cells, focusCell, metricLabel }) {
    if (!charts.matrixCellDistribution) return;

    const values = (cells || [])
      .map((item) => Number(item.value || 0))
      .filter((value) => Number.isFinite(value));
    const binCount = 18;
    const bins = Array.from({ length: binCount }, (_, index) => ({
      label: `${(index / binCount).toFixed(2)}-${((index + 1) / binCount).toFixed(2)}`,
      center: (index + 0.5) / binCount,
      count: 0
    }));

    values.forEach((value) => {
      const index = Math.min(binCount - 1, Math.max(0, Math.floor(value * binCount)));
      bins[index].count += 1;
    });

    const focusValue = Number(focusCell?.value);
    charts.matrixCellDistribution.setOption(
      {
        backgroundColor: "transparent",
        tooltip: {
          confine: true,
          formatter: (params) => {
            const item = bins[params.dataIndex];
            return `${item.label}<br/>Cells ${item.count}`;
          }
        },
        grid: { left: 54, right: 22, top: 28, bottom: 34 },
        xAxis: {
          type: "category",
          data: bins.map((item) => item.center.toFixed(2)),
          axisLabel: { color: "#9fb4c9", interval: 2 },
          axisLine: { lineStyle: { color: "rgba(255,255,255,.16)" } },
          axisTick: { show: false }
        },
        yAxis: {
          type: "value",
          axisLabel: { color: "#9fb4c9", margin: 10 },
          splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
        },
        series: [
          {
            name: metricLabel || "Metric",
            type: "bar",
            data: bins.map((item) => item.count),
            barWidth: "72%",
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
              color: "#2dd4bf"
            },
            markLine:
              Number.isFinite(focusValue)
                ? {
                    symbol: "none",
                    label: {
                      color: "#ffd166",
                      formatter: `${focusValue.toFixed(2)}`,
                      position: "insideEndTop",
                      distance: 8
                    },
                    lineStyle: { color: "#ffd166", width: 2 },
                    data: [
                      {
                        xAxis: bins[Math.min(binCount - 1, Math.max(0, Math.floor(focusValue * binCount)))]?.center.toFixed(
                          2
                        )
                      }
                    ]
                  }
                : undefined
          }
        ]
      },
      true
    );
  }

  function renderEmptyChart(chart, text) {
    if (!chart) return;
    chart.setOption(
      {
        backgroundColor: "transparent",
        graphic: [
          {
            type: "text",
            left: "center",
            top: "middle",
            style: {
              text,
              fill: "rgba(238,247,255,.72)",
              font: "600 13px sans-serif",
              textAlign: "center"
            }
          }
        ],
        xAxis: { show: false },
        yAxis: { show: false },
        series: []
      },
      true
    );
  }

  function renderSankey({ nodes = [], links = [], context = {}, empty = false, totalFlow = 0 }) {
    if (!charts.sankey) return;

    const chartNodes = (nodes || []).map((node) => ({
      ...node,
      label: {
        color: "#eef7ff",
        fontSize: node.layer === "source" ? 12 : 11,
        fontWeight: node.layer === "source" ? 800 : 650,
        width: node.layer === "target" ? 172 : node.layer === "category" ? 150 : 74,
        overflow: "truncate",
        formatter: () => truncateNodeLabel(node.displayName || node.name, node.layer)
      },
      itemStyle: {
        borderColor: node.layer === "source" ? "#fff0b3" : "rgba(255,255,255,.28)",
        borderWidth: node.layer === "source" ? 2 : 1,
        ...(node.itemStyle || {})
      }
    }));
    const chartLinks = (links || [])
      .filter((link) => Number(link.value || 0) > 0)
      .map((link) => ({
        ...link,
        value: Number(link.value || 0),
        lineStyle: {
          color: link.lineColor || "#69e5ff",
          opacity: link.source === "中国" ? 0.5 : 0.34,
          curveness: 0.52
        },
        emphasis: {
          lineStyle: {
            opacity: 0.82
          }
        }
      }));

    if (empty || !chartNodes.length || !chartLinks.length) {
      charts.sankey.setOption(
        {
          backgroundColor: "transparent",
          graphic: [
            {
              type: "group",
              left: "center",
              top: "middle",
              children: [
                {
                  type: "text",
                  style: {
                    text: "当前筛选下暂无可绘制的流向结构",
                    fill: "rgba(238,247,255,.78)",
                    font: "600 14px sans-serif",
                    textAlign: "center"
                  }
                },
                {
                  type: "text",
                  top: 26,
                  style: {
                    text: "请降低最小份额阈值，或切换类别数量 / 流向模式。",
                    fill: "rgba(159,180,201,.72)",
                    font: "12px sans-serif",
                    textAlign: "center"
                  }
                }
              ]
            }
          ],
          series: []
        },
        true
      );
      return;
    }

    charts.sankey.setOption(
      {
        backgroundColor: "transparent",
        color: chartNodes.map((node) => node.itemStyle?.color || "#69e5ff"),
        tooltip: {
          trigger: "item",
          triggerOn: "mousemove",
          appendToBody: true,
          borderColor: "rgba(105,229,255,.32)",
          backgroundColor: "rgba(4,12,24,.94)",
          textStyle: { color: "#eef7ff" },
          formatter: (params) => {
            if (params.dataType === "edge") {
              const data = params.data || {};
              const share = Number(data.share || 0);
              const lines = [
                `<strong>${escapeHtml(data.categoryName || "类别流向")}</strong>`,
                `${escapeHtml(data.targetName || "")}`,
                `金额：${formatTradeValue(Number(data.value || 0))}`,
                `占比：${(share * 100).toFixed(1)}%`,
                `年份：${escapeHtml(String(context.year || ""))}`
              ];
              if (Number.isFinite(Number(data.dependency))) {
                lines.splice(3, 0, `Dependency：${Number(data.dependency || 0).toFixed(2)}`);
              }
              if (Number.isFinite(Number(data.vulnerability))) {
                lines.splice(4, 0, `综合风险：${Number(data.vulnerability || 0).toFixed(2)}`);
              }
              return lines.join("<br/>");
            }

            const data = params.data || {};
            const layerLabel = {
              source: "来源",
              category: "类别",
              target: "目标"
            }[data.layer] || "节点";
            return [
              `<strong>${escapeHtml(data.displayName || data.name || "")}</strong>`,
              `层级：${layerLabel}`,
              `年份：${escapeHtml(String(context.year || ""))}`,
              `总流向：${formatTradeValue(Number(totalFlow || 0))}`
            ].join("<br/>");
          }
        },
        series: [
          {
            type: "sankey",
            top: 24,
            bottom: 24,
            left: 22,
            right: 210,
            nodeWidth: 16,
            nodeGap: context?.categoryLimit > 8 ? 8 : 12,
            layoutIterations: 80,
            draggable: false,
            data: chartNodes,
            links: chartLinks,
            emphasis: {
              focus: "adjacency",
              blurScope: "coordinateSystem",
              itemStyle: { borderColor: "#ffd166", borderWidth: 2 }
            },
            blur: {
              itemStyle: { opacity: 0.24 },
              lineStyle: { opacity: 0.08 }
            },
            label: {
              color: "#eef7ff",
              fontSize: 11,
              width: 170,
              overflow: "truncate"
            },
            lineStyle: {
              opacity: 0.42,
              curveness: 0.52
            },
            levels: [
              {
                depth: 0,
                itemStyle: { color: "#ffd166" },
                lineStyle: { opacity: 0.52 }
              },
              {
                depth: 1,
                lineStyle: { opacity: 0.42 }
              },
              {
                depth: 2,
                itemStyle: { color: "#86a8c7" },
                lineStyle: { opacity: 0.3 }
              }
            ]
          }
        ]
      },
      true
    );
  }

  function truncateNodeLabel(label, layer) {
    const text = String(label || "");
    const max = layer === "target" ? 24 : layer === "category" ? 20 : 8;
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  function renderFlowCategoryContribution({ rows = [], totalFlow = 0, metricLabel = "流向额" } = {}) {
    if (!charts.flowCategoryContribution) return;
    const list = (rows || []).slice(0, 12);
    if (!list.length) {
      renderEmptyChart(charts.flowCategoryContribution, "暂无类别贡献数据");
      return;
    }

    let cumulative = 0;
    const names = list.map((item) => item.name || item.categoryName || item.id);
    const values = list.map((item) => Number(item.value || item.chinaImport || 0));
    const cumulativeShares = values.map((value) => {
      cumulative += value;
      return totalFlow > 0 ? cumulative / totalFlow : 0;
    });

    charts.flowCategoryContribution.setOption(
      {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: (params) => {
            const index = params?.[0]?.dataIndex || 0;
            const item = list[index] || {};
            return [
              `<strong>${escapeHtml(item.name || item.categoryName || item.id || "-")}</strong>`,
              `流向额：${formatTradeValue(values[index])}`,
              `份额：${((Number(item.share || 0)) * 100).toFixed(1)}%`,
              `累计：${((cumulativeShares[index] || 0) * 100).toFixed(1)}%`,
              `Dependency：${Number(item.dependency || 0).toFixed(2)}`,
              `综合风险：${Number(item.vulnerability || 0).toFixed(2)}`
            ].join("<br/>");
          }
        },
        grid: { left: 96, right: 48, top: 28, bottom: 42 },
        legend: {
          top: 0,
          right: 0,
          textStyle: { color: "#9fb4c9" },
          itemWidth: 12,
          itemHeight: 8
        },
        xAxis: {
          type: "category",
          data: names,
          axisLabel: { color: "#9fb4c9", rotate: 30, width: 78, overflow: "truncate" },
          axisLine: { lineStyle: { color: "rgba(255,255,255,.18)" } },
          axisTick: { show: false }
        },
        yAxis: [
          {
            type: "value",
            name: metricLabel,
            axisLabel: { color: "#9fb4c9", formatter: (value) => formatTradeValue(value) },
            splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
          },
          {
            type: "value",
            min: 0,
            max: 1,
            axisLabel: { color: "#9fb4c9", formatter: (value) => `${Math.round(value * 100)}%` },
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: "流向额",
            type: "bar",
            data: values.map((value, index) => ({
              value,
              itemStyle: {
                color: list[index]?.color || "#69e5ff",
                borderRadius: [4, 4, 0, 0]
              }
            })),
            barWidth: "54%"
          },
          {
            name: "累计份额",
            type: "line",
            yAxisIndex: 1,
            data: cumulativeShares,
            smooth: true,
            symbolSize: 7,
            lineStyle: { color: "#ffd166", width: 2.5 },
            itemStyle: { color: "#ffd166" },
            areaStyle: { color: "rgba(255,209,102,.08)" }
          }
        ]
      },
      true
    );
  }

  function renderFlowTargetComposition({ rows = [], totalFlow = 0, modeLabel = "目标" } = {}) {
    if (!charts.flowTargetComposition) return;
    const list = (rows || []).slice(0, 20);
    if (!list.length) {
      renderEmptyChart(charts.flowTargetComposition, "暂无目标承接数据");
      return;
    }

    charts.flowTargetComposition.setOption(
      {
        backgroundColor: "transparent",
        tooltip: {
          formatter: (params) => {
            const value = Number(params.value || 0);
            return [
              `<strong>${escapeHtml(params.name || "-")}</strong>`,
              `承接额：${formatTradeValue(value)}`,
              `份额：${((totalFlow > 0 ? value / totalFlow : 0) * 100).toFixed(1)}%`,
              `模式：${escapeHtml(modeLabel)}`
            ].join("<br/>");
          }
        },
        series: [
          {
            type: "treemap",
            roam: false,
            nodeClick: false,
            breadcrumb: { show: false },
            left: 2,
            right: 2,
            top: 6,
            bottom: 2,
            label: {
              color: "#eef7ff",
              fontSize: 11,
              formatter: (params) => {
                const share = totalFlow > 0 ? Number(params.value || 0) / totalFlow : 0;
                return `${truncateNodeLabel(params.name, "target")}\n${(share * 100).toFixed(1)}%`;
              }
            },
            upperLabel: { show: false },
            itemStyle: {
              borderColor: "rgba(4,12,24,.94)",
              borderWidth: 2,
              gapWidth: 2
            },
            levels: [
              {
                color: ["#69e5ff", "#2dd4bf", "#ffd166", "#ff7a59", "#86a8c7"],
                colorMappingBy: "index"
              }
            ],
            data: list.map((item) => ({
              name: item.name || "-",
              value: Number(item.value || 0)
            }))
          }
        ]
      },
      true
    );
  }

  function renderFlowConcentration({ categories = [], targets = [], concentration = {} } = {}) {
    if (!charts.flowConcentration) return;
    const buildCurve = (rows) => {
      let cumulative = 0;
      return (rows || []).map((item, index) => {
        cumulative += Number(item.share || 0);
        return [index + 1, Math.min(1, cumulative)];
      });
    };
    const categoryCurve = buildCurve(categories);
    const targetCurve = buildCurve(targets);
    if (!categoryCurve.length && !targetCurve.length) {
      renderEmptyChart(charts.flowConcentration, "暂无集中度数据");
      return;
    }

    charts.flowConcentration.setOption(
      {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          formatter: (params) =>
            (params || [])
              .map((item) => `${escapeHtml(item.seriesName)} Top ${item.value[0]}：${(item.value[1] * 100).toFixed(1)}%`)
              .join("<br/>")
        },
        legend: {
          top: 0,
          right: 0,
          textStyle: { color: "#9fb4c9" }
        },
        grid: { left: 44, right: 18, top: 34, bottom: 34 },
        xAxis: {
          type: "value",
          min: 1,
          axisLabel: { color: "#9fb4c9", formatter: "Top {value}" },
          splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
        },
        yAxis: {
          type: "value",
          min: 0,
          max: 1,
          axisLabel: { color: "#9fb4c9", formatter: (value) => `${Math.round(value * 100)}%` },
          splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }
        },
        series: [
          {
            name: "类别累计",
            type: "line",
            data: categoryCurve,
            smooth: true,
            symbolSize: 7,
            lineStyle: { width: 3, color: "#ffd166" },
            itemStyle: { color: "#ffd166" },
            markLine: {
              symbol: "none",
              label: { color: "#9fb4c9" },
              lineStyle: { color: "rgba(255,255,255,.18)", type: "dashed" },
              data: [
                { yAxis: Number(concentration.top3 || 0), name: "Top 3 类别" }
              ]
            }
          },
          {
            name: "目标累计",
            type: "line",
            data: targetCurve,
            smooth: true,
            symbolSize: 6,
            lineStyle: { width: 2.4, color: "#69e5ff" },
            itemStyle: { color: "#69e5ff" }
          }
        ]
      },
      true
    );
  }

  function renderTarget({ products, selectedProduct, categoryById, spotlightEl, onSelectProduct, setText }) {
    if (!charts.target) return;

    const { points, galaxyCenters } = buildSupplyGalaxyPoints(products, selectedProduct, categoryById);

    charts.target.setOption({
      backgroundColor: "transparent",
      grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: false },
      tooltip: {
        formatter: (params) => {
          const product = products.find((item) => item.hs6 === params.data.hs6);
          if (!product) return "";
          return [
            `<strong>${escapeHtml(targetProductDisplayName(product))}</strong>`,
            `编码：HS6 ${product.hs6}`,
            `综合风险：${product.vulnerability.toFixed(2)}`,
            `中国供给占比：${(product.chinaGlobalShare * 100).toFixed(1)}%`,
            `高依赖国家：${product.dependentCountryCount} 个`
          ].join("<br/>");
        }
      },
      xAxis: { min: -118, max: 118, show: false },
      yAxis: { min: -106, max: 106, show: false },
      graphic: targetGalaxyGraphics(),
      series: [
        {
          name: "高风险核心区",
          type: "scatter",
          silent: true,
          z: 1,
          symbolSize: 136,
          data: [[0, 0]],
          itemStyle: {
            color: "rgba(255,209,102,.08)",
            borderColor: "rgba(255,209,102,.22)",
            borderWidth: 1.4,
            shadowBlur: 26,
            shadowColor: "rgba(255,209,102,.20)"
          },
          emphasis: { disabled: true }
        },
        {
          name: "产品类别星系",
          type: "scatter",
          silent: true,
          z: 2,
          data: galaxyCenters,
          symbolSize: (value) => value[2],
          label: {
            show: true,
            formatter: (params) => params.data.categoryName,
            color: "rgba(205,225,246,.68)",
            fontSize: 11,
            lineHeight: 14
          },
          itemStyle: {
            color: (params) => withAlpha(params.data.color, 0.11),
            borderColor: (params) => withAlpha(params.data.color, 0.3),
            borderWidth: 1,
            shadowBlur: 14,
            shadowColor: (params) => withAlpha(params.data.color, 0.22)
          },
          emphasis: { disabled: true }
        },
        {
          name: "HS6 产品星球",
          type: "scatter",
          z: 6,
          symbolSize: (value) => Math.max(9, Math.min(52, 10 + Math.sqrt(Number(value[2] || 0) / 1000000) * 4)),
          data: points,
          label: { show: false },
          emphasis: {
            scale: 1.14,
            label: {
              show: true,
              formatter: (params) => params.data.name,
              position: "top",
              color: "#f4f8ff",
              fontWeight: 700,
              fontSize: 12,
              backgroundColor: "rgba(5,16,30,.82)",
              borderColor: "rgba(85,214,232,.4)",
              borderWidth: 1,
              borderRadius: 6,
              padding: [4, 6]
            }
          }
        }
      ]
    });

    renderTargetSpotlight({ products, selectedProduct, spotlightEl, onSelectProduct });
    renderProductDetail({ products, selectedProduct, setText });
  }

  function renderTargetSpotlight({ products, selectedProduct, spotlightEl, onSelectProduct }) {
    if (!spotlightEl) return;

    spotlightEl.innerHTML = products
      .slice(0, 4)
      .map(
        (item) => `
          <button class="story-button ${item.hs6 === selectedProduct ? "is-active" : ""}" data-target-product="${item.hs6}">
            <strong>${escapeHtml(targetProductDisplayName(item))}</strong>
            <span>HS6 ${item.hs6} · 风险 ${item.vulnerability.toFixed(2)} · 中国供给 ${(
          item.chinaGlobalShare * 100
        ).toFixed(1)}%</span>
          </button>
        `
      )
      .join("");

    spotlightEl.querySelectorAll("[data-target-product]").forEach((button) => {
      button.addEventListener("click", () => {
        onSelectProduct?.(button.dataset.targetProduct);
      });
    });
  }

  function renderProductDetail({ products, selectedProduct, setText }) {
    const product = products.find((item) => item.hs6 === selectedProduct) || products[0];
    if (!product) return;

    setText("productTitle", targetProductDisplayName(product));
    setText("productCategoryMeta", `具体产品 HS6 ${product.hs6}`);
    setText(
      "productDetail",
      `这类产品值得关注：综合风险 ${product.vulnerability.toFixed(2)}，中国在全球供给中占 ${(
        product.chinaGlobalShare * 100
      ).toFixed(1)}%，相关国家平均依赖度 ${product.avgDependency.toFixed(2)}，高依赖国家 ${product.dependentCountryCount} 个。`
    );
    setText("productVulnerability", product.vulnerability.toFixed(2));
    setText("productChinaShare", `${(product.chinaGlobalShare * 100).toFixed(1)}%`);
    setText("productAvgDependency", product.avgDependency.toFixed(2));
    setText("productCountryCount", String(product.dependentCountryCount));

    const riskList = document.getElementById("riskList");
    if (!riskList) return;

    riskList.innerHTML = products
      .slice(0, 4)
      .map(
        (item) => `
          <div class="risk-item">
            <strong>${escapeHtml(targetProductDisplayName(item))}</strong>
            <span>具体产品 HS6 ${item.hs6} · 风险 ${item.vulnerability.toFixed(2)} · 中国供给 ${(
          item.chinaGlobalShare * 100
        ).toFixed(1)}%</span>
          </div>
        `
      )
      .join("");
  }

  function targetProductDisplayName(product) {
    if (!product) return "重点产品";
    const categoryName = product.categoryName || product.category || "重点产品";
    return categoryName;
  }

  function buildSupplyGalaxyPoints(products, selectedProduct, categoryById) {
    const groups = new Map();
    products.forEach((product) => {
      const category = product.category || product.categoryId || "unknown";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(product);
    });

    const categories = Array.from(groups.entries())
      .map(([category, rows]) => ({
        category,
        rows: rows.slice().sort((a, b) => Number(b.vulnerability || 0) - Number(a.vulnerability || 0)),
        maxRisk: Math.max(...rows.map((item) => Number(item.vulnerability || 0))),
        totalImport: rows.reduce((sum, item) => sum + Number(item.globalImport || 0), 0),
        meta: categoryById.get(category)
      }))
      .sort((a, b) => b.maxRisk - a.maxRisk || b.totalImport - a.totalImport);

    const categoryCount = Math.max(categories.length, 1);
    const galaxyCenters = [];
    const points = [];

    categories.forEach((group, categoryIndex) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * categoryIndex) / categoryCount;
      const centerX = Math.cos(angle) * 76;
      const centerY = Math.sin(angle) * 58;
      const color = group.meta?.color || "#a5d6ff";
      const categoryName = group.meta?.name || group.rows[0]?.categoryName || group.category;

      galaxyCenters.push({
        value: [centerX, centerY, Math.max(86, Math.min(156, 72 + Math.sqrt(group.rows.length) * 18))],
        categoryName,
        color
      });

      const totalInGroup = Math.max(group.rows.length, 1);
      group.rows.forEach((product, index) => {
        const risk = clamp(Number(product.vulnerability || 0), 0, 1);
        const ringDistance = 12 + (1 - risk) * 88;
        const within = totalInGroup === 1 ? 0 : (index / (totalInGroup - 1) - 0.5);
        const spiral = angle + within * 0.8 + Math.sin(index * 1.618 + categoryIndex) * 0.12;
        const localRadius = Math.sin(index * 2.17) * 5 + (index % 3 - 1) * 2.4;
        const x = Math.cos(spiral) * ringDistance + Math.cos(angle + Math.PI / 2) * localRadius;
        const y = Math.sin(spiral) * ringDistance * 0.78 + Math.sin(angle + Math.PI / 2) * localRadius;
        const dependencyGlow = 6 + Math.min(30, Number(product.dependentCountryCount || 0) / 2.2);
        const isSelected = product.hs6 === selectedProduct;
        const isStrategic = product.strategic || risk >= 0.65;

        points.push({
          value: [x, y, product.globalImport, risk, product.chinaGlobalShare],
          name: targetProductDisplayName(product),
          hs6: product.hs6,
          category: group.category,
          categoryName,
          dependentCountryCount: product.dependentCountryCount,
          itemStyle: {
            color,
            borderColor: isSelected ? "#ffd166" : isStrategic ? "#ffffff" : "rgba(255,255,255,.34)",
            borderWidth: isSelected ? 4 : isStrategic ? 2.5 : 1,
            shadowBlur: isSelected ? dependencyGlow + 14 : dependencyGlow,
            shadowColor: isSelected ? "rgba(255,209,102,.86)" : withAlpha(color, 0.62)
          },
          label: isSelected
            ? {
                show: true,
                formatter: targetProductDisplayName(product),
                position: "top",
                color: "#f8fbff",
                fontWeight: 800,
                fontSize: 12,
                backgroundColor: "rgba(5,16,30,.82)",
                borderColor: "rgba(255,209,102,.55)",
                borderWidth: 1,
                borderRadius: 6,
                padding: [4, 7]
              }
            : { show: false }
        });
      });
    });

    return { points, galaxyCenters };
  }

  function renderMatrixFocus({ country, category, cell, year, setText }) {
    if (!country || !category) return;
    setText("matrixFocusCountry", country.name);
    setText("matrixFocusCategory", category.name);
    setText("matrixFocusDependency", cell.dependency.toFixed(2));
    setText("matrixFocusHhi", cell.hhi.toFixed(2));
    setText("matrixFocusImportance", cell.importance.toFixed(2));
    setText("matrixFocusVulnerability", cell.vulnerability.toFixed(2));
    setText("matrixFocusMeta", `${year} · ${category.name}`);
  }

  function renderInsights({ insightCards, firstYear, latestYear, averageFirst, averageLatest, growth, topProduct }) {
    if (!insightCards?.length) return;

    insightCards[0].innerHTML = `<span>发现 01</span><h3>全球平均依赖${
      averageLatest >= averageFirst ? "上升" : "下降"
    }</h3><p>${firstYear} 到 ${latestYear} 年间，样本国家平均依赖度从 ${averageFirst.toFixed(2)} 变化到 ${averageLatest.toFixed(
      2
    )}。</p>`;
    insightCards[1].innerHTML = `<span>发现 02</span><h3>增长最快国家</h3><p>${
      growth
        ? `${growth.country} 的依赖度增幅最高，较 ${firstYear} 年变化 ${growth.delta.toFixed(2)}。`
        : "当前年份暂无可比较趋势数据。"
    }</p>`;
    insightCards[2].innerHTML = `<span>发现 03</span><h3>高关注产品</h3><p>${
      topProduct
        ? `${topProduct.name} 在 ${latestYear} 年综合风险最高，指标为 ${topProduct.vulnerability.toFixed(2)}。`
        : "暂无产品风险数据。"
    }</p>`;
  }

  function targetGalaxyGraphics() {
    const stars = [
      [9, 18, 1.5], [16, 76, 1], [23, 38, 1.2], [31, 14, 1], [38, 88, 1.5],
      [47, 22, 1], [52, 72, 1.2], [61, 15, 1.4], [68, 83, 1], [75, 28, 1.3],
      [83, 68, 1], [91, 39, 1.5], [96, 17, 1]
    ];

    return [
      {
        type: "circle",
        left: "center",
        top: "middle",
        shape: { r: 92 },
        style: { fill: "rgba(255,209,102,.035)", stroke: "rgba(255,209,102,.16)", lineWidth: 1.2 },
        silent: true
      },
      {
        type: "circle",
        left: "center",
        top: "middle",
        shape: { r: 34 },
        style: { fill: "rgba(255,209,102,.10)", stroke: "rgba(255,255,255,.20)", lineWidth: 1.6 },
        silent: true
      },
      {
        type: "text",
        left: 22,
        top: 18,
        style: {
          text: "供应链星系 · 中心区 = 高风险",
          fill: "rgba(218,232,248,.68)",
          font: "12px Microsoft YaHei"
        },
        silent: true
      },
      ...stars.map(([left, top, radius]) => ({
        type: "circle",
        left: `${left}%`,
        top: `${top}%`,
        shape: { r: radius },
        style: { fill: "rgba(234,246,255,.32)" },
        silent: true
      }))
    ];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function withAlpha(color, alpha) {
    if (!color) return `rgba(165,214,255,${alpha})`;
    if (color.startsWith("rgba")) return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
    if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
    const match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return color;
    const hex = match[1].length === 3
      ? match[1].split("").map((char) => char + char).join("")
      : match[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function resize() {
    Object.values(charts).forEach((chart) => chart && chart.resize());
  }

  window.AppCharts = {
    init,
    renderOverviewTrend,
    renderCountryTrend,
    renderCountryMetricDistribution,
    renderCountryCategory,
    renderCountryCategoryPortfolio,
    renderCountrySupplier,
    renderCountryStructuralChange: renderCountryStructuralChangeV2,
    renderMatrix,
    renderMatrixCellDistribution,
    renderMatrixFocus,
    renderSankey,
    renderFlowCategoryContribution,
    renderFlowTargetComposition,
    renderFlowConcentration,
    renderTarget,
    renderInsights,
    resize
  };
})();

