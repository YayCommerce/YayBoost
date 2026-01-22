// Import shared utility
import { formatPrice } from "../utils";

/**
 * Bar state constants
 */
export const STATE_ACHIEVED = "achieved";
export const STATE_NEED_COUPON = "need_coupon";
export const STATE_IN_PROGRESS = "in_progress";

/**
 * Convert hex color to rgba with opacity
 * @param {string} hex Hex color code (e.g., '#4CAF50')
 * @param {number} opacity Opacity value (0.0 to 1.0)
 * @return {string} RGBA color string
 */
export function applyOpacity(hex, opacity) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * opacity));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * opacity));
  const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * opacity));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Calculate progress data
 * @param {number} threshold
 * @param {number} cartTotal
 * @return {object}
 */
export function calculateProgress(threshold, cartTotal) {
  const remaining = Math.max(0, threshold - cartTotal);
  const achieved = cartTotal >= threshold;
  const progress =
    threshold > 0 ? Math.min(100, (cartTotal / threshold) * 100) : 100;

  return {
    remaining: remaining,
    achieved: achieved,
    progress: Math.round(progress * 100) / 100,
  };
}

/**
 * Format message with placeholders
 * @param {string} template
 * @param {number} remaining
 * @param {number} threshold
 * @param {number} current
 * @return {string}
 */
export function formatMessage(template, remaining, threshold, current) {
  return template
    .replace(/{remaining}/g, formatPrice(remaining))
    .replace(/{threshold}/g, formatPrice(threshold))
    .replace(/{current}/g, formatPrice(current));
}

/**
 * Check if cart has free shipping coupon
 * Uses shipping rates check (real-time) + coupon codes verification
 * Works for both page load and mini cart coupon application
 * @param {object} config Configuration object with appliedCoupons from PHP (optional)
 * @return {boolean}
 */
