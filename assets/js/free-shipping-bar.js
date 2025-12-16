(function ($) {
  "use strict";

  /**
   * Bar state constants
   */
  const STATE_ACHIEVED = "achieved";
  const STATE_NEED_COUPON = "need_coupon";
  const STATE_IN_PROGRESS = "in_progress";

  /**
   * Current cart total
   */
  let currentCartTotal = yayboostShippingBar.cartTotal || 0;

  /**
   * Current coupons applied to cart
   */
  let currentCoupons = [];

  /**
   * Check if we're in mini cart block context
   */
  function isMiniCartBlock() {
    return (
      ($(".wc-block-mini-cart").length > 0 &&
        $(".wc-block-mini-cart").is(":visible")) ||
      $("#yayboost-mini-cart-shipping-bar").length > 0
    );
  }

  /**
   * Get cart total from current state
   * Note: currentCartTotal is updated via fetch interceptor (for blocks) or initial PHP value
   * @return {number|null} Cart total or null if not available
   */
  function getCartTotalFromStore() {
    return currentCartTotal !== undefined && currentCartTotal !== null
      ? currentCartTotal
      : null;
  }

  /**
   * Check if cart has free shipping coupon from store
   * @return {boolean}
   */
  function hasFreeShippingCoupon() {
    // Check if any coupon has discount_type === 'free_shipping'
    if (currentCoupons && Array.isArray(currentCoupons)) {
      return currentCoupons.some(function (coupon) {
        return coupon.discount_type === "free_shipping";
      });
    }
    return false;
  }

  /**
   * Format price using WooCommerce settings
   * @param {number} amount
   * @return {string}
   */
  function formatPrice(amount) {
    if (!window.yayboostShippingBar || !window.yayboostShippingBar.settings) {
      // Fallback formatting
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    }

    const settings = window.yayboostShippingBar.settings;
    const symbol = settings.currencySymbol || "$";
    const position = settings.currencyPosition || "left";
    const decimals = settings.decimals || 2;
    const decimalSep = settings.decimalSeparator || ".";
    const thousandSep = settings.thousandSeparator || ",";

    // Format number
    const formatted = parseFloat(amount)
      .toFixed(decimals)
      .replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep)
      .replace(".", decimalSep);

    // Add currency symbol
    if (position === "left") {
      return symbol + formatted;
    } else if (position === "right") {
      return formatted + symbol;
    } else if (position === "left_space") {
      return symbol + " " + formatted;
    } else if (position === "right_space") {
      return formatted + " " + symbol;
    }

    return symbol + formatted;
  }

  /**
   * Calculate progress data
   * @param {number} threshold
   * @param {number} cartTotal
   * @return {object}
   */
  function calculateProgress(threshold, cartTotal) {
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
  function formatMessage(template, remaining, threshold, current) {
    return template
      .replace(/{remaining}/g, formatPrice(remaining))
      .replace(/{threshold}/g, formatPrice(threshold))
      .replace(/{current}/g, formatPrice(current));
  }

  /**
   * Determine bar state based on progress and coupon requirements
   * @param {boolean} achieved Whether threshold is achieved
   * @param {string|null} requiresType The requires type: '' | 'coupon' | 'min_amount' | 'either' | 'both'
   * @param {boolean} hasCoupon Whether coupon is applied
   * @return {string} 'achieved'|'need_coupon'|'in_progress'
   */
  function determineBarState(achieved, requiresType, hasCoupon) {
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
   * @param {object} settings Settings object
   * @param {object} progressData Progress data
   * @param {number} threshold Threshold amount
   * @param {number} cartTotal Cart total
   * @return {string} Formatted message
   */
  function buildMessageForState(
    state,
    settings,
    progressData,
    threshold,
    cartTotal
  ) {
    switch (state) {
      case STATE_ACHIEVED:
        return settings.messageAchieved;

      case STATE_NEED_COUPON:
        return settings.messageCoupon;

      case STATE_IN_PROGRESS:
      default:
        return formatMessage(
          settings.messageProgress,
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
  function buildBarResponse(
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
   * Calculate bar data from threshold info and cart total
   * @param {object} thresholdInfo
   * @param {number} cartTotal
   * @param {object} settings
   * @return {object|null}
   */
  function calculateBarData(thresholdInfo, cartTotal, settings) {
    if (!thresholdInfo || !thresholdInfo.min_amount) {
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
      settings,
      progressData,
      threshold,
      cartTotal
    );

    // Build response
    return buildBarResponse(threshold, cartTotal, progressData, message, state);
  }

  /**
   * Get bar data without AJAX
   * @return {object|null}
   */
  function getBarDataWithoutAjax() {
    if (
      !yayboostShippingBar ||
      !yayboostShippingBar.thresholdInfo ||
      !yayboostShippingBar.settings
    ) {
      return null;
    }

    const cartTotal = getCartTotalFromStore();
    if (cartTotal === null) {
      return null;
    }

    return calculateBarData(
      yayboostShippingBar.thresholdInfo,
      cartTotal,
      yayboostShippingBar.settings
    );
  }

  /**
   * Replace placeholders in template string
   * @param {string} template Template string with {{PLACEHOLDER}} placeholders
   * @param {object} replacements Object with placeholder values
   * @return {string} HTML string with replaced values
   */
  function replaceTemplatePlaceholders(template, replacements) {
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
   * @param {string} barId Optional bar ID
   * @return {string} HTML string
   */
  function buildMinimalTextHtml(data, barId) {
    const settings = yayboostShippingBar?.settings || {};
    const templates = yayboostShippingBar?.templates || {};
    const achieved = data.achieved && !data.show_coupon_message;
    const bgColor = achieved
      ? settings.barColor || "#4caf50"
      : settings.backgroundColor || "#e8f5e9";
    const textColor = achieved ? "#ffffff" : settings.textColor || "#2e7d32";

    const template = templates.minimal_text;
    if (!template) {
      return null;
    }

    return replaceTemplatePlaceholders(template, {
      ACHIEVED_CLASS: achieved ? " yayboost-shipping-bar--achieved" : "",
      BG_COLOR: bgColor,
      TEXT_COLOR: textColor,
      ID_ATTR: barId ? ' id="' + barId + '"' : "",
      MESSAGE: data.message || "",
    });
  }

  /**
   * Build progress bar HTML
   * @param {object} data Bar data object
   * @param {string} barId Optional bar ID
   * @return {string} HTML string
   */
  function buildProgressBarHtml(data, barId) {
    const settings = yayboostShippingBar?.settings || {};
    const templates = yayboostShippingBar?.templates || {};
    const barColor = settings.barColor || "#4caf50";
    const backgroundColor = settings.backgroundColor || "#e8f5e9";
    const textColor = settings.textColor || "#2e7d32";

    const template = templates.progress_bar;
    if (!template) {
      return null;
    }

    return replaceTemplatePlaceholders(template, {
      PROGRESS: data.progress || 0,
      BAR_COLOR: barColor,
      BACKGROUND_COLOR: backgroundColor,
      TEXT_COLOR: textColor,
      ID_ATTR: barId ? ' id="' + barId + '"' : "",
      MESSAGE: data.message || "",
    });
  }

  /**
   * Build full detail HTML
   * @param {object} data Bar data object
   * @param {string} barId Optional bar ID
   * @return {string} HTML string
   */
  function buildFullDetailHtml(data, barId) {
    const settings = yayboostShippingBar?.settings || {};
    const templates = yayboostShippingBar?.templates || {};
    const achieved = data.achieved && !data.show_coupon_message;
    const barColor = settings.barColor || "#4caf50";
    const backgroundColor = settings.backgroundColor || "#e8f5e9";
    const bgColor = achieved
      ? settings.barColor || "#4caf50"
      : settings.backgroundColor || "#e8f5e9";
    const progressIconBg = achieved
      ? settings.barColor || "#4caf50"
      : settings.backgroundColor || "#e8f5e9";
    const textColor = settings.textColor || "#2e7d32";
    const currencySymbol = settings.currencySymbol || "$";
    const threshold = data.threshold || 0;
    const cartTotal = +data.current || 0;
    const shopPageUrl = settings?.shopPageUrl || "";
    const template = templates.full_detail;
    if (!template) {
      return null;
    }

    return replaceTemplatePlaceholders(template, {
      BAR_COLOR: barColor,
      BACKGROUND_COLOR: backgroundColor,
      BG_COLOR: bgColor,
      PROGRESS_ICON_BG: progressIconBg,
      TEXT_COLOR: textColor,
      CTA_TEXT_COLOR: achieved ? "#ffffff" : textColor,
      PROGRESS: data.progress || 0,
      CURRENCY_SYMBOL: currencySymbol,
      THRESHOLD: threshold.toFixed(2),
      CART_TOTAL: cartTotal.toFixed(2),
      ID_ATTR: barId ? ' id="' + barId + '"' : "",
      MESSAGE: data.message || "",
      CTA_URL: !achieved ? shopPageUrl : "javascript:void(0)",
    });
  }

  /**
   * Build bar HTML from data
   * @param {object} data Bar data from API
   * @param {string} barId Optional bar ID (for mini cart)
   * @return {string|null} HTML string or null if no data
   */
  function buildBarHtml(data, barId) {
    if (!data || !data.message) {
      return null;
    }

    // Get display style from settings
    const displayStyle =
      yayboostShippingBar?.settings?.displayStyle || "minimal_text";

    // Route to appropriate function based on display style
    if (displayStyle === "minimal_text") {
      return buildMinimalTextHtml(data, barId);
    } else if (displayStyle === "progress_bar") {
      return buildProgressBarHtml(data, barId);
    } else if (displayStyle === "full_detail") {
      return buildFullDetailHtml(data, barId);
    }

    // Fallback to minimal_text
    return buildMinimalTextHtml(data, barId);
  }

  /**
   * Update all shipping bars based on currentCartTotal
   */
  function updateAllShippingBars() {
    const data = calculateBarData(
      yayboostShippingBar.thresholdInfo,
      currentCartTotal,
      yayboostShippingBar.settings
    );

    if (!data) return;

    // Update Mini Cart Block Bar
    const miniCartBar = document.querySelector(
      "#yayboost-mini-cart-shipping-bar"
    );
    if (miniCartBar) {
      const newHtml = buildBarHtml(data, "yayboost-mini-cart-shipping-bar");
      if (newHtml) miniCartBar.outerHTML = newHtml;
    }

    // Update Classic/Block Cart Page Bars
    $(".yayboost-shipping-bar").each(function () {
      if (this.id !== "yayboost-mini-cart-shipping-bar") {
        const newHtml = buildBarHtml(data);
        if (newHtml) $(this).replaceWith(newHtml);
      }
    });
  }

  // ==========================================
  // FETCH INTERCEPTOR (WooCommerce Blocks Support)
  // ==========================================

  if (isMiniCartBlock()) {
    const originalFetch = window.fetch;
    window.fetch = function (resource, config) {
      // Call original fetch
      const response = originalFetch.apply(this, arguments);

      // Check if it's a WooCommerce Blocks cart update request
      // URL usually looks like: .../wc/store/v1/cart?... or /batch
      const url = typeof resource === "string" ? resource : resource?.url;

      if (
        url &&
        (url.includes("/wc/store/v1/cart") ||
          url.includes("/wc/store/v1/batch"))
      ) {
        response.then((res) => {
          if (res.ok) {
            res
              .clone()
              .json()
              .then((data) => {
                // Parse data to get totals and coupons
                let totals = null;
                let coupons = null;

                // Case 1: Endpoint /cart returns cart object directly
                if (data.totals) {
                  totals = data.totals;
                  coupons = data.coupons || [];
                }
                // Case 2: Endpoint /batch returns array of responses
                else if (data.responses && Array.isArray(data.responses)) {
                  // Find response containing cart data
                  const cartRes = data.responses.find(
                    (r) => r.body && (r.body.totals || r.body.coupons)
                  );
                  if (cartRes && cartRes.body) {
                    totals = cartRes.body.totals;
                    coupons = cartRes.body.coupons || [];
                  }
                }

                // Update currentCoupons if coupons found
                if (coupons !== null) {
                  currentCoupons = coupons;
                }

                // If totals found, calculate and update bar
                if (totals) {
                  // Calculate new total: (total_items - total_discount)
                  // Note: API returns minor units (cents) if currency_minor_unit > 0
                  // We need to divide by 10^currency_minor_unit
                  const currencyMinorUnit = totals.currency_minor_unit || 0;
                  const divisor = Math.pow(10, currencyMinorUnit);

                  let totalItems = parseFloat(totals.total_items);
                  let totalDiscount = parseFloat(totals.total_discount);

                  // Safe parsing if API returns strings
                  if (isNaN(totalItems)) totalItems = 0;
                  if (isNaN(totalDiscount)) totalDiscount = 0;

                  const newTotal = (totalItems - totalDiscount) / divisor;

                  currentCartTotal = newTotal;

                  // Trigger UI update
                  updateAllShippingBars();
                }
              })
              .catch((err) => console.error("Error parsing cart update:", err));
          }
        });
      }

      return response;
    };
  }

  /**
   * Fetch bar data from API (fallback for classic cart)
   * @param {function} callback Success callback with (data) parameter
   */
  function fetchBarData(callback) {
    // Fallback to AJAX for classic cart
    const ajaxData = {
      action: "yayboost_get_shipping_bar",
      nonce: yayboostShippingBar.nonce,
    };

    $.ajax({
      url: yayboostShippingBar.ajaxUrl,
      type: "POST",
      data: ajaxData,
      success: function (response) {
        if (response.success && response.data) {
          callback(response.data);
        } else {
          callback(null);
        }
      },
      error: function () {
        callback(null);
      },
    });
  }

  /**
   * Inject shipping bar into mini cart block
   */
  function injectBarIntoMiniCartBlock() {
    const miniCartContent = document.querySelector(
      ".wc-block-mini-cart__template-part"
    );
    if (!miniCartContent) return;

    // Check for bar injected by PHP (render_mini_cart_placeholder)
    const existingBar = miniCartContent.querySelector(
      "#yayboost-mini-cart-shipping-bar"
    );

    if (existingBar) {
      // Bar already exists, just update message and progress
      updateMiniCartBarData(existingBar);
      return;
    }

    // Bar doesn't exist, inject new one (fallback)
    const barId = "yayboost-mini-cart-shipping-bar";

    // Get data without AJAX
    const data = getBarDataWithoutAjax();
    if (!data) return;

    const barHtml = buildBarHtml(data, barId);
    if (!barHtml) return;

    // Find position to inject (after title block)
    const titleBlock = miniCartContent.querySelector(
      ".wp-block-woocommerce-mini-cart-title-block"
    );
    if (titleBlock) {
      titleBlock.insertAdjacentHTML("afterend", barHtml);
    } else {
      // Fallback: inject at beginning
      miniCartContent.insertAdjacentHTML("afterbegin", barHtml);
    }
  }

  /**
   * Update existing mini cart bar data
   * Rebuilds the entire bar element using template system for consistency
   * @param {HTMLElement} barElement The bar element to update
   */
  function updateMiniCartBarData(barElement) {
    const data = getBarDataWithoutAjax();

    if (!data || !data.message) {
      // No data, remove bar
      barElement.remove();
      return;
    }

    // Get bar ID to preserve it
    const barId = barElement.id || null;

    // Build new HTML from template - simple and consistent!
    const newHtml = buildBarHtml(data, barId);

    if (newHtml) {
      // Replace entire element - much simpler than updating individual parts
      barElement.outerHTML = newHtml;
    } else {
      barElement.remove();
    }
  }

  /**
   * Update shipping bar (for classic cart only, block-based handled by subscription)
   */
  function updateShippingBar() {
    // Only update classic cart bars (not block-based)
    // Block-based cart bars are handled by subscribeToCartStore()
    const $bars = $(".yayboost-shipping-bar").filter(function () {
      const bar = this;
      return !isBlockBasedCartBar(bar);
    });

    if ($bars.length === 0) return;

    // Fallback to AJAX for classic cart (when store not available)
    fetchBarData(function (data) {
      if (!data || !data.message) {
        // No data or error, remove bars
        $bars.remove();
        return;
      }

      const barHtml = buildBarHtml(data);
      if (barHtml) {
        // Replace existing bars
        $bars.replaceWith(barHtml);
      } else {
        $bars.remove();
      }
    });
  }

  /**
   * Check if bar is in block-based cart context
   * @param {HTMLElement} barElement
   * @return {boolean}
   */
  function isBlockBasedCartBar(barElement) {
    if (!barElement) return false;

    // Check if bar is inside block-based cart
    const blockCart = barElement.closest(".wc-block-cart");
    const blockMiniCart = barElement.closest(".wc-block-mini-cart");
    const isMiniCartBar = barElement.id === "yayboost-mini-cart-shipping-bar";

    return !!(blockCart || blockMiniCart || isMiniCartBar);
  }

  document.addEventListener("DOMContentLoaded", function () {
    let shippingBarTimeout;
    let quantityTimeout;

    // ============================================================================
    // CLASSIC CART HANDLERS (Widget-based, Non-block)
    // ============================================================================

    /**
     * Debounced update function for classic cart
     * Updates classic cart bars only (not block-based)
     */
    function debouncedUpdateShippingBar(delay) {
      delay = delay || 300;
      clearTimeout(shippingBarTimeout);
      shippingBarTimeout = setTimeout(updateShippingBar, delay);
    }

    // Classic cart events - all trigger debounced update
    // These events are fired by classic WooCommerce (non-block)
    const classicCartEvents = [
      // Main cart update events (Classic WooCommerce)
      // Triggered when: Add/remove items, update cart via AJAX
      "added_to_cart removed_from_cart wc_update_cart",

      // Fragment refresh events (widget-based mini cart)
      // Triggered when: Mini cart widget updates via fragments
      "wc_fragments_refreshed wc_fragments_loaded",

      // Updated WC div event (cart page)
      // Triggered when: Cart page updates, product removed via custom event
      "updated_wc_div product-remove",

      // Coupon events
      // Triggered when: Coupon applied or removed
      "applied_coupon removed_coupon",
    ];

    classicCartEvents.forEach(function (events) {
      $(document.body).on(events, debouncedUpdateShippingBar);
    });

    // Click event: Remove product button (direct child of .product-remove)
    // Triggered when: User clicks remove button in classic cart
    $(document.body).on(
      "click",
      ".product-remove > .remove",
      debouncedUpdateShippingBar
    );

    // Form submit event (cart page - Classic)
    // Triggered when: User submits classic cart form (update cart button)
    $(document.body).on("submit", ".woocommerce-cart-form", function () {
      debouncedUpdateShippingBar(300);
    });

    // ============================================================================
    // BLOCK-BASED CART HANDLERS (WooCommerce Blocks)
    // ============================================================================

    // Mini cart block specific events (backup handlers)
    // These are fallback handlers in case store subscription doesn't catch everything
    if (isMiniCartBlock()) {
      // Triggered when: User clicks to open mini cart drawer (block-based)
      setTimeout(injectBarIntoMiniCartBlock, 300);

      // Click event: Mini cart button
      // Triggered when: User changes quantity in mini cart (block-based)
      $(document.body).on(
        "mousedown touchstart",
        ".wc-block-components-quantity-selector__button",
        function () {
          setTimeout(injectBarIntoMiniCartBlock, 300);
        }
      );

      // Block cart events (backup)
      // Triggered when: Items added/removed via WooCommerce Blocks
      // Note: Store subscription should handle this, but this is a backup
      $(document.body).on(
        "wc-blocks_added_to_cart wc-blocks_removed_from_cart",
        function () {
          setTimeout(injectBarIntoMiniCartBlock, 200);
        }
      );
    }
  });
})(jQuery);
