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
        },

        /**
         * Bind event handlers
         */
        bindEvents: function() {
            // Handle WooCommerce cart updates
            $(document.body).on('added_to_cart', this.onCartUpdated.bind(this));
        },

        /**
         * Handle cart updates
         */
        onCartUpdated: function(event, fragments, cart_hash, $button) {
            // Check if button was clicked from a "still show it" section
            if ($button && $button.length) {
                const $section = $button.closest('.yayboost-recommendations');
                if ($section.length) {
                    const behaviorIfInCart = $section.data('behavior-if-in-cart') || 'hide';
                    
                    // If clicked from "show" section, no need to update anything
                    if (behaviorIfInCart === 'show') {
                        return;
                    }
                }
            }

          
            const $recommendations = $('.yayboost-recommendations');
            if (!$recommendations.length) {
                return;
            }

            // Check if any section needs updating (behavior = "hide")
            const hasHideSections = $recommendations.filter(function() {
                const behavior = $(this).data('behavior-if-in-cart') || 'hide';
                return behavior === 'hide';
            }).length > 0;

        
            if (!hasHideSections) {
                return;
            }

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

            // Filter: only update sections where behavior is "hide"
            const $sectionsToUpdate = $recommendations.filter(function() {
                const behavior = $(this).data('behavior-if-in-cart') || 'hide';
                return behavior === 'hide';
            });

            if (!$sectionsToUpdate.length) {
                // All sections have "show" behavior, no need to update
                return;
            }

            const productId = this.getCurrentProductId();
            
            if (!productId) {
                return;
            }

            // Show loading state only for sections that will be updated
            $sectionsToUpdate.addClass('loading');
            $sectionsToUpdate.find('.yayboost-recommendations__content').hide();
            $sectionsToUpdate.find('.yayboost-recommendations__loading').show();

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
                    $sectionsToUpdate.removeClass('loading');
                    $sectionsToUpdate.find('.yayboost-recommendations__loading').hide();
                    $sectionsToUpdate.find('.yayboost-recommendations__content').show();
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
    };

    /**
     * Initialize when DOM is ready
     */
    $(document).ready(function() {
        YayBoostRecommendations.init();
    });

    window.YayBoostRecommendations = YayBoostRecommendations;

})(jQuery);
