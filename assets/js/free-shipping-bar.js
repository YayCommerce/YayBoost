(function($) {
    'use strict';

    /**
     * Update shipping bar via AJAX
     */
    function updateShippingBar() {
        var $bar = $('.yayboost-shipping-bar');
        if ($bar.length === 0) return;

        $.ajax({
            url: yayboostShippingBar.ajaxUrl,
            type: 'POST',
            data: {
                action: 'yayboost_get_shipping_bar',
                nonce: yayboostShippingBar.nonce
            },
            success: function(response) {
                if (response.success && response.data) {
                    var data = response.data;
                    console.log(data);

                    // If no message, remove bar
                    if (!data.message) {
                        $bar.remove();
                        return;
                    }

                    // Build achieved class
                    var achievedClass = data.achieved && !data.show_coupon_message 
                        ? ' yayboost-shipping-bar--achieved' : '';

                    // Build progress bar HTML
                    var progressHtml = '';
                    if (data.threshold && data.threshold > 0 && !data.achieved && !data.show_coupon_message) {
                        progressHtml = '<div class="yayboost-shipping-bar__progress">' +
                            '<div class="yayboost-shipping-bar__progress-fill" style="width: ' + data.progress + '%"></div>' +
                            '</div>';
                    }

                    // Build complete bar HTML
                    var barHtml = '<div class="yayboost-shipping-bar' + achievedClass + '">' +
                        '<div class="yayboost-shipping-bar__message">' + data.message + '</div>' +
                        progressHtml +
                        '</div>';

                    // Replace existing bar
                    $bar.replaceWith(barHtml);
                } else {
                    // No data or error, remove bar
                    $bar.remove();
                }
            },
            error: function() {
                // On error, keep existing bar (don't remove it)
                console.log('Failed to update shipping bar');
            }
        });
    }

    $(document).ready(function() {
        var shippingBarTimeout;

        /**
         * Debounced update function
         */
        function debouncedUpdateShippingBar(delay) {
            delay = delay || 1000;
            clearTimeout(shippingBarTimeout);
            shippingBarTimeout = setTimeout(updateShippingBar, delay);
        }

        /**
         * Main cart update events (Classic WooCommerce)
         */
        $(document.body).on(
            'added_to_cart removed_from_cart wc_update_cart',
            function() {
                debouncedUpdateShippingBar();
            }
        );

        /**
         * Fragment refresh events (covers mini cart updates)
         */
        $(document.body).on(
            'wc_fragments_refreshed wc_fragments_loaded',
            function() {
                debouncedUpdateShippingBar();
            }
        );

        /**
         * Updated WC div event (cart page)
         */
        $(document.body).on('updated_wc_div', function() {
            debouncedUpdateShippingBar();
        });

        /**
         * Coupon events
         */
        $(document.body).on('applied_coupon removed_coupon', function() {
            debouncedUpdateShippingBar();
        });

        /**
         * WooCommerce Blocks CustomEvents
         * These are triggered when Blocks update the cart
         */
        if (window.CustomEvent) {
            document.body.addEventListener('wc-blocks_added_to_cart', function() {
                debouncedUpdateShippingBar();
            });
            
            document.body.addEventListener('wc-blocks_removed_from_cart', function() {
                debouncedUpdateShippingBar();
            });
        }

        /**
         * Listen to quantity button clicks in Blocks mini cart
         * Event delegation works even with dynamically created elements
         * Use mousedown/touchstart - fires earlier than click
         */
        $(document.body).on('mousedown touchstart', '.wc-block-components-quantity-selector .wc-block-components-quantity-selector__button--minus, .wc-block-components-quantity-selector .wc-block-components-quantity-selector__button--plus', function() {
            debouncedUpdateShippingBar();
        });

        /**
         * Direct quantity input changes (cart page - Classic)
         */
        var quantityTimeout;
        $(document.body).on('change input', '.woocommerce-cart-form input.qty', function() {
            clearTimeout(quantityTimeout);
            quantityTimeout = setTimeout(function() {
                debouncedUpdateShippingBar(500);
            }, 500);
        });

        /**
         * Form submit (cart page - backup)
         */
        $(document.body).on('submit', '.woocommerce-cart-form', function() {
            debouncedUpdateShippingBar(300);
        });
    });
})(jQuery);