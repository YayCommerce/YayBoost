<?php
/**
 * Email Capture Storage - Session and Cookie
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup;

defined( 'ABSPATH' ) || exit;

/**
 * Stores captured email in session and cookie for checkout prefill
 */
class EmailCaptureStorage {

    /**
     * Session/cookie key
     */
    const KEY = 'yayboost_captured_email';

    /**
     * Cookie expiry in days
     */
    const COOKIE_DAYS = 7;

    /**
     * Store email in session and cookie
     *
     * @param string $email
     * @return void
     */
    public static function store( string $email ): void {
        $email = sanitize_email( $email );
        if ( empty( $email ) ) {
            return;
        }

        if ( ! WC()->session ) {
            return;
        }

        WC()->session->set( self::KEY, $email );

        $expiry = time() + ( self::COOKIE_DAYS * DAY_IN_SECONDS );
        wc_setcookie( self::KEY, $email, $expiry );
    }

    /**
     * Get stored email (session first, then cookie)
     *
     * @return string|null
     */
    public static function get(): ?string {
        if ( WC()->session ) {
            $email = WC()->session->get( self::KEY );
            if ( ! empty( $email ) ) {
                return sanitize_email( $email );
            }
        }

        $email = isset( $_COOKIE[ self::KEY ] ) ? sanitize_email( wp_unslash( $_COOKIE[ self::KEY ] ) ) : '';
        return is_email( $email ) ? $email : null;
    }
}
