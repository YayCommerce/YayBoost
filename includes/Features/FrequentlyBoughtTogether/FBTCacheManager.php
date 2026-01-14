<?php
/**
 * FBT Cache Manager
 *
 * Handles caching of FBT product data using WordPress transients.
 * Compatible with object caching (Redis, Memcached).
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Cache manager for FBT data
 */
class FBTCacheManager {
    /**
     * Cache key prefix
     */
    const CACHE_PREFIX = 'yayboost_fbt_';

    /**
     * Cache version option name
     */
    const VERSION_OPTION = 'yayboost_fbt_cache_version';

    /**
     * Default cache TTL in seconds (1 hour)
     */
    const DEFAULT_TTL = 3600;

    /**
     * Get cache version
     *
     * @return int
     */
    private function get_version(): int {
        return (int) get_option( self::VERSION_OPTION, 1 );
    }

    /**
     * Get full cache key with version
     *
     * @param int $product_id Product ID
     * @return string
     */
    private function get_versioned_key( int $product_id ): string {
        return self::CACHE_PREFIX . $this->get_version() . '_' . $product_id;
    }

    /**
     * Get cached FBT products for a product
     *
     * @param int $product_id Product ID
     * @return array|null Array of product IDs or null if not cached
     */
    public function get( int $product_id ): ?array {
        $cached = get_transient( $this->get_versioned_key( $product_id ) );
        return $cached !== false ? $cached : null;
    }

    /**
     * Set FBT products cache for a product
     *
     * @param int   $product_id  Product ID
     * @param array $product_ids Array of related product IDs
     * @param int   $ttl         Cache TTL in seconds
     * @return bool
     */
    public function set( int $product_id, array $product_ids, int $ttl = self::DEFAULT_TTL ): bool {
        return set_transient( $this->get_versioned_key( $product_id ), $product_ids, $ttl );
    }

    /**
     * Invalidate cache for a single product
     *
     * @param int $product_id Product ID
     * @return bool
     */
    public function invalidate( int $product_id ): bool {
        return delete_transient( $this->get_versioned_key( $product_id ) );
    }

    /**
     * Invalidate ALL FBT cache by bumping version number
     *
     * This effectively invalidates all cached FBT data without
     * needing to delete individual transients.
     *
     * @return bool
     */
    public function invalidate_all(): bool {
        $current_version = $this->get_version();
        return update_option( self::VERSION_OPTION, $current_version + 1 );
    }

    /**
     * Invalidate cache for multiple products
     *
     * @param array $product_ids Array of product IDs
     * @return int Number of invalidated caches
     */
    public function invalidate_products( array $product_ids ): int {
        $count = 0;
        foreach ( $product_ids as $product_id ) {
            if ( $this->invalidate( (int) $product_id ) ) {
                ++$count;
            }
        }
        return $count;
    }

    /**
     * Check if cache exists for a product
     *
     * @param int $product_id Product ID
     * @return bool
     */
    public function has( int $product_id ): bool {
        return get_transient( self::CACHE_PREFIX . $product_id ) !== false;
    }

    /**
     * Get cache key for a product
     *
     * @param int $product_id Product ID
     * @return string
     */
    public function get_cache_key( int $product_id ): string {
        return self::CACHE_PREFIX . $product_id;
    }
}
