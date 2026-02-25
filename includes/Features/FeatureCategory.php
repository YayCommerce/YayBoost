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
        return [
            self::CART_OPTIMIZER    => [
                'name'        => __( 'Cart Optimizer', 'yayboost-sales-booster-for-woocommerce' ),
                'description' => __( 'Features to optimize cart experience and increase AOV', 'yayboost-sales-booster-for-woocommerce' ),
                'icon'        => 'shopping-cart',
                'priority'    => 10,
            ],
            self::CHECKOUT_BOOSTER  => [
                'name'        => __( 'Checkout Booster', 'yayboost-sales-booster-for-woocommerce' ),
                'description' => __( 'Features to boost conversions at checkout', 'yayboost-sales-booster-for-woocommerce' ),
                'icon'        => 'credit-card',
                'priority'    => 20,
            ],
            self::PRODUCT_DISCOVERY => [
                'name'        => __( 'Product Discovery', 'yayboost-sales-booster-for-woocommerce' ),
                'description' => __( 'Features to help customers discover products', 'yayboost-sales-booster-for-woocommerce' ),
                'icon'        => 'search',
                'priority'    => 30,
            ],
            self::URGENCY_SCARCITY  => [
                'name'        => __( 'Urgency & Scarcity', 'yayboost-sales-booster-for-woocommerce' ),
                'description' => __( 'Features to create urgency and drive action', 'yayboost-sales-booster-for-woocommerce' ),
                'icon'        => 'clock',
                'priority'    => 40,
            ],
            self::OTHERS            => [
                'name'        => __( 'Others', 'yayboost-sales-booster-for-woocommerce' ),
                'description' => __( 'Features not included in the above categories.', 'yayboost-sales-booster-for-woocommerce' ),
                'icon'        => 'more-horizontal',
                'priority'    => 50,
            ],
        ];
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
