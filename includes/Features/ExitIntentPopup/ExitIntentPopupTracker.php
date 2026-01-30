<?php
/**
 * Exit Intent Popup Tracker
 *
 * Manages popup state tracking across user sessions using dual storage:
 * - Logged-in users: usermeta
 * - Guest users: HttpOnly cookie + transient
 *
 * @package YayBoost
 */

namespace YayBoost\Features\ExitIntentPopup;

/**
 * State tracker for exit intent popup
 */
class ExitIntentPopupTracker {

    /**
     * User meta key for logged-in users
     */
    const META_KEY = '_yayboost_exit_popup';

    /**
     * Cookie name for guest token
     */
    const COOKIE_NAME = 'yayboost_exit_popup_token';

    /**
     * Transient prefix for guest data
     */
    const TRANSIENT_PREFIX = 'yayboost_exit_guest_';

    /**
     * Feature instance
     *
     * @var ExitIntentPopupFeature
     */
    private $feature;

    /**
     * Cached state to avoid multiple reads
     *
     * @var array|null
     */
    private $cached_state = null;

    /**
     * Constructor
     *
     * @param ExitIntentPopupFeature $feature Feature instance.
     */
    public function __construct( ExitIntentPopupFeature $feature ) {
        $this->feature = $feature;
    }

    /**
     * Get current popup state
     *
     * @return array|null State data or null if none.
     */
    public function get_state(): ?array {
        if ( null !== $this->cached_state ) {
            return $this->cached_state;
        }

        $state = is_user_logged_in()
            ? $this->get_user_state()
            : $this->get_guest_state();

        // Validate version - mismatch = fresh start
        $current_version = $this->get_settings_version();
        if ( $state && ( $state['version'] ?? 0 ) !== $current_version ) {
            $state = null;
        }

        $this->cached_state = $state;
        return $state;
    }

    /**
     * Set popup state
     *
     * @param array $data State data.
     * @return void
     */
    public function set_state( array $data ): void {
        $data['version'] = $this->get_settings_version();

        if ( is_user_logged_in() ) {
            $this->set_user_state( $data );
        } else {
            $this->set_guest_state( $data );
        }

        $this->cached_state = $data;
    }

    /**
     * Check if user is eligible to see popup
     *
     * @return bool True if eligible.
     */
    public function is_eligible(): bool {
        $state = $this->get_state();

        // Never shown -> eligible
        if ( ! $state ) {
            return true;
        }

        // Already converted -> check cooldown
        if ( ! empty( $state['converted_at'] ) ) {
            $cooldown        = $this->get_cooldown_seconds();
            $cooldown_passed = ( time() - $state['converted_at'] ) > $cooldown;

            if ( $cooldown_passed ) {
                // Clear old state for fresh start after cooldown
                $this->clear_state();
                return true;
            }

            return false;
        }

        // Shown but check if expired
        if ( ! empty( $state['shown_at'] ) && ! empty( $state['expires_at'] ) ) {
            $expired = time() > $state['expires_at'];

            if ( $expired ) {
                // Clear old state for fresh start after expiry
                $this->clear_state();
                return true;
            }

            return false;
        }

        return false;
    }

    /**
     * Mark popup as shown
     *
     * @return void
     */
    public function mark_shown(): void {
        $expires_hours = $this->feature->get( 'offer.expires', 1 );
        $expires_at    = time() + ( $expires_hours * HOUR_IN_SECONDS );

        $state               = $this->get_state() ?? [];
        $state['shown_at']   = time();
        $state['expires_at'] = $expires_at;

        $this->set_state( $state );
    }

    /**
     * Mark coupon as used
     *
     * @param string $coupon_code Coupon code.
     * @return void
     */
    public function mark_used( string $coupon_code ): void {
        $state                = $this->get_state() ?? [];
        $state['used_at']     = time();
        $state['coupon_code'] = sanitize_text_field( $coupon_code );

        $this->set_state( $state );
    }

    /**
     * Mark order as converted
     *
     * @param int $order_id Order ID.
     * @return void
     */
    public function mark_converted( int $order_id ): void {
        $state                 = $this->get_state() ?? [];
        $state['converted_at'] = time();
        $state['order_id']     = absint( $order_id );

        // Extend expiry to cooldown period for converted state
        $state['expires_at'] = time() + ( $this->get_cooldown_seconds() * DAY_IN_SECONDS );

        $this->set_state( $state );
    }

