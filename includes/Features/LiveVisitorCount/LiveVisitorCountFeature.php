<?php
/**
 * Live Visitor Count Feature
 *
 * Displays a live visitor count on single product pages.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\LiveVisitorCount;

use YayBoost\Features\AbstractFeature;

/**
 * Live Visitor Count feature implementation
 */
class LiveVisitorCountFeature extends AbstractFeature {
	/**
	 * Feature ID
	 *
	 * @var string
	 */
	protected $id = 'live_visitor_count';

	/**
	 * Feature name
	 *
	 * @var string
	 */
	protected $name = 'Live Visitor Count';

	/**
	 * Feature description
	 *
	 * @var string
	 */
	protected $description = 'Display a short text with the number of visitors viewing the current page';

	/**
	 * Feature category
	 *
	 * @var string
	 */
	protected $category = 'others';

	/**
	 * Feature icon (Phosphor icon name)
	 *
	 * @var string
	 */
	protected $icon = 'users';

	/**
	 * Display priority
	 *
	 * @var int
	 */
	protected $priority = 1;

	/**
	 * Constructor
	 *
	 * @param \YayBoost\Container\Container $container
	 */
	public function __construct( $container ) {
		parent::__construct( $container );

		// Register AJAX count and update visitor count
		add_action( 'wp_ajax_yayboost_visitor_ping', array( $this, 'ajax_ping' ) );
		add_action( 'wp_ajax_nopriv_yayboost_visitor_ping', array( $this, 'ajax_ping' ) );
		add_action( 'wp_ajax_yayboost_count_visitors', array( $this, 'ajax_count' ) );
		add_action( 'wp_ajax_nopriv_yayboost_count_visitors', array( $this, 'ajax_count' ) );
	}

