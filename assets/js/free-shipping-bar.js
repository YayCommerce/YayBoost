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

    // Get bar HTML via AJAX and inject
    const ajaxData = {
      action: "yayboost_get_shipping_bar",
      nonce: yayboostShippingBar.nonce,
    };

    $.ajax({
      url: yayboostShippingBar.ajaxUrl,
      type: "POST",
      data: ajaxData,
      success: function (response) {
        if (response.success && response.data && response.data.message) {
          const data = response.data;

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
          const barHtml =
            '<div class="yayboost-shipping-bar' +
            achievedClass +
            '" id="' +
            barId +
            '">' +
            '<div class="yayboost-shipping-bar__message">' +
            data.message +
            "</div>" +
            progressHtml +
            "</div>";

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
      },
      error: function () {
        console.log("Failed to inject shipping bar into mini cart");
      },
    });
  }

  /**
   * Update shipping bar via AJAX
   * @param {number|null} cartTotal Optional cart total from batch API (for mini cart block)
   */
  function updateShippingBar(cartTotal) {
    const $bar = $(".yayboost-shipping-bar");
    if ($bar.length === 0) return;

    const ajaxData = {
      action: "yayboost_get_shipping_bar",
      nonce: yayboostShippingBar.nonce,
    };

    // If cartTotal is provided (from batch API), include it in request
    if (cartTotal !== null && cartTotal !== undefined) {
      ajaxData.cart_total = cartTotal;
    }

    $.ajax({
      url: yayboostShippingBar.ajaxUrl,
      type: "POST",
      data: ajaxData,
      success: function (response) {
        if (response.success && response.data) {
          const data = response.data;

          // If no message, remove bar
          if (!data.message) {
            $bar.remove();
            return;
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
          const barHtml =
            '<div class="yayboost-shipping-bar' +
            achievedClass +
            '">' +
            '<div class="yayboost-shipping-bar__message">' +
            data.message +
            "</div>" +
            progressHtml +
            "</div>";

          // Replace existing bar
          $bar.replaceWith(barHtml);
        } else {
          // No data or error, remove bar
          $bar.remove();
        }
      },
      error: function () {
        // On error, keep existing bar (don't remove it)
        console.log("Failed to update shipping bar");
      },
    });
  }

  $(document).ready(function () {
    let shippingBarTimeout;

    /**
     * Debounced update function
     */
    function debouncedUpdateShippingBar(delay) {
      delay = delay || 300;
      clearTimeout(shippingBarTimeout);
      shippingBarTimeout = setTimeout(updateShippingBar, delay);
    }

    /**
     * Main cart update events (Classic WooCommerce)
     * Only needed for classic cart/checkout pages, not mini cart block
     */
    $(document.body).on(
      "added_to_cart removed_from_cart wc_update_cart",
      function () {
        // Only update if not in mini cart block (classic cart uses these events)
        debouncedUpdateShippingBar();
      }
    );

    /**
     * Fragment refresh events (covers mini cart widget updates)
     * Only needed for widget-based mini cart, not block-based
     */
    $(document.body).on(
      "wc_fragments_refreshed wc_fragments_loaded",
      function () {
        // Only update if not in mini cart block (widget-based mini cart uses fragments)
        debouncedUpdateShippingBar();
      }
    );

    /**
     * Updated WC div event (cart page)
     * Only for classic cart page
     */
    $(document.body).on("updated_wc_div product-remove", function () {
      debouncedUpdateShippingBar();
    });
    $(document.body).on("click", ".product-remove .remove", function () {
      debouncedUpdateShippingBar();
    });

    /**
     * Coupon events
     * Needed for both classic and mini cart block (coupons affect cart totals)
     * But for mini cart block, batch API will handle it when coupon is applied via blocks
     */
    $(document.body).on("applied_coupon removed_coupon", function () {
      // For mini cart block, batch API will handle this automatically
      // For classic cart, need to update manually
      debouncedUpdateShippingBar();
    });

    /**
     * Direct quantity input changes (cart page - Classic)
     */
    let quantityTimeout;
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

    /**
     * Form submit (cart page - backup)
     */
    $(document.body).on("submit", ".woocommerce-cart-form", function () {
      debouncedUpdateShippingBar(300);
    });

    /**
     * Mini cart block: Inject bar when drawer opens
     */
    if (isMiniCartBlock()) {
      // Inject when mini cart button clicked
      $(document.body).on("click", ".wc-block-mini-cart__button", function () {
        setTimeout(injectBarIntoMiniCartBlock, 300);
      });

      // Update when cart changes (block events)
      $(document.body).on(
        "wc-blocks_added_to_cart wc-blocks_removed_from_cart",
        function () {
          setTimeout(injectBarIntoMiniCartBlock, 200);
        }
      );
    }
  });
})(jQuery);
