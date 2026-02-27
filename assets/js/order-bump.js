/**
 * Order Bump – checkbox add/remove from cart and sync with checkout form.
 * On checkbox change: add or remove bump from cart via AJAX, then refresh order review.
 * On submit: sync checked IDs to hidden input for server.
 */
(function () {
    'use strict';

    function syncBumpIdsToHidden() {
        var hidden = document.getElementById('yayboost_bump_ids');
        if (!hidden) return;
        var ids = [];
        document.querySelectorAll('.yayboost-order-bump__checkbox:checked').forEach(function (cb) {
            if (cb.value) ids.push(cb.value);
        });
        hidden.value = ids.join(',');
    }

    function triggerUpdateCheckout() {
        if (typeof jQuery !== 'undefined' && jQuery(document.body).trigger) {
            jQuery(document.body).trigger('update_checkout');
        }
    }

    function addBumpToCart(productId, variationId, bumpPrice, callback) {
        if (typeof yayboost_order_bump === 'undefined') return callback(false);
        jQuery.ajax({
            url: yayboost_order_bump.ajax_url,
            type: 'POST',
            data: {
                action: yayboost_order_bump.actions.add,
                nonce: yayboost_order_bump.nonce,
                product_id: productId,
                variation_id: variationId || 0,
                bump_price: bumpPrice
            },
            success: function (res) {
                if (res && res.success) callback(true);
                else callback(false);
            },
            error: function () { callback(false); }
        });
    }

    function removeBumpFromCart(productId, variationId, callback) {
        if (typeof yayboost_order_bump === 'undefined') return callback(false);
        jQuery.ajax({
            url: yayboost_order_bump.ajax_url,
            type: 'POST',
            data: {
                action: yayboost_order_bump.actions.remove,
                nonce: yayboost_order_bump.nonce,
                product_id: productId,
                variation_id: variationId || 0
            },
            success: function (res) {
                if (res && res.success) callback(true);
                else callback(false);
            },
            error: function () { callback(false); }
        });
    }

    function init() {
        var form = document.querySelector('form.woocommerce-checkout, form.checkout');
        if (!form) return;

        var hidden = document.getElementById('yayboost_bump_ids');
        if (hidden && form.contains(hidden)) {
            form.addEventListener('submit', function () {
                syncBumpIdsToHidden();
            });
        }

        // When bump checkbox changes: add/remove from cart and refresh order summary
        document.addEventListener('change', function (e) {
            if (!e.target || !e.target.classList || !e.target.classList.contains('yayboost-order-bump__checkbox')) return;
            var cb = e.target;
            var wrapper = cb.closest('.yayboost-order-bump');
            if (!wrapper) return;
            var productId = wrapper.getAttribute('data-product-id');
            var variationId = wrapper.getAttribute('data-default-variation-id') || '0';
            var bumpPrice = wrapper.getAttribute('data-bump-price') || '0';
            if (!productId) return;

            cb.disabled = true;
            if (cb.checked) {
                addBumpToCart(productId, variationId, bumpPrice, function (ok) {
                    cb.disabled = false;
                    if (ok) triggerUpdateCheckout();
                    else cb.checked = false;
                });
            } else {
                removeBumpFromCart(productId, variationId, function (ok) {
                    cb.disabled = false;
                    if (ok) triggerUpdateCheckout();
                    else cb.checked = true;
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
