/**
 * Frequently Bought Together Block - Interactivity API View Script
 *
 * Provides reactive product selection and batch add to cart using WordPress Interactivity API.
 *
 * @package YayBoost
 */

import { store, getContext, getElement } from "@wordpress/interactivity";

/**
 * Frequently Bought Together block store.
 *
 * Uses WordPress Interactivity API for reactive state management.
 */
const { state, actions } = store("yayboost/frequently-bought-together", {
  state: {
    // These will be hydrated from PHP via wp_interactivity_state()
    settings: {},
    ajaxUrl: "",
    nonce: "",
    currentProductId: 0,
  },

  actions: {
    /**
     * Toggle product selection
     * @param {Event} event - The click event
     */
    toggleProduct(event) {
      const ctx = getContext();
      const { ref } = getElement();
      const productId = parseInt(
        ref.getAttribute("data-product-id") || ref.closest("[data-product-id]")?.getAttribute("data-product-id") || "0",
        10
      );

      if (!productId) {
        return;
      }

      const index = ctx.selectedProducts.indexOf(productId);
      if (index > -1) {
        // Deselect
        ctx.selectedProducts.splice(index, 1);
      } else {
        // Select
        ctx.selectedProducts.push(productId);
      }

      // Update total price
      actions.updateTotal();
    },

    /**
     * Select all products
     */
    selectAll() {
      const ctx = getContext();
      ctx.selectedProducts = [...ctx.products.map((p) => p.id)];
      actions.updateTotal();
    },

    /**
     * Deselect all products
     */
    deselectAll() {
      const ctx = getContext();
      ctx.selectedProducts = [];
      actions.updateTotal();
    },

    /**
     * Update total price from selected products
     */
    updateTotal() {
      const ctx = getContext();
      const selectedProductsSet = new Set(ctx.selectedProducts);
      ctx.totalPrice = ctx.products
        .filter((p) => selectedProductsSet.has(p.id))
        .reduce((sum, p) => sum + p.price, 0);

      // Update formatted price display
      // Use accounting.js if available (WooCommerce uses this)
      if (typeof window.accounting !== "undefined" && typeof window.accounting.formatMoney === "function") {
        const currency = window.wcSettings?.currency || {};
        ctx.totalPriceFormatted = window.accounting.formatMoney(ctx.totalPrice, {
          symbol: currency.symbol || "$",
          precision: currency.precision || 2,
          decimal: currency.decimalSeparator || ".",
          thousand: currency.thousandSeparator || ",",
          format: currency.symbolPosition === "right" ? "%v%s" : "%s%v",
        });
      } else {
        // Fallback to basic formatting
        ctx.totalPriceFormatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(ctx.totalPrice);
      }
    },

    /**
     * Batch add selected products to cart via AJAX
     */
    async batchAddToCart() {
      const ctx = getContext();
      const { ref } = getElement();

      if (ctx.selectedProducts.length === 0) {
        alert("Please select at least one product");
        return;
      }

      const button = ref.closest(".yayboost-fbt-batch-add") || ref;
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Adding to cart...";

      try {
        const formData = new FormData();
        formData.append("action", "yayboost_fbt_batch_add");
        formData.append("nonce", state.nonce);
        formData.append("product_ids", JSON.stringify(ctx.selectedProducts));
        formData.append("current_product_id", ctx.currentProductId);

        const response = await fetch(state.ajaxUrl, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          // Trigger cart update events
          if (typeof jQuery !== "undefined") {
            jQuery(document.body).trigger("added_to_cart", [
              data.data.fragments,
              data.data.cart_hash,
              button,
            ]);
          }

          // Update cart fragments if available
          if (data.data.fragments) {
            Object.keys(data.data.fragments).forEach((key) => {
              const element = document.querySelector(key);
              if (element) {
                element.outerHTML = data.data.fragments[key];
              }
            });
          }

          // Show success message
          if (data.data.message) {
            // You can customize this to use WooCommerce notices
            console.log(data.data.message);
          }

          // Optionally redirect or show success
          button.textContent = "Added to cart!";
          setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
          }, 2000);
        } else {
          throw new Error(data.data?.message || "Failed to add products to cart");
        }
      } catch (error) {
        console.error("FBT Batch Add Error:", error);
        alert(error.message || "Error adding products to cart");
        button.textContent = originalText;
        button.disabled = false;
      }
    },
  },

  callbacks: {
    /**
     * Initialize the FBT block
     * Called via data-wp-init directive when block is rendered
     */
    init() {
      const ctx = getContext();

      // Initialize selected products if not set (default: all selected)
      if (!ctx.selectedProducts || ctx.selectedProducts.length === 0) {
        ctx.selectedProducts = [...ctx.products.map((p) => p.id)];
      }

      // Calculate initial total
      if (actions.updateTotal) {
        actions.updateTotal();
      }

      // Return cleanup function if needed
      return () => {
        // Cleanup if needed
      };
    },
  },

  selectors: {
    /**
     * Check if a product is selected
     * Used in data-wp-bind--checked directive
     */
    isProductSelected: (ref) => {
      const ctx = getContext();
      const productId = parseInt(
        ref.getAttribute("data-product-id") || "0",
        10
      );
      return ctx.selectedProducts && ctx.selectedProducts.includes(productId);
    },
  },
});

