import { store, getContext } from "@wordpress/interactivity";
import {
  calculateBarData,
  buildBarHtml,
  getCartTotalFromStore,
} from "./helpers";

/**
 * Store definition for Free Shipping Bar
 */
const { actions } = store("yayboost/shipping-bar", {
  actions: {
    /**
     * Update bar data from cart and rebuild HTML content
     * Called when WooCommerce cart updates
     */
    updateFromCart() {
      // Calculate bar data (gets everything from window)
      const barData = calculateBarData();
      if (!barData) {
        return;
      }

      // Build HTML content
      const htmlContent = buildBarHtml(barData);
      if (htmlContent) {
        // Update DOM directly
        const blockElement = document.querySelector(
          '[data-wp-interactive="yayboost/shipping-bar"]'
        );
        if (blockElement) {
          blockElement.innerHTML = htmlContent;
        }
      }
    },
  },

  callbacks: {
    /**
     * Initialize and subscribe to WooCommerce cart store changes
     */
    init() {
      const { subscribe } = window.wp.data;

      if (!subscribe) {
        return;
      }

      // Subscribe to changes in wp.data store
      // This will run whenever any state in wp.data changes
      let previousCartTotal = getCartTotalFromStore();

      subscribe(() => {
        const currentCartTotal = getCartTotalFromStore();

        if (!currentCartTotal) return;

        // Only update if cart total actually changed
        if (currentCartTotal !== previousCartTotal) {
          previousCartTotal = currentCartTotal;
          actions.updateFromCart();
        }
      });
    },
  },
});
