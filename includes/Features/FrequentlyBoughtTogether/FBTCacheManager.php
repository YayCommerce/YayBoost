<?php
/**
 * FBT Cache Manager
 *
 * Centralized cache management for FBT feature.
 * Handles all cache operations including invalidation and key generation.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Centralized FBT cache management
 */
class FBTCacheManager {
    /**
     * Cache group name
     */
    const CACHE_GROUP = 'yayboost_fbt';

    /**
     * Default cache duration in seconds (1 hour)
     */
    const CACHE_DURATION = HOUR_IN_SECONDS;

    /**
     * Total orders count cache key
     */
    const TOTAL_ORDERS_CACHE_KEY = 'yayboost_fbt_total_orders';

    /**
     * Total orders count cache duration (6 hours)
     */
    const TOTAL_ORDERS_CACHE_DURATION = 6 * HOUR_IN_SECONDS;

    /**
     * Get cache key for product recommendations
     *
     * @param int   $product_id Product ID
     * @param int   $limit Maximum number of recommendations
     * @param array $settings Feature settings
     * @return string Cache key
     */
    public function get_recommendations_cache_key( int $product_id, int $limit, array $settings ): string {
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

    /**
     * Get cache key for orders count with product
     *
     * @param int  $product_id Product ID
     * @param bool $from_fbt Whether using FBT table method
     * @return string Cache key
     */
    public function get_orders_with_product_cache_key( int $product_id, bool $from_fbt = false ): string {
        $prefix = $from_fbt ? 'yayboost_fbt_orders_with_product_fbt_' : 'yayboost_fbt_orders_with_product_';
        return "{$prefix}{$product_id}";
    }

    /**
     * Invalidate all caches for a product
     *
     * @param int $product_id Product ID
     * @return void
     */
    public function invalidate_product( int $product_id ): void {
        // Clear object cache group
        if ( function_exists( 'wp_cache_flush_group' ) ) {
            wp_cache_flush_group( self::CACHE_GROUP );
        }

        // Delete product-specific transients
        global $wpdb;
        $pattern = '%yayboost_fbt_' . (int) $product_id . '_%';
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} 
                WHERE option_name LIKE %s 
                AND (option_name LIKE '_transient_%' OR option_name LIKE '_transient_timeout_%')",
                $pattern
            )
        );
    }

    /**
     * Invalidate total orders count cache
     *
     * @return void
     */
    public function invalidate_total_orders(): void {
        delete_transient( self::TOTAL_ORDERS_CACHE_KEY );
        if ( function_exists( 'wp_cache_delete' ) ) {
            wp_cache_delete( self::TOTAL_ORDERS_CACHE_KEY, self::CACHE_GROUP );
        }
    }

    /**
     * Invalidate multiple products (optimized for batch operations)
     *
     * @param array $product_ids Array of product IDs
     * @param bool  $skip_transients Whether to skip transient deletion (for performance)
     * @return void
     */
    public function invalidate_products( array $product_ids, bool $skip_transients = false ): void {
        if ( empty( $product_ids ) ) {
            return;
        }

        // Clear object cache group once (not per product)
        if ( function_exists( 'wp_cache_flush_group' ) ) {
            wp_cache_flush_group( self::CACHE_GROUP );
        }

        // Skip transient deletion during backfill for performance
        // Transients will expire naturally or be rebuilt on next access
        if ( $skip_transients ) {
            return;
        }

        // Delete transients for each product
        foreach ( array_unique( $product_ids ) as $product_id ) {
            $this->invalidate_product( $product_id );
        }
    }
}
