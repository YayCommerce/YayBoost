(function ($) {
  "use strict";

  if (window.yayboostEmailCapturePopupInitialized) {
    return;
  }

  if (typeof yayboostEmailCapturePopup === "undefined") {
    return;
  }

  window.yayboostEmailCapturePopupInitialized = true;
  const config = yayboostEmailCapturePopup;

  /**
   * Normalize URL for comparison (strip hash, trailing slash variations)
   * @param {string} url - URL to normalize
   * @returns {string} Normalized URL
   */
  function normalizeUrl(url) {
    if (!url) return "";
    try {
      const u = new URL(url, window.location.origin);
      u.hash = "";
      let path = u.pathname.replace(/\/+$/, "") || "/";
      if (u.search) {
        path += u.search;
      }
      return u.origin + path;
    } catch (e) {
      return url.split("#")[0].replace(/\/+$/, "") || url;
    }
  }

  /**
   * Check if link points to cart page
   * @param {HTMLAnchorElement} link - Link element
   * @returns {boolean}
   */
  function isCartLink(link) {
    if (!link || !link.href || !config.cartUrl) return false;
    const linkNorm = normalizeUrl(link.href);
    const cartNorm = normalizeUrl(config.cartUrl);
    return linkNorm === cartNorm || linkNorm.startsWith(cartNorm + "?") || linkNorm.startsWith(cartNorm + "&");
  }

  function initEmailCapturePopup() {
    if (!config.isEligible) {
      return;
    }

    const $popup = $("#yayboost-email-capture-popup");
    const $overlay = $popup.find(".yayboost-email-capture-popup__overlay");
    const $content = $popup.find(".yayboost-email-capture-popup__content");
    const $closeBtn = $popup.find(".yayboost-email-capture-popup__close");
    const $submitBtn = $popup.find(".yayboost-email-capture-popup__button");
    const $emailInput = $popup.find(".yayboost-email-capture-popup__input");

    if (!$popup.length) {
      setTimeout(initEmailCapturePopup, 100);
      return;
    }

    let pendingCartUrl = config.cartUrl || "";

    function showPopup(cartUrl) {
      pendingCartUrl = cartUrl || config.cartUrl || "";
      $popup.css("display", "flex");
      $("body").css("overflow", "hidden");
      $emailInput.val("").focus();
    }

    function redirectToCart() {
      const url = pendingCartUrl || config.cartUrl;
      if (url) {
        window.location.href = url;
      }
    }

    function hidePopup() {
      $content.find(".yayboost-email-capture-popup__error").remove();
      $submitBtn.prop("disabled", false).removeClass("yayboost-email-capture-popup__button--loading");
      const origText = $submitBtn.attr("data-original-text");
      if (origText) {
        $submitBtn.text(origText);
      }
      $popup.css("display", "none");
      $("body").css("overflow", "");
    }

    function showError(msg) {
      $content.find(".yayboost-email-capture-popup__error").remove();
      $content.append($("<div>").addClass("yayboost-email-capture-popup__error").text(msg));
    }

    function handleSubmit() {
      const email = $emailInput.val().trim();
      if (!email) {
        showError(config.messages?.invalidEmail || "Please enter your email.");
        return;
      }

      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(email)) {
        showError(config.messages?.invalidEmail || "Please enter a valid email.");
        return;
      }

      $submitBtn.prop("disabled", true).attr("data-original-text", $submitBtn.text());
      $submitBtn.addClass("yayboost-email-capture-popup__button--loading");
      $submitBtn.html('<span class="yayboost-ecp-button-spinner"></span> ' + ($submitBtn.attr("data-original-text") || ""));

      $content.find(".yayboost-email-capture-popup__error").remove();

      $.ajax({
        url: config.ajaxUrl,
        type: "POST",
        data: {
          action: "yayboost_email_capture_submit",
          nonce: config.nonce,
          email: email,
        },
        success: function (data) {
          if (data && data.success) {
            redirectToCart();
          } else {
            showError(data?.data?.message || config.messages?.error || "Something went wrong. Please try again.");
            resetSubmitBtn();
          }
        },
        error: function (xhr, status, err) {
          console.error("[YayBoost] Email capture submit failed:", err);
          showError(config.messages?.error || "Something went wrong. Please try again.");
          resetSubmitBtn();
        },
      });
    }

    function resetSubmitBtn() {
      $submitBtn.prop("disabled", false).removeClass("yayboost-email-capture-popup__button--loading");
      $submitBtn.text($submitBtn.attr("data-original-text") || config.content?.buttonText || "Submit email");
    }

    function handleClose() {
      hidePopup();
      redirectToCart();
    }

    $(document).on("click", function (e) {
      const $link = $(e.target).closest("a[href]");
      if (!$link.length || $link.attr("target") === "_blank" || $link.attr("download")) return;

      const link = $link[0];
      if (isCartLink(link)) {
        e.preventDefault();
        e.stopPropagation();
        showPopup(link.href);
      }
    });

    $closeBtn.on("click", function (e) {
      e.preventDefault();
      handleClose();
    });

    $overlay.on("click", function (e) {
      e.preventDefault();
      handleClose();
    });

    $submitBtn.on("click", function (e) {
      e.preventDefault();
      handleSubmit();
    });

    $(document).on("keydown", function (e) {
      if (e.key === "Escape" && $popup.css("display") === "flex") {
        handleClose();
      }
    });
  }

  $(function () {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () {
        setTimeout(initEmailCapturePopup, 0);
      });
    } else {
      setTimeout(initEmailCapturePopup, 0);
    }
  });
})(jQuery);
