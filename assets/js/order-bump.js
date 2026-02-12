/**
 * Order Bump – ensure checked bump product IDs are submitted with checkout form.
 * Syncs checked .yayboost-order-bump__checkbox into hidden input yayboost_bump_ids on submit.
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

    function init() {
        var form = document.querySelector('form.woocommerce-checkout, form.checkout');
        if (!form) return;

        // Ensure hidden field exists so we're inside the form
        var hidden = document.getElementById('yayboost_bump_ids');
        if (!hidden || !form.contains(hidden)) return;

        form.addEventListener('submit', function () {
            syncBumpIdsToHidden();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
