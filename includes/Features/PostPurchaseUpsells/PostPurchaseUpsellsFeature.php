<?php
/**
 * Post Purchase Upsells Feature
 *
 * Display upsell offers when checkout.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PostPurchaseUpsells;

use YayBoost\Features\AbstractFeature;

defined( 'ABSPATH' ) || exit;

/**
 * Order Bump feature implementation
 */
class PostPurchaseUpsellsFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'post_purchase_upsells';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Post-Purchase Upsells';

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
    protected $icon = 'seal-percent';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 90;

    /**
     * Post Purchase Upsells repository
     *
     * @var PostPurchaseUpsellsRepository
     */
    protected $repository;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        $this->repository = new PostPurchaseUpsellsRepository();
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
                'enabled' => true,
                'display' => [
                    'mode'        => 'all',
                    'max_display' => 2,
                ],
                'timing'  => [
                    'show_countdown' => true,
                    'expires_after'  => 10,
                ],
            ]
        );
    }
}
