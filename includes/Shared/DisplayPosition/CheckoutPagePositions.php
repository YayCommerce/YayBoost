<?php
/**
 * Checkout Page Positions
 *
 * WooCommerce checkout page display position configurations.
 *
 * @package YayBoost
 */

namespace YayBoost\Shared\DisplayPosition;

/**
 * Position provider for checkout page
 */
class CheckoutPagePositions implements PositionProviderInterface {

	/**
	 * Get all checkout page positions
	 *
	 * @return array<string, array{hook: string, priority: int, label: string}>
	 */
	public function get_all(): array {
		return [
			'before_checkout_form'           => [
				'hook'     => 'woocommerce_before_checkout_form',
				'priority' => 10,
				'label'    => __( 'Before checkout form', 'yayboost' ),
			],
			'before_checkout_billing_form'   => [
				'hook'     => 'woocommerce_before_checkout_billing_form',
				'priority' => 10,
				'label'    => __( 'Before billing form', 'yayboost' ),
			],
			'after_checkout_billing_form'    => [
				'hook'     => 'woocommerce_after_checkout_billing_form',
				'priority' => 10,
				'label'    => __( 'After billing form', 'yayboost' ),
			],
			'before_checkout_shipping_form'  => [
				'hook'     => 'woocommerce_before_checkout_shipping_form',
				'priority' => 10,
				'label'    => __( 'Before shipping form', 'yayboost' ),
			],
			'after_checkout_shipping_form'   => [
				'hook'     => 'woocommerce_after_checkout_shipping_form',
				'priority' => 10,
				'label'    => __( 'After shipping form', 'yayboost' ),
			],
			'before_order_notes'             => [
				'hook'     => 'woocommerce_before_order_notes',
				'priority' => 10,
				'label'    => __( 'Before order notes', 'yayboost' ),
			],
			'after_order_notes'              => [
				'hook'     => 'woocommerce_after_order_notes',
				'priority' => 10,
				'label'    => __( 'After order notes', 'yayboost' ),
			],
			'review_order_before_payment'    => [
				'hook'     => 'woocommerce_review_order_before_payment',
				'priority' => 10,
				'label'    => __( 'Before payment section', 'yayboost' ),
			],
			'review_order_after_payment'     => [
				'hook'     => 'woocommerce_review_order_after_payment',
				'priority' => 10,
				'label'    => __( 'After payment section', 'yayboost' ),
			],
			'after_checkout_form'            => [
				'hook'     => 'woocommerce_after_checkout_form',
				'priority' => 10,
				'label'    => __( 'After checkout form', 'yayboost' ),
			],
		];
	}
}
