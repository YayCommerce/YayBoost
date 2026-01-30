(function ($) {
  "use strict";

  // Prevent duplicate initialization
  if (window.yayboostExitIntentPopupInitialized) {
    return;
  }

  // Check if localized data exists
  if (typeof yayboostExitIntentPopup === "undefined") {
    return;
  }

  // Mark as initialized
  window.yayboostExitIntentPopupInitialized = true;

  const config = yayboostExitIntentPopup;

  /**
   * Initialize exit intent popup
   * @returns {void}
   */
  function initExitIntentPopup() {
    // Check server-side eligibility first
    if (!config.isEligible) {
      console.log("[YayBoost] Exit intent popup: not eligible (server)");
      return;
    }

    const popup = document.getElementById("yayboost-exit-intent-popup");
    const overlay = popup
      ? popup.querySelector(".yayboost-exit-intent-popup__overlay")
      : null;
    const content = popup
      ? popup.querySelector(".yayboost-exit-intent-popup__content")
      : null;
    const closeBtn = popup
      ? popup.querySelector(".yayboost-exit-intent-popup__close")
      : null;
    const actionBtn = popup
      ? popup.querySelector(".yayboost-exit-intent-popup__button")
      : null;

    if (!popup) {
      // If popup not found, try again after a short delay (for block themes)
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initExitIntentPopup);
      } else {
        // DOM is ready but popup not found - wait a bit more
        setTimeout(initExitIntentPopup, 100);
      }
      return;
    }

    // Popup found, proceed with initialization
    initializePopup(popup, overlay, content, closeBtn, actionBtn);
  }

  /**
   * Main popup initialization
   * @param {HTMLElement} popup - Popup element
   * @param {HTMLElement} overlay - Overlay element
   * @param {HTMLElement} content - Content element
   * @param {HTMLElement} closeBtn - Close button element
   * @param {HTMLElement} actionBtn - Action button element
   * @returns {void}
   */
  function initializePopup(popup, overlay, content, closeBtn, actionBtn) {
    // Check initial cart state from data attribute
    const initialHasItems = popup.getAttribute("data-has-items") === "1";

    let mouseY = 0;
    let previousMouseY = 0;
    let triggered = false;

    // Store event listener references for cleanup
    const eventHandlers = {
      mousemove: null,
      mouseout: null,
      popstate: null,
      closeBtnClick: null,
      overlayClick: null,
      actionBtnClick: null,
      keydown: null,
    };

    /**
     * Mark popup as shown on server
     * @returns {Promise<boolean>} True if successful
     */
    async function markShownOnServer() {
      if (!config.ajaxUrl || !config.nonce) {
        return false;
      }

      try {
        const formData = new FormData();
        formData.append("action", "yayboost_exit_intent_shown");
        formData.append("nonce", config.nonce);

        const resp = await fetch(config.ajaxUrl, {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        });

        const data = await resp.json();
        return data && data.success;
      } catch (error) {
        console.error("[YayBoost] Failed to mark shown:", error);
        return false;
      }
    }

    /**
     * Show the popup and mark as shown on server
     * @returns {void}
     */
    function showPopup() {
      if (triggered || !popup) {
        return;
      }

      // Double-check cart has items before showing
      const hasItems = popup.getAttribute("data-has-items") === "1";
      if (!hasItems) {
        return;
      }

      triggered = true;
      popup.style.display = "flex"; // Use flex to ensure proper centering
      document.body.style.overflow = "hidden"; // Prevent body scroll

      // Mark as shown on server (fire and forget)
      markShownOnServer().catch(() => {
        // Ignore errors - popup is already shown
      });
    }

    /**
     * Hide the popup
     * @returns {void}
     */
    function hidePopup() {
      if (!popup) {
        return;
      }
      if (
        actionBtn &&
        actionBtn.classList.contains(
          "yayboost-exit-intent-popup__button--continue-shopping",
        )
      ) {
        actionBtn.classList.remove(
          "yayboost-exit-intent-popup__button--continue-shopping",
        );
        // delete the error div
        const errorDiv = content.querySelector(
          ".yayboost-exit-intent-popup__error",
        );
        if (errorDiv) {
          errorDiv.remove();
        }
        actionBtn.innerHTML = actionBtn.getAttribute("original-text");
      }
      popup.style.display = "none";
      document.body.style.overflow = ""; // Restore body scroll
    }

    /**
     * Append coupon code to URL query parameters
     * @param {string} url - Target URL
     * @param {string} code - Coupon code
     * @returns {string} URL with coupon parameter
     */
    function appendCouponToUrl(url, code) {
      if (!url) return "";
      if (!code) return url;
      try {
        const u = new URL(url, window.location.origin);
        u.searchParams.set("coupon_code", code);
        return u.toString();
      } catch (e) {
        // Fallback for older browsers without URL
        const sep = url.indexOf("?") === -1 ? "?" : "&";
        return url + sep + "coupon_code=" + encodeURIComponent(code);
      }
    }

    /**
     * Get target redirect URL based on behavior setting
     * @param {string} code - Coupon code
     * @returns {string} Target URL
     */
    function getTargetUrl(code) {
      if (config.behavior === "checkout_page" && config.checkoutUrl) {
        return appendCouponToUrl(config.checkoutUrl, code);
      }
      if (config.behavior === "cart_page" && config.cartUrl) {
        return appendCouponToUrl(config.cartUrl, code);
      }
      return "";
    }

    /**
     * Create one-time coupon via AJAX
     * @returns {Promise<string>} Coupon code
     * @throws {Error} If request fails
     */
    async function createCouponOnce() {
      const formData = new FormData();
      formData.append("action", "yayboost_exit_intent_coupon");
      formData.append("nonce", config.nonce);

      try {
        const resp = await fetch(config.ajaxUrl, {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        });

        if (!resp.ok) {
          const errorText = await resp.text();
          console.error(
            "[YayBoost] Coupon request failed:",
            resp.status,
            errorText,
          );
          throw new Error(`Request failed: ${resp.status}`);
        }

        const data = await resp.json();

        if (!data || !data.success || !data.data || !data.data.code) {
          console.error("[YayBoost] Invalid coupon response:", data);
          throw new Error(data?.data?.message || "Invalid response");
        }

        return data.data.code;
      } catch (error) {
        console.error("[YayBoost] createCouponOnce error:", error);
        throw error;
      }
    }

    /**
     * Handle action button click - create coupon and redirect
     * @returns {Promise<void>}
     */
    async function handleActionClick() {
      if (
        actionBtn.classList.contains(
          "yayboost-exit-intent-popup__button--continue-shopping",
        )
      ) {
        window.location.href = config.shopUrl;
        return;
      }

      // Disable button to prevent double-click
      actionBtn.disabled = true;
      actionBtn.classList.add("yayboost-exit-intent-popup__button--loading");
      const originalHTML = actionBtn.innerHTML;
      actionBtn.innerHTML =
        '<span class="yayboost-button-spinner"></span> ' + originalHTML;

      // If offer is "no discount", skip coupon creation
      if (config.offer && config.offer.type === "no_discount") {
        const targetUrl = getTargetUrl("");
        if (targetUrl) {
          window.location.href = targetUrl;
          return;
        }
        hidePopup();
        return;
      }

      try {
        const code = await createCouponOnce();
        const targetUrl = getTargetUrl(code);

        if (targetUrl) {
          window.location.href = targetUrl;
          return;
        }

        hidePopup();
      } catch (err) {
        console.error("[YayBoost] Coupon creation failed:", err);

        // Reset triggered to allow showing popup again
        triggered = false;
        actionBtn.disabled = false;
        actionBtn.classList.remove("yayboost-exit-intent-popup__button--loading");
        actionBtn.innerHTML = originalHTML;

        // Show user feedback
        actionBtn.classList.add(
          "yayboost-exit-intent-popup__button--continue-shopping",
        );
        actionBtn.setAttribute("original-text", originalHTML);
        actionBtn.innerHTML = "Continue shopping";

        // Create error message
        const errorDiv = document.createElement("div");
        errorDiv.className = "yayboost-exit-intent-popup__error";
        errorDiv.appendChild(
          document.createTextNode(err.message || "Something went wrong..."),
        );
        content.appendChild(errorDiv);
      }
    }

    /**
     * Initialize event listeners for exit intent detection
     * @returns {void}
     */
    function initializeEventListeners() {
      // Exit intent detection: Mouse leaves viewport
      if (config.trigger.leaves_viewport) {
        // Remove existing listeners if any
        if (eventHandlers.mousemove) {
          document.removeEventListener("mousemove", eventHandlers.mousemove);
        }
        if (eventHandlers.mouseout) {
          document.removeEventListener("mouseout", eventHandlers.mouseout);
        }

        // Track mouse movement to detect when it goes above viewport
        eventHandlers.mousemove = function (e) {
          previousMouseY = mouseY;
          mouseY = e.clientY;

          // If mouse moves above viewport (y <= 0), trigger popup
          // showPopup() already checks data-has-items attribute
          if (mouseY <= 0 && previousMouseY > 0 && !triggered) {
            showPopup();
          }
        };
        document.addEventListener("mousemove", eventHandlers.mousemove);

        // Use mouseout as additional detection method
        // showPopup() already checks data-has-items attribute
        eventHandlers.mouseout = function (e) {
          if (
            (!e.relatedTarget || e.relatedTarget.nodeName === "HTML") &&
            e.clientY <= 0 &&
            !triggered
          ) {
            showPopup();
          }
        };
        document.addEventListener("mouseout", eventHandlers.mouseout);
      }
    }

    // Always initialize event listeners
    // They will check cart state before showing popup
    initializeEventListeners();

    // Back button detection - always set up listener, but check cart state
    let initBackMarker = null;
    let backMarkerInitialized = false;
    if (config.trigger.back_button_pressed) {
      const markerState = { yayboostExitIntent: true };

      function mergeState(state, extra) {
        return Object.assign({}, state || {}, extra || {});
      }

      initBackMarker = function () {
        const hasItems = popup.getAttribute("data-has-items") === "1";
        if (!hasItems) {
          // Reset initialization flag if cart is empty
          backMarkerInitialized = false;
          return;
        }
        if (backMarkerInitialized) {
          return;
        }
        backMarkerInitialized = true;
        try {
          window.history.replaceState(
            mergeState(window.history.state, markerState),
            "",
            window.location.href,
          );
          window.history.pushState(
            mergeState(markerState, { ts: Date.now() }),
            "",
            window.location.href,
          );
        } catch (err) {
          // Ignore history errors (should be rare)
        }
      };

      // Initialize marker immediately if cart has items, otherwise wait for items to be added
      if (initialHasItems) {
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(initBackMarker);
        } else {
          // Fallback for older browsers
          setTimeout(initBackMarker, 0);
        }
      }

      eventHandlers.popstate = function (e) {
        const state = e.state || window.history.state || {};
        const hasItems = popup.getAttribute("data-has-items") === "1";

        // Only show popup if cart has items
        if (!hasItems) {
          return;
        }

        // Check if this is a back navigation (state is null or doesn't have our marker)
        if (!state || !state.yayboostExitIntent) {
          // If marker wasn't initialized yet, initialize it now and show popup
          if (!backMarkerInitialized && !triggered) {
            initBackMarker();
            showPopup();
            // Push marker to keep user on page
            setTimeout(function () {
              try {
                window.history.pushState(
                  mergeState(markerState, { ts: Date.now() }),
                  "",
                  window.location.href,
                );
              } catch (err) {
                // ignore
              }
            }, 0);
            return;
          }
        }

        // Handle our own marker state
        if (state && state.yayboostExitIntent) {
          if (!triggered) {
            showPopup();
            // Re-push marker so the user stays on the page for this back press
            setTimeout(function () {
              try {
                window.history.pushState(
                  mergeState(markerState, { ts: Date.now() }),
                  "",
                  window.location.href,
                );
              } catch (err) {
                // ignore
              }
            }, 0);
          }
          // If already shown, allow navigation by not re-pushing
        }
      };
      window.addEventListener("popstate", eventHandlers.popstate, false);
    }

    // Close button event
    if (closeBtn) {
      eventHandlers.closeBtnClick = function (e) {
        e.preventDefault();
        hidePopup();
      };
      closeBtn.addEventListener("click", eventHandlers.closeBtnClick);
    }

    // Overlay click to close
    if (overlay) {
      eventHandlers.overlayClick = function (e) {
        e.preventDefault();
        hidePopup();
      };
      overlay.addEventListener("click", eventHandlers.overlayClick);
    }

    // Action button click
    if (actionBtn) {
      eventHandlers.actionBtnClick = function (e) {
        e.preventDefault();
        handleActionClick();
      };
      actionBtn.addEventListener("click", eventHandlers.actionBtnClick);
    }

    // ESC key to close
    eventHandlers.keydown = function (e) {
      if (
        e.key === "Escape" &&
        popup &&
        popup.style.display !== "none" &&
        popup.style.display !== ""
      ) {
        hidePopup();
      }
    };
    document.addEventListener("keydown", eventHandlers.keydown);

    /**
     * Remove all event listeners and cleanup
     * @returns {void}
     */
    function cleanup() {
      // Remove document listeners
      if (eventHandlers.mousemove) {
        document.removeEventListener("mousemove", eventHandlers.mousemove);
        eventHandlers.mousemove = null;
      }
      if (eventHandlers.mouseout) {
        document.removeEventListener("mouseout", eventHandlers.mouseout);
        eventHandlers.mouseout = null;
      }
      if (eventHandlers.keydown) {
        document.removeEventListener("keydown", eventHandlers.keydown);
        eventHandlers.keydown = null;
      }

      // Remove window listeners
      if (eventHandlers.popstate) {
        window.removeEventListener("popstate", eventHandlers.popstate, false);
        eventHandlers.popstate = null;
      }

      // Remove element listeners
      if (closeBtn && eventHandlers.closeBtnClick) {
        closeBtn.removeEventListener("click", eventHandlers.closeBtnClick);
        eventHandlers.closeBtnClick = null;
      }
      if (overlay && eventHandlers.overlayClick) {
        overlay.removeEventListener("click", eventHandlers.overlayClick);
        eventHandlers.overlayClick = null;
      }
      if (actionBtn && eventHandlers.actionBtnClick) {
        actionBtn.removeEventListener("click", eventHandlers.actionBtnClick);
        eventHandlers.actionBtnClick = null;
      }

      // Unsubscribe from WC Blocks store (if subscribed)
      if (typeof window.yayboostExitIntentPopupUnsubscribe === "function") {
        window.yayboostExitIntentPopupUnsubscribe();
        window.yayboostExitIntentPopupUnsubscribe = null;
      }

      // Hide popup if visible
      hidePopup();

      // Reset initialization flag
      window.yayboostExitIntentPopupInitialized = false;
    }

    /**
     * Sync popup state based on cart status
     *
     * Simple logic:
     * - Only update data-has-items attribute for exit intent check
     * - Never reset triggered - once shown/triggered, done for this page load
     * - Hide popup if cart empties while visible
     *
     * @param {boolean} hasItems - Whether cart has items
     * @returns {void}
     */
    function syncPopupState(hasItems) {
      if (!popup) {
        return;
      }

      // Update data attribute for exit intent trigger check
      popup.setAttribute("data-has-items", hasItems ? "1" : "0");

      if (hasItems) {
        // Initialize back button marker if cart gets items (for delayed add-to-cart scenario)
        if (initBackMarker && typeof initBackMarker === "function") {
          initBackMarker();
        }
      } else {
        // Cart is empty - hide popup if currently visible
        if (popup.style.display !== "none" && popup.style.display !== "") {
          hidePopup();
        }
      }
    }

    /**
     * Fetch cart state and sync popup (DRY helper)
     * @param {number} delay - Optional delay in ms before fetching
     * @returns {void}
     */
    function fetchAndSyncCartState(delay = 0) {
      const doFetch = () => {
        if (!config.ajaxUrl || !config.nonce) return;
        const formData = new FormData();
        formData.append("action", "yayboost_exit_intent_check_cart");
        formData.append("nonce", config.nonce);
        fetch(config.ajaxUrl, {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        })
          .then((resp) => resp.json())
          .then((data) => {
            if (data && data.success && data.data) {
              syncPopupState(data.data.has_items);
            }
          })
          .catch(() => {}); // Silently fail
      };
      delay > 0 ? setTimeout(doFetch, delay) : doFetch();
    }

    /**
     * Handle WC fragment refresh event
     * @param {Object} data - Fragment data
     */
    function handleFragmentRefresh(data) {
      if (data && data.yayboost_exit_intent_popup_state) {
        syncPopupState(data.yayboost_exit_intent_popup_state.has_items);
      }
    }

    // WooCommerce Classic event listeners (jQuery preferred, vanilla JS fallback)
    if ($ && typeof $.fn.on === "function") {
      $(document.body).on("wc_fragment_refresh", (e, data) => handleFragmentRefresh(data));
      $(document.body).on("added_to_cart", () => fetchAndSyncCartState(100));
      $(document.body).on("updated_cart_totals", () => fetchAndSyncCartState());
      $(document.body).on("removed_from_cart", () => fetchAndSyncCartState());
    } else {
      document.body.addEventListener("wc_fragment_refresh", (e) => handleFragmentRefresh(e.detail));
      document.body.addEventListener("added_to_cart", () => fetchAndSyncCartState(100));
      document.body.addEventListener("updated_cart_totals", () => fetchAndSyncCartState());
      document.body.addEventListener("removed_from_cart", () => fetchAndSyncCartState());
    }

    // WooCommerce Blocks event listeners (for block themes)
    // These events are dispatched by WC Blocks when cart changes
    document.body.addEventListener("wc-blocks_added_to_cart", () => fetchAndSyncCartState(100));
    document.body.addEventListener("wc-blocks_removed_from_cart", () => fetchAndSyncCartState(100));

    // Listen to WC Store API cart changes via wp.data (if available)
    // This is the most reliable method for block themes
    if (window.wp && window.wp.data && window.wp.data.subscribe) {
      let previousCartCount = null;
      const unsubscribe = window.wp.data.subscribe(() => {
        const store = window.wp.data.select("wc/store/cart");
        if (store && typeof store.getCartTotals === "function") {
          const totals = store.getCartTotals();
          const currentCount = totals?.total_items ?? null;
          if (previousCartCount !== null && currentCount !== previousCartCount) {
            fetchAndSyncCartState(100);
          }
          previousCartCount = currentCount;
        }
      });
      // Store unsubscribe for potential cleanup
      window.yayboostExitIntentPopupUnsubscribe = unsubscribe;
    }

    // Expose cleanup function globally for external access
    window.yayboostExitIntentPopupCleanup = cleanup;

    // Expose sync function for external access
    window.yayboostExitIntentPopupSync = syncPopupState;
  }

  // Start initialization
  // Wait for both DOM and jQuery (if needed) to be ready
  function startInit() {
    // Check if DOM is already ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initExitIntentPopup);
    } else {
      // DOM is already ready, but wait a bit for block themes to render
      // Block themes may render content asynchronously
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(function () {
          setTimeout(initExitIntentPopup, 0);
        });
      } else {
        setTimeout(initExitIntentPopup, 0);
      }
    }
  }

  // If jQuery is not available yet, wait for it (WooCommerce requires jQuery)
  if (typeof jQuery === "undefined" && typeof $ === "undefined") {
    // Wait for jQuery to load (max 5 seconds)
    let jqueryWaitCount = 0;
    const jqueryCheckInterval = setInterval(function () {
      jqueryWaitCount++;
      if (
        typeof jQuery !== "undefined" ||
        typeof $ !== "undefined" ||
        jqueryWaitCount > 50
      ) {
        clearInterval(jqueryCheckInterval);
        startInit();
      }
    }, 100);
  } else {
    startInit();
  }
})(
  typeof jQuery !== "undefined" ? jQuery : typeof $ !== "undefined" ? $ : null,
);
