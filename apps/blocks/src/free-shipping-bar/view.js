import { store } from "@wordpress/interactivity";
import {
  calculateBarData,
  getCartTotalFromStore,
  calculateCartTotalForShipping,
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
    appliedCoupons: {},
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
        appliedCoupons: state.appliedCoupons,
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
      // Use thresholdInfo from state for correct cart total calculation
      let previousCartTotal = getCartTotalFromStore(state.thresholdInfo);

      subscribe(() => {
        const currentCartTotal = getCartTotalFromStore(state.thresholdInfo);

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
      // For Mini Cart: calculate cart total the same way as PHP
      // Get cart data from WooCommerce Interactivity store
      const cartData = wcState?.cart;
      
      // Use helper function (same as PHP approach)
      const cartTotal = calculateCartTotalForShipping(cartData, state.thresholdInfo);

      if (cartTotal !== undefined && cartTotal !== null) {
        // Build config from store state
        const config = {
          settings: state.settings,
          thresholdInfo: state.thresholdInfo,
          templates: state.templates,
          appliedCoupons: state.appliedCoupons,
          cartData: cartData,
        };

        const barData = calculateBarData(cartTotal, config);
        updateShippingBarDOM(barData, config);
      }
    },
  },
});
