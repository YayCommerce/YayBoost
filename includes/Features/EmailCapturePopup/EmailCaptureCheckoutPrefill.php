<?php
/**
 * Email Capture Checkout Prefill
 *
 * Prefills billing_email on checkout from stored captured email.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup;

defined( 'ABSPATH' ) || exit;

/**
 * Prefills checkout billing email from captured email
 */
class EmailCaptureCheckoutPrefill {

    /**
     * Register hooks
     *
     * @return void
     */
    public static function register(): void {
        add_filter( 'woocommerce_checkout_get_value', [ self::class, 'prefill_billing_email' ], 10, 2 );
    }

    /**
     * Prefill billing_email if empty and we have stored email
     *
     * @param mixed  $value Default value.
     * @param string $input Field name.
     * @return mixed
     */
    public static function prefill_billing_email( $value, string $input ) {
        if ( $input !== 'billing_email' || ! empty( $value ) ) {
            return $value;
        }

        $stored = EmailCaptureStorage::get();
        return $stored ?: $value;
    }
}
