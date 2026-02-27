<?php
/**
 * Deals Feed Feature
 *
 * Displays a feed of deals from WooCommerce sale products and other sources.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\DealsFeed;

use YayBoost\Features\AbstractFeature;

defined( 'ABSPATH' ) || exit;

/**
 * Deals Feed feature implementation
 */
class DealsFeedFeature extends AbstractFeature {

    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'deals_feed';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Deals feed';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display a feed of deals from sale products and other sources';

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
    protected $icon = 'tag';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 35;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        // No frontend rendering logic in this phase
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
                'enabled'           => false,
                'display_pages'     => 'woocommerce_pages',
                'feed_title'        => __( "Today's Best Deal", 'yayboost' ),
                'layout'            => 'grid',
                'enabled_sources'   => [],
                'minimum_discount'  => '10%',
                'stock_status'      => [
                    'in_stock'  => true,
                    'out_stock' => true,
                    'backorder' => true,
                ],
                'expired_deals'     => 'show_grayed_24h',
                'product_targeting' => [
                    'apply_to'         => 'all_products',
                    'exclude_products' => [],
                ],
            ]
        );
    }
}
