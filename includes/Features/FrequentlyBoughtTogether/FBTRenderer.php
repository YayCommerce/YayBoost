<?php
/**
 * FBT Renderer
 *
 * Handles frontend display of frequently bought together products.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Renders FBT products on single product page
 */
class FBTRenderer {
    /**
     * Cache manager instance
     *
     * @var FBTCacheManager
     */
    private $cache_manager;

    /**
     * Feature settings
     *
     * @var array
     */
    private $settings;

    /**
     * Constructor
     *
     * @param FBTCacheManager $cache_manager Cache manager instance
     * @param array           $settings      Feature settings
     */
    public function __construct( FBTCacheManager $cache_manager, array $settings ) {
        $this->cache_manager = $cache_manager;
        $this->settings      = $settings;
    }

    /**
     * Render FBT products for a product
     *
     * @param int $product_id Product ID
     * @return void
     */
    public function render( int $product_id ): void {
        // Get FBT product IDs
        $fbt_product_ids = $this->get_fbt_products( $product_id );

        if ( empty( $fbt_product_ids ) ) {
            return;
        }

        // Get WC_Product objects
        $products = $this->get_product_objects( $fbt_product_ids );

        if ( empty( $products ) ) {
            return;
        }

        // Filter products based on settings
        $products = $this->filter_products( $products );

        if ( empty( $products ) ) {
            return;
        }

        // Limit to max products
        $max_products = $this->settings['max_products'] ?? 4;
        $products     = array_slice( $products, 0, $max_products );

        // Enqueue assets
        $this->enqueue_assets();

        // Render template
        $this->render_template( $products, $product_id );
    }

    /**
     * Get FBT products with caching
     *
     * @param int $product_id Product ID
     * @return array Array of product IDs
     */
    private function get_fbt_products( int $product_id ): array {
        // Check cache first
        $cached = $this->cache_manager->get( $product_id );
        if ( $cached !== null ) {
            return $cached;
        }

        // Get from database
        $threshold     = $this->settings['min_order_threshold'] ?? 5;
        $max_products  = $this->settings['max_products'] ?? 4;
        $product_orders = FBTProductStatsTable::get_order_count( $product_id );

        $product_ids = FBTRelationshipTable::get_related_products(
            $product_id,
            $threshold,
            $max_products + 5, // Get extra in case some are filtered out
            $product_orders
        );

        // Cache result
        $this->cache_manager->set( $product_id, $product_ids );

        return $product_ids;
    }

    /**
     * Get WC_Product objects from IDs
     *
     * @param array $product_ids Array of product IDs
     * @return array Array of WC_Product objects
     */
    private function get_product_objects( array $product_ids ): array {
        if ( empty( $product_ids ) ) {
            return [];
        }

        $products = wc_get_products(
            [
                'include' => $product_ids,
                'status'  => 'publish',
                'limit'   => count( $product_ids ),
            ]
        );

        return $products ?: [];
    }

    /**
     * Filter products based on settings
     *
     * @param array $products Array of WC_Product objects
     * @return array Filtered products
     */
    private function filter_products( array $products ): array {
        $filtered = [];

        foreach ( $products as $product ) {
            // Skip out of stock products
            if ( ! $product->is_in_stock() ) {
                continue;
            }

            // Skip if in cart and setting is 'hide'
            if ( $this->settings['hide_if_in_cart'] === 'hide' && $this->is_product_in_cart( $product->get_id() ) ) {
                continue;
            }

            $filtered[] = $product;
        }

        return $filtered;
    }

    /**
     * Check if product is in cart
     *
     * @param int $product_id Product ID
     * @return bool
     */
    private function is_product_in_cart( int $product_id ): bool {
        if ( ! WC()->cart ) {
            return false;
        }

        foreach ( WC()->cart->get_cart() as $cart_item ) {
            if ( $cart_item['product_id'] === $product_id ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    private function enqueue_assets(): void {
        wp_enqueue_style(
            'yayboost-fbt',
            YAYBOOST_URL . 'assets/css/fbt.css',
            [],
            YAYBOOST_VERSION
        );

        wp_enqueue_script(
            'yayboost-fbt',
            YAYBOOST_URL . 'assets/js/fbt.js',
            [ 'jquery' ],
            YAYBOOST_VERSION,
            true
        );

        wp_localize_script(
            'yayboost-fbt',
            'yayboostFBT',
            [
                'ajaxUrl'       => admin_url( 'admin-ajax.php' ),
                'nonce'         => wp_create_nonce( 'yayboost_fbt_add_to_cart' ),
                'currencySymbol' => get_woocommerce_currency_symbol(),
                'i18n'          => [
                    'adding'      => __( 'Adding...', 'yayboost' ),
                    'added'       => __( 'Added!', 'yayboost' ),
                    'viewCart'    => __( 'View Cart', 'yayboost' ),
                    'error'       => __( 'Error adding to cart', 'yayboost' ),
                ],
            ]
        );
    }

    /**
     * Render FBT template
     *
     * @param array $products   Array of WC_Product objects
     * @param int   $product_id Current product ID
     * @return void
     */
    private function render_template( array $products, int $product_id ): void {
        $settings = $this->settings;

        include YAYBOOST_PATH . 'includes/Features/FrequentlyBoughtTogether/templates/fbt-products.php';
    }
}
