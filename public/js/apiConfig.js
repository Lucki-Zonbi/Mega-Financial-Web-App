(function configureMegaFinancialApi() {
  const localHostnames =
    new Set([
      "localhost",
      "127.0.0.1"
    ]);

  const renderHostnameSuffix =
    ".onrender.com";

  const productionApiOrigin =
    "https://REPLACE_WITH_YOUR_RENDER_SERVICE.onrender.com";

  function shouldUseSameOriginApi() {
    const hostname =
      window.location.hostname;

    return (
      localHostnames.has(hostname) ||
      hostname.endsWith(
        renderHostnameSuffix
      )
    );
  }

  function getApiUrl(input) {
    if (
      typeof input !== "string" ||
      !input.startsWith("/api/")
    ) {
      return input;
    }

    if (shouldUseSameOriginApi()) {
      return input;
    }

    return (
      productionApiOrigin +
      input
    );
  }

  const nativeFetch =
    window.fetch.bind(window);

  window.fetch = function (
    input,
    init
  ) {
    return nativeFetch(
      getApiUrl(input),
      init
    );
  };

  window.megaFinancialApiConfig =
    Object.freeze({
      getApiUrl,
      productionApiOrigin
    });
})();
