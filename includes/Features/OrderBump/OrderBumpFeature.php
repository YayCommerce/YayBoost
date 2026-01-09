<?php
/**
 * Order Bump Feature
 *
 * Display upsell offers during checkout that customers can add
 * to their order with a single click.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\OrderBump;

use YayBoost\Features\AbstractFeature;

/**
 * Order Bump feature implementation
 */
class OrderBumpFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'order_bump';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Order Bump';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display one-click upsell offers during checkout to increase order value';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'checkout_booster';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'plus-circle';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 1;

    /**
     * Feature status
     *
     * @var string
     */
    protected $status = 'coming_soon';

    /**
     * Bump repository
     *
     * @var BumpRepository
     */
    protected $repository;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        $this->repository = new BumpRepository();
    }

}
