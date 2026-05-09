(function () {
  function debounce(fn, wait) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
    );
  }

  function formatTradeValue(value) {
    if (!Number.isFinite(value)) return "-";
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}B`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}M`;
    return `${value.toFixed(0)}K`;
  }

  function cssColorForValue(value) {
    if (value >= 0.75) return "#d7263d";
    if (value >= 0.55) return "#ff6b4a";
    if (value >= 0.35) return "#f5b84b";
    if (value >= 0.18) return "#2dd4bf";
    return "#2f81f7";
  }

  window.AppUtils = {
    debounce,
    escapeHtml,
    formatTradeValue,
    cssColorForValue
  };
})();
