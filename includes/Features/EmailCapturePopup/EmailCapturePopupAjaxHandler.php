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
     * Handle AJAX: submit email (placeholder - DB logic to be implemented later)
     *
     * @return void
     */
    public function handle_submit(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! $this->feature->is_enabled() ) {
            wp_send_json_error( [ 'message' => \__( 'Feature disabled.', 'yayboost' ) ], 400 );
        }

        $email = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
        if ( empty( $email ) || ! is_email( $email ) ) {
            wp_send_json_error( [ 'message' => \__( 'Invalid email address.', 'yayboost' ) ], 400 );
        }

        // TODO: Save email to DB / subscribe - to be implemented in a follow-up plan
        wp_send_json_success( [ 'saved' => true ] );
    }
}