	/**
	 * Initialize the feature
	 *
	 * @return void
	 */
	public function init(): void {
		if ( $this->is_enabled() ) {
			// Register hooks - they will only fire on product pages anyway
			// Use 'wp' hook to check product page after query is parsed
			add_action( 'wp', array( $this, 'register_product_hooks' ) );

			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );

			new LiveVisitorCountBlock( $this );
		}
	}

	/**
	 * Register product-specific hooks after query is parsed
	 *
	 * @return void
	 */
	public function register_product_hooks(): void {
		// Check if we're on a product page (query is now parsed)
		if ( ! function_exists( 'is_product' ) || ! is_product() ) {
			return;
		}

		$position = $this->get( 'display.position' );
		if ( 'use_block' === $position ) {
			return;
		}
		switch ( $position ) {
			case 'below_product_title':
				add_action( 'woocommerce_single_product_summary', array( $this, 'render_content' ), 6 );
				break;
			case 'above_add_to_cart_button':
				add_action( 'woocommerce_before_add_to_cart_button', array( $this, 'render_content' ), 10 );
				break;
			case 'below_add_to_cart_button':
				add_action( 'woocommerce_after_add_to_cart_button', array( $this, 'render_content' ), 10 );
				break;
			case 'below_price':
				add_action( 'woocommerce_single_product_summary', array( $this, 'render_content' ), 11 );
				break;
			default:
				add_action( 'woocommerce_single_product_summary', array( $this, 'render_content' ), 6 );
				break;
		}
	}

	/**
	 * Check if the feature should apply to the current product
	 *
	 * @param array $settings Feature settings
	 * @return bool
	 */
	public function should_apply_to_current_product(): bool {
		$apply = $this->get( 'apply_on.apply' );

		if ( 'all' === $apply ) {
			return true;
		}

		$product_id = get_the_ID();
		if ( ! $product_id ) {
			return false;
		}

		if ( 'specific_products' === $apply ) {
			$specific_products = $this->get( 'apply_on.products' ) ?? array();
			if ( empty( $specific_products ) ) {
				return false;
			}
			// Convert to integers for comparison
			$specific_products = array_map( 'intval', $specific_products );
			return in_array( (int) $product_id, $specific_products, true );
		}

		if ( 'specific_categories' === $apply ) {
			$specific_categories = $this->get( 'apply_on.categories' ) ?? array();
			if ( empty( $specific_categories ) ) {
				return false;
			}
			// Convert to integers for comparison
			$specific_categories = array_map( 'intval', $specific_categories );
			$product_categories  = wp_get_post_terms( $product_id, 'product_cat', array( 'fields' => 'ids' ) );
			if ( is_wp_error( $product_categories ) ) {
				return false;
			}
			// Check if any product category matches the specific categories
			return ! empty( array_intersect( array_map( 'intval', $product_categories ), $specific_categories ) );
		}

		return false;
	}

	/**
	 * Get default settings
	 *
	 * @return array
	 */
	protected function get_default_settings(): array {
		return array_merge(
			parent::get_default_settings(),
			array(
				'tracking_mode' => 'real-tracking',
				'real_tracking' => array(
					'active_window'         => 5,
					'minimum_count_display' => 1,
				),
				'simulated'     => array(
					'min' => 10,
					'max' => 50,
				),
				'display'       => array(
					'text'     => '👁️ {count} visitors are viewing this page',
					'position' => 'below_product_title',
				),
				'style'         => array(
					'style'            => 'style_1',
					'text_color'       => '#a74c3c',
					'background_color' => '#fff3f3',
				),
				'apply_on'      => array(
					'apply'      => 'all',
					'categories' => array(),
					'products'   => array(),
				),
			)
		);
	}

	public function enqueue_assets(): void {
		// Only enqueue on single product pages
		if ( ! function_exists( 'is_product' ) || ! is_product() || ! $this->should_apply_to_current_product() ) {
			return;
		}

		if ( ! wp_style_is( 'yayboost-live-visitor-count', 'enqueued' ) ) {
			wp_enqueue_style(
				'yayboost-live-visitor-count',
				YAYBOOST_URL . 'assets/dist/blocks/live-visitor-count/style-index.css',
				array(),
				YAYBOOST_VERSION
			);
		}

		$tracking_mode = $this->get( 'tracking_mode' );

		if ( 'real-tracking' === $tracking_mode ) {
			// Prevent duplicate enqueuing - WordPress handles this, but check anyway for safety
			if ( ! wp_script_is( 'yayboost-live-visitor-count', 'enqueued' ) ) {
				wp_enqueue_script(
					'yayboost-live-visitor-count',
					YAYBOOST_URL . 'assets/dist/blocks/live-visitor-count/view.js',
					array( 'jquery' ),
					YAYBOOST_VERSION,
					true
				);
			}

			$page_id = get_the_ID();
			if ( ! $page_id ) {
				global $product;
				if ( $product ) {
					$page_id = $product->get_id();
				}
			}

			// Fallback to current post ID or 0
			if ( ! $page_id ) {
				$page_id = get_queried_object_id() ?? 0;
			}

			// Only localize if we have a valid product page ID
			if ( $page_id > 0 ) {
				wp_localize_script(
					'yayboost-live-visitor-count',
					'yayboostLiveVisitorCount',
					array(
						'ajaxUrl'             => admin_url( 'admin-ajax.php' ),
						'nonce'               => wp_create_nonce( 'yayboost_live_visitor_count' ),
						'pageId'              => $page_id,
						'activeWindow'        => $this->get( 'real_tracking.active_window' ), // in minutes (2, 5, or 10)
						'minimumCountDisplay' => $this->get( 'real_tracking.minimum_count_display' ),
					)
				);
			}
		}
	}

	public function render_content(): void {
		// Check if feature should apply to current product
		if ( ! $this->should_apply_to_current_product() ) {
			return;
		}

		$content = $this->get_content();
		echo wp_kses_post( $content );
	}

	public function get_content(): string {
		$tracking_mode         = $this->get( 'tracking_mode' );
		$minimum_count_display = (int) ( $this->get( 'real_tracking.minimum_count_display' ) ?? 1 );
		$style                 = $this->get( 'style.style' ) ?? 'style_1';
		$text_color            = $this->get( 'style.text_color' ) ?? '#a74c3c';
		$background_color      = $this->get( 'style.background_color' ) ?? '#fff3f3';
		$display_text          = $this->get( 'display.text' ) ?? '👁️ {count} visitors are viewing this page';
		$count     = $this->get_visitor_count();

		$is_hidden = 'real-tracking' === $tracking_mode && $count < $minimum_count_display;
		//$count     = 'real-tracking' === $tracking_mode ? $count : rand( $settings['simulated']['min'], $settings['simulated']['max'] );
		$text    = str_replace( '{count}', $count, $display_text );

		if ( 'style_2' === $style ) {
			return '<div class="yayboost-lvc yayboost-lvc-style-2 ' . ( $is_hidden ? 'hidden' : '' ) . '" style="color: ' . esc_attr( $text_color ) . '; background-color: ' . esc_attr( $background_color ) . ';" data-text="' . esc_html( $display_text ) . '" data-count="' . esc_html( $count ) . '">' . wp_kses_post( $text ) . '</div>';
		}

		if ( 'style_3' === $style ) {
			return '<div class="yayboost-lvc yayboost-lvc-style-3 ' . ( $is_hidden ? 'hidden' : '' ) . '" data-text="' . esc_html( $display_text ) . '" data-count="' . esc_html( $count ) . '"><div class="yayboost-lvc-text" style="color: ' . esc_attr( $text_color ) . '; background-color: ' . esc_attr( $background_color ) . ';">' . wp_kses_post( $text ) . '</div><span id="yayboost-lvc-number">' . esc_html( $count ) . '</span></div>';
		}

		return '<div class="yayboost-lvc yayboost-lvc-style-1 ' . ( $is_hidden ? 'hidden' : '' ) . '" style="color: ' . esc_attr( $text_color ) . '" data-text="' . esc_html( $display_text ) . '" data-count="' . esc_html( $count ) . '">' . wp_kses_post( $text ) . '</div>';
	}

	public function ajax_ping(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce is verified below
		$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'yayboost_live_visitor_count' ) ) {
			wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified above
		$page_id    = isset( $_POST['page_id'] ) ? intval( $_POST['page_id'] ) : 0;
		$visitor_id = isset( $_POST['visitor_id'] ) ? sanitize_text_field( wp_unslash( $_POST['visitor_id'] ) ) : '';

		global $wpdb;
		$table = $wpdb->prefix . 'yayboost_live_visitor';

		// Use visitor_id from client if provided, otherwise generate a unique one
		// Never use PHP session_id as it's shared across tabs
		if ( empty( $visitor_id ) ) {
			// Generate a unique visitor ID if not provided
			$visitor_id = 'yayboost_lvc_' . time() . '_' . wp_generate_password( 16, false );
		}

		// Ensure visitor_id is not too long for the database field (64 chars max)
		$visitor_id = substr( $visitor_id, 0, 64 );

		$now          = time();
		$expired_time = $now - $this->get( 'real_tracking.active_window' ) * 60;
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

		// Get count of active visitors for this page (only those within active_window)
		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM $table WHERE page_id = %d AND last_active >= %d",
				$page_id,
				$expired_time
			)
		);

		$count = (int) $count;

		// Update cache with new count (cache for 30 seconds)
		$this->set_cached_visitor_count( $page_id, $count, 30 );

		wp_send_json_success( array( 'count' => $count ) );
	}

	/**
	 * AJAX handler for counting visitors only (read-only, no updates)
	 *
	 * @return void
	 */
	public function ajax_count(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce is verified below
		$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'yayboost_live_visitor_count' ) ) {
			wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified above
		$page_id = isset( $_POST['page_id'] ) ? intval( $_POST['page_id'] ) : 0;

		if ( $page_id <= 0 ) {
			wp_send_json_error( array( 'message' => 'Invalid page ID' ), 400 );
		}

		// Get cached count first
		$count = $this->get_cached_visitor_count( $page_id );
		if ( false !== $count ) {
			wp_send_json_success( array( 'count' => (int) $count ) );
			return;
		}

		global $wpdb;
		$table = $wpdb->prefix . 'yayboost_live_visitor';

		$expired_time = time() - $this->get( 'real_tracking.active_window' ) * 60;

		$this->clean_up_expired_visitors( $expired_time );

		// Get count of active visitors for this page (only those within active_window)
		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM $table WHERE page_id = %d AND last_active >= %d",
				$page_id,
				$expired_time
			)
		);

		$count = (int) $count;

		// Cache the count for 30 seconds
		$this->set_cached_visitor_count( $page_id, $count, 30 );

		wp_send_json_success( array( 'count' => $count ) );
	}

	public function get_visitor_count(): int {
		if ( ! function_exists( 'is_product' ) || ! is_product() ) {
			return 0;
		}
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

		if ( ! $page_id ) {
			return 0;
		}

		// Try to get cached count first
		$count = $this->get_cached_visitor_count( $page_id );
		if ( false !== $count ) {
			return (int) $count;
		}

		$tracking_mode = $this->get( 'tracking_mode' );
		if ( 'simulated' === $tracking_mode ) {
			$count = rand( $this->get( 'simulated.min' ), $this->get( 'simulated.max' ) );

		} else {
			$expired_time = time() - $this->get( 'real_tracking.active_window' ) * 60;
			$this->clean_up_expired_visitors( $expired_time );

			global $wpdb;
			$table = $wpdb->prefix . 'yayboost_live_visitor';
			$count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM $table WHERE page_id = %d AND last_active >= %d",
					$page_id,
					$expired_time
				)
			);

			$count = (int) $count;
		}

		// Cache the count for 30 seconds
		$this->set_cached_visitor_count( $page_id, $count, 30 );

		return $count;
	}

	public function clean_up_expired_visitors( $expired_time ): void {
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
	 * Get cached visitor count for a page
	 *
	 * @param int $page_id Page ID
	 * @return int|false Visitor count or false if cache expired/not found
	 */
	protected function get_cached_visitor_count( int $page_id ) {
		$cache_key = 'yayboost_lvc_count_' . $page_id;
		return get_transient( $cache_key );
	}

	/**
	 * Set cached visitor count for a page
	 *
	 * @param int $page_id Page ID
	 * @param int $count Visitor count
	 * @param int $expiration Cache expiration in seconds (default: 30)
	 * @return bool True if cache was set, false otherwise
	 */
	protected function set_cached_visitor_count( int $page_id, int $count, int $expiration = 30 ): bool {
		$cache_key = 'yayboost_lvc_count_' . $page_id;
		return set_transient( $cache_key, $count, $expiration );
	}

	/**
	 * Delete cached visitor count for a page
	 *
	 * @param int $page_id Page ID
	 * @return bool True if cache was deleted, false otherwise
	 */
	protected function delete_cached_visitor_count( int $page_id ): bool {
		$cache_key = 'yayboost_lvc_count_' . $page_id;
		return delete_transient( $cache_key );
	}
}