export function hasFreeShippingCoupon(config = {}) {
  let shippingRatesKey = "shippingRates";
  let cartData = {};

  if (config.cartData !== undefined) {
    cartData = config.cartData;
    shippingRatesKey = "shipping_rates";
  } else {
    cartData = window.wp?.data?.select?.("wc/store/cart")?.getCartData?.();
  }

  if (!cartData) {
    return false;
  }

  // Must have at least one coupon applied
  const appliedCoupons = cartData.coupons || [];
  if (appliedCoupons.length === 0) {
    return false;
  }
  // Optional: Verify from PHP data if available (more accurate)
  const phpCouponsData = config.appliedCoupons || {};

  if (appliedCoupons.length > 0 && Object.keys(phpCouponsData).length > 0) {
    for (let i = 0; i < appliedCoupons.length; i++) {
      const code = appliedCoupons[i];
      // If coupon code is a string, use it directly
      const couponCode = typeof code === "string" ? code : code.code || code;

      if (phpCouponsData[couponCode]?.free_shipping === true) {
        return true; // Confirmed: coupon has free shipping
      }
    }
  }else {
    // Check if free_shipping method is selected in shipping rates
    // WooCommerce automatically selects free_shipping when coupon with free shipping is applied
    if (cartData[shippingRatesKey] && Array.isArray(cartData[shippingRatesKey])) {
      const hasFreeShippingRate = cartData[shippingRatesKey].some(
        function (packageRates) {
          if (!packageRates || !packageRates['shipping_rates']) {
            return false;
          }
  
          return packageRates['shipping_rates'].some(function (rate) {
            // Check if free_shipping method is selected
            return rate.method_id === "free_shipping";
          });
        }
      );
      
      if (hasFreeShippingRate) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determine bar state based on progress and coupon requirements
 * @param {boolean} achieved Whether threshold is achieved
 * @param {string|null} requiresType The requires type: '' | 'coupon' | 'min_amount' | 'either' | 'both'
 * @param {boolean} hasCoupon Whether coupon is applied
 * @return {string} 'achieved'|'need_coupon'|'in_progress'
 */
export function determineBarState(achieved, requiresType, hasCoupon) {
  // Case 1: No requirement - free shipping always available (shouldn't show bar)
  if (requiresType === "") {
    return STATE_ACHIEVED;
  }

  // Case 2: Only coupon required (no min_amount) - shouldn't show bar, but handle gracefully
  if (requiresType === "coupon") {
    return hasCoupon ? STATE_ACHIEVED : STATE_NEED_COUPON;
  }

  // Case 3: Only min_amount required
  if (requiresType === "min_amount") {
    return achieved ? STATE_ACHIEVED : STATE_IN_PROGRESS;
  }

  // Case 4: Either min_amount OR coupon (either)
  if (requiresType === "either") {
    // Achieved if: has coupon OR achieved min_amount
    if (hasCoupon || achieved) {
      return STATE_ACHIEVED;
    }
    // Otherwise, still in progress
    return STATE_IN_PROGRESS;
  }

  // Case 5: Both min_amount AND coupon (both)
  if (requiresType === "both") {
    // Achieved only if: has coupon AND achieved min_amount
    if (hasCoupon && achieved) {
      return STATE_ACHIEVED;
    }
    // If achieved min_amount but no coupon, need coupon
    if (achieved && !hasCoupon) {
      return STATE_NEED_COUPON;
    }
    // Otherwise, still in progress
    return STATE_IN_PROGRESS;
  }

  // Fallback: treat as min_amount only
  return achieved ? STATE_ACHIEVED : STATE_IN_PROGRESS;
}

/**
 * Build message based on state
 * @param {string} state Bar state
 * @param {object} progressData Progress data
 * @param {number} threshold Threshold amount
 * @param {number} cartTotal Cart total
 * @param {object} config Configuration object with settings
 * @return {string} Formatted message
 */
export function buildMessageForState(
  state,
  progressData,
  threshold,
  cartTotal,
  config = {}
) {
  const settings = config.settings || {};

  switch (state) {
    case STATE_ACHIEVED:
      return (
        settings.messageAchieved ||
        "🎉 Congratulations! You have free shipping!"
      );

    case STATE_NEED_COUPON:
      return (
        settings.messageCoupon ||
        "Please enter coupon code to receive free shipping"
      );

    case STATE_IN_PROGRESS:
    default:
      return formatMessage(
        settings.messageProgress || "Add {remaining} more for free shipping!",
        progressData.remaining,
        threshold,
        cartTotal
      );
  }
}

/**
 * Build bar response data
 * @param {number} threshold Threshold amount
 * @param {number} cartTotal Cart total
 * @param {object} progressData Progress data
 * @param {string} message Message to display
 * @param {string} state Bar state
 * @return {object} Bar data object
 */
export function buildBarResponse(
  threshold,
  cartTotal,
  progressData,
  message,
  state
) {
  return {
    threshold: threshold,
    current: cartTotal,
    remaining: state === STATE_ACHIEVED ? 0 : progressData.remaining,
    progress: state === STATE_ACHIEVED ? 100 : progressData.progress,
    achieved: state === STATE_ACHIEVED,
    message: message,
    show_coupon_message: state === STATE_NEED_COUPON,
  };
}

/**
 * Calculate cart total for free shipping calculation (helper function)
 * Similar to PHP's calculate_cart_total_for_shipping()
 * Can be used with any cartData source (Blocks store, Interactivity store, etc.)
 * @param {object} cartData Cart data object with totals
 * @param {object} thresholdInfo Optional threshold info with ignore_discounts setting
 * @return {number|null}
 */
export function calculateCartTotalForShipping(cartData, thresholdInfo = {}) {
  if (!cartData?.totals) {
    return null;
  }

  const ignoreDiscounts = thresholdInfo.ignore_discounts === "yes";

  const minorUnit = cartData.totals.currency_minor_unit ?? 0;

  // Get subtotal (total_items in Blocks store = subtotal before discount)
  // This matches PHP: WC()->cart->get_displayed_subtotal()
  let total = toDisplayPrice(cartData.totals.total_items, minorUnit);

  // Subtract discount if not ignoring discounts
  // This matches PHP logic: if ($ignore_discounts !== 'yes')
  if (!ignoreDiscounts) {
    const discount = toDisplayPrice(cartData.totals.total_discount, minorUnit);

    total = total - discount;

    // If prices include tax, also subtract discount tax
    // Check if discount_tax exists (indicates prices include tax)
    const discountTax = toDisplayPrice(cartData.totals.total_discount_tax, minorUnit);

    if (discountTax > 0) {
      // This matches PHP: if (WC()->cart->display_prices_including_tax())
      total = total - discountTax;
    }
  }

  // Round to match WooCommerce behavior (same as PHP)
  const decimals = window.wcSettings?.currency?.precision ?? 2;
  return Math.round(total * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Get cart total from WooCommerce Blocks store for free shipping calculation
 * Wrapper function that gets cartData from store and calls calculateCartTotalForShipping()
 * @param {object} thresholdInfo Optional threshold info with ignore_discounts setting
 * @return {number|null}
 */
export function getCartTotalFromStore(thresholdInfo = {}) {
  const cartData = window.wp?.data?.select?.("wc/store/cart")?.getCartData?.();
  return calculateCartTotalForShipping(cartData, thresholdInfo);
}

export function getCartTotalPriceFromStore() {
  const cartData = window.wp?.data?.select?.("wc/store/cart")?.getCartData?.();
  return cartData?.totals?.total_price;
}

/**
 * Calculate bar data from current cart state
 * @param {number|null} cartTotal Cart total (fetched from store if null)
 * @param {object} config Configuration object with thresholdInfo and settings
 * @return {object|null}
 */
export function calculateBarData(cartTotal = null, config = {}) {
  const thresholdInfo = config.thresholdInfo || {};

  if (cartTotal === null) {
    cartTotal = getCartTotalFromStore(thresholdInfo);
  }

  if (!thresholdInfo || !thresholdInfo.min_amount) {
    return null;
  }

  if (cartTotal === null) {
    return null;
  }

  const threshold = thresholdInfo.min_amount;
  const requiresType = thresholdInfo.requires_type || null;
  const hasCoupon = hasFreeShippingCoupon(config);
  const progressData = calculateProgress(threshold, cartTotal);

  // Determine state
  const state = determineBarState(
    progressData.achieved,
    requiresType,
    hasCoupon
  );

  // Build message based on state
  const message = buildMessageForState(
    state,
    progressData,
    threshold,
    cartTotal,
    config
  );

  // Build response
  return buildBarResponse(threshold, cartTotal, progressData, message, state);
}

/**
 * Replace placeholders in template string
 * @param {string} template Template string with {{PLACEHOLDER}} placeholders
 * @param {object} replacements Object with placeholder values
 * @return {string} HTML string with replaced values
 */
export function replaceTemplatePlaceholders(template, replacements) {
  if (!template) {
    return "";
  }

  let html = template;

  // Replace all placeholders
  Object.keys(replacements).forEach(function (key) {
    const placeholder = "{{" + key + "}}";
    const value = replacements[key] || "";
    html = html.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      value
    );
  });

  // Remove any remaining placeholders (optional - for safety)
  html = html.replace(/\{\{[\w_]+\}\}/g, "");

  return html.trim();
}

/**
 * Build minimal text HTML
 * @param {object} data Bar data object
 * @param {object} config Configuration object with settings and templates
 * @return {string|null} HTML string
 */
export function buildMinimalTextHtml(data, config = {}) {
  const settings = config.settings || {};
  const templates = config.templates || {};
  const achieved = data.achieved && !data.show_coupon_message;
  const primaryColor = settings.primaryColor || "#4caf50";
  const bgColor = achieved ? primaryColor : applyOpacity(primaryColor, 0.75);
  const textColor = achieved ? "#ffffff" : primaryColor;

  const template = templates.minimal_text;
  if (!template) {
    return null;
  }

  return replaceTemplatePlaceholders(template, {
    ACHIEVED_CLASS: achieved ? " yayboost-shipping-bar--achieved" : "",
    BG_COLOR: bgColor,
    TEXT_COLOR: textColor,
    ID_ATTR: "",
    MESSAGE: data.message || "",
  });
}

/**
 * Build progress bar HTML
 * @param {object} data Bar data object
 * @param {object} config Configuration object with settings and templates
 * @return {string|null} HTML string
 */
export function buildProgressBarHtml(data, config = {}) {
  const settings = config.settings || {};
  const templates = config.templates || {};
  const primaryColor = settings.primaryColor || "#4caf50";
  const barColor = primaryColor;
  const backgroundColor = applyOpacity(primaryColor, 0.75);
  const textColor = primaryColor;

  const template = templates.progress_bar;
  if (!template) {
    return null;
  }

  return replaceTemplatePlaceholders(template, {
    PROGRESS: data.progress || 0,
    BAR_COLOR: barColor,
    BACKGROUND_COLOR: backgroundColor,
    TEXT_COLOR: textColor,
    ID_ATTR: "",
    MESSAGE: data.message || "",
  });
}

/**
 * Build full detail HTML
 * @param {object} data Bar data object
 * @param {object} config Configuration object with settings and templates
 * @return {string|null} HTML string
 */
export function buildFullDetailHtml(data, config = {}) {
  const settings = config.settings || {};
  const templates = config.templates || {};
  const achieved = data.achieved && !data.show_coupon_message;
  const primaryColor = settings.primaryColor || "#4caf50";
  const barColor = primaryColor;
  const backgroundColor = applyOpacity(primaryColor, 0.75);
  const bgColor = achieved ? primaryColor : backgroundColor;
  const progressIconBg = achieved ? primaryColor : backgroundColor;
  const textColor = primaryColor;
  const threshold = data.threshold || 0;
  const cartTotal = +data.current || 0;
  const shopPageUrl = settings?.shopPageUrl || "";
  const template = templates.full_detail;
  if (!template) {
    return null;
  }

  // Since formatPrice returns fully formatted price (including symbol),
  // we set CURRENCY_SYMBOL to empty string to avoid duplication
  return replaceTemplatePlaceholders(template, {
    BAR_COLOR: barColor,
    BACKGROUND_COLOR: backgroundColor,
    BG_COLOR: bgColor,
    PROGRESS_ICON_BG: progressIconBg,
    TEXT_COLOR: textColor,
    CTA_TEXT_COLOR: achieved ? "#ffffff" : textColor,
    PROGRESS: data.progress || 0,
    CURRENCY_SYMBOL: "",
    THRESHOLD: formatPrice(threshold),
    CART_TOTAL: formatPrice(cartTotal),
    ID_ATTR: "",
    MESSAGE: data.message || "",
    CTA_URL: !achieved ? shopPageUrl : "javascript:void(0)",
  });
}

/**
 * Build bar HTML from data
 * @param {object} data Bar data from API
 * @param {object} config Configuration object with settings and templates
 * @return {string|null} HTML string or null if no data
 */
export function buildBarHtml(data, config = {}) {
  if (!data || !data.message) {
    return null;
  }

  // Get display style from settings
  const displayStyle = config.settings?.displayStyle || "minimal_text";

  // Route to appropriate function based on display style
  if (displayStyle === "minimal_text") {
    return buildMinimalTextHtml(data, config);
  } else if (displayStyle === "progress_bar") {
    return buildProgressBarHtml(data, config);
  } else if (displayStyle === "full_detail") {
    return buildFullDetailHtml(data, config);
  }

  // Fallback to minimal_text
  return buildMinimalTextHtml(data, config);
}

/**
 * Update shipping bar DOM with new bar data
 * @param {object} barData Bar data object
 * @param {object} config Configuration object with settings and templates
 * @return {void}
 */
export function updateShippingBarDOM(barData, config = {}) {
  if (!barData) {
    return;
  }

  // Build HTML content
  const htmlContent = buildBarHtml(barData, config);
  if (!htmlContent) {
    return;
  }

  // Update DOM directly - target the content wrapper inside the block
  const contentElements = document.querySelectorAll(
    '[data-wp-interactive="yayboost/free-shipping-bar"] .yayboost-shipping-bar-content'
  );
  if (contentElements.length > 0) {
    contentElements.forEach(contentElement => {
      contentElement.innerHTML = htmlContent;
    });
  }
}


export function toDisplayPrice(price, minorUnit) {

  if ( ! price ) {
    return null;
  }

  if ( minorUnit ) {
    return price / (10 ** minorUnit);
  }
  return price;
}