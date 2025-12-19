/**
 * Free Shipping Bar - Frontend Interactivity
 *
 * Uses WordPress Interactivity API for real-time cart updates
 * @see https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/
 */

import { store, getContext } from '@wordpress/interactivity';

/**
 * Store definition for Free Shipping Bar
 */
store('yayboost/shipping-bar', {
    /**
     * Actions - Functions that modify state
     */
    actions: {
        /**
         * Update bar data from cart
         * Called when WooCommerce cart updates
         */
        updateFromCart() {
            const context = getContext();
            
            // Get cart data from localized script
            const cartData = window.yayboostShippingBar || {};
            
            if (!cartData.thresholdInfo) {
                return;
            }
            
            const threshold = cartData.thresholdInfo.min_amount || 0;
            const current = cartData.cartTotal || 0;
            const remaining = Math.max(0, threshold - current);
            const progress = threshold > 0 ? Math.min(100, (current / threshold) * 100) : 100;
            const achieved = current >= threshold;
            
            // Update context
            context.threshold = threshold;
            context.current = current;
            context.remaining = remaining;
            context.progress = Math.round(progress * 100) / 100;
            context.achieved = achieved;
            
            // Update message based on state
            if (achieved) {
                context.message = cartData.settings?.messageAchieved || '🎉 Congratulations! You have free shipping!';
            } else {
                // Format remaining amount
                const remainingFormatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(remaining);
                
                context.message = (cartData.settings?.messageProgress || 'Add {remaining} more for free shipping!')
                    .replace('{remaining}', remainingFormatted);
            }
        }
    },
    
    /**
     * Callbacks - Reactive side effects
     */
    callbacks: {
        /**
         * Initialize and listen for cart updates
         */
        init() {
            const { actions } = store('yayboost/shipping-bar');
            
            // Listen to WooCommerce cart update events
            if (typeof jQuery !== 'undefined') {
                jQuery(document.body).on('updated_cart_totals updated_checkout wc_fragments_refreshed', () => {
                    // Small delay to ensure cart data is updated
                    setTimeout(() => {
                        actions.updateFromCart();
                    }, 100);
                });
            }
        },
        
        /**
         * Log progress changes (for debugging)
         */
        logProgress() {
            const context = getContext();
            
            if (window.location.search.includes('debug=1')) {
                console.log('[YayBoost Shipping Bar] Progress:', {
                    progress: context.progress,
                    current: context.current,
                    threshold: context.threshold,
                    achieved: context.achieved
                });
            }
        }
    }
});

