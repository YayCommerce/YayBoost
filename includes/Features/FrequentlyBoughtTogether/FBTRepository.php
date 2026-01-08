<?php
/**
 * FBT Repository
 *
 * Handles data retrieval for FBT recommendations with caching and filtering.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\Database\FBTRelationshipTable;

/**
 * Handles FBT data retrieval
 */
class FBTRepository {
    /**
     * Cache manager instance
     *
     * @var FBTCacheManager
     */
    protected FBTCacheManager $cache_manager;

    /**
     * Constructor
     *
     * @param FBTCacheManager $cache_manager Cache manager instance
     */
    public function __construct( FBTCacheManager $cache_manager ) {
        $this->cache_manager = $cache_manager;
    }

    /**
     * Get recommendations for a product
     *
     * @param int   $product_id Product ID
     * @param int   $limit Maximum number of recommendations
     * @param array $settings Feature settings
     * @return array Array of WC_Product objects
     */
    public function get_recommendations( int $product_id, int $limit, array $settings ): array {
        // Generate cache key using cache manager
        $cache_key = $this->cache_manager->get_recommendations_cache_key( $product_id, $limit, $settings );

        // Try to get from cache
        $cached = get_transient( $cache_key );
        if ( false !== $cached && ! empty( $cached ) ) {
            // Load products from cached IDs
            return $this->load_products_from_ids( $cached );
        }

        // Try object cache
        $cached = wp_cache_get( $cache_key, FBTCacheManager::CACHE_GROUP );
        if ( false !== $cached && ! empty( $cached ) ) {
            // Update transient with object cache data
            set_transient( $cache_key, $cached, FBTCacheManager::CACHE_DURATION );
            return $this->load_products_from_ids( $cached );
        }

        // Query database
        $results = $this->query_recommendations( $product_id, $limit * 2 );
        // Get more to account for filtering

        if ( empty( $results ) ) {
            // Cache empty result
            set_transient( $cache_key, [], FBTCacheManager::CACHE_DURATION );
            wp_cache_set( $cache_key, [], FBTCacheManager::CACHE_GROUP, FBTCacheManager::CACHE_DURATION );
            return [];
        }

        // Filter by threshold
        $threshold = isset( $settings['min_order_threshold'] ) ? (float) $settings['min_order_threshold'] : 5;
        $results   = $this->filter_by_threshold( $results, $threshold, $product_id );

        // Extract product IDs
        $product_ids = array_column( $results, 'product_id' );

        // Load products
        $products = $this->load_products( $product_ids );

        // Filter out of stock
        $products = $this->filter_out_of_stock( $products );

        // Filter in cart if needed
        $hide_if_in_cart = $settings['hide_if_in_cart'] ?? 'hide';
        if ( 'hide' === $hide_if_in_cart ) {
            $products = $this->filter_in_cart( $products );
        }

        // Limit to requested number
        $products = array_slice( $products, 0, $limit );

        // Cache product IDs
        $cached_ids = array_map(
            function ( $product ) {
                return $product->get_id();
            },
            $products
        );
        set_transient( $cache_key, $cached_ids, FBTCacheManager::CACHE_DURATION );
        wp_cache_set( $cache_key, $cached_ids, FBTCacheManager::CACHE_GROUP, FBTCacheManager::CACHE_DURATION );

        return $products;
    }

    /**
     * Query recommendations from database
     *
     * @param int $product_id Product ID
     * @param int $limit Maximum number of results
     * @return array Array of results with product_id and count
     */
    public function query_recommendations( int $product_id, int $limit ): array {
        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        // Query both directions (product_a = X OR product_b = X)
        // Use CASE to normalize the result (always return the "other" product)
        $sql = $wpdb->prepare(
            "SELECT 
                CASE 
                    WHEN product_a = %d THEN product_b 
                    ELSE product_a 
                END as product_id,
                count
            FROM {$table_name}
            WHERE product_a = %d OR product_b = %d
            ORDER BY count DESC
            LIMIT %d",
            $product_id,
            $product_id,
            $product_id,
            $limit
        );

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        return $wpdb->get_results( $sql, ARRAY_A );
    }

