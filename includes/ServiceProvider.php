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

/**
 * Main service provider for registering all services
 */
class ServiceProvider implements ServiceProviderInterface {
    /**
     * Registered features
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
    public function register(Container $container) {
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
    public function boot(Container $container) {
        // Initialize all registered features
        foreach ($this->features as $featureKey) {
            $feature = $container->resolve($featureKey);
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
    protected function register_features(Container $container) {
        // Register Sample Boost Feature
        $container->register('feature.sample_boost', function($c) {
            return new SampleBoostFeature($c);
        });
        $this->features[] = 'feature.sample_boost';

        // Register feature registry
        $container->register('feature.registry', function($c) use ($container) {
            $registry = new Utils\FeatureRegistry();
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
    protected function register_utilities(Container $container) {
        // Register settings manager
        $container->register('settings', function($c) {
            return new Utils\Settings();
        });
    }

    /**
     * Get registered features
     *
     * @return array
     */
    public function get_features() {
        return $this->features;
    }
}

