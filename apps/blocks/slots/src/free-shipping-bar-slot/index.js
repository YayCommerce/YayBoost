/**
 * Free Shipping Bar Slot/Fill Extension
 *
 * Uses WooCommerce Slot/Fill pattern to inject Free Shipping Bar
 * into Cart Block and Checkout Block via ExperimentalOrderMeta slot.
 *
 * @package YayBoost
 */

const { registerPlugin } = window.wp.plugins;
const { ExperimentalOrderMeta } = window.wc.blocksCheckout;
import {
  calculateBarData,
  buildBarHtml,
} from "@blocks/free-shipping-bar/helpers";

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
  const cartTotal = cartTotals?.total_items || null;
  if (cartTotal === null) {
    return null;
  }

  const yayboostData = window.yayboostShippingBar;

  const config = {
    settings: yayboostData.settings,
    thresholdInfo: yayboostData.thresholdInfo,
    templates: yayboostData.templates,
  };

  const barData = calculateBarData(cartTotal, config);

  if (!barData) {
    return null;
  }
  const barHtml = buildBarHtml(barData, config);

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