    /**
     * Filter results by threshold
     *
     * New logic: Threshold is based on orders containing the current product,
     * not total orders. Example: "In 10 orders with Product A,
     * Product B appears in at least 50% (5 orders)"
     *
     * Uses FBT table to calculate threshold (fast, approximate).
     * Logic: MAX(count) from FBT table = lower bound of orders containing the product.
     *
     * @param array $results Query results
     * @param float $threshold Minimum threshold percentage
     * @param int   $current_product_id Current product ID (for calculating base)
     * @return array Filtered results
     */
    public function filter_by_threshold( array $results, float $threshold, int $current_product_id ): array {
        if ( empty( $results ) || $threshold <= 0 ) {
            return $results;
        }

        // Get count of orders containing current product from FBT table (fast, approximate)
        $orders_with_product = $this->get_orders_count_with_product_from_fbt( $current_product_id );

        if ( $orders_with_product <= 0 ) {
            // No orders with this product, return empty
            return [];
        }

        // Calculate minimum count based on orders containing current product
        // Example: 50% of 10 orders = 5 orders minimum
        $min_count = ceil( ( $threshold / 100 ) * $orders_with_product );

        // Filter results: pair count must be >= min_count
        // This means: product X appears in at least min_count orders together with current product
        return array_filter(
            $results,
            function ( $result ) use ( $min_count ) {
                return isset( $result['count'] ) && (int) $result['count'] >= $min_count;
            }
        );
    }

    /**
     * Load products from IDs
     *
     * @param array $product_ids Array of product IDs
     * @return array Array of WC_Product objects
     */
    public function load_products( array $product_ids ): array {
        if ( empty( $product_ids ) ) {
            return [];
        }

        // Batch load products
        $products = wc_get_products(
            [
                'include' => $product_ids,
                'limit'   => -1,
            ]
        );

        return array_filter( $products );
    }

    /**
     * Load products from cached IDs
     *
     * @param array $product_ids Array of product IDs
     * @return array Array of WC_Product objects
     */
    protected function load_products_from_ids( array $product_ids ): array {
        if ( empty( $product_ids ) ) {
            return [];
        }

        return $this->load_products( $product_ids );
    }

    /**
     * Filter out of stock products
     *
     * @param array $products Array of WC_Product objects
     * @return array Filtered products
     */
    public function filter_out_of_stock( array $products ): array {
        return array_filter(
            $products,
            function ( $product ) {
                return $product && $product->is_in_stock() && $product->is_purchasable();
            }
        );
    }

    /**
     * Filter products already in cart
     *
     * @param array $products Array of WC_Product objects
     * @return array Filtered products
     */
    public function filter_in_cart( array $products ): array {
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return $products;
        }

        $cart_items = WC()->cart->get_cart();
        $cart_ids   = [];

        foreach ( $cart_items as $cart_item ) {
            $cart_ids[] = $cart_item['product_id'];
            if ( isset( $cart_item['variation_id'] ) && $cart_item['variation_id'] ) {
                $cart_ids[] = $cart_item['variation_id'];
            }
        }

        return array_filter(
            $products,
            function ( $product ) use ( $cart_ids ) {
                return ! in_array( $product->get_id(), $cart_ids, true );
            }
        );
    }

    /**
     * Get count of orders containing a specific product from FBT table (fast approximation)
     *
     * Uses MAX(count) from FBT table as a lower bound estimate.
     * Logic: If product A appears with product X in 7 orders, and with product Y in 10 orders,
     * then at least 10 orders contain product A.
     *
     * This is faster than querying WooCommerce orders directly and works well for threshold calculation.
     *
     * @param int $product_id Product ID
     * @return int Estimated number of orders containing this product (lower bound)
     */
    private function get_orders_count_with_product_from_fbt( int $product_id ): int {
        $cache_key = $this->cache_manager->get_orders_with_product_cache_key( $product_id, true );
        $cached    = get_transient( $cache_key );

        if ( false !== $cached && ! empty( $cached ) ) {
            return (int) $cached;
        }

        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        // Get MAX(count) from all pairs containing this product
        // This represents the minimum number of orders containing the product
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COALESCE(MAX(count), 0) 
                FROM {$table_name}
                WHERE product_a = %d OR product_b = %d",
                $product_id,
                $product_id
            )
        );

        $count = (int) max( 0, $count );

        // Cache for 1 hour
        set_transient( $cache_key, $count, HOUR_IN_SECONDS );

        return $count;
    }

    /**
     * Get total orders count (cached)
     *
     * Uses WooCommerce API which automatically handles HPOS compatibility.
     * This function works with both legacy wp_posts and HPOS custom tables.
     *
     * @return int Total orders count
     */
    public function get_total_orders_count(): int {
        $cache_key = FBTCacheManager::TOTAL_ORDERS_CACHE_KEY;
        $cached    = get_transient( $cache_key );

        if ( false !== $cached ) {
            return (int) $cached;
        }

        // Use WooCommerce API - automatically handles HPOS vs legacy
        $count = wc_orders_count( 'completed' );
        $count = (int) $count;

        // Cache for 6 hours
        set_transient( $cache_key, $count, FBTCacheManager::TOTAL_ORDERS_CACHE_DURATION );

        return $count;
    }
}
