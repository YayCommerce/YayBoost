import { store, getContext } from "@wordpress/interactivity";
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
  console.log(e);
}
/**
 * Store definition for Free Shipping Bar
 */
const { actions, state } = store("yayboost/free-shipping-bar", {
  state: {
    get updateShippingBar() {
      // Try Mini Cart's Interactivity API store first
      const cartTotal = wcState?.cart?.totals?.total_price;
      const barData = calculateBarData(cartTotal);
      updateShippingBarDOM(barData);
    },
  },
  actions: {
    /**
     * Update bar data from cart and rebuild HTML content
     * Called when WooCommerce cart updates
     */
    updateFromCart() {
      // Calculate bar data (gets everything from window)
      const barData = calculateBarData();
      updateShippingBarDOM(barData);
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
