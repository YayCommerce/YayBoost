<?php
/**
 * Exit Intent Popup AJAX Handler
 *
 * Handles AJAX requests for exit intent popup operations.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\ExitIntentPopup;

use YayBoost\Analytics\AnalyticsTracker;
use YayBoost\Utils\CodeGenerator;

defined( 'ABSPATH' ) || exit;

/**
 * AJAX endpoint handlers for exit intent popup
 */
class ExitIntentPopupAjaxHandler {

    /**
     * Nonce action name
     */
    const NONCE_ACTION = 'yayboost_exit_intent';

    /**
     * Maximum requests per IP per time window
     */
    const RATE_LIMIT_MAX_REQUESTS = 5;

    /**
     * Rate limit time window in seconds (default: 1 hour)
     */
    const RATE_LIMIT_WINDOW = 3600;

    /**
     * Transient key prefix for rate limit (per IP).
     * Used for storage and for clearing on settings save.
     */
    const TRANSIENT_RATE_LIMIT_PREFIX = 'yayboost_eip_rate_limit_';

    /**
     * Salt for hash generation (keep codes unique to this feature)
     *
     * @var string
     */
    private const HASH_SALT = 'yayboost_eip';

    /**
     * Feature instance
     *
     * @var ExitIntentPopupFeature
     */
    private $feature;

    /**
     * Tracker instance
     *
     * @var ExitIntentPopupTracker
     */
    private $tracker;

    /**
     * Constructor
     *
     * @param ExitIntentPopupFeature $feature Feature instance.
     */
    public function __construct( ExitIntentPopupFeature $feature ) {
        $this->feature = $feature;
        $this->tracker = $feature->get_tracker();
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

        // AJAX: mark popup shown
        add_action( 'wp_ajax_yayboost_exit_intent_shown', [ $this, 'handle_mark_shown' ] );
        add_action( 'wp_ajax_nopriv_yayboost_exit_intent_shown', [ $this, 'handle_mark_shown' ] );
    }

    /**
     * Clear rate limit transients (e.g. when admin saves settings).
     *
     * @return void
     */
    public static function clear_transients(): void {
        global $wpdb;
        $prefix  = self::TRANSIENT_RATE_LIMIT_PREFIX;
        $escaped = $wpdb->esc_like( '_transient_' . $prefix ) . '%';
        $wpdb->query( $wpdb->prepare( "DELETE FROM $wpdb->options WHERE option_name LIKE %s OR option_name LIKE %s", $escaped, $wpdb->esc_like( '_transient_timeout_' . $prefix ) . '%' ) );
    }

    /**
     * Handle AJAX: check if cart has items.
     *
     * @return void
     */
    public function handle_check_cart(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            wp_send_json_success( [ 'has_items' => false ] );
        }

