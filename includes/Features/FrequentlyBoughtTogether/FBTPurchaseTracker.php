<?php
/**
 * FBT Purchase Tracker
 *
 * Tracks purchases for items added via FBT feature.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\Analytics\AnalyticsTracker;

/**
 * Handles purchase tracking for FBT items
 */
class FBTPurchaseTracker {
    /**
     * Meta key for storing FBT data on order items
     */
    const ORDER_ITEM_META_KEY = '_yayboost_fbt';

    /**
     * Register hooks
     *
     * @return void
     */
    public function register(): void {
        // Save FBT metadata from cart to order items during checkout
        add_action( 'woocommerce_checkout_create_order_line_item', [ $this, 'save_fbt_meta_to_order_item' ], 10, 4 );

        // Track purchase when order is completed
        add_action( 'woocommerce_order_status_completed', [ $this, 'track_fbt_purchases' ], 10, 2 );

        // Also track on processing for stores that don't use completed status
        add_action( 'woocommerce_order_status_processing', [ $this, 'track_fbt_purchases' ], 10, 2 );
    }

    /**
     * Save FBT metadata from cart item to order item
     *
     * @param \WC_Order_Item_Product $item         Order item.
     * @param string                 $cart_item_key Cart item key.
     * @param array                  $values        Cart item values.
     * @param \WC_Order              $order         Order object.
     * @return void
     */
    public function save_fbt_meta_to_order_item( $item, $cart_item_key, $values, $order ): void {
        if ( isset( $values['_yayboost_fbt'] ) && is_array( $values['_yayboost_fbt'] ) ) {
            $item->add_meta_data( self::ORDER_ITEM_META_KEY, $values['_yayboost_fbt'], true );
        }
    }

    /**
     * Track FBT purchases when order completes
     *
     * @param int       $order_id Order ID.
     * @param \WC_Order $order    Order object (optional, may not be passed).
     * @return void
     */
    public function track_fbt_purchases( $order_id, $order = null ): void {
        // Get order if not provided
        if ( ! $order instanceof \WC_Order ) {
            $order = wc_get_order( $order_id );
        }

        if ( ! $order ) {
            return;
        }

        // Check if we already tracked this order
        $tracked = $order->get_meta( '_yayboost_fbt_tracked' );
        if ( $tracked ) {
            return;
        }

        $has_fbt_items = false;

        // Iterate through order items
        foreach ( $order->get_items() as $item ) {
            if ( ! $item instanceof \WC_Order_Item_Product ) {
                continue;
            }

            $fbt_data = $item->get_meta( self::ORDER_ITEM_META_KEY );

            if ( empty( $fbt_data ) || ! is_array( $fbt_data ) ) {
                continue;
            }

            $has_fbt_items     = true;
            $source_product_id = isset( $fbt_data['source_product_id'] ) ? absint( $fbt_data['source_product_id'] ) : 0;
            $purchased_product = $item->get_product_id();
            $quantity          = $item->get_quantity();
            $revenue           = (float) $item->get_total();

            // Track the purchase
            // Parameters: feature_id, order_id, source_product_id, purchased_product_id, quantity, revenue, metadata
            AnalyticsTracker::purchase(
                AnalyticsTracker::FEATURE_FBT,
                $order_id,
                $source_product_id,
                $purchased_product,
                $quantity,
                $revenue,
                [
                    'order_item_id' => $item->get_id(),
                ]
            );
        }

        // Mark order as tracked to prevent duplicate tracking
        if ( $has_fbt_items ) {
            $order->update_meta_data( '_yayboost_fbt_tracked', time() );
            $order->save();
        }
    }
}
