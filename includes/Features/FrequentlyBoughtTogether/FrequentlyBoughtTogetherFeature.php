<?php
/**
 * Frequently Bought Together Feature
 *
 * Displays products that are frequently bought together with the current product
 * to increase average order value and cross-sell opportunities.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\Features\AbstractFeature;

/**
 * Frequently Bought Together feature implementation
 */
class FrequentlyBoughtTogetherFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'frequently_bought_together';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Frequently Bought Together';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display products that are frequently bought together to boost cross-sales and increase average order value';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'product_discovery';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'shopping-cart';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 10;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        // Display frequently bought together products on product page
        $settings = $this->get_settings();
    }

    /**
     * Get default settings
     *
     * @return array
     */
    protected function get_default_settings(): array {
        return array_merge(
            parent::get_default_settings(),
            [
                'enabled'             => false,
                'max_products'        => 4,
                'min_order_threshold' => 5,
                'show_on'             => [ 'product_page', 'cart_page' ],
                'layout'              => 'grid',
                'section_title'       => __( 'Complete Your Purchase', 'yayboost' ),
                'hide_if_in_cart'     => 'hide',
            ]
        );
    }
}
