<?php
/**
 * Email Capture Lifecycle Handler
 *
 * Cancels scheduled follow-up when guest creates an account.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup;

defined( 'ABSPATH' ) || exit;

/**
 * Handles lifecycle events for captured emails
 */
class EmailCaptureLifecycleHandler {

    /**
     * Register hooks
     *
     * @return void
     */
    public static function register(): void {
        add_action( 'woocommerce_created_customer', [ self::class, 'on_customer_created' ], 10, 3 );
    }

    /**
     * When a new customer account is created - cancel scheduled follow-up for their email
     *
     * @param int   $customer_id   New customer ID.
     * @param array $new_customer_data New customer data.
     * @param bool  $password_generated Whether password was generated.
     * @return void
     */
    public static function on_customer_created( int $customer_id, array $new_customer_data, bool $password_generated ): void {
        $email = isset( $new_customer_data['user_email'] ) ? $new_customer_data['user_email'] : null;
        if ( empty( $email ) ) {
            $user  = get_userdata( $customer_id );
            $email = $user ? $user->user_email : null;
        }

        if ( empty( $email ) ) {
            return;
        }

        // Unschedule any pending follow-up for this email
        EmailCaptureCron::unschedule_by_email( $email );

        // Mark row as account_created so we don't send later
        $pending = EmailCaptureRepository::find_pending_by_email( $email );
        if ( $pending ) {
            EmailCaptureRepository::update_status( (int) $pending['id'], EmailCaptureRepository::STATUS_ACCOUNT_CREATED );
        }
    }
}
