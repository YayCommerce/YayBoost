(function ($) {
  "use strict";

  /**
   * Check if we're in mini cart block context
   */
  function isMiniCartBlock() {
    return (
      $(".wc-block-mini-cart").length > 0 ||
      $("#yayboost-mini-cart-shipping-bar").length > 0
    );
  }

  /**
   * Get cart total from WooCommerce cart store
   * @return {number|null} Cart total or null if not available
   */
  function getCartTotalFromStore() {
    if (
      typeof window.wp === "undefined" ||
      !window.wp.data ||
      !window.wp.data.select
    ) {
      return null;
    }

    try {
      const cartData = window.wp.data.select("wc/store/cart").getCartData();
      if (cartData && cartData.totals) {
        // Use total_items (subtotal) for free shipping calculation
        return parseFloat(cartData.totals.total_items) || null;
      }
    } catch (e) {
      console.log("Error getting cart data from store:", e);
    }

    return null;
  }

  /**
   * Check if cart has free shipping coupon from store
   * @return {boolean}
   */
  function hasFreeShippingCoupon() {
    if (
      typeof window.wp === "undefined" ||
      !window.wp.data ||
      !window.wp.data.select
    ) {
      return false;
    }

    try {
      const cartData = window.wp.data.select("wc/store/cart").getCartData();
      if (cartData && cartData.coupons && Array.isArray(cartData.coupons)) {
        // Check if any coupon has free_shipping property
        return cartData.coupons.some(function (coupon) {
          return (
            coupon.discount_type === "free_shipping" ||
            coupon.free_shipping === true
          );
        });
      }
    } catch (e) {
      console.log("Error checking coupons from store:", e);
    }

    return false;
  }

  /**
   * Format price using WooCommerce settings
   * @param {number} amount
   * @return {string}
   */
  function formatPrice(amount) {
    if (!yayboostShippingBar || !yayboostShippingBar.settings) {
      // Fallback formatting
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    }

    const settings = yayboostShippingBar.settings;
    const symbol = settings.currency_symbol || "$";
    const position = settings.currency_position || "left";
    const decimals = settings.decimals || 2;
    const decimalSep = settings.decimal_separator || ".";
    const thousandSep = settings.thousand_separator || ",";

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
    const requiresCoupon = thresholdInfo.requires_coupon || false;
    const hasCoupon = hasFreeShippingCoupon();

    const progressData = calculateProgress(threshold, cartTotal);
    const remaining = progressData.remaining;
    const achieved = progressData.achieved;
    const progress = progressData.progress;

    // Case 1: Only min_amount required
    if (!requiresCoupon) {
      const message = achieved
        ? settings.message_achieved
        : formatMessage(
            settings.message_progress,
            remaining,
            threshold,
            cartTotal
          );

      return {
        threshold: threshold,
        current: cartTotal,
        remaining: remaining,
        progress: progress,
        achieved: achieved,
        message: message,
        requires_coupon: false,
        has_coupon: false,
        show_coupon_message: false,
      };
    }

    // Case 2: Requires coupon
    // If coupon already applied, show success
    if (hasCoupon) {
      return {
        threshold: threshold,
        current: cartTotal,
        remaining: 0,
        progress: 100,
        achieved: true,
        message: settings.message_achieved,
        requires_coupon: false,
        has_coupon: true,
        show_coupon_message: false,
      };
    }

    // Show progress bar or coupon message based on threshold
    let message;
    let showCouponMessage = false;

    if (achieved) {
      // Threshold met, show coupon message
      message = settings.message_coupon;
      showCouponMessage = true;
    } else {
      // Show progress bar
      message = formatMessage(
        settings.message_progress,
        remaining,
        threshold,
        cartTotal
      );
      showCouponMessage = false;
    }

    return {
      threshold: threshold,
      current: cartTotal,
      remaining: remaining,
      progress: progress,
      achieved: achieved,
      message: message,
      requires_coupon: true,
      has_coupon: false,
      show_coupon_message: showCouponMessage,
    };
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
   * Check if progress bar should be shown
   * @param {object} data Bar data
   * @return {boolean}
   */
  function shouldShowProgress(data) {
    return (
      data.threshold &&
      data.threshold > 0 &&
      !data.achieved &&
      !data.show_coupon_message
    );
  }

  /**
   * Build progress bar HTML
   * @param {number} progress Progress percentage (0-100)
   * @return {string} HTML string for progress bar
   */
  function buildProgressBarHtml(progress) {
    return (
      '<div class="yayboost-shipping-bar__progress">' +
      '<div class="yayboost-shipping-bar__progress-fill" style="width: ' +
      progress +
      '%"></div>' +
      "</div>"
    );
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

    // Build achieved class
    const achievedClass =
      data.achieved && !data.show_coupon_message
        ? " yayboost-shipping-bar--achieved"
        : "";

    // Build progress bar HTML
    const progressHtml = shouldShowProgress(data)
      ? buildProgressBarHtml(data.progress)
      : "";

    // Build complete bar HTML
    const idAttr = barId ? ' id="' + barId + '"' : "";
    return (
      '<div class="yayboost-shipping-bar' +
      achievedClass +
      '"' +
      idAttr +
      ">" +
      '<div class="yayboost-shipping-bar__message">' +
      data.message +
      "</div>" +
      progressHtml +
      "</div>"
    );
  }

  /**
   * Fetch bar data from API (fallback for classic cart)
   * @param {function} callback Success callback with (data) parameter
   */
  function fetchBarData(callback) {
    // Try to get data without AJAX first
    const data = getBarDataWithoutAjax();
    if (data) {
      callback(data);
      return;
    }

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

  function updateBarInMiniCartBlock() {
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
   * Update existing mini cart bar data (message and progress)
   * @param {HTMLElement} barElement The bar element to update
   */
  function updateMiniCartBarData(barElement) {
    const data = getBarDataWithoutAjax();

    if (!data || !data.message) {
      // No data, remove bar
      barElement.remove();
      return;
    }

    // Update message
    const messageEl = barElement.querySelector(
      ".yayboost-shipping-bar__message"
    );
    if (messageEl) {
      messageEl.innerHTML = data.message;
    }

    // Update progress bar
    const progressContainer = barElement.querySelector(
      ".yayboost-shipping-bar__progress"
    );

    if (shouldShowProgress(data)) {
      // Update or create progress bar
      if (progressContainer) {
        const progressFill = progressContainer.querySelector(
          ".yayboost-shipping-bar__progress-fill"
        );
        if (progressFill) {
          progressFill.style.width = data.progress + "%";
        }
      } else {
        // Create progress bar if doesn't exist
        messageEl.insertAdjacentHTML(
          "afterend",
          buildProgressBarHtml(data.progress)
        );
      }
    } else {
      // Remove progress bar if shouldn't show
      if (progressContainer) {
        progressContainer.remove();
      }
    }

    // Update achieved class
    if (data.achieved && !data.show_coupon_message) {
      barElement.classList.add("yayboost-shipping-bar--achieved");
    } else {
      barElement.classList.remove("yayboost-shipping-bar--achieved");
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

    // Try to get data without AJAX first (in case store is available)
    const data = getBarDataWithoutAjax();

    if (data) {
      // Use calculated data
      if (!data.message) {
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
    } else {
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

  /**
   * Subscribe to WooCommerce cart store changes
   * Only updates block-based cart bars (not classic cart)
   * @return {function|null} Unsubscribe function or null
   */
  function subscribeToCartStore() {
    if (
      typeof window.wp === "undefined" ||
      !window.wp.data ||
      !window.wp.data.subscribe
    ) {
      return null;
    }

    try {
      const unsubscribe = window.wp.data.subscribe(function () {
        // Cart state changed, only update block-based cart bars
        // Classic cart bars are handled by jQuery events

        // Update mini cart bar if exists (block-based)
        const miniCartBar = document.querySelector(
          "#yayboost-mini-cart-shipping-bar"
        );
        if (miniCartBar) {
          updateMiniCartBarData(miniCartBar);
        }

        // Update block-based cart page bars
        const blockCartBars = document.querySelectorAll(
          ".wc-block-cart .yayboost-shipping-bar"
        );
        if (blockCartBars.length > 0) {
          const data = getBarDataWithoutAjax();
          if (data && data.message) {
            const barHtml = buildBarHtml(data);
            if (barHtml) {
              blockCartBars.forEach(function (bar) {
                $(bar).replaceWith(barHtml);
              });
            }
          }
        }
      }, "wc/store/cart");

      return unsubscribe;
    } catch (e) {
      console.log("Error subscribing to cart store:", e);
      return null;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    let shippingBarTimeout;
    let quantityTimeout;
    let cartStoreUnsubscribe = null;

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

    // Quantity input changes (cart page - Classic)
    // Triggered when: User changes quantity in classic cart form
    $(document.body).on(
      "change input",
      ".woocommerce-cart-form input.qty",
      function () {
        clearTimeout(quantityTimeout);
        quantityTimeout = setTimeout(function () {
          debouncedUpdateShippingBar(500);
        }, 500);
      }
    );

    // Form submit event (cart page - Classic)
    // Triggered when: User submits classic cart form (update cart button)
    $(document.body).on("submit", ".woocommerce-cart-form", function () {
      debouncedUpdateShippingBar(300);
    });

    // ============================================================================
    // BLOCK-BASED CART HANDLERS (WooCommerce Blocks)
    // ============================================================================

    // Subscribe to WooCommerce cart store (for block-based cart)
    // This automatically updates block-based cart bars when cart changes
    if (isMiniCartBlock() || $(".wc-block-cart").length > 0) {
      cartStoreUnsubscribe = subscribeToCartStore();
    }

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

    // ============================================================================
    // CLEANUP
    // ============================================================================

    // Cleanup on page unload
    $(window).on("beforeunload", function () {
      if (cartStoreUnsubscribe) {
        cartStoreUnsubscribe();
      }
    });
  });
})(jQuery);
