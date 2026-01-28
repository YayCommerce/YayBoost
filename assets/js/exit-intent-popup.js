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

  // Wait for DOM to be ready before initializing
  // This ensures the popup HTML is rendered (important for block themes)
  function initExitIntentPopup() {
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

  // Main initialization function
  function initializePopup(popup, overlay, content, closeBtn, actionBtn) {
    // Check initial cart state from data attribute
    const initialHasItems = popup.getAttribute("data-has-items") === "1";
    if (!initialHasItems) {
      // Cart is empty initially - mark it
      localStorage.setItem("yayboost_exit_intent_cart_was_empty", "true");
    }

    // Check if popup was already shown (persists across page reloads)
    const popupShownKey = "yayboost_exit_intent_shown";
    const popupShown = localStorage.getItem(popupShownKey) === "true";

    // Reset shown state if cart was cleared (new session)
    if (!initialHasItems && popupShown) {
      // If cart is empty now but popup was shown before, reset it
      // This allows popup to show again when items are added
      localStorage.removeItem(popupShownKey);
    }

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

    // Store timeout reference for cleanup
    let backMarkerTimeout = null;

    /**
     * Check cart state via AJAX (real-time check)
     * Returns a promise that resolves to true if cart has items, false otherwise
     */
    function checkCartStateRealTime() {
      return new Promise(function (resolve) {
        if (!config.ajaxUrl || !config.nonce) {
          // Fallback to data attribute if AJAX not available
          const hasItems = popup
            ? popup.getAttribute("data-has-items") === "1"
            : false;
          resolve(hasItems);
          return;
        }

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
            const hasItems =
              data && data.success && data.data && data.data.has_items === true;
            // Update the data attribute with the real-time result
            if (popup) {
              popup.setAttribute("data-has-items", hasItems ? "1" : "0");
            }
            resolve(hasItems);
          })
          .catch(() => {
            // Fallback to data attribute on error
            const hasItems = popup
              ? popup.getAttribute("data-has-items") === "1"
              : false;
            resolve(hasItems);
          });
      });
    }

    /**
     * Show the popup
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
      document.body.style.overflow = "hidden"; // Prevent body
      localStorage.setItem(popupShownKey, "true");
    }

    /**
     * Hide the popup and mark as shown
     */
    function hidePopup() {
      if (!popup) {
        return;
      }
      if (
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

    function getTargetUrl(code) {
      if (config.behavior === "checkout_page" && config.checkoutUrl) {
        return appendCouponToUrl(config.checkoutUrl, code);
      }
      if (config.behavior === "cart_page" && config.cartUrl) {
        return appendCouponToUrl(config.cartUrl, code);
      }
      return "";
    }

    async function createCouponOnce() {
      const formData = new FormData();
      formData.append("action", "yayboost_exit_intent_coupon");
      formData.append("nonce", config.nonce);

      const resp = await fetch(config.ajaxUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const data = await resp.json();
      if (!data || !data.success || !data.data || !data.data.code) {
        throw new Error(data.data.message);
      }
      return data.data.code;
    }

    /**
     * Handle button click - create coupon then redirect/apply
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
      // help me add spin loading and disable button after click
      actionBtn.disabled = true;
      actionBtn.innerHTML =
        '<span class="yayboost-button-spinner"></span> ' + actionBtn.innerHTML;
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
        actionBtn.disabled = false;
        actionBtn.innerHTML = actionBtn.innerHTML.replace(
          '<span class="yayboost-button-spinner"></span>',
          "",
        );
        const targetUrl = getTargetUrl(code);
        if (targetUrl) {
          window.location.href = targetUrl;
          return;
        }
      } catch (err) {
        localStorage.removeItem(popupShownKey);
        triggered = false;
        actionBtn.disabled = false;
        actionBtn.innerHTML = actionBtn.innerHTML.replace(
          '<span class="yayboost-button-spinner"></span>',
          "",
        );
        actionBtn.classList.add(
          "yayboost-exit-intent-popup__button--continue-shopping",
        );
        actionBtn.setAttribute("original-text", actionBtn.innerHTML);
        // Change button text to "Try again"
        actionBtn.innerHTML = "Continue shopping";
        // create a div with class "yayboost-exit-intent-popup__error"
        const errorDiv = document.createElement("div");
        errorDiv.className = "yayboost-exit-intent-popup__error";
        errorDiv.appendChild(document.createTextNode(err.message));
        content.appendChild(errorDiv);
      }
    }

    /**
     * Initialize event listeners (extracted for re-initialization)
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
          // Also check if mouse was previously in viewport and now is above
          // Check localStorage directly to get current state
          const alreadyShown = localStorage.getItem(popupShownKey) === "true";
          if (
            mouseY <= 0 &&
            previousMouseY > 0 &&
            !triggered &&
            !alreadyShown
          ) {
            // Verify cart state in real-time before showing popup
            // This prevents showing popup when cart was just emptied via AJAX
            checkCartStateRealTime().then(function (hasItems) {
              if (hasItems && !triggered) {
                showPopup();
              }
            });
          }
        };
        document.addEventListener("mousemove", eventHandlers.mousemove);

        // Use mouseout as additional detection method
        eventHandlers.mouseout = function (e) {
          // Check localStorage directly to get current state
          const alreadyShown = localStorage.getItem(popupShownKey) === "true";
          if (
            (!e.relatedTarget || e.relatedTarget.nodeName === "HTML") &&
            e.clientY <= 0 &&
            !triggered &&
            !alreadyShown
          ) {
            // Verify cart state in real-time before showing popup
            // This prevents showing popup when cart was just emptied via AJAX
            checkCartStateRealTime().then(function (hasItems) {
              if (hasItems && !triggered) {
                showPopup();
              }
            });
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
        const alreadyShown = localStorage.getItem(popupShownKey) === "true";
        const hasItems = popup.getAttribute("data-has-items") === "1";

        // Only show popup if cart has items
        if (!hasItems) {
          return;
        }

        // Function to show popup after verifying cart state
        function showPopupIfCartHasItems() {
          checkCartStateRealTime().then(function (hasItemsRealTime) {
            if (hasItemsRealTime && !triggered && !alreadyShown) {
              showPopup();
            }
          });
        }

        // Check if this is a back navigation (state is null or doesn't have our marker)
        // This handles the case where back is pressed before marker is initialized
        if (!state || !state.yayboostExitIntent) {
          // If marker wasn't initialized yet, initialize it now and show popup
          if (!backMarkerInitialized && !triggered && !alreadyShown) {
            initBackMarker();
            showPopupIfCartHasItems();
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
          if (!triggered && !alreadyShown) {
            showPopupIfCartHasItems();
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
     * Cleanup function to remove all event listeners and clear timeouts
     * Call this when you want to completely remove the exit intent popup functionality
     */
    function cleanup() {
      // Remove mouse event listeners
      if (eventHandlers.mousemove) {
        document.removeEventListener("mousemove", eventHandlers.mousemove);
        eventHandlers.mousemove = null;
      }
      if (eventHandlers.mouseout) {
        document.removeEventListener("mouseout", eventHandlers.mouseout);
        eventHandlers.mouseout = null;
      }

      // Remove popstate listener
      if (eventHandlers.popstate) {
        window.removeEventListener("popstate", eventHandlers.popstate, false);
        eventHandlers.popstate = null;
      }

      // Remove button/overlay click listeners
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

      // Remove keyboard listener
      if (eventHandlers.keydown) {
        document.removeEventListener("keydown", eventHandlers.keydown);
        eventHandlers.keydown = null;
      }

      // Clear timeout
      if (backMarkerTimeout) {
        clearTimeout(backMarkerTimeout);
        backMarkerTimeout = null;
      }

      // Hide popup if visible
      hidePopup();

      // Reset initialization flag
      window.yayboostExitIntentPopupInitialized = false;
    }

    /**
     * Sync popup state based on cart status
     * Called when cart is updated via AJAX
     */
    function syncPopupState(hasItems) {
      if (!popup) {
        return;
      }

      // Update data attribute
      popup.setAttribute("data-has-items", hasItems ? "1" : "0");

      if (hasItems) {
        // Cart has items - ensure popup is available
        // Don't show it automatically, just make it available for exit intent
        const wasEmpty =
          localStorage.getItem("yayboost_exit_intent_cart_was_empty") ===
          "true";
        if (wasEmpty) {
          // Reset popup shown state when items are added (allows popup to show again)
          localStorage.removeItem(popupShownKey);
          localStorage.removeItem("yayboost_exit_intent_cart_was_empty");
          // Reset triggered state so popup can be shown
          triggered = false;
          // Initialize back button marker if not already initialized
          if (initBackMarker && typeof initBackMarker === "function") {
            initBackMarker();
          }
        }
      } else {
        // Cart is empty - hide popup if visible and mark cart as empty
        hidePopup();
        localStorage.setItem("yayboost_exit_intent_cart_was_empty", "true");
        // Reset triggered state to prevent popup from showing
        // This blocks any pending exit intent triggers that might be in flight
        triggered = false;
        // Also clear the shown state so popup can show again when items are added
        localStorage.removeItem(popupShownKey);
        // Reset back marker initialization so it can be re-initialized when items are added
        if (initBackMarker) {
          backMarkerInitialized = false;
        }
        // Don't cleanup completely - just prevent showing
        // Keep listeners in case items are added back
        // The real-time cart check in exit intent handlers will prevent showing
        // even if this sync happens slightly after the exit intent is detected
      }
    }

    // Listen for WooCommerce cart fragments update
    // WooCommerce triggers 'wc_fragment_refresh' event after updating fragments
    // Use jQuery if available, otherwise use vanilla JS
    if ($ && typeof $.fn.on === "function") {
      $(document.body).on("wc_fragment_refresh", function (event, data) {
        if (data && data.yayboost_exit_intent_popup_state) {
          syncPopupState(data.yayboost_exit_intent_popup_state.has_items);
        }
      });

      // Listen for when product is added to cart (AJAX)
      $(document.body).on(
        "added_to_cart",
        function (event, fragments, cart_hash, $button) {
          // Check cart status via AJAX after a short delay to ensure cart is updated
          setTimeout(function () {
            if (config.ajaxUrl && config.nonce) {
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
                .catch(() => {
                  // Silently fail if AJAX check fails
                });
            }
          }, 100);
        },
      );

      // Also listen for cart updated event (WooCommerce 3.x+)
      // This fires when cart items are removed, quantities updated, etc.
      $(document.body).on("updated_cart_totals", function () {
        // Check cart status via AJAX immediately
        if (config.ajaxUrl && config.nonce) {
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
            .catch(() => {
              // Silently fail if AJAX check fails
            });
        }
      });

      // Listen specifically for cart item removal
      $(document.body).on(
        "removed_from_cart",
        function (event, fragments, cart_hash, button) {
          // Immediately check cart status when item is removed
          if (config.ajaxUrl && config.nonce) {
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
              .catch(() => {
                // Silently fail if AJAX check fails
              });
          }
        },
      );
    } else {
      // Fallback for vanilla JS when jQuery is not available
      // WooCommerce custom events are typically jQuery events, but we can listen via DOM events
      document.body.addEventListener("wc_fragment_refresh", function (event) {
        if (event.detail && event.detail.yayboost_exit_intent_popup_state) {
          syncPopupState(
            event.detail.yayboost_exit_intent_popup_state.has_items,
          );
        }
      });

      document.body.addEventListener("added_to_cart", function (event) {
        setTimeout(function () {
          if (config.ajaxUrl && config.nonce) {
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
              .catch(() => {
                // Silently fail if AJAX check fails
              });
          }
        }, 100);
      });

      document.body.addEventListener("updated_cart_totals", function () {
        if (config.ajaxUrl && config.nonce) {
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
            .catch(() => {
              // Silently fail if AJAX check fails
            });
        }
      });

      // Listen for cart item removal (vanilla JS fallback)
      document.body.addEventListener("removed_from_cart", function () {
        if (config.ajaxUrl && config.nonce) {
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
            .catch(() => {
              // Silently fail if AJAX check fails
            });
        }
      });
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
