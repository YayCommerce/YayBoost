<?php
/**
 * Exit Intent Popup AJAX Handler
 *
 * Handles AJAX requests for exit intent popup operations.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\ExitIntentPopup;

/**
 * AJAX endpoint handlers for exit intent popup
 */
class ExitIntentPopupAjaxHandler {

    /**
     * Nonce action name
     */
    const NONCE_ACTION = 'yayboost_exit_intent_popup';

    /**
     * Maximum requests per IP per time window
     */
    const RATE_LIMIT_MAX_REQUESTS = 5;

    /**
     * Rate limit time window in seconds (default: 1 hour)
     */
    const RATE_LIMIT_WINDOW = 3600;

    /**
     * Transient key prefix for one-time coupon (per client).
     * Used for storage and for clearing on settings save.
     */
    const TRANSIENT_COUPON_PREFIX = 'yayboost_eip_coupon_';

    /**
     * Transient key prefix for rate limit (per IP).
     * Used for storage and for clearing on settings save.
     */
    const TRANSIENT_RATE_LIMIT_PREFIX = 'yayboost_eip_rate_limit_';

    /**
     * Tracker instance
     *
     * @var ExitIntentPopupFeature
     */
    private $feature;

    /**
     * Constructor
     *
     * @param ExitIntentPopupFeature $feature Feature instance.
     */
    public function __construct( ExitIntentPopupFeature $feature ) {
        $this->feature = $feature;
    }

    /**
     * Register AJAX hooks
     *
     * @return void
     */
    public function register_hooks(): void {
        // AJAX: create one-time coupon
        add_action( 'wp_ajax_yayboost_exit_intent_coupon', [ $this, 'handle_create_coupon' ] );
        add_action( 'wp_ajax_nopriv_yayboost_exit_intent_coupon', [ $this, 'handle_create_coupon' ] );

        // AJAX: check cart status
        add_action( 'wp_ajax_yayboost_exit_intent_check_cart', [ $this, 'handle_check_cart' ] );
        add_action( 'wp_ajax_nopriv_yayboost_exit_intent_check_cart', [ $this, 'handle_check_cart' ] );
    }

    /**
     * Clear all exit-intent coupon transients (e.g. when admin saves settings).
     * Removes cached one-time coupon codes so new offer settings take effect.
     *
     * @return void
     */
    public static function clear_transients(): void {
        global $wpdb;
        $prefix  = 'yayboost_eip_';
        $escaped = $wpdb->esc_like( '_transient_' . $prefix . 'coupon_' ) . '%';
        $wpdb->query( $wpdb->prepare( "DELETE FROM $wpdb->options WHERE option_name LIKE %s OR option_name LIKE %s", $escaped, $wpdb->esc_like( '_transient_timeout_' . $prefix ) . '%' ) );
    }

    /**
     * Handle AJAX: check if cart has items.
     *
     * @return void
     */
    public function handle_check_cart(): void {
        check_ajax_referer( 'yayboost_exit_intent', 'nonce' );

        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            wp_send_json_success( [ 'has_items' => false ] );
        }

