<?php
/**
 * Cart Page Positions
 *
 * WooCommerce cart page display position configurations.
 *
 * @package YayBoost
 */

namespace YayBoost\Shared\DisplayPosition;

/**
 * Position provider for cart page
 */
class CartPagePositions implements PositionProviderInterface {

	/**
	 * Get all cart page positions
	 *
	 * @return array<string, array{hook: string, priority: int, label: string}>
	 */
	public function get_all(): array {
		return [
			'before_cart'              => [
				'hook'     => 'woocommerce_before_cart',
				'priority' => 10,
				'label'    => __( 'Before cart', 'yayboost' ),
			],
			'before_cart_table'        => [
				'hook'     => 'woocommerce_before_cart_table',
				'priority' => 10,
				'label'    => __( 'Before cart table', 'yayboost' ),
			],
			'after_cart_table'         => [
				'hook'     => 'woocommerce_after_cart_table',
				'priority' => 10,
				'label'    => __( 'After cart table', 'yayboost' ),
			],
			'before_cart_totals'       => [
				'hook'     => 'woocommerce_before_cart_totals',
				'priority' => 10,
				'label'    => __( 'Before cart totals', 'yayboost' ),
			],
			'after_cart_totals'        => [
				'hook'     => 'woocommerce_after_cart_totals',
				'priority' => 10,
				'label'    => __( 'After cart totals', 'yayboost' ),
			],
			'proceed_to_checkout'      => [
				'hook'     => 'woocommerce_proceed_to_checkout',
				'priority' => 15,
				'label'    => __( 'Near proceed to checkout', 'yayboost' ),
			],
			'after_cart'               => [
				'hook'     => 'woocommerce_after_cart',
				'priority' => 10,
				'label'    => __( 'After cart', 'yayboost' ),
			],
		];
	}
}
