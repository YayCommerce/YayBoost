/**
 * YayBoost Smart Recommendations JavaScript
 *
 * Handles AJAX interactions for dynamic recommendation updates
 * and cart functionality.
 */

(function($) {
    'use strict';

    /**
     * Smart Recommendations Handler
     */
    const YayBoostRecommendations = {
        
        /**
         * Initialize the recommendations functionality
         */
        init: function() {
            this.bindEvents();
            this.setupCartObserver();
        },

        /**
         * Bind event handlers
         */
        bindEvents: function() {
            // Handle add to cart buttons
            $(document).on('click', '.yayboost-recommendations__add-to-cart', this.handleAddToCart.bind(this));
            
            // Handle WooCommerce cart updates
            $(document.body).on('added_to_cart', this.onCartUpdated.bind(this));
            $(document.body).on('removed_from_cart', this.onCartUpdated.bind(this));
            
            // Handle cart page updates
            $(document.body).on('updated_cart_totals', this.onCartUpdated.bind(this));
        },

        /**
         * Setup cart observer for dynamic updates
         */
        setupCartObserver: function() {
            // Watch for cart changes via storage events (for mini cart updates)
            $(window).on('storage', function(e) {
                if (e.originalEvent.key === 'wc_cart_hash') {
                    YayBoostRecommendations.onCartUpdated();
                }
            });

            // Watch for AJAX cart updates
            $(document).ajaxComplete(function(event, xhr, settings) {
                if (settings.url && settings.url.indexOf('wc-ajax=add_to_cart') !== -1) {
                    YayBoostRecommendations.onCartUpdated();
                }
            });
        },

        /**
         * Handle add to cart button clicks
         */
        handleAddToCart: function(e) {
            e.preventDefault();
            
            const $button = $(e.currentTarget);
            const productId = $button.data('product-id');
            const productType = $button.data('product-type');
            
            if (!productId) {
                return;
            }

            // Handle different product types
            if (productType === 'variable') {
                // For variable products, redirect to product page
                window.location.href = $button.closest('.yayboost-recommendations__item, .yayboost-recommendations__list-item')
                    .find('a[href]').first().attr('href');
                return;
            }

            this.addToCart(productId, $button);
        },

        /**
         * Add product to cart via AJAX
         */
        addToCart: function(productId, $button) {
            const originalText = $button.text();
            
            // Show loading state
            $button.prop('disabled', true)
                   .text($button.data('loading-text') || 'Adding...')
                   .addClass('loading');

            $.ajax({
                url: yayboostRecommendations.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'yayboost_add_to_cart_recommendation',
                    product_id: productId,
                    quantity: 1,
                    nonce: yayboostRecommendations.nonce
                },
                success: function(response) {
                    if (response.success) {
                        // Show success feedback
                        $button.text('Added!')
                               .removeClass('loading')
                               .addClass('added');

                        // Update cart count if element exists
                        if (response.data.cart_count) {
                            $('.cart-contents-count, .count').text(response.data.cart_count);
                        }

                        // Trigger WooCommerce events
                        $(document.body).trigger('added_to_cart', [response.data, '', $button]);

                        // Reset button after delay
                        setTimeout(function() {
                            $button.prop('disabled', false)
                                   .text(originalText)
                                   .removeClass('added');
                        }, 2000);

                    } else {
                        YayBoostRecommendations.showError($button, response.data || 'Failed to add to cart');
                        $button.prop('disabled', false)
                               .text(originalText)
                               .removeClass('loading');
                    }
                },
                error: function() {
                    YayBoostRecommendations.showError($button, 'Network error occurred');
                    $button.prop('disabled', false)
                           .text(originalText)
                           .removeClass('loading');
                }
            });
        },

        /**
         * Handle cart updates
         */
        onCartUpdated: function() {
            // Debounce cart updates to avoid excessive AJAX calls
            clearTimeout(this.cartUpdateTimeout);
            this.cartUpdateTimeout = setTimeout(function() {
                YayBoostRecommendations.updateRecommendations();
            }, 500);
        },

        /**
         * Update recommendations based on current cart
         */
        updateRecommendations: function() {
            const $recommendations = $('.yayboost-recommendations');
            
            if (!$recommendations.length) {
                return;
            }

            const productId = this.getCurrentProductId();
            
            if (!productId) {
                return;
            }

            // Show loading state
            $recommendations.addClass('loading');
            $recommendations.find('.yayboost-recommendations__content').hide();
            $recommendations.find('.yayboost-recommendations__loading').show();

            $.ajax({
                url: yayboostRecommendations.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'yayboost_get_recommendations',
                    product_id: productId,
                    nonce: yayboostRecommendations.nonce
                },
                success: function(response) {
                    if (response.success && response.data.html) {
                        // Replace recommendations content
                        $recommendations.replaceWith(response.data.html);
                    } else {
                        // Hide recommendations if no content
                        $recommendations.fadeOut();
                    }
                },
                error: function() {
                    console.warn('Failed to update recommendations');
                },
                complete: function() {
                    $recommendations.removeClass('loading');
                    $recommendations.find('.yayboost-recommendations__loading').hide();
                    $recommendations.find('.yayboost-recommendations__content').show();
                }
            });
        },

        /**
         * Get current product ID from page
         */
        getCurrentProductId: function() {
            // Try to get from form
            const $form = $('form.cart');
            if ($form.length) {
                const productId = $form.find('input[name="add-to-cart"]').val() ||
                                $form.find('button[name="add-to-cart"]').val();
                if (productId) {
                    return productId;
                }
            }

            // Try to get from body class
            const bodyClasses = $('body').attr('class') || '';
            const match = bodyClasses.match(/postid-(\d+)/);
            if (match) {
                return match[1];
            }

            // Try to get from global wc_single_product_params
            if (typeof wc_single_product_params !== 'undefined' && wc_single_product_params.post_id) {
                return wc_single_product_params.post_id;
            }

            return null;
        },

        /**
         * Show error message
         */
        showError: function($button, message) {
            // Create or update error message
            let $error = $button.siblings('.yayboost-error');
            if (!$error.length) {
                $error = $('<div class="yayboost-error"></div>');
                $button.after($error);
            }
            
            $error.text(message).show();
            
            // Hide error after delay
            setTimeout(function() {
                $error.fadeOut();
            }, 3000);
        },

        /**
         * Utility: Debounce function
         */
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = function() {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    /**
     * Initialize when DOM is ready
     */
    $(document).ready(function() {
        YayBoostRecommendations.init();
    });

    // Expose to global scope for external access
    window.YayBoostRecommendations = YayBoostRecommendations;

})(jQuery);