        $has_items = WC()->cart->get_cart_contents_count() > 0;
        wp_send_json_success( [ 'has_items' => $has_items ] );
    }

    /**
     * Handle AJAX: create a one-time coupon for exit intent.
     *
     * @return void
     */
    public function handle_create_coupon(): void {
        check_ajax_referer( 'yayboost_exit_intent', 'nonce' );
        // Check IP rate limit
        if ( ! $this->check_rate_limit() ) {
            wp_send_json_error(
                [
                    'message' => __( 'Rate limit exceeded.', 'yayboost' ),
                ],
                429
            );
        }

        if ( ! $this->feature->is_enabled() ) {
            wp_send_json_error( [ 'message' => __( 'Feature disabled.', 'yayboost' ) ], 400 );
        }

        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            wp_send_json_error( [ 'message' => __( 'WooCommerce cart unavailable.', 'yayboost' ) ], 400 );
        }

        $client_key = $this->get_client_key();

        if ( empty( $client_key ) ) {
            wp_send_json_error( [ 'message' => __( 'Missing client key.', 'yayboost' ) ], 400 );
        }

        $transient_key = self::TRANSIENT_COUPON_PREFIX . md5( $client_key );
        $existing_code = get_transient( $transient_key );

        if ( $existing_code ) {
            $this->apply_coupon_to_cart( $existing_code );
            wp_send_json_success( [ 'code' => $existing_code ] );
        }

        $settings = $this->feature->get_settings();
        $offer    = $settings['offer'] ?? [];

        $type = $offer['type'] ?? 'percent';

        // If no discount, do not create coupon
        if ( 'no_discount' === $type ) {
            wp_send_json_error( [ 'message' => __( 'No discount configured.', 'yayboost' ) ], 400 );
        }
        $value  = isset( $offer['value'] ) ? floatval( $offer['value'] ) : 0;
        $prefix = isset( $offer['prefix'] ) ? sanitize_text_field( $offer['prefix'] ) : 'GO-';
        $hours  = isset( $offer['expires'] ) ? absint( $offer['expires'] ) : 1;

        $coupon_type = 'percent';
        $amount      = $value;
        $is_free     = false;

        if ( 'fixed_amount' === $type ) {
            $coupon_type = 'fixed_cart';
        } elseif ( 'free_shipping' === $type ) {
            $coupon_type = 'fixed_cart';
            $amount      = 0;
            $is_free     = true;
        }

        $code = $this->generate_unique_coupon_code( $prefix );

        $coupon = new \WC_Coupon();
        $coupon->set_code( $code );
        $coupon->set_discount_type( $coupon_type );
        $coupon->set_amount( $amount );
        $coupon->set_free_shipping( $is_free );
        $coupon->set_usage_limit( 1 );
        $coupon->set_usage_limit_per_user( 1 );
        $coupon->set_date_expires( time() + ( $hours * HOUR_IN_SECONDS ) );
        $coupon->save();

        set_transient( $transient_key, $code, $hours * HOUR_IN_SECONDS );

        $this->apply_coupon_to_cart( $code );

        wp_send_json_success( [ 'code' => $code ] );
    }

    /**
     * Apply coupon to cart if possible.
     *
     * @param string $code Coupon code.
     * @return void
     */
    private function apply_coupon_to_cart( string $code ): void {
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return;
        }

        if ( ! WC()->cart->has_discount( $code ) ) {
            WC()->cart->apply_coupon( $code );
            WC()->cart->calculate_totals();
        }
    }

    /**
     * Generate unique coupon code with prefix.
     *
     * @param string $prefix Prefix.
     * @return string
     */
    private function generate_unique_coupon_code( string $prefix ): string {
        $encoded = strtoupper( substr( md5( 'yayboost_eip_' . time() ), 0, 8 ) );
        $code    = $prefix . $encoded;
        if ( wc_get_coupon_id_by_code( $code ) ) {
            $encoded = strtoupper( substr( md5( 'yayboost_eip_coupon_' . time() ), 0, 8 ) );
            $code    = $prefix . $encoded;
        }

        return $code;
    }

    /**
     * Get client IP address.
     *
     * @return string Client IP address.
     */
    private function get_client_ip(): string {
        // Check headers in order of preference (Cloudflare, proxies, then direct)
        $ip_keys = [
            'HTTP_CF_CONNECTING_IP',
            // Cloudflare
                        'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR',
        ];

        foreach ( $ip_keys as $key ) {
            if ( ! empty( $_SERVER[ $key ] ) ) {
                $ip = sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) );
                // Handle comma-separated IPs (from proxies)
                if ( strpos( $ip, ',' ) !== false ) {
                    $ips = explode( ',', $ip );
                    $ip  = trim( $ips[0] );
                }
                // Validate IP address
                if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
                    return $ip;
                }
            }
        }

        // Fallback to REMOTE_ADDR even if it's private/reserved
        return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0.0.0.0';
    }

    /**
     * Check if request is within rate limit.
     *
     * @return bool True if within limit, false if exceeded.
     */
    private function check_rate_limit(): bool {
        $ip = $this->get_client_ip();

        // Skip rate limiting for localhost/private IPs in development
        if ( $this->is_local_ip( $ip ) ) {
            return true;
        }

        $rate_limit_key = self::TRANSIENT_RATE_LIMIT_PREFIX . md5( $ip );
        $request_count  = get_transient( $rate_limit_key );

        if ( false === $request_count ) {
            // First request in this window
            set_transient( $rate_limit_key, 1, self::RATE_LIMIT_WINDOW );
            return true;
        }

        if ( $request_count >= self::RATE_LIMIT_MAX_REQUESTS ) {
            // Rate limit exceeded
            return false;
        }

        // Increment request count
        set_transient( $rate_limit_key, $request_count + 1, self::RATE_LIMIT_WINDOW );
        return true;
    }

    /**
     * Check if IP is local/private (for development).
     *
     * @param string $ip IP address.
     * @return bool True if local IP.
     */
    private function is_local_ip( string $ip ): bool {
        return ! filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE );
    }

    /**
     * Get client key.
     *
     * @return string Client key.
     */
    private function get_client_key(): string {
        if ( is_user_logged_in() ) {
            return 'user_' . get_current_user_id();
        }

        // For guests, use IP + User-Agent
        $ip = $this->get_client_ip();
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
        return 'guest_' . md5( $ip . $ua );
    }
}
