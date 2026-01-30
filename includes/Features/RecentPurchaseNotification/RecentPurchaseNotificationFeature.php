<?php
/**
 * Recent Purchase Notification Feature
 *
 * Displays a recent purchase notification on product pages.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\RecentPurchaseNotification;

use YayBoost\Features\AbstractFeature;

/**
 * Recent Purchase Notification feature implementation
 */
class RecentPurchaseNotificationFeature extends AbstractFeature {

    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'recent_purchase_notification';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Recent Purchase Notification';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display a notification when a customer makes a recent purchase';

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
    protected $icon = 'chat';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 30;

    /**
     * Constructor
     *
     * @param \YayBoost\Container\Container $container DI container.
     */
    public function __construct( $container ) {
        parent::__construct( $container );
    }

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        if ( ! $this->is_enabled() ) {
            return;
        }
    }

    /**
     * Get default settings
     *
     * @return array Default settings.
     */
    protected function get_default_settings(): array {
        return array_merge(
            parent::get_default_settings(),
            [
                'enabled'       => true,
                'tracking_mode' => 'real-orders',
                'real_orders'   => [
                    'order_time_range'       => 'last-7-days',
                    'order_status'           => [ 'completed', 'processing' ],
                    'minimum_order_required' => 3,
                ],
                'timing'        => [
                    'delay'    => 10,
                    'interval' => 10,
                ],
                'display'       => [
                    'customer_name'   => 'full-name',
                    'product_details' => [ 'title', 'price' ],
                ],
            ]
        );
    }
}
