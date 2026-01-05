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
		add_action( 'wp_ajax_yayboost_live_visitor_count_ping', array( $this, 'ajax_ping' ) );
		add_action( 'wp_ajax_nopriv_yayboost_live_visitor_count_ping', array( $this, 'ajax_ping' ) );
		add_action( 'wp_ajax_yayboost_live_visitor_count_count', array( $this, 'ajax_count' ) );
		add_action( 'wp_ajax_nopriv_yayboost_live_visitor_count_count', array( $this, 'ajax_count' ) );
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

		$settings = $this->get_settings();
		$position = $settings['display']['position'] ?? 'below_product_title';
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
		$settings = $this->get_settings();
		$apply_on = $settings['apply_on'] ?? array();
		$apply    = $apply_on['apply'] ?? 'all';

		if ( 'all' === $apply ) {
			return true;
		}

		$product_id = get_the_ID();
		if ( ! $product_id ) {
			return false;
		}

		if ( 'specific_products' === $apply ) {
			$specific_products = $apply_on['products'] ?? array();
			if ( empty( $specific_products ) ) {
				return false;
			}
			// Convert to integers for comparison
			$specific_products = array_map( 'intval', $specific_products );
			return in_array( (int) $product_id, $specific_products, true );
		}

		if ( 'specific_categories' === $apply ) {
			$specific_categories = $apply_on['categories'] ?? array();
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
					'text'     => '{count} visitors are viewing this page',
					'icon'     => 'eye',
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

		$settings = $this->get_settings();

		if ( 'real-tracking' === $settings['tracking_mode'] ) {
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
						'activeWindow'        => $settings['real_tracking']['active_window'] ?? 2, // in minutes (2, 5, or 10)
						'minimumCountDisplay' => $settings['real_tracking']['minimum_count_display'] ?? 1,
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
		$settings              = $this->get_settings();
		$tracking_mode         = $settings['tracking_mode'] ?? 'real-tracking';
		$minimum_count_display = (int) ( $settings['real_tracking']['minimum_count_display'] ?? 1 );
		$style                 = $settings['style']['style'] ?? 'style_1';
		$text_color            = $settings['style']['text_color'] ?? '#a74c3c';
		$background_color      = $settings['style']['background_color'] ?? '#fff3f3';
		$text                  = $settings['display']['text'] ?? '{count} visitors are viewing this page';
		$icon                  = $settings['display']['icon'] ?? 'eye';

		$icon_html = $this->get_icon_html( $icon );
		$count     = $this->get_visitor_count();

		$is_hidden = 'real-tracking' === $tracking_mode && $count < $minimum_count_display;
		$count     = 'real-tracking' === $tracking_mode ? $count : rand( $settings['simulated']['min'], $settings['simulated']['max'] );
		$text      = str_replace( '{count}', '<span id="yayboost-live-visitor-count">' . $count . '</span>', $text );
		$content   = '';
		if ( 'style_1' === $style ) {
			$content = '<div class="yayboost-live-visitor-count yayboost-live-visitor-count-style-1 ' . ( $is_hidden ? 'hidden' : '' ) . '" style="color: ' . esc_attr( $text_color ) . ';">' . wp_kses_post( $icon_html . $text ) . '</div>';
		} elseif ( 'style_2' === $style ) {
			$content = '<div class="yayboost-live-visitor-count yayboost-live-visitor-count-style-2 ' . ( $is_hidden ? 'hidden' : '' ) . '" style="color: ' . esc_attr( $text_color ) . '; background-color: ' . esc_attr( $background_color ) . ';">' . wp_kses_post( $icon_html . $text ) . '</div>';
		} elseif ( 'style_3' === $style ) {
			$content = '<div class="yayboost-live-visitor-count yayboost-live-visitor-count-style-3-wrapper ' . ( $is_hidden ? 'hidden' : '' ) . '"><div class="yayboost-live-visitor-count-style-3" style="color: ' . esc_attr( $text_color ) . '; background-color: ' . esc_attr( $background_color ) . ';">' . wp_kses_post( $text ) . '</div><div class="yayboost-live-visitor-count-style-3-icon">' . wp_kses_post( $icon_html ) . '<span id="yayboost-live-visitor-count">' . esc_html( $count ) . '</span></div></div>';
		}
		return $content;
	}

	public function get_icon_html( $icon ): string {
		if ( 'eye' === $icon ) {
			return '👁️';
		} elseif ( 'person' === $icon ) {
			return '👤';
		} elseif ( 'fire' === $icon ) {
			return '🔥';
		} elseif ( 'lightning' === $icon ) {
			return '⚡';
		} elseif ( 'none' === $icon ) {
			return '';
		}

		return '';
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

		// Get settings to use active_window setting
		$settings      = $this->get_settings();
		$active_window = isset( $settings['real_tracking']['active_window'] ) ? intval( $settings['real_tracking']['active_window'] ) : 10;

		global $wpdb;
		$table = $wpdb->prefix . 'yayboost_live_visitor';

		$now = time();

		// Use visitor_id from client if provided, otherwise generate a unique one
		// Never use PHP session_id as it's shared across tabs
		if ( empty( $visitor_id ) ) {
			// Generate a unique visitor ID if not provided
			$visitor_id = 'yayboost_lvc_' . time() . '_' . wp_generate_password( 16, false );
		}

		// Ensure visitor_id is not too long for the database field (64 chars max)
		$visitor_id = substr( $visitor_id, 0, 64 );

		$expired_time = $now - $active_window * 60;
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

		// Get settings to use active_window setting
		$settings      = $this->get_settings();
		$active_window = isset( $settings['real_tracking']['active_window'] ) ? intval( $settings['real_tracking']['active_window'] ) : 10;

		global $wpdb;
		$table = $wpdb->prefix . 'yayboost_live_visitor';

		$now                   = time();
		$active_window_seconds = $active_window * 60; // Convert minutes to seconds
		$expired_time          = $now - $active_window_seconds;

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

		$settings      = $this->get_settings();
		$active_window = isset( $settings['real_tracking']['active_window'] ) ? intval( $settings['real_tracking']['active_window'] ) : 10;
		$expired_time  = time() - $active_window * 60;
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
