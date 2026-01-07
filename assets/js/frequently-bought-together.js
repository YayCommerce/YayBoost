/**
 * Frequently Bought Together Frontend Script
 *
 * Handles dynamic price calculation, batch add to cart, and cart updates.
 *
 * @package YayBoost
 */

(function ($) {
  "use strict";

  const FBT = {
    /**
     * Initialize
     */
    init: function () {
      this.bindEvents();
      this.calculateTotal();
    },

    /**
     * Bind events
     */
    bindEvents: function () {
      const self = this;

      // Checkbox change event
      $(document).on("change", ".yayboost-fbt-selectable", function () {
        self.calculateTotal();
      });

      // Single add button click - uncheck checkbox to prevent duplicate
      $(document).on("click", ".yayboost-fbt-single-add", function () {
        const $item = $(this).closest(".yayboost-fbt-product-item");
        $item
          .find(".yayboost-fbt-selectable")
          .prop("checked", false)
          .trigger("change");
      });

      // Batch add button click
      $(document).on("click", ".yayboost-fbt-batch-add", function () {
        self.handleBatchAdd($(this));
      });

      // WooCommerce added to cart event
      $(document.body).on("added_to_cart", function () {
        self.calculateTotal();
      });
    },

    /**
     * Calculate total price
     */
    calculateTotal: function () {
      let total = 0;
      const $container = $(".yayboost-fbt-container");

      $container.find(".yayboost-fbt-selectable:checked").each(function () {
        const price = parseFloat($(this).data("price")) || 0;
        total += price;
      });

      $container
        .find(".yayboost-fbt-total-price")
        .html(this.formatPrice(total));
    },

    /**
     * Format price
     *
     * @param {number} price Price to format
     * @return {string} Formatted price
     */
    formatPrice: function (price) {
      // Use accounting.formatMoney if available
      if (
        window.accounting &&
        typeof window.accounting.formatMoney === "function"
      ) {
        // Get currency settings from localized data
        let currencyOptions = {};

        if (typeof yayboostFBT !== "undefined" && yayboostFBT.currency) {
          // Use localized currency settings from PHP
          const currency = yayboostFBT.currency;
          currencyOptions.symbol = currency.symbol || "$";
          currencyOptions.format = currency.format || "%s%v";
          currencyOptions.decimal = currency.decimal || ".";
          currencyOptions.thousand = currency.thousand || ",";
          currencyOptions.precision =
            currency.precision !== undefined ? currency.precision : 0;
        }

        // Format with options (if any) or use default settings
        return window.accounting.formatMoney(price, currencyOptions);
      }

      // Fallback if accounting is not available
      // Use localized symbol if available
      const symbol =
        typeof yayboostFBT !== "undefined" &&
        yayboostFBT.currency &&
        yayboostFBT.currency.symbol
          ? yayboostFBT.currency.symbol
          : "$";
      const precision =
        typeof yayboostFBT !== "undefined" &&
        yayboostFBT.currency &&
        yayboostFBT.currency.precision !== undefined
          ? yayboostFBT.currency.precision
          : 0;
      return symbol + price.toFixed(precision);
    },

    /**
     * Handle batch add to cart
     *
     * @param {jQuery} $button Button element
     */
    handleBatchAdd: function ($button) {
      const self = this;
      const $container = $button.closest(".yayboost-fbt-container");
      const currentProductId =
        parseInt($container.data("current-product")) || 0;

      // Get selected product IDs
      const productIds = [];
      $container.find(".yayboost-fbt-selectable:checked").each(function () {
        const productId = parseInt($(this).data("product-id"));
        if (productId && productIds.indexOf(productId) === -1) {
          productIds.push(productId);
        }
      });

      if (productIds.length === 0) {
        alert(yayboostFBT.i18n.select_products);
        return;
      }

      // Disable button
      $button.prop("disabled", true).text(yayboostFBT.i18n.adding);

      // AJAX request
      $.ajax({
        url: yayboostFBT.ajax_url,
        type: "POST",
        data: {
          action: "yayboost_fbt_batch_add",
          nonce: yayboostFBT.nonce,
          product_ids: productIds,
          current_product_id: currentProductId,
        },
        success: function (response) {
          if (response.success) {
            // Show success message
            self.showNotice(response.data.message, "success");

            // Update cart fragments
            if (response.data.fragments) {
              $.each(response.data.fragments, function (key, value) {
                $(key).replaceWith(value);
              });
            }

            // Trigger WooCommerce events
            $(document.body).trigger("wc_fragment_refresh");
            $(document.body).trigger("added_to_cart", [
              response.data.fragments,
              response.data.cart_hash,
              $button,
            ]);

            // Reset checkboxes (except current product)
            $container
              .find(".yayboost-fbt-selectable:not(:disabled)")
              .prop("checked", false);
            self.calculateTotal();
          } else {
            self.showNotice(
              response.data.message || yayboostFBT.i18n.error,
              "error"
            );
          }
        },
        error: function () {
          self.showNotice(yayboostFBT.i18n.error, "error");
        },
        complete: function () {
          $button.prop("disabled", false).text(yayboostFBT.i18n.added);
          setTimeout(function () {
            $button.text("Add Selected to Cart");
          }, 2000);
        },
      });
    },

    /**
     * Show notice message
     *
     * @param {string} message Message to show
     * @param {string} type Notice type (success/error)
     */
    showNotice: function (message, type) {
      const $notice = $(
        '<div class="yayboost-fbt-notice yayboost-fbt-notice-' +
          type +
          '">' +
          message +
          "</div>"
      );
      $(".yayboost-fbt-container").prepend($notice);

      setTimeout(function () {
        $notice.fadeOut(function () {
          $(this).remove();
        });
      }, 3000);
    },
  };

  // Initialize on document ready
  $(document).ready(function () {
    FBT.init();
  });
})(jQuery);
