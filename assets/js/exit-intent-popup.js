(function ($) {
    'use strict';
    // Prevent duplicate initialization
    if (window.yayboostExitIntentPopupInitialized) {
      return;
    }
  
    // Check if localized data exists
    if (typeof yayboostExitIntentPopup === 'undefined') {
      return;
    }
  
    // Mark as initialized
    window.yayboostExitIntentPopupInitialized = true;
  
    const config = yayboostExitIntentPopup;
    const popup = document.getElementById('yayboost-exit-intent-popup');
    const overlay = popup ? popup.querySelector('.yayboost-exit-intent-popup__overlay') : null;
    const closeBtn = popup ? popup.querySelector('.yayboost-exit-intent-popup__close') : null;
    const actionBtn = popup ? popup.querySelector('.yayboost-exit-intent-popup__button') : null;
    if (!popup) {
      return;
    }
  
    // Check if popup was already shown in this session
    const popupShownKey = 'yayboost_exit_intent_shown';
    const popupShown = sessionStorage.getItem(popupShownKey) === 'true';
    
    // Only show once per session
    if (popupShown) {
      return;
    }
  
    let mouseY = 0;
    let triggered = false;
    
    // Store event listener references for cleanup
    const eventHandlers = {
      mouseleave: null,
      mousemove: null,
      popstate: null,
      closeBtnClick: null,
      overlayClick: null,
      actionBtnClick: null,
      keydown: null
    };
    
    // Store timeout reference for cleanup
    let backMarkerTimeout = null;
  
    /**
     * Show the popup
     */
    function showPopup() {
      if (triggered || !popup) {
        return;
      }
  
      triggered = true;
      popup.style.display = 'flex'; // Use flex to ensure proper centering
      document.body.style.overflow = 'hidden'; // Prevent body scroll
    }
  
    /**
     * Hide the popup
     */
    function hidePopup() {
      if (!popup) {
        return;
      }
      popup.style.display = 'none';
      document.body.style.overflow = ''; // Restore body scroll
    }

    function appendCouponToUrl(url, code) {
      if (!url) return '';
      if (!code) return url;
      try {
        const u = new URL(url, window.location.origin);
        u.searchParams.set('coupon_code', code);
        return u.toString();
      } catch (e) {
        // Fallback for older browsers without URL
        const sep = url.indexOf('?') === -1 ? '?' : '&';
        return url + sep + 'coupon_code=' + encodeURIComponent(code);
      }
    }

    function getTargetUrl(code) {
      if (config.behavior === 'checkout_page' && config.checkoutUrl) {
        return appendCouponToUrl(config.checkoutUrl, code);
      }
      if (config.behavior === 'cart_page' && config.cartUrl) {
        return appendCouponToUrl(config.cartUrl, code);
      }
      return '';
    }

    async function createCouponOnce() {
      const formData = new FormData();
      formData.append('action', 'yayboost_exit_intent_coupon');
      formData.append('nonce', config.nonce);
      
      const resp = await fetch(config.ajaxUrl, {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });

      if (!resp.ok) {
        throw new Error('Request failed');
      }
      const data = await resp.json();
      if (!data || !data.success || !data.data || !data.data.code) {
        throw new Error('Invalid response');
      }
      return data.data.code;
    }

    /**
     * Handle button click - create coupon then redirect/apply
     */
    async function handleActionClick() {
      // If offer is "no discount", skip coupon creation
      if (config.offer && config.offer.type === 'no_discount') {
        sessionStorage.setItem(popupShownKey, 'true');
        const targetUrl = getTargetUrl('');
        if (targetUrl) {
          window.location.href = targetUrl;
          return;
        }
        hidePopup();
        return;
      }

      try {
        const code = await createCouponOnce();
        sessionStorage.setItem(popupShownKey, 'true');

        const targetUrl = getTargetUrl(code);
        if (targetUrl) {
          window.location.href = targetUrl;
          return;
        }
      } catch (err) {
        // Fallback: still redirect if configured
        const targetUrl = getTargetUrl('');
        if (targetUrl) {
          window.location.href = targetUrl;
          return;
        }
      }

      hidePopup();
    }
  
    // Exit intent detection: Mouse leaves viewport
    if (config.trigger.leaves_viewport) {
      eventHandlers.mouseleave = function (e) {
        // Check if mouse is leaving towards the top of the window
        if (e.clientY <= 0 && !triggered && !popupShown) {
          showPopup();
        }
      };
      document.addEventListener('mouseleave', eventHandlers.mouseleave);
  
      // Also track mouse movement to detect when it goes above viewport
      eventHandlers.mousemove = function (e) {
        mouseY = e.clientY;
  
        // If mouse moves above viewport (y < 0), trigger popup
        if (mouseY < 0 && !triggered && !popupShown) {
          showPopup();
        }
      };
      document.addEventListener('mousemove', eventHandlers.mousemove);
    }
  
    // Back button detection
    if (config.trigger.back_button_pressed) {
      const markerState = { yayboostExitIntent: true };
      let backMarkerInitialized = false;

      function mergeState(state, extra) {
        return Object.assign({}, state || {}, extra || {});
      }

      function initBackMarker() {
        if (backMarkerInitialized) {
          return;
        }
        backMarkerInitialized = true;
        try {
          window.history.replaceState(
            mergeState(window.history.state, markerState),
            '',
            window.location.href
          );
          window.history.pushState(
            mergeState(markerState, { ts: Date.now() }),
            '',
            window.location.href
          );
        } catch (err) {
          // Ignore history errors (should be rare)
        }
      }

      // Delay marker setup slightly to ensure page is ready
      backMarkerTimeout = setTimeout(initBackMarker, 120);

      eventHandlers.popstate = function (e) {
        const state = e.state || window.history.state || {};
        const alreadyShown = sessionStorage.getItem(popupShownKey) === 'true';

        // Only handle our own marker state
        if (state && state.yayboostExitIntent) {
          if (!triggered && !alreadyShown) {
            showPopup();
            // Re-push marker so the user stays on the page for this back press
            setTimeout(function () {
              try {
                window.history.pushState(
                  mergeState(markerState, { ts: Date.now() }),
                  '',
                  window.location.href
                );
              } catch (err) {
                // ignore
              }
            }, 0);
          }
          // If already shown, allow navigation by not re-pushing
        }
      };
      window.addEventListener('popstate', eventHandlers.popstate, false);
    }
  
    // Close button event
    if (closeBtn) {
      eventHandlers.closeBtnClick = function (e) {
        e.preventDefault();
        hidePopup();
      };
      closeBtn.addEventListener('click', eventHandlers.closeBtnClick);
    }
  
    // Overlay click to close
    if (overlay) {
      eventHandlers.overlayClick = function (e) {
        e.preventDefault();
        hidePopup();
      };
      overlay.addEventListener('click', eventHandlers.overlayClick);
    }
  
    // Action button click
    if (actionBtn) {
      eventHandlers.actionBtnClick = function (e) {
        e.preventDefault();
        handleActionClick();
      };
      actionBtn.addEventListener('click', eventHandlers.actionBtnClick);
    }
  
    // ESC key to close
    eventHandlers.keydown = function (e) {
      if (e.key === 'Escape' && popup && popup.style.display !== 'none' && popup.style.display !== '') {
        hidePopup();
      }
    };
    document.addEventListener('keydown', eventHandlers.keydown);

    /**
     * Cleanup function to remove all event listeners and clear timeouts
     * Call this when you want to completely remove the exit intent popup functionality
     */
    function cleanup() {
      // Remove mouse event listeners
      if (eventHandlers.mouseleave) {
        document.removeEventListener('mouseleave', eventHandlers.mouseleave);
        eventHandlers.mouseleave = null;
      }
      if (eventHandlers.mousemove) {
        document.removeEventListener('mousemove', eventHandlers.mousemove);
        eventHandlers.mousemove = null;
      }

      // Remove popstate listener
      if (eventHandlers.popstate) {
        window.removeEventListener('popstate', eventHandlers.popstate, false);
        eventHandlers.popstate = null;
      }

      // Remove button/overlay click listeners
      if (closeBtn && eventHandlers.closeBtnClick) {
        closeBtn.removeEventListener('click', eventHandlers.closeBtnClick);
        eventHandlers.closeBtnClick = null;
      }
      if (overlay && eventHandlers.overlayClick) {
        overlay.removeEventListener('click', eventHandlers.overlayClick);
        eventHandlers.overlayClick = null;
      }
      if (actionBtn && eventHandlers.actionBtnClick) {
        actionBtn.removeEventListener('click', eventHandlers.actionBtnClick);
        eventHandlers.actionBtnClick = null;
      }

      // Remove keyboard listener
      if (eventHandlers.keydown) {
        document.removeEventListener('keydown', eventHandlers.keydown);
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

    // Expose cleanup function globally for external access
    window.yayboostExitIntentPopupCleanup = cleanup;
  })(jQuery);
  