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
  // Remove # if present
  hex = hex.replace("#", "");
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return "rgba(" + r + ", " + g + ", " + b + ", " + opacity + ")";
}

/**
 * Format price using accounting.js with WooCommerce currency settings
 * @param {number} amount
 * @return {string}
 */
export function formatPrice(amount) {
  // Use accounting.formatMoney if available
  if (
    window.accounting &&
    typeof window.accounting.formatMoney === "function"
  ) {
    // Get currency settings from wcSettings if available
    let currencyOptions = {};

    if (window.wcSettings && window.wcSettings.currency) {
      const currency = window.wcSettings.currency;
      // Get currency symbol from WooCommerce
      currencyOptions.symbol = currency.symbol || "$";
      currencyOptions.precision = currency.minorUnit || 2;
      currencyOptions.decimal = currency.decimalSeparator || ".";
      currencyOptions.thousand = currency.thousandSeparator || ",";
      // Format: %s = symbol, %v = value
      // Position: left = '%s%v', right = '%v%s', left_space = '%s %v', right_space = '%v %s'
      const position = currency.position || "left";
      if (position === "right") {
        currencyOptions.format = "%v%s";
      } else if (position === "left_space") {
        currencyOptions.format = "%s %v";
      } else if (position === "right_space") {
        currencyOptions.format = "%v %s";
      } else {
        currencyOptions.format = "%s%v"; // default left
      }
    }

    // Format with options (if any) or use default settings
    return window.accounting.formatMoney(amount, currencyOptions);
  }

  // Fallback if accounting is not available
  return String(amount);
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
 * @return {boolean}
 */
export function hasFreeShippingCoupon() {
  // Check WooCommerce Blocks cart data
  const cartData = window.wp?.data?.select?.("wc/store/cart")?.getCartData?.();
  if (cartData?.coupons && Array.isArray(cartData.coupons)) {
    return cartData.coupons.some(function (coupon) {
      return coupon.discount_type === "free_shipping";
    });
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
 * @return {string} Formatted message
 */
export function buildMessageForState(
  state,
  progressData,
  threshold,
  cartTotal
) {
  const settings = window.yayboostShippingBar?.settings || {};

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
 * Get cart total from WooCommerce Blocks store or fallback
 * @return {number|null}
 */
export function getCartTotalFromStore() {
  const cartData = window.wp?.data?.select?.("wc/store/cart")?.getCartData?.();
  if (!cartData?.totals?.total_price) {
    return null;
  }

  // WooCommerce Blocks returns price in minor units (cents)
  // Convert to major units (dollars) by dividing by 100
  return cartData.totals.total_price;
}

/**
 * Calculate bar data from current cart state (no params needed - gets from window)
 * @return {object|null}
 */
export function calculateBarData() {
  const data = window.yayboostShippingBar || {};
  const thresholdInfo = data.thresholdInfo;

  if (!thresholdInfo || !thresholdInfo.min_amount) {
    return null;
  }

  const cartTotal = getCartTotalFromStore();
  if (cartTotal === null) {
    return null;
  }

  const threshold = thresholdInfo.min_amount;
  const requiresType = thresholdInfo.requires_type || null;
  const hasCoupon = hasFreeShippingCoupon();
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
    cartTotal
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
 * @return {string|null} HTML string
 */
export function buildMinimalTextHtml(data) {
  const settings = window.yayboostShippingBar?.settings || {};
  const templates = window.yayboostShippingBar?.templates || {};
  const achieved = data.achieved && !data.show_coupon_message;
  const primaryColor = settings.primaryColor || "#4caf50";
  const bgColor = achieved ? primaryColor : applyOpacity(primaryColor, 0.2);
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
 * @return {string|null} HTML string
 */
export function buildProgressBarHtml(data) {
  const settings = window.yayboostShippingBar?.settings || {};
  const templates = window.yayboostShippingBar?.templates || {};
  const primaryColor = settings.primaryColor || "#4caf50";
  const barColor = primaryColor;
  const backgroundColor = applyOpacity(primaryColor, 0.2);
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
 * @return {string|null} HTML string
 */
export function buildFullDetailHtml(data) {
  const settings = window.yayboostShippingBar?.settings || {};
  const templates = window.yayboostShippingBar?.templates || {};
  const achieved = data.achieved && !data.show_coupon_message;
  const primaryColor = settings.primaryColor || "#4caf50";
  const barColor = primaryColor;
  const backgroundColor = applyOpacity(primaryColor, 0.2);
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
 * @return {string|null} HTML string or null if no data
 */
export function buildBarHtml(data) {
  if (!data || !data.message) {
    return null;
  }

  // Get display style from settings
  const displayStyle =
    window.yayboostShippingBar?.settings?.displayStyle || "minimal_text";

  // Route to appropriate function based on display style
  if (displayStyle === "minimal_text") {
    return buildMinimalTextHtml(data);
  } else if (displayStyle === "progress_bar") {
    return buildProgressBarHtml(data);
  } else if (displayStyle === "full_detail") {
    return buildFullDetailHtml(data);
  }

  // Fallback to minimal_text
  return buildMinimalTextHtml(data);
}
