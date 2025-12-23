import { store } from "@wordpress/interactivity";
import {
  calculateBarData,
  getCartTotalFromStore,
  updateShippingBarDOM,
} from "./helpers";

// Try to get WooCommerce cart store (only works in Mini Cart context)
let wcState = null;
try {
  const wcStore = store(
    "woocommerce",
    {},
    {
      lock: "I acknowledge that using a private store means my plugin will inevitably break on the next store release.",
    }
  );
  wcState = wcStore?.state;
} catch (e) {
  // WooCommerce store not available
}
/**
 * Store definition for Free Shipping Bar
 * State is hydrated from PHP via wp_interactivity_state() in render.php
 */
const { state, actions } = store("yayboost/free-shipping-bar", {
  state: {
    // These will be hydrated from PHP via wp_interactivity_state()
    settings: {},
    thresholdInfo: {},
    templates: {},
  },
  actions: {
    /**
     * Update bar data from cart and rebuild HTML content
     * Called when WooCommerce cart updates
     */
    updateFromCart() {
      // Build config from store state
      const config = {
        settings: state.settings,
        thresholdInfo: state.thresholdInfo,
        templates: state.templates,
      };

      // Calculate bar data with config
      const barData = calculateBarData(null, config);
      updateShippingBarDOM(barData, config);
    },
  },

  callbacks: {
    /**
     * Initialize and subscribe to WooCommerce cart store changes
     */
    init() {
      if (!window.wp?.data?.subscribe) {
        return;
      }

      const { subscribe } = window.wp.data;

      if (!subscribe) {
        return;
      }

      // Subscribe to changes in wp.data store
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

    /**
     * Watch for Mini Cart updates via WooCommerce Interactivity store
     */
    watchCartUpdates() {
      // For Mini Cart: watch WooCommerce store cart total
      const cartTotal = wcState?.cart?.totals?.total_price;

      if (cartTotal !== undefined) {
        // Build config from store state
        const config = {
          settings: state.settings,
          thresholdInfo: state.thresholdInfo,
          templates: state.templates,
        };

        const barData = calculateBarData(cartTotal, config);
        updateShippingBarDOM(barData, config);
      }
    },
  },
});
