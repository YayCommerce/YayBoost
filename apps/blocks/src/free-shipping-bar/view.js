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
    updateFromCart(ctx) {
      // IMPORTANT: do not call getContext() here (this function is triggered outside directive scope)
      const context = ctx;
      if (!context) return;

      // Calculate bar data (gets everything from window)
      const barData = calculateBarData();
      if (!barData) {
        return;
      }

      // Update context with bar data
      context.threshold = barData.threshold;
      context.current = barData.current;
      context.remaining = barData.remaining;
      context.progress = barData.progress;
      context.achieved = barData.achieved;
      context.message = barData.message;

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
      // IMPORTANT: capture context here (valid scope)
      const context = getContext();
      if (!context) {
        console.warn("[YayBoost] Context not available");
        return;
      }

      // Check if wp.data and WooCommerce store are available
      if (!window.wp?.data) {
        console.warn("[YayBoost] wp.data not available");
        return;
      }

      const { subscribe } = window.wp.data;

      // Subscribe to changes in wp.data store
      // This will run whenever any state in wp.data changes
      let previousCartTotal = getCartTotalFromStore();

      subscribe(() => {
        const currentCartTotal = getCartTotalFromStore();

        if (!currentCartTotal) return;

        // Only update if cart total actually changed
        if (currentCartTotal !== previousCartTotal) {
          previousCartTotal = currentCartTotal;
          actions.updateFromCart(context);
        }
      });
    },
  },
});
