/**
 * FBT JavaScript
 *
 * Handles frequently bought together interactions.
 */

(function ($) {
    'use strict';

    /**
     * FBT Module
     */
    const YayBoostFBT = {
        /**
         * Initialize
         */
        init: function () {
            this.container = $('.yayboost-fbt');
            if (!this.container.length) {
                return;
            }

            this.bindEvents();
            this.updateTotal();
        },

        /**
         * Bind event handlers
         */
        bindEvents: function () {
            const self = this;

            // Checkbox change
            this.container.on('change', 'input[type="checkbox"]', function () {
                const $product = $(this).closest('.yayboost-fbt__product');
                $product.toggleClass('is-unchecked', !this.checked);
                self.updateTotal();
            });

            // Add to cart button
            this.container.on('click', '.yayboost-fbt__add-btn', function (e) {
                e.preventDefault();
                self.addToCart($(this));
            });
        },

        /**
         * Update total price
         */
        updateTotal: function () {
            let total = 0;

            this.container.find('.yayboost-fbt__product').each(function () {
                const $product = $(this);
                const $checkbox = $product.find('input[type="checkbox"]');

                if ($checkbox.is(':checked')) {
                    const price = parseFloat($product.data('price')) || 0;
                    total += price;
                }
            });

            const formattedTotal = this.formatPrice(total);
            this.container.find('.yayboost-fbt__total-price').html(formattedTotal);

            // Disable button if nothing selected
            const hasSelected = this.container.find('input[type="checkbox"]:checked').length > 0;
            this.container.find('.yayboost-fbt__add-btn').prop('disabled', !hasSelected);
        },

        /**
         * Format price with currency symbol
         */
        formatPrice: function (price) {
            const symbol = yayboostFBT.currencySymbol || '$';
            return symbol + price.toFixed(2);
        },

        /**
         * Get selected product IDs
         */
        getSelectedProducts: function () {
            const ids = [];
            this.container.find('input[type="checkbox"]:checked').each(function () {
                ids.push($(this).val());
            });
            return ids;
        },

        /**
         * Add selected products to cart
         */
        addToCart: function ($button) {
            const self = this;
            const productIds = this.getSelectedProducts();

            if (!productIds.length) {
                return;
            }

            // Set loading state
            const originalText = $button.text();
            $button
                .prop('disabled', true)
                .addClass('is-loading')
                .text(yayboostFBT.i18n.adding);

            // Get source product ID from container
            const sourceProductId = this.container.data('product-id') || 0;

            // AJAX request
            $.ajax({
                url: yayboostFBT.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'yayboost_fbt_add_to_cart',
                    nonce: yayboostFBT.nonce,
                    product_ids: productIds,
                    source_product_id: sourceProductId,
                },
                success: function (response) {
                    if (response.success) {
                        // Update mini cart
                        if (response.data.fragments) {
                            $.each(response.data.fragments, function (key, value) {
                                $(key).replaceWith(value);
                            });
                        }

                        // Update cart count in header (theme-specific)
                        $(document.body).trigger('wc_fragment_refresh');
                        $(document.body).trigger('added_to_cart');

                        // Show success
                        $button.text(yayboostFBT.i18n.added);

                        // Reset after delay
                        setTimeout(function () {
                            $button
                                .prop('disabled', false)
                                .removeClass('is-loading')
                                .text(originalText);
                        }, 2000);
                    } else {
                        self.showError(response.data.message || yayboostFBT.i18n.error);
                        $button
                            .prop('disabled', false)
                            .removeClass('is-loading')
                            .text(originalText);
                    }
                },
                error: function () {
                    self.showError(yayboostFBT.i18n.error);
                    $button
                        .prop('disabled', false)
                        .removeClass('is-loading')
                        .text(originalText);
                },
            });
        },

        /**
         * Show error message
         */
        showError: function (message) {
            // Simple alert for now, can be improved with toast notifications
            alert(message);
        },
    };

    // Initialize on document ready
    $(document).ready(function () {
        YayBoostFBT.init();
    });
})(jQuery);
