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
use YayBoost\Database\FBTProductStatsTable;
use YayBoost\Utils\Cache;

/**
 * Handles FBT data retrieval
 */
class FBTRepository {

	/**
	 * Cache duration for recommendations (1 hour)
	 */
	const CACHE_DURATION = HOUR_IN_SECONDS;

	/**
	 * Get recommendations for a product
	 *
	 * @param int   $product_id Product ID.
	 * @param int   $limit Maximum number of recommendations.
	 * @param array $settings Feature settings.
	 * @return array Array of WC_Product objects.
	 */
	public function get_recommendations( int $product_id, int $limit, array $settings ): array {
		$threshold = (float) ( $settings['min_order_threshold'] ?? 5 );

		// Get raw recommendations from cache or DB (cached at DB level, not filtered)
		$results = $this->get_raw_recommendations( $product_id, $limit * 2, $threshold );

		if ( empty( $results ) ) {
			return [];
		}

		// Load products from IDs
		$product_ids = array_column( $results, 'product_id' );
		$products    = $this->load_products( $product_ids );

		// Filter out of stock (always applied, even on cache hit)
		$products = $this->filter_out_of_stock( $products );

		// Filter in cart if needed (always applied, even on cache hit)
		$hide_if_in_cart = $settings['hide_if_in_cart'] ?? 'hide';
		if ( 'hide' === $hide_if_in_cart ) {
			$products = $this->filter_in_cart( $products );
		}

		// Limit to requested number
		return array_slice( $products, 0, $limit );
	}

	/**
	 * Get raw recommendations from cache or DB
	 *
	 * Caches DB query results before dynamic filtering.
	 * Threshold filtering is applied here since it's based on static FBT data.
	 *
	 * @param int   $product_id Product ID.
	 * @param int   $limit Maximum results to fetch.
	 * @param float $threshold Minimum threshold percentage.
	 * @return array Array of results with product_id and count.
	 */
	private function get_raw_recommendations( int $product_id, int $limit, float $threshold ): array {
		$cache_key = "fbt_recommendations_{$product_id}_{$limit}_{$threshold}";

		return Cache::remember(
			$cache_key,
			self::CACHE_DURATION,
			function () use ( $product_id, $limit, $threshold ) {
				return $this->query_and_filter( $product_id, $limit, $threshold );
			}
		);
	}

	/**
	 * Query recommendations and apply threshold filter
	 *
	 * Uses actual product order count for accurate threshold calculation.
	 *
	 * @param int   $product_id Product ID.
	 * @param int   $limit Maximum results.
	 * @param float $threshold Minimum threshold percentage.
	 * @return array Filtered results.
	 */
	private function query_and_filter( int $product_id, int $limit, float $threshold ): array {
		global $wpdb;
		$table_name = FBTRelationshipTable::get_table_name();

		// Query co-occurrence pairs sorted by count DESC
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$results = $wpdb->get_results(
			$wpdb->prepare(
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
			),
			ARRAY_A
		);

		if ( empty( $results ) || $threshold <= 0 ) {
			return $results ?: [];
		}

		// Get actual order count for the target product (mathematically accurate)
		$order_count = $this->get_product_order_count( $product_id );

		if ( $order_count <= 0 ) {
			return $results; // Return all if no order count tracked yet
		}

		// Calculate minimum count for threshold
		// Example: 5% threshold, 1000 orders with product = need at least 50 co-occurrences
		$min_count = (int) ceil( ( $threshold / 100 ) * $order_count );

		// Filter by threshold (pairs must appear in >= min_count orders together)
		return array_filter(
			$results,
			function ( $result ) use ( $min_count ) {
				return (int) $result['count'] >= $min_count;
			}
		);
	}

	/**
	 * Get order count for a product
	 *
	 * Returns the number of completed orders containing this product.
	 *
	 * @param int $product_id Product ID.
	 * @return int Order count.
	 */
	private function get_product_order_count( int $product_id ): int {
		global $wpdb;
		$table_name = FBTProductStatsTable::get_table_name();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT order_count FROM {$table_name} WHERE product_id = %d",
				$product_id
			)
		);

		return (int) $count;
	}

	/**
	 * Load products from IDs
	 *
	 * @param array $product_ids Array of product IDs.
	 * @return array Array of WC_Product objects.
	 */
	public function load_products( array $product_ids ): array {
		if ( empty( $product_ids ) ) {
			return [];
		}

		$products = wc_get_products(
			[
				'include' => $product_ids,
				'limit'   => -1,
			]
		);

		return array_filter( $products );
	}

	/**
	 * Filter out of stock products
	 *
	 * @param array $products Array of WC_Product objects.
	 * @return array Filtered products.
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
	 * @param array $products Array of WC_Product objects.
	 * @return array Filtered products.
	 */
	public function filter_in_cart( array $products ): array {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return $products;
		}

		$cart_ids = [];
		foreach ( WC()->cart->get_cart() as $cart_item ) {
			$cart_ids[] = $cart_item['product_id'];
			if ( ! empty( $cart_item['variation_id'] ) ) {
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
}
