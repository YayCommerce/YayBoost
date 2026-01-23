<?php
/**
 * Purchase Activity Count Tracker
 *
 * Handles purchase activity tracking
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PurchaseActivityCount;

use YayBoost\Utils\Cache;

/**
 * Pur tracking and counting operations
 */
class PurchaseActivityCountTracker {

    /**
     * Cache TTL in seconds
     */
    const CACHE_TTL = 300;
    // 5 minutes

    /**
     * Cache key prefix for purchase activity counts
     */
    const CACHE_KEY_PREFIX = 'pac_count_';

    /**
     * Feature instance for accessing settings
     *
     * @var PurchaseActivityCountFeature
     */
    private $feature;

    /**
     * Constructor
     *
     * @param PurchaseActivityCountFeature $feature Feature instance.
     */
    public function __construct( PurchaseActivityCountFeature $feature ) {
        $this->feature = $feature;
    }

    /**
     * Get purchase activity count for current product
     *
     * @return int count.
     */
    public function get_purchase_activity_count(): int {
        if ( ! function_exists( 'is_product' ) || ! is_product() ) {
            return 0;
        }

        $page_id = $this->get_current_page_id();
        if ( ! $page_id ) {
            return 0;
        }

        return Cache::remember(
            self::CACHE_KEY_PREFIX . $page_id,
            self::CACHE_TTL,
            fn() => $this->count_purchase_activity( $page_id )
        );
    }

    /**
     * Count purchase activity for a specific product
     *
     * @param int $page_id Page ID.
     * @return int Purchase activity count.
     */
    public function count_purchase_activity( int $page_id ): int {
        $count = 0;

        $count = $this->feature->get( 'count_from' );
        if ( 'all' === $count ) {
            $count = 1;
        }

        return (int) $count;
    }

    /**
     * Get current page ID with fallbacks
     *
     * @return int Page ID or 0 if not found.
     */
    public function get_current_page_id(): int {
        $page_id = get_the_ID();
        if ( ! $page_id ) {
            global $product;
            if ( $product ) {
                $page_id = $product->get_id();
            }
        }
        if ( ! $page_id ) {
            $page_id = get_queried_object_id() ?? 0;
        }
        return (int) $page_id;
    }

    /**
     * Get cached visitor count (for AJAX handler)
     *
     * @param int $page_id Page ID.
     * @return int|false Count or false if not cached.
     */
    public function get_cached_count( int $page_id ) {
        return Cache::get( self::CACHE_KEY_PREFIX . $page_id, false );
    }

    /**
     * Set cached visitor count (for AJAX handler)
     *
     * @param int $page_id Page ID.
     * @param int $count   Count.
     * @return bool Success.
     */
    public function set_cached_count( int $page_id, int $count ): bool {
        return Cache::set( self::CACHE_KEY_PREFIX . $page_id, $count, self::CACHE_TTL );
    }
}
