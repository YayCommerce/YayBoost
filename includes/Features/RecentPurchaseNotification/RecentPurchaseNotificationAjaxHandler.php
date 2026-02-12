<?php
/**
 * Recent Purchase Notification AJAX Handler
 *
 * Handles AJAX requests for recent purchase notification operations.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\RecentPurchaseNotification;

/**
 * AJAX endpoint handlers for recent purchase notification
 */
class RecentPurchaseNotificationAjaxHandler {

    /**
     * Nonce action name
     */
    const NONCE_ACTION = 'yayboost_recent_purchase';

    /**
     * Tracker instance
     *
     * @var RecentPurchaseNotificationTracker
     */
    private $tracker;

    /**
     * Constructors
     *
     * @param RecentPurchaseNotificationTracker $tracker Tracker instance.
     */
    public function __construct( RecentPurchaseNotificationTracker $tracker ) {
        $this->tracker = $tracker;
    }

    /**
     * Register AJAX hooks
     *
     * @return void
     */
    public function register_hooks(): void {
        add_action( 'wp_ajax_yayboost_recent_purchase', [ $this, 'handle_get_purchases_data' ] );
        add_action( 'wp_ajax_nopriv_yayboost_recent_purchase', [ $this, 'handle_get_purchases_data' ] );
        add_action( 'wp_ajax_yayboost_recent_purchase_shown', [ $this, 'handle_mark_shown' ] );
        add_action( 'wp_ajax_nopriv_yayboost_recent_purchase_shown', [ $this, 'handle_mark_shown' ] );
    }

    /**
     * Handle get purchases data AJAX request
     * Initial fetch: page_id, limit. Delta fetch: page_id, after_id (Strategy 3)
     *
     * @return void
     */
    public function handle_get_purchases_data(): void {
        try {
            if ( ! $this->verify_nonce() ) {
                wp_send_json_error( [ 'message' => 'Invalid nonce' ], 403 );
            }

            // phpcs:disable WordPress.Security.NonceVerification.Missing -- Nonce verified above
            $page_id  = isset( $_POST['page_id'] ) ? intval( $_POST['page_id'] ) : 0;
            $limit    = isset( $_POST['limit'] ) ? max( 1, min( 50, intval( $_POST['limit'] ) ) ) : 20;
            $after_id = isset( $_POST['after_id'] ) ? max( 0, intval( $_POST['after_id'] ) ) : null;
            // phpcs:enable WordPress.Security.NonceVerification.Missing

            $after_id_param = ( $after_id > 0 ) ? $after_id : null;

            if ( $page_id <= 0 ) {
                wp_send_json_error( [ 'message' => 'Invalid page_id' ], 400 );
            }

            $result = $this->tracker->get_purchase_list( $page_id, $limit, $after_id_param );

            wp_send_json_success( $result );
        } catch ( \Exception $e ) {
            wp_send_json_error( [ 'message' => $e->getMessage() ], 500 );
        }//end try
    }//end handle_get_purchases_data()

    /**
     * Handle AJAX: mark notification shown for current visitor
     *
     * @return void
     */
    public function handle_mark_shown(): void {
        try {
            if ( ! $this->verify_nonce() ) {
                wp_send_json_error( [ 'message' => 'Invalid nonce' ], 403 );
            }

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- Nonce verified above
            $purchase_id = isset( $_POST['purchase_id'] ) ? sanitize_text_field( wp_unslash( $_POST['purchase_id'] ) ) : '';
            $page_id     = isset( $_POST['page_id'] ) ? absint( $_POST['page_id'] ) : 0;
		// phpcs:enable WordPress.Security.NonceVerification.Missing

            $saved = false;
            if ( $this->tracker->should_persist_shown_state() ) {
                $this->tracker->mark_notification_shown( $purchase_id, $page_id );
                $saved = true;
            }

            wp_send_json_success( [ 'saved' => $saved ] );

        } catch ( \Exception $e ) {
            wp_send_json_error( [ 'message' => $e->getMessage() ], 500 );
        }//end try
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
