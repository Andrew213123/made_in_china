window.DASHBOARD_DATA = {
  years: [
    2007, 2008, 2009, 2010, 2011, 2012,
    2013, 2014, 2015, 2016, 2017, 2018,
    2019, 2020, 2021, 2022, 2023, 2024
  ],
  categories: [
    { id: "all", name: "全部制造品", color: "#f5b84b" },
    { id: "electronics", name: "电子电气", color: "#58a6ff" },
    { id: "machinery", name: "机械设备", color: "#67d69a" },
    { id: "transport", name: "交通设备", color: "#ff8b5c" },
    { id: "chemicals", name: "化工产品", color: "#d2a8ff" },
    { id: "metals", name: "金属制品", color: "#c9a46a" },
    { id: "textiles", name: "纺织服装", color: "#f778ba" },
    { id: "precision", name: "精密仪器", color: "#79c0ff" },
    { id: "green", name: "绿色制造品", color: "#8ddb8c" }
  ],
  china: { iso3: "CHN", name: "China", lon: 104.2, lat: 35.9 },
  countries: [
    {
      iso3: "IND",
      name: "India",
      region: "Asia",
      lon: 78.96,
      lat: 20.59,
      cdi: { "2019": 0.34, "2020": 0.36, "2021": 0.39, "2022": 0.42, "2023": 0.45, "2024": 0.47 },
      hhi: 0.49,
      vulnerability: 0.64,
      totalImport: 488,
      chinaImport: 207,
      topCategory: "机械设备",
      categories: {
        electronics: { dependency: 0.62, hhi: 0.56, importance: 0.24, vulnerability: 0.71 },
        machinery: { dependency: 0.58, hhi: 0.49, importance: 0.28, vulnerability: 0.68 },
        transport: { dependency: 0.27, hhi: 0.31, importance: 0.11, vulnerability: 0.34 },
        chemicals: { dependency: 0.41, hhi: 0.39, importance: 0.16, vulnerability: 0.49 },
        textiles: { dependency: 0.53, hhi: 0.44, importance: 0.08, vulnerability: 0.52 },
        precision: { dependency: 0.36, hhi: 0.37, importance: 0.06, vulnerability: 0.43 },
        green: { dependency: 0.69, hhi: 0.61, importance: 0.07, vulnerability: 0.74 }
      }
    },
    {
      iso3: "DEU",
      name: "Germany",
      region: "Europe",
      lon: 10.45,
      lat: 51.17,
      cdi: { "2019": 0.22, "2020": 0.24, "2021": 0.27, "2022": 0.29, "2023": 0.30, "2024": 0.31 },
      hhi: 0.34,
      vulnerability: 0.46,
      totalImport: 711,
      chinaImport: 206,
      topCategory: "电子电气",
      categories: {
        electronics: { dependency: 0.48, hhi: 0.43, importance: 0.22, vulnerability: 0.58 },
        machinery: { dependency: 0.32, hhi: 0.31, importance: 0.25, vulnerability: 0.43 },
        transport: { dependency: 0.18, hhi: 0.26, importance: 0.17, vulnerability: 0.26 },
        chemicals: { dependency: 0.21, hhi: 0.28, importance: 0.14, vulnerability: 0.31 },
        textiles: { dependency: 0.37, hhi: 0.33, importance: 0.04, vulnerability: 0.38 },
        precision: { dependency: 0.29, hhi: 0.30, importance: 0.09, vulnerability: 0.37 },
        green: { dependency: 0.56, hhi: 0.52, importance: 0.07, vulnerability: 0.63 }
      }
    },
    {
      iso3: "USA",
      name: "United States",
      region: "North America",
      lon: -98.58,
      lat: 39.83,
      cdi: { "2019": 0.31, "2020": 0.33, "2021": 0.34, "2022": 0.32, "2023": 0.30, "2024": 0.29 },
      hhi: 0.38,
      vulnerability: 0.51,
      totalImport: 1250,
      chinaImport: 400,
      topCategory: "电子电气",
      categories: {
        electronics: { dependency: 0.52, hhi: 0.45, importance: 0.25, vulnerability: 0.62 },
        machinery: { dependency: 0.41, hhi: 0.39, importance: 0.21, vulnerability: 0.51 },
        transport: { dependency: 0.17, hhi: 0.25, importance: 0.14, vulnerability: 0.25 },
        chemicals: { dependency: 0.19, hhi: 0.26, importance: 0.09, vulnerability: 0.28 },
        textiles: { dependency: 0.46, hhi: 0.37, importance: 0.06, vulnerability: 0.45 },
        precision: { dependency: 0.33, hhi: 0.35, importance: 0.08, vulnerability: 0.41 },
        green: { dependency: 0.39, hhi: 0.42, importance: 0.04, vulnerability: 0.48 }
      }
    },
    {
      iso3: "MEX",
      name: "Mexico",
      region: "North America",
      lon: -102.55,
      lat: 23.63,
      cdi: { "2019": 0.28, "2020": 0.30, "2021": 0.33, "2022": 0.35, "2023": 0.36, "2024": 0.38 },
      hhi: 0.41,
      vulnerability: 0.55,
      totalImport: 392,
      chinaImport: 137,
      topCategory: "机械设备",
      categories: {
        electronics: { dependency: 0.49, hhi: 0.44, importance: 0.19, vulnerability: 0.57 },
        machinery: { dependency: 0.51, hhi: 0.47, importance: 0.25, vulnerability: 0.61 },
        transport: { dependency: 0.22, hhi: 0.29, importance: 0.16, vulnerability: 0.31 },
        chemicals: { dependency: 0.26, hhi: 0.31, importance: 0.12, vulnerability: 0.36 },
        textiles: { dependency: 0.42, hhi: 0.36, importance: 0.05, vulnerability: 0.42 },
        precision: { dependency: 0.35, hhi: 0.34, importance: 0.08, vulnerability: 0.42 },
        green: { dependency: 0.57, hhi: 0.53, importance: 0.06, vulnerability: 0.64 }
      }
    },
    {
      iso3: "VNM",
      name: "Vietnam",
      region: "Asia",
      lon: 108.28,
      lat: 14.06,
      cdi: { "2019": 0.46, "2020": 0.48, "2021": 0.51, "2022": 0.54, "2023": 0.55, "2024": 0.57 },
      hhi: 0.58,
      vulnerability: 0.73,
      totalImport: 216,
      chinaImport: 117,
      topCategory: "电子电气",
      categories: {
        electronics: { dependency: 0.71, hhi: 0.66, importance: 0.31, vulnerability: 0.82 },
        machinery: { dependency: 0.63, hhi: 0.59, importance: 0.24, vulnerability: 0.74 },
        transport: { dependency: 0.33, hhi: 0.38, importance: 0.08, vulnerability: 0.44 },
        chemicals: { dependency: 0.44, hhi: 0.43, importance: 0.12, vulnerability: 0.52 },
        textiles: { dependency: 0.68, hhi: 0.57, importance: 0.12, vulnerability: 0.68 },
        precision: { dependency: 0.42, hhi: 0.44, importance: 0.06, vulnerability: 0.51 },
        green: { dependency: 0.72, hhi: 0.65, importance: 0.05, vulnerability: 0.76 }
      }
    },
    {
      iso3: "BRA",
      name: "Brazil",
      region: "South America",
      lon: -51.93,
      lat: -14.24,
      cdi: { "2019": 0.30, "2020": 0.32, "2021": 0.34, "2022": 0.37, "2023": 0.39, "2024": 0.40 },
      hhi: 0.43,
      vulnerability: 0.56,
      totalImport: 188,
      chinaImport: 70,
      topCategory: "化工产品",
      categories: {
        electronics: { dependency: 0.45, hhi: 0.41, importance: 0.14, vulnerability: 0.51 },
        machinery: { dependency: 0.47, hhi: 0.44, importance: 0.21, vulnerability: 0.56 },
        transport: { dependency: 0.20, hhi: 0.28, importance: 0.12, vulnerability: 0.30 },
        chemicals: { dependency: 0.49, hhi: 0.46, importance: 0.22, vulnerability: 0.59 },
        textiles: { dependency: 0.50, hhi: 0.42, importance: 0.05, vulnerability: 0.49 },
        precision: { dependency: 0.31, hhi: 0.33, importance: 0.07, vulnerability: 0.39 },
        green: { dependency: 0.58, hhi: 0.54, importance: 0.05, vulnerability: 0.65 }
      }
    },
    {
      iso3: "ZAF",
      name: "South Africa",
      region: "Africa",
      lon: 22.94,
      lat: -30.56,
      cdi: { "2019": 0.37, "2020": 0.39, "2021": 0.41, "2022": 0.44, "2023": 0.45, "2024": 0.46 },
      hhi: 0.47,
      vulnerability: 0.61,
      totalImport: 96,
      chinaImport: 42,
      topCategory: "机械设备",
      categories: {
        electronics: { dependency: 0.55, hhi: 0.51, importance: 0.16, vulnerability: 0.62 },
        machinery: { dependency: 0.59, hhi: 0.53, importance: 0.24, vulnerability: 0.67 },
        transport: { dependency: 0.24, hhi: 0.31, importance: 0.15, vulnerability: 0.34 },
        chemicals: { dependency: 0.32, hhi: 0.35, importance: 0.13, vulnerability: 0.42 },
        textiles: { dependency: 0.61, hhi: 0.49, importance: 0.06, vulnerability: 0.58 },
        precision: { dependency: 0.36, hhi: 0.36, importance: 0.05, vulnerability: 0.42 },
        green: { dependency: 0.63, hhi: 0.58, importance: 0.05, vulnerability: 0.69 }
      }
    },
    {
      iso3: "IDN",
      name: "Indonesia",
      region: "Asia",
      lon: 113.92,
      lat: -0.79,
      cdi: { "2019": 0.39, "2020": 0.41, "2021": 0.43, "2022": 0.46, "2023": 0.48, "2024": 0.49 },
      hhi: 0.51,
      vulnerability: 0.66,
      totalImport: 171,
      chinaImport: 79,
      topCategory: "机械设备",
      categories: {
        electronics: { dependency: 0.58, hhi: 0.54, importance: 0.17, vulnerability: 0.65 },
        machinery: { dependency: 0.64, hhi: 0.58, importance: 0.27, vulnerability: 0.73 },
        transport: { dependency: 0.29, hhi: 0.35, importance: 0.11, vulnerability: 0.39 },
        chemicals: { dependency: 0.37, hhi: 0.39, importance: 0.15, vulnerability: 0.48 },
        textiles: { dependency: 0.57, hhi: 0.47, importance: 0.07, vulnerability: 0.55 },
        precision: { dependency: 0.34, hhi: 0.35, importance: 0.05, vulnerability: 0.40 },
        green: { dependency: 0.66, hhi: 0.62, importance: 0.06, vulnerability: 0.73 }
      }
    },
    {
      iso3: "AUS",
      name: "Australia",
      region: "Oceania",
      lon: 133.78,
      lat: -25.27,
      cdi: { "2019": 0.33, "2020": 0.35, "2021": 0.36, "2022": 0.38, "2023": 0.37, "2024": 0.36 },
      hhi: 0.40,
      vulnerability: 0.52,
      totalImport: 164,
      chinaImport: 62,
      topCategory: "纺织服装",
      categories: {
        electronics: { dependency: 0.49, hhi: 0.44, importance: 0.19, vulnerability: 0.57 },
        machinery: { dependency: 0.39, hhi: 0.38, importance: 0.20, vulnerability: 0.49 },
        transport: { dependency: 0.20, hhi: 0.29, importance: 0.12, vulnerability: 0.31 },
        chemicals: { dependency: 0.24, hhi: 0.30, importance: 0.09, vulnerability: 0.34 },
        textiles: { dependency: 0.64, hhi: 0.50, importance: 0.08, vulnerability: 0.61 },
        precision: { dependency: 0.34, hhi: 0.35, importance: 0.07, vulnerability: 0.41 },
        green: { dependency: 0.51, hhi: 0.49, importance: 0.05, vulnerability: 0.58 }
      }
    },
    {
      iso3: "TUR",
      name: "Turkiye",
      region: "Europe/Asia",
      lon: 35.24,
      lat: 38.96,
      cdi: { "2019": 0.27, "2020": 0.29, "2021": 0.32, "2022": 0.35, "2023": 0.37, "2024": 0.39 },
      hhi: 0.42,
      vulnerability: 0.57,
      totalImport: 238,
      chinaImport: 83,
      topCategory: "电子电气",
      categories: {
        electronics: { dependency: 0.53, hhi: 0.47, importance: 0.20, vulnerability: 0.61 },
        machinery: { dependency: 0.49, hhi: 0.45, importance: 0.23, vulnerability: 0.58 },
        transport: { dependency: 0.18, hhi: 0.26, importance: 0.13, vulnerability: 0.27 },
        chemicals: { dependency: 0.35, hhi: 0.37, importance: 0.14, vulnerability: 0.45 },
        textiles: { dependency: 0.46, hhi: 0.39, importance: 0.09, vulnerability: 0.47 },
        precision: { dependency: 0.33, hhi: 0.34, importance: 0.06, vulnerability: 0.40 },
        green: { dependency: 0.61, hhi: 0.57, importance: 0.06, vulnerability: 0.68 }
      }
    }
  ],
  products: [
    { hs6: "850760", name: "Lithium-ion batteries", category: "green", globalImport: 126, chinaGlobalShare: 0.58, avgDependency: 0.54, dependentCountryCount: 86, vulnerability: 0.78, strategic: true },
    { hs6: "854143", name: "Photovoltaic cells", category: "green", globalImport: 98, chinaGlobalShare: 0.71, avgDependency: 0.61, dependentCountryCount: 92, vulnerability: 0.83, strategic: true },
    { hs6: "851762", name: "Communication apparatus", category: "electronics", globalImport: 210, chinaGlobalShare: 0.49, avgDependency: 0.47, dependentCountryCount: 104, vulnerability: 0.69, strategic: true },
    { hs6: "847130", name: "Portable computers", category: "electronics", globalImport: 184, chinaGlobalShare: 0.63, avgDependency: 0.52, dependentCountryCount: 97, vulnerability: 0.74, strategic: false },
    { hs6: "848180", name: "Valves and controls", category: "machinery", globalImport: 78, chinaGlobalShare: 0.32, avgDependency: 0.33, dependentCountryCount: 66, vulnerability: 0.48, strategic: false },
    { hs6: "901890", name: "Medical instruments", category: "precision", globalImport: 88, chinaGlobalShare: 0.24, avgDependency: 0.28, dependentCountryCount: 58, vulnerability: 0.41, strategic: true },
    { hs6: "390120", name: "Polyethylene", category: "chemicals", globalImport: 64, chinaGlobalShare: 0.18, avgDependency: 0.24, dependentCountryCount: 45, vulnerability: 0.34, strategic: false },
    { hs6: "732690", name: "Articles of iron or steel", category: "metals", globalImport: 72, chinaGlobalShare: 0.41, avgDependency: 0.39, dependentCountryCount: 74, vulnerability: 0.55, strategic: false },
    { hs6: "620342", name: "Cotton trousers", category: "textiles", globalImport: 42, chinaGlobalShare: 0.38, avgDependency: 0.42, dependentCountryCount: 72, vulnerability: 0.52, strategic: false },
    { hs6: "870899", name: "Vehicle parts", category: "transport", globalImport: 136, chinaGlobalShare: 0.27, avgDependency: 0.23, dependentCountryCount: 60, vulnerability: 0.37, strategic: false }
  ]
};