    /**
     * Clear coupon-related fields from state (when coupon expires/invalid).
     * Keeps tracking fields like shown_at for audit trail.
     *
     * @return void
     */
    public function clear_coupon(): void {
        $state = $this->get_state();
        if ( ! $state ) {
            return;
        }

        unset( $state['coupon_code'], $state['used_at'] );
        $this->set_state( $state );
    }

    /**
     * Clear all popup state
     *
     * @return void
     */
    public function clear_state(): void {
        if ( is_user_logged_in() ) {
            delete_user_meta( get_current_user_id(), self::META_KEY );
        } else {
            $token = $this->get_guest_token();
            if ( $token ) {
                delete_transient( self::TRANSIENT_PREFIX . md5( $token ) );
            }
        }
        $this->cached_state = null;
    }

    /**
     * Get state for logged-in user
     *
     * @return array|null
     */
    private function get_user_state(): ?array {
        $user_id = get_current_user_id();
        if ( ! $user_id ) {
            return null;
        }

        $data = get_user_meta( $user_id, self::META_KEY, true );
        return is_array( $data ) ? $data : null;
    }

    /**
     * Set state for logged-in user
     *
     * @param array $data State data.
     * @return void
     */
    private function set_user_state( array $data ): void {
        $user_id = get_current_user_id();
        if ( ! $user_id ) {
            return;
        }

        update_user_meta( $user_id, self::META_KEY, $data );
    }

    /**
     * Get state for guest user
     *
     * @return array|null
     */
    private function get_guest_state(): ?array {
        $token = $this->get_guest_token();
        if ( ! $token ) {
            return null;
        }

        $key  = self::TRANSIENT_PREFIX . md5( $token );
        $data = get_transient( $key );
        return is_array( $data ) ? $data : null;
    }

    /**
     * Set state for guest user
     *
     * @param array $data State data.
     * @return void
     */
    private function set_guest_state( array $data ): void {
        $token = $this->get_guest_token();
        if ( ! $token ) {
            $token = $this->generate_guest_token();
            $this->set_guest_token( $token, $data['expires_at'] ?? ( time() + ( 30 * DAY_IN_SECONDS ) ) );
        }

        $key = self::TRANSIENT_PREFIX . md5( $token );
        $ttl = max( 0, ( $data['expires_at'] ?? ( time() + DAY_IN_SECONDS ) ) - time() );
        set_transient( $key, $data, $ttl );
    }

    /**
     * Get guest token from cookie
     *
     * @return string|null
     */
    private function get_guest_token(): ?string {
        return isset( $_COOKIE[ self::COOKIE_NAME ] )
            ? sanitize_text_field( wp_unslash( $_COOKIE[ self::COOKIE_NAME ] ) )
            : null;
    }

    /**
     * Set guest token cookie
     *
     * @param string $token Token value.
     * @param int    $expiry Expiration timestamp.
     * @return void
     */
    private function set_guest_token( string $token, int $expiry ): void {
        $secure = is_ssl();
        setcookie(
            self::COOKIE_NAME,
            $token,
            [
                'expires'  => $expiry,
                'path'     => COOKIEPATH,
                'domain'   => COOKIE_DOMAIN,
                'secure'   => $secure,
                'httponly' => true,
                'samesite' => 'Lax',
            ]
        );
        $_COOKIE[ self::COOKIE_NAME ] = $token;
        // Make available immediately
    }

    /**
     * Generate random guest token (32 chars)
     *
     * @return string
     */
    private function generate_guest_token(): string {
        return bin2hex( random_bytes( 16 ) );
    }

    /**
     * Get cooldown period in seconds
     *
     * @return int
     */
    private function get_cooldown_seconds(): int {
        $days = $this->feature->get( 'tracking.cooldown_after_conversion' );
        return $days * DAY_IN_SECONDS;
    }

    /**
     * Get current settings version
     *
     * @return int
     */
    private function get_settings_version(): int {
        return (int) $this->feature->get( 'version', 1 );
    }
}
