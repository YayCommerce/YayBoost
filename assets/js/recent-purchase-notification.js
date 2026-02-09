/**
 * Recent Purchase Notification
 *
 * Optimized refresh flow: Initial AJAX fetch, delta fetch, visibility-based
 * and staggered refresh (Strategies 1-5 from architecture).
 */
(function () {
  "use strict";

  if (typeof yayboostRecentPurchase === "undefined") {
    return;
  }

  const {
    ajaxUrl,
    nonce,
    pageId,
    text,
    trackingMode,
    customerName,
    initialDelay,
    intervalBetween,
    productDetails,
  } = yayboostRecentPurchase;

  if (
    sessionStorage.getItem("yayboost_recent_purchase_popup_dismissed") === "1"
  ) {
    return;
  }

  const i18n = text || { ago: "ago", bought: "bought this product" };
  /** Interval for delta fetch when real-orders (1 minute) */
  const DELTA_FETCH_INTERVAL_MS = 60 * 1000;
  /** Delay before auto-hiding the notification */
  const HIDE_DELAY_MS = 5000;

  class RecentPurchaseNotificationPopup {
    constructor() {
      this.settings = {
        ajaxUrl,
        nonce,
        pageId,
        trackingMode,
        customerName,
        initialDelay: initialDelay || 10,
        intervalBetween: (intervalBetween || 10) * 1000,
        productDetails: productDetails || ["title", "price"],
      };
      this.purchaseList = [];
      this.lastOrderId = null;
      this.shownCount = 0;
      this.container = null;
      this.hideTimeout = null;
      this.nextTimeout = null;
      this.refreshTimeout = null;
      this.deltaTimeout = null;
      this.lastRefreshTime = 0;
      this.shownIds = this.getShownIds();
      this.isPaused = false;
    }

    getShownIds() {
      try {
        const stored = sessionStorage.getItem(
          "yayboost_recent_purchase_popup_shown",
        );
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }

    markAsShown(purchaseId) {
      this.shownIds.push(String(purchaseId));
      try {
        sessionStorage.setItem(
          "yayboost_recent_purchase_popup_shown",
          JSON.stringify(this.shownIds),
        );
      } catch {
        /* ignore */
      }
    }

    /**
     * Get and remove the first purchase from the list (queue). Returns null if list empty.
     */
    takeNextPurchase() {
      if (this.purchaseList.length === 0) return null;
      return this.purchaseList.shift();
    }

    /**
     * Initial fetch (AJAX). Optionally filter out already-shown ids so we don't re-show after refill.
     */
    fetchInitialPurchases(filterShown = false) {
      return this.ajaxFetch(null).then((data) => {
        if (data && data.purchases && Array.isArray(data.purchases)) {
          this.purchaseList = filterShown
            ? data.purchases.filter(
                (p) => p && !this.shownIds.includes(String(p.id)),
              )
            : data.purchases;
          this.lastOrderId = data.last_order_id;
          this.lastRefreshTime = Date.now();
        }
        return data;
      });
    }

    /**
     * Delta fetch
     */
    fetchDeltaPurchases() {
      if (this.lastOrderId == null || this.lastOrderId <= 0) {
        return this.fetchInitialPurchases();
      }
      return this.ajaxFetch(this.lastOrderId).then((data) => {
        if (data && data.purchases && Array.isArray(data.purchases)) {
          const existingIds = new Set(
            this.purchaseList.map((p) => String(p.id)),
          );
          for (const p of data.purchases) {
            if (p && !existingIds.has(String(p.id))) {
              this.purchaseList.unshift(p);
              existingIds.add(String(p.id));
            }
          }
          if (data.last_order_id != null) {
            this.lastOrderId = data.last_order_id;
          }
          this.lastRefreshTime = Date.now();
        }
        return data;
      });
    }

    ajaxFetch(afterId) {
      const formData = new FormData();
      formData.append("action", "yayboost_recent_purchase");
      formData.append("nonce", this.settings.nonce);
      formData.append("page_id", this.settings.pageId);
      formData.append("limit", 20);
      if (afterId != null && afterId > 0) {
        formData.append("after_id", afterId);
      }

      return fetch(this.settings.ajaxUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            return res.data;
          }
          return null;
        })
        .catch(() => null);
    }

    /**
     * Fire-and-forget tracking when a notification is shown.
     */
    trackShown(purchase) {
      const formData = new FormData();
      formData.append("action", "yayboost_recent_purchase_shown");
      formData.append("nonce", this.settings.nonce);
      if (this.settings.pageId) {
        formData.append("page_id", this.settings.pageId);
      }
      if (purchase && purchase.id) {
        formData.append("purchase_id", purchase.id);
      }

      fetch(this.settings.ajaxUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      }).catch(() => {
        /* silent */
      });
    }

    /**
     * Schedule delta fetch every 1 minute (real-orders only). Called once from init.
     */
    scheduleDeltaFetch() {
      if (this.isPaused || this.settings.trackingMode !== "real-orders") {
        return;
      }
      // add random 0-30 seconds to the delay
      const randomDelay = Math.floor(Math.random() * 30000);
      const delay = DELTA_FETCH_INTERVAL_MS + randomDelay;
      this.deltaTimeout = setTimeout(() => {
        this.deltaTimeout = null;
        if (this.isPaused) return;
        this.fetchDeltaPurchases().finally(() => {
          this.scheduleDeltaFetch();
        });
      }, delay);
    }

    /**
     * Visibility-based - pause when tab hidden
     */
    setupVisibilityListener() {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.isPaused = true;
          this.clearTimeouts();
        } else if (document.visibilityState === "visible") {
          this.isPaused = false;
          this.scheduleNext();
          if (this.settings.trackingMode === "real-orders") {
            this.scheduleDeltaFetch();
          }
        }
      });
    }

    clearTimeouts() {
      clearTimeout(this.hideTimeout);
      clearTimeout(this.nextTimeout);
      clearTimeout(this.refreshTimeout);
      clearTimeout(this.deltaTimeout);
      this.hideTimeout = null;
      this.nextTimeout = null;
      this.refreshTimeout = null;
      this.deltaTimeout = null;
    }

    init() {
      if (!this.settings.pageId) return;
      this.container = document.querySelector(
        ".yayboost-recent-purchase-notification",
      );
      if (!this.container) return;

      this.setupVisibilityListener();

      // Initial fetch (AJAX) once on load, then start notification loop
      this.fetchInitialPurchases().then(() => {
        if (this.isPaused) return;
        if (this.settings.trackingMode === "real-orders") {
          this.scheduleDeltaFetch();
        }
        this.nextTimeout = setTimeout(() => {
          this.showNext();
        }, this.settings.initialDelay * 1000);
      });
    }

    scheduleNext() {
      if (this.isPaused) return;
      this.nextTimeout = setTimeout(
        () => this.showNext(),
        this.settings.intervalBetween,
      );
    }

    showNext() {
      if (this.isPaused) return;
      if (
        sessionStorage.getItem("yayboost_recent_purchase_popup_dismissed") ===
        "1"
      ) {
        return;
      }

      let purchase = this.takeNextPurchase();
      while (purchase && this.shownIds.includes(String(purchase.id))) {
        purchase = this.takeNextPurchase();
      }
      if (!purchase) {
        return;
      }

      this.markAsShown(purchase.id);
      if (this.settings.trackingMode !== "simulated") {
        this.trackShown(purchase);
      }
      this.container.innerHTML = this.buildPopupHtml(purchase);
      this.container.classList.add(
        "yayboost-recent-purchase-notification--visible",
      );
      this.bindEvents();
      this.shownCount++;

      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, HIDE_DELAY_MS);
    }

    buildStarRating(rating) {
      if (rating == null || rating <= 0) return "";
      const full = Math.floor(rating);
      const half = rating % 1 >= 0.5 ? 1 : 0;
      const empty = 5 - full - half;
      const stars =
        '<span class="yayboost-recent-purchase__stars-filled">★</span>'.repeat(
          full,
        ) +
        (half
          ? '<span class="yayboost-recent-purchase__stars-half">★</span>'
          : "") +
        '<span class="yayboost-recent-purchase__stars-empty">★</span>'.repeat(
          empty,
        );
      return `<span class="yayboost-recent-purchase__stars" aria-label="${this.escapeHtml(String(rating))} out of 5">${stars}</span>`;
    }

    buildPopupHtml(purchase) {
      const ago = (i18n && i18n.ago) || "ago";
      const showTitle =
        this.settings.productDetails &&
        this.settings.productDetails.includes("title");
      const titleHtml =
        showTitle && purchase.product_name
          ? this.escapeHtml(purchase.product_name)
          : "";
      const showPrice =
        this.settings.productDetails &&
        this.settings.productDetails.includes("price");
      const priceHtml =
        showPrice && purchase.product_price
          ? this.escapeHtml(purchase.product_price)
          : "";
      const showRating =
        this.settings.productDetails &&
        this.settings.productDetails.includes("rating");
      const ratingHtml =
        showRating && purchase.product_rating
          ? this.buildStarRating(Number(purchase.product_rating))
          : "";
      return `
        <button class="yayboost-recent-purchase__close" aria-label="Close">&times;</button>
        <div class="yayboost-recent-purchase__text">
          <span class="yayboost-recent-purchase__customer-name">${this.escapeHtml(this.formatCustomerName(purchase.customer_name))}</span>
          <span class="yayboost-recent-purchase__product-name">${this.escapeHtml(i18n.bought)}</span>
          <span class="yayboost-recent-purchase__time">${this.escapeHtml(purchase.time_ago)} ${ago}</span>
        </div>
        <a href="${this.escapeHtml(purchase.product_url)}" class="yayboost-recent-purchase__link">
          <div class="yayboost-recent-purchase__product">
            <img src="${this.escapeHtml(purchase.product_image)}" alt="" class="yayboost-recent-purchase__image" loading="lazy">
            <div class="yayboost-recent-purchase__product-info">
              ${titleHtml ? `<span class="yayboost-recent-purchase__product-name">${titleHtml}</span>` : ""}
              ${priceHtml ? `<span class="yayboost-recent-purchase__product-price">${priceHtml}</span>` : ""}
              ${ratingHtml ? `<div class="yayboost-recent-purchase__product-rating">${ratingHtml}</div>` : ""}
              </div>
          </div>
        </a>
      `;
    }

    bindEvents() {
      const closeBtn = this.container.querySelector(
        ".yayboost-recent-purchase__close",
      );
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dismiss();
        });
      }
      const link = this.container.querySelector(
        ".yayboost-recent-purchase__link",
      );
      if (link) {
        link.addEventListener("click", () => this.hide());
      }

      // Pause auto-hide on hover, resume on mouse leave
      this.container.addEventListener("mouseenter", () => {
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }
      });
      this.container.addEventListener("mouseleave", () => {
        if (
          this.container.classList.contains(
            "yayboost-recent-purchase-notification--visible",
          ) &&
          this.hideTimeout === null
        ) {
          this.hideTimeout = setTimeout(() => this.hide(), HIDE_DELAY_MS);
        }
      });
    }

    hide() {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
      this.container.classList.remove(
        "yayboost-recent-purchase-notification--visible",
      );
      this.scheduleNext();
    }

    dismiss() {
      sessionStorage.setItem("yayboost_recent_purchase_popup_dismissed", "1");
      this.clearTimeouts();
      this.container.classList.remove(
        "yayboost-recent-purchase-notification--visible",
      );
    }

    escapeHtml(str) {
      if (!str) return "";
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    formatCustomerName(name) {
      if (name == "") return name;
      const formatSettings = this.settings.customerName;
      switch (formatSettings) {
        case "full-name":
          return name
            .split(" ")
            .map((n) => n.charAt(0).toUpperCase() + n.slice(1))
            .join(" ");
        case "first-name-only":
          return name.split(" ")[0];
        case "first-name-initial":
          // return first letter of the first name and a dot with last name
          return name.split(" ")[0].charAt(0) + "." + name.split(" ")[1];
        case "initial-only":
          // return first letter of the first name and the last name
          return (
            name.split(" ")[0].charAt(0) +
            "." +
            name.split(" ")[1].charAt(0) +
            "."
          );
        case "anonymous":
          return "Someone";
        default:
          return name;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new RecentPurchaseNotificationPopup().init();
    });
  } else {
    new RecentPurchaseNotificationPopup().init();
  }
})();
