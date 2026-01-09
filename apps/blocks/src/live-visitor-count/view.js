(function ($) {
  // Prevent duplicate initialization when both hook and block are on the same page
  // Check this FIRST before any other operations
  if (window.yayboostLiveVisitorCountInitialized) {
    return;
  }

  // Only run on single product pages - check if localized data exists and pageId is valid
  if (
    typeof yayboostLiveVisitorCount === "undefined" ||
    !yayboostLiveVisitorCount.pageId ||
    yayboostLiveVisitorCount.pageId <= 0
  ) {
    return;
  }

  // Mark as initialized immediately to prevent race conditions
  window.yayboostLiveVisitorCountInitialized = true;

  // Clear any existing intervals if they exist (safety measure)
  if (window.yayboostLiveVisitorCountIntervals) {
    if (window.yayboostLiveVisitorCountIntervals.countInterval) {
      clearInterval(window.yayboostLiveVisitorCountIntervals.countInterval);
    }
    if (window.yayboostLiveVisitorCountIntervals.pingInterval) {
      clearInterval(window.yayboostLiveVisitorCountIntervals.pingInterval);
    }
  }

  // Generate a unique visitor ID per tab/window (persists in sessionStorage)
  // Use a combination of timestamp, random string, and performance timing for uniqueness
  let visitorId = sessionStorage.getItem("yayboost_lvc_id");
  if (!visitorId) {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const performanceId = performance.now().toString(36).replace(".", "");
    visitorId = `yayboost_lvc_${timestamp}_${randomStr}_${performanceId}`;
    sessionStorage.setItem("yayboost_lvc_id", visitorId);
  }

  // First interval: Count visitors every minute (60000ms)
  function countVisitors() {
    const formData = new FormData();
    formData.append("action", "yayboost_count_visitors");
    formData.append("nonce", yayboostLiveVisitorCount.nonce);
    formData.append("page_id", yayboostLiveVisitorCount.pageId);

    fetch(yayboostLiveVisitorCount.ajaxUrl, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    })
      .then((r) => {
        if (!r.ok) {
          console.error(
            "YayBoost Live Visitor Count failed:",
            r.status,
            r.statusText
          );
          return;
        }
        return r.json();
      })
      .then((d) => {
        // WordPress wp_send_json_success() wraps data in a 'data' property
        if (d && d.success && d.data && d.data.count !== undefined) {
          updateCount(d.data.count);
        }
      })
      .catch((err) => {
        console.error("YayBoost Live Visitor Count error:", err);
      });
  }

  // Second interval: Update visitor record every activeWindow minutes
  function updateVisitor() {
    const formData = new FormData();
    formData.append("action", "yayboost_visitor_ping");
    formData.append("nonce", yayboostLiveVisitorCount.nonce);
    formData.append("page_id", yayboostLiveVisitorCount.pageId);
    formData.append("visitor_id", visitorId);

    fetch(yayboostLiveVisitorCount.ajaxUrl, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    })
      .then((r) => {
        if (!r.ok) {
          console.error(
            "YayBoost Live Visitor Count update failed:",
            r.status,
            r.statusText
          );
          return;
        }
        return r.json();
      })
      .then((d) => {
        if (d && d.success && d.data && d.data.count !== undefined) {
          updateCount(d.data.count);
        }
      })
      .catch((err) => {
        console.error("YayBoost Live Visitor Count update error:", err);
      });
  }

  function updateCount(count) {
    const minimumCountDisplay = parseInt(
      yayboostLiveVisitorCount.minimumCountDisplay
    );

    const countEl = document.querySelectorAll(".yayboost-lvc");
    for (const el of countEl) {
      if (el) {
        const isBubble = el.classList.contains("yayboost-lvc-style-3");
        const text = el.getAttribute("data-text");
        const currentCount = el.getAttribute("data-count");
        if (Number(currentCount) === Number(count)) {
          break;
        }
        if (minimumCountDisplay > 0 && count < minimumCountDisplay) {
          el.classList.add("hidden");
        } else {
          el.classList.remove("hidden");
        }
        const updateText = getUpdateText(text, count);
        if (isBubble) {
          const textEl = el.querySelector(".yayboost-lvc-text");
          const iconEl = el.querySelector(".yayboost-lvc-icon");
          iconEl.innerHTML = "<span id='yayboost-lvc-number'>" + count + "</span>";
          textEl.innerHTML = updateText;
        } else {
          el.innerHTML = updateText;
        }
        el.setAttribute("data-count", count);
      }
    }
  }

  function getUpdateText(text, count) {
    return text ? text.replace("{count}", count) : count;
  }

  // Get activeWindow in minutes, convert to milliseconds for setInterval
  const activeWindowMs =
    (yayboostLiveVisitorCount.activeWindow || 2) * 60 * 1000;

  // Set up intervals and store their IDs globally to prevent duplicates
  window.yayboostLiveVisitorCountIntervals = {
    countInterval: setInterval(countVisitors, 60000), // Every minute
    pingInterval: setInterval(updateVisitor, activeWindowMs), // Every activeWindow minutes
  };
})(jQuery);
