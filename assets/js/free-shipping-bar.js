(function ($) {
  "use strict";

  // Store original fetch function
  const originalFetch = window.fetch;

  /**
   * Check if we're in mini cart block context
   */
  function isMiniCartBlock() {
    return (
      $(".wc-block-mini-cart").length > 0 ||
      $("#yayboost-mini-cart-bar").length > 0
    );
  }

  /**
   * Intercept fetch calls to Store API batch endpoint
   */
  if (originalFetch) {
    window.fetch = function () {
      const args = arguments;
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0] && args[0].url
          ? args[0].url
          : "";

      // Only intercept batch API calls in mini cart context
      if (isMiniCartBlock() && url && url.includes("/wc/store/v1/batch")) {
        return originalFetch.apply(this, arguments).then(function (response) {
          response
            .clone()
            .json()
            .then(function (data) {
              if (data && data.responses && Array.isArray(data.responses)) {
                data.responses.forEach(function (res) {
                  if (
                    res.body &&
                    res.body.totals &&
                    res.body.totals.total_items !== undefined
                  ) {
                    const totals = res.body.totals;
                    updateShippingBar(totals.total_price);
                  }
                });
              }
            })
            .catch(function (e) {
              console.log(e);
            });

          return response;
        });
      }

      return originalFetch.apply(this, arguments);
    };
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
    let progressHtml = "";
    if (
      data.threshold &&
      data.threshold > 0 &&
      !data.achieved &&
      !data.show_coupon_message
    ) {
      progressHtml =
        '<div class="yayboost-shipping-bar__progress">' +
        '<div class="yayboost-shipping-bar__progress-fill" style="width: ' +
        data.progress +
        '%"></div>' +
        "</div>";
    }

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
   * Fetch bar data from API
   * @param {number|null} cartTotal Optional cart total override
   * @param {function} callback Success callback with (data) parameter
   */
  function fetchBarData(cartTotal, callback) {
    const ajaxData = {
      action: "yayboost_get_shipping_bar",
      nonce: yayboostShippingBar.nonce,
    };

    if (cartTotal !== null && cartTotal !== undefined) {
      ajaxData.cart_total = cartTotal;
    }

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

    const barId = "yayboost-mini-cart-shipping-bar";

    // Check if already injected
    if (miniCartContent.querySelector("#" + barId)) {
      // Bar exists, just update it
      updateShippingBar();
      return;
    }

    // Fetch and inject
    fetchBarData(null, function (data) {
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
    });
  }

  /**
   * Update shipping bar via AJAX
   * @param {number|null} cartTotal Optional cart total from batch API (for mini cart block)
   */
  function updateShippingBar(cartTotal) {
    const $bar = $(".yayboost-shipping-bar");
    if ($bar.length === 0) return;

    fetchBarData(cartTotal, function (data) {
      if (!data || !data.message) {
        // No data or error, remove bar
        $bar.remove();
        return;
      }

      const barHtml = buildBarHtml(data);
      if (barHtml) {
        // Replace existing bar
        $bar.replaceWith(barHtml);
      } else {
        $bar.remove();
      }
    });
  }

  $(document).ready(function () {
    let shippingBarTimeout;
    let quantityTimeout;

    /**
     * Debounced update function
     */
    function debouncedUpdateShippingBar(delay) {
      delay = delay || 300;
      clearTimeout(shippingBarTimeout);
      shippingBarTimeout = setTimeout(updateShippingBar, delay);
    }

    // Classic cart events - all trigger debounced update
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
    // Triggered when: User clicks remove button in cart
    $(document.body).on(
      "click",
      ".product-remove > .remove",
      debouncedUpdateShippingBar
    );

    // Quantity input changes (cart page - Classic)
    // Triggered when: User changes quantity in cart form
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

    // Form submit event (cart page - backup)
    // Triggered when: User submits cart form (update cart button)
    $(document.body).on("submit", ".woocommerce-cart-form", function () {
      debouncedUpdateShippingBar(300);
    });

    // Mini cart block events
    if (isMiniCartBlock()) {
      // Click event: Mini cart button
      // Triggered when: User clicks to open mini cart drawer
      $(document.body).on("click", ".wc-block-mini-cart__button", function () {
        setTimeout(injectBarIntoMiniCartBlock, 300);
      });

      // Block cart events
      // Triggered when: Items added/removed via WooCommerce Blocks
      $(document.body).on(
        "wc-blocks_added_to_cart wc-blocks_removed_from_cart",
        function () {
          setTimeout(injectBarIntoMiniCartBlock, 200);
        }
      );
    }
  });
})(jQuery);
