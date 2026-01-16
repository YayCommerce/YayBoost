<?php
/**
 * Product Page Positions
 *
 * WooCommerce single product page display position configurations.
 *
 * @package YayBoost
 */

namespace YayBoost\Shared\DisplayPosition;

/**
 * Position provider for single product pages
 */
class ProductPagePositions implements PositionProviderInterface {

	/**
	 * Get all product page positions
	 *
	 * @return array<string, array{hook: string, priority: int, label: string}>
	 */
	public function get_all(): array {
		return [
			'below_product_title'      => [
				'hook'     => 'woocommerce_single_product_summary',
				'priority' => 6,
				'label'    => __( 'Below product title', 'yayboost' ),
			],
			'below_price'              => [
				'hook'     => 'woocommerce_single_product_summary',
				'priority' => 11,
				'label'    => __( 'Below price', 'yayboost' ),
			],
			'above_add_to_cart_button' => [
				'hook'     => 'woocommerce_before_add_to_cart_form',
				'priority' => 10,
				'label'    => __( 'Above Add to Cart button', 'yayboost' ),
			],
			'below_add_to_cart_button' => [
				'hook'     => 'woocommerce_after_add_to_cart_form',
				'priority' => 10,
				'label'    => __( 'Below Add to Cart button', 'yayboost' ),
			],
			'below_short_description'  => [
				'hook'     => 'woocommerce_single_product_summary',
				'priority' => 21,
				'label'    => __( 'Below short description', 'yayboost' ),
			],
			'below_meta'               => [
				'hook'     => 'woocommerce_single_product_summary',
				'priority' => 41,
				'label'    => __( 'Below product meta', 'yayboost' ),
			],
		];
	}
}
