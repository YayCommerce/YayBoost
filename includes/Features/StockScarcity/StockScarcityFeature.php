<?php
/**
 * Smart Recommendations Feature
 *
 * Stream music and manage playlists for your workspace..
 *
 * @package YayBoost
 */

namespace YayBoost\Features\StockScarcity;

use YayBoost\Features\AbstractFeature;

/**
 * Free Shipping Bar feature implementation
 */
class StockScarcityFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'stock_scarcity';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Stock Scarcity';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Manage how stock scarcity indicators appear on your store';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'urgency_scarcity';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'hourglass-high';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 1;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
    }
}
