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
		add_action( 'wp_ajax_yayboost_exit_intent_coupon', array( $this, 'handle_create_coupon' ) );
		add_action( 'wp_ajax_nopriv_yayboost_exit_intent_coupon', array( $this, 'handle_create_coupon' ) );
	}

	/**
	 * Handle AJAX: create a one-time coupon for exit intent.
	 *
	 * @return void
	 */
	public function handle_create_coupon(): void {
		check_ajax_referer( 'yayboost_exit_intent', 'nonce' );

		if ( ! $this->feature->is_enabled() ) {
			wp_send_json_error( array( 'message' => __( 'Feature disabled.', 'yayboost' ) ), 400 );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			wp_send_json_error( array( 'message' => __( 'WooCommerce cart unavailable.', 'yayboost' ) ), 400 );
		}

		$client_key = sanitize_text_field( wp_unslash( $_POST['client_key'] ?? '' ) );
		if ( empty( $client_key ) ) {
			wp_send_json_error( array( 'message' => __( 'Missing client key.', 'yayboost' ) ), 400 );
		}

		$transient_key = 'yayboost_exit_coupon_' . md5( $client_key );
		$existing_code = get_transient( $transient_key );
		if ( $existing_code ) {
			$this->apply_coupon_to_cart( $existing_code );
			wp_send_json_success( array( 'code' => $existing_code ) );
		}

		$settings = $this->feature->get_settings();
		$offer    = $settings['offer'] ?? array();

		$type = $offer['type'] ?? 'percent';

		// If no discount, do not create coupon
		if ( 'no_discount' === $type ) {
			wp_send_json_error( array( 'message' => __( 'No discount configured.', 'yayboost' ) ), 400 );
		}
		$value  = isset( $offer['value'] ) ? floatval( $offer['value'] ) : 0;
		$prefix = isset( $offer['prefix'] ) ? sanitize_text_field( $offer['prefix'] ) : 'GO-';
		$hours  = isset( $offer['expires'] ) ? absint( $offer['expires'] ) : 1;

		$coupon_type = 'percent';
		$amount      = $value;
		$is_free     = false;

		if ( 'fixed' === $type || 'fixed_cart' === $type ) {
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

		wp_send_json_success( array( 'code' => $code ) );
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
		$attempts = 0;
		do {
			$code   = $prefix . strtoupper( wp_generate_password( 6, false, false ) );
			$exists = \wc_get_coupon_id_by_code( $code );
			++$attempts;
		} while ( $exists && $attempts < 5 );

		return $code;
	}
}
