<?php
/**
 * Live Visitor Count AJAX Handler
 *
 * Handles AJAX requests for visitor ping and count operations.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\LiveVisitorCount;

/**
 * AJAX endpoint handlers for live visitor counting
 */
class LiveVisitorCountAjaxHandler {

	/**
	 * Nonce action name
	 */
	const NONCE_ACTION = 'yayboost_live_visitor_count';

	/**
	 * Tracker instance
	 *
	 * @var LiveVisitorCountTracker
	 */
	private $tracker;

	/**
	 * Constructor
	 *
	 * @param LiveVisitorCountTracker $tracker Tracker instance.
	 */
	public function __construct( LiveVisitorCountTracker $tracker ) {
		$this->tracker = $tracker;
	}

	/**
	 * Register AJAX hooks
	 *
	 * @return void
	 */
	public function register_hooks(): void {
		add_action( 'wp_ajax_yayboost_visitor_ping', array( $this, 'handle_ping' ) );
		add_action( 'wp_ajax_nopriv_yayboost_visitor_ping', array( $this, 'handle_ping' ) );
		add_action( 'wp_ajax_yayboost_count_visitors', array( $this, 'handle_count' ) );
		add_action( 'wp_ajax_nopriv_yayboost_count_visitors', array( $this, 'handle_count' ) );
	}

	/**
	 * Handle visitor ping AJAX request
	 * Updates visitor record and returns current count
	 *
	 * @return void
	 */
	public function handle_ping(): void {
		if ( ! $this->verify_nonce() ) {
			wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified above
		$page_id    = isset( $_POST['page_id'] ) ? intval( $_POST['page_id'] ) : 0;
		$visitor_id = isset( $_POST['visitor_id'] ) ? sanitize_text_field( wp_unslash( $_POST['visitor_id'] ) ) : '';

		// Generate visitor ID if not provided
		if ( empty( $visitor_id ) ) {
			$visitor_id = $this->tracker->generate_visitor_id();
		}

		$count = $this->tracker->ping_visitor( $page_id, $visitor_id );

		wp_send_json_success( array( 'count' => $count ) );
	}

	/**
	 * Handle visitor count AJAX request (read-only)
	 * Returns current visitor count without updating records
	 *
	 * @return void
	 */
	public function handle_count(): void {
		if ( ! $this->verify_nonce() ) {
			wp_send_json_error( array( 'message' => 'Invalid nonce' ), 403 );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce verified above
		$page_id = isset( $_POST['page_id'] ) ? intval( $_POST['page_id'] ) : 0;

		if ( $page_id <= 0 ) {
			wp_send_json_error( array( 'message' => 'Invalid page ID' ), 400 );
		}

		// Try cached count first
		$count = $this->tracker->get_cached_count( $page_id );
		if ( false !== $count ) {
			wp_send_json_success( array( 'count' => (int) $count ) );
			return;
		}

		// Get fresh count from database
		$count = $this->tracker->count_active_visitors( $page_id );
		$this->tracker->set_cached_count( $page_id, $count );

		wp_send_json_success( array( 'count' => $count ) );
	}

	/**
	 * Verify AJAX request nonce
	 *
	 * @return bool True if nonce is valid.
	 */
	private function verify_nonce(): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- This method handles verification
		$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
		return wp_verify_nonce( $nonce, self::NONCE_ACTION );
	}
}
