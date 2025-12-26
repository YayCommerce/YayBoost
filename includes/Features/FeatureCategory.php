<?php
/**
 * Feature Category Definitions
 *
 * @package YayBoost
 */

namespace YayBoost\Features;

/**
 * Defines feature categories for organization in admin UI
 */
class FeatureCategory {
	/**
	 * Category constants
	 */
	const CART_OPTIMIZER    = 'cart_optimizer';
	const CHECKOUT_BOOSTER  = 'checkout_booster';
	const PRODUCT_DISCOVERY = 'product_discovery';
	const URGENCY_SCARCITY  = 'urgency_scarcity';
	const OTHERS            = 'others';

	/**
	 * Get all categories
	 *
	 * @return array
	 */
	public static function get_all(): array {
		return array(
			self::CART_OPTIMIZER    => array(
				'name'        => __( 'Cart Optimizer', 'yayboost' ),
				'description' => __( 'Features to optimize cart experience and increase AOV', 'yayboost' ),
				'icon'        => 'shopping-cart',
				'priority'    => 10,
			),
			self::CHECKOUT_BOOSTER  => array(
				'name'        => __( 'Checkout Booster', 'yayboost' ),
				'description' => __( 'Features to boost conversions at checkout', 'yayboost' ),
				'icon'        => 'credit-card',
				'priority'    => 20,
			),
			self::PRODUCT_DISCOVERY => array(
				'name'        => __( 'Product Discovery', 'yayboost' ),
				'description' => __( 'Features to help customers discover products', 'yayboost' ),
				'icon'        => 'search',
				'priority'    => 30,
			),
			self::URGENCY_SCARCITY  => array(
				'name'        => __( 'Urgency & Scarcity', 'yayboost' ),
				'description' => __( 'Features to create urgency and drive action', 'yayboost' ),
				'icon'        => 'clock',
				'priority'    => 40,
			),
			self::OTHERS            => array(
				'name'        => __( 'Others', 'yayboost' ),
				'description' => __( 'Features not included in the above categories.', 'yayboost' ),
				'icon'        => 'dots-three-vertical',
				'priority'    => 50,
			),
		);
	}

	/**
	 * Get single category by ID
	 *
	 * @param string $id Category ID
	 * @return array|null
	 */
	public static function get( string $id ): ?array {
		$categories = self::get_all();
		return $categories[ $id ] ?? null;
	}

	/**
	 * Check if category exists
	 *
	 * @param string $id Category ID
	 * @return bool
	 */
	public static function exists( string $id ): bool {
		return isset( self::get_all()[ $id ] );
	}

	/**
	 * Get category IDs
	 *
	 * @return array
	 */
	public static function get_ids(): array {
		return array_keys( self::get_all() );
	}
}
