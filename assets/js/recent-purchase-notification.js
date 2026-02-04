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
    customerName,
    initialDelay,
    intervalBetween,
    minimumOrderRequired,
    productDetails,
  } = yayboostRecentPurchase;

  if (
    sessionStorage.getItem("yayboost_recent_purchase_popup_dismissed") === "1"
  ) {
    return;
  }

  const i18n = text || { ago: "ago", bought: "bought this product" };

  class RecentPurchaseNotificationPopup {
    constructor() {
      this.settings = {
        ajaxUrl,
        nonce,
        pageId,
        customerName,
        initialDelay: initialDelay || 10,
        intervalBetween: (intervalBetween || 10) * 1000,
        minimumOrderRequired: minimumOrderRequired || 3,
        duration: 50 * 1000,
        productDetails: productDetails || ["title", "price"],
      };
      this.purchaseList = [];
      this.lastOrderId = null;
      this.shownCount = 0;
      this.container = null;
      this.hideTimeout = null;
      this.nextTimeout = null;
      this.refreshTimeout = null;
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
     * Get next unshown purchase from purchaseList (from AJAX)
     */
    getNextUnshownPurchase() {
      for (let i = 0; i < this.purchaseList.length; i++) {
        const purchase = this.purchaseList[i];
        if (purchase && !this.shownIds.includes(String(purchase.id))) {
          return purchase;
        }
      }
      return null;
    }

    /**
     * Initial fetch (AJAX)
     */
    fetchInitialPurchases() {
      return this.ajaxFetch(null).then((data) => {
        if (data && data.purchases && Array.isArray(data.purchases)) {
          this.purchaseList = data.purchases;
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
     * Staggered refresh - random 0-30s
     */
    getStaggeredDelay() {
      return Math.floor(Math.random() * 30001);
    }

    /**
     * Check if refresh is due (interval + random 0-30s)
     */
    isRefreshDue() {
      const elapsed = Date.now() - this.lastRefreshTime;
      const minInterval =
        this.settings.intervalBetween + this.getStaggeredDelay();
      return elapsed >= minInterval;
    }

    /**
     * Visibility-based - pause when tab hidden
     */
    setupVisibilityListener() {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.isPaused = true;
          this.clearTimeouts();
        } else {
          this.isPaused = false;
          this.lastRefreshTime = Date.now();
          this.scheduleNext();
        }
      });
    }

    clearTimeouts() {
      clearTimeout(this.hideTimeout);
      clearTimeout(this.nextTimeout);
      clearTimeout(this.refreshTimeout);
      this.hideTimeout = null;
      this.nextTimeout = null;
      this.refreshTimeout = null;
    }

    init() {
      if (!this.settings.pageId) return;
      this.container = document.querySelector(
        ".yayboost-recent-purchase-notification",
      );
      if (!this.container) return;

      this.setupVisibilityListener();

      // Initial fetch (AJAX), then start notification loop
      this.fetchInitialPurchases().then(() => {
        if (this.isPaused) return;
        this.nextTimeout = setTimeout(() => {
          this.showNext();
        }, this.settings.initialDelay * 1000);
      });
    }

    scheduleNext() {
      if (this.isPaused) return;

      const run = () => {
        if (this.isPaused) return;
        if (this.isRefreshDue()) {
          this.fetchDeltaPurchases().then(() => {
            if (this.isPaused) return;
            this.nextTimeout = setTimeout(
              () => this.showNext(),
              this.settings.intervalBetween,
            );
          });
        } else {
          this.nextTimeout = setTimeout(
            () => this.showNext(),
            this.settings.intervalBetween,
          );
        }
      };

      this.nextTimeout = setTimeout(run, this.settings.intervalBetween);
    }

    showNext() {
      if (this.isPaused) return;
      if (this.shownCount >= this.settings.minimumOrderRequired) return;
      if (
        sessionStorage.getItem("yayboost_recent_purchase_popup_dismissed") ===
        "1"
      ) {
        return;
      }

      const purchase = this.getNextUnshownPurchase();
      if (!purchase) {
        this.scheduleNext();
        return;
      }

      this.markAsShown(purchase.id);
      this.container.innerHTML = this.buildPopupHtml(purchase);
      this.container.classList.add(
        "yayboost-recent-purchase-notification--visible",
      );
      this.bindEvents();
      this.shownCount++;

      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, this.settings.duration);
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
      const formatSettings = this.settings.customerName;
      console.log(formatSettings);
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
