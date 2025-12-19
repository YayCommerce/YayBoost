(function ($) {
  "use strict";

  /**
   * Check and clear cart fragments cache if settings have changed
   * This prevents showing stale HTML when admin changes settings
   */
  function checkAndClearFragmentsCache() {
    const currentHash = yayboostShippingBar?.settingsHash;
    if (!currentHash) return;

    const storageKey = "yayboost_settings_hash";
    const storedHash = sessionStorage.getItem(storageKey);

    if (storedHash && storedHash !== currentHash) {
      // Settings have changed, clear WooCommerce fragments cache
      sessionStorage.removeItem("wc_fragments");
      sessionStorage.removeItem("wc_cart_hash");

      // Also clear any keys that start with wc_fragments
      Object.keys(sessionStorage).forEach(function (key) {
        if (key.indexOf("wc_fragments") === 0 || key.indexOf("wc_cart") === 0) {
          sessionStorage.removeItem(key);
        }
      });
    }

    // Store current hash
    sessionStorage.setItem(storageKey, currentHash);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Check and clear cache immediately when script loads
    checkAndClearFragmentsCache();
  });
})(jQuery);
