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
    const overlay = popup?.querySelector('.yayboost-exit-intent-popup__overlay');
    const closeBtn = popup?.querySelector('.yayboost-exit-intent-popup__close');
    const actionBtn = popup?.querySelector('.yayboost-exit-intent-popup__button');
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
      triggered = false;
      popup.style.display = 'none';
      document.body.style.overflow = ''; // Restore body scroll
    }
  
    /**
     * Handle button click - redirect to checkout
     */
    function handleActionClick() {
      // Mark as shown only when CTA is clicked
      sessionStorage.setItem(popupShownKey, 'true');

      if (config.behavior === 'checkout_page' && config.checkoutUrl) {
        window.location.href = config.checkoutUrl;
      } else {
        hidePopup();
      }
    }
  
    // Exit intent detection: Mouse leaves viewport
    if (config.trigger.leaves_viewport) {
      document.addEventListener('mouseleave', function (e) {
        // Check if mouse is leaving towards the top of the window
        if (e.clientY <= 0 && !triggered && !popupShown) {
          showPopup();
        }
      });
  
      // Also track mouse movement to detect when it goes above viewport
      document.addEventListener('mousemove', function (e) {
        mouseY = e.clientY;
  
        // If mouse moves above viewport (y < 0), trigger popup
        if (mouseY < 0 && !triggered && !popupShown) {
          showPopup();
        }
      });
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
      setTimeout(initBackMarker, 120);

      window.addEventListener(
        'popstate',
        function (e) {
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
        },
        false
      );
    }
  
    // Close button event
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        hidePopup();
      });
    }
  
    // Overlay click to close
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        e.preventDefault();
        hidePopup();
      });
    }
  
    // Action button click
    if (actionBtn) {
      actionBtn.addEventListener('click', function (e) {
        e.preventDefault();
        handleActionClick();
      });
    }
  
    // ESC key to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && popup && popup.style.display !== 'none' && popup.style.display !== '') {
        hidePopup();
      }
    });
  })(jQuery);
  