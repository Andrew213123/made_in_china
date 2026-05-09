(function () {
  function createInitialState(indexData) {
    const defaultScope = indexData?.defaults?.scope || "manufactures";
    return {
      year: indexData.years[indexData.years.length - 1],
      activeSection: "overview",
      selectedCountry: "USA",
      selectedScope: defaultScope,
      categoryDimension: "analysis_major",
      selectedCategory: "all",
      selectedTopicTag: "all",
      selectedProduct: "",
      metric: "cdi",
      matrixSort: "cdi",
      matrixCategoryLevel: "analysis_major",
      matrixCountryLimit: 40,
      flowMode: "region",
      flowCategoryLevel: "analysis_major",
      flowSelectedCategory: "all",
      flowSort: "value",
      flowCategoryLimit: 6,
      flowTargetLimit: 0,
      flowMinShare: 0,
      threshold: 0.1,
      heat: true,
      flows: true,
      labels: true,
      particles: false,
      countryFocusActive: false,
      matrixFocus: null,
      matrixHoverFocus: null,
      timer: null,
      bundle: null,
      trend: [],
      analysisScope: "global",
      countryTrendCache: null,
      countryDetailRecord: null,
      supplierStructure: null,
      dependencyBreadth: null,
      structuralChange: null,
      sectionLoad: {},
      loading: false
    };
  }

  window.AppState = {
    createInitialState
  };
})();
