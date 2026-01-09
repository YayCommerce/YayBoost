<?php
/**
 * Live Visitor Count Tracker
 *
 * Handles visitor tracking database operations.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\LiveVisitorCount;

use YayBoost\Utils\Cache;

/**
 * Visitor tracking and counting operations
 */
class LiveVisitorCountTracker {

	/**
	 * Cache TTL in seconds
	 */
	const CACHE_TTL = 30;

	/**
	 * Cache key prefix for visitor counts
	 */
	const CACHE_KEY_PREFIX = 'lvc_count_';

	/**
	 * Feature instance for accessing settings
	 *
	 * @var LiveVisitorCountFeature
	 */
	private $feature;

	/**
	 * Constructor
	 *
	 * @param LiveVisitorCountFeature $feature Feature instance.
	 */
	public function __construct( LiveVisitorCountFeature $feature ) {
		$this->feature = $feature;
	}

	/**
	 * Get visitor count for current product page
	 *
	 * @return int Visitor count.
	 */
	public function get_visitor_count(): int {
		if ( ! function_exists( 'is_product' ) || ! is_product() ) {
			return 0;
		}

		$page_id = $this->get_current_page_id();
		if ( ! $page_id ) {
			return 0;
		}

		$tracking_mode = $this->feature->get( 'tracking_mode' );

		if ( 'simulated' === $tracking_mode ) {
			return $this->get_simulated_count( $page_id );
		}

		return $this->get_real_count( $page_id );
	}

	/**
	 * Get simulated visitor count (cached random)
	 *
	 * @param int $page_id Page ID.
	 * @return int Simulated count.
	 */
	private function get_simulated_count( int $page_id ): int {
		$min = $this->feature->get( 'simulated.min' );
		$max = $this->feature->get( 'simulated.max' );

		return Cache::remember(
			self::CACHE_KEY_PREFIX . $page_id,
			self::CACHE_TTL,
			fn() => rand( $min, $max )
		);
	}

	/**
	 * Get real visitor count from database
	 *
	 * @param int $page_id Page ID.
	 * @return int Real count.
	 */
	private function get_real_count( int $page_id ): int {
		return Cache::remember(
			self::CACHE_KEY_PREFIX . $page_id,
			self::CACHE_TTL,
			fn() => $this->count_active_visitors( $page_id )
		);
	}

	/**
	 * Count active visitors for a specific page
	 *
	 * @param int $page_id Page ID.
	 * @return int Active visitor count.
	 */
	public function count_active_visitors( int $page_id ): int {
		global $wpdb;
		$table        = $wpdb->prefix . 'yayboost_live_visitor';
		$expired_time = $this->get_expired_time();

		$this->clean_up_expired_visitors( $expired_time );

		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM $table WHERE page_id = %d AND last_active >= %d",
				$page_id,
				$expired_time
			)
		);

		return (int) $count;
	}

	/**
	 * Update visitor record (ping) and return count
	 *
	 * @param int    $page_id    Page ID.
	 * @param string $visitor_id Visitor ID.
	 * @return int Updated visitor count.
	 */
	public function ping_visitor( int $page_id, string $visitor_id ): int {
		global $wpdb;
		$table = $wpdb->prefix . 'yayboost_live_visitor';

		$visitor_id   = substr( $visitor_id, 0, 64 );
		$now          = time();
		$expired_time = $this->get_expired_time();

		$this->clean_up_expired_visitors( $expired_time );

		// Insert or update visitor record
		$wpdb->query(
			$wpdb->prepare(
				"INSERT INTO $table (session_id, page_id, last_active)
				 VALUES (%s, %d, %d)
				 ON DUPLICATE KEY UPDATE last_active = %d",
				$visitor_id,
				$page_id,
				$now,
				$now
			)
		);

		// Get and cache count
		$count = $this->count_active_visitors_raw( $page_id, $expired_time );
		Cache::set( self::CACHE_KEY_PREFIX . $page_id, $count, self::CACHE_TTL );

		return $count;
	}

	/**
	 * Get active visitor count without cleanup (for ping)
	 *
	 * @param int $page_id      Page ID.
	 * @param int $expired_time Expiration threshold.
	 * @return int Count.
	 */
	private function count_active_visitors_raw( int $page_id, int $expired_time ): int {
		global $wpdb;
		$table = $wpdb->prefix . 'yayboost_live_visitor';

		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM $table WHERE page_id = %d AND last_active >= %d",
				$page_id,
				$expired_time
			)
		);

		return (int) $count;
	}

	/**
	 * Clean up expired visitor records
	 *
	 * @param int $expired_time Unix timestamp threshold.
	 * @return void
	 */
	public function clean_up_expired_visitors( int $expired_time ): void {
		global $wpdb;
		$table = $wpdb->prefix . 'yayboost_live_visitor';
		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM $table WHERE last_active < %d",
				$expired_time
			)
		);
	}

	/**
	 * Get expired time threshold based on active window setting
	 *
	 * @return int Unix timestamp threshold.
	 */
	public function get_expired_time(): int {
		return time() - $this->feature->get( 'real_tracking.active_window' ) * 60;
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

	/**
	 * Generate unique visitor ID
	 *
	 * @return string Generated visitor ID.
	 */
	public function generate_visitor_id(): string {
		return 'yayboost_lvc_' . time() . '_' . wp_generate_password( 16, false );
	}
}
