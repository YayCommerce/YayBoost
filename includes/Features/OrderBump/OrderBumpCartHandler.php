<?php
/**
 * Order Bump Cart Handler
 *
 * Adds/removes bump products to/from cart when checkbox is toggled on checkout,
 * applies bump price, and ensures cart summary updates via checkout refresh.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\OrderBump;

defined( 'ABSPATH' ) || exit;

/**
 * Handles adding/removing order bump products to cart with custom price.
 */
class OrderBumpCartHandler {

    const CART_ITEM_BUMP_KEY  = 'yayboost_bump';
    const CART_ITEM_PRICE_KEY = 'yayboost_bump_price';
    const AJAX_ACTION_ADD     = 'yayboost_order_bump_add';
    const AJAX_ACTION_REMOVE  = 'yayboost_order_bump_remove';

    /**
     * Order bump renderer (for price validation).
     *
     * @var OrderBumpRenderer
     */
    protected $renderer;

    public function __construct( OrderBumpRenderer $renderer ) {
        $this->renderer = $renderer;
    }

    /**
     * Register hooks and AJAX.
     *
     * @return void
     */
    public function register(): void {
        add_action( 'wp_ajax_' . self::AJAX_ACTION_ADD, [ $this, 'ajax_add_bump_to_cart' ] );
        add_action( 'wp_ajax_nopriv_' . self::AJAX_ACTION_ADD, [ $this, 'ajax_add_bump_to_cart' ] );
        add_action( 'wp_ajax_' . self::AJAX_ACTION_REMOVE, [ $this, 'ajax_remove_bump_from_cart' ] );
        add_action( 'wp_ajax_nopriv_' . self::AJAX_ACTION_REMOVE, [ $this, 'ajax_remove_bump_from_cart' ] );

        add_filter( 'woocommerce_add_cart_item_data', [ $this, 'add_cart_item_data' ], 10, 3 );
        add_filter( 'woocommerce_add_cart_item', [ $this, 'persist_cart_item_data' ], 10, 2 );
        add_filter( 'woocommerce_get_item_data', [ $this, 'display_bump_in_cart' ], 10, 2 );
        add_action( 'woocommerce_before_calculate_totals', [ $this, 'apply_bump_price' ], 10, 1 );
    }

    /**
     * AJAX: add bump product to cart with bump price.
     *
     * @return void
     */
    public function ajax_add_bump_to_cart(): void {
        check_ajax_referer( 'yayboost_order_bump', 'nonce' );
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            wp_send_json_error( [ 'message' => __( 'Cart not available.', 'yayboost' ) ] );
        }

        $product_id   = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
        $variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
        $bump_price   = isset( $_POST['bump_price'] ) ? (float) $_POST['bump_price'] : 0;

        if ( ! $product_id ) {
            wp_send_json_error( [ 'message' => __( 'Invalid product.', 'yayboost' ) ] );
        }

        $valid_price = $this->renderer->get_bump_price_for_product( $product_id, $variation_id );
        if ( $valid_price === null ) {
            wp_send_json_error( [ 'message' => __( 'Bump offer not available.', 'yayboost' ) ] );
        }
        $bump_price = (float) $valid_price;

        $cart_item_data = [
            self::CART_ITEM_BUMP_KEY  => 1,
            self::CART_ITEM_PRICE_KEY => $bump_price,
        ];

        $cart_id = WC()->cart->add_to_cart( $product_id, 1, $variation_id, [], $cart_item_data );
        if ( ! $cart_id ) {
            wp_send_json_error( [ 'message' => __( 'Could not add to cart.', 'yayboost' ) ] );
        }

        wp_send_json_success( [ 'message' => __( 'Added to order.', 'yayboost' ) ] );
    }

    /**
     * AJAX: remove bump product from cart.
     *
     * @return void
     */
    public function ajax_remove_bump_from_cart(): void {
        check_ajax_referer( 'yayboost_order_bump', 'nonce' );
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            wp_send_json_error( [ 'message' => __( 'Cart not available.', 'yayboost' ) ] );
        }

        $product_id   = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
        $variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
        if ( ! $product_id ) {
            wp_send_json_error( [ 'message' => __( 'Invalid product.', 'yayboost' ) ] );
        }

        foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
            if ( empty( $cart_item[ self::CART_ITEM_BUMP_KEY ] ) ) {
                continue;
            }
            $pid = (int) $cart_item['product_id'];
            $vid = (int) ( $cart_item['variation_id'] ?? 0 );
            if ( $pid === $product_id && $vid === $variation_id ) {
                WC()->cart->remove_cart_item( $cart_item_key );
                wp_send_json_success( [ 'message' => __( 'Removed from order.', 'yayboost' ) ] );
            }
        }

        wp_send_json_success( [ 'message' => __( 'Not in cart.', 'yayboost' ) ] );
    }

    /**
     * Persist bump data when adding to cart (so it survives session).
     *
     * @param array $cart_item_data Data passed to add_to_cart.
     * @param int   $product_id     Product ID.
     * @param int   $variation_id   Variation ID.
     * @return array
     */
    public function add_cart_item_data( array $cart_item_data, $product_id, $variation_id ): array {
        return $cart_item_data;
    }

    /**
     * Ensure bump keys are on the cart item object.
     *
     * @param array  $cart_item     Cart item.
     * @param string $_cart_item_key Cart item key (unused; required by filter).
     * @return array
     */
    public function persist_cart_item_data( array $cart_item, $_cart_item_key ): array {
        return $cart_item;
    }

    /**
     * Show "Order bump" in cart/checkout item meta.
     *
     * @param array $item_data Existing item data.
     * @param array $cart_item Cart item.
     * @return array
     */
    public function display_bump_in_cart( array $item_data, array $cart_item ): array {
        if ( ! empty( $cart_item[ self::CART_ITEM_BUMP_KEY ] ) ) {
            $item_data[] = [
                'key'   => __( 'Order bump', 'yayboost' ),
                'value' => __( 'Yes', 'yayboost' ),
            ];
        }
        return $item_data;
    }

    /**
     * Apply bump price to cart items that are bumps.
     *
     * @param \WC_Cart $cart Cart instance.
     * @return void
     */
    public function apply_bump_price( $cart ): void {
        if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
            return;
        }
        if ( did_action( 'woocommerce_before_calculate_totals' ) >= 2 ) {
            return;
        }

        foreach ( $cart->get_cart() as $cart_item ) {
            if ( empty( $cart_item[ self::CART_ITEM_BUMP_KEY ] ) || ! isset( $cart_item[ self::CART_ITEM_PRICE_KEY ] ) ) {
                continue;
            }
            // Re-validate bump. Check current bump offer has changed. If so, update the price.
            $bump_price = $this->renderer->get_bump_price_for_product( $cart_item['product_id'], $cart_item['variation_id'] );
            if ( $bump_price !== null ) {
                $cart_item[ self::CART_ITEM_PRICE_KEY ] = $bump_price;
                $price                                  = (float) $bump_price;
                if ( isset( $cart_item['data'] ) && is_object( $cart_item['data'] ) ) {
                    $cart_item['data']->set_price( $price );
                }
            } else {
                // Remove the cart item.
                $cart_item_key = $cart_item['key'];
                $cart->remove_cart_item( $cart_item_key );
            }

        }
    }
}
