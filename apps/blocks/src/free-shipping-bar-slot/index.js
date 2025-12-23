/**
 * Free Shipping Bar Slot/Fill Extension
 *
 * Uses WooCommerce Slot/Fill pattern to inject Free Shipping Bar
 * into Cart Block and Checkout Block via ExperimentalOrderMeta slot.
 *
 * @package YayBoost
 */

import { registerPlugin } from "@wordpress/plugins";
import { ExperimentalOrderMeta } from "@woocommerce/blocks-checkout";
import { calculateBarData, buildBarHtml } from "../free-shipping-bar/helpers";

/**
 * Free Shipping Bar Component
 *
 * Displays free shipping progress bar based on cart totals.
 * Accesses cart data via WooCommerce cart store.
 *
 * @param {Object} props Component props (cart data is passed by slot)
 * @return {JSX.Element|null} The shipping bar HTML or null
 */
const FreeShippingBarSlot = ({ cart, ...rest }) => {
  // Get cart totals from WooCommerce store
  const cartTotals = cart?.cartTotals || {};

  // Get cart total - WooCommerce uses minor units (cents)
  // Priority: total_price (if available) > total_items
  let cartTotal = null;
  if (cartTotals?.total_price) {
    // total_price is already in major units
    cartTotal = parseFloat(cartTotals.total_price);
  } else if (cartTotals?.total_items) {
    // total_items is in minor units, convert to major units
    const cartTotalMinor = parseInt(cartTotals.total_items, 10);
    const minorUnit = cartTotals?.currency_minor_unit || 2;
    cartTotal = cartTotalMinor / Math.pow(10, minorUnit);
  }

  // If no cart total, don't render
  if (cartTotal === null) {
    return null;
  }

  // Calculate bar data using helper function
  // Pass cartTotal explicitly since we're in React context
  const barData = calculateBarData(cartTotal);

  // If no bar data, don't render anything
  if (!barData) {
    return null;
  }

  // Build HTML using helper function
  const barHtml = buildBarHtml(barData);

  // If no HTML, don't render
  if (!barHtml) {
    return null;
  }

  // Render HTML using dangerouslySetInnerHTML
  // The HTML is already sanitized by buildBarHtml function
  return (
    <div
      className="yayboost-shipping-bar-slot"
      dangerouslySetInnerHTML={{ __html: barHtml }}
    />
  );
};

/**
 * Block Cart/Checkout Extension Component
 *
 * Wraps the FreeShippingBarSlot in the ExperimentalOrderMeta slot.
 *
 * @return {JSX.Element} The slot-wrapped component
 */
const BlockCartExtension = () => {
  return (
    <ExperimentalOrderMeta>
      <FreeShippingBarSlot />
    </ExperimentalOrderMeta>
  );
};

// Register the plugin with WooCommerce blocks
registerPlugin("yayboost-free-shipping-bar-slot", {
  render: BlockCartExtension,
  scope: "woocommerce-checkout",
});
