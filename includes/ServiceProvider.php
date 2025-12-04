<?php
/**
 * Main Service Provider
 *
 * @package YayBoost
 */

namespace YayBoost;

use YayBoost\Container\Container;
use YayBoost\Interfaces\ServiceProviderInterface;
use YayBoost\Features\SampleBoost\SampleBoostFeature;
use YayBoost\Features\FreeShippingBar\FreeShippingBarFeature;
use YayBoost\Features\OrderBump\OrderBumpFeature;
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
    public function register(Container $container): void {
        // Register features
        $this->register_features($container);

        // Register utilities
        $this->register_utilities($container);
    }

    /**
     * Boot services after all providers registered
     *
     * @param Container $container
     * @return void
     */
    public function boot(Container $container): void {
        // Get registry and fire addon hook
        $registry = $container->resolve('feature.registry');
        $registry->fire_addon_hook();

        // Initialize all enabled features
        foreach ($registry->get_all() as $feature) {
            if ($feature->is_enabled()) {
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
    protected function register_features(Container $container): void {
        // Register Sample Boost Feature (Recently Viewed Products)
        $container->register('feature.sample_boost', function($c) {
            return new SampleBoostFeature($c);
        });
        $this->features[] = 'feature.sample_boost';

        // Register Free Shipping Bar Feature
        $container->register('feature.free_shipping_bar', function($c) {
            return new FreeShippingBarFeature($c);
        });
        $this->features[] = 'feature.free_shipping_bar';

        // Register Order Bump Feature
        $container->register('feature.order_bump', function($c) {
            return new OrderBumpFeature($c);
        });
        $this->features[] = 'feature.order_bump';

        // Register feature registry
        $container->register('feature.registry', function($c) {
            $registry = new FeatureRegistry();

            // Register core features
            foreach ($this->features as $featureKey) {
                $feature = $c->resolve($featureKey);
                $registry->register($feature);
            }

            return $registry;
        });
    }

    /**
     * Register utility services
     *
     * @param Container $container
     * @return void
     */
    protected function register_utilities(Container $container): void {
        // Register settings manager
        $container->register('settings', function($c) {
            return new Utils\Settings();
        });
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
