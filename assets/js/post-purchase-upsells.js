/**
 * Post Purchase Upsells – Thank You page countdown
 * Runs countdown for .yayboost-ppu-timer and hides offer card when expired.
 */
(function () {
    'use strict';

    function pad(n) {
        var x = parseInt(n, 10);
        return (isNaN(x) || x < 0) ? '00' : (x < 10 ? '0' + x : '' + x);
    }

    function runCountdowns() {
        var timers = document.querySelectorAll('.yayboost-ppu-timer[data-expires-at], .yayboost-ppu-timer[data-expires-minutes]');
        timers.forEach(function (el) {
            var endMs;
            if (el.hasAttribute('data-expires-at')) {
                endMs = parseInt(el.getAttribute('data-expires-at'), 10) * 1000;
            } else {
                var min = parseInt(el.getAttribute('data-expires-minutes'), 10) || 10;
                endMs = Date.now() + (min * 60 * 1000);
            }
            if (isNaN(endMs) || endMs <= 0) return;

            function tick() {
                var left = Math.max(0, endMs - Date.now());
                if (left <= 0) {
                    var card = el.closest('.yayboost-ppu-offer');
                    if (card && card.parentNode) {
                        card.parentNode.removeChild(card);
                        var container = document.querySelector('.yayboost-ppu-offers');
                        if (container && container.children.length === 0 && container.parentNode) {
                            var wrapper = container.closest('.yayboost-post-purchase-upsells');
                            if (wrapper && wrapper.parentNode) {
                                wrapper.parentNode.removeChild(wrapper);
                            }
                        }
                    }
                    return;
                }
                var m = Math.floor(left / 60000);
                var s = Math.floor((left % 60000) / 1000);
                var countdown = el.querySelector('.yayboost-ppu-countdown');
                if (countdown) countdown.textContent = pad(m) + ':' + pad(s);
                setTimeout(tick, 1000);
            }
            tick();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runCountdowns);
    } else {
        runCountdowns();
    }
})();
