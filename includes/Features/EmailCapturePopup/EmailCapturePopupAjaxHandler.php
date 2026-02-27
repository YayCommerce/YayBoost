<?php
/**
 * Email Capture Popup AJAX Handler
 *
 * Handles AJAX requests for email capture popup.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup;

defined( 'ABSPATH' ) || exit;

/**
 * AJAX endpoint handlers for email capture popup
 */
class EmailCapturePopupAjaxHandler {

    /**
     * Nonce action name
     */
    const NONCE_ACTION = 'yayboost_email_capture';

    /**
     * Feature instance
     *
     * @var EmailCapturePopupFeature
     */
    private $feature;

    /**
     * Constructor
     *
     * @param EmailCapturePopupFeature $feature Feature instance.
     */
    public function __construct( EmailCapturePopupFeature $feature ) {
        $this->feature = $feature;
    }

    /**
     * Register AJAX hooks
     *
     * @return void
     */
    public function register_hooks(): void {
        add_action( 'wp_ajax_yayboost_email_capture_submit', [ $this, 'handle_submit' ] );
        add_action( 'wp_ajax_nopriv_yayboost_email_capture_submit', [ $this, 'handle_submit' ] );
    }

    /**
     * Handle AJAX: submit email - save to DB, schedule follow-up, store for checkout prefill
     *
     * @return void
     */
    public function handle_submit(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! $this->feature->is_enabled() ) {
            wp_send_json_error( [ 'message' => __( 'Feature disabled.', 'yayboost' ) ], 400 );
        }

        $email = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
        if ( empty( $email ) || ! is_email( $email ) ) {
            wp_send_json_error( [ 'message' => __( 'Invalid email address.', 'yayboost' ) ], 400 );
        }

        // Already has pending record - treat as success (avoid duplicate sends)
        $existing = EmailCaptureRepository::find_pending_by_email( $email );
        if ( $existing ) {
            EmailCaptureStorage::store( $email );
            wp_send_json_success( [ 'saved' => true ] );
        }

        $settings     = $this->feature->get_settings();
        $email_trigger = $settings['email_trigger'] ?? [];
        $send_after   = (int) ( $email_trigger['send_after_days'] ?? 1 );
        $send_after   = max( 1, min( 30, $send_after ) );

        $captured_at  = current_time( 'mysql', true );
        $scheduled_at = gmdate( 'Y-m-d H:i:s', strtotime( "+{$send_after} days", strtotime( $captured_at ) ) );
        $session_id   = ( function_exists( 'WC' ) && WC()->session ) ? WC()->session->get_customer_id() : null;

        $row_id = EmailCaptureRepository::insert( [
            'email'        => $email,
            'status'       => EmailCaptureRepository::STATUS_PENDING,
            'captured_at'  => $captured_at,
            'scheduled_at' => $scheduled_at,
            'source'       => 'email_capture_popup',
            'session_id'   => $session_id,
        ] );

        if ( $row_id ) {
            EmailCaptureCron::schedule( $row_id, $scheduled_at );
            EmailCaptureStorage::store( $email );
        }

        wp_send_json_success( [ 'saved' => (bool) $row_id ] );
    }
}
