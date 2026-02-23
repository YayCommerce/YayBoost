<?php
/**
 * FBT AJAX Handler
 *
 * Handles AJAX requests for adding multiple FBT products to cart.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\Analytics\AnalyticsTracker;

defined( 'ABSPATH' ) || exit;
/**
 * Handles FBT AJAX actions
 */
class FBTAjaxHandler {
    /**
     * Register AJAX hooks
     *
     * @return void
     */
    public function register(): void {
        add_action( 'wp_ajax_yayboost_fbt_add_to_cart', [ $this, 'add_to_cart' ] );
        add_action( 'wp_ajax_nopriv_yayboost_fbt_add_to_cart', [ $this, 'add_to_cart' ] );
    }

    /**
     * Handle add to cart AJAX request
     *
     * @return void
     */
    public function add_to_cart(): void {
        // Verify nonce
        if ( ! check_ajax_referer( 'yayboost_fbt_add_to_cart', 'nonce', false ) ) {
            wp_send_json_error(
                [
                    'message' => __( 'Security check failed.', 'yayboost-sales-booster-for-woocommerce' ),
                ],
                403
            );
        }

        // Get product IDs from request
        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        $product_ids = isset( $_POST['product_ids'] ) ? wp_unslash( $_POST['product_ids'] ) : [];

        if ( ! is_array( $product_ids ) ) {
            $product_ids = [ $product_ids ];
        }

        // Sanitize product IDs
        $product_ids = array_map( 'absint', $product_ids );
        $product_ids = array_filter( $product_ids );

        if ( empty( $product_ids ) ) {
            wp_send_json_error(
                [
                    'message' => __( 'No products selected.', 'yayboost-sales-booster-for-woocommerce' ),
                ],
                400
            );
        }

        $added  = [];
        $errors = [];
        $cart   = WC()->cart;

        foreach ( $product_ids as $product_id ) {
            $product = wc_get_product( $product_id );

            if ( ! $product ) {
                $errors[] = sprintf(
                    /* translators: %d: product ID */
                    __( 'Product #%d not found.', 'yayboost-sales-booster-for-woocommerce' ),
                    $product_id
                );
                continue;
            }

            // Check if product is purchasable
            if ( ! $product->is_purchasable() ) {
                $errors[] = sprintf(
                    /* translators: %s: product name */
                    __( '%s cannot be purchased.', 'yayboost-sales-booster-for-woocommerce' ),
                    $product->get_name()
                );
                continue;
            }

            // Check if in stock
            if ( ! $product->is_in_stock() ) {
                $errors[] = sprintf(
                    /* translators: %s: product name */
                    __( '%s is out of stock.', 'yayboost-sales-booster-for-woocommerce' ),
                    $product->get_name()
                );
                continue;
            }

            // Get source product ID for tracking
            $source_product_id = isset( $_POST['source_product_id'] ) ? absint( $_POST['source_product_id'] ) : 0;

            // Add FBT metadata to cart item for purchase tracking
            if ( $source_product_id !== $product_id ) {
                $cart_item_data = [
                    '_yayboost_fbt' => [
                        'source_product_id' => $source_product_id,
                    ],
                ];
            }

            // Add to cart with FBT metadata
            $cart_item_key = $cart->add_to_cart( $product_id, 1, 0, [], $cart_item_data );

            if ( $cart_item_key ) {
                $added[] = [
                    'id'    => $product_id,
                    'name'  => $product->get_name(),
                    'price' => (float) $product->get_price(),
                ];

                // Track add to cart event
                AnalyticsTracker::add_to_cart(
                    AnalyticsTracker::FEATURE_FBT,
                    $source_product_id,
                    $product_id,
                    1,
                    (float) $product->get_price()
                );
            } else {
                $errors[] = sprintf(
                    /* translators: %s: product name */
                    __( 'Failed to add %s to cart.', 'yayboost-sales-booster-for-woocommerce' ),
                    $product->get_name()
                );
            }//end if
        }//end foreach

        // Return response
        if ( empty( $added ) ) {
            wp_send_json_error(
                [
                    'message' => __( 'Failed to add products to cart.', 'yayboost-sales-booster-for-woocommerce' ),
                    'errors'  => $errors,
                ],
                400
            );
        }

        wp_send_json_success(
            [
                'message'   => sprintf(
                    /* translators: %d: number of products added */
                    _n(
                        '%d product added to cart.',
                        '%d products added to cart.',
                        count( $added ),
                        'yayboost-sales-booster-for-woocommerce'
                    ),
                    count( $added )
                ),
                'added'     => $added,
                'errors'    => $errors,
                'cart_url'  => wc_get_cart_url(),
                'cart_hash' => WC()->cart->get_cart_hash(),
                'fragments' => $this->get_cart_fragments(),
            ]
        );
    }

    /**
     * Get cart fragments for mini-cart update
     *
     * @return array
     */
    private function get_cart_fragments(): array {
        ob_start();
        woocommerce_mini_cart();
        $mini_cart = ob_get_clean();

        return [
            'div.widget_shopping_cart_content' => '<div class="widget_shopping_cart_content">' . $mini_cart . '</div>',
        ];
    }
}
