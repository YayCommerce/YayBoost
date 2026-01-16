<?php
/**
 * Shop Page Positions
 *
 * WooCommerce shop/category/archive page display position configurations.
 *
 * @package YayBoost
 */

namespace YayBoost\Shared\DisplayPosition;

/**
 * Position provider for shop and category pages
 */
class ShopPagePositions implements PositionProviderInterface {

	/**
	 * Get all shop page positions
	 *
	 * @return array<string, array{hook: string, priority: int, label: string}>
	 */
	public function get_all(): array {
		return [
			'before_shop_loop_item'       => [
				'hook'     => 'woocommerce_before_shop_loop_item',
				'priority' => 10,
				'label'    => __( 'Before product item', 'yayboost' ),
			],
			'before_shop_loop_item_title' => [
				'hook'     => 'woocommerce_before_shop_loop_item_title',
				'priority' => 10,
				'label'    => __( 'Before product title', 'yayboost' ),
			],
			'after_shop_loop_item_title'  => [
				'hook'     => 'woocommerce_shop_loop_item_title',
				'priority' => 15,
				'label'    => __( 'After product title', 'yayboost' ),
			],
			'after_shop_loop_item'        => [
				'hook'     => 'woocommerce_after_shop_loop_item',
				'priority' => 10,
				'label'    => __( 'After product item', 'yayboost' ),
			],
			'after_shop_loop_item_late'   => [
				'hook'     => 'woocommerce_after_shop_loop_item',
				'priority' => 15,
				'label'    => __( 'After product item (late)', 'yayboost' ),
			],
		];
	}
}
