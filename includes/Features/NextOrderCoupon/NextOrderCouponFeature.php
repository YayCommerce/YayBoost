<?php
/**
 * Next Order Coupon Feature
 *
 * Automatically generate a coupon discount after each purchase to encourage repeat orders.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\NextOrderCoupon;

use YayBoost\Features\AbstractFeature;

/**
 * Next Order Coupon feature implementation
 */
class NextOrderCouponFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'next_order_coupon';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Next Order Coupon';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Automatically generate a coupon discount after each purchase to encourage repeat orders';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'cart_optimizer';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'gift';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 100;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        if ( ! $this->is_enabled()) {
            return;
        }
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
                'enabled'              => false,
                'discount_type'        => 'percentage',
                'discount_value'       => 20,
                'coupon_prefix'        => 'THANKS-',
                'expires_after'        => 30,
                'minimum_order_total'  => 0,
                'customer_type'        => 'all',
                'minimum_spend_to_use' => 0,
                'exclude_sale_items'   => false,
                'display_locations'    => [ 'thank_you_page', 'order_email', 'my_account' ],
                'thank_you_headline'   => __( "🎁 Here's a gift for your next order!", 'yayboost' ),
                'thank_you_message'    => __( 'Use code {coupon_code} to get {discount} off your next purchase. Expires {expiry}.', 'yayboost' ),
                'email_content'        => __( "As a thank you, here's {discount} off your next order!", 'yayboost' ),
            ]
        );
    }
}
