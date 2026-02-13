<?php
/**
 * Order Bump Checkout Handler
 *
 * When the customer checks a bump offer and clicks Place order, adds the bump product
 * as a new order line item with the bump price (instead of adding to cart).
 *
 * @package YayBoost
 */

namespace YayBoost\Features\OrderBump;

defined( 'ABSPATH' ) || exit;

/**
 * Handles adding checked order bumps as order line items during checkout.
 */
class OrderBumpCheckoutHandler {

    /**
     * Order item meta key to mark line items added from order bump.
     *
     * @var string
     */
    const ORDER_ITEM_META_BUMP = '_yayboost_order_bump';

    /**
     * Order bump renderer (for bump price and variation resolution).
     *
     * @var OrderBumpRenderer
     */
    protected $renderer;

    /**
     * Constructor.
     *
     * @param OrderBumpRenderer $renderer Order bump renderer.
     */
    public function __construct( OrderBumpRenderer $renderer ) {
        $this->renderer = $renderer;
    }

    /**
     * Register WooCommerce checkout hook.
     *
     * @return void
     */
    public function register(): void {
        // Use priority 20 to run after cart items are added to the order
        add_action( 'woocommerce_checkout_create_order', [ $this, 'add_bump_line_items_to_order' ], 20, 2 );
    }

    /**
     * Add checked bump products as order line items with bump price.
     *
     * @param \WC_Order $order   Order being created.
     * @param array     $data    Checkout form data.
     * @return void
     */
    public function add_bump_line_items_to_order( $order, $data ): void {
        // Get bump product IDs from POST: checkboxes (yayboost_bump[]) and/or hidden field (yayboost_bump_ids, set by JS)
        $bump_ids = [];
        if ( isset( $_POST['yayboost_bump'] ) && is_array( $_POST['yayboost_bump'] ) ) {
            $bump_ids = array_map( 'absint', (array) wp_unslash( $_POST['yayboost_bump'] ) );
        }
        if ( isset( $_POST['yayboost_bump_ids'] ) && is_string( $_POST['yayboost_bump_ids'] ) ) {
            $ids_str = sanitize_text_field( wp_unslash( $_POST['yayboost_bump_ids'] ) );
            if ( $ids_str !== '' ) {
                $from_hidden = array_map( 'absint', array_filter( explode( ',', $ids_str ) ) );
                $bump_ids    = array_merge( $bump_ids, $from_hidden );
            }
        }
        $bump_ids = array_values( array_filter( array_unique( $bump_ids ) ) );

        if ( empty( $bump_ids ) ) {
            return;
        }

        if ( ! function_exists( 'wc_get_product' ) ) {
            return;
        }

        $added_count = 0;
        foreach ( $bump_ids as $product_id ) {
            $variation_id = $this->renderer->get_default_variation_id_for_product( $product_id );
            $product      = $variation_id > 0 ? wc_get_product( $variation_id ) : wc_get_product( $product_id );

            if ( ! $product || ! is_a( $product, 'WC_Product' ) ) {
                continue;
            }

            $bump_price = $this->renderer->get_bump_price_for_product( $product_id, $variation_id );
            if ( $bump_price === null ) {
                continue;
            }

            // Create order item manually for better control
            $item = new \WC_Order_Item_Product();
            $item->set_product( $product );
            $item->set_quantity( 1 );

            // Set prices (subtotal and total should be the same for bump items)
            $item->set_subtotal( $bump_price );
            $item->set_total( $bump_price );

            // Mark as order bump item
            $item->add_meta_data( self::ORDER_ITEM_META_BUMP, 1, true );

            // Add item to order
            $order->add_item( $item );
            ++$added_count;
        }//end foreach

        if ( $added_count > 0 ) {
            // Recalculate totals after adding bump items
            // Note: WooCommerce will save the order after this hook completes
            $order->calculate_totals();
        }
    }
}