        $has_items = WC()->cart->get_cart_contents_count() > 0;
        wp_send_json_success( [ 'has_items' => $has_items ] );
    }

    /**
     * Handle AJAX: mark popup as shown
     *
     * @return void
     */
    public function handle_mark_shown(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! $this->feature->is_enabled() ) {
            wp_send_json_error( [ 'message' => __( 'Feature disabled.', 'yayboost-sales-booster-for-woocommerce' ) ], 400 );
        }

        if ( ! $this->check_rate_limit() ) {
            wp_send_json_error( [ 'message' => __( 'Too many requests.', 'yayboost-sales-booster-for-woocommerce' ) ], 429 );
        }

        if ( ! $this->tracker->is_eligible() ) {
            wp_send_json_error( [ 'message' => __( 'Not eligible.', 'yayboost-sales-booster-for-woocommerce' ) ], 400 );
        }

        $this->tracker->mark_shown();

        wp_send_json_success( [ 'marked' => true ] );
    }

    /**
     * Handle AJAX: create a one-time coupon for exit intent.
     *
     * @return void
     */
    public function handle_create_coupon(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! $this->check_rate_limit() ) {
            wp_send_json_error( [ 'message' => __( 'Too many requests.', 'yayboost-sales-booster-for-woocommerce' ) ], 429 );
        }

        if ( ! $this->feature->is_enabled() ) {
            wp_send_json_error( [ 'message' => __( 'Feature disabled.', 'yayboost-sales-booster-for-woocommerce' ) ], 400 );
        }

        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            wp_send_json_error( [ 'message' => __( 'WooCommerce unavailable.', 'yayboost-sales-booster-for-woocommerce' ) ], 400 );
        }

        // Check if already has coupon (return existing if still valid)
        $state = $this->tracker->get_state();
        if ( ! empty( $state['coupon_code'] ) ) {
            $existing_code = $state['coupon_code'];

            // Validate coupon is still usable (not expired, not used up)
            if ( $this->is_coupon_valid( $existing_code ) ) {
                $this->apply_coupon_to_cart( $existing_code );

                // Track click event
                if ( AnalyticsTracker::is_enabled() ) {
                    AnalyticsTracker::click(
                        AnalyticsTracker::FEATURE_EXIT_INTENT,
                        0,
                        null,
                        [
                            'coupon_code'   => $existing_code,
                            'event_message' => sprintf(
                                /* translators: %s: coupon code */
                                __( 'Clicked popup – coupon %s applied', 'yayboost-sales-booster-for-woocommerce' ),
                                $existing_code
                            ),
                        ]
                    );
                }

                wp_send_json_success(
                    [
                        'code'     => $existing_code,
                        'existing' => true,
                    ]
                );
                return;
            }//end if

            // Coupon expired/invalid - clear it from state and create new one
            $this->tracker->clear_coupon();
        }//end if

        // User must have seen the popup to create coupon (shown_at must be set)
        // This prevents direct AJAX calls without triggering the popup first
        if ( empty( $state['shown_at'] ) ) {
            wp_send_json_error( [ 'message' => __( 'Not eligible for offer.', 'yayboost-sales-booster-for-woocommerce' ) ], 400 );
        }

        $settings = $this->feature->get_settings();
        $offer    = $settings['offer'] ?? [];

        $type = $offer['type'] ?? 'percent';

        // If no discount, do not create coupon
        if ( 'no_discount' === $type ) {
            wp_send_json_error( [ 'message' => __( 'No discount configured.', 'yayboost-sales-booster-for-woocommerce' ) ], 400 );
        }

        $code = $this->create_coupon( $offer );
        if ( ! $code ) {
            wp_send_json_error( [ 'message' => __( 'Failed to create coupon.', 'yayboost-sales-booster-for-woocommerce' ) ], 500 );
            return;
        }

        // Mark as used in tracker
        $this->tracker->mark_used( $code );

        $this->apply_coupon_to_cart( $code );

        // Track click event
        if ( AnalyticsTracker::is_enabled() ) {
            AnalyticsTracker::click(
                AnalyticsTracker::FEATURE_EXIT_INTENT,
                0,
                null,
                [
                    'coupon_code'   => $code,
                    'event_message' => sprintf(
                        /* translators: %s: coupon code */
                        __( 'Clicked popup – coupon %s applied', 'yayboost-sales-booster-for-woocommerce' ),
                        $code
                    ),
                ]
            );
        }

        wp_send_json_success( [ 'code' => $code ] );
    }

    /**
     * Create WooCommerce coupon
     *
     * @param array $offer Offer settings.
     * @return string|null Coupon code or null on failure.
     */
    private function create_coupon( array $offer ): ?string {
        $type   = $offer['type'] ?? 'percent';
        $value  = isset( $offer['value'] ) ? floatval( $offer['value'] ) : 0;
        $prefix = isset( $offer['prefix'] ) ? sanitize_text_field( $offer['prefix'] ) : 'GO-';
        $hours  = isset( $offer['expires'] ) ? max( 1, absint( $offer['expires'] ) ) : 1;

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

        try {
            $coupon = new \WC_Coupon();
            $coupon->set_code( $code );
            $coupon->set_discount_type( $coupon_type );
            $coupon->set_amount( $amount );
            $coupon->set_free_shipping( $is_free );
            $coupon->set_usage_limit( 1 );
            $coupon->set_usage_limit_per_user( 1 );
            $coupon->set_date_expires( time() + ( $hours * HOUR_IN_SECONDS ) );

            $coupon_id = $coupon->save();

            if ( ! $coupon_id || is_wp_error( $coupon_id ) ) {
                if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                    error_log( 'YayBoost: Failed to save exit intent coupon' ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
                }
                return null;
            }

            return $code;
        } catch ( \Exception $e ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( 'YayBoost: Exit intent coupon exception: ' . $e->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
            }
            return null;
        }//end try
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
     * Check if a coupon is still valid (exists, not expired, has usage remaining).
     *
     * @param string $code Coupon code.
     * @return bool True if coupon is valid and usable.
     */
    private function is_coupon_valid( string $code ): bool {
        $coupon_id = wc_get_coupon_id_by_code( $code );
        if ( ! $coupon_id ) {
            return false;
        }

        try {
            $coupon = new \WC_Coupon( $coupon_id );

            // Check if coupon is valid using WooCommerce's built-in validation
            $discounts = new \WC_Discounts( WC()->cart );
            $valid     = $discounts->is_coupon_valid( $coupon );

            // is_coupon_valid returns true or WP_Error
            return true === $valid;
        } catch ( \Exception $e ) {
            return false;
        }
    }

    /**
     * Generate unique coupon code
     * TODO: replace with other function later
     *
     * @param string $prefix Code prefix.
     * @return string Unique coupon code.
     */
    private function generate_unique_coupon_code( string $prefix ): string {

        $generator = new CodeGenerator( self::HASH_SALT, 8 );
        $encoded   = $generator->encode( time() );
        $code      = $prefix . $encoded;

        if ( ! wc_get_coupon_id_by_code( $code ) ) {
            return $code;
        }

        // Fallback: add timestamp suffix for guaranteed uniqueness
        $encoded = $generator->encode( time(), time() );
        $code    = $prefix . $encoded;

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
}
