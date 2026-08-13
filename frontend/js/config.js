(function () {
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const metaOverride = document.querySelector('meta[name="api-base-url"]')?.content;

  window.FK_CONFIG = {
    API_BASE_URL: metaOverride
      || (isLocal ? "http://127.0.0.1:8000" : "https://favors-kitchen.onrender.com"),
  };
})();
