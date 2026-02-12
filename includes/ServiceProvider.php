<?php
/**
 * Main Service Provider
 *
 * @package YayBoost
 */

namespace YayBoost;

use YayBoost\Container\Container;
use YayBoost\Interfaces\ServiceProviderInterface;
use YayBoost\Features\FreeShippingBar\FreeShippingBarFeature;
use YayBoost\Features\OrderBump\OrderBumpFeature;
use YayBoost\Features\FrequentlyBoughtTogether\FrequentlyBoughtTogetherFeature;
use YayBoost\Features\SmartRecommendations\SmartRecommendationsFeature;
use YayBoost\Features\StockScarcity\StockScarcityFeature;
use YayBoost\Features\NextOrderCoupon\NextOrderCouponFeature;
use YayBoost\Features\LiveVisitorCount\LiveVisitorCountFeature;
use YayBoost\Features\PurchaseActivityCount\PurchaseActivityCountFeature;
use YayBoost\Features\ExitIntentPopup\ExitIntentPopupFeature;
use YayBoost\Features\RecentPurchaseNotification\RecentPurchaseNotificationFeature;
use YayBoost\Features\EmailCapturePopup\EmailCapturePopupFeature;
use YayBoost\Utils\FeatureRegistry;

/**
 * Main service provider for registering all services
 */
class ServiceProvider implements ServiceProviderInterface {
    /**
     * Registered feature keys
     *
     * @var array
     */
    protected $features = [];

    /**
     * Register services in the container
     *
     * @param Container $container
     * @return void
     */
    public function register( Container $container ): void {
        // Register features
        $this->register_features( $container );

        // Register utilities
        $this->register_utilities( $container );
    }

    /**
     * Boot services after all providers registered
     *
     * @param Container $container
     * @return void
     */
    public function boot( Container $container ): void {
        // Get registry and fire addon hook
        $registry = $container->resolve( 'feature.registry' );
        $registry->fire_addon_hook();

        // Initialize all enabled features
        foreach ( $registry->get_all() as $feature ) {
            if ( $feature->is_enabled() ) {
                $feature->init();
            }
        }
    }

    /**
     * Register feature modules
     *
     * @param Container $container
     * @return void
     */
    protected function register_features( Container $container ): void {

        // Register Free Shipping Bar Feature
        $container->register(
            'feature.free_shipping_bar',
            function ( $c ) {
                return new FreeShippingBarFeature( $c );
            }
        );
        $this->features[] = 'feature.free_shipping_bar';

        // Register Order Bump Feature
        $container->register(
            'feature.order_bump',
            function ( $c ) {
                return new OrderBumpFeature( $c );
            }
        );
        $this->features[] = 'feature.order_bump';

        // Register Frequently Bought Together Feature
        $container->register(
            'feature.frequently_bought_together',
            function ( $c ) {
                return new FrequentlyBoughtTogetherFeature( $c );
            }
        );
        $this->features[] = 'feature.frequently_bought_together';

        // Register Smart Recommendations Feature
        $container->register(
            'feature.smart_recommendations',
            function ( $c ) {
                return new SmartRecommendationsFeature( $c );
            }
        );
        $this->features[] = 'feature.smart_recommendations';

        // Register Stock Scarcity Feature
        $container->register(
            'feature.stock_scarcity',
            function ( $c ) {
                return new StockScarcityFeature( $c );
            }
        );
        $this->features[] = 'feature.stock_scarcity';

        // Register Next Order Coupon Feature
        $container->register(
            'feature.next_order_coupon',
            function ( $c ) {
                return new NextOrderCouponFeature( $c );
            }
        );
        $this->features[] = 'feature.next_order_coupon';

        // Register Live Visitor Count Feature
        $container->register(
            'feature.live_visitor_count',
            function ( $c ) {
                return new LiveVisitorCountFeature( $c );
            }
        );
        $this->features[] = 'feature.live_visitor_count';

        // Register Purchase Activity Count Feature
        $container->register(
            'feature.purchase_activity_count',
            function ( $c ) {
                return new PurchaseActivityCountFeature( $c );
            }
        );
        $this->features[] = 'feature.purchase_activity_count';

        // Register Exit Intent Popup Feature
        $container->register(
            'feature.exit_intent_popup',
            function ( $c ) {
                return new ExitIntentPopupFeature( $c );
            }
        );
        $this->features[] = 'feature.exit_intent_popup';

        // Register Recent Purchase Notification Feature
        $container->register(
            'feature.recent_purchase_notification',
            function ( $c ) {
                return new RecentPurchaseNotificationFeature( $c );
            }
        );
        $this->features[] = 'feature.recent_purchase_notification';
        // Register Email Capture Popup Feature
        $container->register(
            'feature.email_capture_popup',
            function ( $c ) {
                return new EmailCapturePopupFeature( $c );
            }
        );
        $this->features[] = 'feature.email_capture_popup';

        // Register feature registry
        $container->register(
            'feature.registry',
            function ( $c ) {
                $registry = new FeatureRegistry();
                // Register core features
                foreach ( $this->features as $feature_key ) {
                    $feature = $c->resolve( $feature_key );
                    $registry->register( $feature );
                }

                return $registry;
            }
        );
    }

    /**
     * Register utility services
     *
     * @param Container $container
     * @return void
     */
    protected function register_utilities( Container $container ): void {
        // Register settings manager
        $container->register(
            'settings',
            function ( $c ) {
                return new Utils\Settings();
            }
        );
    }

    /**
     * Get registered feature keys
     *
     * @return array
     */
    public function get_features(): array {
        return $this->features;
    }
}
