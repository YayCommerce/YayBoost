<?php
/**
 * FBT Cache Manager
 *
 * Handles cache invalidation for FBT feature.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\Utils\Cache;

/**
 * FBT cache invalidation manager
 */
class FBTCacheManager {

	/**
	 * Cache group name for object cache
	 */
	const CACHE_GROUP = 'yayboost_fbt';

	/**
	 * Invalidate all caches for a product
	 *
	 * @param int $product_id Product ID.
	 * @return void
	 */
	public function invalidate_product( int $product_id ): void {
		global $wpdb;

		// Delete product-specific transients (pattern: yayboost_fbt_recommendations_{product_id}_*)
		$pattern = '%yayboost_fbt_recommendations_' . (int) $product_id . '_%';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options}
				WHERE option_name LIKE %s
				AND (option_name LIKE '_transient_%' OR option_name LIKE '_transient_timeout_%')",
				$pattern
			)
		);

		// Also delete from object cache if available
		wp_cache_delete( "yayboost_fbt_{$product_id}", self::CACHE_GROUP );
	}

	/**
	 * Invalidate total orders count cache
	 *
	 * @return void
	 */
	public function invalidate_total_orders(): void {
		Cache::forget( 'fbt_total_orders' );
	}

	/**
	 * Invalidate caches for multiple products
	 *
	 * @param array $product_ids Array of product IDs.
	 * @param bool  $skip_transients Skip transient deletion for performance (during backfill).
	 * @return void
	 */
	public function invalidate_products( array $product_ids, bool $skip_transients = false ): void {
		if ( empty( $product_ids ) ) {
			return;
		}

		// Clear object cache group once
		if ( function_exists( 'wp_cache_flush_group' ) ) {
			wp_cache_flush_group( self::CACHE_GROUP );
		}

		// Skip transient deletion during backfill for performance
		if ( $skip_transients ) {
			return;
		}

		// Delete transients for each product
		foreach ( array_unique( $product_ids ) as $product_id ) {
			$this->invalidate_product( (int) $product_id );
		}
	}
}
