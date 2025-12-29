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
 * Handles FBT data retrieval and caching
 */
class FBTRepository {
    /**
     * Cache group name
     */
    const CACHE_GROUP = 'yayboost_fbt';

    /**
     * Cache duration in seconds (1 hour)
     */
    const CACHE_DURATION = HOUR_IN_SECONDS;

    /**
     * Get recommendations for a product
     *
     * @param int   $product_id Product ID
     * @param int   $limit Maximum number of recommendations
     * @param array $settings Feature settings
     * @return array Array of WC_Product objects
     */
    public function get_recommendations( int $product_id, int $limit, array $settings ): array {
        // Generate cache key
        $cache_key = $this->get_cache_key( $product_id, $limit, $settings );

        // Try to get from cache
        $cached = get_transient( $cache_key );
        if ( false !== $cached ) {
            // Load products from cached IDs
            return $this->load_products_from_ids( $cached );
        }

        // Try object cache
        $cached = wp_cache_get( $cache_key, self::CACHE_GROUP );
        if ( false !== $cached ) {
            // Update transient with object cache data
            set_transient( $cache_key, $cached, self::CACHE_DURATION );
            return $this->load_products_from_ids( $cached );
        }

        // Query database
        $results = $this->query_recommendations( $product_id, $limit * 2 ); // Get more to account for filtering

        if ( empty( $results ) ) {
            // Cache empty result
            set_transient( $cache_key, [], self::CACHE_DURATION );
            wp_cache_set( $cache_key, [], self::CACHE_GROUP, self::CACHE_DURATION );
            return [];
        }

        // Filter by threshold
        $threshold = isset( $settings['min_order_threshold'] ) ? (float) $settings['min_order_threshold'] : 5;
        $results   = $this->filter_by_threshold( $results, $threshold );

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
            function( $product ) {
                return $product->get_id();
            },
            $products
        );
        set_transient( $cache_key, $cached_ids, self::CACHE_DURATION );
        wp_cache_set( $cache_key, $cached_ids, self::CACHE_GROUP, self::CACHE_DURATION );

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
     * @param array $results Query results
     * @param float $threshold Minimum threshold percentage
     * @return array Filtered results
     */
    public function filter_by_threshold( array $results, float $threshold ): array {
        if ( empty( $results ) || $threshold <= 0 ) {
            return $results;
        }

        // Get total orders count (cached)
        $total_orders = $this->get_total_orders_count();
        if ( $total_orders <= 0 ) {
            return $results;
        }

        // Calculate minimum count
        $min_count = ceil( ( $threshold / 100 ) * $total_orders );

        // Filter results
        return array_filter(
            $results,
            function( $result ) use ( $min_count ) {
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
            function( $product ) {
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
            function( $product ) use ( $cart_ids ) {
                return ! in_array( $product->get_id(), $cart_ids, true );
            }
        );
    }

    /**
     * Get total orders count (cached)
     *
     * @return int Total orders count
     */
    public function get_total_orders_count(): int {
        $cache_key = 'yayboost_fbt_total_orders';
        $cached    = get_transient( $cache_key );

        if ( false !== $cached ) {
            return (int) $cached;
        }

        // Query total orders
        $count = wc_get_orders(
            [
                'status' => 'wc-completed',
                'limit'  => -1,
                'return' => 'ids',
            ]
        );
        $count = is_array( $count ) ? count( $count ) : 0;

        // Cache for 6 hours
        set_transient( $cache_key, $count, 6 * HOUR_IN_SECONDS );

        return $count;
    }

    /**
     * Generate cache key
     *
     * @param int   $product_id Product ID
     * @param int   $limit Limit
     * @param array $settings Settings array
     * @return string Cache key
     */
    public function get_cache_key( int $product_id, int $limit, array $settings ): string {
        // Create hash of relevant settings
        $settings_hash = md5(
            serialize(
                [
                    'min_order_threshold' => $settings['min_order_threshold'] ?? 5,
                    'hide_if_in_cart'     => $settings['hide_if_in_cart'] ?? 'hide',
                ]
            )
        );

        return "yayboost_fbt_{$product_id}_{$limit}_{$settings_hash}";
    }
}

